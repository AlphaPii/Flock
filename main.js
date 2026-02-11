const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d", { alpha: false });
const hud = document.getElementById("hud");

const controls = {
  count: document.getElementById("count"),
  perception: document.getElementById("perception"),
  separation: document.getElementById("separation"),
  alignment: document.getElementById("alignment"),
  cohesion: document.getElementById("cohesion"),
  maxSpeed: document.getElementById("maxSpeed"),
  maxForce: document.getElementById("maxForce"),
  edgeAvoidance: document.getElementById("edgeAvoidance"),
  trail: document.getElementById("trail"),
  shuffle: document.getElementById("shuffle"),
  pause: document.getElementById("pause")
};

const state = {
  boids: [],
  paused: false,
  width: 0,
  height: 0,
  lastTime: performance.now()
};

const params = {
  count: Number(controls.count.value),
  perception: Number(controls.perception.value),
  separation: Number(controls.separation.value),
  alignment: Number(controls.alignment.value),
  cohesion: Number(controls.cohesion.value),
  maxSpeed: Number(controls.maxSpeed.value),
  maxForce: Number(controls.maxForce.value),
  edgeAvoidance: Number(controls.edgeAvoidance.value),
  trail: Number(controls.trail.value)
};

const rangeControls = [
  controls.count,
  controls.perception,
  controls.separation,
  controls.alignment,
  controls.cohesion,
  controls.maxSpeed,
  controls.maxForce,
  controls.edgeAvoidance,
  controls.trail
];

const sliderMeta = Object.fromEntries(
  rangeControls.map((control) => [control.id, document.getElementById(`${control.id}Meta`)])
);
const sliderPct = Object.fromEntries(
  rangeControls.map((control) => [control.id, document.getElementById(`${control.id}Pct`)])
);

const WORLD_TO_FISH_SCALE = 5;

class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  mult(n) {
    this.x *= n;
    this.y *= n;
    return this;
  }

  div(n) {
    if (n !== 0) {
      this.x /= n;
      this.y /= n;
    }
    return this;
  }

  mag() {
    return Math.hypot(this.x, this.y);
  }

  setMag(n) {
    const m = this.mag();
    if (m > 0) {
      this.mult(n / m);
    }
    return this;
  }

  limit(max) {
    const m = this.mag();
    if (m > max && m > 0) {
      this.mult(max / m);
    }
    return this;
  }

  copy() {
    return new Vec2(this.x, this.y);
  }

  static sub(a, b) {
    return new Vec2(a.x - b.x, a.y - b.y);
  }

  static dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}

class Boid {
  constructor() {
    this.pos = new Vec2(Math.random() * state.width, Math.random() * state.height);
    const angle = Math.random() * Math.PI * 2;
    this.vel = new Vec2(Math.cos(angle), Math.sin(angle)).mult(params.maxSpeed * (0.45 + Math.random() * 0.55));
    this.acc = new Vec2();
    this.size = (3 + Math.random() * 1.7) / WORLD_TO_FISH_SCALE;
  }

  edges() {
    const margin = Math.max(2, this.size * 1.7);

    if (this.pos.x < margin) {
      this.pos.x = margin;
      if (this.vel.x < 0) this.vel.x = 0;
    } else if (this.pos.x > state.width - margin) {
      this.pos.x = state.width - margin;
      if (this.vel.x > 0) this.vel.x = 0;
    }

    if (this.pos.y < margin) {
      this.pos.y = margin;
      if (this.vel.y < 0) this.vel.y = 0;
    } else if (this.pos.y > state.height - margin) {
      this.pos.y = state.height - margin;
      if (this.vel.y > 0) this.vel.y = 0;
    }
  }

  applyForce(force) {
    this.acc.add(force);
  }

