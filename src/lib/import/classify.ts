import { occupancyHintNeedsWrite, occupancyHintsFromText } from "@/lib/import/occupancy-hints";
import type {
  ClassifiedImportRow,
  ImportApplyMode,
  ImportCatalog,
  ImportPreview,
  ImportReviewReason,
  ImportSourceRow,
  ImportWriteKind,
} from "@/lib/import/types";
import type { MappedField } from "@/lib/import/map-columns";

function unitKey(buildingNo: string, unitNo: string) {
  return `${buildingNo}|${unitNo}`;
}

export function classifyImportRows(
  projectId: string,
  rows: ImportSourceRow[],
  catalog: ImportCatalog,
  mapping: Record<MappedField, string | null>,
): ImportPreview {
  if (catalog.projectId !== projectId) {
    return {
      total: rows.length,
      ready: 0,
      reviewRequired: 0,
      error: rows.length,
      rows: rows.map((row) =>
        classified(row, {
          status: "ERROR",
          reasons: ["UNIT_NOT_FOUND"],
          writeKind: "none",
          message: "동호수 없음",
        }),
      ),
      mapping,
    };
  }

  const unitsByKey = new Map(
    catalog.units.map((unit) => [unitKey(unit.buildingNo, unit.unitNo), unit]),
  );
  const customerById = new Map(catalog.customers.map((item) => [item.id, item]));
  const customerByPhone = new Map(
    catalog.customers.map((item) => [item.phoneNormalized, item]),
  );
  const occupancyByUnit = new Map(
    catalog.occupancies.map((item) => [item.unitId, item]),
  );

  const classifiedRows: ClassifiedImportRow[] = rows.map((row) => {
    const occupancyHint = occupancyHintsFromText([
      row.overdueText,
      row.nextStepText,
    ]);
    if (!row.buildingNo || !row.unitNo || !row.holderName) {
      return classified(row, {
        status: "ERROR",
        reasons: ["INVALID_ROW"],
        writeKind: "none",
        occupancyHint,
        message: !row.holderName ? "계약자 없음" : "필수 컬럼 없음",
      });
    }

    const unit = unitsByKey.get(unitKey(row.buildingNo, row.unitNo));
    if (!unit || unit.projectId !== projectId) {
      return classified(row, {
        status: "ERROR",
        reasons: ["UNIT_NOT_FOUND"],
        writeKind: "none",
        occupancyHint,
        message: "동호수 없음",
      });
    }

    const excelCustomer = row.phoneNormalized
      ? (customerByPhone.get(row.phoneNormalized) ?? null)
      : null;
    const activeContracts = catalog.contracts.filter(
      (item) => item.status === "ACTIVE" && item.unitId === unit.unitId,
    );
    if (activeContracts.length > 1) {
      return classified(row, {
        status: "REVIEW_REQUIRED",
        reasons: ["ACTIVE_CONTRACT_CONFLICT"],
        writeKind: "none",
        occupancyHint,
        unitId: unit.unitId,
        message: "ACTIVE 계약 충돌",
      });
    }
    const active = activeContracts[0] ?? null;
    const currentCustomer = active
      ? (customerById.get(active.customerId) ?? null)
      : null;

    if (active && currentCustomer) {
      const sameCustomerByPhone =
        Boolean(row.phoneNormalized) &&
        row.phoneNormalized === currentCustomer.phoneNormalized;
      if (sameCustomerByPhone) {
        return classified(row, {
          status: "READY",
          reasons: [],
          writeKind: occupancyHintNeedsWrite(occupancyHint) ? "apply_import_row" : "none",
          occupancyHint,
          unitId: unit.unitId,
          excelCustomerId: currentCustomer.id,
          currentCustomerId: currentCustomer.id,
          currentCustomerName: currentCustomer.name,
          currentContractId: active.contractId,
          message: "기존 계약과 일치",
        });
      }
      if (!row.phoneNormalized) {
        return classified(row, {
          status: "REVIEW_REQUIRED",
          reasons: ["CUSTOMER_IDENTITY"],
          writeKind: "none",
          occupancyHint,
          unitId: unit.unitId,
          currentCustomerId: currentCustomer.id,
          currentCustomerName: currentCustomer.name,
          currentContractId: active.contractId,
          message: "이름만으로는 동일인을 확정할 수 없습니다.",
        });
      }
      if (excelCustomer && excelCustomer.id !== currentCustomer.id) {
        return classified(row, {
          status: "REVIEW_REQUIRED",
          reasons: ["HOLDER_CHANGE"],
          writeKind: "apply_import_row",
          occupancyHint,
          unitId: unit.unitId,
          excelCustomerId: excelCustomer.id,
          currentCustomerId: currentCustomer.id,
          currentCustomerName: currentCustomer.name,
          currentContractId: active.contractId,
          message: `명의변경 의심 ${currentCustomer.name} → ${row.holderName}`,
        });
      }
      return classified(row, {
        status: "REVIEW_REQUIRED",
        reasons: ["HOLDER_CHANGE", "NEW_CUSTOMER_REQUIRED"],
        writeKind: "apply_import_row",
        occupancyHint,
        unitId: unit.unitId,
        currentCustomerId: currentCustomer.id,
        currentCustomerName: currentCustomer.name,
        currentContractId: active.contractId,
        message: "신규 계약자 생성 후 명의변경 확인이 필요합니다.",
      });
    }

    if (active && !currentCustomer) {
      return classified(row, {
        status: "REVIEW_REQUIRED",
        reasons: ["ACTIVE_CONTRACT_CONFLICT"],
        writeKind: "none",
        occupancyHint,
        unitId: unit.unitId,
        currentContractId: active.contractId,
        message: "ACTIVE 계약 충돌",
      });
    }

    if (excelCustomer) {
      const occupancy = occupancyByUnit.get(unit.unitId);
      if (occupancy) {
        const occupancyContract = catalog.contracts.find(
          (item) => item.contractId === occupancy.contractId,
        );
        if (
          occupancyContract?.status === "ACTIVE" &&
          occupancyContract.customerId === excelCustomer.id
        ) {
          return classified(row, {
            status: "READY",
            reasons: [],
            writeKind: occupancyHintNeedsWrite(occupancyHint) ? "apply_import_row" : "none",
            occupancyHint,
            unitId: unit.unitId,
            excelCustomerId: excelCustomer.id,
            currentCustomerId: excelCustomer.id,
            currentCustomerName: excelCustomer.name,
            currentContractId: occupancy.contractId,
            message: "기존 계약과 일치",
          });
        }
        if (occupancyContract?.status === "ACTIVE") {
          return classified(row, {
            status: "REVIEW_REQUIRED",
            reasons: ["ACTIVE_CONTRACT_CONFLICT"],
            writeKind: "none",
            occupancyHint,
            unitId: unit.unitId,
            excelCustomerId: excelCustomer.id,
            message: "ACTIVE 계약 충돌",
          });
        }
        return classified(row, {
          status: "REVIEW_REQUIRED",
          reasons: ["ACTIVE_CONTRACT_CONFLICT"],
          writeKind: "none",
          occupancyHint,
          unitId: unit.unitId,
          excelCustomerId: excelCustomer.id,
          message: "ACTIVE 계약 충돌",
        });
      }
      return classified(row, {
        status: "READY",
        reasons: [],
        writeKind: "apply_import_row",
        occupancyHint,
        unitId: unit.unitId,
        excelCustomerId: excelCustomer.id,
        message: "신규 계약 생성 가능",
      });
    }

    if (!row.phoneNormalized) {
      return classified(row, {
        status: "REVIEW_REQUIRED",
        reasons: ["CUSTOMER_IDENTITY"],
        writeKind: "none",
        occupancyHint,
        unitId: unit.unitId,
        message: "이름만으로는 동일인을 확정할 수 없습니다.",
      });
    }

    return classified(row, {
      status: "REVIEW_REQUIRED",
      reasons: ["NEW_CUSTOMER_REQUIRED"],
      writeKind: "apply_import_row",
      occupancyHint,
      unitId: unit.unitId,
      message: "신규 계약자 확인 후 적용할 수 있습니다.",
    });
  });

  const nameGroups = new Map<string, ClassifiedImportRow[]>();
  for (const row of classifiedRows) {
    if (!row.holderName) continue;
    const list = nameGroups.get(row.holderName) ?? [];
    list.push(row);
    nameGroups.set(row.holderName, list);
  }
  for (const group of nameGroups.values()) {
    if (group.length < 2) continue;
    const customerIds = new Set(
      group
        .map((row) => row.excelCustomerId ?? row.currentCustomerId)
        .filter((id): id is string => Boolean(id)),
    );
    const allMissingPhone = group.every((row) => !row.phoneNormalized);
    if (customerIds.size === 1 && !allMissingPhone) {
      const related = group
        .filter((row) => row.unitId)
        .map((row) => ({ buildingNo: row.buildingNo, unitNo: row.unitNo }));
      for (const row of group) {
        row.relatedUnits = related;
      }
      continue;
    }
    const reason: ImportReviewReason = allMissingPhone
      ? "MULTI_UNIT_HOLDER_CONFIRM"
      : "CUSTOMER_IDENTITY";
    for (const row of group) {
      if (row.status === "ERROR") continue;
      if (!row.reasons.includes(reason)) row.reasons.push(reason);
      if (row.status === "READY") row.status = "REVIEW_REQUIRED";
      row.writeKind = "none";
      row.applyMode = "NO_OP";
      row.message = allMissingPhone
        ? "동일 이름으로 여러 세대가 있습니다."
        : "동일 이름으로 다른 계약자가 있습니다.";
    }
  }

  return {
    total: classifiedRows.length,
    ready: classifiedRows.filter((row) => row.status === "READY").length,
    reviewRequired: classifiedRows.filter((row) => row.status === "REVIEW_REQUIRED")
      .length,
    error: classifiedRows.filter((row) => row.status === "ERROR").length,
    rows: classifiedRows,
    mapping,
  };
}

