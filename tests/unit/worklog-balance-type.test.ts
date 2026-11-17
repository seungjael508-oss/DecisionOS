import {expect,test} from 'vitest';
import {balanceByType} from '@/lib/worklog/balance-by-type';
test('unique units, blank types and paid-date-only current counts',()=>{
 const units=[{unitId:'1',unitType:'84A'},{unitId:'1',unitType:'84A'},{unitId:'2',unitType:'84A'},{unitId:'3',unitType:' '},{unitId:'4',unitType:'74A'}];
 const r=balanceByType(units,[{unitId:'1',balancePaidAt:'2026-11-06'},{unitId:'1',balancePaidAt:'2026-11-06'},{unitId:'2',balancePaidAt:null},{unitId:'3',balancePaidAt:'2026-11-06'},{unitId:'foreign',balancePaidAt:'2026-11-06'}]);
 expect(r.total).toEqual({unitType:'합계',totalUnits:4,balancePaid:2,unpaid:2,paidPercent:50});
 expect(r.rows.find(r=>r.unitType==='84A')?.paidPercent).toBe(50);
 expect(r.rows.at(-1)?.unitType).toBe('미분류');
 expect(balanceByType([],[]).total.paidPercent).toBe(0);
});
