import { expect, test } from "@playwright/test";
import {
  cleanupMultiplayerPages,
  createMultiplayerPages,
  MultiplayerPages,
} from "./helpers/multiplayer";

test.describe("multiplayer start flow", () => {
  let multiplayerPages: MultiplayerPages | null = null;

  test.afterEach(async () => {
    if (!multiplayerPages) {
      return;
    }

    await cleanupMultiplayerPages(multiplayerPages);
    multiplayerPages = null;
  });

  test("commander and kaiju can start and route to role clients", async ({ browser }) => {
    multiplayerPages = await createMultiplayerPages(browser);

    const commanderName = `commander-${Date.now()}`;
    const kaijuName = `kaiju-${Date.now()}`;

    await multiplayerPages.commanderPage.goto("/");
    await multiplayerPages.commanderPage.getByLabel("Player Name").fill(commanderName);
    await multiplayerPages.commanderPage.getByRole("button", { name: "Enter Lobby" }).click();

    await expect(multiplayerPages.commanderPage).toHaveURL(/\/lobby(?:\.html)?$/);
    await expect(multiplayerPages.commanderPage.getByTestId("create-match-button")).toBeEnabled();
    await multiplayerPages.commanderPage.getByTestId("create-match-button").click();

    await expect(multiplayerPages.commanderPage).toHaveURL(/\/match-room\.html$/);
    await expect(multiplayerPages.commanderPage.getByTestId("match-room-root")).toBeVisible();

    const roomIdText = (await multiplayerPages.commanderPage.getByTestId("match-room-id").textContent()) || "";
    const roomId = roomIdText.trim();
    expect(roomId.length).toBeGreaterThan(0);

    await multiplayerPages.kaijuPage.goto("/");
    await multiplayerPages.kaijuPage.getByLabel("Player Name").fill(kaijuName);
    await multiplayerPages.kaijuPage.getByRole("button", { name: "Enter Lobby" }).click();

    await expect(multiplayerPages.kaijuPage).toHaveURL(/\/lobby(?:\.html)?$/);
    const joinMatchButton = multiplayerPages.kaijuPage.getByTestId(`enter-match-${roomId}`);
    await expect(joinMatchButton).toBeVisible();
    await expect(joinMatchButton).toBeEnabled();
    await joinMatchButton.click();

    await expect(multiplayerPages.kaijuPage).toHaveURL(/\/match-room\.html$/);
    await expect(multiplayerPages.kaijuPage.getByTestId("match-room-root")).toBeVisible();

    await multiplayerPages.commanderPage.getByTestId("claim-commander-button").click();
    await multiplayerPages.kaijuPage.getByTestId("claim-kaiju-button").click();

    await multiplayerPages.commanderPage.getByTestId("ready-toggle-button").click();
    await multiplayerPages.kaijuPage.getByTestId("ready-toggle-button").click();

    const startMatchButton = multiplayerPages.commanderPage.getByTestId("start-match-button");
    await expect(startMatchButton).toBeEnabled();
    await startMatchButton.click();

    await expect(multiplayerPages.commanderPage).toHaveURL(/\/commander\/index\.html$/);
    await expect(multiplayerPages.kaijuPage).toHaveURL(/\/kaiju\/index\.html$/);

    await expect(multiplayerPages.commanderPage.getByTestId("commander-root")).toBeVisible();
    await expect(multiplayerPages.commanderPage.getByTestId("commander-active-ui")).toBeVisible();

    await expect(multiplayerPages.kaijuPage.getByTestId("kaiju-root")).toBeVisible();
    await expect(multiplayerPages.kaijuPage.getByTestId("kaiju-active-ui")).toBeVisible();
  });
});
