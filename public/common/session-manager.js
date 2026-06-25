(function attachSessionManager(global) {
  const STORAGE_KEYS = {
    role: "playerRole",
    playerName: "playerName",
    currentMatchId: "currentMatchId",
    currentRoomName: "currentRoomName",
    reconnectionToken: "reconnectionToken",
    pendingSeatReservation: "pendingSeatReservation",
    activeMatchSession: "activeMatchSession",
  };

  const VALID_ROLES = new Set(["commander", "kaiju"]);

  function getSessionStorage() {
    try {
      return global.sessionStorage || null;
    } catch {
      return null;
    }
  }

  function readSessionValue(key) {
    const storage = getSessionStorage();
    if (!storage) {
      return "";
    }

    try {
      return String(storage.getItem(key) || "");
    } catch {
      return "";
    }
  }

  function writeSessionValue(key, value) {
    const storage = getSessionStorage();
    if (!storage) {
      return;
    }

    try {
      storage.setItem(key, value);
    } catch {
      // Storage may be blocked by browser privacy settings.
    }
  }

  function removeSessionValue(key) {
    const storage = getSessionStorage();
    if (!storage) {
      return;
    }

    try {
      storage.removeItem(key);
    } catch {
      // Storage may be blocked by browser privacy settings.
    }
  }

  function sanitizePlayerName(value) {
    return String(value || "").trim();
  }

  function sanitizeRole(value) {
    const normalized = String(value || "").trim().toLowerCase();
    return VALID_ROLES.has(normalized) ? normalized : "";
  }

  function setPlayerName(playerName) {
    const normalized = sanitizePlayerName(playerName);
    if (!normalized) {
      throw new Error("Player name is required.");
    }

    writeSessionValue(STORAGE_KEYS.playerName, normalized);
    return normalized;
  }

  function getPlayerName() {
    return sanitizePlayerName(readSessionValue(STORAGE_KEYS.playerName));
  }

  function setRole(role) {
    const normalized = sanitizeRole(role);
    if (!normalized) {
      throw new Error("Role must be commander or kaiju.");
    }

    writeSessionValue(STORAGE_KEYS.role, normalized);
    return normalized;
  }

  function getRole() {
    return sanitizeRole(readSessionValue(STORAGE_KEYS.role));
  }

  function setCurrentMatchId(matchId) {
    const normalized = String(matchId || "").trim();
    if (!normalized) {
      removeSessionValue(STORAGE_KEYS.currentMatchId);
      return "";
    }

    writeSessionValue(STORAGE_KEYS.currentMatchId, normalized);
    return normalized;
  }

  function getCurrentMatchId() {
    return String(readSessionValue(STORAGE_KEYS.currentMatchId) || "").trim();
  }

  function setCurrentRoomName(roomName) {
    const normalized = String(roomName || "").trim();
    if (!normalized) {
      removeSessionValue(STORAGE_KEYS.currentRoomName);
      return "";
    }

    writeSessionValue(STORAGE_KEYS.currentRoomName, normalized);
    return normalized;
  }

  function getCurrentRoomName() {
    return String(readSessionValue(STORAGE_KEYS.currentRoomName) || "").trim();
  }

  function setReconnectionToken(token) {
    const normalized = String(token || "").trim();
    if (!normalized) {
      removeSessionValue(STORAGE_KEYS.reconnectionToken);
      return "";
    }

    writeSessionValue(STORAGE_KEYS.reconnectionToken, normalized);
    return normalized;
  }

  function getReconnectionToken() {
    return String(readSessionValue(STORAGE_KEYS.reconnectionToken) || "").trim();
  }

  function clearMatchSession() {
    removeSessionValue(STORAGE_KEYS.currentMatchId);
    removeSessionValue(STORAGE_KEYS.currentRoomName);
    removeSessionValue(STORAGE_KEYS.reconnectionToken);
  }

  function setPendingSeatReservation(reservation) {
    const storage = getSessionStorage();
    if (!storage) {
      return null;
    }

    if (!reservation) {
      removeSessionValue(STORAGE_KEYS.pendingSeatReservation);
      return null;
    }

    try {
      const normalized = JSON.stringify(reservation);
      storage.setItem(STORAGE_KEYS.pendingSeatReservation, normalized);
      return reservation;
    } catch {
      return null;
    }
  }

  function getPendingSeatReservation() {
    const raw = readSessionValue(STORAGE_KEYS.pendingSeatReservation);
    if (!raw) {
      return null;
    }

    try {
      const reservation = JSON.parse(raw);
      if (!reservation || typeof reservation !== "object") {
        return null;
      }

      return reservation;
    } catch {
      return null;
    }
  }

  function clearPendingSeatReservation() {
    removeSessionValue(STORAGE_KEYS.pendingSeatReservation);
  }

  function setActiveMatchSession(activeMatchSession) {
    const storage = getSessionStorage();
    if (!storage) {
      return null;
    }

    if (!activeMatchSession || typeof activeMatchSession !== "object") {
      removeSessionValue(STORAGE_KEYS.activeMatchSession);
      return null;
    }

    const normalized = {
      roomId: String(activeMatchSession.roomId || "").trim(),
      roomName: String(activeMatchSession.roomName || "").trim(),
      role: sanitizeRole(activeMatchSession.role),
      playerName: sanitizePlayerName(activeMatchSession.playerName),
      reconnectToken: String(activeMatchSession.reconnectToken || "").trim(),
      claimedRole: String(activeMatchSession.claimedRole || "").trim().toUpperCase(),
      leviathanId: String(activeMatchSession.leviathanId || "").trim(),
      activatedAt: Number(activeMatchSession.activatedAt || 0),
    };

    try {
      storage.setItem(STORAGE_KEYS.activeMatchSession, JSON.stringify(normalized));
      if (normalized.roomId) {
        setCurrentMatchId(normalized.roomId);
      }
      if (normalized.roomName) {
        setCurrentRoomName(normalized.roomName);
      }
      if (normalized.role) {
        writeSessionValue(STORAGE_KEYS.role, normalized.role);
      }
      if (normalized.reconnectToken) {
        setReconnectionToken(normalized.reconnectToken);
      }
      return normalized;
    } catch {
      return null;
    }
  }

  function getActiveMatchSession() {
    const raw = readSessionValue(STORAGE_KEYS.activeMatchSession);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return null;
      }

      return {
        roomId: String(parsed.roomId || "").trim(),
        roomName: String(parsed.roomName || "").trim(),
        role: sanitizeRole(parsed.role),
        playerName: sanitizePlayerName(parsed.playerName),
        reconnectToken: String(parsed.reconnectToken || "").trim(),
        claimedRole: String(parsed.claimedRole || "").trim().toUpperCase(),
        leviathanId: String(parsed.leviathanId || "").trim(),
        activatedAt: Number(parsed.activatedAt || 0),
      };
    } catch {
      return null;
    }
  }

  function clearActiveMatchSession() {
    removeSessionValue(STORAGE_KEYS.activeMatchSession);
  }

  function getEntrySession() {
    return {
      role: getRole(),
      playerName: getPlayerName(),
    };
  }

  function setCurrentRoomContext(context) {
    const roomId = setCurrentMatchId(context && context.roomId ? context.roomId : "");
    const roomName = setCurrentRoomName(context && context.roomName ? context.roomName : "");
    return {
      roomId,
      roomName,
    };
  }

  function getCurrentRoomContext() {
    return {
      roomId: getCurrentMatchId(),
      roomName: getCurrentRoomName(),
    };
  }

  global.KaijuSession = {
    STORAGE_KEYS,
    setPlayerName,
    getPlayerName,
    setRole,
    getRole,
    setCurrentMatchId,
    getCurrentMatchId,
    setCurrentRoomName,
    getCurrentRoomName,
    setCurrentRoomContext,
    getCurrentRoomContext,
    setReconnectionToken,
    getReconnectionToken,
    clearMatchSession,
    setPendingSeatReservation,
    getPendingSeatReservation,
    clearPendingSeatReservation,
    setActiveMatchSession,
    getActiveMatchSession,
    clearActiveMatchSession,
    getEntrySession,
  };
})(window);