  avoidEdges() {
    const margin = Math.max(2, this.size * 1.7);
    const urgency = Math.max(0, params.edgeAvoidance * 3);
    if (urgency <= 0) return 0;

    const baseForce = Math.max(0.01, params.maxForce);
    const halfMinDimension = Math.max(1, Math.min(state.width, state.height) * 0.5 - margin);

    const leftDist = Math.max(0, this.pos.x - margin);
    const rightDist = Math.max(0, state.width - margin - this.pos.x);
    const topDist = Math.max(0, this.pos.y - margin);
    const bottomDist = Math.max(0, state.height - margin - this.pos.y);

    let nearestDist = leftDist;
    let away = new Vec2(1, 0);
    let towardSpeed = Math.max(0, -this.vel.x);
    let wall = "left";

    if (rightDist < nearestDist) {
      nearestDist = rightDist;
      away = new Vec2(-1, 0);
      towardSpeed = Math.max(0, this.vel.x);
      wall = "right";
    }
    if (topDist < nearestDist) {
      nearestDist = topDist;
      away = new Vec2(0, 1);
      towardSpeed = Math.max(0, -this.vel.y);
      wall = "top";
    }
    if (bottomDist < nearestDist) {
      nearestDist = bottomDist;
      away = new Vec2(0, -1);
      towardSpeed = Math.max(0, this.vel.y);
      wall = "bottom";
    }

    const proximity = Math.max(0, 1 - Math.min(1, nearestDist / halfMinDimension));
    const proximityCurve = proximity * proximity;
    const towardFactor = Math.min(1, towardSpeed / Math.max(0.01, params.maxSpeed));
    const edgePressure = Math.max(0, Math.min(1, proximityCurve * (1 + towardFactor * 1.8)));

    // Very close to a wall: immediately suppress velocity into that wall.
    if (nearestDist < margin * 2.2) {
      const nearWall = Math.max(0, Math.min(1, 1 - nearestDist / (margin * 2.2)));
      const damp = Math.max(0.08, 0.35 - nearWall * 0.25);
      if (wall === "left" && this.vel.x < 0) this.vel.x *= damp;
      if (wall === "right" && this.vel.x > 0) this.vel.x *= damp;
      if (wall === "top" && this.vel.y < 0) this.vel.y *= damp;
      if (wall === "bottom" && this.vel.y > 0) this.vel.y *= damp;
    }

    const steer = away
      .setMag(params.maxSpeed)
      .sub(this.vel)
      .limit(baseForce * urgency * (0.12 + edgePressure * 6));

    this.applyForce(steer);
    return edgePressure;
  }

  flock(boids) {
    let total = 0;
    const edgePressure = this.avoidEdges();

    const steeringAlign = new Vec2();
    const steeringCohesion = new Vec2();
    const steeringSeparation = new Vec2();

    for (let i = 0; i < boids.length; i += 1) {
      const other = boids[i];
      if (other === this) continue;

      const d = Vec2.dist(this.pos, other.pos);
      if (d >= params.perception || d <= 0) continue;

      steeringAlign.add(other.vel);
      steeringCohesion.add(other.pos);

      const diff = Vec2.sub(this.pos, other.pos);
      diff.div(d * d);
      steeringSeparation.add(diff);

      total += 1;
    }

    if (total > 0) {
      const edgeUrgency = Math.max(0, params.edgeAvoidance * 3);
      const flockSuppression = edgePressure * edgePressure;
      const flockWeight = Math.max(0, 1 - flockSuppression * (0.25 + edgeUrgency * 0.65));
      if (flockWeight <= 0) return;

      steeringAlign
        .div(total)
        .setMag(params.maxSpeed)
        .sub(this.vel)
        .limit(params.maxForce)
        .mult(params.alignment * flockWeight);

      steeringCohesion
        .div(total)
        .sub(this.pos)
        .setMag(params.maxSpeed)
        .sub(this.vel)
        .limit(params.maxForce)
        .mult(params.cohesion * flockWeight);

      steeringSeparation
        .div(total)
        .setMag(params.maxSpeed)
        .sub(this.vel)
        .limit(params.maxForce)
        .mult(params.separation * flockWeight);

      this.applyForce(steeringAlign);
      this.applyForce(steeringCohesion);
      this.applyForce(steeringSeparation);
    }
  }

  update(dt) {
    this.vel.add(this.acc.copy().mult(dt));
    this.vel.limit(params.maxSpeed);
    this.pos.add(this.vel.copy().mult(dt));
    this.acc.mult(0);
  }

