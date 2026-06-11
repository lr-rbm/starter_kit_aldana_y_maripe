const ANSWERS = [
  "Sure. What could possibly go wrong?",
  "Technically, yes.",
  "I’d lower your expectations.",
  "Proceed with unnecessary confidence.",
  "You already know the answer.",
  "My lawyers advise against answering.",
  "Signs point to “good luck with that.”",
  "Even Google isn’t sure.",
  "Try again after coffee.",
  "That’s above my pay grade.",
  "Error 404: certainty not found.",
  "I’d flip a coin instead.",
  "This feels like a future problem.",
  "Respectfully... no.",
  "Have you considered making better choices?",
  "The answer is yes, but I wouldn’t.",
  "It’s a no from me, and frankly from everyone.",
  "Maybe. Your track record concerns me.",
  "This sounds like an HR issue.",
  "The moon says “lol.”",
  "My crystal ball needs a software update.",
  "Go fuck yourself.",
];

const ball = document.getElementById("ball");
const answer = document.getElementById("answer");
const caption = document.getElementById("caption");
const hint = document.getElementById("hint");

let lastIndex = -1;
let busy = false;

function pick() {
  let i;
  do {
    i = Math.floor(Math.random() * ANSWERS.length);
  } while (i === lastIndex && ANSWERS.length > 1);
  lastIndex = i;
  return ANSWERS[i];
}

const MAX_FONT = 18;
const MIN_FONT = 11;
const MAX_LINES = 2;

// Width available to the text. The triangle points up, so its width at depth
// d (0 = apex, 1 = base) is W * d. The text block is vertically centered at
// TEXT_CENTER of the triangle's height; its TOP edge is the narrowest point it
// occupies, so we size against the width there to guarantee no overflow.
const TEXT_CENTER = 0.64; // matches .answer { top: 64% }
function usableWidth() {
  const tri = answer.parentElement; // .triangle
  const triH = tri.offsetHeight;
  const triW = tri.offsetWidth;
  // top edge of the text block, as a fraction of triangle height
  const topY = TEXT_CENTER * triH - answer.offsetHeight / 2;
  const depth = Math.max(0, Math.min(1, topY / triH));
  return triW * depth * 0.82; // 0.82 = inset off the slanted edges
}

// Split a phrase into at most two balanced lines at the nearest space to the
// midpoint, so the longest line is as short as possible.
function bestTwoLines(text) {
  const spaces = [];
  for (let i = 0; i < text.length; i++) if (text[i] === " ") spaces.push(i);
  if (!spaces.length) return [text];
  const mid = text.length / 2;
  let best = spaces[0];
  for (const s of spaces) {
    if (Math.abs(s - mid) < Math.abs(best - mid)) best = s;
  }
  return [text.slice(0, best), text.slice(best + 1)];
}

// Shrink font (then letter-spacing) until the rendered text fits the triangle
// width without clipping. Wraps to two lines if a single line won't fit.
function fitAnswer(text) {
  answer.style.letterSpacing = "0";
  answer.textContent = text;

  // try one line, shrinking font down to MIN_FONT
  for (let size = MAX_FONT; size >= MIN_FONT; size--) {
    answer.style.fontSize = size + "px";
    answer.textContent = text;
    if (answer.scrollWidth <= usableWidth()) return;
  }

  // single line won't fit even at MIN_FONT — wrap to two lines
  const lines = bestTwoLines(text);
  if (lines.length === MAX_LINES) {
    for (let size = MAX_FONT; size >= MIN_FONT; size--) {
      answer.style.fontSize = size + "px";
      answer.textContent = lines.join("\n");
      const longest = Math.max(...lines.map((l) => measureLine(l, size)));
      if (longest <= usableWidth()) return;
    }
    // still too wide at MIN_FONT — tighten letter-spacing before giving up
    answer.style.fontSize = MIN_FONT + "px";
    answer.textContent = lines.join("\n");
    for (let ls = 0; ls >= -1; ls -= 0.25) {
      answer.style.letterSpacing = ls + "px";
      const longest = Math.max(...lines.map((l) => measureLine(l, MIN_FONT)));
      if (longest <= usableWidth()) return;
    }
  }
}

