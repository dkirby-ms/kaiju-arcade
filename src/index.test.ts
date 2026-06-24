import request from "supertest";

const mockDefine = jest.fn();
const mockCreate = jest.fn();
const mockQuery = jest.fn();

jest.mock("@colyseus/ws-transport", () => ({
  WebSocketTransport: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("colyseus", () => ({
  Server: jest.fn().mockImplementation(() => ({
    define: mockDefine,
  })),
  Room: class {
    onMessage(_type: string, _handler: unknown): void {
      // no-op for unit tests
    }
  },
  Client: class {},
  matchMaker: {
    create: mockCreate,
    query: mockQuery,
  },
}));

describe("API /api/matches", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a match and returns reservation metadata", async () => {
    mockCreate.mockResolvedValue({
      sessionId: "sess-1",
      roomId: "room-1",
      processId: "proc-1",
      publicAddress: "localhost:3000",
    });

    const { app } = await import("./index");

    const response = await request(app)
      .post("/api/matches")
      .send({ cityName: "Neo Tokyo" });

    expect(response.status).toBe(200);
    expect(response.body.roomName).toBe("match");
    expect(response.body.sessionId).toBe("sess-1");
    expect(response.body.roomId).toBe("room-1");
    expect(response.body.processId).toBe("proc-1");
    expect(response.body).toHaveProperty("wsEndpoint");
    expect(response.body.reconnect).toEqual({
      enabled: true,
      tokenRequired: true,
      graceWindowMs: 30_000,
      optionKey: "reconnectToken",
    });
    expect(mockCreate).toHaveBeenCalledWith("match", { cityName: "Neo Tokyo" });
  });

  it("returns 400 when create fails", async () => {
    mockCreate.mockRejectedValue(new Error("create failed"));

    const { app } = await import("./index");

    const response = await request(app)
      .post("/api/matches")
      .send({ cityName: "Neo Tokyo" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("create failed");
  });

  it("lists active matches", async () => {
    mockQuery.mockResolvedValue([
      {
        roomId: "room-a",
        name: "match",
        clients: 2,
        maxClients: 5,
        locked: false,
      },
    ]);

    const { app } = await import("./index");

    const response = await request(app).get("/api/matches");

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.matches[0]).toEqual({
      roomId: "room-a",
      name: "match",
      clients: 2,
      maxClients: 5,
      locked: false,
    });
    expect(mockQuery).toHaveBeenCalledWith({
      name: "match",
      private: false,
      locked: false,
    });
  });

  it("returns 500 when listing fails", async () => {
    mockQuery.mockRejectedValue(new Error("query failed"));

    const { app } = await import("./index");

    const response = await request(app).get("/api/matches");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("query failed");
  });
});
