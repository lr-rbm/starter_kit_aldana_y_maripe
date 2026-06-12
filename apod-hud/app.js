// APOD HUD — NASA's Astronomy Picture of the Day, sized for the 600×600 lens.
//
// Controls (D-pad + Enter, with mouse as an additive convenience):
//   ◀ ▶  step one day back / forward (never past today)
//   ▲    toggle the info overlay (title + explanation)
//   Enter  jump to a random day from the archive
//
// Data comes from our own /api/apod proxy so the NASA key never hits the client.

const API = "/api/apod";
const TYPE_MSG = "TUNING INTO DEEP SPACE";

// APOD's archive starts 1995-06-16; we never page before it or after today.
const FIRST_DAY = "1995-06-16";

const els = {
  media: document.getElementById("media"),
  loadingSlot: document.getElementById("loadingSlot"),
  errorSlot: document.getElementById("errorSlot"),
  typeText: document.getElementById("typeText"),
  retryBtn: document.getElementById("retryBtn"),
  videoBadge: document.getElementById("videoBadge"),
  info: document.getElementById("info"),
  infoDate: document.getElementById("infoDate"),
  infoTitle: document.getElementById("infoTitle"),
  infoExplain: document.getElementById("infoExplain"),
  infoCopyright: document.getElementById("infoCopyright"),
  mediaScrim: document.getElementById("mediaScrim"),
  miniTitle: document.getElementById("miniTitle"),
  dateChip: document.getElementById("dateChip"),
  hints: document.getElementById("hints"),
  prevHint: document.getElementById("prevHint"),
  nextHint: document.getElementById("nextHint"),
  infoHint: document.getElementById("infoHint"),
  randomHint: document.getElementById("randomHint"),
  pickHint: document.getElementById("pickHint"),
  todayBtn: document.getElementById("todayBtn"),
  holdToast: document.getElementById("holdToast"),
  holdLabel: document.getElementById("holdLabel"),
  picker: document.getElementById("picker"),
  pickYear: document.getElementById("pickYear"),
  pickMonth: document.getElementById("pickMonth"),
  pickDay: document.getElementById("pickDay"),
  pickerCols: document.querySelectorAll(".picker-col"),
};

// state
let currentDate = todayISO();   // YYYY-MM-DD of the entry on screen
let infoOpen = false;
let loading = false;
let errored = false;   // true while the error screen is up
let mediaToken = 0;    // bumped each load so a stale image can't reveal late
let pickerOpen = false;

function todayISO() {
  // NASA serves in US Eastern; using the local date is close enough and avoids
  // requesting "tomorrow" (which 404s). If today's not up yet, the proxy 404s
  // and we fall back a day.
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(iso, days) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function prettyDate(iso) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC", year: "numeric", month: "short", day: "numeric",
  });
}

// ---- typewriter loading text ----
let typeTimer = null;
function setTypeMsg(msg) {
  clearInterval(typeTimer);
  let i = 0;
  els.typeText.textContent = "";
  typeTimer = setInterval(() => {
    els.typeText.textContent = msg.slice(0, ++i);
    if (i >= msg.length) clearInterval(typeTimer);
  }, 55);
}

// ---- view helpers ----
function showLoading() {
  loading = true;
  errored = false;
  els.loadingSlot.hidden = false;
  els.errorSlot.hidden = true;
  els.hints.hidden = true;
  setTypeMsg(TYPE_MSG);
}

function showError() {
  loading = false;
  errored = true;
  clearInterval(typeTimer);
  els.loadingSlot.hidden = true;
  els.errorSlot.hidden = false;
  els.dateChip.hidden = true;
  els.hints.hidden = true;
  // drop any stale day still on screen so error stands alone
  infoOpen = false;
  els.info.hidden = true;
  els.miniTitle.hidden = true;
  els.media.classList.remove("is-loaded");
  els.mediaScrim.classList.remove("is-on");
}

