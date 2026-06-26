import { expect, test } from "@playwright/test";

test.describe("entry to lobby smoke", () => {
  test("loads entry, navigates to lobby, and reaches create match action", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Kaiju Arcade" })).toBeVisible();

    const playerNameInput = page.getByLabel("Player Name");
    await playerNameInput.fill(`smoke-${Date.now()}`);
    await page.getByRole("button", { name: "Enter Lobby" }).click();

    await expect(page).toHaveURL(/\/lobby(?:\.html)?$/);
    await expect(page.getByTestId("lobby-root")).toBeVisible();
    await expect(page.getByTestId("lobby-room-list")).toBeVisible();

    await expect
      .poll(async () => page.getByTestId("lobby-room-list").locator("li").count(), {
        message: "expected lobby room list to render at least one list row",
      })
      .toBeGreaterThan(0);

    const createMatchButton = page.getByTestId("create-match-button");
    await expect(createMatchButton).toBeVisible();
    await expect(createMatchButton).toBeEnabled();

    await createMatchButton.click();

    await expect(page).toHaveURL(/\/match-room\.html$/);
    await expect(page.getByTestId("match-room-root")).toBeVisible();
    await expect(page.getByTestId("match-room-phase")).toBeVisible();
  });
});
