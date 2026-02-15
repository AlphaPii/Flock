const BASE_FRAME_MS = 16.666;
const SIM_HZ = 30;
const WORLD_TO_FISH_SCALE = 5;
const GRID_NEIGHBOR_RADIUS = 1;
const MIN_EDGE_MARGIN = 2;
const FAST_RENDER_THRESHOLD = 12000;
const ULTRA_RENDER_THRESHOLD = 17000;
const PREDATOR_COUNT = 0;
const RIVAL_PREDATOR_COUNT = 0;
const MAX_PREDATOR_COUNT = 24;
const PREDATOR_DEATH_SIZE = 0.35;
const AUREL_EAT_COOLDOWN_MS = 1000;
const ZENO_BITE_COOLDOWN_MS = 200;
const ALGAE_FLOW_WEIGHTS = {
  fish: 1.0,
  shrimp: 1.0,
  algae: 0.45,
  zeno: 1.35,
  aurel: 1.8
};

const FISH_GRID_REF = { heads: null, next: null, cellSize: 0, cols: 0, rows: 0 };
const SHRIMP_GRID_REF = { heads: null, next: null, cellSize: 0, cols: 0, rows: 0 };
const ALGAE_GRID_REF = { heads: null, next: null, cellSize: 0, cols: 0, rows: 0 };

const state = {
  boids: [],
  shrimps: [],
  algaes: [],
  predators: [],
  width: 0,
  height: 0,
  paused: false,
  simTick: 0,
  gridHeads: new Int32Array(0),
  nextIndices: new Int32Array(0),
  gridCellSize: 0,
  gridCols: 0,
  gridRows: 0,
  gridReady: false,
  shrimpGridHeads: new Int32Array(0),
  shrimpNextIndices: new Int32Array(0),
  shrimpGridCellSize: 0,
  shrimpGridCols: 0,
  shrimpGridRows: 0,
  shrimpGridReady: false,
  algaeGridHeads: new Int32Array(0),
  algaeNextIndices: new Int32Array(0),
  algaeGridCellSize: 0,
  algaeGridCols: 0,
  algaeGridRows: 0,
  algaeGridReady: false,
  activePerception: 0,
  activeShrimpPerception: 0,
  activeAlgaePerception: 0,
  activeNeighborBudget: Number.POSITIVE_INFINITY,
  mouse: {
    active: false,
    x: 0,
    y: 0
  },
  loopHandle: null,
  elapsedMs: 0,
  preyEaten: 0,
  zenoBites: 0,
  algaeCloneCarry: 0
};

const params = {
  count: 0,
  perception: 35,
  separation: 1.65,
  clusterAvoidance: 0.8,
  alignment: 1.5,
  cohesion: 1.2,
  maxSpeed: 3,
  maxForce: 0.14,
  wallReach: 0.75,
  wallFade: 4.0,
  wallStrength: 1.0,
  fishAlgaeInterestCooldown: 250,
  fishAlgaeMealsToReproduce: 6,
  fishPopulationPenalty: 1.0,
  fishPopulationPenaltyDelay: 0.0,
  fishToroidal: false,
  shrimpCount: 10000,
  shrimpPerception: 20,
  shrimpSeparation: 1.65,
  shrimpClusterAvoidance: 0.8,
  shrimpAlignment: 1.05,
  shrimpCohesion: 0.55,
  shrimpSpeed: 1.0,
  shrimpJumpSpeed: 4.5,
  shrimpMaxForce: 0.26,
  shrimpWallReach: 0.7,
  shrimpWallFade: 3.2,
  shrimpWallStrength: 1.0,
  shrimpFishAvoidance: 0.9,
  shrimpAlgaeInterestCooldown: 350,
  shrimpAlgaeMealsToReproduce: 8,
  shrimpPopulationPenalty: 1.0,
  shrimpPopulationPenaltyDelay: 0.0,
  shrimpToroidal: false,
  algaeCount: 0,
  algaePerception: 40,
  algaeCurrentSensitivity: 0.8,
  algaeSeparation: 0.4,
  algaeSpeed: 0.8,
  predatorSize: 2.0,
  predatorGrowthSpan: 2.0,
  predatorThreat: 1.2,
  predatorSeparation: 2.0,
  predatorSteeringForce: 0.24,
  predatorSpeed: 0.1,
  predatorMaxSpeed: 10.0,
  predatorMaxSprint: 1.2,
  predatorSprintDrain: 0.0,
  predatorAggressiveness: 0.1,
  predator2SizeFraction: 0.7,
  predator2Damage: 0.4,
  predator2Threat: 1.0,
  predator2Separation: 0.5,
  predator2SteeringForce: 0.5,
  predator2Speed: 3.0,
  predator2MaxSprint: 3.0,
  predator2SprintDrain: 0.0,
  predator2Aggressiveness: 0.4,
  mouseThreat: 1.0,
  wallViewportOffset: 0.25,
  algaeWallReach: 0.5,
  algaeWallFade: 4.0,
  algaeWallStrength: 0.4,
  algaeGrowthRate: 2.0,
  algaePopulationPenalty: 0.0,
  algaePopulationPenaltyDelay: 0.0,
  algaeToroidal: true,
  trail: 0
};

function getWallOffsetPx() {
  const normalized = Math.max(0, params.wallViewportOffset);
  const base = Math.max(1, Math.min(state.width, state.height));
  return normalized * base;
}

function getWorldBounds(margin = 0) {
  const offset = getWallOffsetPx();
  const left = margin - offset;
  const right = state.width - margin + offset;
  const top = margin - offset;
  const bottom = state.height - margin + offset;
  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
    centerX: (left + right) * 0.5,
    centerY: (top + bottom) * 0.5
  };
}

function getPopulationCaps() {
  const w = Math.max(1, state.width);
  const h = Math.max(1, state.height);
  if (w >= 1000 && h >= 1000) {
    return { fish: 10000, shrimp: 5000, algae: 20000, aurel: 10, zeno: 8 };
  }
  if (w >= 500 && h >= 500) {
    return { fish: 5000, shrimp: 2500, algae: 10000, aurel: 6, zeno: 5 };
  }
  return { fish: 1200, shrimp: 600, algae: 3000, aurel: 4, zeno: 3 };
}

function getCapPressure(count, cap) {
  if (cap <= 0) return 1;
  return Math.max(0, Math.min(1, count / cap));
}

function getDelayedPenaltyPressure(count, cap, delayPercent = 0) {
  if (cap <= 0) return 1;
  // Delay is configured as % of population cap where penalty begins.
  // Backward-compatible: values <= 1 are treated as a legacy fraction.
  const raw = Number(delayPercent) || 0;
  const delayFraction = raw <= 1 ? raw : raw / 100;
  const delay = Math.max(0, Math.min(0.95, delayFraction));
  if (delay <= 0) return getCapPressure(count, cap);
  const startCount = cap * delay;
  if (count <= startCount) return 0;
  const span = Math.max(1, cap - startCount);
  return Math.max(0, Math.min(1, (count - startCount) / span));
}

function getSoftReproductionAllowance(count, cap, penaltySeverity = 1, penaltyDelay = 0) {
  const pressure = getDelayedPenaltyPressure(count, cap, penaltyDelay);
  const severity = Math.max(0, penaltySeverity);
  return Math.max(0, 1 - Math.pow(pressure, 1 + severity * 1.2));
}

function getRequiredMeals(baseMeals, count, cap, penaltySeverity, penaltyDelay = 0) {
  const base = Math.max(1, baseMeals);
  const severity = Math.max(0, penaltySeverity);
  const pressure = Math.max(0, Math.min(0.999, getDelayedPenaltyPressure(count, cap, penaltyDelay)));
  const inflation = 1 + severity * (pressure * pressure) / Math.max(0.04, 1 - pressure);
  return base * inflation;
}

let baseAurelThreat = params.predatorThreat;
let baseZenoThreat = params.predator2Threat;
let baseAurelSprintDrain = params.predatorSprintDrain;
let baseAurelMaxSpeed = params.predatorMaxSpeed;
let baseZenoSpeed = params.predator2Speed;
let baseZenoAggressiveness = params.predator2Aggressiveness;
let baseZenoDamage = params.predator2Damage;
let baseZenoSprintDrain = params.predator2SprintDrain;

function getRivalSizeFraction() {
  return Math.max(0.5, Math.min(0.9, params.predator2SizeFraction));
}

function getApexMinSize() {
  return Math.max(PREDATOR_DEATH_SIZE, params.predatorSize);
}

function getApexMaxSize() {
  const min = getApexMinSize();
  const span = Math.max(0, Math.min(2, params.predatorGrowthSpan));
  return Math.max(min + 0.2, min * (1 + span));
}

function getPredatorMinSize(kind = 1) {
  if (kind === 2) return Math.max(PREDATOR_DEATH_SIZE, getApexMinSize() * getRivalSizeFraction());
  return getApexMinSize();
}

function getPredatorMaxSize(kind = 1) {
  if (kind === 2) return Math.max(getPredatorMinSize(2) + 0.2, getApexMaxSize() * getRivalSizeFraction());
  return getApexMaxSize();
}

function clampPredatorSize(value, kind = 1) {
  const min = getPredatorMinSize(kind);
  const max = getPredatorMaxSize(kind);
  return Math.max(min, Math.min(max, value));
}

function getPredatorBounds() {
  return {
    apexMin: getPredatorMinSize(1),
    apexMax: getPredatorMaxSize(1),
    rivalMin: getPredatorMinSize(2),
    rivalMax: getPredatorMaxSize(2)
  };
}

function updateDynamicThreatLevels() {
  let aurelCount = 0;
  let zenoCount = 0;
  for (let i = 0; i < state.predators.length; i += 1) {
    if (state.predators[i].kind === 2) zenoCount += 1;
    else aurelCount += 1;
  }

  const aurelExtra = Math.max(0, aurelCount - PREDATOR_COUNT);
  const zenoExtra = Math.max(0, zenoCount - RIVAL_PREDATOR_COUNT);
  const aurelBonus = Math.min(1, aurelExtra * 0.08);
  const zenoBonus = Math.min(1, zenoExtra * 0.08);
  const aurelSprintBonus = Math.min(0.08, aurelExtra * 0.003);
  const aurelSpeedPenalty = Math.min(2.4, aurelExtra * 0.22);

  let zenoSpeedPenalty = 0;
  if (zenoCount >= 6) zenoSpeedPenalty = 2.0;
  else if (zenoCount >= 5) zenoSpeedPenalty = 1.5;
  else if (zenoCount >= 3) zenoSpeedPenalty = 1.0;
  else if (zenoCount >= 2) zenoSpeedPenalty = 0.5;

  const zenoAggressionBonus = zenoCount >= 5 ? 0.1 : 0;
  const zenoDamagePenalty = zenoCount >= 6 ? 0.2 : 0;

  let zenoSprintFloor = 0;
  if (zenoCount >= 6) zenoSprintFloor = 0.03;
  else if (zenoCount >= 5) zenoSprintFloor = 0.01;
  else if (zenoCount >= 3) zenoSprintFloor = 0.001;

  params.predatorThreat = Math.max(0, Math.min(2, baseAurelThreat + aurelBonus));
  params.predator2Threat = Math.max(0, Math.min(2, baseZenoThreat + zenoBonus));
  params.predatorSprintDrain = Math.max(0, Math.min(0.08, baseAurelSprintDrain + aurelSprintBonus));
  params.predatorMaxSpeed = Math.max(0.8, Math.min(10, baseAurelMaxSpeed - aurelSpeedPenalty));
  params.predator2Speed = Math.max(0.8, Math.min(10, baseZenoSpeed - zenoSpeedPenalty));
  params.predator2Aggressiveness = Math.max(0, Math.min(1, baseZenoAggressiveness + zenoAggressionBonus));
  params.predator2Damage = Math.max(0.01, Math.min(1, baseZenoDamage - zenoDamagePenalty));
  params.predator2SprintDrain = Math.max(0, Math.min(0.08, Math.max(baseZenoSprintDrain, zenoSprintFloor)));
}

