const PEPES = [
  "cardpepeq.gif", "ch_pepe_ash.gif", "chippepeq.png", "harry_potter_pepeq.gif",
  "kangaroopepe.gif", "money-pepe.webp", "pepe-alarm.gif", "pepe-bored.png",
  "pepe-box-1q.gif", "pepe-brain.png", "pepe-christmas-cry.png", "pepe-clap.gif",
  "pepe-coffee.gif", "pepe-cold.gif", "pepe-cool.png", "pepe-couch.png",
  "pepe-cry.gif", "pepe-dance.gif", "pepe-dead.gif", "pepe-elf.gif",
  "pepe-eyeroll.png", "pepe-fight.gif", "pepe-firework.gif", "pepe-fu.gif",
  "pepe-happy-clap.gif", "pepe-hate.png", "pepe-heart.gif", "pepe-hehe.png",
  "pepe-jiji.gif", "pepe-lady.gif", "pepe-laser.png", "pepe-manager.gif",
  "pepe-mexico.gif", "pepe-money-2.png", "pepe-music.gif", "pepe-no.gif",
  "pepe-note.gif", "pepe-painter.gif", "pepe-peaceout.gif", "pepe-police.gif",
  "pepe-pomodoro-2.png", "pepe-pomodoro.png", "pepe-popcorn.gif", "pepe-rage.gif",
  "pepe-rain.gif", "pepe-rose.png", "pepe-rude.png", "pepe-sad.gif",
  "pepe-sick.gif", "pepe-sleep.gif", "pepe-smile.gif", "pepe-snack.png",
  "pepe-snow.gif", "pepe-suspicious.png", "pepe-thumbs-up.gif", "pepe-toilet.gif",
  "pepe-tomatoq.png", "pepe-yay.gif", "pepe_cheer.gif", "pepe_dance.gif",
  "pepe_dizzy.png", "pepe_enjoyingthisshit.gif", "pepe_middle-finger.gif",
  "pepe_swatq.png", "pepe_thiefq.png", "pepeace.png", "pepeblind.png",
  "pepeblueq.png", "pepebraq.png", "pepecozyxmasq.png", "pepecurtsy.gif",
  "pepegunq.png", "pepelasers.png", "pepemoney.gif", "pepeplead.png",
  "pepesantajamq.gif", "pepesoupq.gif", "pepetfusaye.png", "pepewashq.gif",
  "pepewtfq.gif", "pepezenq.gif", "piratepepedq.gif", "sadpepe.png",
  "scared_pepe.gif",
];

const BASE = "pepes/";

const reel = document.getElementById("reel");
const pepeImg = document.getElementById("pepe");
const footer = document.getElementById("footer");

// Deterministic pick from the date, so the same pepe shows all day.
function dayKey() {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

// A random per-person id, created once and kept in this browser. Mixing it into
// the pick means each person gets their own pepe for the day, not a shared one.
function personSeed() {
  let seed;
  try {
    seed = localStorage.getItem("pepeSeed");
    if (!seed) {
      seed = String(Math.floor(Math.random() * 1e9));
      localStorage.setItem("pepeSeed", seed);
    }
  } catch (e) {
    seed = "0";
  }
  return Number(seed);
}

function pepeForToday() {
  // Simple hash so consecutive days don't pick neighbours in the list.
  let x = dayKey() ^ (personSeed() * 2654435761);
  x = (x ^ (x >> 13)) * 0x5bd1e995;
  x = x ^ (x >> 15);
  const idx = Math.abs(x) % PEPES.length;
  return PEPES[idx];
}

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// Load a pepe as an Image object we can draw onto the canvas.
function load(name) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = BASE + name;
  });
}

// Draw one image centered. Shrink to fit 300×300, but never enlarge past
// native size — matches the chosen pepe's `max-*` + object-fit: contain.
function draw(img) {
  ctx.clearRect(0, 0, 300, 300);
  if (!img || !img.width) return;
  const scale = Math.min(300 / img.width, 300 / img.height, 1);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (300 - w) / 2, (300 - h) / 2, w, h);
}

const chosen = pepeForToday();

function land() {
  reel.classList.remove("spinning");
  canvas.hidden = true;
  pepeImg.hidden = false;
  pepeImg.src = BASE + chosen; // animated gif plays here
  reel.classList.add("landed");
  setTimeout(() => footer.classList.add("show"), 500);

  // Remember they've seen today's pepe, so we skip straight to it on return.
  try {
    localStorage.setItem("pepeSeen", String(dayKey()));
  } catch (e) {}
}

// Flash through static frames on the canvas — instant, never waits on a gif.
function run(frames) {
  reel.classList.add("spinning");
  let i = 0;
  const total = frames.length;

  function step() {
    draw(frames[i]);
    i++;

    if (i >= total) {
      land();
      return;
    }

    // fast and steady, easing out only near the very end
    const p = i / total;
    const delay = p < 0.78 ? 55 : 55 + Math.pow((p - 0.78) / 0.22, 2) * 340;
    setTimeout(step, delay);
  }

  step();
}

const cover = document.getElementById("cover");
const game = document.getElementById("game");

// Preload the roulette frames in the background while the cover shows.
const framesReady = (async () => {
  const pool = [];
  for (let i = 0; i < 26; i++) {
    pool.push(PEPES[Math.floor(Math.random() * PEPES.length)]);
  }
  const frames = await Promise.all(pool.map(load));
  frames.push(await load(chosen));
  return frames;
})();

let started = false;

async function start() {
  if (started) return;
  started = true;

  cover.hidden = true;
  game.hidden = false;

  const frames = await framesReady;
  setTimeout(() => run(frames), 200);
}

// Skip everything and show today's pepe at rest — no cover, no roulette.
function showResultInstant() {
  started = true;
  cover.hidden = true;
  game.hidden = false;
  canvas.hidden = true;
  pepeImg.hidden = false;
  pepeImg.src = BASE + chosen;
  reel.classList.add("landed");
  footer.classList.add("show");
}

function alreadyPlayedToday() {
  try {
    return localStorage.getItem("pepeSeen") === String(dayKey());
  } catch (e) {
    return false;
  }
}

if (alreadyPlayedToday()) {
  showResultInstant();
} else {
  // Enter (device primary action) or a tap starts the roulette.
  window.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      start();
    }
  });
  cover.addEventListener("click", start);
}
