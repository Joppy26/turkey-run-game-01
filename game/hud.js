// Gobble Run HUD and screens: the score bar, the farmer-proximity gauge, and the
// title, caught and escaped screens, all drawn on the canvas.
import { ESCAPE_DISTANCE, stageName } from './kitchen.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_ESCAPED = 'escaped';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(43, 26, 14, 0.72)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 210, 62, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** The in-run HUD: score, distance, lives, stage and how close the farmer is. */
export function drawHud(ctx, state) {
  const { score, distance, lives, best, farmerGap, muted } = state;
  panel(ctx, 16, 14, 560, 64);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 26px Georgia, serif';
  ctx.fillText(`SCORE ${score}`, 32, 44);
  ctx.fillStyle = '#fff3c9';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText(`${Math.floor(distance)} m / ${ESCAPE_DISTANCE} m`, 220, 42);
  ctx.fillStyle = '#ff8a5a';
  ctx.font = 'bold 20px Georgia, serif';
  let hearts = '';
  for (let i = 0; i < 3; i += 1) hearts += i < lives ? '♥ ' : '♡ ';
  ctx.fillText(hearts, 430, 42);
  ctx.fillStyle = '#fff3c9';
  ctx.font = '16px Georgia, serif';
  ctx.fillText(`Best ${best}`, 32, 68);

  // Stage banner, top centre.
  panel(ctx, 600, 14, 300, 40);
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(stageName(distance), 750, 42);

  // Farmer proximity gauge, top right: the redder it gets, the closer he is.
  panel(ctx, 920, 14, 344, 64);
  ctx.fillStyle = '#fff3c9';
  ctx.font = 'bold 16px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('FARMER', 936, 36);
  const closeness = Math.max(0, Math.min(1, 1 - farmerGap / 420));
  const barW = 200;
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(936, 44, barW, 16);
  const grad = ctx.createLinearGradient(936, 0, 936 + barW, 0);
  grad.addColorStop(0, '#7ab85a');
  grad.addColorStop(0.6, '#e8a13c');
  grad.addColorStop(1, '#c0392b');
  ctx.fillStyle = grad;
  ctx.fillRect(936, 44, barW * closeness, 16);
  ctx.fillStyle = closeness > 0.75 ? '#ff5a3c' : '#fff3c9';
  ctx.font = 'bold 16px Georgia, serif';
  ctx.fillText(closeness > 0.75 ? 'RUN!' : closeness > 0.45 ? 'CLOSE!' : 'safe…', 1148, 58);
  ctx.fillStyle = '#fff3c9';
  ctx.font = '15px Georgia, serif';
  ctx.fillText(muted ? 'M: sound off' : 'M: sound on', 936, 74);

  // Context hint while the turkey runs.
  if (state.hint) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff3c9';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText(state.hint, 640, 690);
  }
}

function drawTitleScreen(ctx, best) {
  ctx.fillStyle = 'rgba(43, 26, 14, 0.45)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 84px Georgia, serif';
  ctx.fillText('GOBBLE RUN', 640, 170);
  ctx.fillStyle = '#fff3c9';
  ctx.font = 'italic 30px Georgia, serif';
  ctx.fillText('The turkey that refused to be dinner.', 640, 220);
  ctx.fillStyle = '#ff8a5a';
  ctx.font = 'bold 24px Georgia, serif';
  ctx.fillText('Thanksgiving is coming. The farmer is coming faster.', 640, 262);

  panel(ctx, 340, 300, 600, 210);
  ctx.fillStyle = '#fff3c9';
  ctx.font = '20px Georgia, serif';
  ctx.fillText('SPACE / click — jump the fences and the knives', 640, 340);
  ctx.fillText('A / D or ← / → — dart left and right', 640, 372);
  ctx.fillText('S / ↓ by a haystack — HIDE while the farmer searches', 640, 404);
  ctx.fillText('Dodge the OVEN and the CARVING KNIFE in the kitchen', 640, 436);
  ctx.fillText('Grab corn for points. Reach the forest gate to escape!', 640, 468);
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 26px Georgia, serif';
  ctx.fillText('Press ENTER or click to start', 640, 566);
  if (best > 0) {
    ctx.fillStyle = '#fff3c9';
    ctx.font = '20px Georgia, serif';
    ctx.fillText(`Best score so far: ${best}`, 640, 606);
  }
  ctx.fillStyle = '#ffd23e';
  ctx.font = '16px Georgia, serif';
  ctx.fillText('A Thanksgiving escape — original art, code and sounds. No turkeys were harmed.', 640, 680);
}

function drawEndScreen(ctx, kind, score, best, distance) {
  ctx.fillStyle = kind === 'escaped' ? 'rgba(58, 106, 58, 0.55)' : 'rgba(120, 30, 20, 0.55)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  if (kind === 'escaped') {
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 80px Georgia, serif';
    ctx.fillText('ESCAPED!', 640, 220);
    ctx.fillStyle = '#fff3c9';
    ctx.font = 'italic 30px Georgia, serif';
    ctx.fillText('You made it to the woods. Thanksgiving is cancelled.', 640, 272);
    ctx.font = '24px Georgia, serif';
    ctx.fillText('The farmer is still searching the haystacks.', 640, 312);
  } else {
    ctx.fillStyle = '#ff8a5a';
    ctx.font = 'bold 80px Georgia, serif';
    ctx.fillText('CAUGHT!', 640, 220);
    ctx.fillStyle = '#fff3c9';
    ctx.font = 'italic 30px Georgia, serif';
    ctx.fillText('The farmer got you. Dinner is served…', 640, 272);
    ctx.font = '24px Georgia, serif';
    ctx.fillText(`You ran ${Math.floor(distance)} m before the oven got its way.`, 640, 312);
  }
  panel(ctx, 440, 350, 400, 130);
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 28px Georgia, serif';
  ctx.fillText(`Score: ${score}`, 640, 396);
  ctx.fillStyle = '#fff3c9';
  ctx.font = '22px Georgia, serif';
  ctx.fillText(`Best: ${best}`, 640, 436);
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 26px Georgia, serif';
  ctx.fillText('Press R or click to run again', 640, 540);
}

export function drawScreen(ctx, screen, state) {
  if (screen === SCREEN_TITLE) drawTitleScreen(ctx, state.best);
  else if (screen === SCREEN_CAUGHT) drawEndScreen(ctx, 'caught', state.score, state.best, state.distance);
  else if (screen === SCREEN_ESCAPED) drawEndScreen(ctx, 'escaped', state.score, state.best, state.distance);
}