function render(data) {
  errored = false;
  els.errorSlot.hidden = true;

  currentDate = data.date || currentDate;
  targetDate = currentDate;   // random picks the day server-side; resync steering

  const isVideo = data.media_type === "video";
  const imgUrl = imageUrlFor(data);

  els.videoBadge.hidden = !isVideo;

  // Token guards against a slow image landing after the user already moved on.
  const token = ++mediaToken;
  const reveal = () => {
    if (token !== mediaToken) return;          // a newer load superseded us
    loading = false;
    clearInterval(typeTimer);
    els.loadingSlot.hidden = true;
    els.media.classList.add("is-loaded");
    els.mediaScrim.classList.add("is-on");
    // chrome appears together with the picture, not over the black loader
    els.dateChip.hidden = false;
    els.hints.hidden = false;
    els.miniTitle.hidden = infoOpen;
    updateTodayAffordance();
    if (isVideo && !infoOpen) toggleInfo(true);
  };

  if (imgUrl) {
    // Keep the loader up while the image downloads, so the lens isn't just
    // black. Swap the message from "tuning in" to "developing".
    setTypeMsg("DOWNLINKING IMAGE");
    // Safety: if the image stalls, reveal anyway so we never stick on "developing".
    const safety = setTimeout(reveal, 6000);
    const revealOnce = () => { clearTimeout(safety); reveal(); };
    els.media.onload = revealOnce;
    els.media.onerror = revealOnce;
    els.media.src = imgUrl;
    // If it was prefetched/cached, `complete` is already true and onload may not
    // fire again — reveal right away for an instant transition.
    if (els.media.complete && els.media.naturalWidth > 0) revealOnce();
  } else {
    // video with no thumbnail — leave the lens black, info still tells the story
    els.media.removeAttribute("src");
    reveal();
  }

  const title = data.title || "Untitled";
  els.infoDate.textContent = prettyDate(currentDate);
  els.infoTitle.textContent = title;
  els.infoExplain.textContent = data.explanation || "";
  els.infoCopyright.textContent = data.copyright
    ? `© ${data.copyright.replace(/\s+/g, " ").trim()}`
    : "NASA / Public domain";
  els.miniTitle.textContent = title;
  // visibility + chip text/affordance handled by reveal() -> updateTodayAffordance()
}

// Reflect whether we're on today: the ▶ key dims (no future), and the TODAY
// pill appears as the way back.
function updateTodayAffordance() {
  const onToday = currentDate >= todayISO();
  els.dateChip.textContent = prettyDate(currentDate);
  els.nextHint.classList.toggle("is-disabled", onToday);
  els.todayBtn.hidden = onToday;
}

function toggleInfo(force) {
  infoOpen = typeof force === "boolean" ? force : !infoOpen;
  els.info.hidden = !infoOpen;
  // mini-title and full panel are mutually exclusive
  els.miniTitle.hidden = infoOpen || !els.media.classList.contains("is-loaded");
  if (infoOpen) els.info.scrollTop = 0;
}

const SCROLL_STEP = 120;

// ▲ : open the info, or scroll the open panel up. Stays open at the top.
function infoUp() {
  if (errored) return;
  if (!infoOpen) { toggleInfo(true); return; }
  els.info.scrollTop = Math.max(0, els.info.scrollTop - SCROLL_STEP);
}

// ▼ : scroll the open panel down; once at the bottom, ▼ closes it (mirrors ▲).
function infoDown() {
  if (errored) return;
  if (!infoOpen) return;   // closed already — nothing to do
  const atBottom = els.info.scrollTop + els.info.clientHeight >= els.info.scrollHeight - 2;
  if (atBottom) toggleInfo(false);
  else els.info.scrollTop += SCROLL_STEP;
}

function clearMedia() {
  els.media.classList.remove("is-loaded");
  els.mediaScrim.classList.remove("is-on");
  els.videoBadge.hidden = true;
  els.miniTitle.hidden = true;
  // close the info panel when leaving an image — navigating with it open looks odd
  if (infoOpen) toggleInfo(false);
}

// ---- fetching ----
// A new load supersedes any in-flight one (a slow image must never wedge the
// app), so we never early-return on `loading`; instead each load takes a token
// and a stale load's result is dropped.
let loadToken = 0;

// Cache day payloads (and warm the browser's image cache) so navigating to an
// already-prefetched neighbour is instant.
const dayCache = new Map();    // "YYYY-MM-DD" -> apod payload (resolved)
const inflight = new Map();     // "YYYY-MM-DD" -> Promise (request in progress)

