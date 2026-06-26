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

async function postJson<TResponse>(baseURL: string, path: string, body: Record<string, unknown>): Promise<TResponse> {
  const response = await fetch(new URL(path, baseURL), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed (${response.status}) ${path}: ${errorText}`);
  }

  return (await response.json()) as TResponse;
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