class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
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
    this.panicBoost = 1;
    this.nextAlgaeInterestMs = 0;
    this.algaeMeals = 0;
  }

  edges() {
    const margin = Math.max(MIN_EDGE_MARGIN, this.size * 1.7);
    const bounds = getWorldBounds(margin);
    if (params.fishToroidal) {
      const spanX = Math.max(1, bounds.width);
      const spanY = Math.max(1, bounds.height);
      while (this.pos.x < bounds.left) this.pos.x += spanX;
      while (this.pos.x > bounds.right) this.pos.x -= spanX;
      while (this.pos.y < bounds.top) this.pos.y += spanY;
      while (this.pos.y > bounds.bottom) this.pos.y -= spanY;
      return;
    }

    if (this.pos.x < bounds.left) {
      this.pos.x = bounds.left;
      if (this.vel.x < 0) this.vel.x = 0;
    } else if (this.pos.x > bounds.right) {
      this.pos.x = bounds.right;
      if (this.vel.x > 0) this.vel.x = 0;
    }

    if (this.pos.y < bounds.top) {
      this.pos.y = bounds.top;
      if (this.vel.y < 0) this.vel.y = 0;
    } else if (this.pos.y > bounds.bottom) {
      this.pos.y = bounds.bottom;
      if (this.vel.y > 0) this.vel.y = 0;
    }
  }

  avoidEdges() {
    if (params.fishToroidal) return 0;
    const wallStrength = Math.max(0, params.wallStrength);
    if (wallStrength <= 0) return 0;

    const margin = Math.max(MIN_EDGE_MARGIN, this.size * 1.7);
    const bounds = getWorldBounds(margin);
    const halfMinDimension = Math.max(1, Math.min(bounds.width, bounds.height) * 0.5);

    const leftDist = Math.max(0, this.pos.x - bounds.left);
    const rightDist = Math.max(0, bounds.right - this.pos.x);
    const topDist = Math.max(0, this.pos.y - bounds.top);
    const bottomDist = Math.max(0, bounds.bottom - this.pos.y);

    const reach = Math.max(0, Math.min(1, params.wallReach));
    if (reach <= 0) return 0;
    // Reach is capped by halfMinDimension so opposite-wall influence never overlaps.
    const influenceDistance = Math.max(margin * 2.2, Math.min(halfMinDimension, halfMinDimension * reach));
    const fadePower = Math.max(0.25, params.wallFade);
    const maxSpeed = Math.max(0.01, params.maxSpeed);
    let pushX = 0;
    let pushY = 0;
    let edgePressure = 0;

    if (leftDist < influenceDistance) {
      const proximity = 1 - leftDist / influenceDistance;
      const toward = Math.max(0, -this.vel.x) / maxSpeed;
      const pressure = Math.max(0, Math.min(1, Math.pow(proximity, fadePower) * (1 + toward * 1.6)));
      pushX += pressure;
      edgePressure = Math.max(edgePressure, pressure);
      if (leftDist < margin * 2.2 && this.vel.x < 0) {
        const near = Math.max(0, Math.min(1, 1 - leftDist / (margin * 2.2)));
        this.vel.x *= Math.max(0.08, 0.35 - near * 0.25);
      }
    }

    if (rightDist < influenceDistance) {
      const proximity = 1 - rightDist / influenceDistance;
      const toward = Math.max(0, this.vel.x) / maxSpeed;
      const pressure = Math.max(0, Math.min(1, Math.pow(proximity, fadePower) * (1 + toward * 1.6)));
      pushX -= pressure;
      edgePressure = Math.max(edgePressure, pressure);
      if (rightDist < margin * 2.2 && this.vel.x > 0) {
        const near = Math.max(0, Math.min(1, 1 - rightDist / (margin * 2.2)));
        this.vel.x *= Math.max(0.08, 0.35 - near * 0.25);
      }
    }

    if (topDist < influenceDistance) {
      const proximity = 1 - topDist / influenceDistance;
      const toward = Math.max(0, -this.vel.y) / maxSpeed;
      const pressure = Math.max(0, Math.min(1, Math.pow(proximity, fadePower) * (1 + toward * 1.6)));
      pushY += pressure;
      edgePressure = Math.max(edgePressure, pressure);
      if (topDist < margin * 2.2 && this.vel.y < 0) {
        const near = Math.max(0, Math.min(1, 1 - topDist / (margin * 2.2)));
        this.vel.y *= Math.max(0.08, 0.35 - near * 0.25);
      }
    }

    if (bottomDist < influenceDistance) {
      const proximity = 1 - bottomDist / influenceDistance;
      const toward = Math.max(0, this.vel.y) / maxSpeed;
      const pressure = Math.max(0, Math.min(1, Math.pow(proximity, fadePower) * (1 + toward * 1.6)));
      pushY -= pressure;
      edgePressure = Math.max(edgePressure, pressure);
      if (bottomDist < margin * 2.2 && this.vel.y > 0) {
        const near = Math.max(0, Math.min(1, 1 - bottomDist / (margin * 2.2)));
        this.vel.y *= Math.max(0.08, 0.35 - near * 0.25);
      }
    }

    const pushMag = Math.hypot(pushX, pushY);
    if (pushMag <= 0 || edgePressure <= 0) return 0;

    const desiredAwaySpeed = maxSpeed * (0.2 + edgePressure * 0.8);
    const dirX = pushX / pushMag;
    const dirY = pushY / pushMag;
    const steerLimit = params.maxForce * edgePressure * wallStrength * 4;
    let steerX = dirX * desiredAwaySpeed - this.vel.x;
    let steerY = dirY * desiredAwaySpeed - this.vel.y;
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

  avoidPredators(predators) {
    const threatLevel = Math.max(0, params.predatorThreat);
    if (threatLevel <= 0 || predators.length === 0) {
      this.panicBoost = 1;
      return 0;
    }

    let maxPressure = 0;
    const maxSpeed = Math.max(0.01, params.maxSpeed);

    for (let i = 0; i < predators.length; i += 1) {
      const predator = predators[i];
      if (predator.kind === 2) continue;
      const dx = this.pos.x - predator.pos.x;
      const dy = this.pos.y - predator.pos.y;
      const distSq = dx * dx + dy * dy;
      const threatRadius = Math.max(55, predator.size * 14 + params.perception * 1.9);
      const radiusSq = threatRadius * threatRadius;
      if (distSq <= 0 || distSq >= radiusSq) continue;

      const dist = Math.sqrt(distSq);
      const proximity = 1 - dist / threatRadius;
      const pressure = Math.max(0, Math.min(1, proximity * proximity));
      maxPressure = Math.max(maxPressure, pressure);

      const desiredAwaySpeed = maxSpeed * (1 + threatLevel * 0.45);
      const desiredX = (dx / dist) * desiredAwaySpeed;
      const desiredY = (dy / dist) * desiredAwaySpeed;
      let steerX = desiredX - this.vel.x;
      let steerY = desiredY - this.vel.y;

      const maxPredForce = params.maxForce * threatLevel * (0.45 + pressure * 5.2);
      const mag = Math.hypot(steerX, steerY);
      if (mag > maxPredForce && mag > 0) {
        const s = maxPredForce / mag;
        steerX *= s;
        steerY *= s;
      }

      this.acc.x += steerX;
      this.acc.y += steerY;
    }

    const targetPanic = 1 + Math.pow(maxPressure, 0.55) * (0.25 + threatLevel * 1.75);
    const clampedPanic = Math.max(1, Math.min(3, targetPanic));
    this.panicBoost += (clampedPanic - this.panicBoost) * 0.35;

    return maxPressure;
  }

  flock(boids, gridHeads, nextIndices, cellSize, gridCols, gridRows, runNeighborhood = true) {
    const edgePressure = this.avoidEdges();
    const mousePressure = this.avoidMouse();
    const predatorPressure = this.avoidPredators(state.predators);
    if (!runNeighborhood) return;

    const perceptionSq = state.activePerception * state.activePerception;
    const neighborBudget = state.activeNeighborBudget;

    let total = 0;
    let alignX = 0;
    let alignY = 0;
    let cohesionX = 0;
    let cohesionY = 0;
    let separateX = 0;
    let separateY = 0;

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

    const edgeSuppression = edgePressure * edgePressure * (0.12 + params.wallStrength * 0.6);
    const mouseSuppression = mousePressure * mousePressure * (0.35 + params.mouseThreat * 0.9);
    const predatorSuppression = predatorPressure * predatorPressure * (0.3 + params.predatorThreat * 1.1);
    const headingWeight =
      Math.max(0, 1 - edgeSuppression) *
      Math.max(0, 1 - mouseSuppression) *
      Math.max(0, 1 - predatorSuppression);

    const invTotal = 1 / total;
    const maxSpeed = params.maxSpeed;
    const maxForce = params.maxForce;
    const centroidOffsetX = cohesionX * invTotal - this.pos.x;
    const centroidOffsetY = cohesionY * invTotal - this.pos.y;
    const clusterAvoid = Math.max(0, params.clusterAvoidance);
    if (clusterAvoid > 0) {
      const centroidDist = Math.hypot(centroidOffsetX, centroidOffsetY);
      if (centroidDist > 0) {
        const density = Math.min(1, total / Math.max(8, state.activeNeighborBudget * 0.45));
        const proximity = Math.max(0, 1 - centroidDist / Math.max(1, state.activePerception));
        const clusterPressure = Math.max(0, Math.min(1, density * (0.35 + proximity * 0.65)));
        if (clusterPressure > 0) {
          let clusterX = (-centroidOffsetX / centroidDist) * maxSpeed - this.vel.x;
          let clusterY = (-centroidOffsetY / centroidDist) * maxSpeed - this.vel.y;
          const clusterLimit = maxForce * clusterAvoid * (0.18 + clusterPressure * 2.7);
          const clusterMag = Math.hypot(clusterX, clusterY);
          if (clusterMag > clusterLimit && clusterMag > 0) {
            const s = clusterLimit / clusterMag;
            clusterX *= s;
            clusterY *= s;
          }
          this.acc.x += clusterX;
          this.acc.y += clusterY;
        }
      }
    }

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

    cohesionX = centroidOffsetX;
    cohesionY = centroidOffsetY;
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

    const alignScale = params.alignment * headingWeight;
    const cohesionScale = params.cohesion * headingWeight;
    const edgeSeparationBoost = 1 + edgePressure * (0.45 + params.wallStrength * 0.95);
    const predatorSeparationBoost = 1 + predatorPressure * (0.8 + params.predatorThreat * 1.1);
    const separationScale = params.separation * edgeSeparationBoost * predatorSeparationBoost;

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

    const maxSpeed = Math.max(0.01, params.maxSpeed * this.panicBoost);
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
}

class Shrimp {
  constructor() {
    this.pos = new Vec2(Math.random() * state.width, Math.random() * state.height);
    const angle = Math.random() * Math.PI * 2;
    this.vel = new Vec2(Math.cos(angle), Math.sin(angle));
    this.vel.x *= params.shrimpSpeed * (0.65 + Math.random() * 0.35);
    this.vel.y *= params.shrimpSpeed * (0.65 + Math.random() * 0.35);
    this.acc = new Vec2();
    this.size = (2.2 + Math.random() * 1.1) / WORLD_TO_FISH_SCALE;
    this.jumpBoost = 0;
    this.nextAlgaeInterestMs = 0;
    this.algaeMeals = 0;
  }

  edges() {
    const margin = Math.max(MIN_EDGE_MARGIN, this.size * 1.5);
    const bounds = getWorldBounds(margin);
    if (params.shrimpToroidal) {
      const spanX = Math.max(1, bounds.width);
      const spanY = Math.max(1, bounds.height);
      while (this.pos.x < bounds.left) this.pos.x += spanX;
      while (this.pos.x > bounds.right) this.pos.x -= spanX;
      while (this.pos.y < bounds.top) this.pos.y += spanY;
      while (this.pos.y > bounds.bottom) this.pos.y -= spanY;
      return;
    }

    if (this.pos.x < bounds.left) {
      this.pos.x = bounds.left;
      if (this.vel.x < 0) this.vel.x = 0;
    } else if (this.pos.x > bounds.right) {
      this.pos.x = bounds.right;
      if (this.vel.x > 0) this.vel.x = 0;
    }

    if (this.pos.y < bounds.top) {
      this.pos.y = bounds.top;
      if (this.vel.y < 0) this.vel.y = 0;
    } else if (this.pos.y > bounds.bottom) {
      this.pos.y = bounds.bottom;
      if (this.vel.y > 0) this.vel.y = 0;
    }
  }

  avoidEdges() {
    if (params.shrimpToroidal) return 0;
    const wallStrength = Math.max(0, params.shrimpWallStrength);
    if (wallStrength <= 0) return 0;

    const margin = Math.max(MIN_EDGE_MARGIN, this.size * 1.5);
    const bounds = getWorldBounds(margin);
    const halfMinDimension = Math.max(1, Math.min(bounds.width, bounds.height) * 0.5);
    const reach = Math.max(0, Math.min(1, params.shrimpWallReach));
    if (reach <= 0) return 0;

    const influenceDistance = Math.max(margin * 2, Math.min(halfMinDimension, halfMinDimension * reach));
    const fadePower = Math.max(0.25, params.shrimpWallFade);
    const maxSpeed = Math.max(0.01, params.shrimpSpeed + params.shrimpJumpSpeed);

    const leftDist = Math.max(0, this.pos.x - bounds.left);
    const rightDist = Math.max(0, bounds.right - this.pos.x);
    const topDist = Math.max(0, this.pos.y - bounds.top);
    const bottomDist = Math.max(0, bounds.bottom - this.pos.y);

    let pushX = 0;
    let pushY = 0;
    let edgePressure = 0;

    if (leftDist < influenceDistance) {
      const proximity = 1 - leftDist / influenceDistance;
      const toward = Math.max(0, -this.vel.x) / maxSpeed;
      const pressure = Math.max(0, Math.min(1, Math.pow(proximity, fadePower) * (1 + toward * 1.5)));
      pushX += pressure;
      edgePressure = Math.max(edgePressure, pressure);
    }
    if (rightDist < influenceDistance) {
      const proximity = 1 - rightDist / influenceDistance;
      const toward = Math.max(0, this.vel.x) / maxSpeed;
      const pressure = Math.max(0, Math.min(1, Math.pow(proximity, fadePower) * (1 + toward * 1.5)));
      pushX -= pressure;
      edgePressure = Math.max(edgePressure, pressure);
    }
    if (topDist < influenceDistance) {
      const proximity = 1 - topDist / influenceDistance;
      const toward = Math.max(0, -this.vel.y) / maxSpeed;
      const pressure = Math.max(0, Math.min(1, Math.pow(proximity, fadePower) * (1 + toward * 1.5)));
      pushY += pressure;
      edgePressure = Math.max(edgePressure, pressure);
    }
    if (bottomDist < influenceDistance) {
      const proximity = 1 - bottomDist / influenceDistance;
      const toward = Math.max(0, this.vel.y) / maxSpeed;
      const pressure = Math.max(0, Math.min(1, Math.pow(proximity, fadePower) * (1 + toward * 1.5)));
      pushY -= pressure;
      edgePressure = Math.max(edgePressure, pressure);
    }

    const pushMag = Math.hypot(pushX, pushY);
    if (pushMag <= 0 || edgePressure <= 0) return 0;

    const desiredAwaySpeed = maxSpeed * (0.15 + edgePressure * 0.75);
    const dirX = pushX / pushMag;
    const dirY = pushY / pushMag;
    const steerLimit = params.shrimpMaxForce * edgePressure * wallStrength * 4.2;
    let steerX = dirX * desiredAwaySpeed - this.vel.x;
    let steerY = dirY * desiredAwaySpeed - this.vel.y;
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
    const threatRadius = Math.max(70, params.shrimpPerception * 4.2);
    const radiusSq = threatRadius * threatRadius;
    if (distSq <= 0 || distSq >= radiusSq) return 0;

    const dist = Math.sqrt(distSq);
    const proximity = 1 - dist / threatRadius;
    const pressure = proximity * proximity;
    const desiredSpeed = params.shrimpSpeed + params.shrimpJumpSpeed * Math.min(1, pressure * (0.55 + params.mouseThreat * 0.7));

    const desiredX = (dx / dist) * desiredSpeed;
    const desiredY = (dy / dist) * desiredSpeed;
    let steerX = desiredX - this.vel.x;
    let steerY = desiredY - this.vel.y;

    const maxMouseForce = params.shrimpMaxForce * (0.3 + params.mouseThreat * 6.2) * pressure;
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

  avoidPredators(predators) {
    const threatLevel = Math.max(0, params.predatorThreat);
    if (threatLevel <= 0 || predators.length === 0) {
      this.jumpBoost += (0 - this.jumpBoost) * 0.2;
      return 0;
    }

    let maxPressure = 0;
    const maxSpeed = Math.max(0.01, params.shrimpSpeed + params.shrimpJumpSpeed);

    for (let i = 0; i < predators.length; i += 1) {
      const predator = predators[i];
      if (predator.kind === 2) continue;
      const dx = this.pos.x - predator.pos.x;
      const dy = this.pos.y - predator.pos.y;
      const distSq = dx * dx + dy * dy;
      const threatRadius = Math.max(45, predator.size * 14 + params.shrimpPerception * 1.5);
      const radiusSq = threatRadius * threatRadius;
      if (distSq <= 0 || distSq >= radiusSq) continue;

      const dist = Math.sqrt(distSq);
      const proximity = 1 - dist / threatRadius;
      const pressure = Math.max(0, Math.min(1, proximity * proximity));
      maxPressure = Math.max(maxPressure, pressure);

      const jumpSpeed = params.shrimpJumpSpeed * pressure * (0.65 + threatLevel * 0.35);
      const desiredAwaySpeed = Math.min(maxSpeed, params.shrimpSpeed + jumpSpeed);
      const desiredX = (dx / dist) * desiredAwaySpeed;
      const desiredY = (dy / dist) * desiredAwaySpeed;
      let steerX = desiredX - this.vel.x;
      let steerY = desiredY - this.vel.y;

      const maxPredForce = params.shrimpMaxForce * threatLevel * (0.55 + pressure * 6.4);
      const mag = Math.hypot(steerX, steerY);
      if (mag > maxPredForce && mag > 0) {
        const s = maxPredForce / mag;
        steerX *= s;
        steerY *= s;
      }

      this.acc.x += steerX;
      this.acc.y += steerY;
    }

    this.jumpBoost += (maxPressure - this.jumpBoost) * 0.28;
    return maxPressure;
  }

  avoidFish(boids, fishGridHeads, fishNextIndices, fishCellSize, fishGridCols, fishGridRows) {
    const fishAvoidance = Math.max(0, params.shrimpFishAvoidance);
    if (fishAvoidance <= 0 || boids.length === 0 || fishGridCols <= 0 || fishGridRows <= 0) return 0;

    const perception = Math.max(18, params.shrimpPerception);
    const perceptionSq = perception * perception;
    let separateX = 0;
    let separateY = 0;
    let fishPressure = 0;
    let total = 0;

    const cx = Math.min(fishGridCols - 1, Math.max(0, (this.pos.x / fishCellSize) | 0));
    const cy = Math.min(fishGridRows - 1, Math.max(0, (this.pos.y / fishCellSize) | 0));
    const gyMin = Math.max(0, cy - GRID_NEIGHBOR_RADIUS);
    const gyMax = Math.min(fishGridRows - 1, cy + GRID_NEIGHBOR_RADIUS);
    const gxMin = Math.max(0, cx - GRID_NEIGHBOR_RADIUS);
    const gxMax = Math.min(fishGridCols - 1, cx + GRID_NEIGHBOR_RADIUS);

    for (let gy = gyMin; gy <= gyMax; gy += 1) {
      const rowOffset = gy * fishGridCols;
      for (let gx = gxMin; gx <= gxMax; gx += 1) {
        let index = fishGridHeads[gx + rowOffset];
        while (index !== -1) {
          const fish = boids[index];
          const dx = this.pos.x - fish.pos.x;
          const dy = this.pos.y - fish.pos.y;
          const distSq = dx * dx + dy * dy;
          if (distSq > 0 && distSq < perceptionSq) {
            const invDistSq = 1 / distSq;
            separateX += dx * invDistSq;
            separateY += dy * invDistSq;
            const dist = Math.sqrt(distSq);
            fishPressure = Math.max(fishPressure, 1 - dist / perception);
            total += 1;
          }
          index = fishNextIndices[index];
        }
      }
    }

    if (total <= 0) return 0;
    const m = Math.hypot(separateX, separateY);
    if (m <= 0) return fishPressure;

    const maxSpeed = Math.max(0.01, params.shrimpSpeed + params.shrimpJumpSpeed);
    const desiredX = (separateX / m) * maxSpeed;
    const desiredY = (separateY / m) * maxSpeed;
    let steerX = desiredX - this.vel.x;
    let steerY = desiredY - this.vel.y;

    const maxForce = params.shrimpMaxForce * fishAvoidance * (0.2 + fishPressure * 2.8);
    const steerMag = Math.hypot(steerX, steerY);
    if (steerMag > maxForce && steerMag > 0) {
      const s = maxForce / steerMag;
      steerX *= s;
      steerY *= s;
    }

    this.acc.x += steerX;
    this.acc.y += steerY;
    return fishPressure;
  }

  flock(shrimps, shrimpGridHeads, shrimpNextIndices, shrimpCellSize, shrimpGridCols, shrimpGridRows, fishGrid, runNeighborhood = true) {
    const edgePressure = this.avoidEdges();
    const mousePressure = this.avoidMouse();
    const predatorPressure = this.avoidPredators(state.predators);
    const fishPressure = this.avoidFish(
      state.boids,
      fishGrid.heads,
      fishGrid.next,
      fishGrid.cellSize,
      fishGrid.cols,
      fishGrid.rows
    );
    if (!runNeighborhood) return;

    const perceptionSq = state.activeShrimpPerception * state.activeShrimpPerception;
    const neighborBudget = state.activeNeighborBudget;

    let total = 0;
    let alignX = 0;
    let alignY = 0;
    let cohesionX = 0;
    let cohesionY = 0;
    let separateX = 0;
    let separateY = 0;

    const cx = Math.min(shrimpGridCols - 1, Math.max(0, (this.pos.x / shrimpCellSize) | 0));
    const cy = Math.min(shrimpGridRows - 1, Math.max(0, (this.pos.y / shrimpCellSize) | 0));
    const gyMin = Math.max(0, cy - GRID_NEIGHBOR_RADIUS);
    const gyMax = Math.min(shrimpGridRows - 1, cy + GRID_NEIGHBOR_RADIUS);
    const gxMin = Math.max(0, cx - GRID_NEIGHBOR_RADIUS);
    const gxMax = Math.min(shrimpGridCols - 1, cx + GRID_NEIGHBOR_RADIUS);

    outerLoop:
    for (let gy = gyMin; gy <= gyMax; gy += 1) {
      const rowOffset = gy * shrimpGridCols;
      for (let gx = gxMin; gx <= gxMax; gx += 1) {
        let index = shrimpGridHeads[gx + rowOffset];
        while (index !== -1) {
          const other = shrimps[index];
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
          index = shrimpNextIndices[index];
        }
      }
    }

    if (total <= 0) return;

    const edgeSuppression = edgePressure * edgePressure * (0.12 + params.shrimpWallStrength * 0.6);
    const mouseSuppression = mousePressure * mousePressure * (0.3 + params.mouseThreat * 0.8);
    const predatorSuppression = predatorPressure * predatorPressure * (0.25 + params.predatorThreat);
    const fishSuppression = fishPressure * fishPressure * (0.2 + params.shrimpFishAvoidance * 0.35);
    const headingWeight =
      Math.max(0, 1 - edgeSuppression) *
      Math.max(0, 1 - mouseSuppression) *
      Math.max(0, 1 - predatorSuppression) *
      Math.max(0, 1 - fishSuppression);

    const invTotal = 1 / total;
    const maxSpeed = Math.max(0.01, params.shrimpSpeed + params.shrimpJumpSpeed);
    const maxForce = Math.max(0.01, params.shrimpMaxForce);
    const centroidOffsetX = cohesionX * invTotal - this.pos.x;
    const centroidOffsetY = cohesionY * invTotal - this.pos.y;
    const clusterAvoid = Math.max(0, params.shrimpClusterAvoidance);
    if (clusterAvoid > 0) {
      const centroidDist = Math.hypot(centroidOffsetX, centroidOffsetY);
      if (centroidDist > 0) {
        const density = Math.min(1, total / Math.max(8, state.activeNeighborBudget * 0.45));
        const proximity = Math.max(0, 1 - centroidDist / Math.max(1, state.activeShrimpPerception));
        const clusterPressure = Math.max(0, Math.min(1, density * (0.35 + proximity * 0.65)));
        if (clusterPressure > 0) {
          let clusterX = (-centroidOffsetX / centroidDist) * maxSpeed - this.vel.x;
          let clusterY = (-centroidOffsetY / centroidDist) * maxSpeed - this.vel.y;
          const clusterLimit = maxForce * clusterAvoid * (0.18 + clusterPressure * 2.7);
          const clusterMag = Math.hypot(clusterX, clusterY);
          if (clusterMag > clusterLimit && clusterMag > 0) {
            const s = clusterLimit / clusterMag;
            clusterX *= s;
            clusterY *= s;
          }
          this.acc.x += clusterX;
          this.acc.y += clusterY;
        }
      }
    }

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

    cohesionX = centroidOffsetX;
    cohesionY = centroidOffsetY;
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

    const alignScale = params.shrimpAlignment * headingWeight;
    const cohesionScale = params.shrimpCohesion * headingWeight;
    const separationScale = params.shrimpSeparation * (1 + edgePressure * 0.7 + predatorPressure * 1.1);

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

    const jumpSpeed = Math.max(0, params.shrimpJumpSpeed) * Math.max(0, Math.min(1, this.jumpBoost * 1.35));
    const maxSpeed = Math.max(0.01, params.shrimpSpeed + jumpSpeed);
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
}

class Algae {
  constructor() {
    this.pos = new Vec2(Math.random() * state.width, Math.random() * state.height);
    const angle = Math.random() * Math.PI * 2;
    const baseSpeed = Math.max(0.02, params.algaeSpeed);
    this.vel = new Vec2(Math.cos(angle) * baseSpeed * 0.5, Math.sin(angle) * baseSpeed * 0.5);
    this.size = (1 + Math.random() * 0.4) / WORLD_TO_FISH_SCALE;
  }

  edges() {
    const margin = Math.max(1, this.size * 1.2);
    const bounds = getWorldBounds(margin);
    if (params.algaeToroidal) {
      const spanX = Math.max(1, bounds.width);
      const spanY = Math.max(1, bounds.height);
      while (this.pos.x < bounds.left) this.pos.x += spanX;
      while (this.pos.x > bounds.right) this.pos.x -= spanX;
      while (this.pos.y < bounds.top) this.pos.y += spanY;
      while (this.pos.y > bounds.bottom) this.pos.y -= spanY;
      return;
    }

    if (this.pos.x < bounds.left) {
      this.pos.x = bounds.left;
      if (this.vel.x < 0) this.vel.x = 0;
    } else if (this.pos.x > bounds.right) {
      this.pos.x = bounds.right;
      if (this.vel.x > 0) this.vel.x = 0;
    }

    if (this.pos.y < bounds.top) {
      this.pos.y = bounds.top;
      if (this.vel.y < 0) this.vel.y = 0;
    } else if (this.pos.y > bounds.bottom) {
      this.pos.y = bounds.bottom;
      if (this.vel.y > 0) this.vel.y = 0;
    }
  }

  sampleCurrentFromGrid(entities, gridHeads, nextIndices, cellSize, gridCols, gridRows, perceptionSq, sums, weight = 1, skipSelf = false) {
    if (!entities || entities.length === 0 || gridCols <= 0 || gridRows <= 0 || cellSize <= 0) return;
    const sourceWeight = Math.max(0, weight);
    if (sourceWeight <= 0) return;

    const cx = Math.min(gridCols - 1, Math.max(0, (this.pos.x / cellSize) | 0));
    const cy = Math.min(gridRows - 1, Math.max(0, (this.pos.y / cellSize) | 0));
    const gyMin = Math.max(0, cy - GRID_NEIGHBOR_RADIUS);
    const gyMax = Math.min(gridRows - 1, cy + GRID_NEIGHBOR_RADIUS);
    const gxMin = Math.max(0, cx - GRID_NEIGHBOR_RADIUS);
    const gxMax = Math.min(gridCols - 1, cx + GRID_NEIGHBOR_RADIUS);

    for (let gy = gyMin; gy <= gyMax; gy += 1) {
      const rowOffset = gy * gridCols;
      for (let gx = gxMin; gx <= gxMax; gx += 1) {
        let index = gridHeads[gx + rowOffset];
        while (index !== -1) {
          const other = entities[index];
          if (other && (!skipSelf || other !== this)) {
            const dx = other.pos.x - this.pos.x;
            const dy = other.pos.y - this.pos.y;
            const distSq = dx * dx + dy * dy;
            if (distSq > 0 && distSq < perceptionSq) {
              sums.vx += other.vel.x * sourceWeight;
              sums.vy += other.vel.y * sourceWeight;
              sums.weight += sourceWeight;
            }
          }
          index = nextIndices[index];
        }
      }
    }
  }

  update(dt, fishGrid, shrimpGrid, algaeGrid, predators) {
    const perception = Math.max(10, state.activeAlgaePerception || params.algaePerception);
    const perceptionSq = perception * perception;

    const flow = { vx: 0, vy: 0, weight: 0 };
    this.sampleCurrentFromGrid(
      state.boids,
      fishGrid.heads,
      fishGrid.next,
      fishGrid.cellSize,
      fishGrid.cols,
      fishGrid.rows,
      perceptionSq,
      flow,
      ALGAE_FLOW_WEIGHTS.fish
    );
    this.sampleCurrentFromGrid(
      state.shrimps,
      shrimpGrid.heads,
      shrimpGrid.next,
      shrimpGrid.cellSize,
      shrimpGrid.cols,
      shrimpGrid.rows,
      perceptionSq,
      flow,
      ALGAE_FLOW_WEIGHTS.shrimp
    );
    this.sampleCurrentFromGrid(
      state.algaes,
      algaeGrid.heads,
      algaeGrid.next,
      algaeGrid.cellSize,
      algaeGrid.cols,
      algaeGrid.rows,
      perceptionSq,
      flow,
      ALGAE_FLOW_WEIGHTS.algae,
      true
    );

    for (let i = 0; i < predators.length; i += 1) {
      const predator = predators[i];
      const dx = predator.pos.x - this.pos.x;
      const dy = predator.pos.y - this.pos.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > 0 && distSq < perceptionSq) {
        const predatorWeight = predator.kind === 1 ? ALGAE_FLOW_WEIGHTS.aurel : ALGAE_FLOW_WEIGHTS.zeno;
        flow.vx += predator.vel.x * predatorWeight;
        flow.vy += predator.vel.y * predatorWeight;
        flow.weight += predatorWeight;
      }
    }

    const directSpeed = Math.max(0, params.algaeSpeed);
    const sensitivity = Math.max(0, params.algaeCurrentSensitivity);
    let indirectVX = 0;
    let indirectVY = 0;
    if (flow.weight > 0) {
      indirectVX = (flow.vx / flow.weight) * sensitivity;
      indirectVY = (flow.vy / flow.weight) * sensitivity;
    }

    let separateX = 0;
    let separateY = 0;
    let separateCount = 0;
    let maxSeparationPressure = 0;
    if (algaeGrid.cols > 0 && algaeGrid.rows > 0 && algaeGrid.cellSize > 0) {
      const cx = Math.min(algaeGrid.cols - 1, Math.max(0, (this.pos.x / algaeGrid.cellSize) | 0));
      const cy = Math.min(algaeGrid.rows - 1, Math.max(0, (this.pos.y / algaeGrid.cellSize) | 0));
      const gyMin = Math.max(0, cy - GRID_NEIGHBOR_RADIUS);
      const gyMax = Math.min(algaeGrid.rows - 1, cy + GRID_NEIGHBOR_RADIUS);
      const gxMin = Math.max(0, cx - GRID_NEIGHBOR_RADIUS);
      const gxMax = Math.min(algaeGrid.cols - 1, cx + GRID_NEIGHBOR_RADIUS);

      for (let gy = gyMin; gy <= gyMax; gy += 1) {
        const rowOffset = gy * algaeGrid.cols;
        for (let gx = gxMin; gx <= gxMax; gx += 1) {
          let index = algaeGrid.heads[gx + rowOffset];
          while (index !== -1) {
            const other = state.algaes[index];
            if (other && other !== this) {
              const dx = this.pos.x - other.pos.x;
              const dy = this.pos.y - other.pos.y;
              const distSq = dx * dx + dy * dy;
              if (distSq > 0 && distSq < perceptionSq) {
                const invDistSq = 1 / distSq;
                separateX += dx * invDistSq;
                separateY += dy * invDistSq;
                separateCount += 1;
                const dist = Math.sqrt(distSq);
                maxSeparationPressure = Math.max(maxSeparationPressure, 1 - dist / perception);
              }
            }
            index = algaeGrid.next[index];
          }
        }
      }
    }

    let directVX = 0;
    let directVY = 0;
    if (separateCount > 0 && directSpeed > 0) {
      const sepMag = Math.hypot(separateX, separateY);
      if (sepMag > 0) {
        const sepStrength = Math.max(0, params.algaeSeparation);
        const pressure = Math.max(0, Math.min(1, maxSeparationPressure));
        const sepTargetSpeed = directSpeed * (0.25 + Math.min(1, sepStrength) * 0.75) * (0.3 + pressure * 0.7);
        directVX = (separateX / sepMag) * sepTargetSpeed;
        directVY = (separateY / sepMag) * sepTargetSpeed;
      }
    }

    const wallFlow = this.avoidEdges();
    const targetVX = indirectVX + directVX + wallFlow.x;
    const targetVY = indirectVY + directVY + wallFlow.y;
    const followBlend = Math.max(0, Math.min(1, (0.03 + sensitivity * 0.15 + Math.max(0, params.algaeSeparation) * 0.08) * dt));
    this.vel.x += (targetVX - this.vel.x) * followBlend;
    this.vel.y += (targetVY - this.vel.y) * followBlend;

    const indirectSpeed = Math.hypot(indirectVX, indirectVY);
    const wallSpeed = Math.hypot(wallFlow.x, wallFlow.y);
    const maxSpeed = Math.max(0.02, indirectSpeed + wallSpeed + directSpeed * (1 + maxSeparationPressure * 0.45));
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
    this.edges();
  }

  avoidEdges() {
    if (params.algaeToroidal) return { x: 0, y: 0, pressure: 0 };
    const wallStrength = Math.max(0, params.algaeWallStrength);
    const reach = Math.max(0, Math.min(1, params.algaeWallReach));
    if (wallStrength <= 0 || reach <= 0) return { x: 0, y: 0, pressure: 0 };

    const margin = Math.max(1, this.size * 1.2);
    const bounds = getWorldBounds(margin);
    const halfMinDimension = Math.max(1, Math.min(bounds.width, bounds.height) * 0.5);
    const influenceDistance = Math.max(margin * 2, Math.min(halfMinDimension, halfMinDimension * reach));
    const fadePower = Math.max(0.25, params.algaeWallFade);
    const speedNorm = Math.max(0.05, Math.hypot(this.vel.x, this.vel.y) + 0.15);

    const leftDist = Math.max(0, this.pos.x - bounds.left);
    const rightDist = Math.max(0, bounds.right - this.pos.x);
    const topDist = Math.max(0, this.pos.y - bounds.top);
    const bottomDist = Math.max(0, bounds.bottom - this.pos.y);

    let pushX = 0;
    let pushY = 0;
    let pressure = 0;

    if (leftDist < influenceDistance) {
      const proximity = 1 - leftDist / influenceDistance;
      const toward = Math.max(0, -this.vel.x) / speedNorm;
      const local = Math.pow(proximity, fadePower) * (1 + toward * 1.25);
      pushX += local;
      pressure = Math.max(pressure, local);
    }
    if (rightDist < influenceDistance) {
      const proximity = 1 - rightDist / influenceDistance;
      const toward = Math.max(0, this.vel.x) / speedNorm;
      const local = Math.pow(proximity, fadePower) * (1 + toward * 1.25);
      pushX -= local;
      pressure = Math.max(pressure, local);
    }
    if (topDist < influenceDistance) {
      const proximity = 1 - topDist / influenceDistance;
      const toward = Math.max(0, -this.vel.y) / speedNorm;
      const local = Math.pow(proximity, fadePower) * (1 + toward * 1.25);
      pushY += local;
      pressure = Math.max(pressure, local);
    }
    if (bottomDist < influenceDistance) {
      const proximity = 1 - bottomDist / influenceDistance;
      const toward = Math.max(0, this.vel.y) / speedNorm;
      const local = Math.pow(proximity, fadePower) * (1 + toward * 1.25);
      pushY -= local;
      pressure = Math.max(pressure, local);
    }

    pressure = Math.max(0, Math.min(1, pressure));
    const pushMag = Math.hypot(pushX, pushY);
    if (pushMag <= 0 || pressure <= 0) return { x: 0, y: 0, pressure: 0 };

    const dirX = pushX / pushMag;
    const dirY = pushY / pushMag;
    const strength = (0.04 + pressure * 0.55) * wallStrength;
    return { x: dirX * strength, y: dirY * strength, pressure };
  }
}

class Predator {
  constructor(kind = 1, spawnX = null, spawnY = null, startSize = null) {
    this.kind = kind;
    this.pos = new Vec2(
      spawnX === null ? Math.random() * state.width : spawnX,
      spawnY === null ? Math.random() * state.height : spawnY
    );
    const angle = Math.random() * Math.PI * 2;
    this.vel = new Vec2(Math.cos(angle), Math.sin(angle));
    const config = this.getConfig();
    this.vel.x *= Math.max(0.01, config.baseCruise) * 0.95;
    this.vel.y *= Math.max(0.01, config.baseCruise) * 0.95;
    this.size = clampPredatorSize(startSize === null ? getPredatorMinSize(this.kind) : startSize, this.kind);
    this.targetIndex = -1;
    this.retargetIn = 0;
    this.targetLock = 0;
    this.smoothSteer = new Vec2();
    this.eatCooldownMs = 0;
  }

  getConfig() {
    if (this.kind === 2) {
      const max = Math.max(0.8, params.predator2Speed);
      return {
        baseCruise: Math.max(0.01, max * 0.2),
        baseMax: max,
        steering: Math.max(0.01, params.predator2SteeringForce),
        separation: Math.max(0, params.predator2Separation),
        aggressiveness: Math.max(0, Math.min(1, params.predator2Aggressiveness)),
        maxSprint: Math.max(0, params.predator2MaxSprint),
        sprintDrain: Math.max(0, params.predator2SprintDrain),
        wobbleThreat: Math.max(0, params.predator2Threat)
      };
    }

    return {
      baseCruise: Math.max(0.01, params.predatorSpeed),
      baseMax: Math.max(0.01, params.predatorMaxSpeed),
      steering: Math.max(0.01, params.predatorSteeringForce),
      separation: Math.max(0, params.predatorSeparation),
      aggressiveness: Math.max(0, Math.min(1, params.predatorAggressiveness)),
      maxSprint: Math.max(0, params.predatorMaxSprint),
      sprintDrain: Math.max(0, params.predatorSprintDrain),
      wobbleThreat: Math.max(0, params.predatorThreat)
    };
  }

  syncSizeBounds() {
    this.size = clampPredatorSize(this.size, this.kind);
  }

  edges() {
    const margin = Math.max(MIN_EDGE_MARGIN + 1, this.size * 1.5);
    const bounds = getWorldBounds(margin);
    let hitWall = false;

    if (this.pos.x < bounds.left) {
      this.pos.x = bounds.left;
      if (this.vel.x < 0) this.vel.x *= -0.65;
      hitWall = true;
    } else if (this.pos.x > bounds.right) {
      this.pos.x = bounds.right;
      if (this.vel.x > 0) this.vel.x *= -0.65;
      hitWall = true;
    }

    if (this.pos.y < bounds.top) {
      this.pos.y = bounds.top;
      if (this.vel.y < 0) this.vel.y *= -0.65;
      hitWall = true;
    } else if (this.pos.y > bounds.bottom) {
      this.pos.y = bounds.bottom;
      if (this.vel.y > 0) this.vel.y *= -0.65;
      hitWall = true;
    }

    if (hitWall) {
      const toCenterX = bounds.centerX - this.pos.x;
      const toCenterY = bounds.centerY - this.pos.y;
      const toCenterMag = Math.hypot(toCenterX, toCenterY);
      if (toCenterMag > 0) {
        this.vel.x += (toCenterX / toCenterMag) * 0.28;
        this.vel.y += (toCenterY / toCenterMag) * 0.28;
      }
    }
  }

  avoidWalls(maxPredSpeed, maxPredForce) {
    const wallStrength = Math.max(0, params.wallStrength);
    const reach = Math.max(0, Math.min(1, params.wallReach));
    if (wallStrength <= 0 || reach <= 0) return { x: 0, y: 0, pressure: 0 };

    const margin = Math.max(MIN_EDGE_MARGIN + 1, this.size * 1.5);
    const bounds = getWorldBounds(margin);
    const halfMinDimension = Math.max(1, Math.min(bounds.width, bounds.height) * 0.5);
    const influenceDistance = Math.max(margin * 2.1, Math.min(halfMinDimension, halfMinDimension * reach));
    const fadePower = Math.max(0.35, params.wallFade);

    const leftDist = Math.max(0, this.pos.x - bounds.left);
    const rightDist = Math.max(0, bounds.right - this.pos.x);
    const topDist = Math.max(0, this.pos.y - bounds.top);
    const bottomDist = Math.max(0, bounds.bottom - this.pos.y);

    let pushX = 0;
    let pushY = 0;
    let pressure = 0;
    const speedNorm = Math.max(0.01, maxPredSpeed);

    if (leftDist < influenceDistance) {
      const proximity = 1 - leftDist / influenceDistance;
      const toward = Math.max(0, -this.vel.x) / speedNorm;
      const local = Math.pow(proximity, fadePower) * (1 + toward * 1.4);
      pushX += local;
      pressure = Math.max(pressure, local);
    }
    if (rightDist < influenceDistance) {
      const proximity = 1 - rightDist / influenceDistance;
      const toward = Math.max(0, this.vel.x) / speedNorm;
      const local = Math.pow(proximity, fadePower) * (1 + toward * 1.4);
      pushX -= local;
      pressure = Math.max(pressure, local);
    }
    if (topDist < influenceDistance) {
      const proximity = 1 - topDist / influenceDistance;
      const toward = Math.max(0, -this.vel.y) / speedNorm;
      const local = Math.pow(proximity, fadePower) * (1 + toward * 1.4);
      pushY += local;
      pressure = Math.max(pressure, local);
    }
    if (bottomDist < influenceDistance) {
      const proximity = 1 - bottomDist / influenceDistance;
      const toward = Math.max(0, this.vel.y) / speedNorm;
      const local = Math.pow(proximity, fadePower) * (1 + toward * 1.4);
      pushY -= local;
      pressure = Math.max(pressure, local);
    }

    pressure = Math.max(0, Math.min(1, pressure));
    const pushMag = Math.hypot(pushX, pushY);
    if (pushMag <= 0 || pressure <= 0) return { x: 0, y: 0, pressure: 0 };

    const dirX = pushX / pushMag;
    const dirY = pushY / pushMag;
    const desiredSpeed = maxPredSpeed * (0.24 + pressure * 0.86);
    let steerX = dirX * desiredSpeed - this.vel.x;
    let steerY = dirY * desiredSpeed - this.vel.y;
    const steerLimit = maxPredForce * (0.4 + pressure * 2.9) * (0.45 + wallStrength * 0.85);
    const steerMag = Math.hypot(steerX, steerY);
    if (steerMag > steerLimit && steerMag > 0) {
      const s = steerLimit / steerMag;
      steerX *= s;
      steerY *= s;
    }

    return { x: steerX, y: steerY, pressure };
  }

  avoidOtherPredators(predators, selfIndex, maxPredSpeed, maxPredForce) {
    const config = this.getConfig();
    const separationStrength = Math.max(0, config.separation);
    if (separationStrength <= 0) return { x: 0, y: 0, pressure: 0, suppressHunt: 0 };
    if (predators.length <= 1) return { x: 0, y: 0, pressure: 0, suppressHunt: 0 };

    let pushX = 0;
    let pushY = 0;
    let pressure = 0;
    let suppressHunt = 0;
    const mySize = this.size;
    const minSize = getPredatorMinSize(this.kind);
    const maxSize = getPredatorMaxSize(this.kind);
    const sizeSpan = Math.max(0.01, maxSize - minSize);

    for (let i = 0; i < predators.length; i += 1) {
      if (i === selfIndex) continue;
      const other = predators[i];
      const dx = this.pos.x - other.pos.x;
      const dy = this.pos.y - other.pos.y;
      const distSq = dx * dx + dy * dy;
      const largerThanMe = other.size > mySize;
      const spacing = (mySize + other.size) * (largerThanMe ? 3.2 : 2.3);
      const spacingSq = spacing * spacing;
      if (distSq <= 0 || distSq >= spacingSq) continue;

      const dist = Math.sqrt(distSq);
      const proximity = 1 - dist / spacing;
      const sizeDelta = (other.size - mySize) / sizeSpan;
      const dominance = Math.max(0, sizeDelta);
      let localPressure = proximity * proximity * (largerThanMe ? 1 + dominance * 4.2 : 0.2);
      localPressure *= separationStrength;

      if (this.kind === 1 && other.kind === 2) {
        const rivalThreat = Math.max(0, params.predator2Threat);
        localPressure += proximity * proximity * rivalThreat * 0.8;
      } else if (this.kind === 2 && other.kind === 1) {
        localPressure *= 0.55;
        if (this.targetLock > 0) {
          const focus = Math.max(0, Math.min(1, this.targetLock));
          localPressure *= Math.max(0.08, 1 - focus * 0.75);
        }
      }

      // Emergency separation when nearly touching, independent of size ordering.
      const overlapRange = Math.max(0.01, (mySize + other.size) * 1.45);
      if (dist < overlapRange) {
        const overlap = 1 - dist / overlapRange;
        localPressure += overlap * (0.9 + (largerThanMe ? dominance * 1.4 : 0.25));
      }

      if (largerThanMe) {
        let suppression = proximity * (0.52 + dominance * 0.95) * separationStrength;
        if (this.kind === 1 && other.kind === 2) {
          suppression *= 0.4 + Math.max(0, params.predator2Threat) * 0.8;
        }
        if (this.kind === 2 && other.kind === 1 && this.targetLock > 0) {
          const focus = Math.max(0, Math.min(1, this.targetLock));
          suppression *= Math.max(0.05, 1 - focus * 0.9);
        }
        suppressHunt = Math.max(suppressHunt, Math.min(1, suppression));
      } else if (this.kind === 1 && other.kind === 2) {
        const rivalThreat = Math.max(0, params.predator2Threat);
        suppressHunt = Math.max(suppressHunt, Math.min(1, proximity * (0.2 + rivalThreat * 0.55)));
      }

      pressure = Math.max(pressure, localPressure);
      pushX += (dx / dist) * localPressure;
      pushY += (dy / dist) * localPressure;
    }

    if (pressure <= 0) return { x: 0, y: 0, pressure: 0, suppressHunt: 0 };

    const pushMag = Math.hypot(pushX, pushY);
    if (pushMag <= 0) return { x: 0, y: 0, pressure: 0, suppressHunt };
    const desiredX = (pushX / pushMag) * maxPredSpeed * (0.4 + Math.min(1, pressure) * 0.95);
    const desiredY = (pushY / pushMag) * maxPredSpeed * (0.4 + Math.min(1, pressure) * 0.95);
    let steerX = desiredX - this.vel.x;
    let steerY = desiredY - this.vel.y;
    const steerLimit = maxPredForce * (0.7 + pressure * 3.8);
    const steerMag = Math.hypot(steerX, steerY);
    if (steerMag > steerLimit && steerMag > 0) {
      const s = steerLimit / steerMag;
      steerX *= s;
      steerY *= s;
    }
    return { x: steerX, y: steerY, pressure: Math.min(1, pressure), suppressHunt };
  }

  growFromMeal(mealSize, predators) {
    const maxSize = getPredatorMaxSize(this.kind);
    const minSize = getPredatorMinSize(this.kind);
    const growthGain = this.kind === 2 ? mealSize : mealSize * (0.22 + params.predatorThreat * 0.12);
    const growth = Math.max(0, growthGain);
    this.size = Math.min(maxSize, this.size + growth);

    if (this.size < maxSize - 0.0001) return;
    const caps = getPopulationCaps();
    const kindCap = this.kind === 2 ? caps.zeno : caps.aurel;
    let kindCount = 0;
    for (let i = 0; i < predators.length; i += 1) {
      if (predators[i].kind === this.kind) kindCount += 1;
    }
    if (kindCount >= kindCap) return;

    const totalCap = caps.aurel + caps.zeno;
    if (predators.length >= Math.min(MAX_PREDATOR_COUNT, totalCap)) return;

    const reproPenalty = this.kind === 2 ? params.predator2Aggressiveness : params.predatorAggressiveness;
    const reproAllowance = getSoftReproductionAllowance(kindCount, kindCap, reproPenalty);
    if (Math.random() > reproAllowance) return;

    const babyOffset = Math.max(5, this.size * 2.4);
    const babyBounds = getWorldBounds(0);
    const babyX = Math.max(babyBounds.left, Math.min(babyBounds.right, this.pos.x - this.vel.x * babyOffset));
    const babyY = Math.max(babyBounds.top, Math.min(babyBounds.bottom, this.pos.y - this.vel.y * babyOffset));
    const baby = new Predator(this.kind, babyX, babyY, minSize);
    baby.vel.x = -this.vel.x * 0.42 + (Math.random() - 0.5) * 0.45;
    baby.vel.y = -this.vel.y * 0.42 + (Math.random() - 0.5) * 0.45;
    predators.push(baby);

    // Reproduction costs mass so growth doesn't explode uncontrollably.
    this.size = Math.max(minSize, maxSize * 0.66);
  }

  getTarget(boids, shrimps, algaes, predators) {
    if (this.kind === 2) {
      const config = this.getConfig();
      const engageDist = 42 + config.aggressiveness * 240 + this.size * 7.5;
      const disengageDist = engageDist * 1.55;
      const engageSq = engageDist * engageDist;
      const disengageSq = disengageDist * disengageDist;

      this.retargetIn -= 1;
      const hasCurrent =
        this.targetIndex >= 0 &&
        this.targetIndex < predators.length &&
        predators[this.targetIndex] &&
        predators[this.targetIndex].kind === 1 &&
        predators[this.targetIndex].size > PREDATOR_DEATH_SIZE;

      if (hasCurrent) {
        const current = predators[this.targetIndex];
        const dx = current.pos.x - this.pos.x;
        const dy = current.pos.y - this.pos.y;
        const distSq = dx * dx + dy * dy;
        if (distSq <= disengageSq) {
          const dist = Math.sqrt(distSq);
          this.targetLock = Math.max(0, Math.min(1, 1 - dist / disengageDist));
          return current;
        }
        this.targetIndex = -1;
        this.retargetIn = 0;
      }

      this.targetLock = 0;
      if (!hasCurrent || this.retargetIn <= 0) {
        const sampleCount = Math.min(48, predators.length);
        let bestIndex = -1;
        let bestDistSq = Number.POSITIVE_INFINITY;

        for (let i = 0; i < sampleCount; i += 1) {
          const idx = (Math.random() * predators.length) | 0;
          const target = predators[idx];
          if (!target || target === this || target.kind !== 1) continue;
          const dx = target.pos.x - this.pos.x;
          const dy = target.pos.y - this.pos.y;
          const distSq = dx * dx + dy * dy;
          if (distSq > engageSq) continue;
          if (distSq < bestDistSq) {
            bestDistSq = distSq;
            bestIndex = idx;
          }
        }

        if (bestIndex < 0) {
          for (let i = 0; i < predators.length; i += 1) {
            const target = predators[i];
            if (!target || target === this || target.kind !== 1) continue;
            const dx = target.pos.x - this.pos.x;
            const dy = target.pos.y - this.pos.y;
            const distSq = dx * dx + dy * dy;
            if (distSq > engageSq) continue;
            if (distSq < bestDistSq) {
              bestDistSq = distSq;
              bestIndex = i;
            }
          }
        }

        this.targetIndex = bestIndex;
        this.retargetIn = 6 + ((Math.random() * 8) | 0);
      }

      if (this.targetIndex >= 0) {
        const target = predators[this.targetIndex] || null;
        if (target) {
          const dx = target.pos.x - this.pos.x;
          const dy = target.pos.y - this.pos.y;
          const dist = Math.hypot(dx, dy);
          this.targetLock = Math.max(0, Math.min(1, 1 - dist / disengageDist));
          return target;
        }
      }

      return null;
    }

    if (this.eatCooldownMs > 0) {
      this.targetIndex = -1;
      return null;
    }

    const totalPrey = boids.length + shrimps.length;
    if (totalPrey === 0) {
      this.targetIndex = -1;
      return null;
    }

    this.retargetIn -= 1;
    const hasCurrent = this.targetIndex >= 0 && this.targetIndex < totalPrey;
    if (!hasCurrent || this.retargetIn <= 0) {
      // Keep target selection cheap: evaluate a random subset and pick closest.
      const sampleCount = Math.min(48, totalPrey);
      let bestIndex = 0;
      let bestDistSq = Number.POSITIVE_INFINITY;
      for (let i = 0; i < sampleCount; i += 1) {
        const idx = (Math.random() * totalPrey) | 0;
        let prey;
        if (idx < boids.length) prey = boids[idx];
        else prey = shrimps[idx - boids.length];
        const dx = prey.pos.x - this.pos.x;
        const dy = prey.pos.y - this.pos.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          bestIndex = idx;
        }
      }
      this.targetIndex = bestIndex;
      this.retargetIn = 8 + ((Math.random() * 10) | 0);
    }

    if (this.targetIndex < boids.length) return boids[this.targetIndex] || null;
    return shrimps[this.targetIndex - boids.length] || null;
  }

  update(dt, target, predators, predatorIndex) {
    const config = this.getConfig();
    const baseCruise = Math.max(0.01, config.baseCruise);
    const baseMax = Math.max(baseCruise, config.baseMax);
    const maxPredForce = Math.max(0.01, config.steering);

    let huntX = 0;
    let huntY = 0;
    let sprintPressure = 0;

    if (target) {
      const dx = target.pos.x - this.pos.x;
      const dy = target.pos.y - this.pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
        const aggressiveness = Math.max(0, Math.min(1, config.aggressiveness));
        const sprintTriggerDist = (35 + aggressiveness * 220) + this.size * 8;
        if (dist < sprintTriggerDist) {
          const t = 1 - dist / sprintTriggerDist;
          sprintPressure = t * t;
        }

        const sprintTop = baseMax * (1 + Math.max(0, config.maxSprint) * sprintPressure);
        const desiredSpeed = baseCruise + (sprintTop - baseCruise) * (0.3 + sprintPressure * 0.7);
        const desiredX = (dx / dist) * desiredSpeed;
        const desiredY = (dy / dist) * desiredSpeed;
        huntX = desiredX - this.vel.x;
        huntY = desiredY - this.vel.y;
      }
    }

    const sprintMaxSpeed = baseMax * (1 + Math.max(0, config.maxSprint) * sprintPressure);
    const repel = this.avoidOtherPredators(predators, predatorIndex, sprintMaxSpeed, maxPredForce);
    const wallRepel = this.avoidWalls(sprintMaxSpeed, maxPredForce);
    const huntWeight = Math.max(0, 1 - repel.suppressHunt - wallRepel.pressure * 0.72);
    let steerX = huntX * huntWeight + repel.x + wallRepel.x;
    let steerY = huntY * huntWeight + repel.y + wallRepel.y;

    const wobble = 0.002 + config.wobbleThreat * 0.008;
    const wobbleScale = Math.max(0.08, 1 - repel.pressure * 0.8 - wallRepel.pressure * 0.55);
    steerX += (Math.random() - 0.5) * wobble * wobbleScale;
    steerY += (Math.random() - 0.5) * wobble * wobbleScale;

    const mag = Math.hypot(steerX, steerY);
    const totalSteerLimit = maxPredForce * (1 + repel.pressure * 2.4 + wallRepel.pressure * 2.1);
    if (mag > totalSteerLimit && mag > 0) {
      const s = totalSteerLimit / mag;
      steerX *= s;
      steerY *= s;
    }

    // Low-pass steering command to remove twitchy heading snaps.
    const steerSmoothing = 0.26;
    this.smoothSteer.x += (steerX - this.smoothSteer.x) * steerSmoothing;
    this.smoothSteer.y += (steerY - this.smoothSteer.y) * steerSmoothing;

    this.vel.x += this.smoothSteer.x * dt;
    this.vel.y += this.smoothSteer.y * dt;

    const speed = Math.hypot(this.vel.x, this.vel.y);
    if (speed > sprintMaxSpeed && speed > 0) {
      const s = sprintMaxSpeed / speed;
      this.vel.x *= s;
      this.vel.y *= s;
    }

    // Sprint costs HP (size). Faster + longer sprint costs more.
    const postSpeed = Math.hypot(this.vel.x, this.vel.y);
    const extraSpeed = Math.max(0, postSpeed - baseMax);
    const sprintDrain = Math.max(0, config.sprintDrain);
    if (extraSpeed > 0) {
      this.size -= extraSpeed * dt * sprintDrain;
      this.size -= sprintPressure * dt * sprintDrain * 0.35;
    }

    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.edges();
  }
}

