import {expect,test} from 'vitest';
import {countLedgerChapters,matchesLedgerChapter,LEDGER_CHAPTER_LABELS} from '@/lib/move-in/ledger-chapters';
import {applyLedgerQuery,parseLedgerQuery,patchLedgerQuery,type LedgerFilterRow} from '@/lib/move-in/ledger-filters';
const base:LedgerFilterRow={unitId:'a',buildingNo:'101',unitNo:'201',currentGrade:'A',customerName:null,phone:null,assigneeId:null,effectiveIntent:'MOVE_IN',rentalType:null,funding:'NORMAL',moveIn:'MOVED_IN',nextContact:null,specialReasons:[],specialPriority:null,dealTypes:[],payment:'UNKNOWN',balance:null,views:[]};
test('paid chapter uses only paid dates, independently of accounting and move-in',()=>{
 const paid={...base,balancePaidAt:'2026-11-06T00:00:00Z'};
 const accounting={...base,unitId:'b',payment:'PAID',moveIn:'BALANCE_PAID',balancePaidAt:null};
 expect(matchesLedgerChapter(paid,'balance_paid')).toBe(true);
 expect(matchesLedgerChapter(accounting,'balance_paid')).toBe(false);
 expect(countLedgerChapters([paid,paid,accounting]).balance_paid).toBe(1);
 expect(LEDGER_CHAPTER_LABELS.balance_paid).toBe('잔금완납');
 const state=parseLedgerQuery(new URLSearchParams('chapter=balance_paid'));
 const selected=applyLedgerQuery([paid,accounting],state,new Date());
 expect(selected.total).toBe(1);expect(selected.pageRows[0].unitId).toBe('a');
 const cleared=patchLedgerQuery(new URLSearchParams('payment=PAID&customerSearch=x&page=8'),{reset:true,chapter:'balance_paid'});
 expect(cleared.get('payment')).toBeNull();expect(cleared.get('customerSearch')).toBeNull();
 expect(parseLedgerQuery(cleared).chapter).toBe('balance_paid');
});
