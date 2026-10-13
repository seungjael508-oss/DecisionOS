import 'server-only';
import { CONTRACT_ADDRESSES, CONTRACT_ADDRESS_SOURCE } from '@/lib/move-in/contract-address-data.server';
import { lookupContractAddress, type ContractAddressIdentity } from '@/lib/move-in/contract-address';

export function contractAddressFor(identity: ContractAddressIdentity): string | null {
  return lookupContractAddress(CONTRACT_ADDRESS_SOURCE.projectId, CONTRACT_ADDRESSES, identity);
}

export function attachContractAddress<T extends { projectId: string; unitId: string; currentContractId: string; currentCustomerId: string }>(row: T): T & { contractAddress: string | null } {
  return { ...row, contractAddress: contractAddressFor({ projectId: row.projectId, unitId: row.unitId, contractId: row.currentContractId, customerId: row.currentCustomerId }) };
}