function getTotalPreyCount() {
  return state.boids.length + state.shrimps.length + state.algaes.length;
}

function getAdaptivePerception(base) {
  const count = getTotalPreyCount();
  if (count >= ULTRA_RENDER_THRESHOLD) return Math.max(20, base * 0.5);
  if (count >= FAST_RENDER_THRESHOLD) return Math.max(20, base * 0.7);
  if (count >= 9000) return Math.max(20, base * 0.85);
  return base;
}

function getAdaptiveSimHz() {
  const count = getTotalPreyCount();
  if (count >= ULTRA_RENDER_THRESHOLD) return 24;
  if (count >= FAST_RENDER_THRESHOLD) return 28;
  return SIM_HZ;
}

function getNeighborBudget() {
  const count = getTotalPreyCount();
  if (count >= ULTRA_RENDER_THRESHOLD) return 18;
  if (count >= FAST_RENDER_THRESHOLD) return 28;
  if (count >= 9000) return 42;
  return Number.POSITIVE_INFINITY;
}

function getAdaptiveFlockInterval() {
  const count = getTotalPreyCount();
  if (count >= 18000) return 3;
  if (count >= 10000) return 2;
  return 1;
}

function getAdaptiveGridInterval() {
  const count = getTotalPreyCount();
  if (count >= 16000) return 2;
  return 1;
}

