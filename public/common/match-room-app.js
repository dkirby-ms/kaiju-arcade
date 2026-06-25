(function attachMatchRoomApp(global) {
  const session = global.KaijuSession;
  const clientApi = global.KaijuColyseusClient;

  if (!session || !clientApi) {
    return;
  }

  const state = {
    room: null,
    phase: "WAITING",
    pendingRedirect: false,
    isBusy: false,
    playerName: "",
    roomId: "",
    claimedRole: "",
    claimedLeviathanId: "",
    ready: false,
  };

  const elements = {
    playerName: document.getElementById("playerName"),
    roomId: document.getElementById("roomId"),
    phaseState: document.getElementById("phaseState"),
    connectionState: document.getElementById("connectionState"),
    reservationState: document.getElementById("reservationState"),
    commanderStatus: document.getElementById("commanderStatus"),
    kaijuStatus: document.getElementById("kaijuStatus"),
    roleStatus: document.getElementById("roleStatus"),
    participantList: document.getElementById("participantList"),
    signalFeed: document.getElementById("signalFeed"),
    statusMessage: document.getElementById("statusMessage"),
    errorMessage: document.getElementById("errorMessage"),
    claimCommanderButton: document.getElementById("claimCommanderButton"),
    claimKaijuButton: document.getElementById("claimKaijuButton"),
    releaseRoleButton: document.getElementById("releaseRoleButton"),
    readyToggleButton: document.getElementById("readyToggleButton"),
    startMatchButton: document.getElementById("startMatchButton"),
    backToLobbyButton: document.getElementById("backToLobbyButton"),
    retryReservationButton: document.getElementById("retryReservationButton"),
    clearReservationButton: document.getElementById("clearReservationButton"),
  };

  function setStatus(message) {
    elements.statusMessage.textContent = message || "";
  }

  function setError(message) {
    elements.errorMessage.textContent = message || "";
  }

  function setConnection(text) {
    elements.connectionState.textContent = text;
  }

  function appendFeed(message, severity) {
    const item = document.createElement("li");
    item.className = severity || "nominal";
    item.textContent = `${new Date().toLocaleTimeString()} :: ${message}`;
    elements.signalFeed.prepend(item);
    if (elements.signalFeed.children.length > 24) {
      elements.signalFeed.removeChild(elements.signalFeed.lastChild);
    }
  }

  function clearAndReturnToLobby() {
    session.clearPendingSeatReservation();
    session.clearActiveMatchSession();
    session.clearMatchSession();
    global.location.assign("/lobby.html");
  }

  function normalizeRoleLabel(role) {
    return role === "COMMANDER" ? "Commander" : role === "KAIJU" ? "Kaiju" : "Unclaimed";
  }

  function getParticipants() {
    if (!state.room || !state.room.state || !state.room.state.participants) {
      return [];
    }

    const participants = [];
    state.room.state.participants.forEach((participant) => {
      participants.push({
        sessionId: participant.sessionId,
        playerName: participant.playerName,
        claimedRole: participant.claimedRole,
        ready: Boolean(participant.ready),
        leviathanId: participant.leviathanId,
      });
    });

    return participants;
  }

  function getSelfParticipant() {
    if (!state.room || !state.room.sessionId) {
      return null;
    }

    return getParticipants().find((participant) => participant.sessionId === state.room.sessionId) || null;
  }

  function renderRoster() {
    const participants = getParticipants();
    elements.participantList.innerHTML = "";

    if (participants.length === 0) {
      const item = document.createElement("li");
      item.textContent = "Waiting for players to enter the room.";
      elements.participantList.appendChild(item);
      return;
    }

    participants.forEach((participant) => {
      const item = document.createElement("li");
      item.className = "participant";
      if (participant.ready) {
        item.classList.add("ready");
      }
      if (state.room && participant.sessionId === state.room.sessionId) {
        item.classList.add("self");
      }

      const name = document.createElement("strong");
      name.textContent = participant.playerName || "Unknown Player";
      const detail = document.createElement("span");
      detail.textContent = `${normalizeRoleLabel(participant.claimedRole)} ${participant.ready ? "• Ready" : "• Not Ready"}`;

      item.appendChild(name);
      item.appendChild(detail);
      elements.participantList.appendChild(item);
    });
  }

  function syncDerivedState() {
    const selfParticipant = getSelfParticipant();
    state.claimedRole = selfParticipant?.claimedRole || "";
    state.claimedLeviathanId = selfParticipant?.leviathanId || "";
    state.ready = Boolean(selfParticipant?.ready);
    state.phase = state.room?.state?.metadata?.state || state.phase;

    const commanderTaken = Boolean(state.room?.state?.commander?.playerId);
    let kaijuOpenSlots = 0;
    if (state.room?.state?.leviathans) {
      state.room.state.leviathans.forEach((leviathan) => {
        if (leviathan.isAI || !leviathan.playerId) {
          kaijuOpenSlots += 1;
        }
      });
    }

    elements.phaseState.textContent = state.phase;
    elements.commanderStatus.textContent = commanderTaken ? "Taken" : "Open";
    elements.kaijuStatus.textContent = String(kaijuOpenSlots);
    elements.roleStatus.textContent = normalizeRoleLabel(state.claimedRole);
    elements.readyToggleButton.textContent = state.ready ? "Mark Not Ready" : "Mark Ready";

    const isLobby = state.phase === "WAITING" || state.phase === "LOBBY";
    const hasClaim = state.claimedRole === "COMMANDER" || state.claimedRole === "KAIJU";

    elements.claimCommanderButton.disabled = state.isBusy || !isLobby || (commanderTaken && state.claimedRole !== "COMMANDER");
    elements.claimKaijuButton.disabled = state.isBusy || !isLobby || (kaijuOpenSlots === 0 && state.claimedRole !== "KAIJU");
    elements.releaseRoleButton.disabled = state.isBusy || !hasClaim || !isLobby;
    elements.readyToggleButton.disabled = state.isBusy || !hasClaim || !isLobby;
    elements.startMatchButton.disabled = state.isBusy || state.phase !== "LOBBY" || state.claimedRole !== "COMMANDER";
    elements.retryReservationButton.disabled = state.isBusy || Boolean(state.room);

    renderRoster();
  }

  function persistActivationSession() {
    if (!state.room) {
      return null;
    }

    const normalizedRole = state.claimedRole === "COMMANDER" ? "commander" : state.claimedRole === "KAIJU" ? "kaiju" : "";
    if (!normalizedRole) {
      return null;
    }

    return session.setActiveMatchSession({
      roomId: state.room.roomId || state.room.id || state.roomId,
      roomName: "match",
      role: normalizedRole,
      playerName: state.playerName,
      reconnectToken: state.room.reconnectionToken || session.getReconnectionToken(),
      claimedRole: state.claimedRole,
      leviathanId: state.claimedLeviathanId,
      activatedAt: Date.now(),
    });
  }

  async function redirectToActiveClient() {
    if (state.pendingRedirect) {
      return;
    }

    const activeSession = persistActivationSession();
    if (!activeSession || !activeSession.role) {
      setError("Unable to determine final role for activation.");
      return;
    }

    state.pendingRedirect = true;
    setStatus(`Match active. Routing to ${activeSession.role} client...`);

    try {
      if (state.room) {
        await state.room.leave(true);
      }
    } catch {
      // best-effort room detach before transition
    }

    global.location.assign(activeSession.role === "commander" ? "/commander/index.html" : "/kaiju/index.html");
  }

  function handleActivation() {
    state.phase = "ACTIVE";
    syncDerivedState();
    appendFeed("Match active.", "nominal");
    redirectToActiveClient();
  }

  function bindRoom(room) {
    state.room = room;
    state.roomId = room.roomId || room.id || state.roomId;
    session.setCurrentRoomContext({ roomId: state.roomId, roomName: "match" });
    session.clearPendingSeatReservation();
    if (room.reconnectionToken) {
      session.setReconnectionToken(room.reconnectionToken);
    }

    setConnection(`ONLINE ${state.roomId}`);
    setStatus("Shared match room connected.");
    setError("");
    syncDerivedState();

    room.onStateChange(() => {
      if (room.reconnectionToken) {
        session.setReconnectionToken(room.reconnectionToken);
      }
      syncDerivedState();
      if (room.state?.metadata?.state === "ACTIVE") {
        redirectToActiveClient();
      }
    });

    room.onMessage("signal.feed", (payload) => {
      if (payload?.message) {
        appendFeed(payload.message, payload.severity);
      }
    });

    room.onMessage("match.phase", (payload) => {
      if (!payload?.phase) {
        return;
      }

      state.phase = payload.phase;
      syncDerivedState();
      if (payload.phase === "ACTIVE") {
        handleActivation();
      }
    });

    room.onMessage("match.start", () => {
      handleActivation();
    });

    room.onMessage("match.reconnect.token", (payload) => {
      if (payload?.reconnectToken) {
        session.setReconnectionToken(payload.reconnectToken);
      }
    });

    room.onMessage("kaiju.reconnect.token", (payload) => {
      if (payload?.reconnectToken) {
        session.setReconnectionToken(payload.reconnectToken);
      }
    });

    room.onLeave(() => {
      if (!state.pendingRedirect) {
        setConnection("OFFLINE");
      }
    });
  }

  async function reserveFromRoomContext() {
    const roomContext = session.getCurrentRoomContext();
    if (!roomContext.roomId) {
      throw new Error("No room context available.");
    }

    const reservation = await clientApi.joinMatchReservationViaRest(roomContext.roomId, {
      playerName: state.playerName,
      reconnectToken: session.getReconnectionToken(),
    });

    session.setPendingSeatReservation(reservation);
    elements.reservationState.textContent = "Reserved";
    return reservation;
  }

  async function connectToRoom() {
    const reservation = session.getPendingSeatReservation() || (await reserveFromRoomContext());
    if (!reservation) {
      throw new Error("Missing seat reservation.");
    }

    elements.reservationState.textContent = "Reserved";
    setConnection("CONNECTING");
    setStatus("Attaching to match room...");

    const client = clientApi.createClient();
    const room = await clientApi.consumeSeatReservation(client, reservation);
    bindRoom(room);
  }

  async function performRoomAction(action) {
    if (!state.room || state.isBusy) {
      return;
    }

    state.isBusy = true;
    setError("");
    syncDerivedState();

    try {
      await action();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Action failed.");
    } finally {
      state.isBusy = false;
      syncDerivedState();
    }
  }

  function wireEvents() {
    elements.claimCommanderButton.addEventListener("click", () => {
      performRoomAction(async () => {
        state.room.send("match.role.claim", { role: "COMMANDER" });
        setStatus("Commander claim sent.");
      });
    });

    elements.claimKaijuButton.addEventListener("click", () => {
      performRoomAction(async () => {
        state.room.send("match.role.claim", { role: "KAIJU" });
        setStatus("Kaiju claim sent.");
      });
    });

    elements.releaseRoleButton.addEventListener("click", () => {
      performRoomAction(async () => {
        state.room.send("match.role.release", {});
        setStatus("Role release sent.");
      });
    });

    elements.readyToggleButton.addEventListener("click", () => {
      performRoomAction(async () => {
        state.room.send("match.ready", { ready: !state.ready });
        setStatus(!state.ready ? "Ready signal sent." : "Ready cleared.");
      });
    });

    elements.startMatchButton.addEventListener("click", () => {
      performRoomAction(async () => {
        state.room.send("commander.start", {});
        setStatus("Start signal sent.");
      });
    });

    elements.backToLobbyButton.addEventListener("click", () => {
      global.location.assign("/lobby.html");
    });

    elements.retryReservationButton.addEventListener("click", async () => {
      setError("");
      setStatus("Refreshing seat reservation...");

      try {
        await reserveFromRoomContext();
        setStatus("Reservation refreshed.");
      } catch (error) {
        setError(error instanceof Error ? error.message : "Unable to refresh reservation.");
      }
    });

    elements.clearReservationButton.addEventListener("click", () => {
      clearAndReturnToLobby();
    });
  }

  async function initialize() {
    const entrySession = session.getEntrySession();
    const activeSession = session.getActiveMatchSession();
    state.playerName = entrySession.playerName || activeSession?.playerName || "";
    state.roomId = session.getCurrentMatchId() || activeSession?.roomId || "";

    elements.playerName.textContent = state.playerName || "-";
    elements.roomId.textContent = state.roomId || "-";
    elements.reservationState.textContent = session.getPendingSeatReservation() ? "Reserved" : "Missing";

    if (!state.playerName) {
      global.location.assign("/index.html");
      return;
    }

    if (!state.roomId && !session.getPendingSeatReservation()) {
      setError("Missing room context. Return to lobby and re-enter a match.");
      return;
    }

    wireEvents();
    syncDerivedState();

    try {
      await connectToRoom();
      if (state.phase === "ACTIVE") {
        redirectToActiveClient();
      }
    } catch (error) {
      setConnection("OFFLINE");
      setError(error instanceof Error ? error.message : "Failed to connect to match room.");
      appendFeed("Stale reservation or room context detected.", "critical");
    }
  }

  initialize().catch((error) => {
    setConnection("OFFLINE");
    setError(error instanceof Error ? error.message : "Initialization failed.");
  });
})(window);
