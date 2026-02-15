const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d", { alpha: false });
const predatorCanvas = document.getElementById("predator-layer");
const predCtx = predatorCanvas ? predatorCanvas.getContext("2d", { alpha: true }) : null;
const hud = document.getElementById("hud");
const controlsPanel = document.getElementById("controlsPanel");
const controlsHandle = document.getElementById("controlsHandle");
const controlsHandleText = document.getElementById("controlsHandleText");
const mobileQuickPanel = document.getElementById("mobileQuick");
const mobileQuickSpeciesHost = document.getElementById("mobileQuickSpeciesHost");
const mobileQuickStats = document.getElementById("mobileQuickStats");
const mobileQuickSliders = document.getElementById("mobileQuickSliders");
const mobileRecentControls = document.getElementById("mobileRecentControls");
const quickTabButtons = Array.from(document.querySelectorAll(".mobile-quick-tab"));
const quickTabStats = document.getElementById("quickTabStats");
const quickTabScaper = document.getElementById("quickTabScaper");
const quickTabPrey = document.getElementById("quickTabPrey");
const quickTabPredator = document.getElementById("quickTabPredator");
const mobileControlsQuery = window.matchMedia("(max-width: 920px)");
const startMenu = document.getElementById("startMenu");
const startSimulationBtn = document.getElementById("startSimulationBtn");
const startGameBtn = document.getElementById("startGameBtn");
const startMenuHint = document.getElementById("startMenuHint");
const gameModeScreen = document.getElementById("gameModeScreen");
const gameBackBtn = document.getElementById("gameBackBtn");
const gameToSimulationBtn = document.getElementById("gameToSimulationBtn");
const speciesSpawnButtons = Array.from(document.querySelectorAll(".species-chip"));
const topBar = document.querySelector(".top-bar");
const speciesBarEl = document.querySelector(".species-bar");
const speciesChipEls = Object.fromEntries(
  speciesSpawnButtons
    .map((button) => [button.dataset.species, button])
    .filter(([species]) => typeof species === "string" && species.length > 0)
);
const speciesCountEls = {
  fish: document.getElementById("speciesCountFish"),
  shrimp: document.getElementById("speciesCountShrimp"),
  algae: document.getElementById("speciesCountAlgae"),
  aurel: document.getElementById("speciesCountAurel"),
  zeno: document.getElementById("speciesCountZeno")
};
const algaeWallControls = document.getElementById("algaeWallControls");

const controls = {
  count: document.getElementById("count"),
  perception: document.getElementById("perception"),
  separation: document.getElementById("separation"),
  clusterAvoidance: document.getElementById("clusterAvoidance"),
  alignment: document.getElementById("alignment"),
  cohesion: document.getElementById("cohesion"),
  maxSpeed: document.getElementById("maxSpeed"),
  maxForce: document.getElementById("maxForce"),
  wallReach: document.getElementById("wallReach"),
  wallFade: document.getElementById("wallFade"),
  wallStrength: document.getElementById("wallStrength"),
  fishAlgaeInterestCooldown: document.getElementById("fishAlgaeInterestCooldown"),
  fishAlgaeMealsToReproduce: document.getElementById("fishAlgaeMealsToReproduce"),
  fishPopulationPenalty: document.getElementById("fishPopulationPenalty"),
  shrimpCount: document.getElementById("shrimpCount"),
  shrimpPerception: document.getElementById("shrimpPerception"),
  shrimpSeparation: document.getElementById("shrimpSeparation"),
  shrimpClusterAvoidance: document.getElementById("shrimpClusterAvoidance"),
  shrimpAlignment: document.getElementById("shrimpAlignment"),
  shrimpCohesion: document.getElementById("shrimpCohesion"),
  shrimpJumpSpeed: document.getElementById("shrimpJumpSpeed"),
  shrimpMaxForce: document.getElementById("shrimpMaxForce"),
  shrimpWallReach: document.getElementById("shrimpWallReach"),
  shrimpWallFade: document.getElementById("shrimpWallFade"),
  shrimpWallStrength: document.getElementById("shrimpWallStrength"),
  shrimpFishAvoidance: document.getElementById("shrimpFishAvoidance"),
  shrimpAlgaeInterestCooldown: document.getElementById("shrimpAlgaeInterestCooldown"),
  shrimpAlgaeMealsToReproduce: document.getElementById("shrimpAlgaeMealsToReproduce"),
  shrimpPopulationPenalty: document.getElementById("shrimpPopulationPenalty"),
  algaeCount: document.getElementById("algaeCount"),
  algaePerception: document.getElementById("algaePerception"),
  algaeCurrentSensitivity: document.getElementById("algaeCurrentSensitivity"),
  algaeSeparation: document.getElementById("algaeSeparation"),
  algaeSpeed: document.getElementById("algaeSpeed"),
  algaeWallReach: document.getElementById("algaeWallReach"),
  algaeWallFade: document.getElementById("algaeWallFade"),
  algaeWallStrength: document.getElementById("algaeWallStrength"),
  algaeGrowthRate: document.getElementById("algaeGrowthRate"),
  algaePopulationPenalty: document.getElementById("algaePopulationPenalty"),
  algaeToroidal: document.getElementById("algaeToroidal"),
  predatorSize: document.getElementById("predatorSize"),
  predatorGrowthSpan: document.getElementById("predatorGrowthSpan"),
  predatorThreat: document.getElementById("predatorThreat"),
  predatorSeparation: document.getElementById("predatorSeparation"),
  predatorSteeringForce: document.getElementById("predatorSteeringForce"),
  predatorMaxSpeed: document.getElementById("predatorMaxSpeed"),
  predatorMaxSprint: document.getElementById("predatorMaxSprint"),
  predatorSprintDrain: document.getElementById("predatorSprintDrain"),
  predatorAggressiveness: document.getElementById("predatorAggressiveness"),
  predator2SizeFraction: document.getElementById("predator2SizeFraction"),
  predator2Damage: document.getElementById("predator2Damage"),
  predator2Threat: document.getElementById("predator2Threat"),
  predator2Separation: document.getElementById("predator2Separation"),
  predator2SteeringForce: document.getElementById("predator2SteeringForce"),
  predator2Speed: document.getElementById("predator2Speed"),
  predator2MaxSprint: document.getElementById("predator2MaxSprint"),
  predator2SprintDrain: document.getElementById("predator2SprintDrain"),
  predator2Aggressiveness: document.getElementById("predator2Aggressiveness"),
  mouseThreat: document.getElementById("mouseThreat"),
  wallViewportOffset: document.getElementById("wallViewportOffset"),
  trail: document.getElementById("trail"),
  restart: document.getElementById("restart"),
  pause: document.getElementById("pause")
};

const state = {
  worker: null,
  workerAvailable: typeof Worker !== "undefined",
  simulationStarted: false,
  serviceWorkerRegistered: false,
  currentMode: "menu",
  width: 0,
  height: 0,
  dpr: 1,
  paused: false,
  controlsOpen: false,
  controlsMode: "quick",
  activeQuickTab: "stats",
  quickPreyType: "fish",
  quickPredatorType: "aurel",
  recentByGroup: {
    scaper: ["mouseThreat", "wallViewportOffset"],
    prey: {
      fish: ["count", "separation"],
      shrimp: ["shrimpCount", "shrimpSeparation"],
      algae: ["algaeCount", "algaeCurrentSensitivity"]
    },
    predator: {
      aurel: ["predatorThreat", "predatorSeparation"],
      zeno: ["predator2Threat", "predator2Separation"]
    }
  },
  sheetDragStartY: null,
  mouseActive: false,
  frameCount: 0,
  fishCount: 0,
  fishX: null,
  fishY: null,
  fishVX: null,
  fishVY: null,
  fishSizes: null,
  shrimpCount: 0,
  shrimpX: null,
  shrimpY: null,
  shrimpVX: null,
  shrimpVY: null,
  shrimpSizes: null,
  algaeCount: 0,
  algaeX: null,
  algaeY: null,
  algaeVX: null,
  algaeVY: null,
  algaeSizes: null,
  predatorCount: 0,
  predatorX: null,
  predatorY: null,
  predatorVX: null,
  predatorVY: null,
  predatorSizes: null,
  predatorKinds: null,
  predatorVisuals: [],
  elapsedMs: 0,
  preyEaten: 0,
  bitesTaken: 0,
  preyPerMinute: 0,
  zenoBitesPerMinute: 0,
  averageAurel: 0,
  averageZeno: 0,
  statsTrendPrev: {
    preyPerMinute: null,
    zenoBitesPerMinute: null,
    averageAurel: null,
    averageZeno: null
  },
  speciesVisibility: {
    fish: true,
    shrimp: true,
    algae: true,
    aurel: true,
    zeno: true
  },
  spawnDrag: {
    active: false,
    pointerId: null,
    pointerType: "",
    intent: "idle",
    species: "",
    ghost: null,
    startX: 0,
    startY: 0,
    startTimeMs: 0,
    didDrag: false,
    sourceChip: null
  }
};

const params = {
  count: Number(controls.count.value),
  perception: Number(controls.perception.value),
  separation: Number(controls.separation.value),
  clusterAvoidance: Number(controls.clusterAvoidance.value),
  alignment: Number(controls.alignment.value),
  cohesion: Number(controls.cohesion.value),
  maxSpeed: Number(controls.maxSpeed.value),
  maxForce: Number(controls.maxForce.value),
  wallReach: Number(controls.wallReach.value),
  wallFade: Number(controls.wallFade.value),
  wallStrength: Number(controls.wallStrength.value),
  fishAlgaeInterestCooldown: Number(controls.fishAlgaeInterestCooldown.value),
  fishAlgaeMealsToReproduce: Number(controls.fishAlgaeMealsToReproduce.value),
  fishPopulationPenalty: Number(controls.fishPopulationPenalty.value),
  shrimpCount: Number(controls.shrimpCount.value),
  shrimpPerception: Number(controls.shrimpPerception.value),
  shrimpSeparation: Number(controls.shrimpSeparation.value),
  shrimpClusterAvoidance: Number(controls.shrimpClusterAvoidance.value),
  shrimpAlignment: Number(controls.shrimpAlignment.value),
  shrimpCohesion: Number(controls.shrimpCohesion.value),
  shrimpSpeed: 1,
  shrimpJumpSpeed: Number(controls.shrimpJumpSpeed.value),
  shrimpMaxForce: Number(controls.shrimpMaxForce.value),
  shrimpWallReach: Number(controls.shrimpWallReach.value),
  shrimpWallFade: Number(controls.shrimpWallFade.value),
  shrimpWallStrength: Number(controls.shrimpWallStrength.value),
  shrimpFishAvoidance: Number(controls.shrimpFishAvoidance.value),
  shrimpAlgaeInterestCooldown: Number(controls.shrimpAlgaeInterestCooldown.value),
  shrimpAlgaeMealsToReproduce: Number(controls.shrimpAlgaeMealsToReproduce.value),
  shrimpPopulationPenalty: Number(controls.shrimpPopulationPenalty.value),
  algaeCount: Number(controls.algaeCount.value),
  algaePerception: Number(controls.algaePerception.value),
  algaeCurrentSensitivity: Number(controls.algaeCurrentSensitivity.value),
  algaeSeparation: Number(controls.algaeSeparation.value),
  algaeSpeed: Number(controls.algaeSpeed.value),
  algaeWallReach: Number(controls.algaeWallReach.value),
  algaeWallFade: Number(controls.algaeWallFade.value),
  algaeWallStrength: Number(controls.algaeWallStrength.value),
  algaeGrowthRate: Number(controls.algaeGrowthRate.value),
  algaePopulationPenalty: Number(controls.algaePopulationPenalty.value),
  algaeToroidal: Boolean(controls.algaeToroidal && controls.algaeToroidal.checked),
  predatorSize: Number(controls.predatorSize.value),
  predatorGrowthSpan: Number(controls.predatorGrowthSpan.value),
  predatorThreat: Number(controls.predatorThreat.value),
  predatorSeparation: Number(controls.predatorSeparation.value),
  predatorSteeringForce: Number(controls.predatorSteeringForce.value),
  predatorSpeed: 0.1,
  predatorMaxSpeed: Number(controls.predatorMaxSpeed.value),
  predatorMaxSprint: Number(controls.predatorMaxSprint.value),
  predatorSprintDrain: Number(controls.predatorSprintDrain.value),
  predatorAggressiveness: Number(controls.predatorAggressiveness.value),
  predator2SizeFraction: Number(controls.predator2SizeFraction.value),
  predator2Damage: Number(controls.predator2Damage.value),
  predator2Threat: Number(controls.predator2Threat.value),
  predator2Separation: Number(controls.predator2Separation.value),
  predator2SteeringForce: Number(controls.predator2SteeringForce.value),
  predator2Speed: Number(controls.predator2Speed.value),
  predator2MaxSprint: Number(controls.predator2MaxSprint.value),
  predator2SprintDrain: Number(controls.predator2SprintDrain.value),
  predator2Aggressiveness: Number(controls.predator2Aggressiveness.value),
  mouseThreat: Number(controls.mouseThreat.value),
  wallViewportOffset: Number(controls.wallViewportOffset.value),
  trail: Number(controls.trail.value)
};