function getAdaptiveSpacingInterval() {
  const count = getTotalPreyCount();
  if (count >= 20000) return 4;
  if (count >= 14000) return 3;
  if (count >= 9000) return 2;
  return 1;
}

function getAdaptiveAlgaeSpacingInterval() {
  const count = getTotalPreyCount();
  if (count >= 20000) return 6;
  if (count >= 12000) return 4;
  if (count >= 7000) return 2;
  return 1;
}

function getAdaptivePublishInterval() {
  const count = getTotalPreyCount();
  if (count >= 22000) return 3;
  if (count >= 14000) return 2;
  return 1;
}

function getAdaptiveAlgaeUpdateInterval() {
  const count = getTotalPreyCount();
  const algaeCount = state.algaes.length;
  if (algaeCount >= 16000 || count >= 24000) return 4;
  if (algaeCount >= 9000 || count >= 16000) return 3;
  if (algaeCount >= 4000 || count >= 10000) return 2;
  return 1;
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

function buildShrimpSpatialGrid() {
  const cellSize = Math.max(10, state.activeShrimpPerception);
  const cols = Math.max(1, Math.ceil(state.width / cellSize));
  const rows = Math.max(1, Math.ceil(state.height / cellSize));
  const cellCount = cols * rows;
  const shrimpCount = state.shrimps.length;

  state.shrimpGridCellSize = cellSize;
  state.shrimpGridCols = cols;
  state.shrimpGridRows = rows;

  if (state.shrimpGridHeads.length !== cellCount) {
    state.shrimpGridHeads = new Int32Array(cellCount);
  }
  if (state.shrimpNextIndices.length < shrimpCount) {
    state.shrimpNextIndices = new Int32Array(shrimpCount);
  }

  state.shrimpGridHeads.fill(-1);

  for (let i = 0; i < shrimpCount; i += 1) {
    const shrimp = state.shrimps[i];
    const cx = Math.min(cols - 1, Math.max(0, (shrimp.pos.x / cellSize) | 0));
    const cy = Math.min(rows - 1, Math.max(0, (shrimp.pos.y / cellSize) | 0));
    const key = cx + cy * cols;
    state.shrimpNextIndices[i] = state.shrimpGridHeads[key];
    state.shrimpGridHeads[key] = i;
  }
}

function buildAlgaeSpatialGrid() {
  const cellSize = Math.max(8, state.activeAlgaePerception);
  const cols = Math.max(1, Math.ceil(state.width / cellSize));
  const rows = Math.max(1, Math.ceil(state.height / cellSize));
  const cellCount = cols * rows;
  const algaeCount = state.algaes.length;

  state.algaeGridCellSize = cellSize;
  state.algaeGridCols = cols;
  state.algaeGridRows = rows;

  if (state.algaeGridHeads.length !== cellCount) {
    state.algaeGridHeads = new Int32Array(cellCount);
  }
  if (state.algaeNextIndices.length < algaeCount) {
    state.algaeNextIndices = new Int32Array(algaeCount);
  }

  state.algaeGridHeads.fill(-1);

  for (let i = 0; i < algaeCount; i += 1) {
    const algae = state.algaes[i];
    const cx = Math.min(cols - 1, Math.max(0, (algae.pos.x / cellSize) | 0));
    const cy = Math.min(rows - 1, Math.max(0, (algae.pos.y / cellSize) | 0));
    const key = cx + cy * cols;
    state.algaeNextIndices[i] = state.algaeGridHeads[key];
    state.algaeGridHeads[key] = i;
  }
}

function enforceSpeciesSpacing(entities, gridHeads, nextIndices, cellSize, gridCols, gridRows, spacingScale = 1.0) {
  if (!entities || entities.length <= 1 || gridCols <= 0 || gridRows <= 0) return;

  for (let i = 0; i < entities.length; i += 1) {
    const entity = entities[i];
    const cx = Math.min(gridCols - 1, Math.max(0, (entity.pos.x / cellSize) | 0));
    const cy = Math.min(gridRows - 1, Math.max(0, (entity.pos.y / cellSize) | 0));
    const gyMin = Math.max(0, cy - GRID_NEIGHBOR_RADIUS);
    const gyMax = Math.min(gridRows - 1, cy + GRID_NEIGHBOR_RADIUS);
    const gxMin = Math.max(0, cx - GRID_NEIGHBOR_RADIUS);
    const gxMax = Math.min(gridCols - 1, cx + GRID_NEIGHBOR_RADIUS);

    for (let gy = gyMin; gy <= gyMax; gy += 1) {
      const rowOffset = gy * gridCols;
      for (let gx = gxMin; gx <= gxMax; gx += 1) {
        let index = gridHeads[gx + rowOffset];
        while (index !== -1) {
          if (index > i) {
            const other = entities[index];
            let dx = other.pos.x - entity.pos.x;
            let dy = other.pos.y - entity.pos.y;
            let distSq = dx * dx + dy * dy;

            const minDist = Math.max(0.45, (entity.size + other.size) * spacingScale);
            const minDistSq = minDist * minDist;

            if (distSq <= 0) {
              const jitter = ((i * 17 + index * 23) % 360) * (Math.PI / 180);
              dx = Math.cos(jitter) * 0.01;
              dy = Math.sin(jitter) * 0.01;
              distSq = dx * dx + dy * dy;
            }

            if (distSq < minDistSq) {
              const dist = Math.sqrt(distSq);
              const nx = dx / dist;
              const ny = dy / dist;
              const overlap = (minDist - dist) * 0.5;

              entity.pos.x -= nx * overlap;
              entity.pos.y -= ny * overlap;
              other.pos.x += nx * overlap;
              other.pos.y += ny * overlap;

              const rvx = other.vel.x - entity.vel.x;
              const rvy = other.vel.y - entity.vel.y;
              const closing = rvx * nx + rvy * ny;
              if (closing < 0) {
                const impulse = -closing * 0.18;
                entity.vel.x -= nx * impulse;
                entity.vel.y -= ny * impulse;
                other.vel.x += nx * impulse;
                other.vel.y += ny * impulse;
              }
            }
          }
          index = nextIndices[index];
        }
      }
    }
  }
}

function rebuildBoids(targetCount = params.count) {
  state.boids.length = 0;
  for (let i = 0; i < targetCount; i += 1) {
    state.boids.push(new Boid());
  }
  state.gridReady = false;
  state.shrimpGridReady = false;
  state.algaeGridReady = false;
  publishSizes();
}

function rebuildShrimps(targetCount = params.shrimpCount) {
  state.shrimps.length = 0;
  for (let i = 0; i < targetCount; i += 1) {
    state.shrimps.push(new Shrimp());
  }
  state.shrimpGridReady = false;
  state.gridReady = false;
  state.algaeGridReady = false;
  publishSizes();
}

function rebuildAlgaes(targetCount = params.algaeCount) {
  state.algaes.length = 0;
  for (let i = 0; i < targetCount; i += 1) {
    state.algaes.push(new Algae());
  }
  state.algaeCloneCarry = 0;
  state.algaeGridReady = false;
  state.gridReady = false;
  state.shrimpGridReady = false;
  publishSizes();
}

function rebuildPredators(targetCount = PREDATOR_COUNT, rivalCount = RIVAL_PREDATOR_COUNT) {
  state.predators.length = 0;
  for (let i = 0; i < targetCount; i += 1) {
    state.predators.push(new Predator(1));
  }
  for (let i = 0; i < rivalCount; i += 1) {
    state.predators.push(new Predator(2));
  }
}

function remapPredatorSizes(oldBounds) {
  const previous = oldBounds || getPredatorBounds();
  const next = getPredatorBounds();

  for (let i = 0; i < state.predators.length; i += 1) {
    const predator = state.predators[i];
    const isRival = predator.kind === 2;
    const oldMin = isRival ? previous.rivalMin : previous.apexMin;
    const oldMax = isRival ? previous.rivalMax : previous.apexMax;
    const newMin = isRival ? next.rivalMin : next.apexMin;
    const newMax = isRival ? next.rivalMax : next.apexMax;
    const oldSpan = Math.max(0.0001, oldMax - oldMin);
    const newSpan = Math.max(0.0001, newMax - newMin);

    const t = Math.max(0, Math.min(1, (predator.size - oldMin) / oldSpan));
    predator.size = newMin + t * newSpan;
    predator.syncSizeBounds();
  }
}

function removeBoidAt(index) {
  const boids = state.boids;
  const lastIndex = boids.length - 1;
  if (index < 0 || index > lastIndex) return null;
  const eaten = boids[index];
  if (index !== lastIndex) {
    boids[index] = boids[lastIndex];
  }
  boids.pop();
  return eaten;
}

function removeShrimpAt(index) {
  const shrimps = state.shrimps;
  const lastIndex = shrimps.length - 1;
  if (index < 0 || index > lastIndex) return null;
  const eaten = shrimps[index];
  if (index !== lastIndex) {
    shrimps[index] = shrimps[lastIndex];
  }
  shrimps.pop();
  return eaten;
}

function removeAlgaeAt(index) {
  const algaes = state.algaes;
  const lastIndex = algaes.length - 1;
  if (index < 0 || index > lastIndex) return null;
  const eaten = algaes[index];
  if (index !== lastIndex) {
    algaes[index] = algaes[lastIndex];
  }
  algaes.pop();
  return eaten;
}

function getPreyByCombinedIndex(index) {
  const fishCount = state.boids.length;
  if (index < fishCount) return state.boids[index] || null;
  const shrimpCount = state.shrimps.length;
  if (index < fishCount + shrimpCount) {
    const shrimpIndex = index - fishCount;
    return state.shrimps[shrimpIndex] || null;
  }
  const algaeIndex = index - fishCount - shrimpCount;
  return state.algaes[algaeIndex] || null;
}

function removePreyAtCombinedIndex(index) {
  const fishCount = state.boids.length;
  if (index < fishCount) return removeBoidAt(index);
  const shrimpCount = state.shrimps.length;
  if (index < fishCount + shrimpCount) return removeShrimpAt(index - fishCount);
  return removeAlgaeAt(index - fishCount - shrimpCount);
}

function findNearbyAlgaeIndex(entity, biteRadius, consumed) {
  if (!state.algaeGridReady || state.algaeGridCellSize <= 0 || state.algaes.length === 0) return -1;
  const radiusSq = biteRadius * biteRadius;
  const cellSize = state.algaeGridCellSize;
  const cols = state.algaeGridCols;
  const rows = state.algaeGridRows;
  const heads = state.algaeGridHeads;
  const next = state.algaeNextIndices;

  const cx = Math.min(cols - 1, Math.max(0, (entity.pos.x / cellSize) | 0));
  const cy = Math.min(rows - 1, Math.max(0, (entity.pos.y / cellSize) | 0));
  const gyMin = Math.max(0, cy - GRID_NEIGHBOR_RADIUS);
  const gyMax = Math.min(rows - 1, cy + GRID_NEIGHBOR_RADIUS);
  const gxMin = Math.max(0, cx - GRID_NEIGHBOR_RADIUS);
  const gxMax = Math.min(cols - 1, cx + GRID_NEIGHBOR_RADIUS);

  let bestIndex = -1;
  let bestDistSq = radiusSq;

  for (let gy = gyMin; gy <= gyMax; gy += 1) {
    const rowOffset = gy * cols;
    for (let gx = gxMin; gx <= gxMax; gx += 1) {
      let index = heads[gx + rowOffset];
      while (index !== -1) {
        if (!consumed.has(index)) {
          const algae = state.algaes[index];
          if (algae) {
            const dx = algae.pos.x - entity.pos.x;
            const dy = algae.pos.y - entity.pos.y;
            const distSq = dx * dx + dy * dy;
            if (distSq <= bestDistSq) {
              bestDistSq = distSq;
              bestIndex = index;
            }
          }
        }
        index = next[index];
      }
    }
  }

  return bestIndex;
}

function spawnBoidNear(parent) {
  const child = new Boid();
  const bounds = getWorldBounds(child.size * 1.7);
  child.pos.x = Math.max(bounds.left, Math.min(bounds.right, parent.pos.x + (Math.random() - 0.5) * 8));
  child.pos.y = Math.max(bounds.top, Math.min(bounds.bottom, parent.pos.y + (Math.random() - 0.5) * 8));
  child.vel.x = parent.vel.x * (0.55 + Math.random() * 0.25) + (Math.random() - 0.5) * 0.2;
  child.vel.y = parent.vel.y * (0.55 + Math.random() * 0.25) + (Math.random() - 0.5) * 0.2;
  return child;
}

function spawnShrimpNear(parent) {
  const child = new Shrimp();
  const bounds = getWorldBounds(child.size * 1.5);
  child.pos.x = Math.max(bounds.left, Math.min(bounds.right, parent.pos.x + (Math.random() - 0.5) * 7));
  child.pos.y = Math.max(bounds.top, Math.min(bounds.bottom, parent.pos.y + (Math.random() - 0.5) * 7));
  child.vel.x = parent.vel.x * (0.55 + Math.random() * 0.25) + (Math.random() - 0.5) * 0.22;
  child.vel.y = parent.vel.y * (0.55 + Math.random() * 0.25) + (Math.random() - 0.5) * 0.22;
  return child;
}

function spawnAlgaeNear(parent) {
  const child = new Algae();
  const bounds = getWorldBounds(Math.max(1, child.size * 1.2));
  child.pos.x = Math.max(bounds.left, Math.min(bounds.right, parent.pos.x + (Math.random() - 0.5) * 5));
  child.pos.y = Math.max(bounds.top, Math.min(bounds.bottom, parent.pos.y + (Math.random() - 0.5) * 5));
  child.vel.x = parent.vel.x * (0.45 + Math.random() * 0.3) + (Math.random() - 0.5) * 0.05;
  child.vel.y = parent.vel.y * (0.45 + Math.random() * 0.3) + (Math.random() - 0.5) * 0.05;
  return child;
}

function countPredatorsByKind(kind) {
  let count = 0;
  for (let i = 0; i < state.predators.length; i += 1) {
    if (state.predators[i].kind === kind) count += 1;
  }
  return count;
}

function spawnCreature(species, x, y) {
  const caps = getPopulationCaps();
  const worldX = Number.isFinite(x) ? x : Math.random() * state.width;
  const worldY = Number.isFinite(y) ? y : Math.random() * state.height;

  if (species === "fish") {
    if (state.boids.length >= caps.fish) return false;
    const fish = new Boid();
    const bounds = getWorldBounds(fish.size * 1.7);
    fish.pos.x = Math.max(bounds.left, Math.min(bounds.right, worldX));
    fish.pos.y = Math.max(bounds.top, Math.min(bounds.bottom, worldY));
    state.boids.push(fish);
    state.gridReady = false;
    return true;
  }

  if (species === "shrimp") {
    if (state.shrimps.length >= caps.shrimp) return false;
    const shrimp = new Shrimp();
    const bounds = getWorldBounds(shrimp.size * 1.5);
    shrimp.pos.x = Math.max(bounds.left, Math.min(bounds.right, worldX));
    shrimp.pos.y = Math.max(bounds.top, Math.min(bounds.bottom, worldY));
    state.shrimps.push(shrimp);
    state.shrimpGridReady = false;
    return true;
  }

  if (species === "algae") {
    if (state.algaes.length >= caps.algae) return false;
    const algae = new Algae();
    const bounds = getWorldBounds(Math.max(1, algae.size * 1.2));
    algae.pos.x = Math.max(bounds.left, Math.min(bounds.right, worldX));
    algae.pos.y = Math.max(bounds.top, Math.min(bounds.bottom, worldY));
    state.algaes.push(algae);
    state.algaeGridReady = false;
    return true;
  }

  if (species === "aurel") {
    const aurelCount = countPredatorsByKind(1);
    const totalCap = Math.min(MAX_PREDATOR_COUNT, caps.aurel + caps.zeno);
    if (aurelCount >= caps.aurel || state.predators.length >= totalCap) return false;
    const predator = new Predator(1, worldX, worldY, getPredatorMinSize(1));
    state.predators.push(predator);
    return true;
  }

  if (species === "zeno") {
    const zenoCount = countPredatorsByKind(2);
    const totalCap = Math.min(MAX_PREDATOR_COUNT, caps.aurel + caps.zeno);
    if (zenoCount >= caps.zeno || state.predators.length >= totalCap) return false;
    const predator = new Predator(2, worldX, worldY, getPredatorMinSize(2));
    state.predators.push(predator);
    return true;
  }

  return false;
}

function processPreyAlgaeFeeding() {
  if (state.algaes.length === 0) return 0;
  if (!state.algaeGridReady) {
    buildAlgaeSpatialGrid();
    state.algaeGridReady = true;
  }
  if (state.algaes.length === 0) return 0;

  const caps = getPopulationCaps();
  const nowMs = state.elapsedMs;
  const consumed = new Set();
  let spawnedFish = 0;
  let spawnedShrimp = 0;

  for (let i = 0; i < state.boids.length; i += 1) {
    if (state.algaes.length - consumed.size <= 0) break;
    const fish = state.boids[i];
    if (nowMs < fish.nextAlgaeInterestMs) continue;

    const algaeIndex = findNearbyAlgaeIndex(fish, fish.size * 1.25 + 0.9, consumed);
    if (algaeIndex < 0) continue;

    fish.nextAlgaeInterestMs = nowMs + Math.max(0, params.fishAlgaeInterestCooldown);
    consumed.add(algaeIndex);
    fish.algaeMeals += 1;

    const requiredMeals = getRequiredMeals(
      params.fishAlgaeMealsToReproduce,
      state.boids.length,
      caps.fish,
      params.fishPopulationPenalty,
      params.fishPopulationPenaltyDelay
    );
    if (fish.algaeMeals >= requiredMeals) {
      const allowance = getSoftReproductionAllowance(
        state.boids.length,
        caps.fish,
        params.fishPopulationPenalty,
        params.fishPopulationPenaltyDelay
      );
      if (state.boids.length < caps.fish && Math.random() < allowance) {
        state.boids.push(spawnBoidNear(fish));
        spawnedFish += 1;
        fish.algaeMeals = 0;
      } else {
        fish.algaeMeals = Math.max(0, requiredMeals * 0.8);
      }
    }
  }

  for (let i = 0; i < state.shrimps.length; i += 1) {
    if (state.algaes.length - consumed.size <= 0) break;
    const shrimp = state.shrimps[i];
    if (nowMs < shrimp.nextAlgaeInterestMs) continue;

    const algaeIndex = findNearbyAlgaeIndex(shrimp, shrimp.size * 1.15 + 0.75, consumed);
    if (algaeIndex < 0) continue;

    shrimp.nextAlgaeInterestMs = nowMs + Math.max(0, params.shrimpAlgaeInterestCooldown);
    consumed.add(algaeIndex);
    shrimp.algaeMeals += 1;

    const requiredMeals = getRequiredMeals(
      params.shrimpAlgaeMealsToReproduce,
      state.shrimps.length,
      caps.shrimp,
      params.shrimpPopulationPenalty,
      params.shrimpPopulationPenaltyDelay
    );
    if (shrimp.algaeMeals >= requiredMeals) {
      const allowance = getSoftReproductionAllowance(
        state.shrimps.length,
        caps.shrimp,
        params.shrimpPopulationPenalty,
        params.shrimpPopulationPenaltyDelay
      );
      if (state.shrimps.length < caps.shrimp && Math.random() < allowance) {
        state.shrimps.push(spawnShrimpNear(shrimp));
        spawnedShrimp += 1;
        shrimp.algaeMeals = 0;
      } else {
        shrimp.algaeMeals = Math.max(0, requiredMeals * 0.8);
      }
    }
  }

  if (consumed.size > 0) {
    const indices = Array.from(consumed).sort((a, b) => b - a);
    for (let i = 0; i < indices.length; i += 1) {
      removeAlgaeAt(indices[i]);
    }
  }

  if (consumed.size > 0 || spawnedFish > 0 || spawnedShrimp > 0) {
    state.gridReady = false;
    state.shrimpGridReady = false;
    state.algaeGridReady = false;
  }

  return consumed.size;
}

function processAlgaeGrowth(simStepMs) {
  const cap = getPopulationCaps().algae;
  const algaeCount = state.algaes.length;
  if (algaeCount <= 0 || algaeCount >= cap) return 0;

  const growth = Math.max(0, params.algaeGrowthRate);
  if (growth <= 0) return 0;
  const penalty = Math.max(0, params.algaePopulationPenalty);
  const pressure = getDelayedPenaltyPressure(algaeCount, cap, params.algaePopulationPenaltyDelay);
  // Delay now gates the entire penalty system:
  // before delay threshold, effectivePenalty is 0;
  // after threshold, it ramps up with delayed pressure.
  const effectivePenalty = penalty * pressure;

  // Time-based cloning: each algae attempts to clone after an interval controlled by growth.
  // Higher growth -> shorter interval -> faster cloning.
  const growthNorm = Math.max(0, Math.min(1, growth / 2));
  const cloneIntervalMs = 6000 - growthNorm * 5500; // 6000ms at 0, 500ms at 2
  // Strong anti-exponential penalty:
  // - `effectiveCloners` saturates as count grows (near-linear total growth under penalty).
  // - `pressureBrake` sharply fades growth as population approaches cap.
  const effectiveCloners = algaeCount / (1 + effectivePenalty * algaeCount * 0.01);
  const pressureBrake = Math.pow(Math.max(0, 1 - pressure), 1.2 + effectivePenalty * 3.6);
  const expected = effectiveCloners * (simStepMs / cloneIntervalMs) * pressureBrake;
  if (expected <= 0) return 0;

  state.algaeCloneCarry += expected;
  let spawnCount = Math.floor(state.algaeCloneCarry);
  state.algaeCloneCarry -= spawnCount;

  spawnCount = Math.min(spawnCount, cap - algaeCount);
  if (spawnCount <= 0) return 0;

  for (let i = 0; i < spawnCount; i += 1) {
    const parent = state.algaes[(Math.random() * state.algaes.length) | 0];
    if (!parent) break;
    state.algaes.push(spawnAlgaeNear(parent));
  }

  state.algaeGridReady = false;
  return spawnCount;
}

function enforcePopulationCapsHard() {
  const caps = getPopulationCaps();
  let changed = false;

  if (state.boids.length > caps.fish) {
    state.boids.length = caps.fish;
    changed = true;
  }
  if (state.shrimps.length > caps.shrimp) {
    state.shrimps.length = caps.shrimp;
    changed = true;
  }
  if (state.algaes.length > caps.algae) {
    state.algaes.length = caps.algae;
    changed = true;
  }

  let aurelCount = 0;
  let zenoCount = 0;
  for (let i = state.predators.length - 1; i >= 0; i -= 1) {
    const predator = state.predators[i];
    if (predator.kind === 2) {
      if (zenoCount >= caps.zeno) {
        state.predators.splice(i, 1);
        changed = true;
      } else {
        zenoCount += 1;
      }
    } else if (aurelCount >= caps.aurel) {
      state.predators.splice(i, 1);
      changed = true;
    } else {
      aurelCount += 1;
    }
  }

  if (changed) {
    state.gridReady = false;
    state.shrimpGridReady = false;
    state.algaeGridReady = false;
  }

  return changed;
}

function processPredation(simStepMs) {
  if (state.predators.length === 0) return 0;

  let eatenCount = 0;
  const totalPrey = state.boids.length + state.shrimps.length;
  if (totalPrey > 0) {
    const activePredatorCount = state.predators.length;
    for (let p = 0; p < activePredatorCount; p += 1) {
      const predator = state.predators[p];
      if (predator.kind !== 1) continue;
      if (predator.eatCooldownMs > 0) {
        predator.eatCooldownMs = Math.max(0, predator.eatCooldownMs - simStepMs);
        continue;
      }

      const eatRadius = predator.size * 1.15 + 0.55;
      const eatRadiusSq = eatRadius * eatRadius;
      let chosenIndex = -1;
      let chosenDistSq = eatRadiusSq;

      const fishCount = state.boids.length;
      const shrimpCount = state.shrimps.length;
      const preyCount = fishCount + shrimpCount;
      for (let b = 0; b < preyCount; b += 1) {
        let prey;
        if (b < fishCount) prey = state.boids[b];
        else prey = state.shrimps[b - fishCount];
        const dx = prey.pos.x - predator.pos.x;
        const dy = prey.pos.y - predator.pos.y;
        const distSq = dx * dx + dy * dy;
        if (distSq > chosenDistSq) continue;
        chosenDistSq = distSq;
        chosenIndex = b;
      }

      if (chosenIndex < 0) continue;
      const eaten = removePreyAtCombinedIndex(chosenIndex);
      if (!eaten) continue;
      eatenCount += 1;
      predator.growFromMeal(eaten.size, state.predators);
      predator.eatCooldownMs = AUREL_EAT_COOLDOWN_MS;
      if (state.boids.length + state.shrimps.length === 0) break;
    }
  }

  if (eatenCount > 0) {
    state.gridReady = false;
    state.shrimpGridReady = false;
    state.algaeGridReady = false;
  }

  // Rival predators siphon size from apex predators.
  for (let p = 0; p < state.predators.length; p += 1) {
    const predator = state.predators[p];
    if (predator.kind !== 2) continue;
    if (predator.eatCooldownMs > 0) {
      predator.eatCooldownMs = Math.max(0, predator.eatCooldownMs - simStepMs);
      continue;
    }

    const attackRadius = predator.size * 1.22 + 0.75;
    const attackRadiusSq = attackRadius * attackRadius;
    let targetIndex = -1;
    let targetDistSq = attackRadiusSq;

    for (let i = 0; i < state.predators.length; i += 1) {
      if (i === p) continue;
      const other = state.predators[i];
      if (other.kind !== 1) continue;
      const dx = other.pos.x - predator.pos.x;
      const dy = other.pos.y - predator.pos.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > targetDistSq) continue;
      targetDistSq = distSq;
      targetIndex = i;
    }

    if (targetIndex < 0) continue;
    const target = state.predators[targetIndex];
    if (!target) continue;

    const baseDamage = Math.max(0.01, params.predator2Damage);
    const maxDamage = Math.max(0, target.size - PREDATOR_DEATH_SIZE);
    const dealt = Math.min(baseDamage, maxDamage);
    if (dealt <= 0) continue;

    target.size -= dealt;
    predator.growFromMeal(dealt, state.predators);
    state.zenoBites += 1;
    predator.eatCooldownMs = ZENO_BITE_COOLDOWN_MS;
    predator.targetIndex = -1;
  }

  return eatenCount;
}

