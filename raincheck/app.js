/* ============================================================
   RAINCHECK — logic
   Three screens: pick → search → verdict.
   No keyboard hardware: an on-screen D-pad keyboard lets you
   type 2+ letters, then we query Open-Meteo's geocoder live and
   show real cities worldwide. Weather: Open-Meteo (no API key).
   D-pad: ▲▼◀▶ moves, Enter selects, ◀ also goes back on edges.
   ============================================================ */

const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "raincheck:last-place";
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";

// --- Default favorites: seeded only on first run, then user-editable ---
const DEFAULT_FAVORITES = [
  { name: "Barcelona", country: "Spain", flag: "🇪🇸", lat: 41.39, lon: 2.17,   tz: "Europe/Madrid" },
  { name: "New York",  country: "USA",   flag: "🇺🇸", lat: 40.71, lon: -74.01, tz: "America/New_York" },
];
const FAVS_KEY = "raincheck:favorites";

// live list, loaded from storage (falls back to the defaults on first run)
let favorites = loadFavorites();

// a place's identity = rounded lat/lon (handles search results without a flag)
function placeKey(p) {
  return `${(+p.lat).toFixed(2)},${(+p.lon).toFixed(2)}`;
}
function isFavorite(p) {
  const k = placeKey(p);
  return favorites.some((f) => placeKey(f) === k);
}
function toggleFavorite(p) {
  const k = placeKey(p);
  const i = favorites.findIndex((f) => placeKey(f) === k);
  if (i >= 0) favorites.splice(i, 1);
  else favorites.push({ name: p.name, country: p.country || "", flag: p.flag || "", lat: p.lat, lon: p.lon, tz: p.tz });
  saveFavorites();
}
function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVS_KEY);
    if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) return arr; }
  } catch (e) { /* unavailable or corrupt */ }
  return DEFAULT_FAVORITES.slice();
}
function saveFavorites() {
  try { localStorage.setItem(FAVS_KEY, JSON.stringify(favorites)); } catch (e) { /* non-fatal */ }
}

// --- SVG weather icons drawn for the app ---
const ICONS = {
  sun: `<svg viewBox="0 0 100 100" class="wx">
    <g class="wx-rays" stroke="var(--dry)" stroke-width="6" stroke-linecap="round">
      <line x1="50" y1="6"  x2="50" y2="20"/><line x1="50" y1="80" x2="50" y2="94"/>
      <line x1="6"  y1="50" x2="20" y2="50"/><line x1="80" y1="50" x2="94" y2="50"/>
      <line x1="18" y1="18" x2="28" y2="28"/><line x1="72" y1="72" x2="82" y2="82"/>
      <line x1="82" y1="18" x2="72" y2="28"/><line x1="28" y1="72" x2="18" y2="82"/>
    </g>
    <circle cx="50" cy="50" r="18" fill="var(--dry)"/>
  </svg>`,
  rain: `<svg viewBox="0 0 100 100" class="wx">
    <path d="M30 56a16 16 0 0 1 1-31 21 21 0 0 1 40 5 14 14 0 0 1-2 26z" fill="var(--rain)"/>
    <g class="wx-drops" stroke="var(--rain-hi)" stroke-width="5" stroke-linecap="round">
      <line x1="36" y1="64" x2="32" y2="80"/><line x1="52" y1="64" x2="48" y2="80"/><line x1="68" y1="64" x2="64" y2="80"/>
    </g>
  </svg>`,
  partly: `<svg viewBox="0 0 100 100" class="wx">
    <g stroke="var(--dry)" stroke-width="5" stroke-linecap="round">
      <line x1="34" y1="10" x2="34" y2="20"/><line x1="10" y1="34" x2="20" y2="34"/>
      <line x1="16" y1="16" x2="23" y2="23"/><line x1="52" y1="16" x2="45" y2="23"/>
    </g>
    <circle cx="34" cy="34" r="13" fill="var(--dry)"/>
    <path d="M40 70a15 15 0 0 1 1-29 19 19 0 0 1 37 4 13 13 0 0 1-2 25z" fill="var(--rain)"/>
  </svg>`,
  warn: `<svg viewBox="0 0 100 100" class="wx">
    <path d="M50 14 90 84H10z" fill="none" stroke="var(--text-3)" stroke-width="6" stroke-linejoin="round"/>
    <line x1="50" y1="40" x2="50" y2="62" stroke="var(--text-3)" stroke-width="7" stroke-linecap="round"/>
    <circle cx="50" cy="73" r="4" fill="var(--text-3)"/>
  </svg>`,
  load: `<svg viewBox="0 0 100 100" class="wx wx-spin">
    <circle cx="50" cy="50" r="30" fill="none" stroke="var(--line)" stroke-width="7"/>
    <path d="M50 20a30 30 0 0 1 30 30" fill="none" stroke="var(--rain)" stroke-width="7" stroke-linecap="round"/>
  </svg>`,
};

