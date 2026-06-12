// Open Notify is http-only, which a secure page can't read directly.
// Our own Vercel function (/api/astros) fetches it server-side and serves it
// back over https — no dependency on flaky third-party proxies.
const SOURCES = ["/api/astros"];

const ASTRO_IMG = "astronaut.png";

// Launch Library 2 — used to look up each crew member's nationality by name.
const LL2 = "https://ll.thespacedevs.com/2.2.0/astronaut/?limit=1&search=";

// Nationality (as Launch Library spells it) -> flag emoji. Extend as new crews fly.
const FLAGS = {
  American: "🇺🇸", Russian: "🇷🇺", Chinese: "🇨🇳", Japanese: "🇯🇵",
  French: "🇫🇷", German: "🇩🇪", Italian: "🇮🇹", British: "🇬🇧",
  Canadian: "🇨🇦", Indian: "🇮🇳", Danish: "🇩🇰", Swedish: "🇸🇪",
  Dutch: "🇳🇱", Belgian: "🇧🇪", Emirati: "🇦🇪", "South Korean": "🇰🇷",
};

// Nationalities we already know for the current crew. The crew rarely changes,
// so these are served instantly with no network call. Only a name NOT in here
// triggers a live Launch Library lookup. Extend as new crews fly.
const KNOWN_NATIONALITY = {
  "Oleg Kononenko": "Russian", "Nikolai Chub": "Russian",
  "Alexander Grebenkin": "Russian", "Tracy Caldwell Dyson": "American",
  "Matthew Dominick": "American", "Michael Barratt": "American",
  "Jeanette Epps": "American", "Butch Wilmore": "American",
  "Sunita Williams": "American", "Li Guangsu": "Chinese",
  "Li Cong": "Chinese", "Ye Guangfu": "Chinese",
};

// Three-letter country code shown next to the flag.
const CODES = {
  American: "USA", Russian: "RUS", Chinese: "CHN", Japanese: "JPN",
  French: "FRA", German: "DEU", Italian: "ITA", British: "GBR",
  Canadian: "CAN", Indian: "IND", Danish: "DNK", Swedish: "SWE",
  Dutch: "NLD", Belgian: "BEL", Emirati: "ARE", "South Korean": "KOR",
};

// Flag for a known nationality, or empty string if we don't have it —
// the row simply shows no flag rather than a placeholder.
function flagFor(nationality) {
  return (nationality && FLAGS[nationality]) || "";
}

function codeFor(nationality) {
  return (nationality && CODES[nationality]) || "";
}

// Look up one astronaut's nationality live: try the full name, then the surname.
async function lookupNationality(name) {
  for (const q of [name, name.split(" ").pop()]) {
    try {
      const res = await fetch(LL2 + encodeURIComponent(q), { cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json();
      const hit = data.results && data.results[0];
      if (hit && hit.nationality) return hit.nationality;
    } catch (_) {
      // network/rate-limit — give up on this one, leave the row flag-less
    }
  }
  return null;
}

const $ = (id) => document.getElementById(id);
const screens = ["count-screen", "list-screen"];
let current = 0;

function showScreen(i) {
  current = (i + screens.length) % screens.length;
  screens.forEach((id, idx) =>
    $(id).classList.toggle("is-active", idx === current)
  );
  const onList = screens[current] === "list-screen";
  document.body.classList.toggle("on-list", onList);
  $("scrollHint").hidden = !onList;
}

// deterministic pseudo-random from a seed so layout is stable per render
function seeded(seed) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function spawnAstronauts(count) {
  const layer = $("float-layer");
  layer.innerHTML = "";
  const rnd = seeded(count + 13);
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "astro";
    const img = document.createElement("img");
    img.src = ASTRO_IMG;
    img.alt = "";
    el.appendChild(img);

    const size = 70 + Math.round(rnd() * 90);   // 70–160px, wide range
    // scatter across a loose grid so they don't clump in one corner
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const cellW = 600 / cols, cellH = 600 / rows;
    const col = i % cols, row = Math.floor(i / cols);
    const jitterX = (rnd() - 0.5) * cellW * 0.6;
    const jitterY = (rnd() - 0.5) * cellH * 0.6;
    const startX = Math.max(0, Math.min(600 - size, col * cellW + (cellW - size) / 2 + jitterX));
    const startY = Math.max(0, Math.min(600 - size, row * cellH + (cellH - size) / 2 + jitterY));
    const dx = ((rnd() - 0.5) * 160).toFixed(0) + "px";
    const dy = ((rnd() - 0.5) * 160).toFixed(0) + "px";
    const r0 = Math.round((rnd() - 0.5) * 50) + "deg";
    const r1 = Math.round((rnd() - 0.5) * 70) + "deg";
    const flip = rnd() < 0.5 ? -1 : 1;           // mirror about half of them
    const dur = 7 + rnd() * 9;

    el.style.width = size + "px";
    el.style.height = size + "px";
    el.style.left = startX + "px";
    el.style.top = startY + "px";
    el.style.opacity = (0.7 + rnd() * 0.3).toFixed(2);
    el.style.setProperty("--flip", flip);
    el.style.setProperty("--dx", dx);
    el.style.setProperty("--dy", dy);
    el.style.setProperty("--r0", r0);
    el.style.setProperty("--r1", r1);
    el.style.animation = `drift ${dur.toFixed(1)}s ease-in-out ${(-rnd() * dur).toFixed(2)}s infinite alternate`;
    layer.appendChild(el);
  }
}

function render(data) {
  $("bigNumber").textContent = data.number;
  $("listCount").textContent = `${data.number} TOTAL`;

  const crew = $("crew");
  crew.innerHTML = "";
  data.people.forEach((p) => {
    const li = document.createElement("li");
    li.dataset.name = p.name;
    const nat = KNOWN_NATIONALITY[p.name];
    li.innerHTML =
      `<span class="flag">${flagFor(nat)}</span>` +
      `<span class="code">${codeFor(nat)}</span>` +
      `<span class="name">${p.name}</span>` +
      `<span class="craft">${p.craft}</span>`;
    crew.appendChild(li);
  });

  spawnAstronauts(data.number);
}

// Only look up nationalities we don't already know. Known crew → no network at
// all. New faces → one live, spaced-out request each (Launch Library is
// rate-limited). A row we can't resolve just stays without a flag.
async function enrichFlags(people) {
  const unknown = people.filter((p) => !KNOWN_NATIONALITY[p.name]);
  for (const p of unknown) {
    const nat = await lookupNationality(p.name);
    if (!nat) continue;
    const li = document.querySelector(`#crew li[data-name="${CSS.escape(p.name)}"]`);
    if (li) {
      li.querySelector(".flag").textContent = flagFor(nat);
      li.querySelector(".code").textContent = codeFor(nat);
    }
    await new Promise((r) => setTimeout(r, 600));
  }
}

async function fetchAstros() {
  for (const url of SOURCES) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json();
      if (data && data.number && Array.isArray(data.people)) {
        return { number: data.number, people: data.people };
      }
    } catch (_) {
      // try the next source
    }
  }
  return null;
}

