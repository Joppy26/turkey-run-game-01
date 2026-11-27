// Gobble Run: the game loop, input, state machine, collisions and scoring, plus
// the deterministic ?shot= staging used for the entry's screenshots.
import { Turkey, GROUND_Y, mulberry32 } from './turkey.js';
import { Farmer } from './farmer.js';
import { World, KIND_CORN, KIND_FENCE, KIND_BALE, KIND_OVEN, KIND_KNIFE, KIND_GATE, KIND_HAYSTACK, ESCAPE_DISTANCE, stageFor, worldSpeed } from './kitchen.js';
import { GobbleAudio } from './audio.js';
import { drawHud, drawScreen, SCREEN_TITLE, SCREEN_PLAY, SCREEN_CAUGHT, SCREEN_ESCAPED } from './hud.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') || '20261127', 10);

const audio = new GobbleAudio();
const turkey = new Turkey();
const farmer = new Farmer();
const world = new World(seedParam);

let screen = SCREEN_TITLE;
let score = 0;
let lives = 3;
let best = 0;
let hint = '';
let hintTimer = 0;
let flashTimer = 0;
let flashColor = '#ffffff';
let lastTime = 0;
let keys = {};
let mouseX = null;
let shake = 0;

function announce(text) {
  statusEl.textContent = text;
}

function startRun() {
  turkey.reset();
  farmer.reset();
  world.reset();
  score = 0;
  lives = 3;
  hint = 'SPACE to jump — outrun the farmer!';
  hintTimer = 4;
  screen = SCREEN_PLAY;
  if (!shotName) {
    audio.ensure();
    audio.startMusic();
    audio.gobble();
  }
  announce('Run! Jump the fences, dodge the oven and the knife, reach the forest gate.');
}

function endRun(escaped) {
  screen = escaped ? SCREEN_ESCAPED : SCREEN_CAUGHT;
  audio.stopMusic();
  if (escaped) audio.escape();
  else audio.caught();
  if (score > best) best = score;
  announce(escaped ? `Escaped! Score ${score}.` : `Caught! Score ${score}. Press R to run again.`);
}

function hurt(kind) {
  lives -= 1;
  turkey.stun(0.7);
  farmer.gainGround(120);
  flashTimer = 0.25;
  flashColor = '#c0392b';
  shake = 8;
  audio.hit();
  if (lives <= 0) endRun(false);
  else announce(kind === 'burn' ? 'Burned by the oven! One life lost.' : 'Cut by the carving knife! One life lost.');
}

function trip(kind) {
  turkey.stun(0.45);
  farmer.gainGround(90);
  flashTimer = 0.18;
  flashColor = '#e8a13c';
  shake = 5;
  audio.hit();
  announce(kind === 'fence' ? 'Tripped on the fence! The farmer gains.' : 'Tripped over the hay bale! The farmer gains.');
}

function collectCorn(ob) {
  ob.hit = true;
  score += 10;
  audio.pickup();
  if (score % 100 === 0) {
    hint = '100 points! Keep gobbling!';
    hintTimer = 2;
  }
}

/** One fixed step of the run: move everything, check collisions, score. */
function stepRun(dt, move, wantJump, wantHide) {
  const speed = worldSpeed(world.distance);
  const stage = stageFor(world.distance);

  if (wantJump && turkey.jump()) audio.jump();
  if (wantHide) {
    const stack = world.haystackUnder(turkey);
    if (stack && turkey.hide()) {
      audio.hide();
      farmer.fallBack(60);
      hint = 'Hidden! The farmer is searching…';
      hintTimer = 2.2;
    }
  }

  turkey.update(dt, move, speed);
  world.update(dt, speed);
  farmer.update(dt, turkey, speed, turkey.hidden);

  // Clean running pulls away from the farmer; hiding loses him entirely.
  if (turkey.onGround && !turkey.hidden && turkey.stunTimer <= 0) farmer.fallBack(18 * dt);
  if (turkey.hidden) farmer.fallBack(40 * dt);

  // A hidden turkey is safe inside its haystack; once the stack has scrolled
  // past, the turkey is out in the open again.
  if (turkey.hidden && !world.haystackUnder(turkey)) turkey.unhide();

  for (const ob of world.obstacles) {
    if (ob.hit) continue;
    if (turkey.hidden) continue; // Buried in hay: fences, knives and ovens pass by.
    if (!World.overlaps(turkey, ob)) continue;
    if (ob.kind === KIND_CORN) {
      collectCorn(ob);
    } else if (ob.kind === KIND_GATE) {
      ob.hit = true;
      score += 250;
      endRun(true);
      return;
    } else if (ob.kind === KIND_HAYSTACK) {
      // Haystacks are soft: run through them, hide in them with S.
      continue;
    } else if (ob.kind === KIND_OVEN) {
      ob.hit = true;
      hurt('burn');
    } else if (ob.kind === KIND_KNIFE) {
      ob.hit = true;
      hurt('cut');
    } else if (ob.kind === KIND_FENCE || ob.kind === KIND_BALE) {
      ob.hit = true;
      trip(ob.kind);
    }
  }

  // Caught when the farmer closes the gap entirely on a turkey on the ground.
  // A jumping turkey sails over his grab; a hidden one is never found.
  if (farmer.gapTo(turkey) <= 0 && !turkey.hidden && turkey.onGround) {
    farmer.spot();
    endRun(false);
    return;
  }

  // Stage banners as the run moves from farmyard to barn to kitchen.
  const newStage = stageFor(world.distance);
  if (newStage !== stage) {
    hint = newStage === 1 ? 'Into the barn — mind the swinging knives!' : 'The kitchen! Dodge the oven and the carving knife!';
    hintTimer = 3.5;
    audio.spotted();
  }
  if (hintTimer > 0) {
    hintTimer -= dt;
    if (hintTimer <= 0) hint = '';
  }
  if (flashTimer > 0) flashTimer -= dt;
  if (shake > 0) shake = Math.max(0, shake - dt * 30);
}