// --- on-screen keyboard layout (last row has backspace + done) ---
const KEY_ROWS = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["Z","X","C","V","B","N","M","⌫","✕"],
];

const state = {
  screen: "pick",       // pick | search | result
  pickIdx: 0,
  pickRows: [],
  cameFromSearch: false,

  query: "",
  keyRow: 0,
  keyCol: 0,
  zone: "keys",         // "keys" | "results" — which area the D-pad is driving
  resIdx: 0,
  results: [],
  searchSeq: 0,         // guards against out-of-order async responses

  currentPlace: null,   // the place shown on the result screen
  footIdx: 0,           // foot buttons: 0 = star, 1 = refresh, 2 = change-city
};

// ============================================================
//  STEP 1 — PICK (favorites + search entry)
// ============================================================
function buildPickRows() {
  const rows = [{ type: "search" }, { type: "divider", label: "FAVORITES" }];
  if (favorites.length) {
    favorites.forEach((c) => rows.push({ type: "fav", data: c }));
  } else {
    rows.push({ type: "empty" });
  }
  return rows;
}

function renderPickList() {
  const wrap = $("pick-list");
  wrap.innerHTML = "";
  state.pickRows.forEach((r, i) => {
    if (r.type === "divider") {
      const d = document.createElement("div");
      d.className = "list-divider";
      d.textContent = r.label;
      wrap.appendChild(d);
      return;
    }
    if (r.type === "empty") {
      const e = document.createElement("div");
      e.className = "list-empty";
      e.textContent = "No favorites yet — search a city and star it.";
      wrap.appendChild(e);
      return;
    }
    const el = document.createElement("div");
    if (r.type === "search") {
      el.className = "row row-search";
      el.innerHTML = `<span class="row-flag">⌕</span><span class="row-name">Search a city…</span>`;
    } else {
      el.className = "row fav";
      el.innerHTML =
        `<span class="row-flag">${r.data.flag || "📍"}</span>` +
        `<span class="row-name">${r.data.name}</span>` +
        `<span class="row-sub">${r.data.country || ""}</span>` +
        `<span class="row-star" title="Remove">★</span>`;
    }
    el.dataset.rowIdx = i;
    wrap.appendChild(el);
  });
  highlightPick();
}

function selectablePickIdxs() {
  return state.pickRows
    .map((r, i) => (r.type === "divider" || r.type === "empty" ? -1 : i))
    .filter((i) => i >= 0);
}

// remove the favorite at the highlighted row, then rebuild & keep a sane cursor
function removeFavoriteAtPick() {
  const r = state.pickRows[state.pickIdx];
  if (!r || r.type !== "fav") return;
  const prev = state.pickIdx;
  toggleFavorite(r.data); // it's a favorite, so this removes it
  state.pickRows = buildPickRows();
  const sel = selectablePickIdxs();
  // keep the cursor on a valid row: same index if it still exists, else the nearest above
  state.pickIdx = sel.includes(prev) ? prev : sel.filter((i) => i < prev).pop() ?? sel[0];
  renderPickList();
}

