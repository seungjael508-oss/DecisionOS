// A9(오늘 관리대상 계산 반복 제거) 마이그레이션·롤백 생성기.
// 원인(2026-10-19 격리 DB 재현): private.move_in_today_queue는 SET search_path가 있는 SQL 함수라 인라인되지 않고
//   매개변수 일반 계획으로 실행된다. 이때 active_units가 1행으로 추정되어(실제 426행) 한 번만 참조되는 contact_aggregate CTE가
//   중첩 반복으로 426번 다시 계산된다(17.9ms × 426 ≈ 7.6s). 본문 = 단독 실행 136ms.
// 수정: contact_aggregate·visit_schedule CTE를 MATERIALIZED로 고정(한 번만 계산). 그 밖의 본문은 A6과 한 글자도 다르지 않다.
// 사용: node gen-a9-queue-materialize.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const NAME = "20261019130000_today_queue_materialize";
const a6 = fs.readFileSync(path.join(root, "supabase/migrations/20261019110000_today_task_completion.sql"), "utf8");
const start = a6.indexOf("CREATE FUNCTION private.move_in_today_queue(");
const end = a6.indexOf("$function$;", a6.indexOf("AS $function$", start)) + "$function$;".length;
const original = a6.slice(start, end).replace("CREATE FUNCTION", "CREATE OR REPLACE FUNCTION");
const once = (s, a, b) => { if (s.split(a).length !== 2) throw new Error(`치환 대상이 1개가 아님: ${a}`); return s.replace(a, b); };
let next = once(original, "contact_aggregate as (", "contact_aggregate as materialized (");
next = once(next, "visit_schedule as (", "visit_schedule as materialized (");

const preflight = (applied) => `do $preflight$
declare
  v_def text;
begin
  select pg_get_functiondef(oid) into v_def from pg_proc
  where oid = to_regprocedure('private.move_in_today_queue(uuid,timestamp with time zone,uuid)');
  if v_def is null or position('latest_message_at' in v_def) = 0
     or (position('contact_aggregate as materialized' in v_def) > 0) is distinct from ${applied} then
    raise exception 'private.move_in_today_queue is not the expected ${applied ? "A9" : "A6(문자 판정 수정본)"} definition; abort';
  end if;
  perform set_config('lock_timeout', '5s', true);
end
$preflight$;`;

const up = `-- 오늘 관리대상 계산 반복 제거 (Production 미적용, 별도 승인 필요)
-- 선행: 20261019110000_today_task_completion(문자 판정 수정본, SHA efad6d5d…) 적용 후
-- 원인: SQL 함수의 매개변수 일반 계획에서 contact_aggregate CTE가 세대 수만큼 반복 계산(격리 DB 7.7s, 운영 6.5s).
-- 수정: contact_aggregate·visit_schedule CTE에 MATERIALIZED만 추가. 판정·열·지문·권한(SECURITY INVOKER)·ACL은 그대로이므로
--   오늘 처리 기록과의 지문 일치에 영향이 없다(처리 기록 조건 없음). 데이터 변경 없음.
begin;

${preflight(false)}

${next}

commit;
`;
const down = `-- ${NAME} 롤백: private.move_in_today_queue를 A6(문자 판정 수정본) 정의로 되돌린다. 데이터 변경 없음.
begin;

${preflight(true)}

${original}

commit;
`;
fs.writeFileSync(path.join(root, `supabase/migrations/${NAME}.sql`), up);
fs.writeFileSync(path.join(root, `supabase/rollback/${NAME}.rollback.sql`), down);
console.log(`OK ${NAME}`);
