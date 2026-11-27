// Gobble Run turkey: the player. Owns movement, jumping, hiding and its own drawing.
export const TURKEY_WIDTH = 64;
export const TURKEY_HEIGHT = 56;
export const GROUND_Y = 600;
export const GRAVITY = 2200;
export const JUMP_SPEED = 900;

/** A seeded random helper lives here so the whole game can run deterministically. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Turkey {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 300;
    this.y = GROUND_Y - TURKEY_HEIGHT;
    this.vy = 0;
    this.onGround = true;
    this.hidden = false;
    this.hideTimer = 0;
    this.stunTimer = 0;
    this.runPhase = 0;
    this.facing = 1;
    this.alive = true;
  }

  get width() { return TURKEY_WIDTH; }
  get height() { return TURKEY_HEIGHT; }
  get centreX() { return this.x + TURKEY_WIDTH / 2; }
  get feetY() { return this.y + TURKEY_HEIGHT; }

  jump() {
    if (!this.onGround || this.hidden || this.stunTimer > 0) return false;
    this.vy = -JUMP_SPEED;
    this.onGround = false;
    return true;
  }

  hide() {
    if (!this.onGround || this.stunTimer > 0) return false;
    this.hidden = true;
    this.hideTimer = 2.4;
    return true;
  }

  unhide() {
    this.hidden = false;
    this.hideTimer = 0;
  }

  stun(seconds) {
    this.stunTimer = seconds;
  }

  /** Move left/right within the run lane, apply gravity, tick timers. */
  update(dt, move, speed) {
    if (this.stunTimer > 0) this.stunTimer -= dt;
    if (this.hideTimer > 0) {
      this.hideTimer -= dt;
      if (this.hideTimer <= 0) this.unhide();
    }
    if (!this.hidden && this.stunTimer <= 0 && this.onGround) {
      this.x += move * 260 * dt;
      if (this.x < 110) this.x = 110;
      if (this.x > 720) this.x = 720;
    }
    if (!this.onGround) {
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.feetY >= GROUND_Y) {
        this.y = GROUND_Y - TURKEY_HEIGHT;
        this.vy = 0;
        this.onGround = true;
      }
    }
    if (this.onGround && !this.hidden) this.runPhase += dt * speed * 0.045;
  }

  /** The turkey, drawn from canvas shapes: brown body, fan tail, red wattle, beak. */
  draw(ctx, time) {
    const x = this.x;
    const y = this.y;
    const bob = this.onGround && !this.hidden ? Math.sin(this.runPhase * 2) * 2 : 0;
    const legSwing = this.onGround && !this.hidden ? Math.sin(this.runPhase * 2) * 8 : 0;

    ctx.save();
    ctx.translate(x, y + bob);

    if (this.hidden) {
      // Only a tail feather pokes out of the haystack: the joke the farmer misses.
      ctx.fillStyle = '#8a5a2b';
      ctx.beginPath();
      ctx.ellipse(34, -6, 16, 7, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c98a3d';
      ctx.beginPath();
      ctx.ellipse(34, -6, 10, 4, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Tail fan: five feathers fanning out behind.
    for (let i = -2; i <= 2; i += 1) {
      const angle = -Math.PI / 2 + i * 0.42;
      ctx.save();
      ctx.translate(16, 26);
      ctx.rotate(angle);
      ctx.fillStyle = i % 2 === 0 ? '#8a5a2b' : '#a06a33';
      ctx.beginPath();
      ctx.ellipse(0, -26, 9, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d98a2b';
      ctx.beginPath();
      ctx.ellipse(0, -44, 4, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Legs, running.
    ctx.strokeStyle = '#e8a13c';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(30, 50);
    ctx.lineTo(30 + legSwing, 58);
    ctx.moveTo(44, 50);
    ctx.lineTo(44 - legSwing, 58);
    ctx.stroke();

    // Body.
    ctx.fillStyle = '#7a4a22';
    ctx.beginPath();
    ctx.ellipse(36, 30, 26, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#96602f';
    ctx.beginPath();
    ctx.ellipse(38, 26, 18, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing.
    ctx.fillStyle = '#5d3a1a';
    ctx.beginPath();
    ctx.ellipse(34, 32, 13, 9, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Neck and head.
    ctx.fillStyle = '#96602f';
    ctx.beginPath();
    ctx.ellipse(56, 10, 7, 14, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c98a3d';
    ctx.beginPath();
    ctx.arc(60, -2, 9, 0, Math.PI * 2);
    ctx.fill();

    // Beak, wattle and eye.
    ctx.fillStyle = '#e8a13c';
    ctx.beginPath();
    ctx.moveTo(68, -4);
    ctx.lineTo(78, -1);
    ctx.lineTo(68, 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.ellipse(63, 6, 3, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(62, -4, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(63, -5, 0.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Shadow on the ground.
    ctx.fillStyle = 'rgba(43, 26, 14, 0.25)';
    const squash = this.onGround ? 1 : Math.max(0.4, 1 - (GROUND_Y - this.feetY) / 300);
    ctx.beginPath();
    ctx.ellipse(this.centreX, GROUND_Y + 8, 30 * squash, 6 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
