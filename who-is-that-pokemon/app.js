const API = "https://pokeapi.co/api/v2";
const ARTWORK = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
const CRY = (id) => `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`;

// National-dex ranges per region. Picking a region keeps the guessing fair —
// you don't want an obscure Gen 9 mon when you only know Kanto.
const REGIONS = [
  { name: "KANTO · GEN 1", min: 1, max: 151 },
  { name: "JOHTO · +GEN 2", min: 1, max: 251 },
  { name: "HOENN · +GEN 3", min: 1, max: 386 },
  { name: "ALL REGIONS", min: 1, max: 1025 },
];

const TIMER_MS = 8000;
const LOW_MS = 3000;   // bar turns red under this

const $ = (id) => document.getElementById(id);
const SCREENS = ["intro", "loading", "playing", "revealed", "gameover", "win", "error"];

const MAX_LIVES = 3;

let regionIndex = 0;
let score = 0;
let streak = 0;
let lives = MAX_LIVES;
let best = Number(localStorage.getItem("witp-best") || 0);   // best streak, persisted
let solvedIds = new Set();   // Pokémon correctly guessed this game — never repeat, win when all done

// current round
let answer = null;        // { id, name }
let options = [];         // 4 names
let selected = 0;
let locked = false;       // true once answered, ignore further guesses
let timerId = null;
let token = 0;            // guards against a slow fetch landing after we moved on

// long-press state (declared up here so show() can cancel any pending hold —
// otherwise a hold started on one screen can fire its action on the next,
// which was causing the game to jump back to the intro unexpectedly)
let holdTimer = null, toastTimer = null, holdFired = false;
const heldKeys = new Set();

function show(screen) {
  // changing screens always clears any in-flight long-press so its timer can't
  // fire on the new screen
  cancelHold();
  holdFired = false;
  heldKeys.clear();
  SCREENS.forEach((s) => $(s).classList.toggle("is-active", s === screen));
}

function rand(min, max) {
  // deterministic-free randomness is fine here — it's a game
  return min + Math.floor(Math.random() * (max - min + 1));
}

// How many Pokémon must be solved to win the current region.
function regionSize() {
  const { min, max } = REGIONS[regionIndex];
  return max - min + 1;
}

let lastAnswerId = null;   // for a 1-round cooldown so a miss doesn't repeat immediately

// Build a round: the answer is a Pokémon NOT yet solved this game (correct ones
// never repeat; a missed one returns to the pool but not in the very next round).
// Returns null when every Pokémon in the region is solved — that's a win.
function pickRound() {
  const { min, max } = REGIONS[regionIndex];
  if (solvedIds.size >= regionSize()) return null;   // nothing left → win

  // unsolved candidates for the answer
  const unsolved = [];
  for (let id = min; id <= max; id++) if (!solvedIds.has(id)) unsolved.push(id);

  // prefer candidates other than the one just shown (avoid back-to-back repeats),
  // unless the last one is the only candidate left (the very end of the game)
  let pool = unsolved.filter((id) => id !== lastAnswerId);
  if (pool.length === 0) pool = unsolved;   // only the last one remains → allow it

  const answerId = pool[Math.floor(Math.random() * pool.length)];
  lastAnswerId = answerId;

  // three distinct distractors, different from the answer (solved ones are fine
  // as decoys — only the answer must be unsolved)
  const ids = new Set([answerId]);
  while (ids.size < 4) ids.add(rand(min, max));

  // shuffle so the answer isn't always in the same slot
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return { ids: arr, answerId };
}

async function fetchName(id) {
  const res = await fetch(`${API}/pokemon/${id}`, { cache: "force-cache" });
  if (!res.ok) throw new Error("not ok");
  const data = await res.json();
  return data.name;
}

// ---- typed loading ----
let typeTimer = null;
function startTyping() {
  const full = "WHO'S THAT...";
  const el = $("typeText");
  let i = 0;
  clearInterval(typeTimer);
  el.textContent = "";
  typeTimer = setInterval(() => {
    if (i <= full.length) { el.textContent = full.slice(0, i); i++; }
    else { i = 0; el.textContent = ""; }
  }, 120);
}
function stopTyping() { clearInterval(typeTimer); typeTimer = null; }

