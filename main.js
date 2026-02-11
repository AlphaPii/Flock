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
  mouseThreat: document.getElementById("mouseThreat"),
  trail: document.getElementById("trail"),
  shuffle: document.getElementById("shuffle"),
  pause: document.getElementById("pause")
};

const state = {
  boids: [],
  paused: false,
  width: 0,
  height: 0,
  lastTime: performance.now(),
  simAccumulatorMs: 0,
  simTick: 0,
  gridHeads: new Int32Array(0),
  nextIndices: new Int32Array(0),
  gridCellSize: 0,
  gridCols: 0,
  gridRows: 0,
  gridReady: false,
  activePerception: 0,
  activeNeighborBudget: Number.POSITIVE_INFINITY,
  mouse: {
    active: false,
    x: 0,
    y: 0
  }
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
  mouseThreat: Number(controls.mouseThreat.value),
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
  controls.mouseThreat,
  controls.trail
];

const sliderMeta = Object.fromEntries(
  rangeControls.map((control) => [control.id, document.getElementById(`${control.id}Meta`)])
);
const sliderPct = Object.fromEntries(
  rangeControls.map((control) => [control.id, document.getElementById(`${control.id}Pct`)])
);

const WORLD_TO_FISH_SCALE = 5;
const GRID_NEIGHBOR_RADIUS = 1;
const MIN_EDGE_MARGIN = 2;
const FAST_RENDER_THRESHOLD = 12000;
const ULTRA_RENDER_THRESHOLD = 17000;
const BASE_FRAME_MS = 16.666;
const SIM_HZ = 30;
const MAX_FRAME_MS = 120;
const MAX_SIM_STEPS = 4;

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

  static dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}

function getTargetDpr() {
  const device = window.devicePixelRatio || 1;
  const count = state.boids.length || params.count;
  if (count >= ULTRA_RENDER_THRESHOLD) return Math.max(1, Math.min(1.0, device));
  if (count >= FAST_RENDER_THRESHOLD) return Math.max(1, Math.min(1.25, device));
  return Math.max(1, Math.min(2, device));
}

function getAdaptivePerception() {
  const count = state.boids.length;
  const base = params.perception;
  if (count >= ULTRA_RENDER_THRESHOLD) return Math.max(20, base * 0.5);
  if (count >= FAST_RENDER_THRESHOLD) return Math.max(20, base * 0.7);
  if (count >= 9000) return Math.max(20, base * 0.85);
  return base;
}

function getAdaptiveSimHz() {
  const count = state.boids.length;
  if (count >= ULTRA_RENDER_THRESHOLD) return 24;
  if (count >= FAST_RENDER_THRESHOLD) return 28;
  return SIM_HZ;
}

function getNeighborBudget() {
  const count = state.boids.length;
  if (count >= ULTRA_RENDER_THRESHOLD) return 18;
  if (count >= FAST_RENDER_THRESHOLD) return 28;
  if (count >= 9000) return 42;
  return Number.POSITIVE_INFINITY;
}

function getAdaptiveFlockInterval() {
  const count = state.boids.length;
  if (count >= 18000) return 3;
  if (count >= 10000) return 2;
  return 1;
}

function getAdaptiveGridInterval() {
  const count = state.boids.length;
  if (count >= 16000) return 2;
  return 1;
}

function drawFastBoid(boid) {
  ctx.fillRect(boid.pos.x, boid.pos.y, 1.4, 1.4);
}

class Boid {
  constructor() {
    this.pos = new Vec2(Math.random() * state.width, Math.random() * state.height);
    const angle = Math.random() * Math.PI * 2;
    this.vel = new Vec2(Math.cos(angle), Math.sin(angle));
    this.vel.x *= params.maxSpeed * (0.45 + Math.random() * 0.55);
    this.vel.y *= params.maxSpeed * (0.45 + Math.random() * 0.55);
    this.acc = new Vec2();
    this.size = (3 + Math.random() * 1.7) / WORLD_TO_FISH_SCALE;
  }