function draw() {
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  const stage = stageFor(world.distance);
  world.draw(ctx, stage);
  farmer.draw(ctx);
  turkey.draw(ctx, performance.now() / 1000);
  if (screen === SCREEN_PLAY) {
    drawHud(ctx, {
      score,
      distance: world.distance,
      lives,
      best,
      farmerGap: farmer.gapTo(turkey),
      muted: audio.muted,
      hint,
    });
  } else {
    drawScreen(ctx, screen, { score, best, distance: world.distance });
  }
  if (flashTimer > 0) {
    ctx.fillStyle = flashColor;
    ctx.globalAlpha = flashTimer * 1.6;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function frame(time) {
  const dt = Math.min(0.05, (time - lastTime) / 1000 || 0.016);
  lastTime = time;
  if (screen === SCREEN_PLAY) {
    let move = 0;
    if (keys['arrowleft'] || keys['a']) move -= 1;
    if (keys['arrowright'] || keys['d']) move += 1;
    if (mouseX !== null) {
      const target = ((mouseX / canvas.clientWidth) * 1280 - 300) / 260;
      if (target > 0.4) move = 1;
      else if (target < -0.4) move = -1;
    }
    stepRun(dt, move, keys.jump || false, keys.hide || false);
    keys.jump = false;
    keys.hide = false;
  }
  draw();
  window.requestAnimationFrame(frame);
}

// ---- Input: keyboard and mouse ----

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key === ' ') event.preventDefault();
  audio.ensure();
  if (key === 'm') {
    audio.toggleMute();
    return;
  }
  if (screen === SCREEN_TITLE && (key === 'enter' || key === ' ')) {
    startRun();
    return;
  }
  if ((screen === SCREEN_CAUGHT || screen === SCREEN_ESCAPED) && (key === 'r' || key === 'enter' || key === ' ')) {
    startRun();
    return;
  }
  if (screen !== SCREEN_PLAY) return;
  if (key === ' ' || key === 'arrowup' || key === 'w') keys.jump = true;
  if (key === 's' || key === 'arrowdown') keys.hide = true;
  if (key === 'p') {
    screen = SCREEN_TITLE;
    audio.stopMusic();
    return;
  }
  keys[key] = true;
});

window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false;
});

canvas.addEventListener('pointermove', (event) => {
  mouseX = event.clientX;
});

canvas.addEventListener('pointerdown', (event) => {
  audio.ensure();
  if (screen === SCREEN_TITLE || screen === SCREEN_CAUGHT || screen === SCREEN_ESCAPED) {
    startRun();
    return;
  }
  if (screen === SCREEN_PLAY) {
    if (event.clientY > canvas.clientHeight * 0.75) keys.hide = true;
    else keys.jump = true;
  }
});

// ---- Screenshot staging: ?shot=title|play|caught|escaped ----

/** Would the turkey land on another hazard if it jumped now? */
function landingClear(speed, jumping) {
  const landX = turkey.x + 0.82 * speed;
  for (const ob of world.obstacles) {
    if (ob.hit || ob === jumping) continue;
    if (ob.kind === KIND_CORN || ob.kind === KIND_HAYSTACK || ob.kind === KIND_GATE) continue;
    const obRight = ob.kind === KIND_KNIFE ? ob.x + Math.sin(ob.swing) * 80 + 12 : ob.x + ob.w;
    const obLeft = ob.kind === KIND_KNIFE ? ob.x + Math.sin(ob.swing) * 80 - 12 : ob.x;
    if (obRight > landX + 6 && obLeft < landX + 58) return false;
  }
  return true;
}

