(function attachLobbySlotControls(global) {
  function toSafeNumber(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function deriveSlotButtonState(room, isBusy) {
    const metadata = room && room.metadata ? room.metadata : {};
    const commanderTaken = Boolean(metadata.commanderTaken);
    const kaijuOpenSlots = Math.max(0, toSafeNumber(metadata.kaijuOpenSlots));
    const busy = Boolean(isBusy);

    return {
      commanderAvailable: !commanderTaken,
      kaijuOpenSlots,
      kaijuAvailable: kaijuOpenSlots > 0,
      joinCommanderDisabled: busy || commanderTaken,
      joinKaijuDisabled: busy || kaijuOpenSlots <= 0,
    };
  }

  global.KaijuLobbySlots = {
    deriveSlotButtonState,
  };
})(window);