function highlightPick() {
  const list = $("pick-list");
  [...list.querySelectorAll(".row")].forEach((el) => el.classList.remove("active"));
  const active = list.querySelector(`[data-row-idx="${state.pickIdx}"]`);
  if (active) { active.classList.add("active"); scrollListTo(list, active); }
}

function scrollListTo(list, activeEl) {
  // native scroll lives on the wrapper now; keep the active row in view for the D-pad
  activeEl.scrollIntoView({ block: "nearest" });
}

// ============================================================
//  STEP 2 — SEARCH (on-screen keyboard + live geocoder results)
// ============================================================
function renderKeyboard() {
  const kb = $("keyboard");
  kb.innerHTML = "";
  KEY_ROWS.forEach((row, r) => {
    const rowEl = document.createElement("div");
    rowEl.className = "key-row";
    row.forEach((k, c) => {
      const key = document.createElement("div");
      key.className = "key";
      if (k === "⌫") key.classList.add("key-back");
      if (k === "✕") key.classList.add("key-done");
      key.textContent = k;
      key.dataset.r = r; key.dataset.c = c;
      rowEl.appendChild(key);
    });
    kb.appendChild(rowEl);
  });
  highlightKey();
}

function highlightKey() {
  const kb = $("keyboard");
  [...kb.querySelectorAll(".key")].forEach((el) => el.classList.remove("active"));
  if (state.zone !== "keys") return;
  const k = kb.querySelector(`.key[data-r="${state.keyRow}"][data-c="${state.keyCol}"]`);
  if (k) k.classList.add("active");
}

function currentKey() {
  return KEY_ROWS[state.keyRow]?.[state.keyCol];
}

function renderQuery() {
  $("query-text").textContent = state.query;
}

function pressKey(k) {
  if (k === "⌫") {
    state.query = state.query.slice(0, -1);
  } else if (k === "✕") {
    back();
    return;
  } else {
    if (state.query.length < 24) state.query += k;
  }
  renderQuery();
  runSearch();
}

let searchTimer = null;
function runSearch() {
  clearTimeout(searchTimer);
  const q = state.query.trim();
  if (q.length < 2) { state.results = []; state.zone = "keys"; renderResults(); return; }
  searchTimer = setTimeout(() => fetchCities(q), 220);
}

async function fetchCities(q) {
  const seq = ++state.searchSeq;
  try {
    const res = await fetch(`${GEO_URL}?name=${encodeURIComponent(q)}&count=6&language=en`);
    const data = await res.json();
    if (seq !== state.searchSeq) return; // a newer keystroke superseded this one
    state.results = (data.results || []).map((r) => ({
      name: r.name,
      country: r.country || r.country_code || "",
      admin: r.admin1 || "",
      lat: r.latitude, lon: r.longitude,
      tz: r.timezone || "auto",
    }));
    state.resIdx = 0;
    renderResults();
  } catch (e) {
    if (seq !== state.searchSeq) return;
    state.results = [];
    renderResults();
  }
}

function renderResults() {
  const wrap = $("results");
  wrap.innerHTML = "";
  if (!state.results.length) {
    wrap.classList.add("empty");
    $("search-hint").textContent = "◀ BACK";
    highlightKey();
    return;
  }
  wrap.classList.remove("empty");
  $("search-hint").textContent = "▲ results";
  state.results.forEach((r, i) => {
    const el = document.createElement("div");
    el.className = "res-row";
    const sub = [r.admin, r.country].filter(Boolean).join(", ");
    el.innerHTML = `<span class="res-name">${r.name}</span><span class="res-sub mono">${sub}</span>`;
    el.dataset.resIdx = i;
    wrap.appendChild(el);
  });
  highlightResult();
}

function highlightResult() {
  const wrap = $("results");
  [...wrap.querySelectorAll(".res-row")].forEach((el) => el.classList.remove("active"));
  if (state.zone !== "results") return;
  const el = wrap.querySelector(`[data-res-idx="${state.resIdx}"]`);
  if (el) { el.classList.add("active"); el.scrollIntoView({ block: "nearest" }); }
}

