import { expect, test } from "vitest";
import { confirmedTitleChange } from "@/lib/move-in/today-title-change";

const current = {projectId:"project",unitId:"unit",currentContractId:"current",currentCustomerId:"new"};
const prior = {project_id:"project",unit_id:"unit",contract_id:"prior",customer_id:"old",previous_contract_id:null,contract_status:"CANCELLED",cancellation_reason:"HOLDER_CHANGED"};
const active = {...prior,contract_id:"current",customer_id:"new",previous_contract_id:"prior",contract_status:"ACTIVE",cancellation_reason:null};
const audit = {project_id:"project",unit_id:"unit",contract_id:"current",field_changed:"holder_transfer",reason:"GIFT",changed_at:"2025-10-21T16:00:00Z",previous_value:'{"contract_id":"prior","customer_id":"old"}',new_value:'{"contract_id":"current","previous_contract_id":"prior","customer_id":"new"}'};
const links = [prior,active];

test("a prior gift is a dated title-change event, not a sale confirmation", () => {
  expect(confirmedTitleChange(current,links,[audit])).toEqual({kind:"증여",recordedDate:"2025-10-22"});
});
test("a recorded sale names the type without confusing record date and effective date", () => {
  expect(confirmedTitleChange(current,links,[{...audit,reason:"SALE"}])).toEqual({kind:"매매",recordedDate:"2025-10-22"});
});
test("matching unit or holder alone does not supply evidence", () => {
  expect(confirmedTitleChange(current,links,[])).toBeNull();
  expect(confirmedTitleChange(current,links,[{...audit,unit_id:"other"}])).toBeNull();
  expect(confirmedTitleChange(current,links,[{...audit,project_id:"other"}])).toBeNull();
  expect(confirmedTitleChange(current,links,[{...audit,new_value:audit.new_value.replace('"new"','"wrong"')}])).toBeNull();
  expect(confirmedTitleChange(current,[{...prior,cancellation_reason:"TERMINATION"},active],[audit])).toBeNull();
  expect(confirmedTitleChange(current,links,[audit,{...audit,reason:"SALE"}])).toBeNull();
  expect(confirmedTitleChange(current,links,[{...audit,changed_at:"invalid"}])).toBeNull();
  expect(confirmedTitleChange(current,links,[{...audit,reason:"UNKNOWN"}])).toBeNull();
});
test("accepts the audited predecessor anchor only when it identifies this successor", () => {
  expect(confirmedTitleChange(current,links,[{...audit,contract_id:"prior"}])?.kind).toBe("증여");
  expect(confirmedTitleChange(current,links,[{...audit,contract_id:"older"}])).toBeNull();
});
