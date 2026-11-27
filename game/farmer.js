// Gobble Run farmer: the chaser. He runs behind the turkey, searches when he loses
// sight of it, and lunges when he corners it. Drawn from canvas shapes.
import { GROUND_Y } from './turkey.js';

export const FARMER_WIDTH = 58;
export const FARMER_HEIGHT = 92;

// How far behind the turkey the farmer starts, in pixels.
export const FARMER_START_GAP = 260;

export class Farmer {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 300 - FARMER_START_GAP;
    this.y = GROUND_Y - FARMER_HEIGHT;
    this.state = 'chase'; // chase | search | lunge | winded
    this.stateTimer = 0;
    this.runPhase = 0;
    this.searchTimer = 0;
    this.lungeSpeed = 0;
    this.lungeTimer = 0;
    this.spottedFlash = 0;
  }

  get width() { return FARMER_WIDTH; }
  get height() { return FARMER_HEIGHT; }
  get centreX() { return this.x + FARMER_WIDTH / 2; }

  /** Gap in pixels between the farmer's front and the turkey's back. */
  gapTo(turkey) {
    return turkey.x - (this.x + FARMER_WIDTH);
  }

  /** The farmer closes in when the turkey stumbles, falls back when it runs clean. */
  update(dt, turkey, worldSpeed, turkeyHidden) {
    if (this.spottedFlash > 0) this.spottedFlash -= dt;
    const gap = this.gapTo(turkey);

    if (this.state === 'search') {
      // He lost the turkey: stops, scratches his head, looks around.
      this.searchTimer -= dt;
      this.runPhase += dt * 2;
      if (this.searchTimer <= 0) {
        this.state = 'chase';
        this.stateTimer = 0;
      }
      return;
    }

    if (this.state === 'lunge') {
      // A desperate dive for the turkey: fast, but he cannot grab a turkey
      // that is in the air, and he overshoots if he misses.
      this.x += this.lungeSpeed * dt;
      this.runPhase += dt * 26;
      this.lungeTimer -= dt;
      if (this.lungeTimer <= 0) {
        this.state = 'winded';
        this.stateTimer = 1.2;
        if (this.gapTo(turkey) < 0) this.x = turkey.x - FARMER_WIDTH - 200;
        else this.x -= 120;
      }
      return;
    }

    if (this.state === 'winded') {
      // Bent over, hands on knees, catching his breath.
      this.stateTimer -= dt;
      this.runPhase += dt * 2;
      if (this.stateTimer <= 0) this.state = 'chase';
      return;
    }

    // Chase: the farmer runs in place with the turkey, so his screen speed is
    // only the gap adjustment. He hustles back into view when he drifts too
    // far behind, and never gains on a turkey that runs clean.
    if (gap > 240) this.x += 50 * dt;
    this.runPhase += dt * 14;

    if (turkeyHidden && gap < 320) {
      this.state = 'search';
      this.searchTimer = 2.2;
      this.spottedFlash = 0.4;
      return;
    }

    if (gap < 90 && turkey.onGround && !turkeyHidden) {
      // Cornered: he spots the turkey and lunges.
      this.state = 'lunge';
      this.lungeSpeed = 140;
      this.lungeTimer = 0.7;
      this.spottedFlash = 0.8;
    }
  }

  /** The turkey stumbled: the farmer gains ground. */
  gainGround(pixels) {
    this.x += pixels;
    if (this.state === 'search') {
      this.state = 'chase';
      this.searchTimer = 0;
    }
  }

  /** The turkey slipped away cleanly: the farmer falls back. */
  fallBack(pixels) {
    this.x -= pixels;
    if (this.x < -80) this.x = -80;
  }

  spot() {
    this.spottedFlash = 0.9;
  }

  /** Farmer in overalls and a straw hat, pitchfork in hand, always mid-stride. */
  draw(ctx) {
    const x = this.x;
    const y = this.y;
    const legSwing = this.state === 'search' ? 0 : Math.sin(this.runPhase) * 10;
    const lean = this.state === 'lunge' ? 0.28 : 0.12;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(lean * 0.2);

    // Shadow.
    ctx.fillStyle = 'rgba(43, 26, 14, 0.25)';
    ctx.beginPath();
    ctx.ellipse(29, FARMER_HEIGHT + 6, 28, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs: blue overalls.
    ctx.strokeStyle = '#2e4a7a';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(24, 62);
    ctx.lineTo(24 + legSwing, 90);
    ctx.moveTo(36, 62);
    ctx.lineTo(36 - legSwing, 90);
    ctx.stroke();

    // Body: red plaid shirt under denim overalls.
    ctx.fillStyle = '#b03a2e';
    ctx.beginPath();
    ctx.roundRect(10, 34, 40, 32, 6);
    ctx.fill();
    ctx.fillStyle = '#2e4a7a';
    ctx.beginPath();
    ctx.roundRect(14, 44, 32, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#d8c27a';
    ctx.fillRect(26, 44, 4, 22);
    ctx.fillRect(14, 52, 32, 3);

    // Arms: one reaching forward, one holding the pitchfork.
    ctx.strokeStyle = '#b03a2e';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(46, 40);
    ctx.lineTo(58, 52);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, 40);
    ctx.lineTo(2, 58);
    ctx.stroke();

    // Pitchfork.
    ctx.strokeStyle = '#8a6d3b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(2, 58);
    ctx.lineTo(-6, 6);
    ctx.stroke();
    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-6 + i * 4, 6);
      ctx.lineTo(-6 + i * 5, -6);
      ctx.stroke();
    }

    // Head, beard and straw hat.
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath();
    ctx.arc(30, 24, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8e8e8';
    ctx.beginPath();
    ctx.ellipse(30, 33, 10, 6, 0, 0, Math.PI);
    ctx.fill();
    // Angry brows and eyes.
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 20);
    ctx.lineTo(27, 23);
    ctx.moveTo(40, 20);
    ctx.lineTo(33, 23);
    ctx.stroke();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(24, 25, 1.8, 0, Math.PI * 2);
    ctx.arc(36, 25, 1.8, 0, Math.PI * 2);
    ctx.fill();
    // Straw hat.
    ctx.fillStyle = '#e8c95a';
    ctx.beginPath();
    ctx.ellipse(30, 14, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(30, 12, 11, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#b03a2e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(19, 12);
    ctx.lineTo(41, 12);
    ctx.stroke();

    ctx.restore();

    // Spotted alert: a big red "!" over his hat when he lunges or searches.
    if (this.spottedFlash > 0 && (this.state === 'lunge' || this.state === 'search')) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.spottedFlash * 2);
      ctx.fillStyle = '#c0392b';
      ctx.font = 'bold 44px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', this.centreX, this.y - 14);
      ctx.restore();
    }
  }
}