// ============================================================
//  SCREEN SWITCHING
// ============================================================
function show(screen) {
  state.screen = screen;
  $("step-pick").classList.toggle("hidden", screen !== "pick");
  $("step-search").classList.toggle("hidden", screen !== "search");
  $("result").classList.toggle("hidden", screen !== "result");
  if (screen !== "result") document.body.classList.remove("raining");
}

function openPick() {
  // favorites may have changed (starred from the result), so rebuild the list
  state.pickRows = buildPickRows();
  const sel = selectablePickIdxs();
  if (!sel.includes(state.pickIdx)) state.pickIdx = sel[0];
  renderPickList();
  show("pick");
}

function openSearch() {
  state.cameFromSearch = true;
  state.query = "";
  state.results = [];
  state.keyRow = 0; state.keyCol = 0; state.zone = "keys";
  renderQuery();
  renderResults();
  renderKeyboard();
  show("search");
}

function openResult(place) {
  state.currentPlace = place;
  state.footIdx = 0;
  $("r-place").textContent = place.name;
  savePlace(place);
  resetResult();
  show("result");
  updateStar();
  highlightFoot();
  fetchWeather(place);
}

// reflect whether the shown city is starred, and which foot button has focus
function updateStar() {
  const fav = state.currentPlace && isFavorite(state.currentPlace);
  $("star-ico") && ($("star-ico").textContent = fav ? "★" : "☆");
  $("star-label").textContent = fav ? "SAVED" : "SAVE";
  $("star-btn").classList.toggle("is-saved", !!fav);
}

const FOOT_BTNS = () => [$("star-btn"), $("refresh-btn"), $("change-btn")];

function highlightFoot() {
  const btns = FOOT_BTNS();
  btns.forEach((b, i) => b.classList.toggle("foot-focus", i === state.footIdx));
  btns[state.footIdx].focus();
}

function toggleCurrentFavorite() {
  if (!state.currentPlace) return;
  toggleFavorite(state.currentPlace);
  updateStar();
}

function savePlace(place) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      name: place.name, lat: place.lat, lon: place.lon, tz: place.tz,
    }));
  } catch (e) { /* storage unavailable — non-fatal */ }
}

function loadPlace() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p && p.name && p.lat != null && p.lon != null) return p;
  } catch (e) { /* corrupt or unavailable */ }
  return null;
}

// ============================================================
//  D-PAD
// ============================================================
function move(dx, dy) {
  if (state.screen === "pick") {
    if (dx > 0) { removeFavoriteAtPick(); return; } // ▶ unstars the highlighted favorite
    if (dy === 0) return;
    const sel = selectablePickIdxs();
    let pos = sel.indexOf(state.pickIdx);
    pos = Math.max(0, Math.min(sel.length - 1, pos + dy));
    state.pickIdx = sel[pos];
    highlightPick();
    return;
  }
  if (state.screen === "search") { moveSearch(dx, dy); return; }
  if (state.screen === "result") {
    if (dx < 0 && state.footIdx > 0) { state.footIdx--; highlightFoot(); }
    else if (dx > 0 && state.footIdx < 2) { state.footIdx++; highlightFoot(); }
  }
}

function moveSearch(dx, dy) {
  if (state.zone === "results") {
    if (dy > 0) {
      if (state.resIdx < state.results.length - 1) { state.resIdx++; highlightResult(); }
    } else if (dy < 0) {
      if (state.resIdx > 0) { state.resIdx--; highlightResult(); }
      else { state.zone = "keys"; highlightResult(); highlightKey(); } // back up into keyboard
    }
    return;
  }
  // zone === "keys"
  if (dy < 0) {
    if (state.keyRow > 0) { state.keyRow--; clampCol(); highlightKey(); }
    else if (state.results.length) { state.zone = "results"; state.resIdx = 0; highlightKey(); highlightResult(); }
  } else if (dy > 0) {
    if (state.keyRow < KEY_ROWS.length - 1) { state.keyRow++; clampCol(); highlightKey(); }
  } else if (dx < 0) {
    if (state.keyCol > 0) { state.keyCol--; highlightKey(); }
  } else if (dx > 0) {
    if (state.keyCol < KEY_ROWS[state.keyRow].length - 1) { state.keyCol++; highlightKey(); }
  }
}