const rangeControls = [
  controls.count,
  controls.perception,
  controls.separation,
  controls.clusterAvoidance,
  controls.alignment,
  controls.cohesion,
  controls.maxSpeed,
  controls.maxForce,
  controls.wallReach,
  controls.wallFade,
  controls.wallStrength,
  controls.fishAlgaeInterestCooldown,
  controls.fishAlgaeMealsToReproduce,
  controls.fishPopulationPenalty,
  controls.shrimpCount,
  controls.shrimpPerception,
  controls.shrimpSeparation,
  controls.shrimpClusterAvoidance,
  controls.shrimpAlignment,
  controls.shrimpCohesion,
  controls.shrimpJumpSpeed,
  controls.shrimpMaxForce,
  controls.shrimpWallReach,
  controls.shrimpWallFade,
  controls.shrimpWallStrength,
  controls.shrimpFishAvoidance,
  controls.shrimpAlgaeInterestCooldown,
  controls.shrimpAlgaeMealsToReproduce,
  controls.shrimpPopulationPenalty,
  controls.algaeCount,
  controls.algaePerception,
  controls.algaeCurrentSensitivity,
  controls.algaeSeparation,
  controls.algaeSpeed,
  controls.algaeWallReach,
  controls.algaeWallFade,
  controls.algaeWallStrength,
  controls.algaeGrowthRate,
  controls.algaePopulationPenalty,
  controls.predatorSize,
  controls.predatorGrowthSpan,
  controls.predatorThreat,
  controls.predatorSeparation,
  controls.predatorSteeringForce,
  controls.predatorMaxSpeed,
  controls.predatorMaxSprint,
  controls.predatorSprintDrain,
  controls.predatorAggressiveness,
  controls.predator2SizeFraction,
  controls.predator2Damage,
  controls.predator2Threat,
  controls.predator2Separation,
  controls.predator2SteeringForce,
  controls.predator2Speed,
  controls.predator2MaxSprint,
  controls.predator2SprintDrain,
  controls.predator2Aggressiveness,
  controls.mouseThreat,
  controls.wallViewportOffset,
  controls.trail
];

const sliderMeta = Object.fromEntries(
  rangeControls.map((control) => [control.id, document.getElementById(`${control.id}Meta`)])
);
const sliderPct = Object.fromEntries(
  rangeControls.map((control) => [control.id, document.getElementById(`${control.id}Pct`)])
);
const tabButtons = Array.from(document.querySelectorAll(".tab-btn"));
const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));
const preyTabButtons = Array.from(document.querySelectorAll(".prey-tab-btn"));
const preySubPanels = Array.from(document.querySelectorAll(".prey-subpanel"));
const predatorTabButtons = Array.from(document.querySelectorAll(".predator-tab-btn"));
const predatorSubPanels = Array.from(document.querySelectorAll(".predator-subpanel"));
const restartDialog = document.getElementById("restartDialog");
const restartActionButtons = Array.from(document.querySelectorAll(".restart-action"));
const statsEls = {
  elapsed: document.getElementById("statElapsed"),
  preyEaten: document.getElementById("statPreyEaten"),
  bitesTaken: document.getElementById("statBitesTaken"),
  preyPerMinute: document.getElementById("statPreyPerMinute"),
  zenoBitesPerMinute: document.getElementById("statZenoBitesPerMinute"),
  averageAurel: document.getElementById("statAverageAurel"),
  averageZeno: document.getElementById("statAverageZeno"),
  fishCount: document.getElementById("statFishCount"),
  shrimpCount: document.getElementById("statShrimpCount"),
  algaeCount: document.getElementById("statAlgaeCount"),
  aurelCount: document.getElementById("statAurelCount"),
  zenoCount: document.getElementById("statZenoCount")
};
const quickStatsEls = {
  elapsed: document.getElementById("quickStatElapsed"),
  preyEaten: document.getElementById("quickStatPreyEaten"),
  bitesTaken: document.getElementById("quickStatBitesTaken"),
  preyPerMinute: document.getElementById("quickStatPreyPerMinute"),
  bitesPerMinute: document.getElementById("quickStatBitesPerMinute"),
  averageAurel: document.getElementById("quickStatAverageAurel"),
  averageZeno: document.getElementById("quickStatAverageZeno"),
  fishCount: document.getElementById("quickStatFishCount"),
  shrimpCount: document.getElementById("quickStatShrimpCount"),
  algaeCount: document.getElementById("quickStatAlgaeCount"),
  aurelCount: document.getElementById("quickStatAurelCount"),
  zenoCount: document.getElementById("quickStatZenoCount")
};

const FAST_RENDER_THRESHOLD = 12000;
const ULTRA_RENDER_THRESHOLD = 17000;
const scalingResetControls = [
  controls.predatorThreat,
  controls.predator2Threat,
  controls.predatorSprintDrain
];
const controlCategoryMap = {
  mouseThreat: "scaper",
  wallViewportOffset: "scaper",
  count: "prey",
  perception: "prey",
  separation: "prey",
  clusterAvoidance: "prey",
  alignment: "prey",
  cohesion: "prey",
  maxSpeed: "prey",
  maxForce: "prey",
  wallReach: "prey",
  wallFade: "prey",
  wallStrength: "prey",
  fishAlgaeInterestCooldown: "prey",
  fishAlgaeMealsToReproduce: "prey",
  fishPopulationPenalty: "prey",
  shrimpCount: "prey",
  shrimpPerception: "prey",
  shrimpSeparation: "prey",
  shrimpClusterAvoidance: "prey",
  shrimpAlignment: "prey",
  shrimpCohesion: "prey",
  shrimpJumpSpeed: "prey",
  shrimpMaxForce: "prey",
  shrimpWallReach: "prey",
  shrimpWallFade: "prey",
  shrimpWallStrength: "prey",
  shrimpFishAvoidance: "prey",
  shrimpAlgaeInterestCooldown: "prey",
  shrimpAlgaeMealsToReproduce: "prey",
  shrimpPopulationPenalty: "prey",
  algaeCount: "prey",
  algaePerception: "prey",
  algaeCurrentSensitivity: "prey",
  algaeSeparation: "prey",
  algaeSpeed: "prey",
  algaeWallReach: "prey",
  algaeWallFade: "prey",
  algaeWallStrength: "prey",
  algaeGrowthRate: "prey",
  algaePopulationPenalty: "prey",
  algaeToroidal: "prey",
  trail: "prey",
  predatorSize: "predator",
  predatorGrowthSpan: "predator",
  predatorThreat: "predator",
  predatorSeparation: "predator",
  predatorSteeringForce: "predator",
  predatorMaxSpeed: "predator",
  predatorMaxSprint: "predator",
  predatorSprintDrain: "predator",
  predatorAggressiveness: "predator",
  predator2SizeFraction: "predator",
  predator2Damage: "predator",
  predator2Threat: "predator",
  predator2Separation: "predator",
  predator2SteeringForce: "predator",
  predator2Speed: "predator",
  predator2MaxSprint: "predator",
  predator2SprintDrain: "predator",
  predator2Aggressiveness: "predator"
};
const quickToMainTab = {
  stats: "stats",
  scaper: "scaper",
  prey: "prey",
  predator: "predator"
};
const predatorSpriteSourceMap = {
  1: {
    baseSrc: "./Aurel_Topdown.png",
    slightLeftSrc: "./Aurel_Topdown_Slight_Left.png",
    slightRightSrc: "./Aurel_Topdown_Slight_Right.png",
    leftSrc: "./Aurel_Topdown_Left.png",
    rightSrc: "./Aurel_Topdown_Right.png",
    crops: {
      base: { x: 640, y: 201, w: 258, h: 557 },
      slightLeft: { x: 501, y: 326, w: 560, h: 335 },
      slightRight: { x: 563, y: 289, w: 461, h: 381 },
      left: { x: 640, y: 250, w: 361, h: 501 },
      right: { x: 588, y: 240, w: 377, h: 532 }
    },
    bodyLengthMul: 6.1,
    widthMul: 0.96,
    bendMul: 1.28,
    slightTurnThreshold: 0.16,
    bentTurnThreshold: 0.34
  },
  2: {
    baseSrc: "./Zeno_Topdown.png",
    leftSrc: "./Zeno_Topdown_left.png",
    rightSrc: "./Zeno_Topdown_right.png",
    crops: {
      base: { x: 539, y: 139, w: 458, h: 690 },
      left: { x: 612, y: 146, w: 466, h: 662 },
      right: { x: 563, y: 166, w: 429, h: 649 }
    },
    bodyLengthMul: 4.6,
    widthMul: 0.74,
    bendMul: 1.34,
    slightTurnThreshold: 0.15,
    bentTurnThreshold: 0.3
  }
};
const predatorSprites = new Map();

function normalizeAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function preloadPredatorSprites() {
  Object.entries(predatorSpriteSourceMap).forEach(([kind, meta]) => {
    const pack = {
      base: new Image(),
      slightLeft: new Image(),
      slightRight: new Image(),
      left: new Image(),
      right: new Image()
    };
    pack.base.decoding = "async";
    pack.slightLeft.decoding = "async";
    pack.slightRight.decoding = "async";
    pack.left.decoding = "async";
    pack.right.decoding = "async";
    pack.base.src = meta.baseSrc;
    pack.slightLeft.src = meta.slightLeftSrc || meta.leftSrc || meta.baseSrc;
    pack.slightRight.src = meta.slightRightSrc || meta.rightSrc || meta.baseSrc;
    pack.left.src = meta.leftSrc || meta.baseSrc;
    pack.right.src = meta.rightSrc || meta.baseSrc;
    predatorSprites.set(Number(kind), pack);
  });
}

function getPredatorSprite(kind, visual, turnSignal = 0) {
  const pack = predatorSprites.get(kind);
  const meta = predatorSpriteSourceMap[kind];
  if (!pack || !meta) return null;

  const hard = Math.max(0.01, meta.bentTurnThreshold || 0.33);
  const mild = Math.max(0.005, Math.min(hard * 0.8, meta.slightTurnThreshold || hard * 0.52));
  const signalAbs = Math.abs(turnSignal);
  const dir = turnSignal >= 0 ? "right" : "left";
  const prev = visual && visual.spriteVariant ? visual.spriteVariant : "base";

  let variant = "base";
  if (signalAbs >= hard) {
    variant = dir;
  } else if (signalAbs >= mild) {
    variant = dir === "right" ? "slightRight" : "slightLeft";
  }

  // Hysteresis prevents rapid sprite flipping when turn signal hovers around thresholds.
  if (dir === "right") {
    if (prev === "right" && signalAbs >= hard * 0.58) variant = "right";
    else if (prev === "slightRight" && signalAbs >= mild * 0.54) variant = "slightRight";
  } else {
    if (prev === "left" && signalAbs >= hard * 0.58) variant = "left";
    else if (prev === "slightLeft" && signalAbs >= mild * 0.54) variant = "slightLeft";
  }
  if (signalAbs < mild * 0.36) variant = "base";
  if (visual) visual.spriteVariant = variant;

  const fallbackByVariant = {
    slightLeft: ["slightLeft", "left", "base"],
    slightRight: ["slightRight", "right", "base"],
    left: ["left", "base"],
    right: ["right", "base"],
    base: ["base"]
  };
  const order = fallbackByVariant[variant] || ["base"];
  let image = null;
  let crop = null;
  for (let i = 0; i < order.length; i += 1) {
    const key = order[i];
    const candidateImage = pack[key];
    const candidateCrop = meta.crops ? meta.crops[key] : null;
    if (!candidateImage || !candidateCrop) continue;
    if (!candidateImage.complete || candidateImage.naturalWidth === 0 || candidateImage.naturalHeight === 0) continue;
    image = candidateImage;
    crop = candidateCrop;
    variant = key;
    break;
  }
  if (!image || !crop) return null;
  return { image, meta, crop, variant };
}