// Start a fresh game from the intro: reset lives/score/solved, then load round 1.
function startGame() {
  score = 0;
  streak = 0;
  lives = MAX_LIVES;
  solvedIds = new Set();
  lastAnswerId = null;
  newRound();
}

async function newRound() {
  const myToken = ++token;
  clearTimer();
  locked = false;
  selected = -1;          // nothing highlighted until the player moves
  renderLives();
  // clear the previous silhouette immediately so the old Pokémon never flashes
  // while the next one loads
  $("silhouette").removeAttribute("src");

  const round = pickRound();
  if (!round) { gameWin(); return; }   // every Pokémon solved → win

  show("loading");
  startTyping();
  try {
    const { ids, answerId } = round;
    const names = await Promise.all(ids.map(fetchName));
    if (myToken !== token) return;
    const answerSlot = ids.indexOf(answerId);
    answer = { id: answerId, name: names[answerSlot] };
    options = names;

    // preload the silhouette fully before showing the board, so it appears at
    // once instead of popping in (and never shows the prior round's image)
    await new Promise((res) => {
      const img = new Image();
      img.onload = img.onerror = res;
      img.src = ARTWORK(answerId);
    });
    if (myToken !== token) return;
    $("silhouette").src = ARTWORK(answerId);

    renderOptions();
    stopTyping();
    show("playing");
    startTimer();
  } catch (_) {
    if (myToken === token) { stopTyping(); show("error"); }
  }
}

function renderOptions() {
  const btns = $("options").querySelectorAll(".option");
  btns.forEach((b, i) => {
    b.textContent = options[i] ? options[i].replace(/-/g, " ") : "";
    b.classList.toggle("is-selected", i === selected);
  });
}

function moveSelection(d) {
  if (locked) return;
  // first key press lands on a cell instead of jumping from "nothing selected"
  if (selected === -1) selected = d > 0 ? 0 : 3;
  else selected = (selected + d + 4) % 4;   // 2×2 grid: ◀▶ column, ▲▼ row
  renderOptions();
}

function startTimer() {
  const bar = $("timerFill");
  const wrap = bar.parentElement;
  wrap.classList.remove("low");
  // restart the CSS animation from full
  bar.classList.remove("run");
  void bar.offsetWidth;            // force reflow so the animation re-triggers
  bar.style.animationDuration = TIMER_MS + "ms";
  bar.classList.add("run");
  setTimeout(() => wrap.classList.add("low"), TIMER_MS - LOW_MS);
  // time's up: if the player already had an option highlighted, count it as
  // their answer; only a truly untouched board is a "no answer".
  timerId = setTimeout(() => answerWith(selected >= 0 ? options[selected] : null), TIMER_MS);
}

function clearTimer() {
  clearTimeout(timerId);
  timerId = null;
  $("timerFill").classList.remove("run");
  $("timerFill").parentElement.classList.remove("low");
}

// guess = chosen name, or null when the timer ran out
function answerWith(guess) {
  if (locked) return;
  locked = true;
  clearTimer();
  const correct = guess === answer.name;

  if (correct) {
    score++; streak++;
    solvedIds.add(answer.id);      // mark as solved so it never repeats; win when all done
    if (streak > best) { best = streak; localStorage.setItem("witp-best", String(best)); }
  } else {
    streak = 0;
    lives--;                       // a miss (or timeout) costs a life
  }

  $("verdict").textContent = correct ? "CORRECT!" : (guess ? "NOPE!" : "TIME'S UP!");
  $("verdict").className = "verdict " + (correct ? "good" : "bad");

  // base silhouette stays put; the colored sprite fades in over it
  $("revealSilhouette").src = ARTWORK(answer.id);
  // restart the fade each round
  const sprite = $("revealSprite");
  sprite.style.animation = "none";
  void sprite.offsetWidth;
  sprite.style.animation = "";
  sprite.src = ARTWORK(answer.id);
  $("revealName").textContent = answer.name.replace(/-/g, " ");
  $("revealScore").innerHTML =
    `SCORE <b>${score}</b> · ${renderLivesText()} · BEST <b>${best}</b>`;

  show("revealed");
  playCry(answer.id);
}

