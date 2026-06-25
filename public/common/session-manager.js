(function attachSessionManager(global) {
  const STORAGE_KEYS = {
    role: "playerRole",
    playerName: "playerName",
    currentMatchId: "currentMatchId",
    reconnectionToken: "reconnectionToken",
  };

  const VALID_ROLES = new Set(["commander", "kaiju"]);

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

    sessionStorage.setItem(STORAGE_KEYS.playerName, normalized);
    return normalized;
  }

  function getPlayerName() {
    return sanitizePlayerName(sessionStorage.getItem(STORAGE_KEYS.playerName));
  }

  function setRole(role) {
    const normalized = sanitizeRole(role);
    if (!normalized) {
      throw new Error("Role must be commander or kaiju.");
    }

    sessionStorage.setItem(STORAGE_KEYS.role, normalized);
    return normalized;
  }

  function getRole() {
    return sanitizeRole(sessionStorage.getItem(STORAGE_KEYS.role));
  }

  function setCurrentMatchId(matchId) {
    const normalized = String(matchId || "").trim();
    if (!normalized) {
      sessionStorage.removeItem(STORAGE_KEYS.currentMatchId);
      return "";
    }

    sessionStorage.setItem(STORAGE_KEYS.currentMatchId, normalized);
    return normalized;
  }

  function getCurrentMatchId() {
    return String(sessionStorage.getItem(STORAGE_KEYS.currentMatchId) || "").trim();
  }

  function setReconnectionToken(token) {
    const normalized = String(token || "").trim();
    if (!normalized) {
      sessionStorage.removeItem(STORAGE_KEYS.reconnectionToken);
      return "";
    }

    sessionStorage.setItem(STORAGE_KEYS.reconnectionToken, normalized);
    return normalized;
  }

  function getReconnectionToken() {
    return String(sessionStorage.getItem(STORAGE_KEYS.reconnectionToken) || "").trim();
  }

  function clearMatchSession() {
    sessionStorage.removeItem(STORAGE_KEYS.currentMatchId);
    sessionStorage.removeItem(STORAGE_KEYS.reconnectionToken);
  }

  function getEntrySession() {
    return {
      role: getRole(),
      playerName: getPlayerName(),
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
    setReconnectionToken,
    getReconnectionToken,
    clearMatchSession,
    getEntrySession,
  };
})(window);