import { Browser, BrowserContext, Page } from "@playwright/test";

export interface MultiplayerPages {
  commanderContext: BrowserContext;
  kaijuContext: BrowserContext;
  commanderPage: Page;
  kaijuPage: Page;
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

export async function gotoLobby(pages: Pick<MultiplayerPages, "commanderPage" | "kaijuPage">): Promise<void> {
  await Promise.all([pages.commanderPage.goto("/lobby"), pages.kaijuPage.goto("/lobby")]);
}

export async function cleanupMultiplayerPages(multiplayerPages: MultiplayerPages): Promise<void> {
  await Promise.all([
    multiplayerPages.commanderContext.close(),
    multiplayerPages.kaijuContext.close(),
  ]);
}