function setActiveTab(tabName) {
  tabButtons.forEach((button) => {
    const isActive = button.dataset.tab === tabName;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  tabPanels.forEach((panel) => {
    const panelName = panel.id.replace("panel", "").toLowerCase();
    const isActive = panelName === tabName;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
  setActiveQuickTab(tabName);
}

function setActivePredatorTab(tabName) {
  predatorTabButtons.forEach((button) => {
    const isActive = button.dataset.predatorTab === tabName;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  predatorSubPanels.forEach((panel) => {
    const panelName = panel.id === "predatorPanelA" ? "a" : "b";
    const isActive = panelName === tabName;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
}

function setActivePreyTab(tabName) {
  preyTabButtons.forEach((button) => {
    const isActive = button.dataset.preyTab === tabName;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  preySubPanels.forEach((panel) => {
    let panelName = "fish";
    if (panel.id === "preyPanelShrimp") panelName = "shrimp";
    if (panel.id === "preyPanelAlgae") panelName = "algae";
    const isActive = panelName === tabName;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
}

function isMobileControlsLayout() {
  return mobileControlsQuery.matches;
}

function getControlLabelText(control) {
  if (!control) return "";
  const label = document.querySelector(`label[for="${control.id}"]`);
  if (!label) return control.id;
  const textNode = Array.from(label.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
  const text = textNode ? textNode.textContent : label.textContent;
  return (text || control.id).trim();
}

function isRangeControl(control) {
  return Boolean(control && control instanceof HTMLInputElement && control.type === "range");
}

function getRecentIdsForCategory(category) {
  let source = [];
  if (category === "scaper") {
    source = state.recentByGroup.scaper || [];
  } else if (category === "prey") {
    source = state.recentByGroup.prey[state.quickPreyType] || [];
  } else if (category === "predator") {
    source = state.recentByGroup.predator[state.quickPredatorType] || [];
  }

  const ids = source
    .filter((id) => controlCategoryMap[id] === category && isRangeControl(controls[id]))
    .slice(0, 2);
  if (ids.length > 0) return ids;

  if (category === "scaper") return controls.mouseThreat ? ["mouseThreat"] : [];
  if (category === "prey") {
    const fallback = state.quickPreyType === "shrimp"
      ? ["shrimpCount", "shrimpSeparation"]
      : state.quickPreyType === "algae"
        ? ["algaeCount", "algaeCurrentSensitivity"]
      : ["count", "separation"];
    return fallback.filter((id) => controls[id]);
  }
  if (category === "predator") {
    const fallback = state.quickPredatorType === "zeno"
      ? ["predator2Threat", "predator2Separation"]
      : ["predatorThreat", "predatorSeparation"];
    return fallback.filter((id) => controls[id]);
  }
  return [];
}

function renderMobileRecentControls() {
  if (!mobileRecentControls) return;
  const category = state.activeQuickTab;
  const ids = getRecentIdsForCategory(category);
  mobileRecentControls.innerHTML = "";

  if (ids.length === 0) {
    const empty = document.createElement("p");
    empty.className = "mobile-recent-empty";
    empty.textContent = "No recent sliders yet.";
    mobileRecentControls.append(empty);
    return;
  }

  ids.forEach((id) => {
    const control = controls[id];
    if (!control) return;

    const row = document.createElement("div");
    row.className = "mobile-recent-item";

    const head = document.createElement("div");
    head.className = "mobile-recent-head";

    const label = document.createElement("span");
    label.className = "mobile-recent-label";
    label.textContent = getControlLabelText(control);

    const value = document.createElement("span");
    value.className = "mobile-recent-value";
    value.textContent = formatControlValue(control);

    head.append(label, value);

    const range = document.createElement("input");
    range.type = "range";
    range.min = control.min;
    range.max = control.max;
    range.step = control.step || "1";
    range.value = control.value;
    range.dataset.sourceId = id;
    range.className = "mobile-recent-range";
    range.style.setProperty("--range-pct", control.style.getPropertyValue("--range-pct") || "50%");
    range.addEventListener("input", () => {
      applyControlValue(control, range.value);
    });

    row.append(head, range);
    mobileRecentControls.append(row);
  });
}

function syncQuickRecentControl(controlId) {
  if (!mobileRecentControls) return;
  const control = controls[controlId];
  if (!control) return;
  const range = mobileRecentControls.querySelector(`input[data-source-id="${controlId}"]`);
  if (!range) return;

  range.value = control.value;
  range.style.setProperty("--range-pct", control.style.getPropertyValue("--range-pct") || "50%");
  const item = range.closest(".mobile-recent-item");
  const valueEl = item ? item.querySelector(".mobile-recent-value") : null;
  if (valueEl) valueEl.textContent = formatControlValue(control);
}

function updateQuickTabLabels() {
  if (quickTabStats) quickTabStats.textContent = "Stats";
  if (quickTabScaper) quickTabScaper.textContent = "Scaper";
  if (quickTabPrey) {
    if (state.quickPreyType === "shrimp") quickTabPrey.textContent = "Shrimp";
    else if (state.quickPreyType === "algae") quickTabPrey.textContent = "Algae";
    else quickTabPrey.textContent = "Fish";
  }
  if (quickTabPredator) quickTabPredator.textContent = state.quickPredatorType === "zeno" ? "Zenos" : "Aurels";
}

function rememberRecentControl(controlId) {
  if (!isRangeControl(controls[controlId])) return false;
  const category = controlCategoryMap[controlId];
  if (!category) return false;

  if (category === "scaper") {
    const existing = state.recentByGroup.scaper || [];
    const next = [controlId, ...existing.filter((id) => id !== controlId)].slice(0, 2);
    const changed = next.length !== existing.length || next.some((id, index) => id !== existing[index]);
    state.recentByGroup.scaper = next;
    return changed;
  }

  if (category === "prey") {
    let type = "fish";
    if (controlId.startsWith("shrimp")) type = "shrimp";
    else if (controlId.startsWith("algae")) type = "algae";
    const typeChanged = state.quickPreyType !== type;
    state.quickPreyType = type;
    const existing = state.recentByGroup.prey[type] || [];
    const next = [controlId, ...existing.filter((id) => id !== controlId)].slice(0, 2);
    const changed = next.length !== existing.length || next.some((id, index) => id !== existing[index]);
    state.recentByGroup.prey[type] = next;
    if (typeChanged) updateQuickTabLabels();
    return changed || typeChanged;
  }

  if (category === "predator") {
    const type = controlId.startsWith("predator2") ? "zeno" : "aurel";
    const typeChanged = state.quickPredatorType !== type;
    state.quickPredatorType = type;
    const existing = state.recentByGroup.predator[type] || [];
    const next = [controlId, ...existing.filter((id) => id !== controlId)].slice(0, 2);
    const changed = next.length !== existing.length || next.some((id, index) => id !== existing[index]);
    state.recentByGroup.predator[type] = next;
    if (typeChanged) updateQuickTabLabels();
    return changed || typeChanged;
  }

  return false;
}

function setActiveQuickTab(tabName) {
  const resolved = quickToMainTab[tabName] ? tabName : "stats";
  state.activeQuickTab = resolved;
  if (resolved === "prey") {
    setActivePreyTab(
      state.quickPreyType === "shrimp" ? "shrimp" : state.quickPreyType === "algae" ? "algae" : "fish"
    );
  } else if (resolved === "predator") {
    setActivePredatorTab(state.quickPredatorType === "zeno" ? "b" : "a");
  }

  quickTabButtons.forEach((button) => {
    const isActive = button.dataset.quickTab === resolved;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  if (mobileQuickStats) {
    const showStats = resolved === "stats";
    mobileQuickStats.hidden = !showStats;
    mobileQuickStats.classList.toggle("is-active", showStats);
  }
  if (mobileQuickSliders) {
    const showSliders = resolved !== "stats";
    mobileQuickSliders.hidden = !showSliders;
    mobileQuickSliders.classList.toggle("is-active", showSliders);
  }

  if (resolved !== "stats") {
    renderMobileRecentControls();
  }
  updateMobileSheetPeek();
}

function updateMobileSheetPeek() {
  if (!controlsPanel || !isMobileControlsLayout()) return;
  const handleHeight = controlsHandle ? controlsHandle.getBoundingClientRect().height : 0;
  const speciesHeight = mobileQuickSpeciesHost ? mobileQuickSpeciesHost.scrollHeight : 0;
  if (speciesHeight > 0) {
    const peek = Math.max(130, Math.min(Math.floor(window.innerHeight * 0.7), Math.ceil(handleHeight + speciesHeight + 18)));
    controlsPanel.style.setProperty("--sheet-peek", `${peek}px`);
    return;
  }
  const quickTitle = mobileQuickPanel ? mobileQuickPanel.querySelector(".mobile-quick-title") : null;
  const quickTabs = mobileQuickPanel ? mobileQuickPanel.querySelector(".mobile-quick-tabs") : null;
  const titleHeight = quickTitle ? quickTitle.getBoundingClientRect().height : 0;
  const tabsHeight = quickTabs ? quickTabs.getBoundingClientRect().height : 0;
  const activePanel = state.activeQuickTab === "stats" ? mobileQuickStats : mobileQuickSliders;
  const activePanelHeight = activePanel ? activePanel.scrollHeight : 0;
  const contentHeight = titleHeight + tabsHeight + activePanelHeight;
  const maxPeek = Math.max(240, Math.floor(window.innerHeight * 0.78));
  const peek = Math.max(210, Math.min(maxPeek, Math.ceil(handleHeight + contentHeight + 38)));
  controlsPanel.style.setProperty("--sheet-peek", `${peek}px`);
}

function syncSpeciesBarHostForViewport() {
  if (!speciesBarEl || !topBar || !mobileQuickSpeciesHost) return;
  if (isMobileControlsLayout()) {
    if (speciesBarEl.parentElement !== mobileQuickSpeciesHost) {
      mobileQuickSpeciesHost.appendChild(speciesBarEl);
    }
  } else if (speciesBarEl.parentElement !== topBar) {
    topBar.appendChild(speciesBarEl);
  }
}

function setControlsMenuMode(mode) {
  const mobile = isMobileControlsLayout();
  let nextMode = mobile ? mode : "expanded";
  if (nextMode !== "hidden" && nextMode !== "quick" && nextMode !== "expanded") {
    nextMode = mobile ? "quick" : "expanded";
  }

  state.controlsMode = nextMode;
  state.controlsOpen = nextMode === "expanded";

  if (controlsPanel) {
    controlsPanel.classList.toggle("is-expanded", nextMode === "expanded");
    controlsPanel.classList.toggle("is-hidden", nextMode === "hidden");
  }
  if (controlsHandle) controlsHandle.setAttribute("aria-expanded", String(nextMode === "expanded"));
  if (controlsHandleText) {
    if (nextMode === "hidden") controlsHandleText.textContent = "Swipe Up For Quick Menu";
    else if (nextMode === "quick") controlsHandleText.textContent = "Swipe Up For Menu";
    else controlsHandleText.textContent = "Swipe Down To Close Menu";
  }
  document.body.classList.toggle("controls-open", nextMode === "expanded" && mobile);
  updateMobileSheetPeek();
}

function setControlsMenuOpen(open) {
  setControlsMenuMode(Boolean(open) ? "expanded" : "quick");
}

function syncControlsMenuForViewport() {
  syncSpeciesBarHostForViewport();
  if (!isMobileControlsLayout()) {
    state.controlsOpen = false;
    state.controlsMode = "expanded";
    if (controlsPanel) {
      controlsPanel.classList.remove("is-expanded");
      controlsPanel.classList.remove("is-hidden");
      controlsPanel.style.removeProperty("--sheet-peek");
    }
    document.body.classList.remove("controls-open");
    return;
  }

  setControlsMenuMode(state.controlsMode || "quick");
}

function formatElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatPopulationCompact(value) {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  if (n >= 1000) {
    const k = n / 1000;
    const decimals = k >= 10 ? 0 : 1;
    return `${k.toFixed(decimals).replace(/\.0$/, "")}K`;
  }
  return String(n);
}

function getPredatorSplitCounts() {
  let aurelCount = 0;
  let zenoCount = 0;
  if (state.predatorKinds && state.predatorKinds.length > 0) {
    for (let i = 0; i < state.predatorKinds.length; i += 1) {
      if (state.predatorKinds[i] === 2) zenoCount += 1;
      else aurelCount += 1;
    }
  } else {
    aurelCount = Math.max(0, Math.floor(state.predatorCount || 0));
  }
  return { aurelCount, zenoCount };
}

function updateSpeciesBarCounts() {
  const { aurelCount, zenoCount } = getPredatorSplitCounts();
  if (speciesCountEls.fish) speciesCountEls.fish.textContent = formatPopulationCompact(state.fishCount);
  if (speciesCountEls.shrimp) speciesCountEls.shrimp.textContent = formatPopulationCompact(state.shrimpCount);
  if (speciesCountEls.algae) speciesCountEls.algae.textContent = formatPopulationCompact(state.algaeCount);
  if (speciesCountEls.aurel) speciesCountEls.aurel.textContent = formatPopulationCompact(aurelCount);
  if (speciesCountEls.zeno) speciesCountEls.zeno.textContent = formatPopulationCompact(zenoCount);
}

function updateStatsView() {
  const elapsedText = formatElapsed(state.elapsedMs);
  const preyEatenText = String(Math.max(0, Math.floor(state.preyEaten)));
  const bitesTakenText = String(Math.max(0, Math.floor(state.bitesTaken)));
  const fishCountText = formatPopulationCompact(state.fishCount);
  const shrimpCountText = formatPopulationCompact(state.shrimpCount);
  const algaeCountText = formatPopulationCompact(state.algaeCount);
  const { aurelCount, zenoCount } = getPredatorSplitCounts();
  const aurelCountText = formatPopulationCompact(aurelCount);
  const zenoCountText = formatPopulationCompact(zenoCount);
  updateSpeciesBarCounts();

  if (statsEls.elapsed) statsEls.elapsed.textContent = elapsedText;
  if (statsEls.preyEaten) statsEls.preyEaten.textContent = preyEatenText;
  if (statsEls.bitesTaken) statsEls.bitesTaken.textContent = bitesTakenText;
  if (statsEls.fishCount) statsEls.fishCount.textContent = fishCountText;
  if (statsEls.shrimpCount) statsEls.shrimpCount.textContent = shrimpCountText;
  if (statsEls.algaeCount) statsEls.algaeCount.textContent = algaeCountText;
  if (statsEls.aurelCount) statsEls.aurelCount.textContent = aurelCountText;
  if (statsEls.zenoCount) statsEls.zenoCount.textContent = zenoCountText;
  if (quickStatsEls.elapsed) quickStatsEls.elapsed.textContent = elapsedText;
  if (quickStatsEls.preyEaten) quickStatsEls.preyEaten.textContent = preyEatenText;
  if (quickStatsEls.bitesTaken) quickStatsEls.bitesTaken.textContent = bitesTakenText;
  if (quickStatsEls.fishCount) quickStatsEls.fishCount.textContent = fishCountText;
  if (quickStatsEls.shrimpCount) quickStatsEls.shrimpCount.textContent = shrimpCountText;
  if (quickStatsEls.algaeCount) quickStatsEls.algaeCount.textContent = algaeCountText;
  if (quickStatsEls.aurelCount) quickStatsEls.aurelCount.textContent = aurelCountText;
  if (quickStatsEls.zenoCount) quickStatsEls.zenoCount.textContent = zenoCountText;

  const applyTrendClass = (element, value, prevValue, epsilon = 0.0001) => {
    if (!element) return;
    element.classList.remove("trend-up", "trend-down");
    if (prevValue == null) return;
    if (value > prevValue + epsilon) {
      element.classList.add("trend-up");
    } else if (value < prevValue - epsilon) {
      element.classList.add("trend-down");
    }
  };

  const updateTrendStat = (elements, value, decimals, key) => {
    const text = value.toFixed(decimals);
    elements.forEach((element) => {
      if (!element) return;
      element.textContent = text;
      applyTrendClass(element, value, state.statsTrendPrev[key]);
    });
    state.statsTrendPrev[key] = value;
  };

  updateTrendStat(
    [statsEls.preyPerMinute, quickStatsEls.preyPerMinute],
    Number(state.preyPerMinute || 0),
    1,
    "preyPerMinute"
  );
  updateTrendStat(
    [statsEls.zenoBitesPerMinute, quickStatsEls.bitesPerMinute],
    Number(state.zenoBitesPerMinute || 0),
    1,
    "zenoBitesPerMinute"
  );
  updateTrendStat(
    [statsEls.averageAurel, quickStatsEls.averageAurel],
    Number(state.averageAurel || 0),
    2,
    "averageAurel"
  );
  updateTrendStat(
    [statsEls.averageZeno, quickStatsEls.averageZeno],
    Number(state.averageZeno || 0),
    2,
    "averageZeno"
  );
}

function updateSpeciesVisibilityUI(species) {
  const chip = speciesChipEls[species];
  if (!chip) return;
  const visible = state.speciesVisibility[species] !== false;
  chip.classList.toggle("is-hidden-species", !visible);
  chip.setAttribute("aria-pressed", String(!visible));
}

function toggleSpeciesVisibility(species) {
  if (!(species in state.speciesVisibility)) return;
  state.speciesVisibility[species] = !state.speciesVisibility[species];
  updateSpeciesVisibilityUI(species);
}

function createSpawnGhost(species, x, y) {
  const ghost = document.createElement("div");
  ghost.className = `spawn-drag-ghost species-${species}`;
  ghost.innerHTML = '<span class="species-icon" aria-hidden="true"></span>';
  ghost.style.left = `${x}px`;
  ghost.style.top = `${y}px`;
  document.body.appendChild(ghost);
  return ghost;
}

function setSpawnGhostPosition(ghost, x, y) {
  if (!ghost) return;
  ghost.style.left = `${x}px`;
  ghost.style.top = `${y}px`;
}

function removeSpawnGhost() {
  const ghost = state.spawnDrag.ghost;
  if (ghost && ghost.parentNode) {
    ghost.parentNode.removeChild(ghost);
  }
  state.spawnDrag.ghost = null;
}

function releaseSpawnPointerCapture(pointerId) {
  const sourceChip = state.spawnDrag.sourceChip;
  if (!(sourceChip instanceof HTMLElement) || pointerId == null) return;
  try {
    sourceChip.releasePointerCapture(pointerId);
  } catch (_) {}
}

function resetSpawnDragState() {
  state.spawnDrag.active = false;
  state.spawnDrag.pointerId = null;
  state.spawnDrag.pointerType = "";
  state.spawnDrag.intent = "idle";
  state.spawnDrag.species = "";
  state.spawnDrag.startX = 0;
  state.spawnDrag.startY = 0;
  state.spawnDrag.startTimeMs = 0;
  state.spawnDrag.didDrag = false;
  state.spawnDrag.sourceChip = null;
}

function resolveSpawnDrop(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  if (clientX < rect.left || clientX > rect.right) return null;
  if (clientY > rect.bottom) return null;

  const targetX = Math.max(rect.left + 8, Math.min(rect.right - 8, clientX));
  const targetY = Math.max(rect.top + 10, Math.min(rect.bottom - 10, Math.max(clientY, rect.top + 10)));

  const rx = rect.width > 0 ? (targetX - rect.left) / rect.width : 0.5;
  const ry = rect.height > 0 ? (targetY - rect.top) / rect.height : 0.5;
  const worldX = Math.max(0, Math.min(state.width, rx * state.width));
  const worldY = Math.max(0, Math.min(state.height, ry * state.height));
  return { targetX, targetY, worldX, worldY };
}

function animateDropAndSpawn(species, fromX, fromY, drop) {
  const ghost = state.spawnDrag.ghost;
  if (!ghost || !drop) return;

  const start = performance.now();
  const duration = 420;
  const endX = drop.targetX;
  const endY = drop.targetY;

  const step = (now) => {
    const t = Math.max(0, Math.min(1, (now - start) / duration));
    const ease = 1 - Math.pow(1 - t, 3);
    const x = fromX + (endX - fromX) * ease;
    const y = fromY + (endY - fromY) * ease;
    setSpawnGhostPosition(ghost, x, y);

    if (t < 1) {
      requestAnimationFrame(step);
      return;
    }

    removeSpawnGhost();
    postToWorker({ type: "spawnCreature", species, x: drop.worldX, y: drop.worldY });
  };

  requestAnimationFrame(step);
}

function beginSpeciesSpawnDrag(event) {
  const chip = event.currentTarget;
  if (!(chip instanceof HTMLElement)) return;
  const species = chip.dataset.species;
  if (!species) return;

  state.spawnDrag.active = true;
  state.spawnDrag.pointerId = event.pointerId;
  state.spawnDrag.pointerType = event.pointerType || "mouse";
  state.spawnDrag.intent = state.spawnDrag.pointerType === "touch" ? "pending" : "drag";
  state.spawnDrag.species = species;
  state.spawnDrag.startX = event.clientX;
  state.spawnDrag.startY = event.clientY;
  state.spawnDrag.startTimeMs = performance.now();
  state.spawnDrag.didDrag = false;
  state.spawnDrag.sourceChip = chip;
  event.stopPropagation();
  if (state.spawnDrag.intent === "drag") {
    try {
      chip.setPointerCapture(event.pointerId);
    } catch (_) {}
  }

  if (state.spawnDrag.intent === "drag" && state.simulationStarted && state.worker) {
    state.spawnDrag.ghost = createSpawnGhost(species, event.clientX, event.clientY);
  }
}

function updateSpeciesSpawnDrag(event) {
  if (!state.spawnDrag.active) return;
  if (event.pointerId !== state.spawnDrag.pointerId) return;
  const dx = event.clientX - state.spawnDrag.startX;
  const dy = event.clientY - state.spawnDrag.startY;
  const distSq = dx * dx + dy * dy;

  if (state.spawnDrag.intent === "pending") {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (absDx < 8 && absDy < 8) return;

    if (absDx > absDy * 1.08) {
      state.spawnDrag.intent = "scroll";
      return;
    }

    if (dy < -6 && absDy >= absDx * 0.85) {
      state.spawnDrag.intent = "drag";
      state.spawnDrag.didDrag = true;
      if (state.simulationStarted && state.worker && !state.spawnDrag.ghost) {
        state.spawnDrag.ghost = createSpawnGhost(state.spawnDrag.species, event.clientX, event.clientY);
      }
    } else {
      return;
    }
  }

  if (state.spawnDrag.intent !== "drag") return;

  if (!state.spawnDrag.didDrag && distSq >= 9) state.spawnDrag.didDrag = true;
  setSpawnGhostPosition(state.spawnDrag.ghost, event.clientX, event.clientY);
}

function endSpeciesSpawnDrag(event) {
  if (!state.spawnDrag.active) return;
  if (event.pointerId !== state.spawnDrag.pointerId) return;

  const intent = state.spawnDrag.intent;
  const species = state.spawnDrag.species;
  const fromX = event.clientX;
  const fromY = event.clientY;
  const didDrag = state.spawnDrag.didDrag;
  const drop = intent === "drag" && didDrag ? resolveSpawnDrop(fromX, fromY) : null;
  const elapsed = performance.now() - state.spawnDrag.startTimeMs;
  const dx = fromX - state.spawnDrag.startX;
  const dy = fromY - state.spawnDrag.startY;
  const distSq = dx * dx + dy * dy;
  const isTap = intent === "pending" && distSq < 49 && elapsed < 320;

  releaseSpawnPointerCapture(event.pointerId);
  resetSpawnDragState();

  if (intent === "scroll") {
    removeSpawnGhost();
    return;
  }

  if (isTap && !didDrag) {
    removeSpawnGhost();
    toggleSpeciesVisibility(species);
    return;
  }

  if (!drop) {
    removeSpawnGhost();
    return;
  }

  animateDropAndSpawn(species, fromX, fromY, drop);
}

function getTargetDpr() {
  const device = window.devicePixelRatio || 1;
  const count = state.frameCount || params.count;
  if (count >= ULTRA_RENDER_THRESHOLD) return Math.max(1, Math.min(1.0, device));
  if (count >= FAST_RENDER_THRESHOLD) return Math.max(1, Math.min(1.25, device));
  return Math.max(1, Math.min(2, device));
}

function postToWorker(message) {
  if (!state.worker) return;
  state.worker.postMessage(message);
}

function getPopulationCapsForScreen(width, height) {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  if (w >= 1000 && h >= 1000) {
    return { fish: 10000, shrimp: 5000, algae: 20000 };
  }
  if (w >= 500 && h >= 500) {
    return { fish: 5000, shrimp: 2500, algae: 10000 };
  }
  return { fish: 1200, shrimp: 600, algae: 3000 };
}

function getScreenBasedInitialPopulation(width, height) {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));

  if (w < 500 || h < 1000) {
    return { fish: 0, shrimp: 0, algae: 0 };
  }
  if (w < 1000 || h < 1000) {
    return { fish: 0, shrimp: 0, algae: 0 };
  }
  return { fish: 0, shrimp: 0, algae: 0 };
}

function applyScreenBasedInitialPopulation() {
  const initial = getScreenBasedInitialPopulation(state.width, state.height);

  setControlValueSilently(controls.count, "count", initial.fish);
  setControlValueSilently(controls.shrimpCount, "shrimpCount", initial.shrimp);
  setControlValueSilently(controls.algaeCount, "algaeCount", initial.algae);

  controls.count.defaultValue = String(initial.fish);
  controls.shrimpCount.defaultValue = String(initial.shrimp);
  controls.algaeCount.defaultValue = String(initial.algae);
}

function syncPopulationControlCaps() {
  const caps = getPopulationCapsForScreen(state.width, state.height);
  const capMap = [
    [controls.count, "count", caps.fish],
    [controls.shrimpCount, "shrimpCount", caps.shrimp],
    [controls.algaeCount, "algaeCount", caps.algae]
  ];

  capMap.forEach(([control, key, cap]) => {
    if (!control) return;
    control.max = String(cap);
    if (Number(control.value) > cap) {
      setControlValueSilently(control, key, cap);
    } else {
      updateSliderReadout(control);
    }
  });
}

function resize() {
  const dpr = getTargetDpr();
  const rect = canvas.getBoundingClientRect();
  state.width = Math.max(320, Math.floor(rect.width));
  state.height = Math.max(260, Math.floor(rect.height));
  syncPopulationControlCaps();
  state.dpr = dpr;
  canvas.width = Math.floor(state.width * dpr);
  canvas.height = Math.floor(state.height * dpr);
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (predatorCanvas && predCtx) {
    predatorCanvas.width = Math.floor(state.width * dpr);
    predatorCanvas.height = Math.floor(state.height * dpr);
    predatorCanvas.style.width = `${state.width}px`;
    predatorCanvas.style.height = `${state.height}px`;
    predCtx.setTransform(1, 0, 0, 1, 0, 0);
    predCtx.globalAlpha = 1;
    predCtx.globalCompositeOperation = "source-over";
    predCtx.clearRect(0, 0, predatorCanvas.width, predatorCanvas.height);
    predCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  postToWorker({ type: "resize", width: state.width, height: state.height });
}

function formatControlValue(control) {
  const value = Number(control.value);
  if ((control.id === "count" || control.id === "shrimpCount" || control.id === "algaeCount") && value >= 1000) {
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

function setControlValueSilently(control, key, value) {
  if (!control) return;
  const min = Number(control.min || 0);
  const max = Number(control.max || 1);
  const clamped = Math.max(min, Math.min(max, Number(value)));
  const step = control.step && control.step !== "any" ? control.step : "1";
  const decimals = step.includes(".") ? step.split(".")[1].length : 0;
  const nextValue = decimals > 0 ? clamped.toFixed(decimals) : String(Math.round(clamped));

  if (control.value !== nextValue) {
    control.value = nextValue;
    updateSliderReadout(control);
  }
  params[key] = Number(control.value);
  if (state.activeQuickTab !== "stats") syncQuickRecentControl(control.id);
}

function bindControl(control, key) {
  control.addEventListener("input", () => {
    const value = Number(control.value);
    params[key] = value;
    updateSliderReadout(control);
    const recentOrderChanged = rememberRecentControl(control.id);
    if (state.activeQuickTab !== "stats") {
      if (recentOrderChanged) {
        renderMobileRecentControls();
      } else {
        syncQuickRecentControl(control.id);
      }
    }

    if (key === "count") {
      postToWorker({ type: "setCount", count: value });
      resize();
      return;
    }
    if (key === "shrimpCount") {
      postToWorker({ type: "setShrimpCount", count: value });
      resize();
      return;
    }
    if (key === "algaeCount") {
      postToWorker({ type: "setAlgaeCount", count: value });
      resize();
      return;
    }

    postToWorker({ type: "setParam", key, value });
  });
}

function bindToggleControl(control, key) {
  if (!control) return;
  control.addEventListener("change", () => {
    const checked = Boolean(control.checked);
    params[key] = checked;
    if (key === "algaeToroidal" && algaeWallControls) {
      algaeWallControls.classList.toggle("is-hidden", checked);
    }
    postToWorker({ type: "setParam", key, value: checked });
  });
}

function syncAlgaeWallControlsVisibility() {
  if (!algaeWallControls || !controls.algaeToroidal) return;
  algaeWallControls.classList.toggle("is-hidden", Boolean(controls.algaeToroidal.checked));
}

function applyControlValue(control, value) {
  if (!control) return;
  const nextValue = String(value);
  if (control.value === nextValue) {
    updateSliderReadout(control);
    return;
  }
  control.value = nextValue;
  control.dispatchEvent(new Event("input", { bubbles: true }));
}

function resetPauseToRunning() {
  state.paused = false;
  controls.pause.textContent = "Pause";
  postToWorker({ type: "setPaused", paused: false });
}

function resetStatsDisplay() {
  state.elapsedMs = 0;
  state.preyEaten = 0;
  state.bitesTaken = 0;
  state.preyPerMinute = 0;
  state.zenoBitesPerMinute = 0;
  state.averageAurel = 0;
  state.averageZeno = 0;
  state.statsTrendPrev.preyPerMinute = null;
  state.statsTrendPrev.zenoBitesPerMinute = null;
  state.statsTrendPrev.averageAurel = null;
  state.statsTrendPrev.averageZeno = null;
  updateStatsView();
}

function restartWithCurrentSettings() {
  resetPauseToRunning();
  state.predatorVisuals.length = 0;
  resetStatsDisplay();
  postToWorker({ type: "shuffle" });
}

function resetScalingOnly() {
  scalingResetControls.forEach((control) => applyControlValue(control, control.defaultValue));
}

function fullRestart() {
  rangeControls.forEach((control) => applyControlValue(control, control.defaultValue));
  if (controls.algaeToroidal) {
    controls.algaeToroidal.checked = controls.algaeToroidal.defaultChecked;
    params.algaeToroidal = Boolean(controls.algaeToroidal.checked);
    postToWorker({ type: "setParam", key: "algaeToroidal", value: params.algaeToroidal });
  }
  setActiveTab("stats");
  setActivePredatorTab("a");
  restartWithCurrentSettings();
}

function setControlGroupCollapsed(header, collapsed) {
  if (!header) return;
  header.classList.toggle("is-collapsed", collapsed);
  header.setAttribute("aria-expanded", String(!collapsed));

  let node = header.nextElementSibling;
  while (node && !node.classList.contains("control-group-title")) {
    node.classList.toggle("group-collapsed-item", collapsed);
    node = node.nextElementSibling;
  }
}

function setupControlCategoryDropdowns() {
  const sections = Array.from(
    document.querySelectorAll("#panelScaper, #preyPanelFish, #preyPanelShrimp, #preyPanelAlgae, #predatorPanelA, #predatorPanelB")
  );

  sections.forEach((section) => {
    const headers = Array.from(section.querySelectorAll(":scope > .control-group-title"));
    headers.forEach((header) => {
      if (header.dataset.dropdownReady === "1") return;
      header.dataset.dropdownReady = "1";
      header.classList.add("group-dropdown");
      header.setAttribute("role", "button");
      header.setAttribute("tabindex", "0");
      header.setAttribute("aria-expanded", "true");

      header.addEventListener("click", () => {
        const isCollapsed = header.classList.contains("is-collapsed");
        setControlGroupCollapsed(header, !isCollapsed);
      });

      header.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        const isCollapsed = header.classList.contains("is-collapsed");
        setControlGroupCollapsed(header, !isCollapsed);
      });
    });
  });
}

function closeRestartDialog() {
  if (!restartDialog) return;
  restartDialog.hidden = true;
}

function openRestartDialog() {
  if (!restartDialog) return;
  restartDialog.hidden = false;
}

function handleRestartAction(action) {
  if (action === "full") {
    fullRestart();
    closeRestartDialog();
    return;
  }
  if (action === "reset-scaling") {
    resetScalingOnly();
    closeRestartDialog();
    return;
  }
  if (action === "keep-settings") {
    restartWithCurrentSettings();
    closeRestartDialog();
    return;
  }
  closeRestartDialog();
}

function updateMousePosition(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  postToWorker({ type: "setMouse", active: state.mouseActive, x, y });
}

function deactivateMouseThreatPointer() {
  if (!state.mouseActive) return;
  state.mouseActive = false;
  postToWorker({ type: "setMouse", active: false, x: 0, y: 0 });
}

function adjustMouseThreatFromWheel(event) {
  if (!state.mouseActive) return;
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
  postToWorker({ type: "setParam", key: "mouseThreat", value: clamped });
}

function beginSheetDrag(event) {
  if (!isMobileControlsLayout()) return;
  if (state.spawnDrag.active) return;
  state.sheetDragStartY = event.clientY;
}

function endSheetDrag(event) {
  if (!isMobileControlsLayout()) return;
  if (state.spawnDrag.active) return;
  if (state.sheetDragStartY == null) return;
  const deltaY = event.clientY - state.sheetDragStartY;
  state.sheetDragStartY = null;

  if (deltaY < -24) {
    if (state.controlsMode === "hidden") {
      setControlsMenuMode("quick");
    } else if (state.controlsMode === "quick") {
      setControlsMenuMode("expanded");
    }
  } else if (deltaY > 24) {
    if (state.controlsMode === "expanded") {
      setControlsMenuMode("quick");
    } else if (state.controlsMode === "quick") {
      setControlsMenuMode("hidden");
    }
  }
}

function drawFastFish(i) {
  const x = state.fishX[i];
  const y = state.fishY[i];
  const vx = state.fishVX ? state.fishVX[i] : 0;
  const vy = state.fishVY ? state.fishVY[i] : 0;
  const speed = Math.hypot(vx, vy);
  const dirX = speed > 0.0001 ? vx / speed : 1;
  const dirY = speed > 0.0001 ? vy / speed : 0;
  const tailX = x - dirX * 1.45;
  const tailY = y - dirY * 1.45;
  ctx.fillRect(x, y, 1.35, 1.35);
  ctx.fillRect(tailX, tailY, 1.1, 1.1);
}

function drawFastShrimp(i) {
  ctx.fillRect(state.shrimpX[i], state.shrimpY[i], 1.1, 1.1);
}

function drawFastAlgae(i) {
  ctx.fillRect(state.algaeX[i], state.algaeY[i], 0.8, 0.8);
}

function drawFish(i) {
  const x = state.fishX[i];
  const y = state.fishY[i];
  const vx = state.fishVX ? state.fishVX[i] : 0;
  const vy = state.fishVY ? state.fishVY[i] : 0;
  const size = state.fishSizes ? state.fishSizes[i] : 1;

  const speed = Math.hypot(vx, vy);
  const speedMix = Math.min(1, speed / (params.maxSpeed || 1));
  const hue = 198 + speedMix * 32;
  const light = 60 + speedMix * 14;

  const dirX = speed > 0 ? vx / speed : 1;
  const dirY = speed > 0 ? vy / speed : 0;
  const perpX = -dirY;
  const perpY = dirX;

  const tipX = x + dirX * (size * 1.7);
  const tipY = y + dirY * (size * 1.7);
  const leftX = x - dirX * size + perpX * (size * 0.68);
  const leftY = y - dirY * size + perpY * (size * 0.68);
  const midX = x - dirX * (size * 0.4);
  const midY = y - dirY * (size * 0.4);
  const rightX = x - dirX * size - perpX * (size * 0.68);
  const rightY = y - dirY * size - perpY * (size * 0.68);

  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(leftX, leftY);
  ctx.lineTo(midX, midY);
  ctx.lineTo(rightX, rightY);
  ctx.closePath();
  ctx.fillStyle = `hsl(${hue}, 90%, ${light}%)`;
  ctx.fill();
}

function drawShrimp(i) {
  const x = state.shrimpX[i];
  const y = state.shrimpY[i];
  const vx = state.shrimpVX ? state.shrimpVX[i] : 0;
  const vy = state.shrimpVY ? state.shrimpVY[i] : 0;
  const size = state.shrimpSizes ? state.shrimpSizes[i] : 0.8;

  const speed = Math.hypot(vx, vy);
  const dirX = speed > 0 ? vx / speed : 1;
  const dirY = speed > 0 ? vy / speed : 0;
  const perpX = -dirY;
  const perpY = dirX;

  const bodyLen = size * 1.25;
  const bodyWid = size * 0.52;
  const tailLen = size * 0.9;

  ctx.beginPath();
  ctx.moveTo(x + dirX * bodyLen, y + dirY * bodyLen);
  ctx.lineTo(x - dirX * bodyLen + perpX * bodyWid, y - dirY * bodyLen + perpY * bodyWid);
  ctx.lineTo(x - dirX * bodyLen - perpX * bodyWid, y - dirY * bodyLen - perpY * bodyWid);
  ctx.closePath();
  ctx.fillStyle = "hsl(44, 92%, 69%)";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x - dirX * (bodyLen * 0.65), y - dirY * (bodyLen * 0.65));
  ctx.lineTo(x - dirX * (bodyLen + tailLen), y - dirY * (bodyLen + tailLen));
  ctx.lineTo(x - dirX * (bodyLen * 0.92) + perpX * (bodyWid * 0.45), y - dirY * (bodyLen * 0.92) + perpY * (bodyWid * 0.45));
  ctx.closePath();
  ctx.fillStyle = "hsla(48, 90%, 76%, 0.72)";
  ctx.fill();
}

function drawAlgae(i) {
  const x = state.algaeX[i];
  const y = state.algaeY[i];
  const vx = state.algaeVX ? state.algaeVX[i] : 0;
  const vy = state.algaeVY ? state.algaeVY[i] : 0;
  const speed = Math.hypot(vx, vy);
  const speedMix = Math.min(1, speed / Math.max(0.01, params.algaeSpeed || 0.35));
  const light = 50 + speedMix * 18;
  const alpha = 0.72 + speedMix * 0.18;

  ctx.fillStyle = `hsla(96, 62%, ${light}%, ${alpha})`;
  ctx.fillRect(x, y, 0.9, 0.9);
}

function drawPredatorVector(i) {
  const pctx = predCtx || ctx;
  if (!pctx) return;
  if (!state.predatorX || !state.predatorY || !state.predatorVX || !state.predatorVY) return;
  const x = state.predatorX[i];
  const y = state.predatorY[i];
  const vx = state.predatorVX[i];
  const vy = state.predatorVY[i];
  const speed = Math.hypot(vx, vy);
  const predatorKind = state.predatorKinds ? state.predatorKinds[i] : 1;
  const isRival = predatorKind === 2;
  const predatorSize = state.predatorSizes ? state.predatorSizes[i] : params.predatorSize;
  const scale = predatorSize * (isRival ? 1.04 : 1.16);
  const heading = Math.atan2(vy, vx || 0.0001);
  const visual = state.predatorVisuals[i] || { lastHeading: heading, turnBend: 0 };
  state.predatorVisuals[i] = visual;

  const headingDelta = normalizeAngle(heading - visual.lastHeading);
  visual.lastHeading = heading;
  const turnRate = speed > 0.03 ? headingDelta : 0;
  const targetTurnBend = Math.max(-3.2, Math.min(3.2, turnRate * 58));
  visual.turnBend += (targetTurnBend - visual.turnBend) * 0.42;
  visual.turnBend *= 0.92;
  const turnBend = visual.turnBend;
  const renderHeading = heading;

  const speedNorm = Math.min(1, speed / Math.max(0.01, params.maxSpeed * 1.6));
  const time = performance.now() * 0.006 + i * 1.9;
  const swimYaw = Math.sin(time * (1.15 + speedNorm * 1.05)) * (0.004 + speedNorm * 0.012);
  const bodyYaw = swimYaw + turnBend * 0.12;
  const tailSway = Math.sin(time * (2.1 + speedNorm * 2.3)) * (0.1 + speedNorm * 0.24) * scale + turnBend * 0.36 * scale;
  const noseOffset = 3.2 * scale;
  const palette = isRival
    ? {
        shadow: "rgba(22, 8, 8, 0.16)",
        body0: "hsl(8, 42%, 22%)",
        body1: "hsl(18, 38%, 34%)",
        body2: "hsl(28, 32%, 62%)",
        ridge: "rgba(246, 205, 170, 0.2)",
        fin: "rgba(214, 171, 138, 0.36)",
        pectoral: "rgba(222, 184, 152, 0.42)",
        peduncle: "hsl(10, 34%, 24%)",
        tail0: "hsl(15, 38%, 32%)",
        tail1: "hsl(25, 34%, 44%)"
      }
    : {
        shadow: "rgba(0, 14, 28, 0.08)",
        body0: "hsl(193, 32%, 26%)",
        body1: "hsl(198, 28%, 38%)",
        body2: "hsl(206, 20%, 62%)",
        ridge: "rgba(201, 224, 235, 0.24)",
        fin: "rgba(156, 187, 204, 0.34)",
        pectoral: "rgba(164, 193, 210, 0.38)",
        peduncle: "hsl(194, 33%, 27%)",
        tail0: "hsl(186, 34%, 34%)",
        tail1: "hsl(196, 32%, 44%)"
      };
  const bendOffset = (xPos, weight = 1) => {
    const t = Math.max(0, Math.min(1, (noseOffset - xPos) / (noseOffset + 4.3 * scale)));
    return turnBend * weight * scale * t * t * (4.4 + speedNorm * 0.6);
  };

  pctx.save();
  pctx.translate(x, y);
  pctx.rotate(renderHeading + bodyYaw);
  pctx.translate(-noseOffset, 0);
  pctx.lineJoin = "round";

  // Soft depth shadow under body.
  pctx.beginPath();
  pctx.ellipse(-0.35 * scale, 0.1 * scale + bendOffset(-0.35 * scale, 0.5), 2.95 * scale, 0.64 * scale, 0, 0, Math.PI * 2);
  pctx.fillStyle = palette.shadow;
  pctx.fill();

  // Top-down body silhouette (slender, surgeonfish-like profile).
  const bodyGradient = pctx.createLinearGradient(-2.9 * scale, 0, 3.25 * scale, 0);
  bodyGradient.addColorStop(0, palette.body0);
  bodyGradient.addColorStop(0.52, palette.body1);
  bodyGradient.addColorStop(1, palette.body2);
  pctx.beginPath();
  pctx.moveTo(3.2 * scale, bendOffset(3.2 * scale, 0.08));
  pctx.bezierCurveTo(
    2.35 * scale, 0.34 * scale + bendOffset(2.35 * scale, 0.22),
    1.0 * scale, 0.58 * scale + bendOffset(1.0 * scale, 0.45),
    -0.62 * scale, 0.5 * scale + bendOffset(-0.62 * scale, 0.85)
  );
  pctx.bezierCurveTo(
    -1.45 * scale, 0.42 * scale + bendOffset(-1.45 * scale),
    -1.96 * scale, 0.22 * scale + bendOffset(-1.96 * scale),
    -2.28 * scale, 0.08 * scale + bendOffset(-2.28 * scale)
  );
  pctx.lineTo(-2.28 * scale, -0.08 * scale + bendOffset(-2.28 * scale));
  pctx.bezierCurveTo(
    -1.96 * scale, -0.22 * scale + bendOffset(-1.96 * scale),
    -1.45 * scale, -0.42 * scale + bendOffset(-1.45 * scale),
    -0.62 * scale, -0.5 * scale + bendOffset(-0.62 * scale, 0.85)
  );
  pctx.bezierCurveTo(
    1.0 * scale, -0.58 * scale + bendOffset(1.0 * scale, 0.45),
    2.35 * scale, -0.34 * scale + bendOffset(2.35 * scale, 0.22),
    3.2 * scale, bendOffset(3.2 * scale, 0.08)
  );
  pctx.closePath();
  pctx.fillStyle = bodyGradient;
  pctx.fill();

  // Subtle dorsal ridge highlight.
  pctx.beginPath();
  pctx.moveTo(2.0 * scale, 0.02 * scale + bendOffset(2.0 * scale, 0.18));
  pctx.quadraticCurveTo(0.25 * scale, -0.1 * scale + bendOffset(0.25 * scale, 0.45), -1.72 * scale, -0.01 * scale + bendOffset(-1.72 * scale, 0.85));
  pctx.quadraticCurveTo(0.2 * scale, 0.08 * scale + bendOffset(0.2 * scale, 0.4), 1.95 * scale, 0.06 * scale + bendOffset(1.95 * scale, 0.16));
  pctx.closePath();
  pctx.fillStyle = palette.ridge;
  pctx.fill();

  // Dorsal and anal fins (thin + translucent from top view).
  pctx.beginPath();
  pctx.moveTo(0.25 * scale, -0.38 * scale + bendOffset(0.25 * scale, 0.3));
  pctx.lineTo(-0.95 * scale, -1.0 * scale + bendOffset(-0.95 * scale, 0.9));
  pctx.lineTo(0.55 * scale, -0.56 * scale + bendOffset(0.55 * scale, 0.35));
  pctx.closePath();
  pctx.fillStyle = palette.fin;
  pctx.fill();

  pctx.beginPath();
  pctx.moveTo(0.25 * scale, 0.38 * scale + bendOffset(0.25 * scale, 0.3));
  pctx.lineTo(-0.95 * scale, 1.0 * scale + bendOffset(-0.95 * scale, 0.9));
  pctx.lineTo(0.55 * scale, 0.56 * scale + bendOffset(0.55 * scale, 0.35));
  pctx.closePath();
  pctx.fillStyle = palette.fin;
  pctx.fill();

  // Left pectoral fin.
  pctx.beginPath();
  pctx.moveTo(1.12 * scale, 0.2 * scale + bendOffset(1.12 * scale, 0.2));
  pctx.lineTo(0.54 * scale, 0.54 * scale + bendOffset(0.54 * scale, 0.3));
  pctx.lineTo(1.42 * scale, 0.44 * scale + bendOffset(1.42 * scale, 0.16));
  pctx.closePath();
  pctx.fillStyle = palette.pectoral;
  pctx.fill();

  // Right pectoral fin.
  pctx.beginPath();
  pctx.moveTo(1.12 * scale, -0.2 * scale + bendOffset(1.12 * scale, 0.2));
  pctx.lineTo(0.54 * scale, -0.54 * scale + bendOffset(0.54 * scale, 0.3));
  pctx.lineTo(1.42 * scale, -0.44 * scale + bendOffset(1.42 * scale, 0.16));
  pctx.closePath();
  pctx.fillStyle = palette.pectoral;
  pctx.fill();

  // Articulated tail section: clearly bends at the tail joint when turning.
  const tailNeckX = -2.28 * scale;
  const tailJointY = bendOffset(tailNeckX, 1.12);
  const tailJointAngle = Math.max(
    -0.78,
    Math.min(0.78, turnBend * 0.24 + (tailSway / Math.max(0.01, scale)) * 0.08)
  );

  pctx.save();
  pctx.translate(tailNeckX, tailJointY);
  pctx.rotate(tailJointAngle);

  const peduncleLen = 0.78 * scale;
  const tailBaseX = -peduncleLen;
  const tailWobble = tailSway * 0.18;

  // Tail peduncle.
  pctx.beginPath();
  pctx.moveTo(0, 0.16 * scale);
  pctx.lineTo(tailBaseX, 0.14 * scale + tailWobble);
  pctx.lineTo(tailBaseX, -0.14 * scale + tailWobble);
  pctx.lineTo(0, -0.16 * scale);
  pctx.closePath();
  pctx.fillStyle = palette.peduncle;
  pctx.fill();

  // Top view of a vertically oriented caudal fin.
  const tailTipX = -2.0 * scale;
  const tailCenterY = tailSway * 0.22;

  const tailGradient = pctx.createLinearGradient(tailTipX, 0, tailBaseX, 0);
  tailGradient.addColorStop(0, palette.tail0);
  tailGradient.addColorStop(1, palette.tail1);
  pctx.beginPath();
  pctx.moveTo(tailBaseX, 0.12 * scale + tailWobble);
  pctx.lineTo(tailTipX, tailCenterY + 0.46 * scale);
  pctx.lineTo(tailBaseX + 0.2 * scale, 0.02 * scale + tailWobble * 0.72);
  pctx.closePath();
  pctx.fillStyle = tailGradient;
  pctx.fill();

  pctx.restore();

  pctx.restore();
}

function drawPredatorSprite(i) {
  const pctx = predCtx || ctx;
  if (!pctx || !state.predatorX || !state.predatorY || !state.predatorVX || !state.predatorVY || !state.predatorSizes) return false;

  const x = state.predatorX[i];
  const y = state.predatorY[i];
  const vx = state.predatorVX[i];
  const vy = state.predatorVY[i];
  const speed = Math.hypot(vx, vy);
  const predatorKind = state.predatorKinds ? state.predatorKinds[i] : 1;
  const isRival = predatorKind === 2;
  const predatorSize = state.predatorSizes[i];
  const scale = predatorSize * (isRival ? 0.9 : 1.1);
  const heading = Math.atan2(vy, vx || 0.0001);
  const visual = state.predatorVisuals[i] || {
    lastHeading: heading,
    turnBend: 0,
    turnAvg: 0,
    turnAbsAvg: 0,
    spriteVariant: "base"
  };
  state.predatorVisuals[i] = visual;

  const headingDelta = normalizeAngle(heading - visual.lastHeading);
  visual.lastHeading = heading;
  const turnRate = speed > 0.03 ? headingDelta : 0;
  visual.turnAvg = visual.turnAvg * 0.82 + turnRate * 0.18;
  visual.turnAbsAvg = visual.turnAbsAvg * 0.85 + Math.abs(turnRate) * 0.15;
  const turnSignal = visual.turnAvg * (0.72 + Math.min(1, visual.turnAbsAvg * 18) * 0.28);

  const targetTurnBend = Math.max(-4.2, Math.min(4.2, turnSignal * 92));
  visual.turnBend += (targetTurnBend - visual.turnBend) * 0.46;
  visual.turnBend *= 0.95;
  const turnBend = visual.turnBend;

  const speedNorm = Math.min(1, speed / Math.max(0.01, params.maxSpeed * 1.6));
  const time = performance.now() * 0.006 + i * 1.9;
  const swimYaw = Math.sin(time * (1.15 + speedNorm * 1.05)) * (0.004 + speedNorm * 0.012);
  const bodyYaw = swimYaw + turnBend * 0.11;
  const tailSway = Math.sin(time * (2.1 + speedNorm * 2.3)) * (0.1 + speedNorm * 0.24) * scale + turnBend * 0.36 * scale;
  const sprite = getPredatorSprite(predatorKind, visual, turnSignal);
  if (!sprite) return false;
  const src = sprite.crop;
  const bodyLength = sprite.meta.bodyLengthMul * scale;
  const bodyWidth = Math.max(1.05 * scale, bodyLength * (src.w / src.h) * sprite.meta.widthMul);
  const segments = 28;
  const segLen = bodyLength / segments;
  const spriteBendFactor = sprite.variant === "base" ? 1 : sprite.variant.startsWith("slight") ? 0.58 : 0.32;
  const bendScale = (sprite.meta.bendMul || 1) * (0.2 + speedNorm * 0.16) * spriteBendFactor;
  const shadowAlpha = isRival ? 0.14 : 0.1;

  pctx.save();
  pctx.translate(x, y);
  pctx.rotate(heading + Math.PI / 2 + bodyYaw);
  pctx.imageSmoothingEnabled = true;
  pctx.globalAlpha = isRival ? 0.86 : 0.83;

  pctx.beginPath();
  pctx.ellipse(0, bodyLength * 0.56, bodyWidth * 0.48, bodyLength * 0.36, 0, 0, Math.PI * 2);
  pctx.fillStyle = isRival ? `rgba(40, 14, 8, ${shadowAlpha})` : `rgba(0, 14, 28, ${shadowAlpha})`;
  pctx.fill();

  for (let s = 0; s < segments; s += 1) {
    const t = s / (segments - 1);
    const tailT = Math.pow(t, 1.7);
    const curve = turnBend * bendScale * tailT * scale * 2.8 + tailSway * 0.22 * tailT;
    const localRot = turnBend * bendScale * tailT * 0.86 + (tailSway / Math.max(0.01, scale)) * 0.03 * tailT;
    const sy = src.y + src.h * t;
    const sh = Math.max(1, src.h / segments + 1);
    const segWidth = bodyWidth * (1 - 0.08 * tailT);

    pctx.save();
    pctx.translate(curve, t * bodyLength);
    pctx.rotate(localRot);
    pctx.drawImage(
      sprite.image,
      src.x,
      sy,
      src.w,
      sh,
      -segWidth * 0.5,
      -segLen * 0.56,
      segWidth,
      segLen * 1.14
    );
    pctx.restore();
  }

  pctx.globalCompositeOperation = "source-atop";
  pctx.fillStyle = "rgba(6, 20, 36, 0.2)";
  pctx.fillRect(-bodyWidth * 0.55, -segLen, bodyWidth * 1.1, bodyLength + segLen * 1.6);
  pctx.globalCompositeOperation = "source-over";
  pctx.restore();
  return true;
}

function drawPredator(i) {
  if (!drawPredatorSprite(i)) {
    drawPredatorVector(i);
  }
}

function tick() {
  const fade = 0.05 + (1 - params.trail) * 0.35;
  ctx.fillStyle = `rgba(4, 14, 27, ${fade})`;
  ctx.fillRect(0, 0, state.width, state.height);

  const totalCount = state.frameCount;
  const fastRender = totalCount >= FAST_RENDER_THRESHOLD;
  const showFish = state.speciesVisibility.fish !== false;
  const showShrimp = state.speciesVisibility.shrimp !== false;
  const showAlgae = state.speciesVisibility.algae !== false;
  const showAurel = state.speciesVisibility.aurel !== false;
  const showZeno = state.speciesVisibility.zeno !== false;

  if (showFish && state.fishX && state.fishY && state.fishCount > 0) {
    if (fastRender) ctx.fillStyle = "#66bbff";
    for (let i = 0; i < state.fishCount; i += 1) {
      if (fastRender) drawFastFish(i);
      else drawFish(i);
    }
  }

  if (showShrimp && state.shrimpX && state.shrimpY && state.shrimpCount > 0) {
    if (fastRender) ctx.fillStyle = "#ffd95c";
    for (let i = 0; i < state.shrimpCount; i += 1) {
      if (fastRender) drawFastShrimp(i);
      else drawShrimp(i);
    }
  }

  if (showAlgae && state.algaeX && state.algaeY && state.algaeCount > 0) {
    if (fastRender) ctx.fillStyle = "#8fbc57";
    for (let i = 0; i < state.algaeCount; i += 1) {
      if (fastRender) drawFastAlgae(i);
      else drawAlgae(i);
    }
  }

  if (predCtx && predatorCanvas) {
    // Clear predator layer in raw pixel space so no transformed clear can leave artifacts.
    predCtx.setTransform(1, 0, 0, 1, 0, 0);
    predCtx.globalAlpha = 1;
    predCtx.globalCompositeOperation = "source-over";
    predCtx.clearRect(0, 0, predatorCanvas.width, predatorCanvas.height);
    predCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }

  if (state.predatorCount > 0) {
    for (let i = 0; i < state.predatorCount; i += 1) {
      const kind = state.predatorKinds ? state.predatorKinds[i] : 1;
      if (kind === 2 && !showZeno) continue;
      if (kind !== 2 && !showAurel) continue;
      drawPredator(i);
    }
  }

  hud.textContent = `${state.paused ? "Paused" : "Running"} | ${state.width}x${state.height}`;
  requestAnimationFrame(tick);
}

function initWorker() {
  if (!state.workerAvailable) {
    hud.textContent = "Worker unsupported";
    return;
  }

  try {
    state.worker = new Worker("sim-worker.js");
  } catch (error) {
    state.worker = null;
    hud.textContent = "Worker failed to start";
    return;
  }

  state.worker.addEventListener("message", (event) => {
    const message = event.data;
    if (!message || !message.type) return;

    if (message.type === "frame") {
      state.fishX = message.x;
      state.fishY = message.y;
      state.fishVX = message.vx;
      state.fishVY = message.vy;
      state.fishCount = message.fishCount || (message.x ? message.x.length : 0);
      state.shrimpX = message.sx || null;
      state.shrimpY = message.sy || null;
      state.shrimpVX = message.svx || null;
      state.shrimpVY = message.svy || null;
      state.shrimpCount = message.shrimpCount || (message.sx ? message.sx.length : 0);
      state.algaeX = message.ax || null;
      state.algaeY = message.ay || null;
      state.algaeVX = message.avx || null;
      state.algaeVY = message.avy || null;
      state.algaeCount = message.algaeCount || (message.ax ? message.ax.length : 0);
      state.frameCount = message.count || (state.fishCount + state.shrimpCount + state.algaeCount);
      state.predatorX = message.px || null;
      state.predatorY = message.py || null;
      state.predatorVX = message.pvx || null;
      state.predatorVY = message.pvy || null;
      state.predatorSizes = message.ps || null;
      state.predatorKinds = message.pk || null;
      state.predatorCount = message.predatorCount || 0;
      state.elapsedMs = Number(message.elapsedMs || 0);
      state.preyEaten = Number(message.preyEaten || 0);
      state.bitesTaken = Number(message.zenoBites || 0);
      state.preyPerMinute = Number(message.preyPerMinute || 0);
      state.zenoBitesPerMinute = Number(message.zenoBitesPerMinute || 0);
      state.averageAurel = Number(message.averageAurel || 0);
      state.averageZeno = Number(message.averageZeno || 0);
      if (typeof message.predatorThreat === "number") {
        setControlValueSilently(controls.predatorThreat, "predatorThreat", message.predatorThreat);
      }
      if (typeof message.predator2Threat === "number") {
        setControlValueSilently(controls.predator2Threat, "predator2Threat", message.predator2Threat);
      }
      if (typeof message.predatorSprintDrain === "number") {
        setControlValueSilently(controls.predatorSprintDrain, "predatorSprintDrain", message.predatorSprintDrain);
      }
      if (typeof message.predatorMaxSpeed === "number") {
        setControlValueSilently(controls.predatorMaxSpeed, "predatorMaxSpeed", message.predatorMaxSpeed);
      }
      if (typeof message.predator2Speed === "number") {
        setControlValueSilently(controls.predator2Speed, "predator2Speed", message.predator2Speed);
      }
      if (typeof message.predator2Aggressiveness === "number") {
        setControlValueSilently(controls.predator2Aggressiveness, "predator2Aggressiveness", message.predator2Aggressiveness);
      }
      if (typeof message.predator2Damage === "number") {
        setControlValueSilently(controls.predator2Damage, "predator2Damage", message.predator2Damage);
      }
      if (typeof message.predator2SprintDrain === "number") {
        setControlValueSilently(controls.predator2SprintDrain, "predator2SprintDrain", message.predator2SprintDrain);
      }
      if (state.predatorVisuals.length > state.predatorCount) {
        state.predatorVisuals.length = state.predatorCount;
      }
      state.paused = message.paused;
      updateStatsView();
      return;
    }

    if (message.type === "sizes") {
      state.fishSizes = message.sizes;
      state.shrimpSizes = message.shrimpSizes || null;
      state.algaeSizes = message.algaeSizes || null;
    }
  });

  state.worker.addEventListener("error", () => {
    hud.textContent = "Worker error";
  });

  postToWorker({
    type: "init",
    width: state.width,
    height: state.height,
    params,
    count: params.count
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (state.serviceWorkerRegistered) return;
  state.serviceWorkerRegistered = true;
  const register = () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  };
  if (document.readyState === "complete") {
    register();
    return;
  }
  window.addEventListener("load", register, { once: true });
}

function hideStartMenu() {
  if (!startMenu) return;
  startMenu.hidden = true;
  startMenu.style.display = "none";
  startMenu.setAttribute("aria-hidden", "true");
}

function showStartMenu() {
  if (!startMenu) return;
  startMenu.hidden = false;
  startMenu.style.display = "grid";
  startMenu.setAttribute("aria-hidden", "false");
}

function enterGameMode() {
  state.currentMode = "game";
  document.body.classList.add("mode-game");
  if (gameModeScreen) gameModeScreen.hidden = false;
  hideStartMenu();
  if (startMenuHint) startMenuHint.hidden = true;
  if (state.simulationStarted && state.worker) {
    state.paused = true;
    controls.pause.textContent = "Resume";
    postToWorker({ type: "setPaused", paused: true });
  }
}

function enterSimulationMode() {
  state.currentMode = "simulation";
  document.body.classList.remove("mode-game");
  if (gameModeScreen) gameModeScreen.hidden = true;
  hideStartMenu();
  if (startMenuHint) startMenuHint.hidden = true;

  if (state.simulationStarted) {
    if (state.worker) {
      state.paused = false;
      controls.pause.textContent = "Pause";
      postToWorker({ type: "setPaused", paused: false });
    }
    return;
  }

  state.simulationStarted = true;
  resize();
  applyScreenBasedInitialPopulation();
  initWorker();
  ctx.fillStyle = "rgb(4, 14, 27)";
  ctx.fillRect(0, 0, state.width, state.height);
  requestAnimationFrame(tick);
}

bindControl(controls.count, "count");
bindControl(controls.perception, "perception");
bindControl(controls.separation, "separation");
bindControl(controls.clusterAvoidance, "clusterAvoidance");
bindControl(controls.alignment, "alignment");
bindControl(controls.cohesion, "cohesion");
bindControl(controls.maxSpeed, "maxSpeed");
bindControl(controls.maxForce, "maxForce");
bindControl(controls.wallReach, "wallReach");
bindControl(controls.wallFade, "wallFade");
bindControl(controls.wallStrength, "wallStrength");
bindControl(controls.fishAlgaeInterestCooldown, "fishAlgaeInterestCooldown");
bindControl(controls.fishAlgaeMealsToReproduce, "fishAlgaeMealsToReproduce");
bindControl(controls.fishPopulationPenalty, "fishPopulationPenalty");
bindControl(controls.shrimpCount, "shrimpCount");
bindControl(controls.shrimpPerception, "shrimpPerception");
bindControl(controls.shrimpSeparation, "shrimpSeparation");
bindControl(controls.shrimpClusterAvoidance, "shrimpClusterAvoidance");
bindControl(controls.shrimpAlignment, "shrimpAlignment");
bindControl(controls.shrimpCohesion, "shrimpCohesion");
bindControl(controls.shrimpJumpSpeed, "shrimpJumpSpeed");
bindControl(controls.shrimpMaxForce, "shrimpMaxForce");
bindControl(controls.shrimpWallReach, "shrimpWallReach");
bindControl(controls.shrimpWallFade, "shrimpWallFade");
bindControl(controls.shrimpWallStrength, "shrimpWallStrength");
bindControl(controls.shrimpFishAvoidance, "shrimpFishAvoidance");
bindControl(controls.shrimpAlgaeInterestCooldown, "shrimpAlgaeInterestCooldown");
bindControl(controls.shrimpAlgaeMealsToReproduce, "shrimpAlgaeMealsToReproduce");
bindControl(controls.shrimpPopulationPenalty, "shrimpPopulationPenalty");
bindControl(controls.algaeCount, "algaeCount");
bindControl(controls.algaePerception, "algaePerception");
bindControl(controls.algaeCurrentSensitivity, "algaeCurrentSensitivity");
bindControl(controls.algaeSeparation, "algaeSeparation");
bindControl(controls.algaeSpeed, "algaeSpeed");
bindControl(controls.algaeWallReach, "algaeWallReach");
bindControl(controls.algaeWallFade, "algaeWallFade");
bindControl(controls.algaeWallStrength, "algaeWallStrength");
bindControl(controls.algaeGrowthRate, "algaeGrowthRate");
bindControl(controls.algaePopulationPenalty, "algaePopulationPenalty");
bindToggleControl(controls.algaeToroidal, "algaeToroidal");
bindControl(controls.predatorSize, "predatorSize");
bindControl(controls.predatorGrowthSpan, "predatorGrowthSpan");
bindControl(controls.predatorThreat, "predatorThreat");
bindControl(controls.predatorSeparation, "predatorSeparation");
bindControl(controls.predatorSteeringForce, "predatorSteeringForce");
bindControl(controls.predatorMaxSpeed, "predatorMaxSpeed");
bindControl(controls.predatorMaxSprint, "predatorMaxSprint");
bindControl(controls.predatorSprintDrain, "predatorSprintDrain");
bindControl(controls.predatorAggressiveness, "predatorAggressiveness");
bindControl(controls.predator2SizeFraction, "predator2SizeFraction");
bindControl(controls.predator2Damage, "predator2Damage");
bindControl(controls.predator2Threat, "predator2Threat");
bindControl(controls.predator2Separation, "predator2Separation");
bindControl(controls.predator2SteeringForce, "predator2SteeringForce");
bindControl(controls.predator2Speed, "predator2Speed");
bindControl(controls.predator2MaxSprint, "predator2MaxSprint");
bindControl(controls.predator2SprintDrain, "predator2SprintDrain");
bindControl(controls.predator2Aggressiveness, "predator2Aggressiveness");
bindControl(controls.mouseThreat, "mouseThreat");
bindControl(controls.wallViewportOffset, "wallViewportOffset");
bindControl(controls.trail, "trail");
rangeControls.forEach(updateSliderReadout);

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveTab(button.dataset.tab || "scaper");
  });
});
preyTabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActivePreyTab(button.dataset.preyTab || "fish");
  });
});
predatorTabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActivePredatorTab(button.dataset.predatorTab || "a");
  });
});
quickTabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const tabName = button.dataset.quickTab || "stats";
    setActiveTab(quickToMainTab[tabName] || "stats");
  });
});
setActiveTab("stats");
setActivePreyTab("fish");
setActivePredatorTab("a");
setupControlCategoryDropdowns();
syncAlgaeWallControlsVisibility();
updateQuickTabLabels();
renderMobileRecentControls();
syncControlsMenuForViewport();
updateStatsView();
preloadPredatorSprites();
Object.keys(state.speciesVisibility).forEach(updateSpeciesVisibilityUI);
speciesSpawnButtons.forEach((button) => {
  button.addEventListener("pointerdown", beginSpeciesSpawnDrag);
});
window.addEventListener("pointermove", updateSpeciesSpawnDrag);
window.addEventListener("pointerup", endSpeciesSpawnDrag);
window.addEventListener("pointercancel", () => {
  if (!state.spawnDrag.active) return;
  releaseSpawnPointerCapture(state.spawnDrag.pointerId);
  resetSpawnDragState();
  removeSpawnGhost();
});