function renderLivesText() {
  return "LIVES <b>" + "♥".repeat(Math.max(0, lives)) + "</b>";
}

function renderLives() {
  $("lives").innerHTML = Array.from({ length: MAX_LIVES }, (_, i) =>
    `<span class="life${i < lives ? "" : " lost"}">♥</span>`
  ).join("");
  renderProgress();
}

// "solved / total" for the current region — shows how much of the gen is done
function renderProgress() {
  $("progress").textContent = `${solvedIds.size} / ${regionSize()}`;
}

function gameOver() {
  $("gameoverStats").innerHTML =
    `SOLVED <b>${score}</b><br>BEST STREAK <b>${best}</b>`;
  show("gameover");
}

// Won the whole region — every Pokémon guessed correctly.
function gameWin() {
  clearTimer();
  markRegionWon(regionIndex);
  $("winStats").innerHTML =
    `You caught all <b>${regionSize()}</b> of<br>${REGIONS[regionIndex].name}!`;
  show("win");
  playCry(answer ? answer.id : 25);   // a celebratory cry
}

// ---- cry (silent fallback) ----
let currentAudio = null;
let muted = localStorage.getItem("witp-muted") === "1";

function playCry(id) {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if (muted) return;
  try {
    const audio = new Audio(CRY(id));
    audio.volume = 0.5;
    currentAudio = audio;
    audio.play().catch(() => {});
  } catch (_) { /* no audio — fine */ }
}

function renderMute() {
  const btn = $("muteBtn");
  btn.textContent = muted ? "🔇" : "🔊";
  btn.classList.toggle("is-muted", muted);
}

function toggleMute() {
  muted = !muted;
  localStorage.setItem("witp-muted", muted ? "1" : "0");
  if (muted && currentAudio) { currentAudio.pause(); currentAudio = null; }
  renderMute();
}

// Regions the player has fully completed (won), persisted. Stored as a set of
// region indices.
let wonRegions = new Set(JSON.parse(localStorage.getItem("witp-won") || "[]"));

function markRegionWon(i) {
  wonRegions.add(i);
  localStorage.setItem("witp-won", JSON.stringify([...wonRegions]));
}

function changeRegion(d) {
  regionIndex = (regionIndex + d + REGIONS.length) % REGIONS.length;
  renderRegion();
}

// Update the intro picker: name, Pokémon count, and the ★ if this region is won.
function renderRegion() {
  const r = REGIONS[regionIndex];
  $("genName").textContent = r.name;
  $("genCount").textContent = `${r.max - r.min + 1} POKÉMON`;
  $("genWon").hidden = !wonRegions.has(regionIndex);
}

function backToIntro() {
  clearTimer();
  const s = $("introScore");
  if (best > 0) {
    s.hidden = false;
    s.innerHTML = `BEST STREAK <b>${best}</b>`;
  }
  show("intro");
}

// ---- long-press (hold ◀ = menu on reveal, hold ▲ = mute on playing) ----
// A tap does the normal thing; the toast only appears after TAP_WINDOW so a
// quick tap never flashes it. HOLD_MS completes the hold action.
const HOLD_MS = 600;
const TAP_WINDOW = 200;

function beginHold(label, action) {
  holdFired = false;
  toastTimer = setTimeout(() => {
    $("holdLabel").textContent = label;
    $("holdToast").hidden = false;
    $("holdToast").classList.add("filling");
  }, TAP_WINDOW);
  holdTimer = setTimeout(() => { holdFired = true; endHoldUI(); action(); }, HOLD_MS);
}
function cancelHold() {
  clearTimeout(holdTimer); clearTimeout(toastTimer);
  holdTimer = toastTimer = null;
  endHoldUI();
}
function endHoldUI() {
  $("holdToast").hidden = true;
  $("holdToast").classList.remove("filling");
}

