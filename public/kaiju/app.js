(() => {
  const CONTINUE_WINDOW_MS = 10_000;
  const ATTACK_COOLDOWN_MS = 2_000;
  const MOVE_SEND_INTERVAL_MS = 120;
  const ABILITY_COOLDOWNS_MS = {
    Submerge: 8_000,
    Roar: 7_000,
    Frenzy: 6_000,
    Fortress: 9_000,
  };

  const ABILITY_BY_ARCHETYPE = {
    Sniper: { id: "submerge", label: "Submerge", status: "SUBMERGED" },
    Dozer: { id: "roar", label: "Roar", status: "ACTIVE" },
    Berserker: { id: "frenzy", label: "Frenzy", status: "ACTIVE" },
    Tank: { id: "fortress", label: "Fortress", status: "ACTIVE" },
  };

  const SPECTATOR_MAP_BOUNDS = {
    north: 47.7412,
    south: 47.4712,
    west: -122.5921,
    east: -122.0721,
  };

  const state = {
    room: null,
    controlledLeviathan: null,
    previousHp: 0,
    containedAt: 0,
    cooldownReadyAt: {
      attack: 0,
      ability: 0,
    },
    lastMoveSentAt: 0,
    queuedMoveDelta: 0,
    queuedMoveTimer: 0,
    spectatorMode: false,
    gameOverAnnounced: false,
    commanderStatus: null,
    containedEventAt: 0,
    previousCityBaseHp: 0,
    spectatorMapReady: false,
    audioUnlocked: false,
    coinDropAudioSource: null,
  };

  const pilotNameEl = document.getElementById("pilotName");
  const roomIdEl = document.getElementById("roomId");
  const reconnectTokenEl = document.getElementById("reconnectToken");
  const refreshMatchesButtonEl = document.getElementById("refreshMatchesButton");
  const joinButtonEl = document.getElementById("joinButton");
  const connectionStateEl = document.getElementById("connectionState");
  const contextButtons = Array.from(document.querySelectorAll(".context-button"));
  const sessionPanelEl = document.getElementById("sessionPanel");
  const mapPanelEl = document.getElementById("mapPanel");
  const feedPanelEl = document.getElementById("feedPanel");

  const kaijuNameEl = document.getElementById("kaijuName");
  const kaijuArchetypeEl = document.getElementById("kaijuArchetype");
  const kaijuStatusEl = document.getElementById("kaijuStatus");
  const kaijuCreditsEl = document.getElementById("kaijuCredits");
  const modeBadgeEl = document.getElementById("modeBadge");
  const modeHintEl = document.getElementById("modeHint");
  const primaryAlertEl = document.getElementById("primaryAlert");
  const hpTextEl = document.getElementById("hpText");
  const hpBarEl = document.getElementById("hpBar");
  const distanceTextEl = document.getElementById("distanceText");
  const distanceFillEl = document.getElementById("distanceFill");

  const moveLeftButtonEl = document.getElementById("moveLeftButton");
  const moveRightButtonEl = document.getElementById("moveRightButton");
  const attackButtonEl = document.getElementById("attackButton");
  const abilityButtonEl = document.getElementById("abilityButton");
  const attackCooldownFillEl = document.getElementById("attackCooldownFill");
  const abilityCooldownFillEl = document.getElementById("abilityCooldownFill");
  const attackCooldownTextEl = document.getElementById("attackCooldownText");
  const abilityCooldownTextEl = document.getElementById("abilityCooldownText");
  const actionPanelEl = document.querySelector(".action-panel");
  const spectatorPanelEl = document.getElementById("spectatorPanel");
  const spectatorCityBaseHpEl = document.getElementById("spectatorCityBaseHp");
  const spectatorCommanderScoreEl = document.getElementById("spectatorCommanderScore");
  const spectatorBarriersEl = document.getElementById("spectatorBarriers");
  const spectatorTargetEl = document.getElementById("spectatorTarget");
  const spectatorLeafletMapEl = document.getElementById("spectatorLeafletMap");
  const spectatorRadarOverlayEl = document.getElementById("spectatorRadarOverlay");
  const cooldownsEl = document.getElementById("cooldowns");
  const signalFeedEl = document.getElementById("signalFeed");

  const continueOverlayEl = document.getElementById("continueOverlay");
  const continueCountdownEl = document.getElementById("continueCountdown");
  const continueStateEl = document.getElementById("continueState");
  const continueCreditsEl = document.getElementById("continueCredits");
  const continueHintEl = document.getElementById("continueHint");
  const continueButtonEl = document.getElementById("continueButton");
  const damageLayerEl = document.getElementById("damageLayer");
  const coinDropAudioEl = document.getElementById("coinDropAudio");

  const COIN_DROP_WAV_DATA_URI =
    "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

  let spectatorMap = null;
  let spectatorRadarCtx = null;
  const spectatorMapState = {
    cityBase: { x: 50, y: 50, hp: 500, hpMax: 500 },
    leviathans: [],
  };
  let radarSweepDeg = 0;
  let uiTickHandle = 0;

  function formatError(error) {
    if (!error) return "Unknown error";
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === "string") return error;
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

  function setContextPanel(panelName) {
    const panels = {
      session: sessionPanelEl,
      map: mapPanelEl,
      feed: feedPanelEl,
    };

    Object.entries(panels).forEach(([key, panel]) => {
      if (!panel) {
        return;
      }
      panel.classList.toggle("hidden", key !== panelName);
    });

    contextButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.target === panelName);
    });

    if (panelName === "map") {
      resizeSpectatorMap();
    }
  }

  function setMode(modeText, className, hintText) {
    if (modeBadgeEl) {
      modeBadgeEl.textContent = modeText;
      modeBadgeEl.className = `mode-badge ${className}`;
    }
    if (modeHintEl) {
      modeHintEl.textContent = hintText;
    }
  }

  function setPrimaryAlert(text, className) {
    if (!primaryAlertEl) {
      return;
    }
    primaryAlertEl.textContent = text;
    primaryAlertEl.className = `primary-alert ${className}`;
  }

  function appendFeed(message, severity, timestamp) {
    const li = document.createElement("li");
    li.className = severity || "nominal";
    li.textContent = `${new Date(timestamp || Date.now()).toLocaleTimeString()} :: ${message}`;
    signalFeedEl.prepend(li);
    if (signalFeedEl.children.length > 50) {
      signalFeedEl.removeChild(signalFeedEl.lastChild);
    }
  }

  function preloadCoinAudioFallback() {
    if (!coinDropAudioEl) {
      return;
    }

    coinDropAudioEl.src = COIN_DROP_WAV_DATA_URI;
    state.coinDropAudioSource = coinDropAudioEl;
  }

  function triggerScreenShake() {
    document.body.classList.remove("screen-shake");
    window.requestAnimationFrame(() => {
      document.body.classList.add("screen-shake");
      window.setTimeout(() => {
        document.body.classList.remove("screen-shake");
      }, 380);
    });
  }

  function triggerShatterEffect() {
    continueOverlayEl.classList.remove("shatter");
    window.requestAnimationFrame(() => {
      continueOverlayEl.classList.add("shatter");
      window.setTimeout(() => {
        continueOverlayEl.classList.remove("shatter");
      }, 700);
    });
  }

  function playCoinDropCue() {
    if (!state.audioUnlocked && state.coinDropAudioSource) {
      state.coinDropAudioSource.currentTime = 0;
      state.coinDropAudioSource.play().catch(() => {
        // no-op
      });
      return;
    }

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor && state.coinDropAudioSource) {
      state.coinDropAudioSource.currentTime = 0;
      state.coinDropAudioSource.play().catch(() => {
        // no-op
      });
      return;
    }

    try {
      const audioCtx = new AudioContextCtor();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(260, audioCtx.currentTime + 0.16);

      gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.18, audioCtx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.18);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.18);
      oscillator.onended = () => {
        audioCtx.close().catch(() => {
          // no-op
        });
      };
    } catch {
      if (state.coinDropAudioSource) {
        state.coinDropAudioSource.currentTime = 0;
        state.coinDropAudioSource.play().catch(() => {
          // no-op
        });
      }
    }
  }

  function playContainmentFx() {
    triggerShatterEffect();
    triggerScreenShake();
    playCoinDropCue();
  }

  function setAbilityLabel(leviathan) {
    const spec = ABILITY_BY_ARCHETYPE[leviathan?.archetype] || {
      id: "ability",
      label: "Ability",
      status: "ACTIVE",
    };
    abilityButtonEl.textContent = spec.label;
    return spec;
  }

  function renderHpBar(hp, hpMax) {
    hpBarEl.innerHTML = "";
    const safeHpMax = Math.max(1, hpMax || 1);
    const filled = Math.round((Math.max(0, hp) / safeHpMax) * 10);
    const danger = hp / safeHpMax <= 0.3;

    for (let i = 0; i < 10; i++) {
      const segment = document.createElement("span");
      segment.className = "hp-segment";
      if (i < filled) {
        segment.classList.add("active");
        if (danger) {
          segment.classList.add("danger");
        }
      }
      hpBarEl.appendChild(segment);
    }
  }

  function calculateDistance(leviathan, cityBase) {
    if (!leviathan || !cityBase) return { raw: 0, progress: 0 };
    const dx = cityBase.x - leviathan.x;
    const dy = cityBase.y - leviathan.y;
    const raw = Math.sqrt(dx * dx + dy * dy);
    const maxReasonableDistance = 100;
    const progress = Math.max(0, Math.min(100, ((maxReasonableDistance - raw) / maxReasonableDistance) * 100));
    return { raw, progress };
  }

  function spawnDamagePop(damage) {
    if (!damage || damage <= 0) {
      return;
    }

    const pop = document.createElement("div");
    pop.className = "damage-pop";
    pop.textContent = `-${damage}`;

    const x = Math.max(12, Math.min(window.innerWidth - 90, window.innerWidth * (0.35 + Math.random() * 0.3)));
    const y = Math.max(60, Math.min(window.innerHeight - 90, window.innerHeight * (0.42 + Math.random() * 0.18)));
    pop.style.left = `${Math.round(x)}px`;
    pop.style.top = `${Math.round(y)}px`;

    damageLayerEl.appendChild(pop);
    window.setTimeout(() => {
      pop.remove();
    }, 740);

    if (damage >= 12) {
      triggerScreenShake();
    }
  }

  function gameToLatLng(gameX, gameY) {
    if (!window.L) {
      return null;
    }

    const lat =
      SPECTATOR_MAP_BOUNDS.north -
      (gameY / 100) * (SPECTATOR_MAP_BOUNDS.north - SPECTATOR_MAP_BOUNDS.south);
    const lng =
      SPECTATOR_MAP_BOUNDS.west +
      (gameX / 100) * (SPECTATOR_MAP_BOUNDS.east - SPECTATOR_MAP_BOUNDS.west);
    return window.L.latLng(lat, lng);
  }

  function gameToPixel(gameX, gameY) {
    if (!spectatorMap) {
      return null;
    }

    const latLng = gameToLatLng(gameX, gameY);
    if (!latLng) {
      return null;
    }

    const point = spectatorMap.latLngToContainerPoint(latLng);
    return { x: point.x, y: point.y };
  }

  function updateSpectatorMapState() {
    if (!state.room || !state.room.state) {
      return;
    }

    const roomState = state.room.state;
    if (roomState.cityBase) {
      spectatorMapState.cityBase.x = roomState.cityBase.x;
      spectatorMapState.cityBase.y = roomState.cityBase.y;
      spectatorMapState.cityBase.hp = roomState.cityBase.hp;
      spectatorMapState.cityBase.hpMax = roomState.cityBase.hpMax;
    }

    spectatorMapState.leviathans = [];
    roomState.leviathans.forEach((leviathan) => {
      spectatorMapState.leviathans.push({
        id: leviathan.id,
        name: leviathan.name,
        x: leviathan.x,
        y: leviathan.y,
        hp: leviathan.hp,
        hpMax: leviathan.hpMax,
        heading: leviathan.heading,
        status: leviathan.status,
      });
    });
  }

  function drawSpectatorMap() {
    if (!spectatorRadarCtx || !spectatorRadarOverlayEl || !spectatorMap) {
      return;
    }

    const canvasWidth = spectatorRadarOverlayEl.width;
    const canvasHeight = spectatorRadarOverlayEl.height;
    if (canvasWidth <= 0 || canvasHeight <= 0) {
      return;
    }

    const ctx = spectatorRadarCtx;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    radarSweepDeg = (radarSweepDeg + 0.45) % 360;
    const base = gameToPixel(spectatorMapState.cityBase.x, spectatorMapState.cityBase.y);
    if (!base) {
      return;
    }

    const sweepRadius = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight);
    const sweepRad = (radarSweepDeg * Math.PI) / 180;

    for (let i = 0; i < 28; i++) {
      const trailRad = sweepRad - (i * Math.PI) / 180;
      const alpha = ((28 - i) / 28) * 0.12;
      ctx.beginPath();
      ctx.moveTo(base.x, base.y);
      ctx.arc(base.x, base.y, sweepRadius, trailRad - Math.PI / 180, trailRad);
      ctx.closePath();
      ctx.fillStyle = `rgba(13, 227, 208, ${alpha})`;
      ctx.fill();
    }

    spectatorMapState.leviathans.forEach((leviathan) => {
      const point = gameToPixel(leviathan.x, leviathan.y);
      if (!point) {
        return;
      }

      const color =
        leviathan.status === "CONTAINED"
          ? "#84ffc5"
          : leviathan.status === "SUBMERGED"
            ? "#7db2ab"
            : "#ff4f59";

      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 9;
      ctx.fill();
      ctx.shadowBlur = 0;

      const hpFraction = leviathan.hpMax > 0 ? leviathan.hp / leviathan.hpMax : 0;
      ctx.fillStyle = "rgba(4, 10, 12, 0.84)";
      ctx.fillRect(point.x - 14, point.y + 8, 28, 3);
      ctx.fillStyle = hpFraction > 0.5 ? "#84ffc5" : hpFraction > 0.25 ? "#ff8f3f" : "#ff4f59";
      ctx.fillRect(point.x - 14, point.y + 8, 28 * hpFraction, 3);
    });
  }

  function initializeSpectatorMap() {
    if (!window.L || !spectatorLeafletMapEl || !spectatorRadarOverlayEl || spectatorMap) {
      return;
    }

    spectatorMap = window.L.map("spectatorLeafletMap", {
      center: [47.6062, -122.3321],
      zoom: 11,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
    });

    window.L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(spectatorMap);

    spectatorMap.fitBounds([
      [SPECTATOR_MAP_BOUNDS.south, SPECTATOR_MAP_BOUNDS.west],
      [SPECTATOR_MAP_BOUNDS.north, SPECTATOR_MAP_BOUNDS.east],
    ]);

    spectatorRadarCtx = spectatorRadarOverlayEl.getContext("2d");
    state.spectatorMapReady = true;
  }

  function resizeSpectatorMap() {
    if (!spectatorRadarOverlayEl || !spectatorMap) {
      return;
    }

    const shell = spectatorRadarOverlayEl.parentElement;
    const width = shell?.clientWidth ?? 0;
    const height = shell?.clientHeight ?? 0;
    if (width <= 0 || height <= 0) {
      return;
    }

    spectatorRadarOverlayEl.width = width;
    spectatorRadarOverlayEl.height = height;
    spectatorMap.invalidateSize();
  }

  function findControlledLeviathan() {
    if (!state.room || !state.room.state || !state.room.state.leviathans) {
      return null;
    }

    let controlled = null;
    state.room.state.leviathans.forEach((leviathan) => {
      if (leviathan.playerId === state.room.sessionId) {
        controlled = leviathan;
      }
    });

    return controlled;
  }

  function renderStatus() {
    const leviathan = state.controlledLeviathan;
    if (!leviathan) {
      kaijuNameEl.textContent = "SPECTATING";
      kaijuArchetypeEl.textContent = "-";
      kaijuStatusEl.textContent = "-";
      kaijuCreditsEl.textContent = "-";
      hpTextEl.textContent = "0 / 0";
      distanceTextEl.textContent = "-";
      distanceFillEl.style.width = "0%";
      renderHpBar(0, 1);
      setMode("OFFLINE", "critical", "Join a match to arm controls.");
      setPrimaryAlert("Awaiting tactical telemetry.", "nominal");
      moveLeftButtonEl.disabled = true;
      moveRightButtonEl.disabled = true;
      attackButtonEl.disabled = true;
      abilityButtonEl.disabled = true;
      return;
    }

    const abilitySpec = setAbilityLabel(leviathan);

    kaijuNameEl.textContent = leviathan.name;
    kaijuArchetypeEl.textContent = leviathan.archetype;
    kaijuStatusEl.textContent = leviathan.status;
    kaijuCreditsEl.textContent = String(leviathan.credits);
    hpTextEl.textContent = `${Math.max(0, Math.round(leviathan.hp))} / ${Math.max(1, Math.round(leviathan.hpMax))}`;
    renderHpBar(leviathan.hp, leviathan.hpMax);

    const distance = calculateDistance(leviathan, state.room.state.cityBase);
    distanceTextEl.textContent = `${distance.raw.toFixed(1)} units`;
    distanceFillEl.style.width = `${distance.progress.toFixed(0)}%`;

    state.spectatorMode = Boolean(leviathan.isSpectator);
    const canAct = leviathan.status !== "CONTAINED" && !state.spectatorMode;
    moveLeftButtonEl.disabled = !canAct;
    moveRightButtonEl.disabled = !canAct;

    if (state.spectatorMode) {
      setMode("SPECTATOR", "alert", "Inputs are locked. Monitoring commander telemetry.");
      setPrimaryAlert("SPECTATOR MODE: observe and await next deployment.", "alert");
    } else if (leviathan.status === "CONTAINED") {
      setMode("CONTAINED", "critical", "Continue before countdown reaches zero.");
      setPrimaryAlert("CONTAINMENT BREACH: continue required to respawn.", "critical");
    } else {
      setMode("ACTIVE", "nominal", "Combat controls online.");
      setPrimaryAlert("TACTICAL PRIORITY: pressure city base while evading assets.", "nominal");
    }

    const now = Date.now();
    attackButtonEl.disabled = !canAct || now < state.cooldownReadyAt.attack;
    abilityButtonEl.disabled = !canAct || now < state.cooldownReadyAt.ability;

    if (state.previousHp > 0 && leviathan.hp < state.previousHp) {
      spawnDamagePop(Math.round(state.previousHp - leviathan.hp));
    }
    state.previousHp = leviathan.hp;

    const becameContained = leviathan.status === "CONTAINED" && state.containedAt === 0;
    const recovered = leviathan.status !== "CONTAINED";

    if (becameContained) {
      state.containedAt = leviathan.containedAt > 0 ? leviathan.containedAt : Date.now();
      state.gameOverAnnounced = false;
      if (state.containedAt !== state.containedEventAt) {
        playContainmentFx();
        appendFeed(`KAIJU ${leviathan.name} CONTAINED`, "critical", state.containedAt);
        state.containedEventAt = state.containedAt;
      }
    } else if (recovered) {
      state.containedAt = 0;
      state.containedEventAt = 0;
      state.gameOverAnnounced = false;
    }

    if (abilitySpec.status === "SUBMERGED" && leviathan.status === "SUBMERGED") {
      appendFeed(`${abilitySpec.label.toUpperCase()} ACTIVE`, "nominal", Date.now());
    }
  }

  function renderSpectatorPanel() {
    const shouldShowSpectatorPanel = state.spectatorMode;
    if (actionPanelEl) {
      actionPanelEl.classList.toggle("hidden", shouldShowSpectatorPanel);
    }
    if (!spectatorPanelEl) {
      return;
    }

    spectatorPanelEl.classList.toggle("hidden", !shouldShowSpectatorPanel);
    if (!shouldShowSpectatorPanel) {
      return;
    }

    const commanderStatus = state.commanderStatus;
    spectatorCityBaseHpEl.textContent = commanderStatus ? String(commanderStatus.cityBaseHp) : "-";
    spectatorCommanderScoreEl.textContent = commanderStatus ? String(commanderStatus.commanderScore) : "-";
    spectatorBarriersEl.textContent = commanderStatus ? String(commanderStatus.activeBarriers) : "-";
    spectatorTargetEl.textContent = commanderStatus && commanderStatus.selectedLeviathanId
      ? commanderStatus.selectedLeviathanId
      : "NONE";
  }

  function renderCooldowns() {
    const now = Date.now();
    const attackRemainingMs = Math.max(0, state.cooldownReadyAt.attack - now);
    const abilityRemainingMs = Math.max(0, state.cooldownReadyAt.ability - now);
    const abilitySpec = setAbilityLabel(state.controlledLeviathan);
    const abilityDurationMs = ABILITY_COOLDOWNS_MS[abilitySpec.label] || 7_000;

    const attackProgress = Math.max(0, Math.min(1, 1 - attackRemainingMs / ATTACK_COOLDOWN_MS));
    const abilityProgress = Math.max(0, Math.min(1, 1 - abilityRemainingMs / abilityDurationMs));

    if (attackCooldownFillEl) {
      attackCooldownFillEl.style.width = `${Math.round(attackProgress * 100)}%`;
    }
    if (abilityCooldownFillEl) {
      abilityCooldownFillEl.style.width = `${Math.round(abilityProgress * 100)}%`;
    }
    if (attackCooldownTextEl) {
      attackCooldownTextEl.textContent = attackRemainingMs > 0
        ? `${(attackRemainingMs / 1000).toFixed(1)}s`
        : "READY";
    }
    if (abilityCooldownTextEl) {
      abilityCooldownTextEl.textContent = abilityRemainingMs > 0
        ? `${(abilityRemainingMs / 1000).toFixed(1)}s`
        : "READY";
    }

    cooldownsEl.innerHTML = "";

    const attackLi = document.createElement("li");
    attackLi.className = attackRemainingMs > 0 ? "alert" : "nominal";
    attackLi.textContent = `Attack cooldown: ${(attackRemainingMs / 1000).toFixed(1)}s`;
    cooldownsEl.appendChild(attackLi);

    const abilityLi = document.createElement("li");
    abilityLi.className = abilityRemainingMs > 0 ? "alert" : "nominal";
    abilityLi.textContent = `Ability cooldown: ${(abilityRemainingMs / 1000).toFixed(1)}s`;
    cooldownsEl.appendChild(abilityLi);
  }

  function renderContinueOverlay() {
    if (
      !state.controlledLeviathan ||
      state.controlledLeviathan.status !== "CONTAINED" ||
      state.spectatorMode
    ) {
      continueOverlayEl.classList.add("hidden");
      return;
    }

    continueOverlayEl.classList.remove("hidden");

    const elapsed = Date.now() - state.containedAt;
    const remainingMs = Math.max(0, CONTINUE_WINDOW_MS - elapsed);
    continueCountdownEl.textContent = (remainingMs / 1000).toFixed(1);

    const hasCredits = state.controlledLeviathan.credits > 0;
    const credits = state.controlledLeviathan.credits;
    if (continueCreditsEl) {
      continueCreditsEl.textContent = `CREDITS: ${credits}`;
    }
    if (continueStateEl) {
      continueStateEl.innerHTML = `AUTO-SPECTATOR IN <span id="continueCountdown">${(remainingMs / 1000).toFixed(1)}</span>s`;
    }
    if (continueHintEl) {
      continueHintEl.textContent = hasCredits
        ? "Press continue to respawn at 60% HP."
        : "No credits left. Spectator mode will engage automatically.";
    }
    continueButtonEl.disabled = !hasCredits || remainingMs <= 0;

    if ((!hasCredits || remainingMs <= 0) && !state.gameOverAnnounced) {
      appendFeed("GAME OVER - CONTINUE WINDOW EXPIRED", "critical", Date.now());
      state.gameOverAnnounced = true;
    }
  }

  function uiTick() {
    renderStatus();
    if (state.spectatorMapReady) {
      drawSpectatorMap();
    }
    renderCooldowns();
    renderContinueOverlay();
    renderSpectatorPanel();
    uiTickHandle = window.requestAnimationFrame(uiTick);
  }

  async function refreshMatches() {
    const response = await fetch("/api/matches");
    if (!response.ok) {
      throw new Error("Failed to list matches");
    }

    const payload = await response.json();
    roomIdEl.innerHTML = "";

    payload.matches.forEach((match) => {
      const option = document.createElement("option");
      option.value = match.roomId;
      option.textContent = `${match.roomId} (${match.clients}/${match.maxClients})`;
      roomIdEl.appendChild(option);
    });

    if (payload.matches.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No active matches";
      roomIdEl.appendChild(option);
    }
  }

  async function joinMatch() {
    const selectedRoomId = roomIdEl.value;
    if (!selectedRoomId) {
      throw new Error("Select a room first");
    }

    updateConnectionState("CONNECTING", "alert");

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const endpoint = `${wsProtocol}//${window.location.host}`;
    const client = new window.Colyseus.Client(endpoint);

    const reconnectToken = reconnectTokenEl.value.trim();
    const joinOptions = {
      playerName: (pilotNameEl.value || "Kaiju Pilot").trim(),
      ...(reconnectToken ? { reconnectToken } : {}),
    };

    const reservationResponse = await fetch(`/api/matches/${encodeURIComponent(selectedRoomId)}/kaiju-join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(joinOptions),
    });
    if (!reservationResponse.ok) {
      const payload = await reservationResponse.json().catch(() => ({}));
      throw new Error(payload.error || "Failed to reserve Kaiju seat");
    }

    const reservation = await reservationResponse.json();
    const seatReservation = {
      sessionId: reservation.sessionId,
      room: {
        name: reservation.roomName || "match",
        roomId: reservation.roomId,
        processId: reservation.processId,
        publicAddress: reservation.publicAddress || window.location.host,
      },
    };

    const room = await client.consumeSeatReservation(seatReservation);
    state.room = room;
    state.previousHp = 0;
    state.spectatorMode = false;
    state.gameOverAnnounced = false;

    room.onStateChange(() => {
      state.controlledLeviathan = findControlledLeviathan();
      updateSpectatorMapState();
    });

    room.onMessage("signal.feed", (payload) => {
      appendFeed(payload.message, payload.severity, payload.timestamp);
    });

    room.onMessage("match.start", (payload) => {
      appendFeed(`MATCH START - ${payload.cityName}`, "nominal", payload.startedAt);
    });

    room.onMessage("match.result", (payload) => {
      appendFeed(`MATCH RESULT :: ${payload.outcome.toUpperCase()}`, "critical", Date.now());
    });

    room.onMessage("kaiju.ability.result", (payload) => {
      const severity = payload.outcome === "APPLIED" ? "nominal" : "alert";
      appendFeed(payload.message, severity, payload.resolvedAt || Date.now());
    });

    room.onMessage("kaiju.contained", (payload) => {
      const controlled = state.controlledLeviathan;
      if (!controlled || controlled.id !== payload.leviathanId) {
        return;
      }

      state.containedEventAt = payload.containedAt || Date.now();
      state.containedAt = state.containedEventAt;
      state.gameOverAnnounced = false;
      playContainmentFx();
      appendFeed(`KAIJU ${payload.leviathanName} CONTAINED`, "critical", payload.timestamp || Date.now());
    });

    room.onMessage("kaiju.spectator", (payload) => {
      state.spectatorMode = true;
      appendFeed(
        `SPECTATOR MODE :: ${payload.leviathanName} (${payload.reason.toUpperCase()})`,
        "critical",
        payload.timestamp || Date.now()
      );
    });

    room.onMessage("commander.status", (payload) => {
      if (
        state.previousCityBaseHp > 0 &&
        typeof payload.cityBaseHp === "number" &&
        payload.cityBaseHp < state.previousCityBaseHp
      ) {
        triggerScreenShake();
      }
      state.commanderStatus = payload;
      state.previousCityBaseHp = payload.cityBaseHp;
    });

    room.onMessage("kaiju.reconnect.token", (payload) => {
      reconnectTokenEl.value = payload.reconnectToken;
      localStorage.setItem("kaijuReconnectToken", payload.reconnectToken);
      appendFeed("Reconnect token issued", "nominal", Date.now());
    });

    state.controlledLeviathan = findControlledLeviathan();
    updateConnectionState(`ONLINE ROOM ${room.id}`, "nominal");
  }

  function flushQueuedMove() {
    state.queuedMoveTimer = 0;
    if (state.queuedMoveDelta === 0) {
      return;
    }

    const delta = state.queuedMoveDelta;
    state.queuedMoveDelta = 0;
    sendMove(delta);
  }

  function sendMove(deltaHeading) {
    const leviathan = state.controlledLeviathan;
    if (!state.room || !leviathan || state.spectatorMode || leviathan.status === "CONTAINED") {
      return;
    }

    const now = Date.now();
    const elapsed = now - state.lastMoveSentAt;
    if (elapsed < MOVE_SEND_INTERVAL_MS) {
      state.queuedMoveDelta = deltaHeading;
      if (!state.queuedMoveTimer) {
        state.queuedMoveTimer = window.setTimeout(
          flushQueuedMove,
          MOVE_SEND_INTERVAL_MS - elapsed
        );
      }
      return;
    }

    const nextHeading = ((leviathan.heading + deltaHeading) % 360 + 360) % 360;
    state.room.send("kaiju.move", { heading: nextHeading });
    state.lastMoveSentAt = now;
    appendFeed(`Heading set: ${Math.round(nextHeading)} deg`, "nominal", Date.now());
  }

  function sendAttack() {
    const leviathan = state.controlledLeviathan;
    if (!state.room || !leviathan || leviathan.status === "CONTAINED") {
      return;
    }

    state.room.send("kaiju.attack", {});
    state.cooldownReadyAt.attack = Date.now() + ATTACK_COOLDOWN_MS;
    appendFeed("Attack dispatched", "alert", Date.now());
  }

  function sendAbility() {
    const leviathan = state.controlledLeviathan;
    if (!state.room || !leviathan || leviathan.status === "CONTAINED") {
      return;
    }

    const abilitySpec = setAbilityLabel(leviathan);
    state.room.send("kaiju.ability", { abilityId: abilitySpec.id });
    const cooldownMs = ABILITY_COOLDOWNS_MS[abilitySpec.label] || 7_000;
    state.cooldownReadyAt.ability = Date.now() + cooldownMs;
    appendFeed(`${abilitySpec.label} activated`, "alert", Date.now());
  }

  function sendContinue() {
    const leviathan = state.controlledLeviathan;
    if (!state.room || !leviathan || leviathan.credits <= 0) {
      return;
    }

    state.room.send("kaiju.continue", {});
    appendFeed("Continue requested", "nominal", Date.now());
  }

  function wireEvents() {
    const unlockAudio = () => {
      state.audioUnlocked = true;
    };

    document.addEventListener("pointerdown", unlockAudio, { once: true });

    refreshMatchesButtonEl.addEventListener("click", async () => {
      refreshMatchesButtonEl.disabled = true;
      try {
        await refreshMatches();
      } catch (error) {
        appendFeed(`MATCH LIST ERROR: ${formatError(error)}`, "critical", Date.now());
      } finally {
        refreshMatchesButtonEl.disabled = false;
      }
    });

    joinButtonEl.addEventListener("click", async () => {
      joinButtonEl.disabled = true;
      try {
        await joinMatch();
      } catch (error) {
        updateConnectionState("OFFLINE", "critical");
        appendFeed(`CONNECT ERROR: ${formatError(error)}`, "critical", Date.now());
      } finally {
        joinButtonEl.disabled = false;
      }
    });

    moveLeftButtonEl.addEventListener("click", () => sendMove(-18));
    moveRightButtonEl.addEventListener("click", () => sendMove(18));
    attackButtonEl.addEventListener("click", sendAttack);
    abilityButtonEl.addEventListener("click", sendAbility);
    continueButtonEl.addEventListener("click", sendContinue);

    contextButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.target || "session";
        setContextPanel(target);
      });
    });

    window.addEventListener("beforeunload", () => {
      if (uiTickHandle) {
        window.cancelAnimationFrame(uiTickHandle);
      }
    });
  }

  async function initialize() {
    updateConnectionState("OFFLINE", "critical");
    const token = localStorage.getItem("kaijuReconnectToken");
    if (token) {
      reconnectTokenEl.value = token;
    }

    wireEvents();
    setContextPanel("session");
    preloadCoinAudioFallback();
    initializeSpectatorMap();
    resizeSpectatorMap();
    window.addEventListener("resize", resizeSpectatorMap);
    await refreshMatches();
    uiTick();
  }

  initialize().catch((error) => {
    appendFeed(`INIT ERROR: ${formatError(error)}`, "critical", Date.now());
  });
})();