  edges() {
    const margin = Math.max(MIN_EDGE_MARGIN, this.size * 1.7);

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

  avoidEdges() {
    const urgency = Math.max(0, params.edgeAvoidance);
    if (urgency <= 0) return 0;

    const margin = Math.max(MIN_EDGE_MARGIN, this.size * 1.7);
    const halfMinDimension = Math.max(1, Math.min(state.width, state.height) * 0.5 - margin);

    const leftDist = Math.max(0, this.pos.x - margin);
    const rightDist = Math.max(0, state.width - margin - this.pos.x);
    const topDist = Math.max(0, this.pos.y - margin);
    const bottomDist = Math.max(0, state.height - margin - this.pos.y);

    let nearestDist = leftDist;
    let awayX = 1;
    let awayY = 0;
    let towardSpeed = Math.max(0, -this.vel.x);
    let wallId = 0;

    if (rightDist < nearestDist) {
      nearestDist = rightDist;
      awayX = -1;
      awayY = 0;
      towardSpeed = Math.max(0, this.vel.x);
      wallId = 1;
    }
    if (topDist < nearestDist) {
      nearestDist = topDist;
      awayX = 0;
      awayY = 1;
      towardSpeed = Math.max(0, -this.vel.y);
      wallId = 2;
    }
    if (bottomDist < nearestDist) {
      nearestDist = bottomDist;
      awayX = 0;
      awayY = -1;
      towardSpeed = Math.max(0, this.vel.y);
      wallId = 3;
    }

    const proximity = Math.max(0, 1 - Math.min(1, nearestDist / halfMinDimension));
    const proximityCurve = proximity * proximity;
    const towardFactor = Math.min(1, towardSpeed / Math.max(0.01, params.maxSpeed));
    const edgePressure = Math.max(0, Math.min(1, proximityCurve * (1 + towardFactor * 1.8)));

    if (nearestDist < margin * 2.2) {
      const nearWall = Math.max(0, Math.min(1, 1 - nearestDist / (margin * 2.2)));
      const damp = Math.max(0.08, 0.35 - nearWall * 0.25);
      if (wallId === 0 && this.vel.x < 0) this.vel.x *= damp;
      if (wallId === 1 && this.vel.x > 0) this.vel.x *= damp;
      if (wallId === 2 && this.vel.y < 0) this.vel.y *= damp;
      if (wallId === 3 && this.vel.y > 0) this.vel.y *= damp;
    }

    const steerLimit = params.maxForce * (0.12 + edgePressure * 6) * (0.25 + urgency * 2.75);
    let steerX = awayX * params.maxSpeed - this.vel.x;
    let steerY = awayY * params.maxSpeed - this.vel.y;
    const steerMag = Math.hypot(steerX, steerY);
    if (steerMag > steerLimit && steerMag > 0) {
      const s = steerLimit / steerMag;
      steerX *= s;
      steerY *= s;
    }

    this.acc.x += steerX;
    this.acc.y += steerY;
    return edgePressure;
  }

  avoidMouse() {
    if (!state.mouse.active || params.mouseThreat <= 0) return 0;

    const dx = this.pos.x - state.mouse.x;
    const dy = this.pos.y - state.mouse.y;
    const distSq = dx * dx + dy * dy;
    const threatRadius = Math.max(90, params.perception * 4.5);
    const radiusSq = threatRadius * threatRadius;
    if (distSq <= 0 || distSq >= radiusSq) return 0;

    const dist = Math.sqrt(distSq);
    const proximity = 1 - dist / threatRadius;
    const pressure = proximity * proximity;

    const desiredX = (dx / dist) * params.maxSpeed;
    const desiredY = (dy / dist) * params.maxSpeed;
    let steerX = desiredX - this.vel.x;
    let steerY = desiredY - this.vel.y;

    const maxMouseForce = params.maxForce * (0.15 + params.mouseThreat * 8) * pressure;
    const mag = Math.hypot(steerX, steerY);
    if (mag > maxMouseForce && mag > 0) {
      const s = maxMouseForce / mag;
      steerX *= s;
      steerY *= s;
    }

    this.acc.x += steerX;
    this.acc.y += steerY;
    return pressure;
  }

  flock(boids, gridHeads, nextIndices, cellSize, gridCols, gridRows, runNeighborhood = true) {
    let total = 0;
    const edgePressure = this.avoidEdges();
    const mousePressure = this.avoidMouse();
    if (!runNeighborhood) return;
    const perceptionSq = state.activePerception * state.activePerception;

    let alignX = 0;
    let alignY = 0;
    let cohesionX = 0;
    let cohesionY = 0;
    let separateX = 0;
    let separateY = 0;
    const neighborBudget = state.activeNeighborBudget;

    const cx = Math.min(gridCols - 1, Math.max(0, (this.pos.x / cellSize) | 0));
    const cy = Math.min(gridRows - 1, Math.max(0, (this.pos.y / cellSize) | 0));

    const gyMin = Math.max(0, cy - GRID_NEIGHBOR_RADIUS);
    const gyMax = Math.min(gridRows - 1, cy + GRID_NEIGHBOR_RADIUS);
    const gxMin = Math.max(0, cx - GRID_NEIGHBOR_RADIUS);
    const gxMax = Math.min(gridCols - 1, cx + GRID_NEIGHBOR_RADIUS);

    outerLoop:
    for (let gy = gyMin; gy <= gyMax; gy += 1) {
      const rowOffset = gy * gridCols;
      for (let gx = gxMin; gx <= gxMax; gx += 1) {
        let index = gridHeads[gx + rowOffset];
        while (index !== -1) {
          const other = boids[index];
          if (other !== this) {
            const dx = this.pos.x - other.pos.x;
            const dy = this.pos.y - other.pos.y;
            const distSq = dx * dx + dy * dy;
            if (distSq > 0 && distSq < perceptionSq) {
              alignX += other.vel.x;
              alignY += other.vel.y;
              cohesionX += other.pos.x;
              cohesionY += other.pos.y;
              const invDistSq = 1 / distSq;
              separateX += dx * invDistSq;
              separateY += dy * invDistSq;
              total += 1;
              if (total >= neighborBudget) break outerLoop;
            }
          }
          index = nextIndices[index];
        }
      }
    }

    if (total <= 0) return;

    const flockSuppression = edgePressure * edgePressure * (0.25 + params.edgeAvoidance * 1.4);
    const mouseSuppression = mousePressure * mousePressure * (0.35 + params.mouseThreat * 0.9);
    const flockWeight = Math.max(0, 1 - flockSuppression) * Math.max(0, 1 - mouseSuppression);
    if (flockWeight <= 0) return;

    const invTotal = 1 / total;
    const maxSpeed = params.maxSpeed;
    const maxForce = params.maxForce;

    alignX *= invTotal;
    alignY *= invTotal;
    let m = Math.hypot(alignX, alignY);
    if (m > 0) {
      const s = maxSpeed / m;
      alignX *= s;
      alignY *= s;
    }
    alignX -= this.vel.x;
    alignY -= this.vel.y;
    m = Math.hypot(alignX, alignY);
    if (m > maxForce && m > 0) {
      const s = maxForce / m;
      alignX *= s;
      alignY *= s;
    }

    cohesionX = cohesionX * invTotal - this.pos.x;
    cohesionY = cohesionY * invTotal - this.pos.y;
    m = Math.hypot(cohesionX, cohesionY);
    if (m > 0) {
      const s = maxSpeed / m;
      cohesionX *= s;
      cohesionY *= s;
    }
    cohesionX -= this.vel.x;
    cohesionY -= this.vel.y;
    m = Math.hypot(cohesionX, cohesionY);
    if (m > maxForce && m > 0) {
      const s = maxForce / m;
      cohesionX *= s;
      cohesionY *= s;
    }

    m = Math.hypot(separateX, separateY);
    if (m > 0) {
      const s = maxSpeed / m;
      separateX *= s;
      separateY *= s;
    }
    separateX -= this.vel.x;
    separateY -= this.vel.y;
    m = Math.hypot(separateX, separateY);
    if (m > maxForce && m > 0) {
      const s = maxForce / m;
      separateX *= s;
      separateY *= s;
    }

    const alignScale = params.alignment * flockWeight;
    const cohesionScale = params.cohesion * flockWeight;
    const separationScale = params.separation * flockWeight;

    this.acc.x += alignX * alignScale;
    this.acc.y += alignY * alignScale;
    this.acc.x += cohesionX * cohesionScale;
    this.acc.y += cohesionY * cohesionScale;
    this.acc.x += separateX * separationScale;
    this.acc.y += separateY * separationScale;
  }

  update(dt) {
    this.vel.x += this.acc.x * dt;
    this.vel.y += this.acc.y * dt;

    const maxSpeed = params.maxSpeed;
    const speedSq = this.vel.x * this.vel.x + this.vel.y * this.vel.y;
    const maxSpeedSq = maxSpeed * maxSpeed;
    if (speedSq > maxSpeedSq) {
      const speed = Math.sqrt(speedSq);
      const s = maxSpeed / speed;
      this.vel.x *= s;
      this.vel.y *= s;
    }

    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.acc.x = 0;
    this.acc.y = 0;
  }

  draw() {
    const speed = Math.hypot(this.vel.x, this.vel.y);
    const speedMix = Math.min(1, speed / (params.maxSpeed || 1));
    const hue = 180 + speedMix * 45;
    const light = 62 + speedMix * 16;

    const dirX = speed > 0 ? this.vel.x / speed : 1;
    const dirY = speed > 0 ? this.vel.y / speed : 0;
    const perpX = -dirY;
    const perpY = dirX;

    const tipX = this.pos.x + dirX * (this.size * 1.7);
    const tipY = this.pos.y + dirY * (this.size * 1.7);
    const leftX = this.pos.x - dirX * this.size + perpX * (this.size * 0.68);
    const leftY = this.pos.y - dirY * this.size + perpY * (this.size * 0.68);
    const midX = this.pos.x - dirX * (this.size * 0.4);
    const midY = this.pos.y - dirY * (this.size * 0.4);
    const rightX = this.pos.x - dirX * this.size - perpX * (this.size * 0.68);
    const rightY = this.pos.y - dirY * this.size - perpY * (this.size * 0.68);

    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(leftX, leftY);
    ctx.lineTo(midX, midY);
    ctx.lineTo(rightX, rightY);
    ctx.closePath();
    ctx.fillStyle = `hsl(${hue}, 90%, ${light}%)`;
    ctx.fill();
  }
}

function resize() {
  const dpr = getTargetDpr();
  const rect = canvas.getBoundingClientRect();
  state.width = Math.max(320, Math.floor(rect.width));
  state.height = Math.max(260, Math.floor(rect.height));
  canvas.width = Math.floor(state.width * dpr);
  canvas.height = Math.floor(state.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  state.gridReady = false;
}

function buildSpatialGrid() {
  const cellSize = Math.max(10, state.activePerception);
  const cols = Math.max(1, Math.ceil(state.width / cellSize));
  const rows = Math.max(1, Math.ceil(state.height / cellSize));
  const cellCount = cols * rows;
  const boidCount = state.boids.length;

  state.gridCellSize = cellSize;
  state.gridCols = cols;
  state.gridRows = rows;

  if (state.gridHeads.length !== cellCount) {
    state.gridHeads = new Int32Array(cellCount);
  }
  if (state.nextIndices.length < boidCount) {
    state.nextIndices = new Int32Array(boidCount);
  }

  state.gridHeads.fill(-1);

  for (let i = 0; i < boidCount; i += 1) {
    const boid = state.boids[i];
    const cx = Math.min(cols - 1, Math.max(0, (boid.pos.x / cellSize) | 0));
    const cy = Math.min(rows - 1, Math.max(0, (boid.pos.y / cellSize) | 0));
    const key = cx + cy * cols;
    state.nextIndices[i] = state.gridHeads[key];
    state.gridHeads[key] = i;
  }
}

function rebuildBoids(targetCount = params.count) {
  state.boids.length = 0;
  for (let i = 0; i < targetCount; i += 1) {
    state.boids.push(new Boid());
  }
  state.gridReady = false;
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
  state.gridReady = false;
}

function formatControlValue(control) {
  const value = Number(control.value);
  if (control.id === "count" && value >= 1000) {
    const k = value / 1000;
    const decimals = k >= 10 ? 0 : 1;
    return `${k.toFixed(decimals).replace(/\.0$/, "")}K`;
  }

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
    if (key === "count") {
      syncCount();
      resize();
    }
    updateSliderReadout(control);
  });
}

