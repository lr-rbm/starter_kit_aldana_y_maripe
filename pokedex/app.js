// PokéAPI is https + CORS-open, so we hit it directly — no serverless proxy needed.
const API = "https://pokeapi.co/api/v2";
const ARTWORK = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
const CRY = (id) => `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`;

// National-dex ranges per generation. Browsing is clamped to the chosen range.
const GENERATIONS = [
  { name: "KANTO · GEN 1", min: 1, max: 151 },
  { name: "JOHTO · +GEN 2", min: 1, max: 251 },
  { name: "HOENN · +GEN 3", min: 1, max: 386 },
  { name: "ALL GENS", min: 1, max: 1025 },
];

const TYPE_COLORS = {
  normal: "#a8a77a", fire: "#ee8130", water: "#6390f0", electric: "#f7d02c",
  grass: "#7ac74c", ice: "#96d9d6", fighting: "#c22e28", poison: "#a33ea1",
  ground: "#e2bf65", flying: "#a98ff3", psychic: "#f95587", bug: "#a6b91a",
  rock: "#b6a136", ghost: "#735797", dragon: "#6f35fc", dark: "#705746",
  steel: "#b7b7ce", fairy: "#d685ad",
};

const STAT_LABELS = {
  hp: "HP", attack: "ATTACK", defense: "DEFENSE",
  "special-attack": "SP. ATK", "special-defense": "SP. DEF", speed: "SPEED",
};
const STAT_MAX = 200;
const HOLD_MS = 700;   // long-press threshold for ◀=back and Enter=favorite

const $ = (id) => document.getElementById(id);
const SCREENS = ["menu", "gen", "favs", "card"];

// ---- persistent state ----
function loadFavs() {
  try { return JSON.parse(localStorage.getItem("pdx-favs") || "[]"); }
  catch (_) { return []; }
}
function saveFavs(list) { localStorage.setItem("pdx-favs", JSON.stringify(list)); }
let favs = loadFavs();                                  // array of dex ids, in save order
let muted = localStorage.getItem("pdx-muted") === "1";

// ---- transient state ----
let genIndex = 0;
let menuIndex = 0;
let genMenuIndex = 0;
let favIndex = 0;
let viewIndex = 0;
let currentId = 1;
let mode = "catalog";          // "catalog" | "favorite" — how the card behaves
let currentAudio = null;
let token = 0;                 // guards slow species fetches against navigation

const VIEWS = ["viewStats", "viewPhysical", "viewFlavor"];

// ---- screen routing ----
function show(screen) {
  SCREENS.forEach((s) => $(s).classList.toggle("is-active", s === screen));
  // card-only chrome
  $("hints").hidden = screen !== "card";
  // loading/error live in the card flow; hide them unless we're loading the card
  if (screen !== "card") { $("loadingMsg").hidden = true; $("errorBox").hidden = true; $("card").hidden = true; }
  updateMuteHint();
}

function setCardState(state) {
  $("loadingMsg").hidden = state !== "loading";
  $("errorBox").hidden = state !== "error";
  $("card").hidden = state !== "data";
  $("hints").hidden = state !== "data";
  if (state === "loading") startTyping();
  else stopTyping();
  updateMuteHint();
}

function setAccent(color) {
  document.documentElement.style.setProperty("--accent", color || "#ffcb05");
}

// ---- card views ----
function showView(i) {
  viewIndex = (i + VIEWS.length) % VIEWS.length;
  VIEWS.forEach((id, idx) => { $(id).hidden = idx !== viewIndex; });
  $("viewDots").querySelectorAll(".dot").forEach((d, idx) =>
    d.classList.toggle("is-active", idx === viewIndex)
  );
}

function renderTypes(types) {
  const wrap = $("types");
  wrap.innerHTML = "";
  types.forEach((t) => {
    const chip = document.createElement("span");
    chip.className = "type-chip";
    chip.textContent = t;
    chip.style.background = TYPE_COLORS[t] || "#777";
    wrap.appendChild(chip);
  });
}

function renderStats(stats) {
  const ul = $("stats");
  ul.innerHTML = "";
  stats.forEach((s) => {
    const pct = Math.min(100, (s.base_stat / STAT_MAX) * 100);
    const li = document.createElement("li");
    li.className = "stat-row";
    li.innerHTML =
      `<span class="stat-label">${STAT_LABELS[s.stat.name] || s.stat.name}</span>` +
      `<span class="stat-val">${s.base_stat}</span>` +
      `<span class="stat-bar"><span class="stat-fill"></span></span>`;
    ul.appendChild(li);
    requestAnimationFrame(() => { li.querySelector(".stat-fill").style.width = pct + "%"; });
  });
}