function classified(
  row: ImportSourceRow,
  rest: {
    status: ClassifiedImportRow["status"];
    reasons: ImportReviewReason[];
    writeKind: ImportWriteKind;
    occupancyHint?: ClassifiedImportRow["occupancyHint"];
    unitId?: string | null;
    excelCustomerId?: string | null;
    currentCustomerId?: string | null;
    currentCustomerName?: string | null;
    currentContractId?: string | null;
    message: string;
  },
): ClassifiedImportRow {
  return {
    rowNumber: row.rowNumber,
    status: rest.status,
    reasons: rest.reasons,
    writeKind: rest.writeKind,
    buildingNo: row.buildingNo,
    unitNo: row.unitNo,
    unitId: rest.unitId ?? null,
    holderName: row.holderName,
    phoneNormalized: row.phoneNormalized,
    excelCustomerId: rest.excelCustomerId ?? null,
    currentCustomerId: rest.currentCustomerId ?? null,
    currentCustomerName: rest.currentCustomerName ?? null,
    currentContractId: rest.currentContractId ?? null,
    occupancyHint:
      rest.occupancyHint ?? occupancyHintsFromText([row.overdueText, row.nextStepText]),
    hasConsultationNote: row.hasConsultationNote,
    message: rest.message,
    applyMode: resolveApplyMode(rest),
    relatedUnits: [],
  };
}

function resolveApplyMode(rest: {
  writeKind: ImportWriteKind;
  reasons: ImportReviewReason[];
  occupancyHint?: ClassifiedImportRow["occupancyHint"];
  currentContractId?: string | null;
}): ImportApplyMode {
  if (rest.writeKind !== "apply_import_row") return "NO_OP";
  const occupancy = occupancyHintNeedsWrite(
    rest.occupancyHint ?? {
      occupancyIntent: null,
      fundingStatus: null,
      moveInStatus: null,
      needsReview: false,
    },
  );
  const transfer = rest.reasons.includes("HOLDER_CHANGE");
  const create = !rest.currentContractId;
  if (transfer && occupancy) return "TRANSFER_HOLDER_AND_UPDATE_OCCUPANCY";
  if (transfer) return "TRANSFER_HOLDER";
  if (create && occupancy) return "CREATE_CONTRACT_AND_UPDATE_OCCUPANCY";
  if (create) return "CREATE_CONTRACT";
  if (occupancy) return "UPDATE_OCCUPANCY";
  return "NO_OP";
}
