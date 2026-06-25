(() => {
  const state = {
    room: null,
    status: null,
    matchStartedAt: 0,
    alertModeManual: false,
    alertModeAuto: false,
    alertModeOn: false,
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
  const alertModeToggleEl = document.getElementById("alertModeToggle");
  const alertModeStateEl = document.getElementById("alertModeState");
  const matchElapsedEl = document.getElementById("matchElapsed");
  const etaToBaseEl = document.getElementById("etaToBase");
  const timelineFeedEl = document.getElementById("timelineFeed");

  // --- COMMAND MAP ---
  // Seattle metro bounding box: game coords (0-100) map to this lat/lng region.
  // City base at (50,50) = downtown Seattle (~47.6062°N, 122.3321°W).
  // North edge reaches Kirkland/Redmond; East edge covers Bellevue/Issaquah.
  const MAP_BOUNDS = {
    north: 47.7412,
    south: 47.4712,
    west: -122.5921,
    east: -122.0721,
  };

  const leafletMap = window.L.map("leafletMap", {
    center: [47.6062, -122.3321],
    zoom: 11,
    zoomControl: false,
    attributionControl: true,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    touchZoom: false,
    keyboard: false,
  });

  window.L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(leafletMap);

  // Fit the map to the game coordinate bounding box
  leafletMap.fitBounds([
    [MAP_BOUNDS.south, MAP_BOUNDS.west],
    [MAP_BOUNDS.north, MAP_BOUNDS.east],
  ]);

  const radarCanvasEl = document.getElementById("radarOverlay");
  const radarCtx = radarCanvasEl.getContext("2d");

  const mapData = {
    cityBase: { x: 50, y: 50, hp: 500, hpMax: 500 },
    leviathans: [],
  };

  let sweepAngleDeg = 0;
  const pulseBlips = new Map(); // leviathanId -> { startTime, x, y }
  const knownLeviathanIds = new Set();

  function sizeCanvas() {
    const wrapper = radarCanvasEl.parentElement;
    const w = wrapper?.offsetWidth || 0;
    const h = wrapper?.offsetHeight || 0;
    if (w > 0 && h > 0) {
      radarCanvasEl.width = w;
      radarCanvasEl.height = h;
    }
  }

  // Convert game coords (0-100) to Leaflet LatLng
  function gameToLatLng(gameX, gameY) {
    const lat = MAP_BOUNDS.north - (gameY / 100) * (MAP_BOUNDS.north - MAP_BOUNDS.south);
    const lng = MAP_BOUNDS.west + (gameX / 100) * (MAP_BOUNDS.east - MAP_BOUNDS.west);
    return window.L.latLng(lat, lng);
  }

  // Convert game coords to canvas pixel position via Leaflet projection
  function gameToPixel(gameX, gameY) {
    const pt = leafletMap.latLngToContainerPoint(gameToLatLng(gameX, gameY));
    return { x: pt.x, y: pt.y };
  }

  function drawCommandMap(timestamp) {
    sweepAngleDeg = (sweepAngleDeg + 0.35) % 360;

    const W = radarCanvasEl.width;
    const H = radarCanvasEl.height;
    const ctx = radarCtx;

    // Ensure canvas is sized; skip if not ready
    if (W <= 0 || H <= 0) {
      requestAnimationFrame(drawCommandMap);
      return;
    }

    // Clear — transparent so the Leaflet tiles show through
    ctx.clearRect(0, 0, W, H);

    // Subtle scan-line overlay
    for (let row = 0; row < H; row += 4) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.07)";
      ctx.fillRect(0, row, W, 1);
    }

    // Radar sweep originates from the city base position
    const basePixel = gameToPixel(mapData.cityBase.x, mapData.cityBase.y);
    const cx = basePixel.x;
    const cy = basePixel.y;
    const sweepRadius = Math.sqrt(W * W + H * H); // cover full canvas from base

    const sweepRad = (sweepAngleDeg * Math.PI) / 180;

    // Sweep trail (40-degree arc)
    for (let i = 0; i < 40; i++) {
      const trailRad = sweepRad - (i * Math.PI) / 180;
      const alpha = ((40 - i) / 40) * 0.12;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, sweepRadius, trailRad - Math.PI / 180, trailRad);
      ctx.closePath();
      ctx.fillStyle = `rgba(0, 216, 111, ${alpha})`;
      ctx.fill();
    }

    // Sweep line
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepRad) * sweepRadius, cy + Math.sin(sweepRad) * sweepRadius);
    ctx.strokeStyle = "rgba(0, 216, 111, 0.75)";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "rgba(0, 216, 111, 0.55)";
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // City base marker (amber diamond)
    const bx = basePixel.x;
    const by = basePixel.y;
    const hpFracBase = mapData.cityBase.hpMax > 0 ? mapData.cityBase.hp / mapData.cityBase.hpMax : 1;

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(Math.PI / 4);
    const sz = 9;
    ctx.fillStyle = "#ffb300";
    ctx.shadowColor = "#ffb300";
    ctx.shadowBlur = 16;
    ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
    ctx.restore();
    ctx.shadowBlur = 0;

    // Base HP bar
    const baseBarW = 32;
    ctx.fillStyle = "rgba(7, 7, 4, 0.82)";
    ctx.fillRect(bx - baseBarW / 2, by + 11, baseBarW, 3);
    ctx.fillStyle = hpFracBase > 0.5 ? "#00d86f" : hpFracBase > 0.25 ? "#ffb300" : "#ff4747";
    ctx.fillRect(bx - baseBarW / 2, by + 11, baseBarW * hpFracBase, 3);
    ctx.fillStyle = "#ffb300";
    ctx.font = "10px 'Arial Narrow', sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "#ffb300";
    ctx.shadowBlur = 5;
    ctx.fillText("BASE", bx, by + 22);
    ctx.shadowBlur = 0;

    // Leviathan blips
    mapData.leviathans.forEach((lev) => {
      const pixel = gameToPixel(lev.x, lev.y);
      const lx = pixel.x;
      const ly = pixel.y;
      const color =
        lev.status === "CONTAINED"
          ? "#00d86f"
          : lev.status === "STUNNED"
            ? "#ffb300"
            : lev.status === "SUBMERGED"
              ? "#555540"
              : "#ff4747";

      // Heading indicator
      const headRad = (lev.heading * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + Math.cos(headRad) * 16, ly + Math.sin(headRad) * 16);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.65;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Blip
      ctx.beginPath();
      ctx.arc(lx, ly, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // HP bar
      const hpFrac = lev.hpMax > 0 ? lev.hp / lev.hpMax : 0;
      const barW = 24;
      ctx.fillStyle = "rgba(7, 7, 4, 0.82)";
      ctx.fillRect(lx - barW / 2, ly + 7, barW, 2);
      ctx.fillStyle = hpFrac > 0.5 ? "#00d86f" : hpFrac > 0.25 ? "#ffb300" : "#ff4747";
      ctx.fillRect(lx - barW / 2, ly + 7, barW * hpFrac, 2);

      // Name label
      ctx.fillStyle = color;
      ctx.font = "8px 'Arial Narrow', sans-serif";
      ctx.textAlign = "center";
      ctx.shadowColor = color;
      ctx.shadowBlur = 4;
      ctx.fillText(lev.name.toUpperCase(), lx, ly + 17);
      ctx.shadowBlur = 0;
    });

    // Pulse rings for newly detected leviathans
    const now = typeof timestamp === "number" ? timestamp : performance.now();
    for (const [id, pulse] of pulseBlips) {
      const elapsed = now - pulse.startTime;
      const duration = 1800;
      if (elapsed > duration) {
        pulseBlips.delete(id);
        continue;
      }
      const pixel = gameToPixel(pulse.x, pulse.y);
      const radius = 6 + (elapsed / duration) * 38;
      const alpha = (1 - elapsed / duration) * 0.85;
      ctx.beginPath();
      ctx.arc(pixel.x, pixel.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 71, 71, ${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    requestAnimationFrame(drawCommandMap);
  }

  function updateMapState() {
    if (!state.room || !state.room.state) return;
    const rs = state.room.state;

    if (rs.cityBase) {
      mapData.cityBase.x = rs.cityBase.x;
      mapData.cityBase.y = rs.cityBase.y;
      mapData.cityBase.hp = rs.cityBase.hp;
      mapData.cityBase.hpMax = rs.cityBase.hpMax;
    }

    if (rs.leviathans) {
      mapData.leviathans = [];
      rs.leviathans.forEach((lev) => {
        mapData.leviathans.push({
          id: lev.id,
          name: lev.name,
          x: lev.x,
          y: lev.y,
          heading: lev.heading,
          hp: lev.hp,
          hpMax: lev.hpMax,
          status: lev.status,
        });
        if (!knownLeviathanIds.has(lev.id)) {
          knownLeviathanIds.add(lev.id);
          pulseBlips.set(lev.id, { startTime: performance.now(), x: lev.x, y: lev.y });
        }
      });
    }
  }

  // Wait for DOM to be fully ready before sizing canvas
  function initializeMapRendering() {
    sizeCanvas();
    // Re-size after a short delay to ensure layout is stable
    setTimeout(() => {
      sizeCanvas();
      leafletMap.invalidateSize();
    }, 100);
    requestAnimationFrame(drawCommandMap);
  }
  
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeMapRendering);
  } else {
    initializeMapRendering();
  }
  
  window.addEventListener("resize", () => {
    sizeCanvas();
    leafletMap.invalidateSize();
  });
  // --- END COMMAND MAP ---

  function formatError(error) {
    if (!error) {
      return "Unknown error";
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === "string") {
      return error;
    }

    if (typeof error === "object") {
      const candidate =
        error.message || error.reason || error.code || error.name || JSON.stringify(error);
      if (candidate) {
        return String(candidate);
      }
    }

    return String(error);
  }

  function updateConnectionState(text, className) {
    connectionStateEl.textContent = text;
    connectionStateEl.className = `status ${className || ""}`.trim();
  }

  function formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function appendTimelineEntry(message) {
    if (!timelineFeedEl) {
      return;
    }
    const li = document.createElement("li");
    li.className = "nominal";
    li.textContent = `${new Date(Date.now()).toLocaleTimeString()} :: ${message}`;
    timelineFeedEl.prepend(li);
    if (timelineFeedEl.children.length > 30) {
      timelineFeedEl.removeChild(timelineFeedEl.lastChild);
    }
  }

  function computeNearestThreatEtaSeconds() {
    if (!mapData.leviathans.length) {
      return null;
    }

    const activeThreats = mapData.leviathans.filter((lev) => lev.status !== "CONTAINED");
    if (!activeThreats.length) {
      return null;
    }

    const byDistance = activeThreats
      .map((lev) => {
        const dx = lev.x - mapData.cityBase.x;
        const dy = lev.y - mapData.cityBase.y;
        const distance = Math.hypot(dx, dy);
        return { lev, distance };
      })
      .sort((a, b) => a.distance - b.distance)[0];

    if (!byDistance || byDistance.distance <= 0) {
      return 0;
    }

    // Deterministic UI-only ETA estimate in game-space units.
    const unitsPerSecond = 1.6;
    return Math.ceil(byDistance.distance / unitsPerSecond);
  }

  function renderTimeline() {
    if (matchElapsedEl) {
      if (state.matchStartedAt > 0) {
        matchElapsedEl.textContent = formatDuration(Date.now() - state.matchStartedAt);
      } else {
        matchElapsedEl.textContent = "00:00";
      }
    }

    if (etaToBaseEl) {
      const etaSeconds = computeNearestThreatEtaSeconds();
      etaToBaseEl.textContent = etaSeconds == null ? "N/A" : `${etaSeconds}s`;
    }
  }

  function updateAutoAlertFromState() {
    const baseLow = mapData.cityBase.hpMax > 0 && mapData.cityBase.hp / mapData.cityBase.hpMax <= 0.35;
    const activeThreatNearby = mapData.leviathans.some((lev) => {
      if (lev.status === "CONTAINED") {
        return false;
      }
      const dx = lev.x - mapData.cityBase.x;
      const dy = lev.y - mapData.cityBase.y;
      return Math.hypot(dx, dy) <= 24;
    });
    state.alertModeAuto = baseLow || activeThreatNearby;
  }

  function setAlertMode(on, reason) {
    const wasOn = state.alertModeOn;
    state.alertModeOn = on;
    document.body.classList.toggle("alert-mode", on);
    if (alertModeToggleEl) {
      alertModeToggleEl.textContent = `ALERT MODE: ${on ? "ON" : "OFF"}`;
    }
    if (alertModeStateEl) {
      alertModeStateEl.textContent = on ? (state.alertModeManual ? "MANUAL" : "AUTO") : "NOMINAL";
    }
    if (reason && wasOn !== on) {
      appendTimelineEntry(reason);
    }
  }

  function reconcileAlertMode(reason) {
    const shouldBeOn = state.alertModeManual || state.alertModeAuto;
    setAlertMode(shouldBeOn, reason);
  }

  function appendSignal(entry) {
    const li = document.createElement("li");
    li.className = entry.severity || "nominal";
    const dispatchSuffix = entry.dispatchId ? ` [${entry.dispatchId}]` : "";
    const fullText = `${new Date(entry.timestamp).toLocaleTimeString()} :: ${entry.message}${dispatchSuffix}`;
    li.textContent = "";
    signalFeedEl.prepend(li);
    if (signalFeedEl.children.length > 40) {
      signalFeedEl.removeChild(signalFeedEl.lastChild);
    }
    // Typewriter / teletype reveal
    let charIndex = 0;
    const interval = setInterval(() => {
      li.textContent = fullText.slice(0, charIndex + 1);
      charIndex += 1;
      if (charIndex >= fullText.length) {
        clearInterval(interval);
      }
    }, 18);

    appendTimelineEntry(entry.message);
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

    updateAutoAlertFromState();
    reconcileAlertMode();
    renderTimeline();
  }

  function refreshTargets() {
    if (!state.room || !state.room.state || !state.room.state.leviathans) {
      return;
    }

    const current = targetIdEl.value;
    targetIdEl.innerHTML = "";

    const selectedFromStatus = state.status?.selectedLeviathanId || "";

    state.room.state.leviathans.forEach((leviathan) => {
      const option = document.createElement("option");
      option.value = leviathan.id;
      option.textContent = `${leviathan.name} (${leviathan.status})`;
      targetIdEl.appendChild(option);
    });

    if (selectedFromStatus) {
      targetIdEl.value = selectedFromStatus;
    } else if (current) {
      targetIdEl.value = current;
    }
  }

  function selectTarget(leviathanId, source) {
    if (!state.room || !leviathanId) {
      return;
    }
    const exists = Array.from(state.room.state.leviathans || []).some((lev) => lev.id === leviathanId);
    if (!exists) {
      return;
    }
    targetIdEl.value = leviathanId;
    state.room.send("commander.select", { leviathanId });
    appendTimelineEntry(`TARGET LOCK ${leviathanId} (${source})`);
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
      body: JSON.stringify({
        cityName: cityNameEl.value,
        playerName: (playerNameEl.value || "Commander").trim(),
      }),
    });

    if (!createResponse.ok) {
      throw new Error("Failed to create match");
    }

    const reservation = await createResponse.json();
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // Always prefer same-origin WS endpoint to avoid localhost/public-host mismatches.
    const endpoint = `${wsProtocol}//${window.location.host}`;
    const seatReservation = {
      sessionId: reservation.sessionId,
      room: {
        name: reservation.roomName || "match",
        roomId: reservation.roomId,
        processId: reservation.processId,
        publicAddress: reservation.publicAddress || window.location.host,
      },
    };

    const client = new window.Colyseus.Client(endpoint);
    const room = await client.consumeSeatReservation(seatReservation);

    state.room = room;
    refreshTargets();

    room.onStateChange(() => {
      refreshTargets();
      updateMapState();
      updateAutoAlertFromState();
      reconcileAlertMode();
      renderTimeline();
    });

    room.onMessage("signal.feed", (payload) => {
      appendSignal(payload);
    });

    room.onMessage("commander.status", (payload) => {
      renderCommanderStatus(payload);
    });

    room.onMessage("match.start", (payload) => {
      if (payload?.startedAt) {
        state.matchStartedAt = payload.startedAt;
      }
      appendTimelineEntry("MATCH START CONFIRMED");
      renderTimeline();
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
        message: `CONNECT ERROR: ${formatError(error)}`,
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

  targetIdEl.addEventListener("change", () => {
    const targetId = targetIdEl.value;
    if (targetId) {
      selectTarget(targetId, "dropdown");
    }
  });

  leafletMap.on("click", (event) => {
    if (!state.room || !state.room.state || !state.room.state.leviathans) {
      return;
    }

    const clickPoint = leafletMap.latLngToContainerPoint(event.latlng);
    let closest = null;

    state.room.state.leviathans.forEach((lev) => {
      const pixel = gameToPixel(lev.x, lev.y);
      const dx = pixel.x - clickPoint.x;
      const dy = pixel.y - clickPoint.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 24) {
        return;
      }
      if (!closest || distance < closest.distance) {
        closest = { id: lev.id, distance };
      }
    });

    if (closest?.id) {
      selectTarget(closest.id, "map");
    }
  });

  if (alertModeToggleEl) {
    alertModeToggleEl.addEventListener("click", () => {
      state.alertModeManual = !state.alertModeManual;
      reconcileAlertMode(state.alertModeManual ? "ALERT MODE MANUAL OVERRIDE ON" : "ALERT MODE MANUAL OVERRIDE OFF");
    });
  }

  if (state.matchStartedAt <= 0) {
    state.matchStartedAt = Date.now();
  }
  setInterval(renderTimeline, 1000);
  renderTimeline();
  reconcileAlertMode();

  loadCities().catch(() => {
    updateConnectionState("OFFLINE", "critical");
  });
})();
