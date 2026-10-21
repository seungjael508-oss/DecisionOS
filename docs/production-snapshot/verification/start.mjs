// 격리 검증용 로컬 PostgreSQL 17 클러스터(임시 폴더, 127.0.0.1 전용)
import EmbeddedPostgres from "embedded-postgres";

const pg = new EmbeddedPostgres({
  databaseDir: new URL("./data", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
  user: "postgres",
  password: "localtest",
  port: 54329,
  persistent: true,
  postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
});
const fresh = process.argv.includes("--init");
if (fresh) await pg.initialise();
await pg.start();
console.log("postgres started on 127.0.0.1:54329");
process.on("SIGINT", async () => { await pg.stop(); process.exit(0); });
setInterval(() => {}, 1 << 30);
