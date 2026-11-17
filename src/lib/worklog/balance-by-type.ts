import { isConfirmedBalancePaid, type BalancePaidDisplay } from '@/lib/move-in/balance-paid';
export type TypeBalanceCount = { unitType: string; totalUnits: number; balancePaid: number; unpaid: number; paidPercent: number };
/** Authorized current DB facts plus explicit field confirmations; never infer payment dates. */
export function balanceByType(units: readonly {unitId:string;unitType:string|null}[], occupancies: readonly ({unitId:string} & BalancePaidDisplay)[]) {
  const paidIds = new Set(occupancies.filter(isConfirmedBalancePaid).map(o=>o.unitId));
  const types = new Map<string, TypeBalanceCount>();
  for (const u of new Map(units.map(u=>[u.unitId,u])).values()) {
    const type=u.unitType?.trim() || '미분류';
    const row=types.get(type)??{unitType:type,totalUnits:0,balancePaid:0,unpaid:0,paidPercent:0};
    row.totalUnits++; if(paidIds.has(u.unitId))row.balancePaid++; types.set(type,row);
  }
  const finish=(r:TypeBalanceCount)=>({...r,unpaid:r.totalUnits-r.balancePaid,paidPercent:r.totalUnits?r.balancePaid/r.totalUnits*100:0});
  const rows=[...types.values()].sort((a,b)=>a.unitType==='미분류'?1:b.unitType==='미분류'?-1:a.unitType.localeCompare(b.unitType,'ko',{numeric:true})).map(finish);
  const total=finish(rows.reduce((t,r)=>({...t,totalUnits:t.totalUnits+r.totalUnits,balancePaid:t.balancePaid+r.balancePaid}),{unitType:'합계',totalUnits:0,balancePaid:0,unpaid:0,paidPercent:0}));
  return {rows,total};
}
