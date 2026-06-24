(() => {
  const state = {
    room: null,
    status: null,
  };

  const playerNameEl = document.getElementById("playerName");
  const cityNameEl = document.getElementById("cityName");
  const createJoinButtonEl = document.getElementById("createJoinButton");
  const connectionStateEl = document.getElementById("connectionState");
  const signalFeedEl = document.getElementById("signalFeed");
  const dispatchResultsEl = document.getElementById("dispatchResults");
  const assetStatusEl = document.getElementById("assetStatus");
  const targetIdEl = document.getElementById("targetId");
  const cityBaseHpEl = document.getElementById("cityBaseHp");
  const commanderScoreEl = document.getElementById("commanderScore");
  const activeBarriersEl = document.getElementById("activeBarriers");
  const selectedTargetEl = document.getElementById("selectedTarget");

  function updateConnectionState(text, className) {
    connectionStateEl.textContent = text;
    connectionStateEl.className = `status ${className || ""}`.trim();
  }

  function appendSignal(entry) {
    const li = document.createElement("li");
    li.className = entry.severity || "nominal";
    const dispatchSuffix = entry.dispatchId ? ` [${entry.dispatchId}]` : "";
    li.textContent = `${new Date(entry.timestamp).toLocaleTimeString()} :: ${entry.message}${dispatchSuffix}`;
    signalFeedEl.prepend(li);
    if (signalFeedEl.children.length > 40) {
      signalFeedEl.removeChild(signalFeedEl.lastChild);
    }
  }

  function appendDispatchResult(entry) {
    const li = document.createElement("li");
    li.className = entry.outcome === "FAILED" ? "critical" : entry.outcome === "PARTIAL" ? "alert" : "nominal";
    li.textContent = `${entry.assetName} -> ${entry.targetId} :: ${entry.outcome}`;
    dispatchResultsEl.prepend(li);
    if (dispatchResultsEl.children.length > 30) {
      dispatchResultsEl.removeChild(dispatchResultsEl.lastChild);
    }
  }

  function renderCommanderStatus(payload) {
    state.status = payload;
    cityBaseHpEl.textContent = String(payload.cityBaseHp);
    commanderScoreEl.textContent = String(payload.commanderScore);
    activeBarriersEl.textContent = String(payload.activeBarriers);
    selectedTargetEl.textContent = payload.selectedLeviathanId || "NONE";

    assetStatusEl.innerHTML = "";
    Object.keys(payload.assetsRemaining).forEach((assetName) => {
      const li = document.createElement("li");
      const remaining = payload.assetsRemaining[assetName];
      const cooldownMs = payload.assetCooldownsMsRemaining[assetName] || 0;
      const isReady = payload.assetCooldownsReady ? payload.assetCooldownsReady[assetName] : cooldownMs <= 0;
      const progress = payload.assetCooldownsProgress ? payload.assetCooldownsProgress[assetName] : isReady ? 1 : 0;
      const progressPct = Math.round((progress || 0) * 100);
      li.textContent = `${assetName} :: ${remaining} REMAINING :: CD ${Math.ceil(cooldownMs / 1000)}s :: ${progressPct}% :: ${isReady ? "READY" : "CHARGING"}`;
      li.className = isReady ? "nominal" : "alert";
      assetStatusEl.appendChild(li);
    });
  }

  function refreshTargets() {
    if (!state.room || !state.room.state || !state.room.state.leviathans) {
      return;
    }

    const current = targetIdEl.value;
    targetIdEl.innerHTML = "";

    state.room.state.leviathans.forEach((leviathan) => {
      const option = document.createElement("option");
      option.value = leviathan.id;
      option.textContent = `${leviathan.name} (${leviathan.status})`;
      targetIdEl.appendChild(option);
    });

    if (current) {
      targetIdEl.value = current;
    }
  }

  async function loadCities() {
    const response = await fetch("/api/matches/options");
    const payload = await response.json();
    cityNameEl.innerHTML = "";
    payload.cityOptions.forEach((city) => {
      const option = document.createElement("option");
      option.value = city;
      option.textContent = city;
      cityNameEl.appendChild(option);
    });
    cityNameEl.value = payload.defaultCity;
  }

  async function createAndJoinAsCommander() {
    updateConnectionState("CONNECTING", "alert");

    const createResponse = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cityName: cityNameEl.value }),
    });

    if (!createResponse.ok) {
      throw new Error("Failed to create match");
    }

    const reservation = await createResponse.json();
    const endpoint = reservation.wsEndpoint.replace(/^ws:/, window.location.protocol === "https:" ? "wss:" : "ws:");

    const client = new window.Colyseus.Client(endpoint);
    const room = await client.joinById(reservation.roomId, {
      playerName: (playerNameEl.value || "Commander").trim(),
    });

    state.room = room;
    refreshTargets();

    room.onStateChange(() => {
      refreshTargets();
    });

    room.onMessage("signal.feed", (payload) => {
      appendSignal(payload);
    });

    room.onMessage("commander.status", (payload) => {
      renderCommanderStatus(payload);
    });

    room.onMessage("commander.dispatch.result", (payload) => {
      appendDispatchResult(payload);
    });

    updateConnectionState(`ONLINE ROOM ${room.id}`, "nominal");
  }

  function sendDispatch(assetName) {
    if (!state.room) {
      appendSignal({
        timestamp: Date.now(),
        message: "NO ACTIVE ROOM. CREATE MATCH FIRST.",
        severity: "critical",
      });
      return;
    }

    const targetId = targetIdEl.value || "city-base";
    if (targetId !== "city-base") {
      state.room.send("commander.select", { leviathanId: targetId });
    }

    state.room.send("commander.dispatch", {
      assetName,
      targetId,
    });
  }

  createJoinButtonEl.addEventListener("click", async () => {
    createJoinButtonEl.disabled = true;
    try {
      await createAndJoinAsCommander();
    } catch (error) {
      updateConnectionState("OFFLINE", "critical");
      appendSignal({
        timestamp: Date.now(),
        message: `CONNECT ERROR: ${error.message}`,
        severity: "critical",
      });
    } finally {
      createJoinButtonEl.disabled = false;
    }
  });

  document.querySelectorAll("[data-asset]").forEach((button) => {
    button.addEventListener("click", () => {
      sendDispatch(button.dataset.asset);
    });
  });

  loadCities().catch(() => {
    updateConnectionState("OFFLINE", "critical");
  });
})();
