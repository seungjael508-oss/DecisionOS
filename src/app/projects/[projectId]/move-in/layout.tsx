import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { MoveInNav } from "@/components/move-in/move-in-nav";
import { AccessDenied } from "@/components/move-in/status-copy";
import {
  accessMessage,
  requireMoveInAccess,
} from "@/lib/move-in/access";

export default async function MoveInLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const access = await requireMoveInAccess(projectId);

  if (!access.ok) {
    if (access.kind === "unauthenticated") {
      redirect(
        `/login?next=${encodeURIComponent(`/projects/${projectId}/move-in`)}`,
      );
    }
    return <AccessDenied message={accessMessage(access.kind)} />;
  }

  return (
    <div className="flex min-h-screen">
      <MoveInNav
        projectId={access.projectId}
        projectName={access.projectName}
        role={access.role}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