function ensureBaselinePredators() {
  const caps = getPopulationCaps();
  let changed = false;
  let apexCount = 0;
  let rivalCount = 0;
  for (let i = 0; i < state.predators.length; i += 1) {
    if (state.predators[i].kind === 2) rivalCount += 1;
    else apexCount += 1;
  }

  while (
    apexCount < PREDATOR_COUNT &&
    apexCount < caps.aurel &&
    state.predators.length < MAX_PREDATOR_COUNT &&
    state.predators.length < caps.aurel + caps.zeno
  ) {
    state.predators.push(new Predator(1));
    apexCount += 1;
    changed = true;
  }
  while (
    rivalCount < RIVAL_PREDATOR_COUNT &&
    rivalCount < caps.zeno &&
    state.predators.length < MAX_PREDATOR_COUNT &&
    state.predators.length < caps.aurel + caps.zeno
  ) {
    state.predators.push(new Predator(2));
    rivalCount += 1;
    changed = true;
  }

  return changed;
}

function purgeDeadPredators() {
  const before = state.predators.length;
  for (let i = state.predators.length - 1; i >= 0; i -= 1) {
    if (state.predators[i].size <= PREDATOR_DEATH_SIZE) {
      state.predators.splice(i, 1);
    }
  }
  const respawned = ensureBaselinePredators();
  return before !== state.predators.length || respawned;
}