/** Simple autopilot: jump over ground hazards, hide when the farmer is close. */
function autopilot() {
  const speed = worldSpeed(world.distance);
  let wantJump = false;
  let wantHide = false;
  let move = 0;
  for (const ob of world.obstacles) {
    if (ob.hit) continue;
    const ahead = ob.x - turkey.x;
    if (ahead > 0 && ahead < speed * 0.42) {
      if (ob.kind === KIND_FENCE || ob.kind === KIND_BALE || ob.kind === KIND_OVEN) {
        if (landingClear(speed, ob)) wantJump = true;
        else move = -1;
      }
      // A knife's blade sweeps sideways: jump only while it is swung aside,
      // and hold back (move left) while it hangs over the turkey's path.
      if (ob.kind === KIND_KNIFE) {
        if (Math.abs(Math.sin(ob.swing)) > 0.4 && landingClear(speed, ob)) wantJump = turkey.onGround;
        else if (ahead < speed * 0.2) move = -1;
      }
    }
    if (ob.kind === KIND_HAYSTACK && ahead > -20 && ahead < 60 && farmer.gapTo(turkey) < 200) wantHide = true;
  }
  // Never back toward the farmer when he is already close: a stumble then
  // is a catch. Jump the hazard instead and take the hit if it comes.
  if (move === -1 && farmer.gapTo(turkey) < 170) move = 0;
  return { wantJump, wantHide, move };
}

/** Run the real rules forward for `seconds` with the autopilot steering. */
function simulate(seconds, pilot) {
  const step = 1 / 60;
  for (let t = 0; t < seconds; t += step) {
    if (screen !== SCREEN_PLAY) break;
    const input = pilot === 'none' ? { wantJump: false, wantHide: false, move: 0 } : autopilot();
    stepRun(step, input.move || 0, input.wantJump, input.wantHide);
  }
}

function stageShot(name) {
  startRun();
  if (name === 'title') {
    screen = SCREEN_TITLE;
    return;
  }
  if (name === 'play') {
    // A lively mid-run frame in the kitchen: oven, swinging knife, corn, and
    // the farmer closing in behind the turkey.
    const playSeconds = Number.parseFloat(params.get('playsecs') || '52');
    simulate(playSeconds, 'good');
    if (screen === SCREEN_PLAY) {
      farmer.x = turkey.x - 190;
      score = Math.max(score, 120);
      lives = 2;
    }
    return;
  }
  if (name === 'caught') {
    // A hurried turkey that never jumps gets run down in the farmyard.
    simulate(9, 'none');
    if (screen === SCREEN_PLAY) {
      farmer.x = turkey.x - 40;
      lives = 1;
      endRun(false);
    }
    return;
  }
  if (name === 'escaped') {
    // Play the whole run with the autopilot. A run this long can end caught on
    // an unlucky seed, so retry a few seeds: the first escape is the shot.
    for (let attempt = 0; attempt < 6; attempt += 1) {
      world.seed = seedParam + attempt;
      startRun();
      simulate(75, 'good');
      if (screen === SCREEN_ESCAPED) break;
      if (screen === SCREEN_PLAY) {
        world.distance = ESCAPE_DISTANCE - 40;
        simulate(3, 'good');
        if (screen === SCREEN_ESCAPED) break;
      }
    }
    if (screen === SCREEN_PLAY) endRun(true);
    return;
  }
  screen = SCREEN_TITLE;
}

// ---- Boot ----

if (shotName) {
  // Screenshot staging runs with no user gesture, so keep it silent.
  audio.muted = true;
  stageShot(shotName);
  draw();
} else {
  draw();
  window.requestAnimationFrame((time) => {
    lastTime = time;
    window.requestAnimationFrame(frame);
  });
}

// Expose a little state for play-testing from the console.
window.gobbleRun = { startRun, simulate, autopilot, get screen() { return screen; }, get score() { return score; }, get lives() { return lives; }, get distance() { return Math.floor(world.distance); }, get farmerGap() { return Math.floor(farmer.gapTo(turkey)); }, get farmerState() { return farmer.state; }, get obstacles() { return world.obstacles.map((o) => ({ kind: o.kind, x: Math.floor(o.x) })); }, get turkey() { return { x: Math.floor(turkey.x), y: Math.floor(turkey.y), hidden: turkey.hidden, stun: +turkey.stunTimer.toFixed(2) }; } };
