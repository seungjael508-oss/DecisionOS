import "server-only";
import { createServerClient } from "@/lib/supabase/server";

export type TerminationReview = {
  event_id:string; unit_id:string; contract_id:string; active:boolean; reason:string; recorded_at:string;
};
type ReviewArgs = {
  p_project_id:string; p_unit_id:string; p_contract_id:string; p_active:boolean; p_reason:string; p_expected_event_id:string|null;
};
type ReviewKey = { unit_id:string; contract_id:string };
type ReviewRpc = {
  rpc(name:"list_active_move_in_termination_review_keys", args:{p_project_id:string}):Promise<{data:ReviewKey[]|null;error:unknown}>;
  rpc(name:"list_move_in_termination_review", args:{p_project_id:string}):Promise<{data:TerminationReview[]|null;error:unknown}>;
  rpc(name:"set_move_in_termination_review", args:ReviewArgs):Promise<{data:string|null;error:unknown}>;
};
export async function loadTerminationReviews(projectId:string) {
  const db = await createServerClient() as unknown as ReviewRpc;
  const result=await db.rpc("list_move_in_termination_review",{p_project_id:projectId});
  return {rows:result.data??[], error:!!result.error};
}
export async function saveTerminationReview(args:ReviewArgs) {
  const db = await createServerClient() as unknown as ReviewRpc;
  const result=await db.rpc("set_move_in_termination_review",args);
  return !result.error && !!result.data;
}

export async function loadTerminationReviewKeys(projectId:string) {
  const db=await createServerClient() as unknown as ReviewRpc;
  const result=await db.rpc("list_active_move_in_termination_review_keys",{p_project_id:projectId});
  return {rows:result.data??[], error:!!result.error};
}
