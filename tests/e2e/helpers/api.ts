export interface ApiSeatReservation {
  roomName: string;
  sessionId: string;
  roomId: string;
  processId: string;
  publicAddress: string;
  wsEndpoint: string;
  reconnect: {
    enabled: boolean;
    tokenRequired: boolean;
    graceWindowMs: number;
    optionKey: string;
  };
}

export interface CreateMatchRequest {
  playerName?: string;
  reconnectToken?: string;
}

export interface JoinMatchRequest {
  playerName?: string;
  reconnectToken?: string;
}

const DEFAULT_TIMEOUT_MS = 10_000;

interface PostJsonOptions {
  timeoutMs?: number;
}

async function postJson<TResponse>(
  baseURL: string,
  path: string,
  body: Record<string, unknown>,
  options?: PostJsonOptions,
): Promise<TResponse> {
  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(new URL(path, baseURL), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Request failed (${response.status}) ${path}: ${errorText}`);
    }

    return (await response.json()) as TResponse;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms: ${path}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

export async function createMatchReservation(
  baseURL: string,
  request: CreateMatchRequest = {},
): Promise<ApiSeatReservation> {
  return postJson<ApiSeatReservation>(baseURL, "/api/matches", request);
}

export async function joinMatchReservation(
  baseURL: string,
  roomId: string,
  request: JoinMatchRequest = {},
): Promise<ApiSeatReservation> {
  return postJson<ApiSeatReservation>(baseURL, `/api/matches/${encodeURIComponent(roomId)}/join`, request);
}

export async function joinKaijuReservation(
  baseURL: string,
  roomId: string,
  request: JoinMatchRequest = {},
): Promise<ApiSeatReservation> {
  return postJson<ApiSeatReservation>(
    baseURL,
    `/api/matches/${encodeURIComponent(roomId)}/kaiju-join`,
    request,
  );
}