// Fetch one day's payload. Resolves from cache, joins an in-flight request for
// the same day, or starts a new one — so a fast sweep never double-fetches a
// day whose request hasn't landed yet.
function fetchDay(date) {
  if (date && dayCache.has(date)) return Promise.resolve(dayCache.get(date));
  if (date && inflight.has(date)) return inflight.get(date);

  const qs = date ? `?date=${date}` : "";
  const p = (async () => {
    const res = await fetch(`${API}${qs}`, { cache: "no-store" });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    if (!data || data.error) throw new Error("bad payload");
    if (data.date) dayCache.set(data.date, data);
    return data;
  })();

  if (date) {
    inflight.set(date, p);
    p.finally(() => { if (inflight.get(date) === p) inflight.delete(date); });
  }
  return p;
}

// Pick the standard-resolution image (small, lens-sized) for a payload.
function imageUrlFor(data) {
  if (data.media_type === "video") return data.thumbnail_url || "";
  return data.url || data.hdurl || "";
}

// Retain prefetched <img> objects so the browser doesn't garbage-collect them
// mid-download (which would abort the request and defeat the prefetch).
const warmImages = new Map();   // url -> Image

// Warm neighbours of `date` so ◀/▶ land instantly. `dir` is the direction the
// user is moving (-1 = into the past, +1 = toward today, 0 = no recent move):
// we look 2 days ahead in that direction plus 1 day behind, so a fast sweep
// keeps its lead instead of catching up only after the user stops.
// Best-effort and UI-silent; retries once since NASA occasionally 503s.
function prefetchAround(date, dir = 0) {
  const today = todayISO();
  // candidate offsets, ordered by priority (the way you're heading first)
  const offsets = dir < 0 ? [-1, -2, 1]
                : dir > 0 ? [1, 2, -1]
                : [-1, 1];
  for (const off of offsets) {
    const d = shiftDate(date, off);
    if (d < FIRST_DAY || d > today || dayCache.has(d)) continue; // skip OOB & cached
    prefetchDay(d, 2);
  }
}

function prefetchDay(d, attempts) {
  fetchDay(d)
    .then((data) => {
      const url = imageUrlFor(data);
      if (url && !warmImages.has(url)) {
        const img = new Image();
        warmImages.set(url, img);   // keep a reference until it finishes
        img.src = url;
      }
    })
    .catch(() => { if (attempts > 1) setTimeout(() => prefetchDay(d, attempts - 1), 600); });
}

// Remember what the user last asked for, so TRY AGAIN reruns *that* request
// (the date they navigated to) rather than the last day that happened to load.
let lastRequest = { date: currentDate };

async function load({ date, random } = {}) {
  const myToken = ++loadToken;
  const beforeDate = currentDate;   // day on screen before this load, for prefetch direction
  lastRequest = random ? { random: true } : { date };
  clearMedia();
  showLoading();

  try {
    let data;
    if (random) {
      // random can't use the cache (each roll is a different day), so fetch raw
      const res = await fetch(`${API}?random=1`, { cache: "no-store" });
      if (myToken !== loadToken) return;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
      if (!data || data.error) throw new Error("bad payload");
      if (data.date) dayCache.set(data.date, data);
    } else {
      try {
        data = await fetchDay(date);
      } catch (e) {
        // today might not be published yet — fall back one day, once
        if (e.status === 404 && date === todayISO()) {
          if (myToken !== loadToken) return;
          await load({ date: shiftDate(date, -1) });
          return;
        }
        throw e;
      }
    }
    if (myToken !== loadToken) return;   // superseded while fetching
    render(data);

    // Warm the neighbours of the day we just landed on, biased toward the
    // direction of travel. Dropping this after render() (not in reveal) means a
    // fast ◀◀◀ sweep keeps extending its prefetch lead even while images are
    // still painting. dayCache.has() inside prefetchAround dedupes the calls.
    const landed = data.date;
    const dir = landed < beforeDate ? -1 : landed > beforeDate ? 1 : 0;
    prefetchAround(landed, dir);
  } catch (_) {
    if (myToken === loadToken) showError();
  }
}

