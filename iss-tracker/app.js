// wheretheiss.at is https-native and CORS-open, so no proxy needed.
// It gives lat/lon plus altitude, velocity, and day/night visibility.
const API = "https://api.wheretheiss.at/v1/satellites/25544";

const W = 600, H = 300;   // map box, equirectangular — must match world-map.js
const REFRESH_MS = 5000;  // the ISS moves ~7.6 km/s, so refresh often
const MAX_TRAIL = 12;     // how many past dots to keep

const $ = (id) => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg";

// --- units (persisted) ---
const KM_TO_MI = 0.621371;
let units = localStorage.getItem("iss-units") === "imperial" ? "imperial" : "metric";
let lastFix = null; // remember the last reading so a unit toggle can re-render instantly

function applyUnitsUI() {
  document.querySelectorAll(".unit-opt").forEach((el) =>
    el.classList.toggle("active", el.dataset.unit === units)
  );
  $("altUnit").textContent = units === "imperial" ? "mi" : "km";
  $("speedUnit").textContent = units === "imperial" ? "mph" : "km/h";
}

function toggleUnits() {
  units = units === "metric" ? "imperial" : "metric";
  localStorage.setItem("iss-units", units);
  applyUnitsUI();
  if (lastFix) renderTelemetry(lastFix);
}

// lon/lat -> x/y in the 600x300 map box
function project(lon, lat) {
  return [((lon + 180) / 360) * W, ((90 - lat) / 180) * H];
}

let typeTimer = null;
function startTyping() {
  const full = "ACQUIRING SIGNAL";
  const el = $("typeText");
  let i = 0;
  clearInterval(typeTimer);
  el.textContent = "";
  typeTimer = setInterval(() => {
    if (i <= full.length) el.textContent = full.slice(0, i++);
    else { i = 0; el.textContent = ""; }
  }, 140);
}
function stopTyping() { clearInterval(typeTimer); typeTimer = null; }

function setState(state) {
  $("loading").hidden = state !== "loading";
  $("errorBox").hidden = state !== "error";
  $("stage").hidden = state !== "data";
  if (state === "loading") startTyping();
  else stopTyping();
}

// graticule every 30° lon / 30° lat — quiet reference grid
function drawGrid() {
  const g = $("grid");
  for (let lon = -150; lon <= 150; lon += 30) {
    const [x] = project(lon, 0);
    const ln = document.createElementNS(NS, "line");
    ln.setAttribute("class", "grid-line");
    ln.setAttribute("x1", x); ln.setAttribute("y1", 0);
    ln.setAttribute("x2", x); ln.setAttribute("y2", H);
    g.appendChild(ln);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const [, y] = project(0, lat);
    const ln = document.createElementNS(NS, "line");
    ln.setAttribute("class", "grid-line");
    ln.setAttribute("x1", 0); ln.setAttribute("y1", y);
    ln.setAttribute("x2", W); ln.setAttribute("y2", y);
    g.appendChild(ln);
  }
}

const trail = [];
function pushTrail(x, y) {
  const g = $("track");
  const dot = document.createElementNS(NS, "circle");
  dot.setAttribute("class", "track-dot");
  dot.setAttribute("cx", x); dot.setAttribute("cy", y);
  dot.setAttribute("r", 1.6);
  g.appendChild(dot);
  trail.push(dot);
  while (trail.length > MAX_TRAIL) trail.shift().remove();
  // fade older dots
  trail.forEach((d, i) => (d.style.opacity = 0.12 + (i / trail.length) * 0.4));
}

// pulsing halo around the live dot
function ensureHalo() {
  if ($("issHalo")) return;
  const halo = document.createElementNS(NS, "circle");
  halo.setAttribute("id", "issHalo");
  halo.setAttribute("class", "iss-halo");
  halo.setAttribute("r", 6);
  $("iss").parentNode.insertBefore(halo, $("iss"));
  // SMIL animation keeps it pulsing without a JS loop
  const grow = document.createElementNS(NS, "animate");
  grow.setAttribute("attributeName", "r");
  grow.setAttribute("values", "5;16;5");
  grow.setAttribute("dur", "2.4s");
  grow.setAttribute("repeatCount", "indefinite");
  const fade = document.createElementNS(NS, "animate");
  fade.setAttribute("attributeName", "opacity");
  fade.setAttribute("values", "0.8;0;0.8");
  fade.setAttribute("dur", "2.4s");
  fade.setAttribute("repeatCount", "indefinite");
  halo.appendChild(grow);
  halo.appendChild(fade);
}

// Telemetry text only — also called on a unit toggle, so it must NOT touch the map/trail.
function renderTelemetry(d) {
  const alt = units === "imperial" ? d.altitude * KM_TO_MI : d.altitude;
  const speed = units === "imperial" ? d.velocity * KM_TO_MI : d.velocity;
  $("lat").textContent = d.latitude.toFixed(1) + "°";
  $("lon").textContent = d.longitude.toFixed(1) + "°";
  $("alt").textContent = Math.round(alt);
  // Fixed comma thousands separator (mission-control style), regardless of
  // the browser's locale, so the number reads the same for everyone.
  $("speed").textContent = Math.round(speed).toLocaleString("en-US");
  $("vis").textContent = d.visibility === "daylight" ? "☀ IN SUNLIGHT" : "☾ IN EARTH'S SHADOW";
}

function render(d) {
  lastFix = d;
  const [x, y] = project(d.longitude, d.latitude);
  pushTrail(x, y);

  ensureHalo();
  $("iss").setAttribute("cx", x);
  $("iss").setAttribute("cy", y);
  $("issHalo").setAttribute("cx", x);
  $("issHalo").setAttribute("cy", y);

  renderTelemetry(d);
}

async function fetchISS() {
  const res = await fetch(API, { cache: "no-store" });
  if (!res.ok) throw new Error("bad status");
  return res.json();
}

let refreshTimer = null;

async function load(silent = false) {
  if (!silent) setState("loading");
  try {
    const d = await fetchISS();
    render(d);
    setState("data");
  } catch (_) {
    if (!silent) setState("error");
    // a failed silent refresh just leaves the last fix on screen
  }
}

function startTracking() {
  clearInterval(refreshTimer);
  refreshTimer = setInterval(() => load(true), REFRESH_MS);
}

$("retryBtn").addEventListener("click", () => load());
$("unitsBtn").addEventListener("click", toggleUnits);
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    // Enter retries when errored, otherwise toggles units
    if (!$("errorBox").hidden) load();
    else toggleUnits();
    e.preventDefault();
  }
});

$("worldPath").setAttribute("d", WORLD_PATH);
drawGrid();
applyUnitsUI();
load().then(startTracking);
