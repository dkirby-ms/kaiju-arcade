(function attachColyseusClient(global) {
  const RECONNECT_ROOM_NAME = "match";

  function getColyseusNamespace() {
    if (!global.colyseus || !global.colyseus.Client) {
      throw new Error("Colyseus client library is not loaded.");
    }

    return global.colyseus;
  }

  function getWsEndpoint() {
    const protocol = global.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${global.location.host}`;
  }

  function createClient() {
    const Colyseus = getColyseusNamespace();
    return new Colyseus.Client(getWsEndpoint());
  }

  async function joinLobby(client, options) {
    return client.joinOrCreate("lobby", options || {});
  }

  async function createMatch(client, options) {
    return client.create(RECONNECT_ROOM_NAME, options || {});
  }

  async function joinMatchById(client, roomId, options) {
    if (!roomId) {
      throw new Error("roomId is required to join a match.");
    }

    return client.joinById(roomId, options || {});
  }

  function normalizeLobbyRoom(roomId, roomData) {
    return {
      roomId: String(roomId || roomData?.roomId || "").trim(),
      name: roomData?.name || "match",
      clients: Number(roomData?.clients || 0),
      maxClients: Number(roomData?.maxClients || 0),
      locked: Boolean(roomData?.locked),
      metadata: roomData?.metadata || {},
    };
  }

  function bindLobbyRoomListHandlers(lobbyRoom, handlers) {
    const state = {
      roomsById: new Map(),
    };

    function emitSnapshot() {
      if (handlers && typeof handlers.onSnapshot === "function") {
        handlers.onSnapshot(Array.from(state.roomsById.values()));
      }
    }

    lobbyRoom.onMessage("rooms", (rooms) => {
      state.roomsById.clear();

      (Array.isArray(rooms) ? rooms : []).forEach((room) => {
        const normalized = normalizeLobbyRoom(room?.roomId, room);
        if (normalized.roomId) {
          state.roomsById.set(normalized.roomId, normalized);
        }
      });

      if (handlers && typeof handlers.onRooms === "function") {
        handlers.onRooms(Array.from(state.roomsById.values()));
      }

      emitSnapshot();
    });

    lobbyRoom.onMessage("+", (payload) => {
      const tuple = Array.isArray(payload) ? payload : [];
      const roomId = tuple[0];
      const roomData = tuple[1] || {};
      const normalized = normalizeLobbyRoom(roomId, roomData);

      if (!normalized.roomId) {
        return;
      }

      state.roomsById.set(normalized.roomId, normalized);

      if (handlers && typeof handlers.onAdd === "function") {
        handlers.onAdd(normalized, Array.from(state.roomsById.values()));
      }

      emitSnapshot();
    });

    lobbyRoom.onMessage("-", (payload) => {
      const roomId = String(payload || "").trim();
      if (!roomId) {
        return;
      }

      state.roomsById.delete(roomId);

      if (handlers && typeof handlers.onRemove === "function") {
        handlers.onRemove(roomId, Array.from(state.roomsById.values()));
      }

      emitSnapshot();
    });

    return state;
  }

  global.KaijuColyseusClient = {
    createClient,
    getWsEndpoint,
    joinLobby,
    createMatch,
    joinMatchById,
    bindLobbyRoomListHandlers,
  };
})(window);