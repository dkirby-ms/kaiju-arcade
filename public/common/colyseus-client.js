(function attachColyseusClient(global) {
  const RECONNECT_ROOM_NAME = "match";
  const METRIC_EVENT_NAME = "kaiju.colyseus.client.metric";
  const LOBBY_JOIN_TIMEOUT_MS = 12000;

  function initializeColyseusClient() {
    function getColyseusNamespace() {
      const namespace = global.colyseus || global.Colyseus;

      if (!namespace || !namespace.Client) {
        console.error("Colyseus namespace not found. Available globals:", Object.keys(global).filter(k => k.includes('olyseus') || k.includes('OLYSEUS')));
        throw new Error("Colyseus client library is not loaded.");
      }

      return namespace;
    }

    function getWsEndpoint() {
      const protocol = global.location.protocol === "https:" ? "wss:" : "ws:";
      return `${protocol}//${global.location.host}`;
    }

    function createClient() {
      // Always create a real Colyseus client; fail fast if not available
      try {
        const Colyseus = getColyseusNamespace();
        const endpoint = getWsEndpoint();
        console.log("Creating Colyseus client for:", endpoint);
        const client = new Colyseus.Client(endpoint);

        // Some SDK builds expose room-level signals only (no client.onError/onClose).
        // Keep diagnostics best-effort without assuming optional client APIs.
        if (typeof client.onError === "function") {
          client.onError((error) => {
            console.error("Colyseus client error event:", {
              message: error?.message,
              code: error?.code,
              type: error?.type,
            });
          });
        }

        if (typeof client.onClose === "function") {
          client.onClose(() => {
            console.warn("Colyseus client closed");
          });
        }
        
        console.log("Colyseus client created successfully");
        return client;
      } catch (error) {
        console.error("Failed to create Colyseus client:", error?.message);
        throw error;
      }
    }

    function emitClientMetric(type, labels) {
      try {
        global.dispatchEvent(new CustomEvent(METRIC_EVENT_NAME, {
          detail: {
            type,
            labels: labels || {},
            timestamp: Date.now(),
          },
        }));
      } catch {
        // Browser compatibility and telemetry safety: metric events must never break gameplay.
      }
    }

    async function postJson(path, payload) {
      const response = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload || {}),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed: ${response.status}`);
      }

      return response.json();
    }

    function normalizeSeatReservation(reservation) {
      if (!reservation || !reservation.sessionId || !(reservation.roomId || reservation.room?.roomId)) {
        throw new Error("Invalid seat reservation response from server.");
      }

      if (reservation.roomId) {
        return reservation;
      }

      return {
        sessionId: reservation.sessionId,
        roomId: reservation.room?.roomId,
        roomName: reservation.room?.name || RECONNECT_ROOM_NAME,
        processId: reservation.room?.processId,
        publicAddress: reservation.room?.publicAddress,
      };
    }

    async function consumeSeatReservation(client, reservation, options) {
      const normalizedReservation = normalizeSeatReservation(reservation);
      const joinOptions = options || {};

      try {
        emitClientMetric("seat.consume.attempt", { path: "native" });
        return await client.consumeSeatReservation(normalizedReservation);
      } catch (error) {
        // If consumption fails, it means either:
        // 1. The reservation expired, or
        // 2. We're using a real WebSocket client but reservation was created via REST
        // In both cases, try using native joinById instead
        console.warn("Seat reservation consumption failed, attempting native join:", error?.message);
        
        const roomId = normalizedReservation.roomId;
        if (roomId && typeof client.joinById === "function") {
          console.log("Using native client.joinById instead of seat reservation consumption");
          emitClientMetric("seat.consume.fallback", { reason: "consume_failed" });
          return await client.joinById(roomId, joinOptions);
        }
        
        throw error;
      }
    }

    // REST API endpoints for match reservation (intentional, not fallback)
    async function createMatchReservationViaRest(options) {
      const reservation = await postJson("/api/matches", options || {});
      return reservation;
    }

    async function joinMatchReservationViaRest(roomId, options) {
      const safeRoomId = encodeURIComponent(String(roomId || "").trim());
      const payload = options || {};

      try {
        return await postJson(`/api/matches/${safeRoomId}/join`, payload);
      } catch (error) {
        throw error;
      }
    }

    // Pure Colyseus-only operations (no fallback)
    function createLobbyTimeoutError(timeoutMs) {
      return new Error(
        `Lobby connection timed out after ${timeoutMs}ms. Ensure the server is running at ${getWsEndpoint()}.`
      );
    }

    async function joinLobby(client, options) {
      emitClientMetric("lobby.join.attempt", {});
      console.log("Attempting to join lobby. Client state:", {
        hasClient: !!client,
        clientState: client?.state,
        clientId: client?.id,
        options,
      });

      console.log("Calling joinOrCreate...");
      const joinPromise = client.joinOrCreate("lobby", options || {});

      let timeoutId = null;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          const timeoutError = createLobbyTimeoutError(LOBBY_JOIN_TIMEOUT_MS);
          console.error("Lobby join timeout:", timeoutError.message);
          emitClientMetric("lobby.join.timeout", { durationMs: LOBBY_JOIN_TIMEOUT_MS });
          reject(timeoutError);
        }, LOBBY_JOIN_TIMEOUT_MS);
      });

      try {
        const lobbyRoom = await Promise.race([joinPromise, timeoutPromise]);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        console.log("Lobby room created/joined successfully:", { roomId: lobbyRoom?.roomId });
        emitClientMetric("lobby.join.success", {});
        return lobbyRoom;
      } catch (error) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        console.error("Lobby join failed:", {
          message: error?.message,
          code: error?.code,
          type: error?.type,
          errorStack: error?.stack?.split("\n").slice(0, 5).join("\n"),
        });
        emitClientMetric("lobby.join.error", { reason: error?.message || "unknown" });
        throw error;
      }
    }

    async function createMatch(client, options) {
      return await client.create(RECONNECT_ROOM_NAME, options || {});
    }

    async function joinMatchById(client, roomId, options) {
      if (!roomId) {
        throw new Error("roomId is required to join a match.");
      }

      return await client.joinById(roomId, options || {});
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
      consumeSeatReservation,
      createMatchReservationViaRest,
      joinMatchReservationViaRest,
      joinLobby,
      createMatch,
      joinMatchById,
      bindLobbyRoomListHandlers,
    };
  }

  // Initialize the Colyseus client API immediately
  initializeColyseusClient();
})(window);