function clampCol() {
  const max = KEY_ROWS[state.keyRow].length - 1;
  if (state.keyCol > max) state.keyCol = max;
}

function enter() {
  if (state.screen === "pick") {
    const r = state.pickRows[state.pickIdx];
    if (!r) return;
    if (r.type === "search") { state.cameFromSearch = true; openSearch(); }
    else if (r.type === "fav") { state.cameFromSearch = false; openResult(r.data); }
  } else if (state.screen === "search") {
    if (state.zone === "results") {
      const r = state.results[state.resIdx];
      if (r) openResult(r);
    } else {
      pressKey(currentKey());
    }
  } else if (state.screen === "result") {
    if (state.footIdx === 0) toggleCurrentFavorite();      // ★ save / unsave
    else if (state.footIdx === 1) refreshWeather();        // ↻ reload forecast
    else openPick();                                       // change city
  }
}

function back() {
  if (state.screen === "search") openPick();
  else if (state.screen === "result") {
    if (state.cameFromSearch) openSearch();
    else openPick();
  }
}

document.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowUp":    e.preventDefault(); move(0, -1); break;
    case "ArrowDown":  e.preventDefault(); move(0, 1);  break;
    case "ArrowLeft":
      e.preventDefault();
      // on the keyboard, left at the first column means "go back"
      if (state.screen === "search" && state.zone === "keys" && state.keyCol === 0) back();
      // on the result, left moves between foot buttons; left of the first one goes back
      else if (state.screen === "result" && state.footIdx === 0) back();
      else move(-1, 0);
      break;
    case "ArrowRight": e.preventDefault(); move(1, 0); break;
    case "Enter":      e.preventDefault(); enter(); break;
  }
});

// click support for the simulator / preview
$("change-btn").addEventListener("click", openPick);
$("star-btn").addEventListener("click", () => { state.footIdx = 0; highlightFoot(); toggleCurrentFavorite(); });
$("refresh-btn").addEventListener("click", () => { state.footIdx = 1; highlightFoot(); refreshWeather(); });

// auto-refresh: when the app comes back into view, reload if the data is stale
// (left open across hours, or the city's day rolled over). Cheap guard: only when
// showing a result, and only if >10 min old or the forecast date is no longer today.
document.addEventListener("visibilitychange", () => {
  if (document.hidden || state.screen !== "result" || !state.currentPlace) return;
  const ageMin = lastUpdatedAt ? (Date.now() - lastUpdatedAt) / 60000 : Infinity;
  let dayRolled = false;
  if (cityOffsetSec != null && lastForecastDate) {
    const todayStr = new Date(Date.now() + cityOffsetSec * 1000).toISOString().slice(0, 10);
    dayRolled = lastForecastDate !== todayStr;
  }
  if (ageMin > 10 || dayRolled) refreshWeather();
});
$("keyboard").addEventListener("click", (e) => {
  const k = e.target.closest(".key"); if (!k) return;
  state.keyRow = +k.dataset.r; state.keyCol = +k.dataset.c; state.zone = "keys";
  pressKey(currentKey());
});
$("results").addEventListener("click", (e) => {
  const row = e.target.closest(".res-row"); if (!row) return;
  const r = state.results[+row.dataset.resIdx]; if (r) openResult(r);
});
$("pick-list").addEventListener("click", (e) => {
  const row = e.target.closest(".row"); if (!row) return;
  state.pickIdx = +row.dataset.rowIdx;
  if (e.target.closest(".row-star")) { removeFavoriteAtPick(); return; } // ★ removes
  enter();
});