function renderPhysical(p) {
  $("height").textContent = (p.height / 10).toFixed(1) + " m";
  $("weight").textContent = (p.weight / 10).toFixed(1) + " kg";
  $("abilities").textContent = p.abilities.map((a) => a.ability.name.replace(/-/g, " ")).join(", ");
}

function render(p) {
  setAccent(TYPE_COLORS[p.types[0].type.name] || "#ffcb05");
  $("dexNum").textContent = "#" + String(p.id).padStart(3, "0");
  $("dexName").textContent = p.name.replace(/-/g, " ");
  renderTypes(p.types.map((t) => t.type.name));
  renderFavStar();

  const sprite = $("sprite");
  sprite.classList.add("is-swapping");
  const img = new Image();
  img.onload = () => { sprite.src = img.src; sprite.classList.remove("is-swapping"); };
  img.onerror = () => { sprite.removeAttribute("src"); sprite.classList.remove("is-swapping"); };
  img.src = ARTWORK(p.id);

  renderStats(p.stats);
  renderPhysical(p);
  $("flavor").textContent = "";
  showView(0);
}

async function loadFlavor(id, myToken) {
  try {
    const res = await fetch(`${API}/pokemon-species/${id}`, { cache: "force-cache" });
    if (!res.ok) return;
    const data = await res.json();
    if (myToken !== token) return;
    const entry = data.flavor_text_entries.find((e) => e.language.name === "en");
    $("flavor").textContent = entry
      ? entry.flavor_text.replace(/[­​]/g, "").replace(/[\n\f\r]/g, " ").replace(/\s+/g, " ").trim()
      : "No Pokédex entry available.";
  } catch (_) { /* leave blank */ }
}

async function loadPokemon(id, { wrapWithin } = {}) {
  // clamp/wrap within either the chosen generation (catalog) or the favorites list
  if (wrapWithin) {
    const { min, max } = wrapWithin;
    if (id < min) id = max;
    else if (id > max) id = min;
  }
  currentId = id;
  const myToken = ++token;
  stopCry();
  setCardState("loading");
  show("card");
  try {
    const res = await fetch(`${API}/pokemon/${id}`, { cache: "force-cache" });
    if (!res.ok) throw new Error("not ok");
    const data = await res.json();
    if (myToken !== token) return;
    render(data);
    setCardState("data");
    loadFlavor(id, myToken);
  } catch (_) {
    if (myToken === token) setCardState("error");
  }
}

// ---- favorites ----
function isFav(id) { return favs.includes(id); }
function toggleFav(id) {
  if (isFav(id)) favs = favs.filter((x) => x !== id);
  else favs = [...favs, id];
  saveFavs(favs);
  renderFavStar();
  renderMenuFavCount();
}
function renderFavStar() {
  $("favStar").hidden = !isFav(currentId);
}
function renderMenuFavCount() {
  $("menuFavCount").textContent = `(${favs.length})`;
}

// ---- favorites list screen ----
async function openFavs() {
  setAccent(null);
  renderFavTiles();
  show("favs");
}

function renderFavTiles() {
  const ul = $("favTiles");
  ul.innerHTML = "";
  $("favsEmpty").hidden = favs.length > 0;
  $("favTiles").hidden = favs.length === 0;
  $("favsHint").hidden = favs.length === 0;
  favs.forEach((id, i) => {
    const li = document.createElement("li");
    li.className = "fav-tile" + (i === favIndex ? " is-active" : "");
    li.dataset.id = id;
    li.innerHTML =
      `<img src="${ARTWORK(id)}" alt="" loading="lazy" />` +
      `<span class="fav-tile-num">#${String(id).padStart(3, "0")}</span>` +
      `<span class="fav-tile-name">—</span>`;
    li.addEventListener("click", () => { favIndex = i; openFavDetail(); });
    ul.appendChild(li);
    // fill the name async (cached) so the list shows image + number + name
    fetchName(id).then((name) => {
      const cell = li.querySelector(".fav-tile-name");
      if (cell) cell.textContent = name.replace(/-/g, " ");
    });
  });
  scrollFavIntoView();
}

// fetch a Pokémon's name (cached); used by the favorites tiles
async function fetchName(id) {
  try {
    const res = await fetch(`${API}/pokemon/${id}`, { cache: "force-cache" });
    if (!res.ok) return "";
    const data = await res.json();
    return data.name;
  } catch (_) { return ""; }
}