// ---- controls (mouse/touch — every action also works from the D-pad) ----
$("retryBtn").addEventListener("click", newRound);
$("options").querySelectorAll(".option").forEach((b) => {
  b.addEventListener("click", () => {
    if (locked) return;
    selected = Number(b.dataset.i);
    renderOptions();
    answerWith(options[selected]);
  });
});

// intro: region arrows + START
document.querySelectorAll(".gen-arrow").forEach((a, i) =>
  a.addEventListener("click", () => changeRegion(i === 0 ? -1 : 1))
);
document.querySelector(".start-cta").addEventListener("click", startGame);
// reveal: NEXT → next round, or game over if out of lives
document.querySelector(".next-cta").addEventListener("click", advance);
// mute toggle button (works on every screen via mouse/touch)
$("muteBtn").addEventListener("click", toggleMute);

// from the reveal screen: go to next round, or end the game if no lives left
function advance() {
  if (lives <= 0) gameOver();
  else newRound();
}

document.addEventListener("keydown", (e) => {
  const active = SCREENS.find((s) => $(s).classList.contains("is-active"));

  // win screen: any key returns to the menu
  if (active === "win") { backToIntro(); e.preventDefault(); return; }

  // hold ▲ toggles sound on EVERY screen (consistent everywhere)
  if (e.key === "ArrowUp" && active !== "playing") {
    if (!heldKeys.has("ArrowUp")) { heldKeys.add("ArrowUp"); beginHold(muted ? "🔊 SOUND ON" : "🔇 SOUND OFF", toggleMute); }
    e.preventDefault();
    return;
  }

  if (active === "intro") {
    if (e.key === "ArrowLeft") { changeRegion(-1); e.preventDefault(); }
    else if (e.key === "ArrowRight") { changeRegion(1); e.preventDefault(); }
    else if (e.key === "Enter") { startGame(); e.preventDefault(); }
  } else if (active === "playing") {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { moveSelection(e.key === "ArrowLeft" ? -1 : 1); e.preventDefault(); }
    else if (e.key === "ArrowDown") { moveSelection(2); e.preventDefault(); }
    else if (e.key === "ArrowUp") {
      // tap ▲ = move up a row, hold ▲ = toggle sound
      if (!heldKeys.has("ArrowUp")) { heldKeys.add("ArrowUp"); beginHold(muted ? "🔊 SOUND ON" : "🔇 SOUND OFF", toggleMute); }
      e.preventDefault();
    }
    else if (e.key === "Enter") { if (selected >= 0) answerWith(options[selected]); e.preventDefault(); }
  } else if (active === "revealed") {
    if (e.key === "Enter") { advance(); e.preventDefault(); }
    else if (e.key === "ArrowLeft") {
      // hold ◀ = back to intro; a quick accidental tap does nothing
      if (!heldKeys.has("ArrowLeft")) { heldKeys.add("ArrowLeft"); beginHold("◀ BACK", backToIntro); }
      e.preventDefault();
    }
  } else if (active === "gameover") {
    if (e.key === "Enter") { backToIntro(); e.preventDefault(); }
  } else if (active === "error") {
    if (e.key === "Enter") { newRound(); e.preventDefault(); }
  }
});

document.addEventListener("keyup", (e) => {
  const active = SCREENS.find((s) => $(s).classList.contains("is-active"));

  if (e.key === "ArrowUp" && heldKeys.has("ArrowUp")) {
    heldKeys.delete("ArrowUp");
    // in playing a quick tap moves the selection up; elsewhere ▲ is sound-only
    if (!holdFired && active === "playing") { cancelHold(); moveSelection(-2); }
    else cancelHold();
  } else if (active === "revealed" && e.key === "ArrowLeft" && heldKeys.has("ArrowLeft")) {
    heldKeys.delete("ArrowLeft");
    cancelHold();                                          // tap ◀ → nothing (only hold acts)
  } else {
    heldKeys.delete(e.key);
  }
});

renderMute();
renderRegion();
show("intro");
