"use server";
import { redirect } from "next/navigation";
import { requireMoveInAccess, requireProjectAdmin } from "@/lib/move-in/access";
import { todayChapterHref } from "@/lib/move-in/today-chapters";
import { loadTerminationReviews, saveTerminationReview } from "@/lib/move-in/termination-review.server";
import { createServerClient } from "@/lib/supabase/server";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const parsed=(data:FormData,name:string)=>{const value=data.get(name);return typeof value==="string"?value.trim():"";};

export async function changeTerminationReview(projectId:string,data:FormData):Promise<void> {
  if(!UUID.test(projectId)) return;
  const access=await requireMoveInAccess(projectId);
  if(!requireProjectAdmin(access)) return;
  const href=todayChapterHref(projectId,"termination");
  const done=(status:"saved"|"error")=>redirect(`${href}&review=${status}`);
  const reason=parsed(data,"reason");
  if(!reason || reason.length>500) return done("error");
  let unitId:string, contractId:string, expected:string|null;
  const mode=parsed(data,"mode");
  if(mode==="add") {
    const building=parsed(data,"building"),unit=parsed(data,"unit");
    if(!/^\d{1,6}$/.test(building)|| !/^\d{1,6}$/.test(unit)) return done("error");
    const db=await createServerClient();
    const target=await db.from("project_unit").select("unit_id").eq("project_id",projectId).eq("building_no",building).eq("unit_no",unit).maybeSingle();
    if(target.error||!target.data) return done("error");
    unitId=target.data.unit_id;
    const current=await db.from("contract").select("contract_id").eq("project_id",projectId).eq("unit_id",unitId).eq("contract_status","ACTIVE").maybeSingle();
    if(current.error||!current.data) return done("error");
    contractId=current.data.contract_id;
    const reviews=await loadTerminationReviews(projectId);
    if(reviews.error) return done("error");
    const prior=reviews.rows.find(x=>x.unit_id===unitId&&x.contract_id===contractId);
    if(prior?.active) return done("error");
    expected=prior?.event_id??null;
  } else if(mode==="remove") {
    unitId=parsed(data,"unitId");contractId=parsed(data,"contractId");expected=parsed(data,"eventId");
    if(![unitId,contractId,expected].every(x=>UUID.test(x))) return done("error");
  } else return done("error");
  const ok=await saveTerminationReview({p_project_id:projectId,p_unit_id:unitId,p_contract_id:contractId,
    p_active:mode==="add",p_reason:reason,p_expected_event_id:expected});
  done(ok?"saved":"error");
}
