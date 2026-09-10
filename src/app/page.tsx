import Link from "next/link";
import { redirect } from "next/navigation";
import { loadMemberProjects } from "@/lib/move-in/queries";

export default async function Home() {
  const result = await loadMemberProjects();
  if (!result.ok && result.kind === "unauthenticated") {
    redirect("/login");
  }
  if (!result.ok) {
    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold">데이터를 불러오지 못했습니다.</h1>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">프로젝트</h1>
      {result.projects.length === 0 ? (
        <p className="mt-4">접근 가능한 프로젝트가 없습니다.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {result.projects.map((project) => (
            <li key={project.id} className="border border-neutral-300 p-4">
              <Link
                className="text-lg font-semibold underline"
                href={`/projects/${project.id}/move-in`}
              >
                {project.name}
              </Link>
              <p className="text-sm text-neutral-600">입주촉진</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
