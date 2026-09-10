import { expect, test } from "@playwright/test";

test.describe("move-in auth (unauthenticated)", () => {
  test("project move-in route redirects to login", async ({ page }) => {
    await page.goto(
      "/projects/20000000-0000-4000-8000-000000000001/move-in",
    );
    await expect(page).toHaveURL(/\/login\?next=/);
    await expect(page.getByRole("heading", { name: "로그인" })).toBeVisible();
  });
});
