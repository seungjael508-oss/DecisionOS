// 현장 서버 action은 membership 확인 후 허용하며 관리 RPC를 개방하지 않는다.
import { beforeEach, expect, it, vi } from "vitest";
import { saveBrokerageOffice } from "@/app/projects/[projectId]/move-in/brokerages/actions";
import { canManageField, usesAssignedCustomerScope, HWAYANG_SHARED_PROJECT_ID } from "@/lib/move-in/field-access";
const state=vi.hoisted(()=>({ok:true,role:"COUNSELOR",rpc:vi.fn()}));
vi.mock("@/lib/move-in/access",()=>({requireMoveInAccess:async()=>({ok:state.ok,role:state.role})}));
vi.mock("@/lib/supabase/server",()=>({createServerClient:async()=>({rpc:state.rpc})}));
beforeEach(()=>{state.ok=true;state.role="COUNSELOR";state.rpc.mockReset().mockResolvedValue({error:null});});
const input={projectId:HWAYANG_SHARED_PROJECT_ID,name:"Synthetic",address:"",mainPhone:"",active:true,contacts:[]};
it("permits Hwayang field management without granting another project",()=>{
 expect(canManageField(HWAYANG_SHARED_PROJECT_ID,"COUNSELOR")).toBe(true);
 expect(canManageField("other","COUNSELOR")).toBe(false);
 expect(usesAssignedCustomerScope("other","COUNSELOR")).toBe(true);
 expect(usesAssignedCustomerScope(HWAYANG_SHARED_PROJECT_ID,"COUNSELOR")).toBe(false);
});
it("lets a Hwayang counselor save a brokerage",async()=>{
 expect(await saveBrokerageOffice(input)).toEqual({ok:true});
 expect(state.rpc).toHaveBeenCalledWith("save_brokerage_office",expect.objectContaining({p_project_id:HWAYANG_SHARED_PROJECT_ID}));
});
it("denies missing membership before executing any RPC",async()=>{
 state.ok=false;expect(await saveBrokerageOffice(input)).toEqual({ok:false});expect(state.rpc).not.toHaveBeenCalled();
});
it("retains admin-only brokerage write outside Hwayang",async()=>{
 expect(await saveBrokerageOffice({...input,projectId:"other"})).toEqual({ok:false});expect(state.rpc).not.toHaveBeenCalled();
});
