(function attachColyseusClient(global) {
  const RECONNECT_ROOM_NAME = "match";
  const REST_LOBBY_POLL_MS = 2000;

  function initializeColyseusClient() {
    function getColyseusNamespace() {
      const namespace = global.colyseus || global.Colyseus;

      if (!namespace || !namespace.Client) {
        throw new Error("Colyseus client library is not loaded.");
      }

      return namespace;
    }

    function getWsEndpoint() {
      const protocol = global.location.protocol === "https:" ? "wss:" : "ws:";
      return `${protocol}//${global.location.host}`;
    }

    function createClient() {
      // Try to create a real Colyseus client if available
      try {
        const Colyseus = getColyseusNamespace();
        return new Colyseus.Client(getWsEndpoint());
      } catch (e) {
        // Return a stub client for REST-only mode with polling
        return {
          create: async () => {
            throw new Error("WebSocket client not available, use REST API");
          },
          consumeSeatReservation: async (reservation) => {
            // Create a mock room that polls for updates
            let disposed = false;
            let pollTimer = null;
            const listeners = new Map();
            
            const mockRoom = {
              sessionId: reservation.sessionId,
              roomId: reservation.room.roomId,
              id: reservation.room.roomId,
              reconnectionToken: reservation.sessionId,
              state: {
                commander: null,
                leviathans: [],
                metadata: { state: "WAITING" },
              },
              listeners,
              onMessage: function(type, handler) {
                if (!this.listeners.has(type)) {
                  this.listeners.set(type, []);
                }
                this.listeners.get(type).push(handler);
              },
              send: function(type, data) {
                // Send via HTTP REST API instead of WebSocket
                const path = type.replace(/\./g, '/');
                const endpoint = `/api/matches/${this.roomId}/${path}`;
                fetch(endpoint, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data || {})
                }).catch(err => console.error('Failed to send action:', type, err));
              },
              _pollState: async function() {
                if (disposed) return;
                try {
                  const response = await fetch(`/api/matches/${this.roomId}`, { method: 'GET' });
                  if (!response.ok) return;
                  const data = await response.json();
                  if (data && data.room) {
                    this.state = data.room.state || this.state;
                  }
                } catch (err) {
                  console.warn('Room state poll failed:', err);
                } finally {
                  if (!disposed) {
                    pollTimer = setTimeout(() => this._pollState(), 1000);
                  }
                }
              },
              leave: async function() {
                disposed = true;
                if (pollTimer) clearTimeout(pollTimer);
              }
            };
            
            // Start polling for state updates
            mockRoom._pollState();
            
            return mockRoom;
          }
        };
      }
    }

    function normalizeErrorMessage(error) {
      if (!error) {
        return "";
      }

      if (error instanceof Error) {
        return error.message || "";
      }

      if (typeof error === "string") {
        return error;
      }

      return String(error?.message || "");
    }

    function shouldUseRestFallback(error) {
      const message = normalizeErrorMessage(error).toLowerCase();
      return message.includes("/matchmake/") || message.includes("404") || message.includes("not found");
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

    function toSeatReservation(reservation) {
      if (!reservation || !reservation.sessionId || !reservation.roomId) {
        throw new Error("Invalid seat reservation response from server.");
      }

      return {
        sessionId: reservation.sessionId,
        room: {
          name: reservation.roomName || RECONNECT_ROOM_NAME,
          roomId: reservation.roomId,
          processId: reservation.processId,
          publicAddress: reservation.publicAddress,
        },
      };
    }

    async function consumeSeatReservation(client, reservation) {
      return client.consumeSeatReservation(toSeatReservation(reservation));
    }

    async function createMatchReservationViaRest(options) {
      const reservation = await postJson("/api/matches", options || {});
      return reservation;
    }

    async function createMatchViaRest(client, options) {
      const reservation = await createMatchReservationViaRest(options);
      return consumeSeatReservation(client, reservation);
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

    async function joinMatchViaRest(client, roomId, options) {
      const reservation = await joinMatchReservationViaRest(roomId, options);
      return consumeSeatReservation(client, reservation);
    }

    function createRestLobbyRoom() {
      const handlersByType = new Map();
      let pollTimer = 0;
      let disposed = false;
      let roomsById = new Map();

      function registerHandler(type, handler) {
        if (!handlersByType.has(type)) {
          handlersByType.set(type, []);
        }

        handlersByType.get(type).push(handler);
      }

      function emit(type, payload) {
        const handlers = handlersByType.get(type) || [];
        handlers.forEach((handler) => {
          if (typeof handler === "function") {
            handler(payload);
          }
        });
      }

      async function poll() {
        if (disposed) {
          return;
        }

        try {
          const response = await fetch("/api/matches", { method: "GET" });
          if (!response.ok) {
            throw new Error(`Failed to load matches: ${response.status}`);
          }

          const payload = await response.json();
          const nextRooms = new Map();

          (Array.isArray(payload?.matches) ? payload.matches : []).forEach((room) => {
            const normalized = normalizeLobbyRoom(room?.roomId, room);
            if (normalized.roomId) {
              nextRooms.set(normalized.roomId, normalized);
            }
          });

          emit("rooms", Array.from(nextRooms.values()));

          nextRooms.forEach((room, roomId) => {
            const previous = roomsById.get(roomId);
            if (!previous || JSON.stringify(previous) !== JSON.stringify(room)) {
              emit("+", [roomId, room]);
            }
          });

          roomsById.forEach((_room, roomId) => {
            if (!nextRooms.has(roomId)) {
              emit("-", roomId);
            }
          });

          roomsById = nextRooms;
        } finally {
          if (!disposed) {
            pollTimer = global.setTimeout(poll, REST_LOBBY_POLL_MS);
          }
        }
      }

      poll();

      return {
        onMessage(type, handler) {
          registerHandler(type, handler);
        },
        leave() {
          disposed = true;
          if (pollTimer) {
            global.clearTimeout(pollTimer);
          }
          return Promise.resolve();
        },
      };
    }

    async function joinLobby(client, options) {
      // The current server setup exposes /api/matches for lobby discovery.
      // Avoid calling /matchmake/joinOrCreate/lobby first to prevent noisy 404s in browser consoles.
      return createRestLobbyRoom();
    }

    async function createMatch(client, options) {
      try {
        return await client.create(RECONNECT_ROOM_NAME, options || {});
      } catch (error) {
        if (!shouldUseRestFallback(error)) {
          throw error;
        }

        return createMatchViaRest(client, options || {});
      }
    }

    async function joinMatchById(client, roomId, options) {
      if (!roomId) {
        throw new Error("roomId is required to join a match.");
      }

      return joinMatchViaRest(client, roomId, options || {});
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
      consumeSeatReservation,
      bindLobbyRoomListHandlers,
    };
  }

  // Initialize the Colyseus client API immediately (no external library needed)
  initializeColyseusClient();
})(window);