// Gobble Run world: the three stages (farmyard, barn, kitchen), the obstacles in
// them (fences, hay bales, the oven, the carving knife), haystacks to hide in and
// corn to collect. Draws the scenery and moves the hazards.
import { GROUND_Y, mulberry32 } from './turkey.js';

export const ESCAPE_DISTANCE = 1400; // metres to the woods: reach it and you are free.
export const STAGE_NAMES = ['The Farmyard', 'The Barn', 'The Kitchen'];

export function stageFor(distance) {
  if (distance < 450) return 0;
  if (distance < 950) return 1;
  return 2;
}

export function stageName(distance) {
  return STAGE_NAMES[stageFor(distance)];
}

/** How fast the world scrolls at a given distance: it quickens as you run. */
export function worldSpeed(distance) {
  return 250 + Math.min(190, distance * 0.14);
}

// Obstacle kinds. Fences and bales trip you; the oven burns and the knife cuts.
export const KIND_FENCE = 'fence';
export const KIND_BALE = 'bale';
export const KIND_OVEN = 'oven';
export const KIND_KNIFE = 'knife';
export const KIND_HAYSTACK = 'haystack';
export const KIND_CORN = 'corn';
export const KIND_GATE = 'gate';

export class World {
  constructor(seed) {
    this.seed = seed || 20261127;
    this.rng = mulberry32(this.seed);
    this.reset();
  }

  reset() {
    this.distance = 0;
    this.obstacles = [];
    this.spawnX = 1400;
    this.nextSpawnIn = 320;
    this.cornTimer = 0;
    this.gateSpawned = false;
    this.time = 0;
    this.rng = mulberry32(this.seed);
  }

  /** Pick the next hazard for the current stage. */
  pickKind(stage) {
    const roll = this.rng();
    if (stage === 0) {
      if (roll < 0.34) return KIND_FENCE;
      if (roll < 0.62) return KIND_BALE;
      if (roll < 0.82) return KIND_HAYSTACK;
      return KIND_CORN;
    }
    if (stage === 1) {
      if (roll < 0.3) return KIND_FENCE;
      if (roll < 0.52) return KIND_BALE;
      if (roll < 0.68) return KIND_KNIFE;
      if (roll < 0.86) return KIND_HAYSTACK;
      return KIND_CORN;
    }
    if (roll < 0.26) return KIND_OVEN;
    if (roll < 0.52) return KIND_KNIFE;
    if (roll < 0.68) return KIND_FENCE;
    if (roll < 0.84) return KIND_HAYSTACK;
    return KIND_CORN;
  }

  spawnObstacle(stage) {
    const kind = this.pickKind(stage);
    const x = 1320;
    if (kind === KIND_FENCE) {
      this.obstacles.push({ kind, x, y: GROUND_Y - 46, w: 26, h: 46, hit: false });
    } else if (kind === KIND_BALE) {
      this.obstacles.push({ kind, x, y: GROUND_Y - 52, w: 58, h: 52, hit: false });
    } else if (kind === KIND_OVEN) {
      this.obstacles.push({ kind, x, y: GROUND_Y - 110, w: 92, h: 110, hit: false, flame: 0 });
    } else if (kind === KIND_KNIFE) {
      // A carving knife on a long rope from the ceiling, its blade sweeping low
      // across the ground: jump it as it swings through, or time your run.
      this.obstacles.push({ kind, x, y: 540, w: 30, h: 80, hit: false, swing: this.rng() * Math.PI * 2, swingSpeed: 1.6 + this.rng() * 0.8 });
    } else if (kind === KIND_HAYSTACK) {
      this.obstacles.push({ kind, x, y: GROUND_Y - 84, w: 110, h: 84, hit: false });
    } else if (kind === KIND_CORN) {
      const low = this.rng() < 0.5;
      this.obstacles.push({ kind, x, y: low ? GROUND_Y - 40 : GROUND_Y - 170, w: 34, h: 34, hit: false });
    }
  }

  spawnGate() {
    this.obstacles.push({ kind: KIND_GATE, x: 1320, y: GROUND_Y - 190, w: 90, h: 190, hit: false });
    this.gateSpawned = true;
  }

  /** Advance the world one step. Returns the obstacles for collision checks. */
  update(dt, speed) {
    this.time += dt;
    this.distance += (speed * dt) / 14; // pixels to metres, roughly
    const stage = stageFor(this.distance);

    this.nextSpawnIn -= speed * dt;
    if (this.nextSpawnIn <= 0) {
      if (!this.gateSpawned && this.distance >= ESCAPE_DISTANCE - 60) {
        this.spawnGate();
      } else if (this.distance < ESCAPE_DISTANCE) {
        this.spawnObstacle(stage);
      }
      const gap = (stage === 2 ? 380 : 300) + this.rng() * 260 - Math.min(120, this.distance * 0.06);
      this.nextSpawnIn = Math.max(210, gap);
    }

    for (const ob of this.obstacles) {
      ob.x -= speed * dt;
      if (ob.kind === KIND_KNIFE) ob.swing += ob.swingSpeed * dt;
      if (ob.kind === KIND_OVEN) ob.flame += dt * 9;
    }
    this.obstacles = this.obstacles.filter((ob) => ob.x + ob.w > -140);
    return this.obstacles;
  }