function moveFav(d) {
  if (!favs.length) return;
  favIndex = (favIndex + d + favs.length) % favs.length;
  $("favTiles").querySelectorAll(".fav-tile").forEach((t, i) =>
    t.classList.toggle("is-active", i === favIndex)
  );
  scrollFavIntoView();
}
function scrollFavIntoView() {
  const active = $("favTiles").querySelector(".fav-tile.is-active");
  if (active) active.scrollIntoView({ block: "nearest" });
}

function openFavDetail() {
  mode = "favorite";
  $("hintNav").textContent = "BROWSE";
  loadPokemon(favs[favIndex]);
}

// ---- cry ----
function stopCry() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  $("cryBtn").classList.remove("is-playing");
}
function playCry() {
  stopCry();
  if (muted) return;
  const btn = $("cryBtn");
  try {
    const audio = new Audio(CRY(currentId));
    audio.volume = 0.5;
    currentAudio = audio;
    btn.classList.add("is-playing");
    audio.addEventListener("ended", () => btn.classList.remove("is-playing"));
    audio.addEventListener("error", () => btn.classList.remove("is-playing"));
    audio.play().catch(() => btn.classList.remove("is-playing"));
  } catch (_) { btn.classList.remove("is-playing"); }
}

// ---- mute ----
function renderMute() {
  const btn = $("muteBtn");
  btn.textContent = muted ? "🔇" : "🔊";
  btn.classList.toggle("is-muted", muted);
  updateMuteHint();
}
// Hint under the sound icon — the gesture to toggle it (hold ▲), shown on every
// screen, consistent with the game.
function updateMuteHint() {
  $("muteHint").hidden = false;
  $("muteHint").innerHTML = `<span class="key"><span class="arrow">▲</span></span>&nbsp;HOLD`;
}
function toggleMute() {
  muted = !muted;
  localStorage.setItem("pdx-muted", muted ? "1" : "0");
  if (muted) stopCry();
  renderMute();
}

// ---- typed loading ----
let typeTimer = null;
function startTyping() {
  const full = "LOADING ENTRY";
  const el = $("typeText");
  let i = 0;
  clearInterval(typeTimer);
  el.textContent = "";
  typeTimer = setInterval(() => {
    if (i <= full.length) { el.textContent = full.slice(0, i); i++; }
    else { i = 0; el.textContent = ""; }
  }, 140);
}
function stopTyping() { clearInterval(typeTimer); typeTimer = null; }

// ---- menu / gen navigation ----
function renderMenu() {
  $("menuList").querySelectorAll(".menu-item").forEach((el, k) =>
    el.classList.toggle("is-active", k === menuIndex)
  );
}
function renderGenMenu() {
  $("genList").querySelectorAll(".menu-item").forEach((el, k) =>
    el.classList.toggle("is-active", k === genMenuIndex)
  );
}
function changeGen(d) {
  genIndex = (genIndex + d + GENERATIONS.length) % GENERATIONS.length;
  $("genName").textContent = GENERATIONS[genIndex].name;
}

function goMenu() { setAccent(null); menuIndex = 0; renderMenu(); renderMenuFavCount(); show("menu"); }
function goGen() { setAccent(null); genMenuIndex = 0; renderGenMenu(); show("gen"); }
function startCatalog() {
  mode = "catalog";
  $("hintNav").textContent = "BROWSE";
  const { min } = GENERATIONS[genIndex];
  loadPokemon(min);
}

// Go back one level, like a real app. Each screen knows its parent:
//   gen → menu, favs → menu, card(catalog) → gen, card(favorite) → favs.
// The menu (initial screen) has no back. Always triggered by hold ◀.
function goBack() {
  const active = SCREENS.find((s) => $(s).classList.contains("is-active"));
  if (active === "gen") goMenu();
  else if (active === "favs") goMenu();
  else if (active === "card") { mode === "favorite" ? openFavs() : goGen(); }
}

// ---- long-press handling for the card ----
// A quick tap (released within TAP_WINDOW) is the primary action — cry / prev.
// Only once you pass that window does Enter/◀ switch to its hold action, and
// only THEN does the toast appear, so a fast tap never flashes "★ SAVE".
const TAP_WINDOW = 220;
let holdTimer = null;
let toastTimer = null;
let holdFired = false;
function beginHold(label, action) {
  holdFired = false;
  // toast only shows after the tap window — i.e. once it's clearly a hold
  toastTimer = setTimeout(() => {
    $("holdLabel").textContent = label;
    $("holdToast").hidden = false;
    $("holdToast").classList.add("filling");
  }, TAP_WINDOW);
  holdTimer = setTimeout(() => {
    holdFired = true;
    endHoldUI();
    action();
  }, HOLD_MS);
}
function cancelHold() {
  clearTimeout(holdTimer);
  clearTimeout(toastTimer);
  holdTimer = toastTimer = null;
  endHoldUI();
}
function endHoldUI() {
  $("holdToast").hidden = true;
  $("holdToast").classList.remove("filling");
}

