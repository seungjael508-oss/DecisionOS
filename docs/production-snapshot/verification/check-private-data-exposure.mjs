// 개인정보 데이터 파일 3개가 Git 추적·클라이언트 번들에 들어가지 않았는지 점검(값은 출력하지 않고 건수만)
// 사용: next build 를 마친 저장소 루트에서  node docs/production-snapshot/verification/check-private-data-exposure.mjs [저장소경로]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repo = path.resolve(process.argv[2] ?? ".");
const FILES = [
  "src/lib/move-in/ledger-management-data.server.ts",
  "src/lib/move-in/contract-address-data.server.ts",
  "src/lib/move-in/payment-projection-source.server.ts",
  "src/lib/move-in/ledger-finance-data.server.ts",
];
let failed = false;
const report = (ok, message) => { if (!ok) failed = true; console.log(`${ok ? "PASS" : "FAIL"} ${message}`); };
const git = (...args) => { try { return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8" }); } catch (e) { return e.stdout ?? ""; } };

// 1) 파일 존재(실제 데이터 빌드 환경인지)
for (const f of FILES) report(fs.existsSync(path.join(repo, f)), `데이터 파일 존재: ${f}`);

// 2) Git 미추적·ignore 대상·과거 커밋 이력 없음
const isRepo = git("rev-parse", "--is-inside-work-tree").trim() === "true";
if (isRepo) {
  for (const f of FILES) {
    report(git("ls-files", "--", f).trim() === "", `Git 추적 안 됨: ${f}`);
    report(git("check-ignore", "-q", "--", f) === "" && git("check-ignore", "--", f).trim() !== "", `.gitignore 대상: ${f}`);
    report(git("log", "--all", "--oneline", "--", f).trim() === "", `커밋 이력 없음(모든 브랜치): ${f}`);
  }
} else {
  console.log("SKIP Git 점검: 저장소가 아님(빌드 복사본)");
}

// 3) 클라이언트 번들(.next/static)에 데이터 파일의 고유 문자열이 없음
const staticDir = path.join(repo, ".next", "static");
const serverDir = path.join(repo, ".next", "server");
report(fs.existsSync(staticDir), ".next/static 존재(next build 완료)");
const walk = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]) : [];
const clientText = walk(staticDir).filter(f => /\.(js|json|txt|html|css)$/.test(f)).map(f => fs.readFileSync(f, "utf8")).join("\n");
const serverText = walk(serverDir).filter(f => /\.(js|json)$/.test(f)).map(f => fs.readFileSync(f, "utf8")).join("\n");
for (const f of FILES) {
  const full = path.join(repo, f);
  if (!fs.existsSync(full)) continue;
  const src = fs.readFileSync(full, "utf8");
  // 문자열 리터럴(8자 이상) + export 이름을 표식으로 사용. 표식 값 자체는 출력하지 않는다.
  // 제외(일반어 오탐): 객체 키(뒤에 ':'), 영문자만으로 된 상태 코드(CANCELLED·unavailable 등), 화면 기준일 표시용 원본 파일명(*.xlsx).
  // 숫자·한글·기호가 섞인 고유값(계좌번호·해시·이름·주소·UUID 등)은 그대로 검사한다.
  const generic = (m) => /^[A-Za-z_]+$/.test(m[2]) || /\.xlsx$/.test(m[2]) || /^\s*:/.test(src.slice(m.index + m[0].length, m.index + m[0].length + 3));
  const literals = [...new Set([...src.matchAll(/(["'`])((?:(?!\1)[^\\\n]|\\.){8,200})\1/g)].filter(m => !generic(m)).map(m => m[2]))];
  const exports = [...src.matchAll(/export\s+const\s+(\w+)/g)].map(m => m[1]);
  const markers = [...literals, ...exports];
  const inClient = markers.filter(m => clientText.includes(m)).length;
  const inServer = markers.filter(m => serverText.includes(m)).length;
  report(inClient === 0, `클라이언트 번들 노출 없음: ${path.basename(f)} (표식 ${markers.length}개 중 클라이언트 ${inClient}개, 서버 번들 ${inServer}개)`);
}
console.log(failed ? "\n결과: FAIL — 배포 금지, 원인 확인 필요" : "\n결과: PASS");
process.exit(failed ? 1 : 0);