let typeTimer = null;

// Type out "CONTACTING ORBIT" letter by letter, then loop.
function startTyping() {
  const full = "CONTACTING ORBIT";
  const el = $("typeText");
  let i = 0;
  clearInterval(typeTimer);
  el.textContent = "";
  typeTimer = setInterval(() => {
    if (i <= full.length) {
      el.textContent = full.slice(0, i);
      i++;
    } else {
      // brief hold on the full string, then retype
      i = 0;
      el.textContent = "";
    }
  }, 140);
}

function stopTyping() {
  clearInterval(typeTimer);
  typeTimer = null;
}

function setState(state) {
  $("loadingMsg").hidden = state !== "loading";
  $("bigNumber").hidden = state !== "data";
  $("caption").hidden = state === "error";
  $("updated").hidden = state !== "data";
  $("errorBox").hidden = state !== "error";
  $("hints").hidden = state !== "data";

  if (state === "loading") startTyping();
  else stopTyping();

  // floating astronauts belong only to the data state — clear them otherwise
  // so they never bleed behind the loading message or the error
  if (state !== "data") $("float-layer").innerHTML = "";
}

let lastUpdated = null;

function relativeTime(ms) {
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

function renderUpdated() {
  if (lastUpdated) $("updated").textContent = `UPDATED ${relativeTime(lastUpdated)}`;
}

// silent = background refresh: keep showing current data, only swap on success.
async function load(silent = false) {
  if (!silent) setState("loading");
  const data = await fetchAstros();
  if (data) {
    render(data);
    lastUpdated = Date.now();
    renderUpdated();
    setState("data");
    enrichFlags(data.people);
  } else if (!silent) {
    // No live crew data → don't invent a list. Show an honest error.
    setState("error");
  }
  // a failed silent refresh just leaves the existing data on screen
}

function scrollCrew(delta) {
  const crew = $("crew");
  const max = crew.scrollHeight - crew.clientHeight;
  crew.scrollTop = Math.max(0, Math.min(max, crew.scrollTop + delta));
}

$("retryBtn").addEventListener("click", () => load());

// Mouse support for web use — same actions as the D-pad, harmless on glasses.
$("flipHint").addEventListener("click", () => showScreen(current + 1));
$("scrollHint").addEventListener("click", () => {
  const crew = $("crew");
  // page down, wrapping back to the top once the bottom is reached
  if (crew.scrollTop >= crew.scrollHeight - crew.clientHeight - 1) crew.scrollTop = 0;
  else scrollCrew(crew.clientHeight * 0.7);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    if (!$("errorBox").hidden) { load(); e.preventDefault(); }
  }
  else if (e.key === "ArrowLeft") { showScreen(current - 1); e.preventDefault(); }
  else if (e.key === "ArrowRight") { showScreen(current + 1); e.preventDefault(); }
  else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
    if (screens[current] === "list-screen") {
      scrollCrew(e.key === "ArrowDown" ? 120 : -120);
      e.preventDefault();
    }
  }
});

showScreen(0);
load();

// Keep the "updated Xm ago" label honest as time passes.
setInterval(renderUpdated, 60 * 1000);

// The crew changes on a scale of months, so a daily silent refresh is plenty
// for an app left open for a long time.
setInterval(() => load(true), 24 * 60 * 60 * 1000);