// Measure a single line's pixel width at a given font size, off-screen.
const _meas = document.createElement("span");
_meas.style.cssText =
  "position:absolute;visibility:hidden;white-space:nowrap;font-family:'Space Grotesk',sans-serif;font-weight:700;";
document.body.appendChild(_meas);
function measureLine(line, size) {
  _meas.style.fontSize = size + "px";
  _meas.style.letterSpacing = answer.style.letterSpacing || "0";
  _meas.textContent = line;
  return _meas.offsetWidth;
}

function ask() {
  if (busy) return;
  busy = true;
  hint.classList.add("hidden");

  answer.classList.add("fade");
  caption.classList.remove("show");
  ball.classList.add("shaking");

  setTimeout(() => {
    const phrase = pick();
    answer.classList.remove("eight");
    fitAnswer(phrase);
    caption.textContent = phrase;
  }, 300);

  setTimeout(() => {
    ball.classList.remove("shaking");
    answer.classList.remove("fade");
    caption.classList.add("show");
  }, 600);

  setTimeout(() => {
    busy = false;
  }, 700);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === "ArrowUp" || e.key === "ArrowDown" ||
      e.key === "ArrowLeft" || e.key === "ArrowRight") {
    e.preventDefault();
    ask();
  }
});

document.addEventListener("click", ask);
document.addEventListener("touchstart", (e) => {
  e.preventDefault();
  ask();
}, { passive: false });

// Head-shake activation via DeviceOrientationEvent. A "shake" is rapid
// oscillation in ANY direction: we track angular velocity across beta
// (forward/back) and gamma (side/side) and require several direction
// reversals within a short window. Debounced 1000ms. Fails silently if
// the sensor is unavailable or permission is denied.
(function setupShake() {
  if (!window.DeviceOrientationEvent) return;

  const VEL_THRESHOLD = 120; // deg/s — how fast a reversal must be to count
  const REVERSALS_NEEDED = 3; // direction flips to call it a shake
  const SHAKE_WINDOW = 700; // ms — flips must happen within this span
  const DEBOUNCE = 1000; // ms lockout after firing

  let prev = null; // { t, beta, gamma }
  let prevDir = 0; // sign of last significant motion (combined axes)
  let reversals = []; // timestamps of recent direction reversals
  let lastFire = 0;

  function onOrientation(e) {
    if (e.beta == null && e.gamma == null) return;
    const beta = e.beta || 0;
    const gamma = e.gamma || 0;
    const now = Date.now();

    if (!prev) {
      prev = { t: now, beta, gamma };
      return;
    }

    const dt = (now - prev.t) / 1000;
    if (dt <= 0) return;

    // angular speed on each axis, take the dominant one as the motion signal
    const vBeta = (beta - prev.beta) / dt;
    const vGamma = (gamma - prev.gamma) / dt;
    const v = Math.abs(vBeta) >= Math.abs(vGamma) ? vBeta : vGamma;
    prev = { t: now, beta, gamma };

    if (Math.abs(v) < VEL_THRESHOLD) return; // too slow to be part of a shake

    const dir = v > 0 ? 1 : -1;
    if (prevDir !== 0 && dir !== prevDir) {
      reversals.push(now);
      reversals = reversals.filter((t) => now - t <= SHAKE_WINDOW);
      if (reversals.length >= REVERSALS_NEEDED && now - lastFire > DEBOUNCE) {
        lastFire = now;
        reversals = [];
        ask();
      }
    }
    prevDir = dir;
  }

  function attach() {
    window.addEventListener("deviceorientation", onOrientation);
  }

  // iOS 13+ gates the sensor behind a permission prompt; request on first tap.
  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    const requestOnce = () => {
      DeviceOrientationEvent.requestPermission()
        .then((state) => {
          if (state === "granted") attach();
        })
        .catch(() => {});
      document.removeEventListener("click", requestOnce);
      document.removeEventListener("touchstart", requestOnce);
    };
    document.addEventListener("click", requestOnce);
    document.addEventListener("touchstart", requestOnce);
  } else {
    attach();
  }
})();