function publishSizes() {
  const fishCount = state.boids.length;
  const sizes = new Float32Array(fishCount);
  for (let i = 0; i < fishCount; i += 1) {
    sizes[i] = state.boids[i].size;
  }
  const shrimpCount = state.shrimps.length;
  const shrimpSizes = new Float32Array(shrimpCount);
  for (let i = 0; i < shrimpCount; i += 1) {
    shrimpSizes[i] = state.shrimps[i].size;
  }
  const algaeCount = state.algaes.length;
  const algaeSizes = new Float32Array(algaeCount);
  for (let i = 0; i < algaeCount; i += 1) {
    algaeSizes[i] = state.algaes[i].size;
  }
  postMessage({ type: "sizes", sizes, shrimpSizes, algaeSizes }, [sizes.buffer, shrimpSizes.buffer, algaeSizes.buffer]);
}

function publishFrame() {
  const fishCount = state.boids.length;
  const shrimpCount = state.shrimps.length;
  const algaeCount = state.algaes.length;
  const count = fishCount + shrimpCount + algaeCount;
  const x = new Float32Array(fishCount);
  const y = new Float32Array(fishCount);
  const vx = new Float32Array(fishCount);
  const vy = new Float32Array(fishCount);
  const sx = new Float32Array(shrimpCount);
  const sy = new Float32Array(shrimpCount);
  const svx = new Float32Array(shrimpCount);
  const svy = new Float32Array(shrimpCount);
  const ax = new Float32Array(algaeCount);
  const ay = new Float32Array(algaeCount);
  const avx = new Float32Array(algaeCount);
  const avy = new Float32Array(algaeCount);
  const predatorCount = state.predators.length;
  const px = new Float32Array(predatorCount);
  const py = new Float32Array(predatorCount);
  const pvx = new Float32Array(predatorCount);
  const pvy = new Float32Array(predatorCount);
  const ps = new Float32Array(predatorCount);
  const pk = new Uint8Array(predatorCount);
  let aurelTotalSize = 0;
  let aurelCount = 0;
  let zenoTotalSize = 0;
  let zenoCount = 0;

  for (let i = 0; i < fishCount; i += 1) {
    const boid = state.boids[i];
    x[i] = boid.pos.x;
    y[i] = boid.pos.y;
    vx[i] = boid.vel.x;
    vy[i] = boid.vel.y;
  }

  for (let i = 0; i < shrimpCount; i += 1) {
    const shrimp = state.shrimps[i];
    sx[i] = shrimp.pos.x;
    sy[i] = shrimp.pos.y;
    svx[i] = shrimp.vel.x;
    svy[i] = shrimp.vel.y;
  }

  for (let i = 0; i < algaeCount; i += 1) {
    const algae = state.algaes[i];
    ax[i] = algae.pos.x;
    ay[i] = algae.pos.y;
    avx[i] = algae.vel.x;
    avy[i] = algae.vel.y;
  }

  for (let i = 0; i < predatorCount; i += 1) {
    const predator = state.predators[i];
    px[i] = predator.pos.x;
    py[i] = predator.pos.y;
    pvx[i] = predator.vel.x;
    pvy[i] = predator.vel.y;
    ps[i] = predator.size;
    const kind = predator.kind === 2 ? 2 : 1;
    pk[i] = kind;
    if (kind === 2) {
      zenoTotalSize += predator.size;
      zenoCount += 1;
    } else {
      aurelTotalSize += predator.size;
      aurelCount += 1;
    }
  }

  const averageAurel = aurelCount > 0 ? aurelTotalSize / aurelCount : 0;
  const averageZeno = zenoCount > 0 ? zenoTotalSize / zenoCount : 0;
  const elapsedMinutes = state.elapsedMs / 60000;
  const preyPerMinute = elapsedMinutes > 0 ? state.preyEaten / elapsedMinutes : 0;
  const zenoBitesPerMinute = elapsedMinutes > 0 ? state.zenoBites / elapsedMinutes : 0;

  postMessage(
    {
      type: "frame",
      x,
      y,
      vx,
      vy,
      sx,
      sy,
      svx,
      svy,
      ax,
      ay,
      avx,
      avy,
      count,
      fishCount,
      shrimpCount,
      algaeCount,
      px,
      py,
      pvx,
      pvy,
      ps,
      pk,
      predatorCount,
      elapsedMs: state.elapsedMs,
      preyEaten: state.preyEaten,
      zenoBites: state.zenoBites,
      preyPerMinute,
      zenoBitesPerMinute,
      predatorThreat: params.predatorThreat,
      predator2Threat: params.predator2Threat,
      predatorSprintDrain: params.predatorSprintDrain,
      predatorMaxSpeed: params.predatorMaxSpeed,
      predator2Speed: params.predator2Speed,
      predator2Aggressiveness: params.predator2Aggressiveness,
      predator2Damage: params.predator2Damage,
      predator2SprintDrain: params.predator2SprintDrain,
      averageAurel,
      averageZeno,
      paused: state.paused
    },
    [
      x.buffer, y.buffer, vx.buffer, vy.buffer,
      sx.buffer, sy.buffer, svx.buffer, svy.buffer,
      ax.buffer, ay.buffer, avx.buffer, avy.buffer,
      px.buffer, py.buffer, pvx.buffer, pvy.buffer, ps.buffer, pk.buffer
    ]
  );
}