// ---- navigation ----
// targetDate is the day the user is steering toward; it advances on every tap
// even before the image lands, so rapid ◀/▶ presses step correctly instead of
// all reading the same not-yet-updated currentDate.
let targetDate = currentDate;

function goPrev() {
  if (targetDate <= FIRST_DAY) return;
  targetDate = shiftDate(targetDate, -1);
  load({ date: targetDate });
}

function goNext() {
  if (targetDate >= todayISO()) return; // can't see the future
  targetDate = shiftDate(targetDate, 1);
  load({ date: targetDate });
}

function goRandom() {
  load({ random: true });
}

function goToday() {
  if (targetDate >= todayISO()) return;
  targetDate = todayISO();
  load({ date: targetDate });
}

// ---- date wheel-picker ----
// Opened by holding Enter. Year / Month / Day columns: ◀▶ move column,
// ▲▼ change value, Enter confirms, hold Enter (or click backdrop) cancels.
const PICK_COLS = ["year", "month", "day"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
let pickCol = 0;            // index into PICK_COLS
let pickY = 0, pickM = 0, pickD = 0;   // selected year, month (1-12), day (1-31)

function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }

function clampPickToRange() {
  // keep day valid for the month, then clamp the whole date to [FIRST_DAY, today]
  pickD = Math.min(pickD, daysInMonth(pickY, pickM));
  const iso = `${pickY}-${String(pickM).padStart(2,"0")}-${String(pickD).padStart(2,"0")}`;
  const t = todayISO();
  if (iso < FIRST_DAY) { [pickY, pickM, pickD] = FIRST_DAY.split("-").map(Number); }
  else if (iso > t)    { [pickY, pickM, pickD] = t.split("-").map(Number); }
}

function renderPicker() {
  els.pickYear.textContent = pickY;
  els.pickMonth.textContent = MONTHS[pickM - 1];
  els.pickDay.textContent = pickD;
  els.pickerCols.forEach((c, i) => c.classList.toggle("is-active", i === pickCol));
}

function openPicker() {
  if (pickerOpen) return;
  if (infoOpen) toggleInfo(false);
  [pickY, pickM, pickD] = (currentDate || todayISO()).split("-").map(Number);
  pickCol = 0;
  pickerOpen = true;
  renderPicker();
  els.picker.hidden = false;
}

function closePicker() {
  if (!pickerOpen) return;
  pickerOpen = false;
  els.picker.hidden = true;
}

// adjust the active column by ±1
function pickAdjust(delta) {
  const col = PICK_COLS[pickCol];
  if (col === "year")  pickY += delta;
  if (col === "month") { pickM += delta; if (pickM < 1) pickM = 12; if (pickM > 12) pickM = 1; }
  if (col === "day")   { const dim = daysInMonth(pickY, pickM); pickD += delta; if (pickD < 1) pickD = dim; if (pickD > dim) pickD = 1; }
  clampPickToRange();
  renderPicker();
}
function pickMove(delta) {
  pickCol = (pickCol + delta + PICK_COLS.length) % PICK_COLS.length;
  renderPicker();
}
function pickConfirm() {
  const iso = `${pickY}-${String(pickM).padStart(2,"0")}-${String(pickD).padStart(2,"0")}`;
  closePicker();
  targetDate = iso;
  load({ date: iso });
}

// ---- long-press helper (shared by ▶=today and Enter=pick), with a progress
// toast like the Pokédex apps: after a short tap window a labelled, filling
// chip appears; releasing before HOLD_MS fires the tap action instead. ----
const HOLD_MS = 600;
const TAP_WINDOW = 160;     // below this, it's a tap; the toast only shows after
const downKeys = new Set(); // guards keyboard auto-repeat