// hover moves the same highlight the D-pad uses, so mouse and arrows stay in sync
$("pick-list").addEventListener("mousemove", (e) => {
  const row = e.target.closest(".row"); if (!row) return;
  const i = +row.dataset.rowIdx;
  if (i !== state.pickIdx) { state.pickIdx = i; highlightPick(); }
});
$("keyboard").addEventListener("mousemove", (e) => {
  const k = e.target.closest(".key"); if (!k) return;
  const r = +k.dataset.r, c = +k.dataset.c;
  if (state.zone !== "keys" || r !== state.keyRow || c !== state.keyCol) {
    state.zone = "keys"; state.keyRow = r; state.keyCol = c; highlightKey(); highlightResult();
  }
});
$("results").addEventListener("mousemove", (e) => {
  const row = e.target.closest(".res-row"); if (!row) return;
  const i = +row.dataset.resIdx;
  if (state.zone !== "results" || i !== state.resIdx) {
    state.zone = "results"; state.resIdx = i; highlightResult(); highlightKey();
  }
});
$("result").querySelector(".result-foot").addEventListener("mousemove", (e) => {
  const btn = e.target.closest(".foot-btn"); if (!btn) return;
  const i = btn.id === "star-btn" ? 0 : btn.id === "refresh-btn" ? 1 : 2;
  if (i !== state.footIdx) { state.footIdx = i; highlightFoot(); }
});

// ============================================================
//  OPEN-METEO WEATHER
// ============================================================
function resetResult() {
  cityOffsetSec = null; // clear stale clock until the new city's forecast loads
  lastForecastDate = null; lastUpdatedAt = null;
  tick();
  $("r-date").textContent = "—";
  $("r-date").classList.remove("stale");
  $("r-updated").textContent = "updating…";
  const v = $("verdict");
  v.className = "verdict";
  $("v-icon").innerHTML = ICONS.load;
  $("v-text").textContent = "LOADING";
  $("v-sub").textContent = "checking the weather";
  ["morning", "afternoon", "evening"].forEach((b) => {
    $(`b-${b}-pct`).textContent = "—";
    $(`b-${b}-meta`).textContent = "—";
    document.querySelector(`.band[data-band="${b}"]`).className = "band";
  });
}

async function fetchWeather(place) {
  const tz = place.tz && place.tz !== "auto" ? place.tz : "auto";
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${place.lat}&longitude=${place.lon}` +
    `&hourly=precipitation_probability,temperature_2m` +
    `&forecast_days=1&timezone=${encodeURIComponent(tz)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    cityOffsetSec = typeof data.utc_offset_seconds === "number" ? data.utc_offset_seconds : null;
    // forecast date comes from the data itself (city-local), e.g. "2026-06-12"
    lastForecastDate = (data.hourly && data.hourly.time && data.hourly.time[0])
      ? data.hourly.time[0].slice(0, 10) : null;
    lastUpdatedAt = Date.now();
    tick();
    renderMeta();
    render(data.hourly);
  } catch (err) {
    $("verdict").className = "verdict";
    $("v-icon").innerHTML = ICONS.warn;
    $("v-text").textContent = "NO DATA";
    $("v-sub").textContent = "couldn't reach the weather service";
    $("r-updated").textContent = "update failed";
  }
}

// re-fetch the forecast for the city currently shown (manual ↻ or auto)
function refreshWeather() {
  if (!state.currentPlace) return;
  $("r-updated").textContent = "updating…";
  fetchWeather(state.currentPlace);
}

