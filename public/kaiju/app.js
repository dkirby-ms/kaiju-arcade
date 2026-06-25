(() => {
  const CONTINUE_WINDOW_MS = 10_000;
  const ATTACK_COOLDOWN_MS = 2_000;
  const MOVE_SEND_INTERVAL_MS = 70;
  const MOVE_ACCEL_PER_SECOND = 6.5;
  const MOVE_DECEL_PER_SECOND = 9.5;
  const MAP_INTERPOLATION_ALPHA = 0.26;
  const MAP_PREDICTION_MS = 120;
  const MAP_CAMERA_FOLLOW_ALPHA = 0.12;
  const MAP_CAMERA_DEADZONE_UNITS = 8;
  const INPUT_SETTINGS_STORAGE_KEY = "kaijuInputSettings";
  const HUD_SETTINGS_STORAGE_KEY = "kaijuHudSettings";
  const DEFAULT_INPUT_SETTINGS = {
    deadzone: 0.16,
    sensitivity: 1,
  };
  const DEFAULT_HUD_SETTINGS = {
    opacity: 0.9,
  };
  const KAIJU_ATTACK_RANGE_UNITS = 10;
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

  const MOVE_INPUT_BY_KEY = {
    KeyW: "up",
    ArrowUp: "up",
    KeyS: "down",
    ArrowDown: "down",
    KeyA: "left",
    ArrowLeft: "left",
    KeyD: "right",
    ArrowRight: "right",
  };

  const state = {
    room: null,
    phase: "WAITING",
    controlledLeviathan: null,
    previousHp: 0,
    containedAt: 0,
    cooldownReadyAt: {
      attack: 0,
      ability: 0,
    },
    lastMoveSentAt: 0,
    lastMoveVector: null,
    smoothedMoveVector: { x: 0, y: 0 },
    queuedMoveVector: null,
    queuedMoveTimer: 0,
    lastInputFrameAt: 0,
    inputSettings: { ...DEFAULT_INPUT_SETTINGS },
    pressedDirections: {
      up: false,
      down: false,
      left: false,
      right: false,
    },
    directionalButtonsPressed: {
      up: false,
      down: false,
      left: false,
      right: false,
    },
    spectatorMode: false,
    gameOverAnnounced: false,
    commanderStatus: null,
    containedEventAt: 0,
    previousCityBaseHp: 0,
    spectatorMapReady: false,
    smoothedMapCenter: { x: 50, y: 50 },
    renderLeviathansById: {},
    lastMapStateAt: 0,
    mapSampleById: {},
    audioUnlocked: false,
    coinDropAudioSource: null,
    hudSettings: { ...DEFAULT_HUD_SETTINGS },
  };

  const pilotNameEl = document.getElementById("pilotName");
  const roomIdEl = document.getElementById("roomId");
  const lobbyPhasePanelEl = document.getElementById("lobbyPhasePanel");
  const lobbyPhaseStatusEl = document.getElementById("lobbyPhaseStatus");
  const connectionStateEl = document.getElementById("connectionState");
  const activeUiEls = Array.from(document.querySelectorAll("[data-active-ui='true']"));

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

  const moveUpButtonEl = document.getElementById("moveUpButton");
  const moveLeftButtonEl = document.getElementById("moveLeftButton");
  const moveDownButtonEl = document.getElementById("moveDownButton");
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
  const mapAttackHintEl = document.getElementById("mapAttackHint");
  const hudOpacityControlEl = document.getElementById("hudOpacityControl");
  const hudOpacityValueEl = document.getElementById("hudOpacityValue");
  const mapClickLayerEl = document.getElementById("mapClickLayer");

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
  const RECONNECT_TOKEN_STORAGE_KEY = "kaijuReconnectToken";

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

  function readStoredReconnectToken() {
    const raw = localStorage.getItem(RECONNECT_TOKEN_STORAGE_KEY);
    if (!raw) {
      return "";
    }

    const reconnectToken = String(raw).trim();
    if (!reconnectToken) {
      localStorage.removeItem(RECONNECT_TOKEN_STORAGE_KEY);
      return "";
    }

    return reconnectToken;
  }

  function storeReconnectToken(reconnectToken) {
    const sanitizedToken = String(reconnectToken || "").trim();
    if (!sanitizedToken) {
      localStorage.removeItem(RECONNECT_TOKEN_STORAGE_KEY);
      if (window.KaijuSession) {
        window.KaijuSession.setReconnectionToken("");
      }
      return;
    }

    localStorage.setItem(RECONNECT_TOKEN_STORAGE_KEY, sanitizedToken);
    if (window.KaijuSession) {
      window.KaijuSession.setReconnectionToken(sanitizedToken);
    }
  }

  function persistRoomSession(room) {
    if (!window.KaijuSession || !room) {
      return;
    }

    window.KaijuSession.setCurrentMatchId(room.roomId || room.id || "");
    const reconnectToken = room.reconnectionToken || window.KaijuSession.getReconnectionToken();
    if (reconnectToken) {
      window.KaijuSession.setReconnectionToken(reconnectToken);
    }
    if (typeof window.KaijuSession.setActiveMatchSession === "function") {
      window.KaijuSession.setActiveMatchSession({
        roomId: room.roomId || room.id || "",
        roomName: "match",
        role: "kaiju",
        playerName: (pilotNameEl.value || "Kaiju Pilot").trim(),
        reconnectToken,
        claimedRole: "KAIJU",
        activatedAt: Date.now(),
      });
    }
  }

  function clearPendingReservation() {
    if (window.KaijuSession && typeof window.KaijuSession.clearPendingSeatReservation === "function") {
      window.KaijuSession.clearPendingSeatReservation();
    }
  }

  function routeToLobby(clearMatchSession) {
    if (window.KaijuSession && clearMatchSession) {
      if (typeof window.KaijuSession.clearActiveMatchSession === "function") {
        window.KaijuSession.clearActiveMatchSession();
      }
      window.KaijuSession.clearMatchSession();
    }

    window.location.assign("/lobby.html");
  }

  function routeUpstream(clearMatchSession) {
    const activeMatchSession =
      window.KaijuSession && typeof window.KaijuSession.getActiveMatchSession === "function"
        ? window.KaijuSession.getActiveMatchSession()
        : null;
    const pendingReservation =
      window.KaijuSession && typeof window.KaijuSession.getPendingSeatReservation === "function"
        ? window.KaijuSession.getPendingSeatReservation()
        : null;
    const currentMatchId = window.KaijuSession ? window.KaijuSession.getCurrentMatchId() : "";

    if (clearMatchSession && window.KaijuSession) {
      if (typeof window.KaijuSession.clearActiveMatchSession === "function") {
        window.KaijuSession.clearActiveMatchSession();
      }
      window.KaijuSession.clearMatchSession();
    }

    const hasPrematchContext =
      Boolean(pendingReservation?.roomId) || (Boolean(currentMatchId) && !activeMatchSession?.reconnectToken);
    window.location.assign(hasPrematchContext ? "/match-room.html" : "/lobby.html");
  }

  function updatePhaseUi() {
    const isActive = state.phase === "ACTIVE";

    activeUiEls.forEach((element) => {
      element.style.display = isActive ? "" : "none";
    });

    if (!lobbyPhasePanelEl || !lobbyPhaseStatusEl) {
      return;
    }

    lobbyPhasePanelEl.style.display = isActive ? "none" : "";
    if (state.phase === "LOBBY") {
      lobbyPhaseStatusEl.textContent = "Lobby ready. Waiting for commander to start the match...";
    } else if (state.phase === "WAITING") {
      lobbyPhaseStatusEl.textContent = "Waiting for all players to enter lobby...";
    } else {
      lobbyPhaseStatusEl.textContent = "Awaiting lobby phase...";
    }
  }

  function updateConnectionState(text, className) {
    connectionStateEl.textContent = text;
    connectionStateEl.className = `status ${className || ""}`.trim();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function readInputSettings() {
    const raw = localStorage.getItem(INPUT_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_INPUT_SETTINGS };
    }

    try {
      const parsed = JSON.parse(raw);
      return {
        deadzone: clamp(Number(parsed?.deadzone) || DEFAULT_INPUT_SETTINGS.deadzone, 0, 0.35),
        sensitivity: clamp(Number(parsed?.sensitivity) || DEFAULT_INPUT_SETTINGS.sensitivity, 0.65, 2),
      };
    } catch {
      return { ...DEFAULT_INPUT_SETTINGS };
    }
  }

  function storeInputSettings(settings) {
    localStorage.setItem(INPUT_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }

  function readHudSettings() {
    const raw = localStorage.getItem(HUD_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_HUD_SETTINGS };
    }

    try {
      const parsed = JSON.parse(raw);
      return {
        opacity: clamp(Number(parsed?.opacity) || DEFAULT_HUD_SETTINGS.opacity, 0.35, 0.95),
      };
    } catch {
      return { ...DEFAULT_HUD_SETTINGS };
    }
  }

  function storeHudSettings(settings) {
    localStorage.setItem(HUD_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }

  function applyHudOpacity(opacity) {
    const sanitized = clamp(opacity, 0.35, 0.95);
    document.documentElement.style.setProperty("--panel-opacity", sanitized.toFixed(2));

    if (hudOpacityControlEl) {
      hudOpacityControlEl.value = String(Math.round(sanitized * 100));
    }
    if (hudOpacityValueEl) {
      hudOpacityValueEl.textContent = `${Math.round(sanitized * 100)}%`;
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

  function updateSmoothedMapCenter() {
    const controlled = state.controlledLeviathan;
    if (!controlled || state.spectatorMode || controlled.status === "CONTAINED") {
      state.smoothedMapCenter.x = 50;
      state.smoothedMapCenter.y = 50;
      return;
    }

    const dx = controlled.x - state.smoothedMapCenter.x;
    const dy = controlled.y - state.smoothedMapCenter.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= MAP_CAMERA_DEADZONE_UNITS) {
      return;
    }

    state.smoothedMapCenter.x += dx * MAP_CAMERA_FOLLOW_ALPHA;
    state.smoothedMapCenter.y += dy * MAP_CAMERA_FOLLOW_ALPHA;
  }

  function recenterSpectatorMap() {
    if (!spectatorMap) {
      return;
    }

    updateSmoothedMapCenter();

    const centerLatLng = gameToLatLng(state.smoothedMapCenter.x, state.smoothedMapCenter.y);
    if (!centerLatLng) {
      return;
    }

    spectatorMap.panTo(centerLatLng, { animate: false });
  }

  function mapUnitsToPixels(units) {
    if (!spectatorMap || !Number.isFinite(units) || units <= 0) {
      return 0;
    }

    const origin = gameToLatLng(50, 50);
    const pointX = gameToLatLng(50 + units, 50);
    if (!origin || !pointX) {
      return 0;
    }

    const a = spectatorMap.latLngToContainerPoint(origin);
    const b = spectatorMap.latLngToContainerPoint(pointX);
    return Math.max(0, Math.hypot(b.x - a.x, b.y - a.y));
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
    const now = Date.now();
    roomState.leviathans.forEach((leviathan) => {
      const previousSample = state.mapSampleById[leviathan.id];
      let velocityX = 0;
      let velocityY = 0;
      if (previousSample) {
        const elapsedMs = Math.max(1, now - previousSample.at);
        velocityX = (leviathan.x - previousSample.x) / elapsedMs;
        velocityY = (leviathan.y - previousSample.y) / elapsedMs;
      }

      state.mapSampleById[leviathan.id] = {
        x: leviathan.x,
        y: leviathan.y,
        at: now,
        velocityX,
        velocityY,
      };

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

    state.lastMapStateAt = now;
  }

  function normalizeHeading(heading) {
    return ((heading % 360) + 360) % 360;
  }

  function lerpHeading(from, to, alpha) {
    const fromNorm = normalizeHeading(from || 0);
    const toNorm = normalizeHeading(to || 0);
    const shortest = ((toNorm - fromNorm + 540) % 360) - 180;
    return normalizeHeading(fromNorm + shortest * alpha);
  }

  function updateRenderedLeviathanPositions() {
    const now = Date.now();
    const seenIds = new Set();

    spectatorMapState.leviathans.forEach((leviathan) => {
      seenIds.add(leviathan.id);

      const sample = state.mapSampleById[leviathan.id];
      const predictionMs = Math.min(MAP_PREDICTION_MS, Math.max(0, now - state.lastMapStateAt + 16));
      const predictedX = sample
        ? clamp(leviathan.x + sample.velocityX * predictionMs, 0, 100)
        : leviathan.x;
      const predictedY = sample
        ? clamp(leviathan.y + sample.velocityY * predictionMs, 0, 100)
        : leviathan.y;

      const existing = state.renderLeviathansById[leviathan.id];
      if (!existing) {
        state.renderLeviathansById[leviathan.id] = {
          ...leviathan,
          x: predictedX,
          y: predictedY,
        };
        return;
      }

      existing.x += (predictedX - existing.x) * MAP_INTERPOLATION_ALPHA;
      existing.y += (predictedY - existing.y) * MAP_INTERPOLATION_ALPHA;
      existing.heading = lerpHeading(existing.heading, leviathan.heading, 0.3);
      existing.hp = leviathan.hp;
      existing.hpMax = leviathan.hpMax;
      existing.status = leviathan.status;
      existing.name = leviathan.name;
    });

    Object.keys(state.renderLeviathansById).forEach((leviathanId) => {
      if (!seenIds.has(leviathanId)) {
        delete state.renderLeviathansById[leviathanId];
        delete state.mapSampleById[leviathanId];
      }
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
    recenterSpectatorMap();

    radarSweepDeg = (radarSweepDeg + 0.45) % 360;
    const base = gameToPixel(spectatorMapState.cityBase.x, spectatorMapState.cityBase.y);
    if (!base) {
      return;
    }

    const sweepRadius = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight);
    const sweepRad = (radarSweepDeg * Math.PI) / 180;
    const controlledLeviathan = state.controlledLeviathan;
    const isControlledActive =
      controlledLeviathan && !state.spectatorMode && controlledLeviathan.status !== "CONTAINED";
    const rangeRadiusPx = mapUnitsToPixels(KAIJU_ATTACK_RANGE_UNITS);

    if (isControlledActive && rangeRadiusPx > 0) {
      const controlledPoint = gameToPixel(controlledLeviathan.x, controlledLeviathan.y);
      if (controlledPoint) {
        ctx.beginPath();
        ctx.arc(controlledPoint.x, controlledPoint.y, rangeRadiusPx, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 143, 63, 0.7)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([7, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "rgba(255, 143, 63, 0.09)";
        ctx.beginPath();
        ctx.arc(controlledPoint.x, controlledPoint.y, rangeRadiusPx, 0, Math.PI * 2);
        ctx.fill();
      }
    }

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

    updateRenderedLeviathanPositions();
    Object.values(state.renderLeviathansById).forEach((leviathan) => {
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

      const headingRadians = ((leviathan.heading || 0) * Math.PI) / 180;
      const headingLineLength = 16;
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(
        point.x + Math.cos(headingRadians) * headingLineLength,
        point.y + Math.sin(headingRadians) * headingLineLength
      );
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.65;
      ctx.stroke();
      ctx.globalAlpha = 1;

      const hpFraction = leviathan.hpMax > 0 ? leviathan.hp / leviathan.hpMax : 0;
      ctx.fillStyle = "rgba(4, 10, 12, 0.84)";
      ctx.fillRect(point.x - 14, point.y + 8, 28, 3);
      ctx.fillStyle = hpFraction > 0.5 ? "#84ffc5" : hpFraction > 0.25 ? "#ff8f3f" : "#ff4f59";
      ctx.fillRect(point.x - 14, point.y + 8, 28 * hpFraction, 3);

      const label = String(leviathan.name || "KAIJU").trim().toUpperCase();
      ctx.fillStyle = color;
      ctx.font = "9px 'Trebuchet MS', sans-serif";
      ctx.textAlign = "center";
      ctx.shadowColor = color;
      ctx.shadowBlur = 4;
      ctx.fillText(label.slice(0, 12), point.x, point.y + 19);
      ctx.shadowBlur = 0;
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
    if (state.phase !== "ACTIVE") {
      setMode("LOBBY", "alert", "Waiting for commander to start the match.");
      setPrimaryAlert("Pre-match lobby active.", "alert");
      setDirectionalButtonsDisabled(true);
      attackButtonEl.disabled = true;
      abilityButtonEl.disabled = true;
      return;
    }

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
      if (mapAttackHintEl) {
        mapAttackHintEl.textContent = "Join a match to enable map-click attacks.";
      }
      setDirectionalButtonsDisabled(true);
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
    setDirectionalButtonsDisabled(!canAct);

    if (state.spectatorMode) {
      resetDirectionalInput();
      setMode("SPECTATOR", "alert", "Inputs are locked. Monitoring commander telemetry.");
      setPrimaryAlert("SPECTATOR MODE: observe and await next deployment.", "alert");
      if (mapAttackHintEl) {
        mapAttackHintEl.textContent = "Spectator mode: map attack input is disabled.";
      }
    } else if (leviathan.status === "CONTAINED") {
      resetDirectionalInput();
      setMode("CONTAINED", "critical", "Continue before countdown reaches zero.");
      setPrimaryAlert("CONTAINMENT BREACH: continue required to respawn.", "critical");
      if (mapAttackHintEl) {
        mapAttackHintEl.textContent = "Contained: continue to re-enable map attack controls.";
      }
    } else {
      setMode("ACTIVE", "nominal", "Combat controls online.");
      setPrimaryAlert("TACTICAL PRIORITY: pressure city base while evading assets.", "nominal");
      if (mapAttackHintEl) {
        const now = Date.now();
        const attackReady = now >= state.cooldownReadyAt.attack;
        mapAttackHintEl.textContent = attackReady
          ? "Click anywhere on the map to attack the city." 
          : `Attack cooling: ${((state.cooldownReadyAt.attack - now) / 1000).toFixed(1)}s`;
      }
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
    updateDirectionalMovement(Date.now());
    renderStatus();
    if (state.spectatorMapReady) {
      drawSpectatorMap();
    }
    renderCooldowns();
    renderContinueOverlay();
    renderSpectatorPanel();
    uiTickHandle = window.requestAnimationFrame(uiTick);
  }

  function bindRoom(room) {
    state.room = room;
    persistRoomSession(room);
    state.previousHp = 0;
    state.spectatorMode = false;
    state.gameOverAnnounced = false;

    if (room.state?.metadata?.state) {
      state.phase = room.state.metadata.state;
    }
    updatePhaseUi();

    room.onStateChange(() => {
      if (room.state?.metadata?.state) {
        state.phase = room.state.metadata.state;
      }
      state.controlledLeviathan = findControlledLeviathan();
      updateSpectatorMapState();
      updatePhaseUi();
    });

    room.onMessage("match.phase", (payload) => {
      if (!payload?.phase) {
        return;
      }

      state.phase = payload.phase;
      updatePhaseUi();
    });

    room.onMessage("signal.feed", (payload) => {
      appendFeed(payload.message, payload.severity, payload.timestamp);
    });

    room.onMessage("match.start", (payload) => {
      state.phase = "ACTIVE";
      updatePhaseUi();
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
      storeReconnectToken(payload.reconnectToken);
      appendFeed("Reconnect token issued", "nominal", Date.now());
    });

    room.onLeave(() => {
      updateConnectionState("OFFLINE", "critical");
    });

    state.controlledLeviathan = findControlledLeviathan();
    updatePhaseUi();
    updateConnectionState(`ONLINE ROOM ${room.id}`, "nominal");
  }

  async function reconnectActiveMatch() {
    const selectedRoomId = roomIdEl.value;
    if (!selectedRoomId) {
      routeUpstream(true);
      return;
    }

    updateConnectionState("CONNECTING", "alert");

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const endpoint = `${wsProtocol}//${window.location.host}`;
    const client = new window.Colyseus.Client(endpoint);

    const playerName = (pilotNameEl.value || "Kaiju Pilot").trim();
    const reconnectToken =
      (window.KaijuSession && window.KaijuSession.getReconnectionToken()) || readStoredReconnectToken();

    if (!reconnectToken) {
      routeUpstream(false);
      return;
    }

    const room = await client.join("match", selectedRoomId, {
      playerName: playerName,
      playerRole: "kaiju",
      reconnectToken,
    });
    bindRoom(room);
  }

  function flushQueuedMove() {
    state.queuedMoveTimer = 0;
    if (!state.queuedMoveVector) {
      return;
    }

    const vector = state.queuedMoveVector;
    state.queuedMoveVector = null;
    sendMoveVector(vector.x, vector.y);
  }

  function buildDirectionalVector() {
    const keyboardX = (state.pressedDirections.right ? 1 : 0) - (state.pressedDirections.left ? 1 : 0);
    const keyboardY = (state.pressedDirections.down ? 1 : 0) - (state.pressedDirections.up ? 1 : 0);
    const gamepad = getGamepadDirectionalVector();

    const x = keyboardX + gamepad.x;
    const y = keyboardY + gamepad.y;
    return { x, y };
  }

  function applyInputCurve(vector) {
    const magnitude = Math.hypot(vector.x, vector.y);
    if (magnitude <= 0.0001) {
      return { x: 0, y: 0 };
    }

    const deadzone = state.inputSettings.deadzone;
    if (magnitude <= deadzone) {
      return { x: 0, y: 0 };
    }

    const normalizedX = vector.x / magnitude;
    const normalizedY = vector.y / magnitude;
    const postDeadzone = clamp((magnitude - deadzone) / (1 - deadzone), 0, 1);
    const curvedMagnitude = Math.pow(postDeadzone, state.inputSettings.sensitivity);

    return {
      x: normalizedX * curvedMagnitude,
      y: normalizedY * curvedMagnitude,
    };
  }

  function moveTowardVector(current, target, maxDelta) {
    const dx = target.x - current.x;
    const dy = target.y - current.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 0.0001 || distance <= maxDelta) {
      return { x: target.x, y: target.y };
    }

    const inv = maxDelta / distance;
    return {
      x: current.x + dx * inv,
      y: current.y + dy * inv,
    };
  }

  function getGamepadDirectionalVector() {
    if (!navigator.getGamepads) {
      return { x: 0, y: 0 };
    }

    const pads = navigator.getGamepads();
    if (!pads) {
      return { x: 0, y: 0 };
    }

    for (let i = 0; i < pads.length; i++) {
      const pad = pads[i];
      if (!pad || !pad.connected) {
        continue;
      }

      const axisX = Number.isFinite(pad.axes[0]) ? pad.axes[0] : 0;
      const axisY = Number.isFinite(pad.axes[1]) ? pad.axes[1] : 0;
      if (Math.abs(axisX) < 0.01 && Math.abs(axisY) < 0.01) {
        continue;
      }

      return { x: axisX, y: axisY };
    }

    return { x: 0, y: 0 };
  }

  function normalizeMovementVector(vector) {
    if (!vector) {
      return { x: 0, y: 0 };
    }

    const magnitude = Math.hypot(vector.x, vector.y);
    if (magnitude <= 0.0001) {
      return { x: 0, y: 0 };
    }

    return {
      x: vector.x / magnitude,
      y: vector.y / magnitude,
    };
  }

  function hasMeaningfulVectorDelta(nextVector) {
    if (!state.lastMoveVector) {
      return true;
    }

    const dx = Math.abs(state.lastMoveVector.x - nextVector.x);
    const dy = Math.abs(state.lastMoveVector.y - nextVector.y);
    return dx > 0.01 || dy > 0.01;
  }

  function setDirectionalButtonsDisabled(disabled) {
    [moveUpButtonEl, moveLeftButtonEl, moveDownButtonEl, moveRightButtonEl].forEach((buttonEl) => {
      if (buttonEl) {
        buttonEl.disabled = disabled;
      }
    });
  }

  function resetDirectionalInput() {
    state.pressedDirections.up = false;
    state.pressedDirections.down = false;
    state.pressedDirections.left = false;
    state.pressedDirections.right = false;
    state.directionalButtonsPressed.up = false;
    state.directionalButtonsPressed.down = false;
    state.directionalButtonsPressed.left = false;
    state.directionalButtonsPressed.right = false;
    state.queuedMoveVector = null;
    state.smoothedMoveVector = { x: 0, y: 0 };
    state.lastInputFrameAt = 0;

    if (state.queuedMoveTimer) {
      window.clearTimeout(state.queuedMoveTimer);
      state.queuedMoveTimer = 0;
    }

    if (state.lastMoveVector) {
      state.lastMoveVector = null;
      if (state.room) {
        state.room.send("kaiju.move", { moveX: 0, moveY: 0 });
        state.lastMoveSentAt = Date.now();
      }
    }
  }

  function canSendDirectionalInput() {
    const leviathan = state.controlledLeviathan;
    if (!state.room || !leviathan || state.spectatorMode || leviathan.status === "CONTAINED") {
      return false;
    }

    return true;
  }

  function sendMoveVector(nextX, nextY) {
    if (!canSendDirectionalInput()) {
      return;
    }

    const nextVector = normalizeMovementVector({ x: nextX, y: nextY });
    if (!hasMeaningfulVectorDelta(nextVector)) {
      return;
    }

    const now = Date.now();
    const elapsed = now - state.lastMoveSentAt;
    if (elapsed < MOVE_SEND_INTERVAL_MS) {
      state.queuedMoveVector = nextVector;
      if (!state.queuedMoveTimer) {
        state.queuedMoveTimer = window.setTimeout(
          flushQueuedMove,
          MOVE_SEND_INTERVAL_MS - elapsed
        );
      }
      return;
    }

    state.room.send("kaiju.move", {
      moveX: Number(nextVector.x.toFixed(4)),
      moveY: Number(nextVector.y.toFixed(4)),
    });
    state.lastMoveSentAt = now;
    state.lastMoveVector = nextVector;
  }

  function updateDirectionalMovement(now) {
    const frameNow = typeof now === "number" ? now : Date.now();
    if (!canSendDirectionalInput()) {
      return;
    }

    const rawVector = normalizeMovementVector(buildDirectionalVector());
    const targetVector = applyInputCurve(rawVector);

    if (!state.lastInputFrameAt) {
      state.lastInputFrameAt = frameNow;
    }

    const deltaSeconds = clamp((frameNow - state.lastInputFrameAt) / 1000, 0, 0.05);
    state.lastInputFrameAt = frameNow;

    const currentMagnitude = Math.hypot(state.smoothedMoveVector.x, state.smoothedMoveVector.y);
    const targetMagnitude = Math.hypot(targetVector.x, targetVector.y);
    const responseRate = targetMagnitude > currentMagnitude ? MOVE_ACCEL_PER_SECOND : MOVE_DECEL_PER_SECOND;
    const maxDelta = responseRate * deltaSeconds;

    state.smoothedMoveVector = moveTowardVector(state.smoothedMoveVector, targetVector, maxDelta);
    sendMoveVector(state.smoothedMoveVector.x, state.smoothedMoveVector.y);
  }

  function handleDirectionalButtonState(direction, isPressed) {
    if (!(direction in state.pressedDirections)) {
      return;
    }

    state.directionalButtonsPressed[direction] = isPressed;
    state.pressedDirections[direction] = isPressed;
    updateDirectionalMovement(Date.now());
  }

  function bindDirectionalButton(buttonEl, direction) {
    if (!buttonEl) {
      return;
    }

    const onPress = (event) => {
      event.preventDefault();
      handleDirectionalButtonState(direction, true);
    };

    const onRelease = (event) => {
      event.preventDefault();
      handleDirectionalButtonState(direction, false);
    };

    buttonEl.addEventListener("pointerdown", onPress);
    buttonEl.addEventListener("pointerup", onRelease);
    buttonEl.addEventListener("pointercancel", onRelease);
    buttonEl.addEventListener("pointerleave", onRelease);
    buttonEl.addEventListener("click", (event) => {
      event.preventDefault();
      updateDirectionalMovement();
    });
  }

  function bindDirectionalKeyboardControls() {
    window.addEventListener("keydown", (event) => {
      const direction = MOVE_INPUT_BY_KEY[event.code];
      if (!direction) {
        return;
      }

      event.preventDefault();
      if (state.pressedDirections[direction]) {
        return;
      }

      state.pressedDirections[direction] = true;
      updateDirectionalMovement(Date.now());
    });

    window.addEventListener("keyup", (event) => {
      const direction = MOVE_INPUT_BY_KEY[event.code];
      if (!direction) {
        return;
      }

      event.preventDefault();
      state.pressedDirections[direction] = Boolean(state.directionalButtonsPressed[direction]);
      updateDirectionalMovement(Date.now());
    });

    window.addEventListener("blur", () => {
      resetDirectionalInput();
    });
  }

  function sendAttack() {
    const leviathan = state.controlledLeviathan;
    if (
      !state.room ||
      !leviathan ||
      state.spectatorMode ||
      leviathan.status === "CONTAINED" ||
      Date.now() < state.cooldownReadyAt.attack
    ) {
      return;
    }

    state.room.send("kaiju.attack", {});
    state.cooldownReadyAt.attack = Date.now() + ATTACK_COOLDOWN_MS;
    appendFeed("Attack dispatched", "alert", Date.now());
  }

  function sendMapAttack(event) {
    if (!spectatorLeafletMapEl || !event.target) {
      return;
    }

    const targetElement = event.target;
    const clickedMap =
      targetElement === spectatorLeafletMapEl ||
      (typeof targetElement.closest === "function" && targetElement.closest("#spectatorLeafletMap"));

    if (!clickedMap) {
      return;
    }

    if (mapClickLayerEl && typeof event.offsetX === "number" && typeof event.offsetY === "number") {
      const pingEl = document.createElement("span");
      pingEl.className = "map-click-ping";
      pingEl.style.left = `${event.offsetX}px`;
      pingEl.style.top = `${event.offsetY}px`;
      mapClickLayerEl.appendChild(pingEl);
      window.setTimeout(() => {
        pingEl.remove();
      }, 540);
    }

    sendAttack();
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

    bindDirectionalButton(moveUpButtonEl, "up");
    bindDirectionalButton(moveLeftButtonEl, "left");
    bindDirectionalButton(moveDownButtonEl, "down");
    bindDirectionalButton(moveRightButtonEl, "right");
    bindDirectionalKeyboardControls();
    window.addEventListener("gamepadconnected", (event) => {
      appendFeed(`GAMEPAD CONNECTED :: ${event.gamepad.id}`, "nominal", Date.now());
    });
    window.addEventListener("gamepaddisconnected", (event) => {
      appendFeed(`GAMEPAD DISCONNECTED :: ${event.gamepad.id}`, "alert", Date.now());
    });
    attackButtonEl.addEventListener("click", sendAttack);
    if (spectatorLeafletMapEl) {
      spectatorLeafletMapEl.addEventListener("click", sendMapAttack);
    }
    abilityButtonEl.addEventListener("click", sendAbility);
    continueButtonEl.addEventListener("click", sendContinue);
    if (hudOpacityControlEl) {
      hudOpacityControlEl.addEventListener("input", (event) => {
        const value = Number(event.target?.value ?? 90);
        const opacity = clamp(value / 100, 0.35, 0.95);
        state.hudSettings.opacity = opacity;
        applyHudOpacity(opacity);
        storeHudSettings(state.hudSettings);
      });
    }

    window.addEventListener("beforeunload", () => {
      if (uiTickHandle) {
        window.cancelAnimationFrame(uiTickHandle);
      }
    });
  }

  async function initialize() {
    updateConnectionState("OFFLINE", "critical");
    state.inputSettings = readInputSettings();
    state.hudSettings = readHudSettings();
    storeInputSettings(state.inputSettings);
    storeHudSettings(state.hudSettings);
    applyHudOpacity(state.hudSettings.opacity);

    wireEvents();
    preloadCoinAudioFallback();
    initializeSpectatorMap();
    resizeSpectatorMap();
    window.addEventListener("resize", resizeSpectatorMap);

    const entrySession = window.KaijuSession ? window.KaijuSession.getEntrySession() : null;
    if (entrySession?.playerName) {
      pilotNameEl.value = entrySession.playerName;
    }

    const activeMatchSession =
      window.KaijuSession && typeof window.KaijuSession.getActiveMatchSession === "function"
        ? window.KaijuSession.getActiveMatchSession()
        : null;

    if (activeMatchSession?.playerName) {
      pilotNameEl.value = activeMatchSession.playerName;
    }

    const currentMatchId =
      (window.KaijuSession ? window.KaijuSession.getCurrentMatchId() : "") || activeMatchSession?.roomId || "";
    const reconnectToken =
      (window.KaijuSession ? window.KaijuSession.getReconnectionToken() : "") ||
      activeMatchSession?.reconnectToken ||
      readStoredReconnectToken();

    if (currentMatchId) {
      roomIdEl.value = currentMatchId;
    }

    if (currentMatchId && reconnectToken) {
      try {
        await reconnectActiveMatch();
      } catch (error) {
        appendFeed(`RECONNECT FAILED: ${formatError(error)}`, "critical", Date.now());
        routeUpstream(true);
        return;
      }
    } else {
      routeUpstream(!currentMatchId);
      return;
    }

    updatePhaseUi();
    uiTick();
  }

  initialize().catch((error) => {
    appendFeed(`INIT ERROR: ${formatError(error)}`, "critical", Date.now());
  });
})();
