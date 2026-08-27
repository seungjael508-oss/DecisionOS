import { describe, expect, it } from "vitest";
import { createBrowserClient } from "@/lib/supabase/client";
import { createServerClient } from "@/lib/supabase/server";

describe("supabase client factories", () => {
  it("exports createBrowserClient as a function", () => {
    expect(typeof createBrowserClient).toBe("function");
  });

  it("exports createServerClient as a function", () => {
    expect(typeof createServerClient).toBe("function");
  });
});
