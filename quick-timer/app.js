// Quick Timer — Meta Display Glasses webapp
// Preset countdowns (1/2/5/10/15 min) + custom picker. D-pad + Enter.

(function () {
  'use strict';

  var RING_CIRC = 2 * Math.PI * 110; // r=110

  var state = {
    screen: 'pick',
    totalMs: 0,
    remainingMs: 0,
    running: false,
    targetEndAt: 0,
    tick: null,
    lastText: '',
    audioCtx: null,
    custom: { min: 5, sec: 0, focusUnit: 'min' },
  };

  var screens = {};

  function collectScreens() {
    document.querySelectorAll('.screen').forEach(function (s) {
      if (s.id) screens[s.id] = s;
    });
  }

  // ==================== NAVIGATION ====================
  function show(screenId) {
    Object.values(screens).forEach(function (s) { s.classList.add('hidden'); });
    screens[screenId].classList.remove('hidden');
    state.screen = screenId;
    focusFirst(screens[screenId]);
  }

  function focusFirst(container) {
    var el = container.querySelector('.focusable:not([disabled]):not(.hidden)');
    if (el) el.focus();
  }

  function moveFocus(direction) {
    var container = screens[state.screen];
    if (!container) return;
    var focusables = Array.from(
      container.querySelectorAll('.focusable:not([disabled]):not(.hidden)')
    );
    if (focusables.length === 0) return;
    var idx = focusables.indexOf(document.activeElement);
    if (idx === -1) { focusFirst(container); return; }

    // On the pick grid (3 columns), up/down jump a row.
    if (state.screen === 'pick') {
      var cols = 3;
      var next = idx;
      if (direction === 'left') next = idx - 1;
      else if (direction === 'right') next = idx + 1;
      else if (direction === 'up') next = idx - cols;
      else if (direction === 'down') next = idx + cols;
      if (next >= 0 && next < focusables.length) focusables[next].focus();
      return;
    }

    var nextIdx;
    if (direction === 'up' || direction === 'left') {
      nextIdx = idx > 0 ? idx - 1 : focusables.length - 1;
    } else {
      nextIdx = idx < focusables.length - 1 ? idx + 1 : 0;
    }
    focusables[nextIdx].focus();
  }

  // ==================== TIMER ====================
  function startCountdown(ms) {
    state.totalMs = ms;
    state.remainingMs = ms;
    state.running = true;
    state.targetEndAt = Date.now() + ms;
    document.body.classList.remove('done');
    show('run');
    renderTimer(true);
    renderRing();
    updateToggleLabel();
    if (state.tick) clearInterval(state.tick);
    state.tick = setInterval(onTick, 100);
    // Prime audio so the end beep is allowed on the glasses.
    primeAudio();
  }

  function onTick() {
    var remaining = Math.max(0, state.targetEndAt - Date.now());
    state.remainingMs = remaining;
    renderTimer(false);
    renderRing();
    if (remaining <= 0) finish();
  }

  function finish() {
    clearInterval(state.tick);
    state.tick = null;
    state.running = false;
    document.body.classList.add('done');
    beep();
  }

  function pause() {
    if (!state.running) return;
    state.running = false;
    clearInterval(state.tick);
    state.tick = null;
    state.remainingMs = Math.max(0, state.targetEndAt - Date.now());
    updateToggleLabel();
  }

  function resume() {
    if (state.running || state.remainingMs <= 0) return;
    state.running = true;
    state.targetEndAt = Date.now() + state.remainingMs;
    state.tick = setInterval(onTick, 100);
    updateToggleLabel();
  }

  function toggle() {
    if (state.running) pause();
    else resume();
  }

  function reset() {
    // Restart the current timer from its full duration.
    if (state.totalMs <= 0) return;
    startCountdown(state.totalMs);
  }

  function backToPick() {
    if (state.tick) { clearInterval(state.tick); state.tick = null; }
    state.running = false;
    document.body.classList.remove('done');
    show('pick');
  }

  // ==================== RENDER ====================
  function formatMMSS(ms) {
    var totalSec = Math.ceil(ms / 1000);
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    return pad(m) + ':' + pad(s);
  }

  function renderTimer(force) {
    var text = formatMMSS(state.remainingMs);
    if (!force && text === state.lastText) return;
    state.lastText = text;
    document.getElementById('timer-display').textContent = text;
  }

  function renderRing() {
    var frac = state.totalMs > 0 ? state.remainingMs / state.totalMs : 0;
    var offset = RING_CIRC * (1 - frac);
    document.getElementById('ring-progress').style.strokeDashoffset = offset;
  }

  function updateToggleLabel() {
    document.getElementById('toggle-btn').textContent = state.running ? 'Pause' : 'Resume';
  }

  // ==================== CUSTOM PICKER ====================
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function renderCustom() {
    document.getElementById('min-value').textContent = pad2(state.custom.min);
    document.getElementById('sec-value').textContent = pad2(state.custom.sec);
  }

  function adjustCustom(delta) {
    var unit = state.custom.focusUnit;
    if (unit === 'min') {
      state.custom.min = (state.custom.min + delta + 60) % 60;
    } else {
      state.custom.sec = (state.custom.sec + delta * 5 + 60) % 60;
    }
    renderCustom();
  }

  function customTotalMs() {
    return (state.custom.min * 60 + state.custom.sec) * 1000;
  }

  function focusCustomUnit(unit) {
    state.custom.focusUnit = unit;
    var id = unit === 'min' ? 'wheel-min' : 'wheel-sec';
    document.getElementById(id).focus();
  }

  // ==================== AUDIO ====================
  function primeAudio() {
    try {
      if (!state.audioCtx) {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) state.audioCtx = new Ctx();
      }
      if (state.audioCtx && state.audioCtx.state === 'suspended') {
        state.audioCtx.resume();
      }
    } catch (e) { /* ignore */ }
  }

  function beep() {
    try {
      primeAudio();
      var ctx = state.audioCtx;
      if (!ctx) return;
      // Three short rising dings.
      [0, 0.25, 0.5].forEach(function (t, i) {
        var now = ctx.currentTime + t;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660 + i * 220, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.4, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      });
    } catch (e) { /* ignore */ }
  }

  // ==================== ACTIONS ====================
  function handleAction(action) {
    switch (action) {
      case 'custom':
        show('custom');
        renderCustom();
        focusCustomUnit('min');
        break;
      case 'start-custom':
        if (customTotalMs() > 0) startCountdown(customTotalMs());
        break;
      case 'toggle': toggle(); break;
      case 'reset': reset(); break;
      case 'back': backToPick(); break;
    }
  }

  // ==================== EVENTS ====================
  function setupEvents() {
    document.addEventListener('click', function (e) {
      var presetEl = e.target.closest('[data-seconds]');
      if (presetEl) {
        startCountdown(parseInt(presetEl.dataset.seconds, 10) * 1000);
        return;
      }
      var actionEl = e.target.closest('[data-action]');
      if (actionEl) handleAction(actionEl.dataset.action);
    });

    document.addEventListener('keydown', function (e) {
      // Custom screen: wheels handle up/down/left/right specially.
      if (state.screen === 'custom') {
        var onWheel = document.activeElement &&
          document.activeElement.classList.contains('wheel');
        if (onWheel) {
          if (e.key === 'ArrowUp')   { adjustCustom(1);  e.preventDefault(); return; }
          if (e.key === 'ArrowDown') { adjustCustom(-1); e.preventDefault(); return; }
          if (e.key === 'ArrowLeft')  { focusCustomUnit('min'); e.preventDefault(); return; }
          if (e.key === 'ArrowRight') { focusCustomUnit('sec'); e.preventDefault(); return; }
          if (e.key === 'Enter')      { handleAction('start-custom'); e.preventDefault(); return; }
        }
      }

      switch (e.key) {
        case 'ArrowUp':    moveFocus('up');    e.preventDefault(); break;
        case 'ArrowDown':  moveFocus('down');  e.preventDefault(); break;
        case 'ArrowLeft':  moveFocus('left');  e.preventDefault(); break;
        case 'ArrowRight': moveFocus('right'); e.preventDefault(); break;
        case 'Enter':
          if (document.activeElement &&
              document.activeElement.classList.contains('focusable')) {
            document.activeElement.click();
          }
          e.preventDefault();
          break;
      }
    });
  }

  // ==================== INIT ====================
  function init() {
    collectScreens();
    setupEvents();
    show('pick');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
