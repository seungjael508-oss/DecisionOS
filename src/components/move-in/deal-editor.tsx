"use client";

import {useUnitSave} from './unit-save-context';
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { saveMoveInUnitDeal } from "@/app/projects/[projectId]/move-in/deals/actions";
import {
  BROKERAGE_CONTACT_ROLE_LABELS,
  type BrokerageOfficeOption,
} from "@/lib/move-in/brokerages";
import type { DealBrokerageInput, UnitDealRecord } from "@/lib/move-in/deals";
import { EMPTY_UNIT_DEAL_TYPED_FIELDS } from "@/lib/move-in/deals";

const emptyDeal: UnitDealRecord = {
  consentStatus: "NOT_CONSENTED",
  dealStatus: "IN_PROGRESS",
  saleEnabled: false,
  jeonseEnabled: false,
  monthlyRentEnabled: false,
  saleNote: "",
  jeonseNote: "",
  monthlyRentNote: "",
  details: "",
  brokerages: [],
  typed: EMPTY_UNIT_DEAL_TYPED_FIELDS,
};

export function DealEditor({
  projectId,
  unitId,
  contractId,
  customerId,
  deal,
  offices,
  saveDisabled = false,
}: {
  projectId: string;
  unitId: string;
  contractId: string;
  customerId: string;
  deal: UnitDealRecord | null;
  offices: BrokerageOfficeOption[];
  saveDisabled?: boolean;
}) {
  const router = useRouter();
  const saving=useUnitSave(),submitting=useRef(false);
  const initial = deal ?? emptyDeal;
  const initialTyped = initial.typed ?? EMPTY_UNIT_DEAL_TYPED_FIELDS;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [officeToAdd, setOfficeToAdd] = useState("");
  const [brokerages, setBrokerages] = useState<DealBrokerageInput[]>(
    initial.brokerages,
  );

  const activeOffices = useMemo(
    () => offices.filter((office) => office.active),
    [offices],
  );

  function addOffice() {
    if (!officeToAdd) return;
    saving?.markDirty('deal');
    if (brokerages.some((item) => item.brokerageOfficeId === officeToAdd)) return;
    setBrokerages((current) => [
      ...current,
      { brokerageOfficeId: officeToAdd, brokerageContactId: null },
    ]);
    setOfficeToAdd("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveDisabled||submitting.current||saving?.busy||saving?.blocked) return;
    const form = new FormData(event.currentTarget);
    submitting.current=true;
    setPending(true);
    setError(null);
    const amount = (name: string) => {
      const raw = String(form.get(name) ?? "").trim();
      if (!raw) return null;
      const value = Number(raw);
      return Number.isFinite(value) && value > 0 ? value : null;
    };
    const typedValues = {
      askingSalePriceKrw: amount("asking_sale_price_krw"),
      jeonseDepositKrw: amount("jeonse_deposit_krw"),
      monthlyRentDepositKrw: amount("monthly_rent_deposit_krw"),
      monthlyRentAmountKrw: amount("monthly_rent_amount_krw"),
      saleListingStatus: (String(form.get("sale_listing_status") ?? "") || null) as typeof initialTyped.saleListingStatus,
      jeonseListingStatus: (String(form.get("jeonse_listing_status") ?? "") || null) as typeof initialTyped.jeonseListingStatus,
      monthlyRentListingStatus: (String(form.get("monthly_rent_listing_status") ?? "") || null) as typeof initialTyped.monthlyRentListingStatus,
    };
    const typedTouched = Boolean(deal?.typed) || Object.values(typedValues).some((value) => value !== null);
    const input:Parameters<typeof saveMoveInUnitDeal>[0]={
      projectId,
      unitId,
      contractId,
      customerId,
      consentStatus:
        String(form.get("consent_status")) === "CONSENTED"
          ? "CONSENTED"
          : "NOT_CONSENTED",
      dealStatus:
        String(form.get("deal_status")) === "COMPLETED"
          ? "COMPLETED"
          : "IN_PROGRESS",
      saleEnabled: form.get("sale_enabled") === "1",
      jeonseEnabled: form.get("jeonse_enabled") === "1",
      monthlyRentEnabled: form.get("monthly_rent_enabled") === "1",
      saleNote: String(form.get("sale_note") ?? ""),
      jeonseNote: String(form.get("jeonse_note") ?? ""),
      monthlyRentNote: String(form.get("monthly_rent_note") ?? ""),
      details: String(form.get("details") ?? ""),
      brokerages,
      ...(typedTouched ? { typed: typedValues } : {}),
    };
    const result=await (saving?saving.save({kind:'deal',input},'stay',()=>setError(null)):saveMoveInUnitDeal(input))
      .catch(()=>({ok:false as const})).finally(()=>{submitting.current=false;setPending(false);});
    if (!result.ok) {
      setError("거래정보를 저장하지 못했습니다. 다시 불러온 후 시도해 주세요.");
      return;
    }
    if(!saving)router.refresh();
  }

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-lg font-semibold">거래관리</h2>
      <form className="grid max-w-xl gap-4" onSubmit={onSubmit} onChange={()=>saving?.markDirty('deal')}>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">거래등록 동의</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="consent_status"
              value="CONSENTED"
              defaultChecked={initial.consentStatus === "CONSENTED"}
              aria-label="동의"
            />
            동의
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="consent_status"
              value="NOT_CONSENTED"
              defaultChecked={initial.consentStatus !== "CONSENTED"}
              aria-label="미동의"
            />
            미동의
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">거래상태</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="deal_status"
              value="IN_PROGRESS"
              defaultChecked={initial.dealStatus !== "COMPLETED"}
              aria-label="진행중"
            />
            진행중
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="deal_status"
              value="COMPLETED"
              defaultChecked={initial.dealStatus === "COMPLETED"}
              aria-label="거래완료"
            />
            거래완료
          </label>
        </fieldset>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="sale_enabled"
            value="1"
            defaultChecked={initial.saleEnabled}
            aria-label="매매"
          />
          매매
        </label>
        <label className="flex flex-col gap-1 text-sm">
          매매 관련 비고
          <input
            name="sale_note"
            defaultValue={initial.saleNote}
            className="border border-neutral-400 px-2 py-1"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="jeonse_enabled"
            value="1"
            defaultChecked={initial.jeonseEnabled}
            aria-label="전세"
          />
          전세
        </label>
        <label className="flex flex-col gap-1 text-sm">
          전세 관련 비고
          <input
            name="jeonse_note"
            defaultValue={initial.jeonseNote}
            className="border border-neutral-400 px-2 py-1"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="monthly_rent_enabled"
            value="1"
            defaultChecked={initial.monthlyRentEnabled}
            aria-label="월세"
          />
          월세
        </label>
        <label className="flex flex-col gap-1 text-sm">
          월세 관련 비고
          <input
            name="monthly_rent_note"
            defaultValue={initial.monthlyRentNote}
            className="border border-neutral-400 px-2 py-1"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          세부내용
          <textarea
            name="details"
            defaultValue={initial.details}
            className="border border-neutral-400 px-2 py-1"
            rows={4}
          />
        </label>

        <fieldset className="grid gap-3 border border-neutral-300 p-3">
          <legend className="px-1 text-sm font-medium">유형별 금액 및 매물상태</legend>
          <label className="flex flex-col gap-1 text-sm">희망 매도가
            <input type="number" min="1" name="asking_sale_price_krw" defaultValue={initialTyped.askingSalePriceKrw ?? ""} className="border border-neutral-400 px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1 text-sm">전세 보증금
            <input type="number" min="1" name="jeonse_deposit_krw" defaultValue={initialTyped.jeonseDepositKrw ?? ""} className="border border-neutral-400 px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1 text-sm">월세 보증금
            <input type="number" min="1" name="monthly_rent_deposit_krw" defaultValue={initialTyped.monthlyRentDepositKrw ?? ""} className="border border-neutral-400 px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1 text-sm">월세
            <input type="number" min="1" name="monthly_rent_amount_krw" defaultValue={initialTyped.monthlyRentAmountKrw ?? ""} className="border border-neutral-400 px-2 py-1" />
          </label>
          {(["sale", "jeonse", "monthly_rent"] as const).map((kind) => <label key={kind} className="flex flex-col gap-1 text-sm">{kind === "sale" ? "매매" : kind === "jeonse" ? "전세" : "월세"} 매물등록 상태
            <select name={`${kind}_listing_status`} defaultValue={initialTyped[`${kind === "sale" ? "sale" : kind === "jeonse" ? "jeonse" : "monthlyRent"}ListingStatus` as keyof typeof initialTyped] as string ?? ""} className="border border-neutral-400 px-2 py-1">
              <option value="">미확인</option><option value="NOT_LISTED">미등록</option><option value="PREPARING">등록 준비</option><option value="LISTED">등록 중</option><option value="PAUSED">보류</option>
            </select>
          </label>)}
        </fieldset>

        <div className="grid gap-2">
          <p className="text-sm font-medium">배포 중개업소</p>
          <label className="flex flex-col gap-1 text-sm">
            업소 선택
            <select
              aria-label="업소 선택"
              value={officeToAdd}
              onChange={(event) => setOfficeToAdd(event.target.value)}
              className="border border-neutral-400 px-2 py-1"
            >
              <option value="">선택</option>
              {activeOffices.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="w-fit border border-neutral-800 px-3 py-1"
            onClick={addOffice}
          >
            중개업소 추가
          </button>
          <ul className="flex flex-col gap-2">
            {brokerages.map((item) => {
              const office = offices.find((row) => row.id === item.brokerageOfficeId);
              return (
                <li key={item.brokerageOfficeId} className="border border-neutral-300 p-3">
                  <p className="text-sm font-medium">{office?.name ?? "업소"}</p>
                  <label className="mt-2 flex flex-col gap-1 text-sm">
                    담당자 선택
                    <select
                      aria-label="담당자 선택"
                      value={item.brokerageContactId ?? ""}
                      onChange={(event) => {
                        const contactId = event.target.value || null;
                        setBrokerages((current) =>
                          current.map((row) =>
                            row.brokerageOfficeId === item.brokerageOfficeId
                              ? { ...row, brokerageContactId: contactId }
                              : row,
                          ),
                        );
                      }}
                      className="border border-neutral-400 px-2 py-1"
                    >
                      <option value="">없음</option>
                      {(office?.contacts ?? [])
                        .filter((contact) => contact.active)
                        .map((contact) => (
                          <option key={contact.id} value={contact.id}>
                            {BROKERAGE_CONTACT_ROLE_LABELS[contact.role]} {contact.name}
                          </option>
                        ))}
                    </select>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={pending || saveDisabled}
          className="w-fit border border-neutral-800 px-3 py-1"
        >
          거래정보 저장
        </button>
      </form>
    </section>
  );
}