if (controlsHandle) {
  controlsHandle.addEventListener("click", () => {
    if (state.controlsMode === "hidden") {
      setControlsMenuMode("quick");
    } else if (state.controlsMode === "quick") {
      setControlsMenuMode("expanded");
    } else {
      setControlsMenuMode("quick");
    }
  });
  controlsHandle.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (state.controlsMode === "hidden") {
      setControlsMenuMode("quick");
    } else if (state.controlsMode === "quick") {
      setControlsMenuMode("expanded");
    } else {
      setControlsMenuMode("quick");
    }
  });
  controlsHandle.addEventListener("pointerdown", beginSheetDrag);
  controlsHandle.addEventListener("pointerup", endSheetDrag);
  controlsHandle.addEventListener("pointercancel", () => {
    state.sheetDragStartY = null;
  });
}

if (mobileQuickPanel) {
  mobileQuickPanel.addEventListener("pointerdown", beginSheetDrag);
  mobileQuickPanel.addEventListener("pointerup", endSheetDrag);
  mobileQuickPanel.addEventListener("pointercancel", () => {
    state.sheetDragStartY = null;
  });
}

controls.restart.addEventListener("click", openRestartDialog);
restartActionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    handleRestartAction(button.dataset.restartAction || "cancel");
  });
});
if (restartDialog) {
  restartDialog.addEventListener("click", (event) => {
    if (event.target === restartDialog) closeRestartDialog();
  });
}

