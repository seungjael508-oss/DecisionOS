export type ContractAddressIdentity = { projectId: string; unitId: string; contractId: string; customerId: string };
export type ContractAddressEntry = { contractId: string; customerId: string; address: string };

/**
 * 명부 주소는 생성 시점의 계약·고객 ID에 묶여 있다.
 * 명의변경 등으로 현재 ACTIVE 계약자가 바뀌면 이전 계약자 주소가 보이지 않도록 null(미등록)을 돌려준다.
 */
export function lookupContractAddress(
  sourceProjectId: string, entries: Readonly<Record<string, ContractAddressEntry>>, identity: ContractAddressIdentity,
): string | null {
  if (identity.projectId !== sourceProjectId) return null;
  const entry = Object.hasOwn(entries, identity.unitId) ? entries[identity.unitId] : undefined;
  if (!entry || entry.contractId !== identity.contractId || entry.customerId !== identity.customerId) return null;
  return entry.address.trim() || null;
}
