import {
  LEGACY_PORTAL_READ_ACTIONS,
  LEGACY_PORTAL_WRITE_ACTIONS,
  type LegacyPortalReadAction,
} from "@/lib/legacy-migration/types";

const DEFAULT_API_URL =
  "https://script.google.com/macros/s/AKfycbyjXcMI70xMq7dLqrnEPPT-7yha1__XJktmBgJ2L0Vm9pvSMFfY03J_hyT_LNyqj6_F/exec";

export { LEGACY_PORTAL_READ_ACTIONS, LEGACY_PORTAL_WRITE_ACTIONS };

export function legacyPortalApiUrl() {
  return process.env.LEGACY_PORTAL_API_URL || DEFAULT_API_URL;
}

function isWriteAction(action: string) {
  return (LEGACY_PORTAL_WRITE_ACTIONS as readonly string[]).includes(action);
}

function isReadAction(action: string): action is LegacyPortalReadAction {
  return (LEGACY_PORTAL_READ_ACTIONS as readonly string[]).includes(action);
}

export async function callLegacyPortalRead<T>(
  action: LegacyPortalReadAction,
  params: Record<string, unknown> = {},
  apiUrl = legacyPortalApiUrl(),
): Promise<T> {
  if (isWriteAction(action)) {
    throw new Error("legacy portal write APIs are not allowed");
  }
  if (!isReadAction(action)) {
    throw new Error("legacy portal action is not an allowed read API");
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...params }),
  });
  const text = await response.text();
  if (!text) {
    throw new Error(`empty legacy portal response (HTTP ${response.status})`);
  }
  let json: { ok?: boolean; error?: string; data?: T };
  try {
    json = JSON.parse(text) as { ok?: boolean; error?: string; data?: T };
  } catch {
    throw new Error("legacy portal returned non-JSON");
  }
  if (!response.ok || json.ok !== true) {
    throw new Error(json.error || "legacy portal request failed");
  }
  return json.data as T;
}

export async function loginLegacyPortalAdmin(input: {
  name: string;
  password: string;
  apiUrl?: string;
}) {
  const result = await callLegacyPortalRead<{ token: string; role: string }>(
    "checkPassword",
    { name: input.name, password: input.password },
    input.apiUrl,
  );
  if (result.role !== "관리자") {
    throw new Error("getAllUnits requires an administrator session");
  }
  return result;
}
