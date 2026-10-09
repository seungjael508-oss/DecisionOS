import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// service_role 키는 RLS를 완전히 우회하고 Supabase Auth Admin API(사용자 초대/삭제 등)를
// 호출할 수 있다. 반드시 "use server" 액션 안에서만 import하고, 절대 클라이언트 컴포넌트나
// 브라우저로 전달되는 값에 노출하지 않는다. (src/lib/supabase/server.ts의 RLS-bound 클라이언트와
// 용도가 다르므로 같은 파일에 합치지 않는다.)
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.");
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