function simulateStep() {
  if (!state.paused) {
    updateDynamicThreatLevels();
    state.activePerception = getAdaptivePerception(params.perception);
    state.activeShrimpPerception = getAdaptivePerception(params.shrimpPerception);
    state.activeAlgaePerception = getAdaptivePerception(params.algaePerception);
    state.activeNeighborBudget = getNeighborBudget();

    const simHz = getAdaptiveSimHz();
    const simStepMs = 1000 / simHz;
    const simDt = simStepMs / BASE_FRAME_MS;
    state.elapsedMs += simStepMs;
    const flockInterval = getAdaptiveFlockInterval();
    const gridInterval = getAdaptiveGridInterval();
    const spacingInterval = getAdaptiveSpacingInterval();
    const algaeSpacingInterval = getAdaptiveAlgaeSpacingInterval();
    const algaeUpdateInterval = getAdaptiveAlgaeUpdateInterval();

    if (!state.gridReady || (state.simTick % gridInterval) === 0) {
      buildSpatialGrid();
      state.gridReady = true;
    }
    if (!state.shrimpGridReady || (state.simTick % gridInterval) === 0) {
      buildShrimpSpatialGrid();
      state.shrimpGridReady = true;
    }
    if (!state.algaeGridReady) {
      buildAlgaeSpatialGrid();
      state.algaeGridReady = true;
    }

    const gridHeads = state.gridHeads;
    const nextIndices = state.nextIndices;
    const cellSize = state.gridCellSize;
    const gridCols = state.gridCols;
    const gridRows = state.gridRows;
    const shrimpHeads = state.shrimpGridHeads;
    const shrimpNext = state.shrimpNextIndices;
    const shrimpCellSize = state.shrimpGridCellSize;
    const shrimpCols = state.shrimpGridCols;
    const shrimpRows = state.shrimpGridRows;
    const algaeHeads = state.algaeGridHeads;
    const algaeNext = state.algaeNextIndices;
    const algaeCellSize = state.algaeGridCellSize;
    const algaeCols = state.algaeGridCols;
    const algaeRows = state.algaeGridRows;

    if (state.predators.length > 0) {
      for (let i = 0; i < state.predators.length; i += 1) {
        const predator = state.predators[i];
        const target = predator.getTarget(state.boids, state.shrimps, state.algaes, state.predators);
        predator.update(simDt, target, state.predators, i);
      }
    }

    for (let i = 0; i < state.boids.length; i += 1) {
      const boid = state.boids[i];
      const runNeighborhood = ((i + state.simTick) % flockInterval) === 0;
      boid.flock(state.boids, gridHeads, nextIndices, cellSize, gridCols, gridRows, runNeighborhood);
      boid.update(simDt);
      boid.edges();
    }

    FISH_GRID_REF.heads = gridHeads;
    FISH_GRID_REF.next = nextIndices;
    FISH_GRID_REF.cellSize = cellSize;
    FISH_GRID_REF.cols = gridCols;
    FISH_GRID_REF.rows = gridRows;
    for (let i = 0; i < state.shrimps.length; i += 1) {
      const shrimp = state.shrimps[i];
      const runNeighborhood = ((i + state.simTick) % flockInterval) === 0;
      shrimp.flock(
        state.shrimps,
        shrimpHeads,
        shrimpNext,
        shrimpCellSize,
        shrimpCols,
        shrimpRows,
        FISH_GRID_REF,
        runNeighborhood
      );
      shrimp.update(simDt);
      shrimp.edges();
    }

    SHRIMP_GRID_REF.heads = shrimpHeads;
    SHRIMP_GRID_REF.next = shrimpNext;
    SHRIMP_GRID_REF.cellSize = shrimpCellSize;
    SHRIMP_GRID_REF.cols = shrimpCols;
    SHRIMP_GRID_REF.rows = shrimpRows;
    ALGAE_GRID_REF.heads = algaeHeads;
    ALGAE_GRID_REF.next = algaeNext;
    ALGAE_GRID_REF.cellSize = algaeCellSize;
    ALGAE_GRID_REF.cols = algaeCols;
    ALGAE_GRID_REF.rows = algaeRows;
    const runAlgaeUpdate = (state.simTick % algaeUpdateInterval) === 0;
    if (runAlgaeUpdate) {
      const algaeDt = simDt * algaeUpdateInterval;
      for (let i = 0; i < state.algaes.length; i += 1) {
        state.algaes[i].update(algaeDt, FISH_GRID_REF, SHRIMP_GRID_REF, ALGAE_GRID_REF, state.predators);
      }
    }

    // Prey spacing is expensive at large populations; run it adaptively.
    const runSpacing = (state.simTick % spacingInterval) === 0;
    const runAlgaeSpacing = runAlgaeUpdate && (state.simTick % algaeSpacingInterval) === 0;
    if (runSpacing) {
      buildSpatialGrid();
      buildShrimpSpatialGrid();
      state.gridReady = true;
      state.shrimpGridReady = true;
      enforceSpeciesSpacing(
        state.boids,
        state.gridHeads,
        state.nextIndices,
        state.gridCellSize,
        state.gridCols,
        state.gridRows,
        1.05
      );
      enforceSpeciesSpacing(
        state.shrimps,
        state.shrimpGridHeads,
        state.shrimpNextIndices,
        state.shrimpGridCellSize,
        state.shrimpGridCols,
        state.shrimpGridRows,
        1.2
      );
      for (let i = 0; i < state.boids.length; i += 1) {
        state.boids[i].edges();
      }
      for (let i = 0; i < state.shrimps.length; i += 1) {
        state.shrimps[i].edges();
      }
    }
    if (runAlgaeSpacing) {
      buildAlgaeSpatialGrid();
      state.algaeGridReady = true;
      enforceSpeciesSpacing(
        state.algaes,
        state.algaeGridHeads,
        state.algaeNextIndices,
        state.algaeGridCellSize,
        state.algaeGridCols,
        state.algaeGridRows,
        0.95
      );
      for (let i = 0; i < state.algaes.length; i += 1) {
        state.algaes[i].edges();
      }
    }
    // Keep algae grid current for feeding lookup only when algae positions changed.
    if (runAlgaeUpdate || runAlgaeSpacing) {
      state.algaeGridReady = false;
    }

    const algaeConsumedByPrey = processPreyAlgaeFeeding();
    const algaeSpawned = processAlgaeGrowth(simStepMs);
    const eatenCount = processPredation(simStepMs);
    if (eatenCount > 0) state.preyEaten += eatenCount;
    const predatorsChanged = purgeDeadPredators();
    const capsTrimmed = enforcePopulationCapsHard();
    if (eatenCount > 0 || predatorsChanged || algaeConsumedByPrey > 0 || algaeSpawned > 0 || capsTrimmed) {
      publishSizes();
    }

    state.simTick += 1;
    publishFrame();
    return;
  }

  publishFrame();
}