// "Today · Jun 12" + "updated 14:30", both in the city's local time
function renderMeta() {
  const dateEl = $("r-date"), updEl = $("r-updated");
  if (cityOffsetSec == null || !lastForecastDate) {
    dateEl.textContent = "—"; updEl.textContent = "updated —"; return;
  }
  // city-local "now" to compare today vs the forecast date and to stamp the time
  const localNow = new Date(Date.now() + cityOffsetSec * 1000);
  const todayStr = localNow.toISOString().slice(0, 10);
  const [y, m, d] = lastForecastDate.split("-").map(Number);
  const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const label = lastForecastDate === todayStr ? "Today" : "Forecast";
  dateEl.textContent = `${label} · ${MON[m - 1]} ${d}`;
  dateEl.classList.toggle("stale", lastForecastDate !== todayStr);

  const upd = new Date(lastUpdatedAt + cityOffsetSec * 1000);
  const hh = String(upd.getUTCHours()).padStart(2, "0");
  const mm = String(upd.getUTCMinutes()).padStart(2, "0");
  updEl.textContent = `updated ${hh}:${mm}`;
}

const BANDS = [
  { key: "morning",   from: 6,  to: 12 },
  { key: "afternoon", from: 12, to: 18 },
  { key: "evening",   from: 18, to: 24 },
];

function render(hourly) {
  const prob = hourly.precipitation_probability || [];
  const temp = hourly.temperature_2m || [];
  const hours = (hourly.time || []).map((t) => parseInt(t.slice(11, 13), 10));

  let dayMax = 0;

  BANDS.forEach((b) => {
    let max = 0, sumT = 0, n = 0, peakHour = null;
    hours.forEach((h, i) => {
      if (h >= b.from && h < b.to) {
        const p = prob[i] ?? 0;
        if (p > max) { max = p; peakHour = h; }
        if (temp[i] != null) { sumT += temp[i]; n++; }
      }
    });
    const wet = max >= 50;
    const bandEl = document.querySelector(`.band[data-band="${b.key}"]`);
    bandEl.className = "band " + (wet ? "wet" : "dry");
    $(`b-${b.key}-pct`).textContent = max + "%";
    const avgT = n ? Math.round(sumT / n) + "°" : "—";
    $(`b-${b.key}-meta`).textContent = wet && peakHour != null
      ? `peak ${String(peakHour).padStart(2, "0")}h · ${avgT}`
      : avgT;
    if (max > dayMax) dayMax = max;
  });

  const v = $("verdict");
  if (dayMax >= 60) {
    v.className = "verdict is-rain";
    $("v-icon").innerHTML = ICONS.rain;
    $("v-text").textContent = "YES, GRAB AN UMBRELLA";
    $("v-sub").textContent = `up to ${dayMax}% chance of rain today`;
    document.body.classList.add("raining");
  } else if (dayMax >= 30) {
    v.className = "verdict is-rain";
    $("v-icon").innerHTML = ICONS.partly;
    $("v-text").textContent = "MAYBE";
    $("v-sub").textContent = `${dayMax}% peak · just in case`;
    document.body.classList.remove("raining");
  } else {
    v.className = "verdict is-dry";
    $("v-icon").innerHTML = ICONS.sun;
    $("v-text").textContent = "NO, ALL CLEAR";
    $("v-sub").textContent = `only ${dayMax}% chance of rain today`;
    document.body.classList.remove("raining");
  }
}

// ============================================================
//  CLOCK
// ============================================================
// city's UTC offset in seconds, set once the forecast loads; null until then
let cityOffsetSec = null;
let lastForecastDate = null;  // "YYYY-MM-DD" the forecast is for (city-local)
let lastUpdatedAt = null;     // Date.now() when we last loaded the forecast

function tick() {
  if (cityOffsetSec == null) { $("r-clock").textContent = ""; return; }
  // shift UTC by the city's offset so the clock is local to the city, not the PC
  const local = new Date(Date.now() + cityOffsetSec * 1000);
  const hh = String(local.getUTCHours()).padStart(2, "0");
  const mm = String(local.getUTCMinutes()).padStart(2, "0");
  $("r-clock").textContent = `${hh}:${mm}`;
}
setInterval(tick, 1000);
tick();

// ============================================================
//  INIT
// ============================================================
state.pickRows = buildPickRows();
state.pickIdx = selectablePickIdxs()[0];
renderPickList();

const remembered = loadPlace();
if (remembered) { state.cameFromSearch = false; openResult(remembered); }
