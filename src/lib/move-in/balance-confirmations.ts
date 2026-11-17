/** Approved field confirmations; no actual payment dates were supplied.
 * November 7 source: 푸르지오센터파인 잔금납부명단 (2).xlsx (169 units).
 * SHA256: 7aa839bb1f73bc85141f863a32aeb9a22ab4af9772f160d330eb03cbf52293b9
 * 102-203 is unpaid per field correction and is never a field confirmation.
 * After its authenticated RPC cancellation: 149 dated + 20 undated = 169.
 * November 6 eight confirmations remain effective for historical report dates.
 * Apply only to authorized read results, never to RPC arguments or raw payments.
 */
const PROJECT_ID = '1283e198-5043-4027-96d6-edcc7a6686c6';
export const BALANCE_CONFIRMATION_AS_OF = '2026-11-07';
const EFFECTIVE_AT = Date.parse('2026-11-06T00:00:00+09:00');
const confirmations = [{"unitId":"3504bdab-b036-4c89-9540-3274e2655633","buildingNo":"101","unitNo":"1202"},{"unitId":"3410ddff-57b7-4cb3-8658-7f2f44a2a4c6","buildingNo":"101","unitNo":"2104"},{"unitId":"1352d846-9678-4c7a-b119-aa8884915180","buildingNo":"101","unitNo":"2704"},{"unitId":"36c51225-7829-4fe0-8f3e-1addcdd5860e","buildingNo":"102","unitNo":"801"},{"unitId":"f55dfd1d-f893-4ea8-ae57-80161ce773c8","buildingNo":"104","unitNo":"1004"},{"unitId":"01467676-f2d7-4833-a6ae-dc249c67243c","buildingNo":"104","unitNo":"804"},{"unitId":"8d307202-17ff-4919-90e8-c59a06e5a15e","buildingNo":"105","unitNo":"2402"},{"unitId":"20ea98a2-e5d8-49dd-95be-32db59fbe194","buildingNo":"107","unitNo":"1103"}] as const;
const unitIds = new Set<string>(confirmations.map(row => row.unitId));
const NOVEMBER_7_EFFECTIVE_AT = Date.parse('2026-11-07T00:00:00+09:00');
const november7UnitIds = new Set<string>([
  '4244771b-d4e9-4787-ae3c-6d9422e5de7d', // 102-1803
  '2f53a701-a745-4636-bb7e-5c5b5f3485f5', // 104-2701
  '110410e4-f512-4468-bb78-f30ccd2c0895', // 105-1104
  'e1ebab1b-52c2-4331-91de-4a75e5efcb7d', // 105-1503
  'fe657d2c-c477-46d8-b181-33ab38c1482b', // 106-2702
  '14ade6bc-7666-4351-994a-53c58832c12b', // 107-303
  '1c7f9e7a-8704-4ed3-874c-e2cce4be8e63', // 107-2504
  '3a98e0db-bf27-45e0-9468-35951613fe93', // 108-501
  '0dd1765c-6975-46a1-9acc-8250bf1e8adb', // 108-504
  'd68a56a6-7f54-4d7d-b887-2d64eb58d53a', // 108-604
  '8ff89a91-134c-4d91-bebd-b27cb2b7f287', // 108-1201
  '8ff84afd-1006-40af-b4a7-394cf88043f3', // 108-2504
]);

export function fieldConfirmedBalancePaid(projectId: string, unitId: string, asOf = new Date()): boolean {
  const time = asOf.getTime();
  return projectId === PROJECT_ID && (
    (time >= EFFECTIVE_AT && unitIds.has(unitId)) ||
    (time >= NOVEMBER_7_EFFECTIVE_AT && november7UnitIds.has(unitId))
  );
}