function scheduleLoop() {
  if (state.loopHandle) {
    clearTimeout(state.loopHandle);
    state.loopHandle = null;
  }

  const hz = getAdaptiveSimHz();
  const delay = Math.max(6, Math.round(1000 / hz));
  state.loopHandle = setTimeout(() => {
    simulateStep();
    scheduleLoop();
  }, delay);
}

function handleInit(data) {
  if (typeof data.width === "number") state.width = data.width;
  if (typeof data.height === "number") state.height = data.height;
  if (data.params && typeof data.params === "object") {
    Object.assign(params, data.params);
  }
  const caps = getPopulationCaps();
  baseAurelThreat = params.predatorThreat;
  baseZenoThreat = params.predator2Threat;
  baseAurelSprintDrain = params.predatorSprintDrain;
  baseAurelMaxSpeed = params.predatorMaxSpeed;
  baseZenoSpeed = params.predator2Speed;
  baseZenoAggressiveness = params.predator2Aggressiveness;
  baseZenoDamage = params.predator2Damage;
  baseZenoSprintDrain = params.predator2SprintDrain;
  params.count = Math.max(1, Math.min(caps.fish, Number(data.count ?? params.count) || 1));
  params.shrimpCount = Math.max(0, Math.min(caps.shrimp, Number(params.shrimpCount) || 0));
  params.algaeCount = Math.max(0, Math.min(caps.algae, Number(params.algaeCount) || 0));
  state.elapsedMs = 0;
  state.preyEaten = 0;
  state.zenoBites = 0;
  state.algaeCloneCarry = 0;
  rebuildBoids(params.count);
  rebuildShrimps(params.shrimpCount);
  rebuildAlgaes(params.algaeCount);
  rebuildPredators(PREDATOR_COUNT);
  enforcePopulationCapsHard();
  publishFrame();
  scheduleLoop();
}

onmessage = (event) => {
  const data = event.data;
  if (!data || !data.type) return;

  if (data.type === "init") {
    handleInit(data);
    return;
  }

  if (data.type === "resize") {
    if (typeof data.width === "number") state.width = data.width;
    if (typeof data.height === "number") state.height = data.height;
    const caps = getPopulationCaps();
    params.count = Math.max(1, Math.min(caps.fish, params.count));
    params.shrimpCount = Math.max(0, Math.min(caps.shrimp, params.shrimpCount));
    params.algaeCount = Math.max(0, Math.min(caps.algae, params.algaeCount));
    const changed = enforcePopulationCapsHard();
    state.gridReady = false;
    state.shrimpGridReady = false;
    state.algaeGridReady = false;
    if (changed) publishFrame();
    return;
  }

  if (data.type === "setParam") {
    if (typeof data.key === "string") {
      const oldBounds = getPredatorBounds();
      if (typeof data.value === "number") {
        params[data.key] = data.value;
        if (data.key === "predatorThreat") baseAurelThreat = data.value;
        if (data.key === "predator2Threat") baseZenoThreat = data.value;
        if (data.key === "predatorSprintDrain") baseAurelSprintDrain = data.value;
        if (data.key === "predatorMaxSpeed") baseAurelMaxSpeed = data.value;
        if (data.key === "predator2Speed") baseZenoSpeed = data.value;
        if (data.key === "predator2Aggressiveness") baseZenoAggressiveness = data.value;
        if (data.key === "predator2Damage") baseZenoDamage = data.value;
        if (data.key === "predator2SprintDrain") baseZenoSprintDrain = data.value;
        if (
          data.key === "predatorSize" ||
          data.key === "predatorGrowthSpan" ||
          data.key === "predator2SizeFraction"
        ) {
          remapPredatorSizes(oldBounds);
        }
      } else if (
        (data.key === "algaeToroidal" || data.key === "fishToroidal" || data.key === "shrimpToroidal") &&
        typeof data.value === "boolean"
      ) {
        params[data.key] = data.value;
      }
    }
    return;
  }

  if (data.type === "setCount") {
    const nextCount = Math.max(1, Math.min(getPopulationCaps().fish, Number(data.count) || 1));
    params.count = nextCount;
    rebuildBoids(nextCount);
    publishFrame();
    return;
  }

  if (data.type === "setShrimpCount") {
    const nextCount = Math.max(0, Math.min(getPopulationCaps().shrimp, Number(data.count) || 0));
    params.shrimpCount = nextCount;
    rebuildShrimps(nextCount);
    publishFrame();
    return;
  }

  if (data.type === "setAlgaeCount") {
    const nextCount = Math.max(0, Math.min(getPopulationCaps().algae, Number(data.count) || 0));
    params.algaeCount = nextCount;
    rebuildAlgaes(nextCount);
    publishFrame();
    return;
  }

  if (data.type === "spawnCreature") {
    const species = typeof data.species === "string" ? data.species.toLowerCase() : "";
    const spawned = spawnCreature(species, Number(data.x), Number(data.y));
    if (spawned) {
      state.gridReady = false;
      state.shrimpGridReady = false;
      state.algaeGridReady = false;
      publishSizes();
      publishFrame();
    }
    return;
  }

  if (data.type === "shuffle") {
    state.elapsedMs = 0;
    state.preyEaten = 0;
    state.zenoBites = 0;
    state.algaeCloneCarry = 0;
    rebuildBoids(params.count);
    rebuildShrimps(params.shrimpCount);
    rebuildAlgaes(params.algaeCount);
    rebuildPredators(PREDATOR_COUNT);
    publishFrame();
    return;
  }

  if (data.type === "setPaused") {
    state.paused = Boolean(data.paused);
    return;
  }

  if (data.type === "setMouse") {
    state.mouse.active = Boolean(data.active);
    state.mouse.x = Number(data.x || 0);
    state.mouse.y = Number(data.y || 0);
  }
};
