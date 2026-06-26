import { Browser, BrowserContext, Page } from "@playwright/test";
import type { ApiSeatReservation } from "./api.js";

export interface MultiplayerPages {
  commanderContext: BrowserContext;
  kaijuContext: BrowserContext;
  commanderPage: Page;
  kaijuPage: Page;
}

export interface MatchRoomSessionSeed {
  playerName: string;
  roomId: string;
  reservation?: ApiSeatReservation;
}

export async function createMultiplayerPages(browser: Browser): Promise<MultiplayerPages> {
  const commanderContext = await browser.newContext();
  const kaijuContext = await browser.newContext();

  const commanderPage = await commanderContext.newPage();
  const kaijuPage = await kaijuContext.newPage();

  return {
    commanderContext,
    kaijuContext,
    commanderPage,
    kaijuPage,
  };
}

export async function cleanupMultiplayerPages(multiplayerPages: MultiplayerPages): Promise<void> {
  await Promise.all([
    multiplayerPages.commanderContext.close(),
    multiplayerPages.kaijuContext.close(),
  ]);
}

export async function seedMatchRoomSession(page: Page, seed: MatchRoomSessionSeed): Promise<void> {
  await page.addInitScript((payload: MatchRoomSessionSeed) => {
    sessionStorage.setItem("playerName", payload.playerName);
    sessionStorage.setItem("currentMatchId", payload.roomId);
    sessionStorage.setItem("currentRoomName", "match");

    if (payload.reservation) {
      sessionStorage.setItem("pendingSeatReservation", JSON.stringify(payload.reservation));
    }
  }, seed);
}