// A brief informational toast (no fill bar, auto-hides). Reuses the hold-toast
// element but in a plain flash mode.
let flashTimer = null;
function flashToast(label, ms = 1600) {
  $("holdLabel").textContent = label;
  $("holdToast").hidden = false;
  $("holdToast").classList.remove("filling");
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { $("holdToast").hidden = true; }, ms);
}

// Tap-Enter on the card. Audio on → cry. Audio off → first tap warns, a second
// tap within DOUBLE_TAP_MS re-enables sound and plays — so it never re-enables
// involuntarily, only on a deliberate double-tap.
const DOUBLE_TAP_MS = 400;
let awaitingEnableTap = false;
let enableTapTimer = null;
function handleEnterTap() {
  if (!muted) { playCry(); return; }
  if (awaitingEnableTap) {            // second tap → enable + play
    awaitingEnableTap = false;
    clearTimeout(enableTapTimer);
    toggleMute();                     // muted → false, persists, updates icon
    playCry();
    return;
  }
  awaitingEnableTap = true;           // first tap → warn, open the window
  flashToast("🔇 SOUND OFF · DOUBLE-TAP TO ENABLE");
  enableTapTimer = setTimeout(() => { awaitingEnableTap = false; }, DOUBLE_TAP_MS);
}

// ---- controls (mouse/touch — every action also works from the D-pad) ----
$("retryBtn").addEventListener("click", () => loadPokemon(currentId));
$("cryBtn").addEventListener("click", playCry);
$("favStar").addEventListener("click", () => toggleFav(currentId));
$("muteBtn").addEventListener("click", toggleMute);
$("menuList").querySelectorAll(".menu-item").forEach((el, k) =>
  el.addEventListener("click", () => {
    menuIndex = k; renderMenu();
    el.dataset.go === "favs" ? openFavs() : goGen();
  })
);
$("genList").querySelectorAll(".menu-item").forEach((el) =>
  el.addEventListener("click", () => startCatalog())
);
document.querySelectorAll(".gen-arrow").forEach((el) =>
  el.addEventListener("click", () => changeGen(Number(el.dataset.genDir)))
);
// click any back chip (web convenience) → go back
document.querySelectorAll(".back-hint").forEach((el) =>
  el.addEventListener("click", goBack)
);

// ---- keyboard / D-pad ----
const heldKeys = new Set();   // dedupe key auto-repeat for long-press

// Screens that have a parent — hold ◀ goes back. The menu (initial) has none.
const BACKABLE = new Set(["gen", "favs", "card"]);

