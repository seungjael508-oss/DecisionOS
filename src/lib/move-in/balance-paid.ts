/** Display confirmation only. Never passed to a payment writer or used as a payment date. */
export type BalancePaidDisplay = {
  balancePaidAt?: string | null;
  fieldConfirmedBalancePaid?: boolean;
};
export function isConfirmedBalancePaid(row: BalancePaidDisplay): boolean {
  return Boolean(row.balancePaidAt) || row.fieldConfirmedBalancePaid === true;
}
export function balancePaidPercent(paid: number, total: number): string {
  return (total ? paid / total * 100 : 0).toFixed(2);
}