controls.pause.addEventListener("click", () => {
  state.paused = !state.paused;
  controls.pause.textContent = state.paused ? "Resume" : "Pause";
  postToWorker({ type: "setPaused", paused: state.paused });
});

canvas.addEventListener("pointerenter", (event) => {
  if (event.pointerType === "touch") return;
  state.mouseActive = true;
  updateMousePosition(event);
});

canvas.addEventListener("pointerdown", (event) => {
  state.mouseActive = true;
  updateMousePosition(event);
  if (event.pointerType === "touch") {
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (_) {}
    event.preventDefault();
  }
});

canvas.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch" && !state.mouseActive) return;
  state.mouseActive = true;
  updateMousePosition(event);
});

canvas.addEventListener("pointerup", (event) => {
  if (event.pointerType === "touch") {
    deactivateMouseThreatPointer();
  }
});

canvas.addEventListener("pointercancel", () => {
  deactivateMouseThreatPointer();
});

canvas.addEventListener("pointerleave", (event) => {
  if (event.pointerType !== "touch") {
    deactivateMouseThreatPointer();
  }
});

canvas.addEventListener("wheel", adjustMouseThreatFromWheel, { passive: false });
window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (restartDialog && !restartDialog.hidden) {
    closeRestartDialog();
    return;
  }
  if (state.controlsMode === "expanded") {
    setControlsMenuMode("quick");
  } else if (state.controlsMode === "quick") {
    setControlsMenuMode("hidden");
  }
});
window.addEventListener("resize", () => {
  syncControlsMenuForViewport();
  resize();
});
if (typeof mobileControlsQuery.addEventListener === "function") {
  mobileControlsQuery.addEventListener("change", syncControlsMenuForViewport);
} else if (typeof mobileControlsQuery.addListener === "function") {
  mobileControlsQuery.addListener(syncControlsMenuForViewport);
}

registerServiceWorker();

if (startSimulationBtn) {
  startSimulationBtn.addEventListener("click", enterSimulationMode);
}
if (startGameBtn) {
  startGameBtn.addEventListener("click", () => {
    if (startMenuHint) startMenuHint.hidden = false;
    enterGameMode();
  });
}
if (gameBackBtn) {
  gameBackBtn.addEventListener("click", () => {
    document.body.classList.remove("mode-game");
    if (gameModeScreen) gameModeScreen.hidden = true;
    showStartMenu();
  });
}
if (gameToSimulationBtn) {
  gameToSimulationBtn.addEventListener("click", enterSimulationMode);
}

if (startMenu) {
  startMenu.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.id === "startSimulationBtn") {
      enterSimulationMode();
      return;
    }
    if (target.id === "startGameBtn") {
      if (startMenuHint) startMenuHint.hidden = false;
      enterGameMode();
    }
  });
  showStartMenu();
} else {
  enterSimulationMode();
}
