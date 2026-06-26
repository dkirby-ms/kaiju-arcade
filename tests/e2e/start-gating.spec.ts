import { expect, test } from "@playwright/test";
import {
  createMatchReservation,
  joinKaijuReservation,
} from "./helpers/api";
import {
  cleanupMultiplayerPages,
  createMultiplayerPages,
  MultiplayerPages,
  seedMatchRoomSession,
} from "./helpers/multiplayer";

test.describe("start gating with API-assisted setup", () => {
  let multiplayerPages: MultiplayerPages | null = null;

  test.afterEach(async () => {
    if (!multiplayerPages) {
      return;
    }

    await cleanupMultiplayerPages(multiplayerPages);
    multiplayerPages = null;
  });

  test("blocks start until all players are ready, then allows start", async ({ browser, baseURL }) => {
    if (!baseURL) {
      throw new Error("Playwright baseURL is required for API-assisted setup.");
    }

    const commanderName = `start-gate-commander-${Date.now()}`;
    const kaijuName = `start-gate-kaiju-${Date.now()}`;

    const commanderReservation = await createMatchReservation(baseURL, {
      playerName: commanderName,
    });

    const kaijuReservation = await joinKaijuReservation(baseURL, commanderReservation.roomId, {
      playerName: kaijuName,
    });

    multiplayerPages = await createMultiplayerPages(browser);

    await Promise.all([
      seedMatchRoomSession(multiplayerPages.commanderPage, {
        playerName: commanderName,
        roomId: commanderReservation.roomId,
        reservation: commanderReservation,
      }),
      seedMatchRoomSession(multiplayerPages.kaijuPage, {
        playerName: kaijuName,
        roomId: kaijuReservation.roomId,
        reservation: kaijuReservation,
      }),
    ]);

    await Promise.all([
      multiplayerPages.commanderPage.goto("/match-room.html"),
      multiplayerPages.kaijuPage.goto("/match-room.html"),
    ]);

    await expect(multiplayerPages.commanderPage.getByTestId("match-room-root")).toBeVisible();
    await expect(multiplayerPages.kaijuPage.getByTestId("match-room-root")).toBeVisible();

    await multiplayerPages.commanderPage.getByTestId("claim-commander-button").click();
    await multiplayerPages.kaijuPage.getByTestId("claim-kaiju-button").click();

    await multiplayerPages.commanderPage.getByTestId("ready-toggle-button").click();

    const startMatchButton = multiplayerPages.commanderPage.getByTestId("start-match-button");
    await expect(startMatchButton).toBeEnabled();
    await startMatchButton.click();

    await expect
      .poll(async () => {
        const feedItems = multiplayerPages.commanderPage.locator("#signalFeed li");
        const count = await feedItems.count();
        if (count === 0) {
          return "";
        }

        return (await feedItems.first().textContent()) || "";
      })
      .toContain("MATCH START REJECTED - ALL PLAYERS MUST BE READY");

    await expect(multiplayerPages.commanderPage.getByTestId("match-room-phase")).toHaveText("LOBBY");

    await multiplayerPages.kaijuPage.getByTestId("ready-toggle-button").click();

    await expect(startMatchButton).toBeEnabled();
    await startMatchButton.click();

    await expect(multiplayerPages.commanderPage).toHaveURL(/\/commander\/index\.html$/);
    await expect(multiplayerPages.kaijuPage).toHaveURL(/\/kaiju\/index\.html$/);
  });
});