function makeHold({ tap, hold, label }) {
  let holdTimer = null, toastTimer = null, fired = false, active = false;
  function start() {
    if (active) return;
    active = true; fired = false;
    toastTimer = setTimeout(() => {
      els.holdLabel.textContent = label;
      els.holdToast.style.setProperty("--hold-fill", (HOLD_MS - TAP_WINDOW) + "ms");
      els.holdToast.hidden = false;
      els.holdToast.classList.add("filling");
    }, TAP_WINDOW);
    holdTimer = setTimeout(() => { active = false; fired = true; endToast(); hold(); }, HOLD_MS);
  }
  function end() {
    clearTimeout(holdTimer); clearTimeout(toastTimer);
    if (!active) { endToast(); return; }   // hold already fired & consumed the press
    active = false;
    endToast();
    if (!fired) tap();
  }
  function cancel() { active = false; clearTimeout(holdTimer); clearTimeout(toastTimer); endToast(); }
  return { start, end, cancel };
}
function endToast() { els.holdToast.hidden = true; els.holdToast.classList.remove("filling"); }

// ▶ : tap = next day, hold = back to today
const rightBtn = makeHold({ tap: goNext, hold: goToday, label: "↩ TODAY" });
// Enter (browsing) : tap = random, hold = open the date picker
const enterBtn = makeHold({ tap: goRandom, hold: openPicker, label: "📅 GO TO DATE" });
// Enter (inside picker) : tap = confirm the date, hold = cancel
const enterBtnPicker = makeHold({ tap: pickConfirm, hold: closePicker, label: "✕ CANCEL" });

// ---- input: D-pad / keyboard ----
document.addEventListener("keydown", (e) => {
  // auto-repeat guard for the keys that drive long-press
  if ((e.key === "ArrowRight" || e.key === "Enter")) {
    if (downKeys.has(e.key)) { e.preventDefault(); return; }
    downKeys.add(e.key);
  }

  if (pickerOpen) {
    switch (e.key) {
      case "ArrowLeft":  e.preventDefault(); pickMove(-1); break;
      case "ArrowRight": e.preventDefault(); pickMove(1); break;
      case "ArrowUp":    e.preventDefault(); pickAdjust(1); break;
      case "ArrowDown":  e.preventDefault(); pickAdjust(-1); break;
      case "Enter":      e.preventDefault(); enterBtnPicker.start(); break;
    }
    return;
  }

  switch (e.key) {
    case "ArrowLeft": e.preventDefault(); goPrev(); break;
    case "ArrowRight": e.preventDefault(); rightBtn.start(); break;
    case "ArrowUp": e.preventDefault(); infoUp(); break;
    case "ArrowDown": e.preventDefault(); infoDown(); break;
    case "Enter":
      e.preventDefault();
      if (errored) { load(lastRequest); }
      else enterBtn.start();
      break;
  }
});
document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowRight") { e.preventDefault(); downKeys.delete(e.key); rightBtn.end(); }
  if (e.key === "Enter") {
    e.preventDefault(); downKeys.delete(e.key);
    if (pickerOpen) {
      // in the picker: a tap confirms, a hold cancels (handled by makeHold tap/hold)
      enterBtnPicker.end();
    } else {
      enterBtn.end();
    }
  }
});

// Mouse is additive (PC / simulator only). Every action also lives on the
// D-pad, so the glasses never depend on a click.
els.retryBtn.addEventListener("click", () => load(lastRequest));
els.prevHint.addEventListener("click", goPrev);
els.nextHint.addEventListener("mousedown", (e) => { e.preventDefault(); rightBtn.start(); });
els.nextHint.addEventListener("mouseup", () => rightBtn.end());
els.nextHint.addEventListener("mouseleave", () => rightBtn.cancel());
els.infoHint.addEventListener("click", () => toggleInfo());
els.randomHint.addEventListener("click", goRandom);
els.pickHint.addEventListener("click", openPicker);
els.todayBtn.addEventListener("click", goToday);
// clicking the picker backdrop cancels (web convenience)
els.picker.addEventListener("click", (e) => { if (e.target === els.picker) closePicker(); });
// click a picker column to focus it; its ▲/▼ chevrons adjust
els.pickerCols.forEach((c, i) => {
  c.addEventListener("click", () => { pickCol = i; renderPicker(); });
  c.querySelector(".picker-up").addEventListener("click", (e) => { e.stopPropagation(); pickCol = i; pickAdjust(1); });
  c.querySelector(".picker-down").addEventListener("click", (e) => { e.stopPropagation(); pickCol = i; pickAdjust(-1); });
});

// kick off with today
load({ date: currentDate });