  draw() {
    const speedMix = Math.min(1, this.vel.mag() / (params.maxSpeed || 1));
    const hue = 180 + speedMix * 45;
    const light = 62 + speedMix * 16;

    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(Math.atan2(this.vel.y, this.vel.x));

    ctx.beginPath();
    ctx.moveTo(this.size * 1.7, 0);
    ctx.lineTo(-this.size, this.size * 0.68);
    ctx.lineTo(-this.size * 0.4, 0);
    ctx.lineTo(-this.size, -this.size * 0.68);
    ctx.closePath();

    ctx.fillStyle = `hsl(${hue}, 90%, ${light}%)`;
    ctx.fill();
    ctx.restore();
  }
}

function resize() {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const rect = canvas.getBoundingClientRect();
  state.width = Math.max(320, Math.floor(rect.width));
  state.height = Math.max(260, Math.floor(rect.height));

  canvas.width = Math.floor(state.width * dpr);
  canvas.height = Math.floor(state.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function rebuildBoids(targetCount = params.count) {
  state.boids.length = 0;
  for (let i = 0; i < targetCount; i += 1) {
    state.boids.push(new Boid());
  }
}

function syncCount() {
  const target = params.count;
  const current = state.boids.length;

  if (target === current) return;

  if (target > current) {
    for (let i = current; i < target; i += 1) {
      state.boids.push(new Boid());
    }
  } else {
    state.boids.length = target;
  }
}

function formatControlValue(control) {
  const value = Number(control.value);
  const step = control.step && control.step !== "any" ? control.step : "1";
  const decimals = step.includes(".") ? step.split(".")[1].length : 0;

  let text = decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
  if (decimals > 0) text = text.replace(/\.?0+$/, "");

  return text;
}

function updateSliderReadout(control) {
  const value = Number(control.value);
  const min = Number(control.min || 0);
  const max = Number(control.max || 1);
  const span = Math.max(0.0001, max - min);
  const pctInRange = Math.max(0, Math.min(100, ((value - min) / span) * 100));
  const pctOfMax = max === 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  const bubbleLeft = Math.max(8, Math.min(92, pctInRange));

  control.style.setProperty("--range-pct", `${pctInRange}%`);

  const meta = sliderMeta[control.id];
  if (meta) {
    meta.style.left = `${bubbleLeft}%`;
    meta.textContent = formatControlValue(control);
  }

  const pctBadge = sliderPct[control.id];
  if (pctBadge) {
    pctBadge.textContent = `${Math.round(pctOfMax)}%`;
  }
}

function bindControl(control, key) {
  control.addEventListener("input", () => {
    params[key] = Number(control.value);
    if (key === "count") syncCount();
    updateSliderReadout(control);
  });
}

function tick(now) {
  const rawDt = (now - state.lastTime) / 16.666;
  const dt = Math.min(2.5, Math.max(0.2, rawDt));
  state.lastTime = now;

  const fade = 0.05 + (1 - params.trail) * 0.35;
  ctx.fillStyle = `rgba(4, 14, 27, ${fade})`;
  ctx.fillRect(0, 0, state.width, state.height);

  if (!state.paused) {
    for (let i = 0; i < state.boids.length; i += 1) {
      const boid = state.boids[i];
      boid.flock(state.boids);
      boid.update(dt);
      boid.edges();
      boid.draw();
    }
  } else {
    for (let i = 0; i < state.boids.length; i += 1) {
      state.boids[i].draw();
    }
  }

  hud.textContent = `${state.paused ? "Paused" : "Running"} | ${state.width}x${state.height}`;
  requestAnimationFrame(tick);
}

bindControl(controls.count, "count");
bindControl(controls.perception, "perception");
bindControl(controls.separation, "separation");
bindControl(controls.alignment, "alignment");
bindControl(controls.cohesion, "cohesion");
bindControl(controls.maxSpeed, "maxSpeed");
bindControl(controls.maxForce, "maxForce");
bindControl(controls.edgeAvoidance, "edgeAvoidance");
bindControl(controls.trail, "trail");
rangeControls.forEach(updateSliderReadout);

controls.shuffle.addEventListener("click", () => rebuildBoids(params.count));
controls.pause.addEventListener("click", () => {
  state.paused = !state.paused;
  controls.pause.textContent = state.paused ? "Resume" : "Pause";
});

window.addEventListener("resize", resize);

resize();
rebuildBoids(params.count);
ctx.fillStyle = "rgb(4, 14, 27)";
ctx.fillRect(0, 0, state.width, state.height);
requestAnimationFrame((t) => {
  state.lastTime = t;
  tick(t);
});