  /** AABB overlap between the turkey and one obstacle (knives use their blade tip). */
  static overlaps(turkey, ob) {
    let ox = ob.x;
    let oy = ob.y;
    let ow = ob.w;
    let oh = ob.h;
    if (ob.kind === KIND_KNIFE) {
      // The blade sweeps low across the ground on its rope.
      const bladeX = ob.x + Math.sin(ob.swing) * 80;
      ox = bladeX - 12;
      oy = ob.y - 20;
      ow = 24;
      oh = 80;
    }
    const pad = 6;
    return (
      turkey.x + pad < ox + ow &&
      turkey.x + turkey.width - pad > ox &&
      turkey.y + pad < oy + oh &&
      turkey.y + turkey.height - pad > oy
    );
  }

  /** Is the turkey standing inside a haystack it can hide in? */
  haystackUnder(turkey) {
    for (const ob of this.obstacles) {
      if (ob.kind === KIND_HAYSTACK && World.overlaps(turkey, ob)) return ob;
    }
    return null;
  }

  // ---- Scenery ----

  drawSky(ctx, stage, time) {
    const g = ctx.createLinearGradient(0, 0, 0, 620);
    if (stage === 0) {
      g.addColorStop(0, '#f7c873');
      g.addColorStop(0.6, '#f2a65e');
      g.addColorStop(1, '#e88a4a');
    } else if (stage === 1) {
      g.addColorStop(0, '#8a6a4a');
      g.addColorStop(0.6, '#6b4a30');
      g.addColorStop(1, '#4a2f1e');
    } else {
      g.addColorStop(0, '#5a3a28');
      g.addColorStop(0.6, '#7a4a2e');
      g.addColorStop(1, '#a86238');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1280, 620);

    // Sun or hanging lamp, and drifting leaves in the farmyard.
    if (stage === 0) {
      ctx.fillStyle = '#fff3c9';
      ctx.beginPath();
      ctx.arc(1080, 110, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 243, 201, 0.35)';
      ctx.beginPath();
      ctx.arc(1080, 110, 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c96a2e';
      for (let i = 0; i < 7; i += 1) {
        const lx = ((i * 173 + time * 24) % 1300) - 10;
        const ly = 90 + ((i * 67) % 260) + Math.sin(time * 2 + i) * 12;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(time + i);
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (stage === 2) {
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(640, 80, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 233, 168, 0.25)';
      ctx.beginPath();
      ctx.arc(640, 80, 52, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawGround(ctx, stage, distance) {
    const offset = (distance * 14) % 90;
    if (stage === 2) {
      // Kitchen checkerboard tiles.
      ctx.fillStyle = '#c9a06a';
      ctx.fillRect(0, GROUND_Y, 1280, 120);
      for (let row = 0; row < 2; row += 1) {
        for (let col = -1; col < 16; col += 1) {
          ctx.fillStyle = (row + col) % 2 === 0 ? '#e8d3a8' : '#b98a52';
          ctx.fillRect(col * 90 + offset, GROUND_Y + row * 60, 90, 60);
        }
      }
    } else {
      // Farm dirt with grass tufts and fence posts scrolling past.
      ctx.fillStyle = stage === 0 ? '#a8763e' : '#7a5a34';
      ctx.fillRect(0, GROUND_Y, 1280, 120);
      ctx.fillStyle = stage === 0 ? '#8a5f2e' : '#64452a';
      for (let col = -1; col < 15; col += 1) {
        ctx.fillRect(col * 90 + offset, GROUND_Y + 34, 90, 10);
      }
      ctx.fillStyle = stage === 0 ? '#7a9a3a' : '#5a7a2e';
      ctx.fillRect(0, GROUND_Y - 6, 1280, 10);
      ctx.fillStyle = '#5a7a2e';
      for (let col = -1; col < 15; col += 1) {
        const gx = col * 90 + offset + 20;
        ctx.beginPath();
        ctx.moveTo(gx, GROUND_Y - 4);
        ctx.lineTo(gx + 5, GROUND_Y - 16);
        ctx.lineTo(gx + 10, GROUND_Y - 4);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  drawBackdrop(ctx, stage, distance) {
    const offset = (distance * 7) % 1280;
    if (stage === 0) {
      // Rolling hills, a red barn and a pumpkin patch in the distance.
      ctx.fillStyle = '#c98a3d';
      ctx.beginPath();
      ctx.ellipse(300 - offset, 620, 420, 130, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b8762f';
      ctx.beginPath();
      ctx.ellipse(1000 - offset, 620, 460, 150, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a83a2e';
      ctx.fillRect(880 - offset, 470, 150, 130);
      ctx.beginPath();
      ctx.moveTo(860 - offset, 472);
      ctx.lineTo(955 - offset, 410);
      ctx.lineTo(1050 - offset, 472);
      ctx.closePath();
      ctx.fillStyle = '#7a2a20';
      ctx.fill();
      ctx.fillStyle = '#f7e8c9';
      ctx.fillRect(935 - offset, 540, 40, 60);
      ctx.fillStyle = '#e88a2e';
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.arc(180 + i * 46 - offset, 596, 14, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (stage === 1) {
      // Inside the barn: wooden beams and hanging lanterns.
      ctx.fillStyle = '#5a3a22';
      ctx.fillRect(0, 0, 1280, 60);
      ctx.fillStyle = '#6b4a2e';
      for (let col = 0; col < 6; col += 1) {
        ctx.fillRect(col * 240 + 40, 0, 26, 620);
      }
      ctx.fillStyle = '#ffe9a8';
      for (let col = 0; col < 4; col += 1) {
        const lx = col * 320 + 160;
        ctx.beginPath();
        ctx.arc(lx, 96, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 233, 168, 0.2)';
        ctx.beginPath();
        ctx.arc(lx, 96, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe9a8';
      }
      ctx.fillStyle = '#8a6a3e';
      ctx.beginPath();
      ctx.ellipse(200, 620, 300, 40, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    } else {
      // The kitchen: a window with the woods beyond, a dresser, a clock.
      ctx.fillStyle = '#8a5a34';
      ctx.fillRect(0, 0, 1280, 620);
      ctx.fillStyle = '#3a6a3a';
      ctx.fillRect(90, 90, 220, 260);
      ctx.fillStyle = '#7ab85a';
      ctx.beginPath();
      ctx.moveTo(90, 350);
      ctx.lineTo(200, 180);
      ctx.lineTo(310, 350);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f7e8c9';
      ctx.fillRect(195, 90, 10, 260);
      ctx.fillRect(90, 210, 220, 10);
      ctx.fillStyle = '#5a3a22';
      ctx.fillRect(980, 180, 220, 300);
      ctx.fillStyle = '#c9a06a';
      for (let row = 0; row < 3; row += 1) ctx.fillRect(996, 210 + row * 90, 188, 8);
      ctx.fillStyle = '#f7e8c9';
      ctx.beginPath();
      ctx.arc(640, 130, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3a2a1a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(640, 130);
      ctx.lineTo(640, 106);
      ctx.moveTo(640, 130);
      ctx.lineTo(658, 138);
      ctx.stroke();
    }
  }

  // ---- Obstacles ----

  drawObstacle(ctx, ob) {
    if (ob.kind === KIND_FENCE) {
      ctx.fillStyle = '#7a4a22';
      ctx.fillRect(ob.x, ob.y, 6, ob.h);
      ctx.fillRect(ob.x + ob.w - 6, ob.y, 6, ob.h);
      ctx.fillStyle = '#96602f';
      ctx.fillRect(ob.x - 4, ob.y + 8, ob.w + 8, 8);
      ctx.fillRect(ob.x - 4, ob.y + 26, ob.w + 8, 8);
    } else if (ob.kind === KIND_BALE) {
      ctx.fillStyle = '#d8a83e';
      ctx.beginPath();
      ctx.ellipse(ob.x + ob.w / 2, ob.y + ob.h / 2, ob.w / 2, ob.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b8862e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(ob.x + ob.w / 2, ob.y + ob.h / 2, ob.w / 2 - 8, ob.h / 2 - 8, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ob.x + 8, ob.y + 10);
      ctx.lineTo(ob.x + ob.w - 8, ob.y + ob.h - 10);
      ctx.moveTo(ob.x + ob.w - 8, ob.y + 10);
      ctx.lineTo(ob.x + 8, ob.y + ob.h - 10);
      ctx.stroke();
    } else if (ob.kind === KIND_OVEN) {
      // A roaring oven: hot door, flames licking out, heat shimmer.
      ctx.fillStyle = '#4a4a52';
      ctx.beginPath();
      ctx.roundRect(ob.x, ob.y, ob.w, ob.h, 8);
      ctx.fill();
      ctx.fillStyle = '#2e2e34';
      ctx.beginPath();
      ctx.roundRect(ob.x + 8, ob.y + 14, ob.w - 16, 62, 6);
      ctx.fill();
      const flicker = Math.sin(ob.flame) * 4;
      ctx.fillStyle = '#ff7a1a';
      ctx.beginPath();
      ctx.moveTo(ob.x + 16, ob.y + 70);
      ctx.quadraticCurveTo(ob.x + 24 + flicker, ob.y + 34, ob.x + 32, ob.y + 66);
      ctx.quadraticCurveTo(ob.x + 46, ob.y + 30 + flicker, ob.x + 54, ob.y + 66);
      ctx.quadraticCurveTo(ob.x + 66 + flicker, ob.y + 38, ob.x + 76, ob.y + 70);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath();
      ctx.moveTo(ob.x + 28, ob.y + 70);
      ctx.quadraticCurveTo(ob.x + 38, ob.y + 48, ob.x + 46, ob.y + 70);
      ctx.quadraticCurveTo(ob.x + 56, ob.y + 50, ob.x + 64, ob.y + 70);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c0c0c0';
      ctx.fillRect(ob.x + 10, ob.y + 84, ob.w - 20, 6);
      ctx.fillStyle = '#ff5a1a';
      ctx.font = 'bold 13px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('HOT!', ob.x + ob.w / 2, ob.y - 8);
    } else if (ob.kind === KIND_KNIFE) {
      // A carving knife on a rope from the ceiling, blade sweeping low.
      const bladeX = ob.x + Math.sin(ob.swing) * 80;
      const bladeY = ob.y;
      ctx.strokeStyle = '#3a2a1a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ob.x, 0);
      ctx.lineTo(bladeX, bladeY - 40);
      ctx.stroke();
      ctx.save();
      ctx.translate(bladeX, bladeY);
      ctx.rotate(Math.sin(ob.swing) * 0.5);
      ctx.fillStyle = '#d8d8d8';
      ctx.beginPath();
      ctx.moveTo(-8, -48);
      ctx.lineTo(8, -48);
      ctx.lineTo(0, 16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(-8, -66, 16, 20);
      ctx.restore();
    } else if (ob.kind === KIND_HAYSTACK) {
      ctx.fillStyle = '#e8c95a';
      ctx.beginPath();
      ctx.moveTo(ob.x, ob.y + ob.h);
      ctx.quadraticCurveTo(ob.x + ob.w / 2, ob.y - 14, ob.x + ob.w, ob.y + ob.h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#c9a83e';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.moveTo(ob.x + 14 + i * 18, ob.y + ob.h - 8);
        ctx.lineTo(ob.x + 20 + i * 18, ob.y + 22);
        ctx.stroke();
      }
      ctx.fillStyle = '#7a5a22';
      ctx.font = 'bold 13px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('HIDE! press S', ob.x + ob.w / 2, ob.y - 10);
    } else if (ob.kind === KIND_CORN) {
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath();
      ctx.ellipse(ob.x + 17, ob.y + 17, 12, 14, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8a83e';
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.arc(ob.x + 17 + i * 6, ob.y + 12, 2, 0, Math.PI * 2);
        ctx.arc(ob.x + 17 + i * 6, ob.y + 22, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#5a9a3a';
      ctx.beginPath();
      ctx.ellipse(ob.x + 6, ob.y + 28, 8, 4, -0.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (ob.kind === KIND_GATE) {
      // The forest gate: two posts, a pumpkin arch, the woods beyond.
      ctx.fillStyle = '#3a6a3a';
      ctx.fillRect(ob.x - 30, ob.y - 40, 150, 230);
      ctx.fillStyle = '#5a7a2e';
      ctx.beginPath();
      ctx.moveTo(ob.x - 30, ob.y - 40);
      ctx.lineTo(ob.x + 45, ob.y - 90);
      ctx.lineTo(ob.x + 120, ob.y - 40);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#6b4226';
      ctx.fillRect(ob.x - 6, ob.y, 14, ob.h);
      ctx.fillRect(ob.x + ob.w - 8, ob.y, 14, ob.h);
      ctx.fillStyle = '#96602f';
      ctx.beginPath();
      ctx.moveTo(ob.x - 10, ob.y);
      ctx.quadraticCurveTo(ob.x + ob.w / 2, ob.y - 60, ob.x + ob.w + 6, ob.y);
      ctx.lineTo(ob.x + ob.w + 6, ob.y + 16);
      ctx.quadraticCurveTo(ob.x + ob.w / 2, ob.y - 34, ob.x - 10, ob.y + 16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e88a2e';
      ctx.beginPath();
      ctx.arc(ob.x + ob.w / 2, ob.y - 52, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3c9';
      ctx.font = 'bold 15px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('FREEDOM', ob.x + ob.w / 2, ob.y - 84);
    }
  }

  draw(ctx, stage) {
    this.drawSky(ctx, stage, this.time);
    this.drawBackdrop(ctx, stage, this.distance);
    this.drawGround(ctx, stage, this.distance);
    for (const ob of this.obstacles) this.drawObstacle(ctx, ob);
  }
}