function updateMousePosition(event) {
  const rect = canvas.getBoundingClientRect();
  state.mouse.x = event.clientX - rect.left;
  state.mouse.y = event.clientY - rect.top;
}

function adjustMouseThreatFromWheel(event) {
  if (!state.mouse.active) return;
  event.preventDefault();

  const control = controls.mouseThreat;
  const step = Number(control.step || 0.01);
  const min = Number(control.min || 0);
  const max = Number(control.max || 1);
  const decimals = String(control.step || "0.01").includes(".")
    ? String(control.step || "0.01").split(".")[1].length
    : 0;

  const direction = event.deltaY < 0 ? 1 : -1;
  const scrollUnits = Math.max(1, Math.round(Math.abs(event.deltaY) / 40));
  const next = Number(control.value) + direction * step * scrollUnits * 3;
  const clamped = Math.max(min, Math.min(max, Number(next.toFixed(decimals))));
  if (clamped === Number(control.value)) return;

  control.value = String(clamped);
  params.mouseThreat = clamped;
  updateSliderReadout(control);
}

function tick(now) {
  const frameMs = Math.max(0, Math.min(MAX_FRAME_MS, now - state.lastTime));
  state.lastTime = now;

  const fade = 0.05 + (1 - params.trail) * 0.35;
  ctx.fillStyle = `rgba(4, 14, 27, ${fade})`;
  ctx.fillRect(0, 0, state.width, state.height);

  state.activePerception = getAdaptivePerception();
  state.activeNeighborBudget = getNeighborBudget();
  const simHz = getAdaptiveSimHz();
  const simStepMs = 1000 / simHz;
  const simDt = simStepMs / BASE_FRAME_MS;
  const flockInterval = getAdaptiveFlockInterval();
  const gridInterval = getAdaptiveGridInterval();
  const fastRender = state.boids.length >= FAST_RENDER_THRESHOLD;

  if (!state.paused) {
    state.simAccumulatorMs += frameMs;
    const simSteps = Math.min(MAX_SIM_STEPS, Math.floor(state.simAccumulatorMs / simStepMs));

    if (simSteps > 0) {
      for (let step = 0; step < simSteps; step += 1) {
        if (!state.gridReady || (state.simTick % gridInterval) === 0) {
          buildSpatialGrid();
          state.gridReady = true;
        }
        const gridHeads = state.gridHeads;
        const nextIndices = state.nextIndices;
        const cellSize = state.gridCellSize;
        const gridCols = state.gridCols;
        const gridRows = state.gridRows;

        for (let i = 0; i < state.boids.length; i += 1) {
          const boid = state.boids[i];
          const runNeighborhood = ((i + state.simTick) % flockInterval) === 0;
          boid.flock(state.boids, gridHeads, nextIndices, cellSize, gridCols, gridRows, runNeighborhood);
          boid.update(simDt);
          boid.edges();
        }
        state.simTick += 1;
      }
      state.simAccumulatorMs -= simSteps * simStepMs;
    }
  } else {
    state.simAccumulatorMs = 0;
  }

  if (fastRender) {
    ctx.fillStyle = "#7be0c6";
  }
  for (let i = 0; i < state.boids.length; i += 1) {
    if (fastRender) {
      drawFastBoid(state.boids[i]);
    } else {
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
bindControl(controls.mouseThreat, "mouseThreat");
bindControl(controls.trail, "trail");
rangeControls.forEach(updateSliderReadout);

controls.shuffle.addEventListener("click", () => rebuildBoids(params.count));
controls.pause.addEventListener("click", () => {
  state.paused = !state.paused;
  controls.pause.textContent = state.paused ? "Resume" : "Pause";
});

canvas.addEventListener("pointerenter", (event) => {
  state.mouse.active = true;
  updateMousePosition(event);
});

canvas.addEventListener("pointermove", (event) => {
  state.mouse.active = true;
  updateMousePosition(event);
});

canvas.addEventListener("pointerleave", () => {
  state.mouse.active = false;
});

canvas.addEventListener("wheel", adjustMouseThreatFromWheel, { passive: false });
window.addEventListener("resize", resize);

resize();
rebuildBoids(params.count);
state.activePerception = getAdaptivePerception();
ctx.fillStyle = "rgb(4, 14, 27)";
ctx.fillRect(0, 0, state.width, state.height);
requestAnimationFrame((t) => {
  state.lastTime = t;
  tick(t);
});