document.addEventListener("keydown", (e) => {
  const active = SCREENS.find((s) => $(s).classList.contains("is-active"));

  // ----- SOUND: hold ▲ toggles mute on every screen except where ▲ is used to
  // navigate (menu list, favorites list, card view-switch). On those, ▲ keeps
  // its navigation role; sound is reachable from the menu's surrounding screens.
  // To keep it truly global we use hold ▲ everywhere and let a *tap* ▲ still do
  // the screen's normal up-action. -----

  // ----- MENU (initial screen, no back) -----
  if (active === "menu") {
    if (e.key === "ArrowUp") {
      // tap ▲ moves up; hold ▲ toggles sound
      if (!heldKeys.has("ArrowUp")) { heldKeys.add("ArrowUp"); beginHold(muted ? "🔊 SOUND ON" : "🔇 SOUND OFF", toggleMute); }
      e.preventDefault();
    }
    else if (e.key === "ArrowDown") { menuIndex = (menuIndex + 1) % 2; renderMenu(); e.preventDefault(); }
    else if (e.key === "Enter") { (menuIndex === 0 ? goGen() : openFavs()); e.preventDefault(); }
    return;
  }

  // ----- GENERATION PICKER -----
  if (active === "gen") {
    if (e.key === "ArrowLeft") {
      // tap ◀ = previous generation; hold ◀ = back to menu
      if (!heldKeys.has("ArrowLeft")) { heldKeys.add("ArrowLeft"); beginHold("◀ BACK", goBack); }
      e.preventDefault();
    }
    else if (e.key === "ArrowRight") { changeGen(1); e.preventDefault(); }
    else if (e.key === "ArrowUp") {
      if (!heldKeys.has("ArrowUp")) { heldKeys.add("ArrowUp"); beginHold(muted ? "🔊 SOUND ON" : "🔇 SOUND OFF", toggleMute); }
      e.preventDefault();
    }
    else if (e.key === "Enter") { startCatalog(); e.preventDefault(); }
    return;
  }

  // ----- FAVORITES LIST -----
  if (active === "favs") {
    if (e.key === "ArrowUp") {
      // tap ▲ moves up the list; hold ▲ toggles sound
      if (!heldKeys.has("ArrowUp")) { heldKeys.add("ArrowUp"); beginHold(muted ? "🔊 SOUND ON" : "🔇 SOUND OFF", toggleMute); }
      e.preventDefault();
    }
    else if (e.key === "ArrowDown") { moveFav(1); e.preventDefault(); }
    else if (e.key === "ArrowLeft") {
      if (!heldKeys.has("ArrowLeft")) { heldKeys.add("ArrowLeft"); beginHold("◀ BACK", goBack); }
      e.preventDefault();
    }
    else if (e.key === "Enter") { if (favs.length) openFavDetail(); e.preventDefault(); }
    return;
  }

  // ----- CARD (catalog or favorite detail) -----
  if (active === "card") {
    if (!$("errorBox").hidden && e.key === "Enter") { loadPokemon(currentId); e.preventDefault(); return; }

    if (e.key === "ArrowRight") {
      // next, within the current generation (catalog) or favorites list (favorite)
      if (mode === "catalog") loadPokemon(currentId + 1, { wrapWithin: GENERATIONS[genIndex] });
      else { favIndex = (favIndex + 1) % favs.length; loadPokemon(favs[favIndex]); }
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      // tap ◀ = previous; hold ◀ = back (catalog → gen, favorite → favs list)
      if (!heldKeys.has("ArrowLeft")) { heldKeys.add("ArrowLeft"); beginHold("◀ BACK", goBack); }
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      // tap ▲ = prev view; hold ▲ = sound
      if (!heldKeys.has("ArrowUp")) { heldKeys.add("ArrowUp"); beginHold(muted ? "🔊 SOUND ON" : "🔇 SOUND OFF", toggleMute); }
      e.preventDefault();
    }
    else if (e.key === "ArrowDown") { showView(viewIndex + 1); e.preventDefault(); }
    else if (e.key === "Enter") {
      // tap Enter = cry, hold Enter = toggle favorite
      if (!heldKeys.has("Enter")) {
        heldKeys.add("Enter");
        beginHold(isFav(currentId) ? "★ REMOVE" : "★ SAVE", () => toggleFav(currentId));
      }
      e.preventDefault();
    }
  }
});

document.addEventListener("keyup", (e) => {
  const active = SCREENS.find((s) => $(s).classList.contains("is-active"));

  // ▲ — tap does the screen's up-action, hold already fired sound
  if (e.key === "ArrowUp" && heldKeys.has("ArrowUp")) {
    heldKeys.delete("ArrowUp");
    if (!holdFired) {
      cancelHold();
      if (active === "menu") { menuIndex = (menuIndex + 1) % 2; renderMenu(); }   // 2 items: up == toggle
      else if (active === "favs") moveFav(-1);
      else if (active === "card") showView(viewIndex - 1);
    } else cancelHold();
    return;
  }

  // ◀ — tap: previous Pokémon (card) / previous generation (gen); hold = back
  if (e.key === "ArrowLeft" && heldKeys.has("ArrowLeft")) {
    heldKeys.delete("ArrowLeft");
    if (!holdFired) {
      cancelHold();
      if (active === "gen") changeGen(-1);
      else if (active === "card") {
        if (mode === "catalog") loadPokemon(currentId - 1, { wrapWithin: GENERATIONS[genIndex] });
        else { favIndex = (favIndex - 1 + favs.length) % favs.length; loadPokemon(favs[favIndex]); }
      }
    } else cancelHold();
    return;
  }

  // Enter — tap: cry (card); hold already fired save
  if (e.key === "Enter" && heldKeys.has("Enter")) {
    heldKeys.delete("Enter");
    if (!holdFired) { cancelHold(); if (active === "card") handleEnterTap(); }
    else cancelHold();
    return;
  }

  heldKeys.delete(e.key);
});

renderMute();
renderMenu();
renderMenuFavCount();
show("menu");
