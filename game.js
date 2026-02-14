/**
 * Cross the Road - Infinite world, bus station start, 2/4 lane roads, river logs, bird's-eye view
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
if (!ctx.roundRect) {
  ctx.roundRect = function (x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    this.beginPath();
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    this.closePath();
  };
}
const scoreEl = document.getElementById('score');
const lanesEl = document.getElementById('lanes');
const eagleTimerEl = document.getElementById('eagle-timer');
const speedSlider = document.getElementById('speed-slider');
const speedValueEl = document.getElementById('speed-value');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const gameOverReason = document.getElementById('game-over-reason');
const gameOverTitle = document.getElementById('game-over-title');
const highScoreEl = document.getElementById('high-score');
const livesEl = document.getElementById('lives');
const highScoreMsgEl = document.getElementById('high-score-msg');

const EAGLE_TIMEOUT = 5;
const EAGLE_TIMEOUT_HARD = 3;
const EAGLE_CHASE_SPEED = 70;
const EAGLE_CHASE_SPEED_HARD = 140;
const EAGLE_HARD_SCORE = 10000;
const EAGLE_HITBOX_R = 22;

function getEagleTimeout() {
  return gameState.score >= EAGLE_HARD_SCORE ? EAGLE_TIMEOUT_HARD : EAGLE_TIMEOUT;
}
function getEagleChaseSpeed() {
  return gameState.score >= EAGLE_HARD_SCORE ? EAGLE_CHASE_SPEED_HARD : EAGLE_CHASE_SPEED;
}
const EAGLE_ANIMATION_DURATION = 2.2;
const INITIAL_LIVES = 3;
const INVINCIBLE_DURATION = 2;
const HIGH_SCORE_KEY = 'crossTheRoadHighScore';
const CHARACTER_KEY = 'crossTheRoadCharacter';
const VARIANT_KEY = 'crossTheRoadVariant';
const HAS_PLAYED_KEY = 'crossTheRoadHasPlayed';
const CHARACTERS = ['chicken', 'duck', 'tiger', 'cow', 'horse', 'goat', 'stickboy', 'stickgirl', 'stickfat'];
const VARIANTS = ['default', 'silver', 'golden', 'rainbow'];
const VARIANT_UNLOCK = { default: 0, silver: 1000, golden: 10000, rainbow: 50000 };

function getSelectedCharacter() {
  try {
    const c = localStorage.getItem(CHARACTER_KEY) || 'chicken';
    return CHARACTERS.includes(c) ? c : 'chicken';
  } catch (_) { return 'chicken'; }
}
function setSelectedCharacter(c) {
  try {
    if (CHARACTERS.includes(c)) localStorage.setItem(CHARACTER_KEY, c);
  } catch (_) {}
}
function getSelectedVariant() {
  try {
    let v = localStorage.getItem(VARIANT_KEY) || 'default';
    if (v === 'alternate') v = 'default';
    return VARIANTS.includes(v) ? v : 'default';
  } catch (_) { return 'default'; }
}
function setSelectedVariant(v) {
  try {
    if (VARIANTS.includes(v)) localStorage.setItem(VARIANT_KEY, v);
  } catch (_) {}
}
function hasPlayedOnce() {
  try { return localStorage.getItem(HAS_PLAYED_KEY) === '1'; } catch (_) { return false; }
}
function setHasPlayedOnce() {
  try { localStorage.setItem(HAS_PLAYED_KEY, '1'); } catch (_) {}
}
function isVariantUnlocked(variant) {
  if (variant === 'default') return true;
  const need = VARIANT_UNLOCK[variant];
  return need !== undefined && getHighScore() >= need;
}
function getPalette(variant) {
  if (variant === 'rainbow') {
    const t = performance.now() / 2000;
    const hue = (t * 60) % 360;
    const r = (n) => `hsl(${(hue + n * 72) % 360}, 78%, 52%)`;
    return { body: r(0), bodyDark: r(1), outline: r(2), accent: r(3), eyeW: '#FFF', eyeP: r(4), extra: r(5) };
  }
  const palettes = {
    default: { body: '#81D4FA', bodyDark: '#4FC3F7', outline: '#0288D1', accent: '#FF7043', eyeW: '#FFF', eyeP: '#212121', extra: '#FFAB40' },
    silver: { body: '#E0E0E0', bodyDark: '#BDBDBD', outline: '#757575', accent: '#9E9E9E', eyeW: '#FFF', eyeP: '#424242', extra: '#BDBDBD' },
    golden: { body: '#FFD54F', bodyDark: '#FFC107', outline: '#FF8F00', accent: '#FFAB00', eyeW: '#FFF8E1', eyeP: '#FF8F00', extra: '#FFCA28' }
  };
  return palettes[variant] || palettes.default;
}
const WORLD_SHIFT_THRESHOLD = 280;
const WORLD_SHIFT_RESET_Y = 420;
const CAMERA_EASE_PER_MS = 0.004;
const JUMP_DURATION = 0.45;
const JUMP_MAX_HEIGHT = 48;

function getHighScore() {
  try {
    return parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10);
  } catch (_) { return 0; }
}
function setHighScore(v) {
  try { localStorage.setItem(HIGH_SCORE_KEY, String(v)); } catch (_) {}
}
const BASE_PLAYER_SPEED = 4;
const PLAYER_SIZE = 24;
const LANE_HEIGHT = 56;
const REST_AREA_HEIGHT = 220;
const SECTION_TYPES = { REST: 'rest', GRASS: 'grass', ROAD: 'road', RAILWAY: 'railway', RIVER: 'river' };
const DROWN_TIME = 1.8;
const VIEW_OFFSET_Y = canvas.height - 72;

let gameState = {
  running: false,
  score: 0,
  lanesCrossed: 0,
  lives: INITIAL_LIVES,
  eagleTimeLeft: 5,
  lastForwardMove: 0,
  worldSections: [],
  worldTop: 0,
  drowningTimer: 0,
  lastSectionId: null,
  invincibleUntil: 0,
  cameraWorldY: 0,
  eagleAnimationStart: null,
  eagleCaptureScreenX: 0,
  eagleCaptureScreenY: 0,
  eagleChaseStartTime: null,
  eagleWorldX: 0,
  eagleWorldY: 0,
  lastStepSoundTime: 0,
  lastSwimSoundTime: 0
};

const STEP_SOUND_INTERVAL_MS = 180;
const SWIM_SOUND_INTERVAL_MS = 200;

let player = {
  worldX: 0,
  worldY: 0,
  width: PLAYER_SIZE,
  height: PLAYER_SIZE,
  ridingLog: null,
  lastSectionId: null,
  jumpTime: 0
};

let obstacles = [];
let logs = [];
let crocodiles = [];
let keys = {};
let lastTime = 0;
let animationId = null;
let sectionIdCounter = 0;

function getPlayerSpeed() {
  const pct = (speedSlider ? parseInt(speedSlider.value, 10) : 100) / 100;
  return BASE_PLAYER_SPEED * Math.max(0.5, Math.min(150 / 100, pct));
}

function worldToScreenY(worldY) {
  return (worldY - gameState.cameraWorldY) + VIEW_OFFSET_Y;
}

function worldToScreenX(worldX) {
  return worldX;
}

function screenToWorldY(screenY) {
  return player.worldY - VIEW_OFFSET_Y + screenY;
}

function getSectionAt(worldY) {
  for (const s of gameState.worldSections) {
    if (s.worldYStart >= s.worldYEnd) {
      if (worldY >= s.worldYEnd && worldY < s.worldYStart) return s;
    } else {
      if (worldY >= s.worldYStart && worldY < s.worldYEnd) return s;
    }
  }
  return null;
}

function generateSection(type, worldYStart, numLanes) {
  const id = ++sectionIdCounter;
  let height;
  if (type === SECTION_TYPES.REST) height = REST_AREA_HEIGHT;
  else if (type === SECTION_TYPES.GRASS) height = LANE_HEIGHT * (1.5 + Math.random() * 1);
  else if (type === SECTION_TYPES.ROAD || type === SECTION_TYPES.RAILWAY) height = LANE_HEIGHT * (numLanes || (Math.random() > 0.5 ? 2 : 4));
  else if (type === SECTION_TYPES.RIVER) height = LANE_HEIGHT * (6 + Math.floor(Math.random() * 5));
  else height = LANE_HEIGHT * 2;
  const worldYEnd = worldYStart - height;
  const section = {
    id,
    type,
    worldYStart,
    worldYEnd,
    height,
    numLanes: numLanes || (type === SECTION_TYPES.ROAD || type === SECTION_TYPES.RAILWAY ? (Math.random() > 0.5 ? 2 : 4) : 1)
  };
  gameState.worldSections.push(section);
  gameState.worldTop = Math.min(gameState.worldTop, worldYEnd);

  if (type === SECTION_TYPES.ROAD) {
    const laneH = height / section.numLanes;
    for (let L = 0; L < section.numLanes; L++) {
      const count = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const dir = Math.random() > 0.5 ? 1 : -1;
        const width = 42 + Math.random() * 40;
        const speed = (1.8 + Math.random() * 2) * dir;
        obstacles.push({
          worldX: Math.random() * (canvas.width + width * 2) - width,
          worldY: worldYStart - (L + 0.5) * laneH - 14,
          width,
          height: 28,
          speed,
          sectionId: id,
          type: 'vehicle',
          variant: Math.floor(Math.random() * 4)
        });
      }
    }
  } else if (type === SECTION_TYPES.RAILWAY) {
    const laneH = height / section.numLanes;
    for (let L = 0; L < section.numLanes; L++) {
      const dir = Math.random() > 0.5 ? 1 : -1;
      const trainWidth = 100 + Math.random() * 80;
      obstacles.push({
        worldX: dir > 0 ? -trainWidth : canvas.width,
        worldY: worldYStart - (L + 0.5) * laneH - 12,
        width: trainWidth,
        height: 24,
        speed: (2.5 + Math.random() * 1.5) * dir,
        sectionId: id,
        type: 'train'
      });
    }
  } else if (type === SECTION_TYPES.RIVER) {
    const numLogs = 10 + Math.floor(Math.random() * 8);
    for (let i = 0; i < numLogs; i++) {
      const dir = Math.random() > 0.5 ? 1 : -1;
      const logW = 70 + Math.random() * 50;
      const speed = (1.2 + Math.random() * 1.2) * dir;
      const laneH = height / 3;
      const row = i % 3;
      logs.push({
        worldX: (Math.random() * (canvas.width + 100)) - 50,
        worldY: worldYStart - (row + 0.5) * laneH - 12,
        width: logW,
        height: 22,
        speed,
        sectionId: id,
        variant: Math.floor(Math.random() * 3)
      });
    }
    const numCrocodiles = 2 + Math.floor(Math.random() * 3);
    const laneH = height / 3;
    for (let i = 0; i < numCrocodiles; i++) {
      const dir = Math.random() > 0.5 ? 1 : -1;
      const speed = (1.2 + Math.random() * 0.8) * dir;
      const row = i % 3;
      crocodiles.push({
        worldX: (Math.random() * (canvas.width + 80)) - 40,
        worldY: worldYStart - (row + 0.5) * laneH - 8,
        width: 52,
        height: 18,
        speed,
        sectionId: id,
        variant: Math.floor(Math.random() * 2)
      });
    }
  }
  return section;
}

function initWorld() {
  gameState.worldSections = [];
  obstacles = [];
  logs = [];
  crocodiles = [];
  sectionIdCounter = 0;
  gameState.worldTop = 0;

  generateSection(SECTION_TYPES.REST, 0, 1);
  let y = gameState.worldTop;
  const hazardTypes = [SECTION_TYPES.ROAD, SECTION_TYPES.RIVER, SECTION_TYPES.RAILWAY];
  for (let i = 0; i < 8; i++) {
    generateSection(SECTION_TYPES.GRASS, y, 1);
    y = gameState.worldTop;
    const type = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];
    generateSection(type, y, null);
    y = gameState.worldTop;
  }
}

function generateMoreIfNeeded() {
  const margin = 600;
  while (gameState.worldTop > player.worldY - margin) {
    const types = [SECTION_TYPES.GRASS, SECTION_TYPES.ROAD, SECTION_TYPES.RIVER, SECTION_TYPES.RAILWAY];
    const type = types[Math.floor(Math.random() * types.length)];
    if (type === SECTION_TYPES.GRASS) {
      generateSection(SECTION_TYPES.GRASS, gameState.worldTop, 1);
    } else {
      generateSection(SECTION_TYPES.GRASS, gameState.worldTop, 1);
      generateSection(type, gameState.worldTop, null);
    }
  }
  const cam = gameState.cameraWorldY;
  const cullBelow = cam + canvas.height - VIEW_OFFSET_Y + 150;
  while (gameState.worldSections.length > 0 && gameState.worldSections[0].worldYStart > cullBelow) {
    const s = gameState.worldSections.shift();
    obstacles = obstacles.filter(o => o.sectionId !== s.id);
    logs = logs.filter(l => l.sectionId !== s.id);
    crocodiles = crocodiles.filter(c => c.sectionId !== s.id);
  }
}

function respawn() {
  const nowSec = performance.now() / 1000;
  player.worldX = canvas.width / 2 - PLAYER_SIZE / 2;
  player.ridingLog = null;
  gameState.lastForwardMove = nowSec;
  gameState.eagleTimeLeft = getEagleTimeout();
  gameState.drowningTimer = 0;
  gameState.eagleAnimationStart = null;
  gameState.eagleChaseStartTime = null;
  gameState.invincibleUntil = nowSec + INVINCIBLE_DURATION;
  if (livesEl) livesEl.textContent = gameState.lives;
}

function loseLife(reason, title = 'Game Over') {
  const nowSec = performance.now() / 1000;
  if (nowSec < gameState.invincibleUntil) return;
  if (gameState.lives <= 0) return;
  gameState.lives--;
  if (livesEl) livesEl.textContent = gameState.lives;
  if (gameState.lives <= 0) {
    endGame(reason, title);
  } else {
    respawn();
  }
}

function resetGame() {
  const nowSec = performance.now() / 1000;
  gameState.running = true;
  gameState.score = 0;
  gameState.lanesCrossed = 0;
  gameState.lives = INITIAL_LIVES;
  gameState.eagleTimeLeft = getEagleTimeout();
  gameState.lastForwardMove = nowSec;
  gameState.drowningTimer = 0;
  gameState.lastSectionId = null;
  gameState.invincibleUntil = 0;
  gameState.cameraWorldY = 0;
  gameState.eagleAnimationStart = null;
  gameState.eagleChaseStartTime = null;
  player.worldX = canvas.width / 2 - PLAYER_SIZE / 2;
  player.worldY = 0;
  player.ridingLog = null;
  player.lastSectionId = null;
  player.jumpTime = 0;
  initWorld();
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  if (highScoreEl) highScoreEl.textContent = getHighScore();
  if (livesEl) livesEl.textContent = gameState.lives;
  if (highScoreMsgEl) highScoreMsgEl.classList.add('hidden');
  if (typeof startBGM === 'function') startBGM();
  canvas.focus();
}

function endGame(reason, title = 'Game Over') {
  gameState.running = false;
  const prevHigh = getHighScore();
  if (gameState.score > prevHigh) {
    setHighScore(gameState.score);
    if (highScoreEl) highScoreEl.textContent = gameState.score;
    if (highScoreMsgEl) highScoreMsgEl.classList.remove('hidden');
  } else if (highScoreMsgEl) highScoreMsgEl.classList.add('hidden');
  gameOverTitle.textContent = title;
  finalScoreEl.textContent = gameState.score;
  gameOverReason.textContent = reason;
  gameOverScreen.classList.remove('hidden');
  if (typeof stopBGM === 'function') stopBGM();
  if (animationId) cancelAnimationFrame(animationId);
}

function checkLogCollision() {
  const px = player.worldX + player.width * 0.2;
  const py = player.worldY + player.height * 0.2;
  const pw = player.width * 0.6;
  const ph = player.height * 0.6;
  for (const log of logs) {
    if (px + pw > log.worldX && px < log.worldX + log.width &&
        py + ph > log.worldY && py < log.worldY + log.height) {
      return log;
    }
  }
  return null;
}

function checkRiverDrown() {
  if (player.jumpTime > 0) {
    gameState.drowningTimer = 0;
    return false;
  }
  const nowSec = performance.now() / 1000;
  if (nowSec < gameState.invincibleUntil) {
    gameState.drowningTimer = 0;
    return false;
  }
  const section = getSectionAt(player.worldY + player.height / 2);
  if (!section || section.type !== SECTION_TYPES.RIVER) {
    gameState.drowningTimer = 0;
    return false;
  }
  if (player.ridingLog) {
    gameState.drowningTimer = 0;
    return false;
  }
  const onLog = checkLogCollision();
  if (onLog) {
    gameState.drowningTimer = 0;
    return false;
  }
  gameState.drowningTimer = 0;
  return false;
}

function checkObstacleCollision() {
  if (performance.now() / 1000 < gameState.invincibleUntil) return false;
  const section = getSectionAt(player.worldY + player.height / 2);
  if (!section || section.type !== SECTION_TYPES.ROAD && section.type !== SECTION_TYPES.RAILWAY) return false;
  const px = player.worldX + player.width * 0.2;
  const py = player.worldY + player.height * 0.2;
  const pw = player.width * 0.6;
  const ph = player.height * 0.6;
  for (const obs of obstacles) {
    if (obs.sectionId !== section.id) continue;
    if (px + pw > obs.worldX && px < obs.worldX + obs.width &&
        py + ph > obs.worldY && py < obs.worldY + obs.height) {
      if (typeof playDie === 'function') playDie();
      loseLife('You got hit! Stay safe next time.');
      return true;
    }
  }
  return false;
}

function checkLogOffScreen() {
  if (performance.now() / 1000 < gameState.invincibleUntil) return false;
  if (!player.ridingLog) return false;
  const log = player.ridingLog;
  if (log.worldX + log.width < 0 || log.worldX > canvas.width) {
    if (typeof playDrown === 'function') playDrown();
    loseLife('The log left the screen! Jump off in time!');
    return true;
  }
  return false;
}

function checkCrocodileCollision() {
  const nowSec = performance.now() / 1000;
  if (nowSec < gameState.invincibleUntil) return false;
  const section = getSectionAt(player.worldY + player.height / 2);
  if (!section || section.type !== SECTION_TYPES.RIVER) return false;
  if (player.ridingLog) return false;
  const px = player.worldX + player.width * 0.2;
  const py = player.worldY + player.height * 0.2;
  const pw = player.width * 0.6;
  const ph = player.height * 0.6;
  for (const c of crocodiles) {
    if (c.sectionId !== section.id) continue;
    if (px + pw > c.worldX && px < c.worldX + c.width &&
        py + ph > c.worldY && py < c.worldY + c.height) {
      if (typeof playDie === 'function') playDie();
      loseLife('A crocodile got you! Stay on the logs!');
      return true;
    }
  }
  return false;
}

function updateEagleTimer(now) {
  if (gameState.eagleAnimationStart) return;
  if (gameState.eagleChaseStartTime) {
    eagleTimerEl.textContent = '!';
    eagleTimerEl.parentElement.classList.add('danger');
    return;
  }
  const sec = now / 1000;
  gameState.eagleTimeLeft = getEagleTimeout() - (sec - gameState.lastForwardMove);
  if (gameState.eagleTimeLeft <= 0) {
    if (sec < gameState.invincibleUntil) return;
    gameState.eagleChaseStartTime = now;
    gameState.eagleWorldX = player.worldX + player.width / 2 - 20;
    gameState.eagleWorldY = player.worldY - 90;
    if (typeof playEagle === 'function') playEagle();
    eagleTimerEl.textContent = '!';
    eagleTimerEl.parentElement.classList.add('danger');
    return;
  }
  eagleTimerEl.textContent = Math.ceil(gameState.eagleTimeLeft);
  const dangerThreshold = getEagleTimeout() === EAGLE_TIMEOUT_HARD ? 1 : 2;
  eagleTimerEl.parentElement.classList.toggle('danger', gameState.eagleTimeLeft <= dangerThreshold);
}

function updateScore() {
  const section = getSectionAt(player.worldY + player.height / 2);
  if (!section) return;
  if (player.lastSectionId !== null && section.id !== player.lastSectionId) {
    const prev = gameState.worldSections.find(s => s.id === player.lastSectionId);
    if (prev && section.worldYStart < prev.worldYStart) {
      gameState.lanesCrossed++;
      let points = 12;
      if (section.type === SECTION_TYPES.ROAD) points = 28;
      else if (section.type === SECTION_TYPES.RAILWAY) points = 38;
      else if (section.type === SECTION_TYPES.RIVER) points = 32;
      else if (section.type === SECTION_TYPES.GRASS) points = 8;
      gameState.score += points;
      if (typeof playCrossLane === 'function') playCrossLane();
    }
  }
  player.lastSectionId = section.id;
}

function update(dt) {
  if (!gameState.running) return;
  const now = performance.now();

  if (gameState.eagleAnimationStart !== null) {
    const elapsed = (now - gameState.eagleAnimationStart) / 1000;
    if (elapsed >= EAGLE_ANIMATION_DURATION) {
      gameState.eagleAnimationStart = null;
      loseLife('The eagle took you away! Keep moving forward!', 'Eagle got you!');
    }
    return;
  }

  updateEagleTimer(now);

  if (gameState.eagleChaseStartTime !== null && gameState.eagleAnimationStart === null) {
    const targetX = player.worldX + player.width / 2;
    const targetY = player.worldY + player.height / 2;
    const dx = targetX - gameState.eagleWorldX;
    const dy = targetY - gameState.eagleWorldY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const move = (getEagleChaseSpeed() * dt) / 1000;
    gameState.eagleWorldX += (dx / dist) * Math.min(move, dist);
    gameState.eagleWorldY += (dy / dist) * Math.min(move, dist);
    const px = player.worldX + player.width / 2;
    const py = player.worldY + player.height / 2;
    const hit = Math.hypot(px - gameState.eagleWorldX, py - gameState.eagleWorldY) < (EAGLE_HITBOX_R + player.width * 0.4);
    if (hit) {
      gameState.eagleChaseStartTime = null;
      gameState.eagleAnimationStart = now;
      gameState.eagleCaptureScreenX = worldToScreenX(player.worldX) + player.width / 2;
      gameState.eagleCaptureScreenY = (player.worldY - gameState.cameraWorldY) + VIEW_OFFSET_Y;
      if (typeof playScream === 'function') playScream();
    }
  }

  let speed = getPlayerSpeed();
  const section = getSectionAt(player.worldY + player.height / 2);
  if (section && section.type === SECTION_TYPES.RIVER && !player.ridingLog && player.jumpTime <= 0) {
    speed *= 0.5;
  }
  let dx = 0, dy = 0;
  const jumpSection = getSectionAt(player.worldY + player.height / 2);
  if ((keys[' '] || keys['Space']) && player.jumpTime === 0 && (!jumpSection || jumpSection.type !== SECTION_TYPES.RIVER)) {
    player.jumpTime = 0.001;
    player.ridingLog = null;
  }
  if (player.jumpTime > 0) {
    player.jumpTime += dt / 1000;
    if (player.jumpTime >= JUMP_DURATION) player.jumpTime = 0;
  }
  if (keys['ArrowUp'] || keys['w'] || keys['W']) dy -= speed;
  if (keys['ArrowDown'] || keys['s'] || keys['S']) dy += speed;
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= speed;
  if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += speed;

  if (dy < 0) gameState.lastForwardMove = now / 1000;

  if (player.ridingLog) {
    player.worldX += player.ridingLog.speed * (dt / 16);
    if (dx !== 0 || dy !== 0) {
      player.ridingLog = null;
      if (typeof playLandOnLog === 'function') playLandOnLog();
    }
  } else {
    const newLog = checkLogCollision();
    if (newLog && (dx !== 0 || dy !== 0)) {
    } else if (newLog) {
      player.ridingLog = newLog;
      if (typeof playLandOnLog === 'function') playLandOnLog();
    }
    player.worldX += dx;
    player.worldY += dy;
  }

  if (!player.ridingLog) {
    player.worldX = Math.max(0, Math.min(canvas.width - player.width, player.worldX));
  }
  const playerScreenY = (player.worldY - gameState.cameraWorldY) + VIEW_OFFSET_Y;
  if (playerScreenY > canvas.height - 60) {
    player.worldY = gameState.cameraWorldY + canvas.height - VIEW_OFFSET_Y - 60;
  }
  if (playerScreenY < WORLD_SHIFT_THRESHOLD) {
    const targetCameraY = player.worldY + VIEW_OFFSET_Y - WORLD_SHIFT_RESET_Y;
    const ease = 1 - Math.exp(-CAMERA_EASE_PER_MS * dt);
    gameState.cameraWorldY += (targetCameraY - gameState.cameraWorldY) * ease;
  }

  if ((dx !== 0 || dy !== 0) && player.jumpTime <= 0 && !player.ridingLog) {
    if (isPlayerSwimming()) {
      if (typeof playSwim === 'function' && now - gameState.lastSwimSoundTime >= SWIM_SOUND_INTERVAL_MS) {
        gameState.lastSwimSoundTime = now;
        playSwim();
      }
    } else {
      if (typeof playStep === 'function' && now - gameState.lastStepSoundTime >= STEP_SOUND_INTERVAL_MS) {
        gameState.lastStepSoundTime = now;
        playStep();
      }
    }
  }

  generateMoreIfNeeded();
  updateScore();

  if (checkRiverDrown()) return;
  if (checkLogOffScreen()) return;
  if (player.jumpTime <= 0 && checkObstacleCollision()) return;
  if (player.jumpTime <= 0 && checkCrocodileCollision()) return;

  for (const obs of obstacles) {
    obs.worldX += obs.speed * (dt / 16);
    if (obs.speed > 0 && obs.worldX > canvas.width + obs.width) obs.worldX = -obs.width;
    if (obs.speed < 0 && obs.worldX < -obs.width) obs.worldX = canvas.width + obs.width;
  }
  for (const log of logs) {
    log.worldX += log.speed * (dt / 16);
    if (log.speed > 0 && log.worldX > canvas.width + log.width) log.worldX = -log.width;
    if (log.speed < 0 && log.worldX < -log.width) log.worldX = canvas.width + log.width;
  }
  for (const c of crocodiles) {
    c.worldX += c.speed * (dt / 16);
    if (c.speed > 0 && c.worldX > canvas.width + c.width) c.worldX = -c.width;
    if (c.speed < 0 && c.worldX < -c.width) c.worldX = canvas.width + c.width;
  }
  if (player.ridingLog) {
    player.worldX = Math.max(-player.width * 2, Math.min(canvas.width + player.width * 2, player.worldX));
  }

  scoreEl.textContent = gameState.score;
  lanesEl.textContent = gameState.lanesCrossed;
  if (highScoreEl) highScoreEl.textContent = Math.max(getHighScore(), gameState.score);
  if (livesEl) livesEl.textContent = gameState.lives;
  if (speedValueEl) speedValueEl.textContent = Math.round((getPlayerSpeed() / BASE_PLAYER_SPEED) * 100) + '%';
}

function drawTree(x, sy, sh, id) {
  const sizeScale = 0.52 + (id % 6) * 0.1;
  const treeHeight = Math.min(sh * 0.9, 180) * sizeScale;
  const trunkRatio = 0.32;
  const trunkH = treeHeight * trunkRatio;
  const foliageH = treeHeight * (1 - trunkRatio);
  const baseY = sy + sh;
  const trunkTopY = baseY - trunkH;
  const trunkWBase = Math.max(10, treeHeight * 0.14);
  const trunkWTop = Math.max(6, trunkWBase * 0.55);
  const trunkXLeft = x - trunkWBase / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#5D4037';
  ctx.beginPath();
  ctx.moveTo(trunkXLeft, baseY);
  ctx.lineTo(trunkXLeft + trunkWBase, baseY);
  ctx.lineTo(x + trunkWTop / 2, trunkTopY);
  ctx.lineTo(x - trunkWTop / 2, trunkTopY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.moveTo(trunkXLeft + 2, baseY);
  ctx.lineTo(trunkXLeft + trunkWBase * 0.4, baseY);
  ctx.lineTo(x - trunkWTop * 0.2, trunkTopY);
  ctx.lineTo(x - trunkWTop / 2, trunkTopY);
  ctx.closePath();
  ctx.fill();
  const foliageCenterY = trunkTopY - foliageH * 0.45;
  const r = foliageH * 0.5;
  const bumps = [
    { dx: 0, dy: 0, r: 1 },
    { dx: -0.38, dy: -0.22, r: 0.78 },
    { dx: 0.42, dy: -0.18, r: 0.72 },
    { dx: -0.22, dy: 0.38, r: 0.68 },
    { dx: 0.28, dy: 0.28, r: 0.58 },
    { dx: 0, dy: -0.48, r: 0.52 }
  ];
  const greens = ['#1B5E20', '#2E7D32', '#388E3C', '#43A047'];
  bumps.forEach((b, i) => {
    const cx = x + b.dx * r;
    const cy = foliageCenterY + b.dy * r;
    const rad = r * b.r * (0.92 + (id % 3) * 0.03);
    ctx.fillStyle = greens[(id + i) % greens.length];
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.arc(x - r * 0.28, foliageCenterY - r * 0.35, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawRestArea(s) {
  const sy = worldToScreenY(s.worldYStart > s.worldYEnd ? s.worldYEnd : s.worldYStart);
  const sh = s.height;
  if (sy + sh < 0 || sy > canvas.height) return;
  const gradient = ctx.createLinearGradient(0, sy, 0, sy + sh);
  gradient.addColorStop(0, '#7CB342');
  gradient.addColorStop(0.5, '#689F38');
  gradient.addColorStop(1, '#558B2F');
  ctx.fillStyle = gradient;
  ctx.fillRect(-20, sy, canvas.width + 40, sh);
  ctx.strokeStyle = '#33691E';
  ctx.lineWidth = 2;
  ctx.strokeRect(-20, sy, canvas.width + 40, sh);
  for (let i = 0; i < 12; i++) {
    const gx = (i * 78 + s.id * 31) % (canvas.width + 60) - 20;
    const gy = sy + (i * 0.4 % 1) * sh + 6;
    ctx.fillStyle = '#558B2F';
    ctx.beginPath();
    ctx.arc(gx, gy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  const busX = canvas.width * 0.18;
  const busW = 90;
  const busH = 38;
  const busY = sy + sh * 0.35;
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#FF6F00';
  ctx.beginPath();
  ctx.roundRect(busX, busY, busW, busH * 0.85, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(busX, busY + busH * 0.6, busW, busH * 0.3);
  ctx.fillStyle = '#FFF8E1';
  ctx.fillRect(busX + 8, busY + 6, 18, 14);
  ctx.fillRect(busX + 32, busY + 6, 18, 14);
  ctx.fillRect(busX + 56, busY + 6, 18, 14);
  ctx.fillStyle = '#FFAB00';
  ctx.fillRect(busX + 4, busY - 4, busW - 8, 10);
  ctx.beginPath();
  ctx.roundRect(busX + 4, busY - 4, busW - 8, 10, 4);
  ctx.strokeStyle = '#E65100';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#424242';
  ctx.beginPath();
  ctx.arc(busX + 18, busY + busH - 4, 8, 0, Math.PI * 2);
  ctx.arc(busX + busW - 18, busY + busH - 4, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  const stopX = canvas.width * 0.58;
  ctx.fillStyle = '#1565C0';
  ctx.fillRect(stopX, sy + sh * 0.32, 70, 36);
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BUS STOP', stopX + 35, sy + sh * 0.42);
  ctx.textAlign = 'left';
  drawTree(canvas.width * 0.08, sy, sh, s.id + 1);
  drawTree(canvas.width * 0.25, sy, sh, s.id + 2);
  drawTree(canvas.width * 0.82, sy, sh, s.id + 3);
  drawTree(canvas.width * 0.92, sy, sh, s.id + 4);
}

function drawGrass(s) {
  const sy = worldToScreenY(s.worldYStart > s.worldYEnd ? s.worldYEnd : s.worldYStart);
  const sh = s.height;
  if (sy + sh < 0 || sy > canvas.height) return;
  const gradient = ctx.createLinearGradient(0, sy, 0, sy + sh);
  gradient.addColorStop(0, '#81C784');
  gradient.addColorStop(0.5, '#66BB6A');
  gradient.addColorStop(1, '#4CAF50');
  ctx.fillStyle = gradient;
  ctx.fillRect(-20, sy, canvas.width + 40, sh);
  ctx.strokeStyle = '#388E3C';
  ctx.lineWidth = 2;
  ctx.strokeRect(-20, sy, canvas.width + 40, sh);
  for (let i = 0; i < 20; i++) {
    const gx = (i * 47 + s.id * 19) % (canvas.width + 40) - 10;
    const gy = sy + (i * 0.3 % 1) * sh + 5;
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(gx, gy, 4, 16);
    ctx.fillStyle = '#66BB6A';
    ctx.beginPath();
    ctx.ellipse(gx + 2, gy - 4, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const treeSpots = [
    (s.id * 37) % (canvas.width - 140) + 50,
    (s.id * 53 + 80) % (canvas.width - 140) + 50,
    (s.id * 71 + 120) % (canvas.width - 140) + 50,
    (s.id * 97 + 40) % (canvas.width - 140) + 50
  ];
  treeSpots.forEach((tx, i) => drawTree(tx, sy, sh, s.id * 10 + i));
}

function drawRoad(s) {
  const sy = worldToScreenY(s.worldYStart > s.worldYEnd ? s.worldYEnd : s.worldYStart);
  const sh = s.height;
  if (sy + sh < 0 || sy > canvas.height) return;
  const gradient = ctx.createLinearGradient(0, sy, 0, sy + sh);
  gradient.addColorStop(0, '#616161');
  gradient.addColorStop(0.5, '#424242');
  gradient.addColorStop(1, '#37474F');
  ctx.fillStyle = gradient;
  ctx.fillRect(-20, sy, canvas.width + 40, sh);
  ctx.strokeStyle = '#263238';
  ctx.lineWidth = 2;
  ctx.strokeRect(-20, sy, canvas.width + 40, sh);
  const laneH = sh / s.numLanes;
  for (let L = 1; L < s.numLanes; L++) {
    const laneY = sy + L * laneH;
    ctx.setLineDash([24, 20]);
    ctx.strokeStyle = '#FFEB3B';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, laneY);
    ctx.lineTo(canvas.width, laneY);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawRailway(s) {
  const sy = worldToScreenY(s.worldYStart > s.worldYEnd ? s.worldYEnd : s.worldYStart);
  const sh = s.height;
  if (sy + sh < 0 || sy > canvas.height) return;
  const gradient = ctx.createLinearGradient(0, sy, 0, sy + sh);
  gradient.addColorStop(0, '#546E7A');
  gradient.addColorStop(1, '#37474F');
  ctx.fillStyle = gradient;
  ctx.fillRect(-20, sy, canvas.width + 40, sh);
  ctx.strokeStyle = '#263238';
  ctx.lineWidth = 2;
  ctx.strokeRect(-20, sy, canvas.width + 40, sh);
  const laneH = sh / s.numLanes;
  for (let L = 0; L < s.numLanes; L++) {
    const cy = sy + (L + 0.5) * laneH;
    ctx.fillStyle = '#263238';
    ctx.fillRect(0, cy - 6, canvas.width, 12);
    for (let rx = 0; rx < canvas.width + 40; rx += 26) {
      ctx.fillStyle = '#455A64';
      ctx.fillRect(rx, cy - 7, 6, 14);
    }
  }
}

function drawRiver(s) {
  const sy = worldToScreenY(s.worldYStart > s.worldYEnd ? s.worldYEnd : s.worldYStart);
  const sh = s.height;
  if (sy + sh < 0 || sy > canvas.height) return;
  const gradient = ctx.createLinearGradient(0, sy, 0, sy + sh);
  gradient.addColorStop(0, '#29B6F6');
  gradient.addColorStop(0.4, '#03A9F4');
  gradient.addColorStop(1, '#0288D1');
  ctx.fillStyle = gradient;
  ctx.fillRect(-20, sy, canvas.width + 40, sh);
  ctx.strokeStyle = '#0277BD';
  ctx.lineWidth = 2;
  ctx.strokeRect(-20, sy, canvas.width + 40, sh);
  for (let v = 0; v < canvas.width + 80; v += 48) {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(v, sy + sh / 2);
    ctx.quadraticCurveTo(v + 20, sy + sh / 2 - 8, v + 44, sy + sh / 2);
    ctx.stroke();
  }
}

function drawSection(s) {
  const cam = gameState.cameraWorldY;
  const visTop = cam - VIEW_OFFSET_Y - 150;
  const visBottom = cam + canvas.height - VIEW_OFFSET_Y + 150;
  if (s.worldYStart > s.worldYEnd) {
    if (s.worldYStart < visTop || s.worldYEnd > visBottom) return;
  } else {
    if (s.worldYEnd < visTop || s.worldYStart > visBottom) return;
  }
  if (s.type === SECTION_TYPES.REST) drawRestArea(s);
  else if (s.type === SECTION_TYPES.GRASS) drawGrass(s);
  else if (s.type === SECTION_TYPES.ROAD) drawRoad(s);
  else if (s.type === SECTION_TYPES.RAILWAY) drawRailway(s);
  else if (s.type === SECTION_TYPES.RIVER) drawRiver(s);
}

function drawObstacle(obs) {
  const sy = worldToScreenY(obs.worldY);
  if (sy + obs.height < 0 || sy > canvas.height) return;
  const sx = worldToScreenX(obs.worldX);
  const w = obs.width;
  const h = obs.height;
  ctx.save();
  if (obs.type === 'vehicle') {
    const colors = ['#E53935', '#1E88E5', '#43A047', '#8E24AA'];
    ctx.fillStyle = colors[obs.variant % 4];
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(sx, sy, w, h * 0.8, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(sx, sy + h * 0.55, w, h * 0.28);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(sx + 14, sy + h * 0.5, 7, 0, Math.PI * 2);
    ctx.arc(sx + w - 14, sy + h * 0.5, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(sx + 8, sy + 6, 12, 10);
    ctx.fillRect(sx + w - 20, sy + 6, 12, 10);
  } else if (obs.type === 'train') {
    ctx.fillStyle = '#757575';
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8;
    ctx.fillRect(sx, sy, w, h * 0.8);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(sx, sy + h * 0.55, w, h * 0.28);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#37474F';
    ctx.fillRect(sx + 10, sy + 5, 24, 16);
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(sx + 42 + i * 24, sy + 7, 20, 12);
    }
    ctx.fillStyle = '#212121';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(sx + 20 + i * 18, sy + h - 5, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawLog(log) {
  const sy = worldToScreenY(log.worldY);
  if (sy + log.height < 0 || sy > canvas.height) return;
  const sx = worldToScreenX(log.worldX);
  const w = log.width;
  const h = log.height;
  const browns = ['#8D6E63', '#6D4C41', '#5D4037'];
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = browns[log.variant % 3];
  ctx.beginPath();
  ctx.roundRect(sx, sy, w, h * 0.75, 8);
  ctx.fill();
  ctx.strokeStyle = '#4E342E';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(sx, sy + h * 0.55, w, h * 0.25);
  ctx.fillStyle = 'rgba(139, 90, 43, 0.5)';
  ctx.beginPath();
  ctx.ellipse(sx + w / 2, sy + h * 0.35, w * 0.38, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawCrocodile(croc) {
  const sy = worldToScreenY(croc.worldY);
  if (sy + croc.height < 0 || sy > canvas.height) return;
  const sx = worldToScreenX(croc.worldX);
  const w = croc.width;
  const h = croc.height;
  const left = croc.speed > 0;
  ctx.save();
  ctx.translate(sx + w / 2, sy + h / 2);
  if (!left) ctx.scale(-1, 1);
  ctx.translate(-w / 2, -h / 2);
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 8;
  const green = croc.variant === 0 ? '#2E7D32' : '#388E3C';
  const greenLight = croc.variant === 0 ? '#43A047' : '#4CAF50';
  ctx.fillStyle = green;
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.5, w * 0.45, h * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1B5E20';
  ctx.beginPath();
  ctx.ellipse(w * 0.82, h * 0.5, w * 0.2, h * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.92, h * 0.5);
  ctx.lineTo(w + 2, h * 0.35);
  ctx.lineTo(w + 2, h * 0.65);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = greenLight;
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.78, w * 0.4, h * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 5; i++) {
    const tx = w * (0.12 + i * 0.2);
    ctx.fillStyle = '#1B5E20';
    ctx.beginPath();
    ctx.moveTo(tx, h * 0.2);
    ctx.lineTo(tx + 4, -1);
    ctx.lineTo(tx + 8, h * 0.2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.ellipse(w * 0.62, h * 0.38, 5, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(w * 0.76, h * 0.35, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.arc(w * 0.63, h * 0.38, 2, 0, Math.PI * 2);
  ctx.arc(w * 0.77, h * 0.35, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function isPlayerSwimming() {
  if (player.ridingLog || player.jumpTime > 0) return false;
  const centerY = player.worldY + player.height / 2;
  const feetY = player.worldY + player.height;
  const sectionCenter = getSectionAt(centerY);
  const sectionFeet = getSectionAt(feetY);
  const inRiver = (sectionCenter && sectionCenter.type === SECTION_TYPES.RIVER) ||
                  (sectionFeet && sectionFeet.type === SECTION_TYPES.RIVER);
  return inRiver;
}

function drawSpindrift() {
  const sx = worldToScreenX(player.worldX) + player.width / 2;
  const sy = (player.worldY - gameState.cameraWorldY) + VIEW_OFFSET_Y + player.height * 0.3;
  const t = performance.now() / 200;
  ctx.save();
  ctx.globalAlpha = 0.85;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + t;
    const r = 8 + Math.sin(t * 2 + i) * 4;
    const x = sx + Math.cos(a) * (14 + Math.sin(t + i * 0.7) * 6);
    const y = sy + Math.sin(a) * (10 + Math.cos(t * 1.3 + i) * 4);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + 0.3 * Math.sin(t + i)})`;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 4, 18, 8, t * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawPlayer() {
  let sy = (player.worldY - gameState.cameraWorldY) + VIEW_OFFSET_Y;
  const t = player.jumpTime;
  if (t > 0 && t < JUMP_DURATION) {
    const jumpOffset = (4 * JUMP_MAX_HEIGHT / (JUMP_DURATION * JUMP_DURATION)) * t * (JUMP_DURATION - t);
    sy -= jumpOffset;
  }
  const sx = worldToScreenX(player.worldX) + player.width / 2;
  ctx.save();
  const nowSec = performance.now() / 1000;
  if (nowSec < gameState.invincibleUntil) {
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(nowSec * 12);
  }
  ctx.translate(sx, sy);
  ctx.shadowColor = 'rgba(255, 255, 220, 0.85)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 20, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 8;
  const palette = getPalette(getSelectedVariant());
  const character = getSelectedCharacter();
  if (character === 'duck') drawDuck(ctx, palette);
  else if (character === 'tiger') drawTiger(ctx, palette);
  else if (character === 'cow') drawCow(ctx, palette);
  else if (character === 'horse') drawHorse(ctx, palette);
  else if (character === 'goat') drawGoat(ctx, palette);
  else if (character === 'stickboy') drawStickBoy(ctx, palette);
  else if (character === 'stickgirl') drawStickGirl(ctx, palette);
  else if (character === 'stickfat') drawStickFat(ctx, palette);
  else drawChicken(ctx, palette);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawCharacterTo(context, characterName, variant) {
  context.save();
  context.translate(context.canvas.width / 2, context.canvas.height / 2);
  const palette = getPalette(variant || getSelectedVariant());
  if (characterName === 'duck') drawDuck(context, palette);
  else if (characterName === 'tiger') drawTiger(context, palette);
  else if (characterName === 'cow') drawCow(context, palette);
  else if (characterName === 'horse') drawHorse(context, palette);
  else if (characterName === 'goat') drawGoat(context, palette);
  else if (characterName === 'stickboy') drawStickBoy(context, palette);
  else if (characterName === 'stickgirl') drawStickGirl(context, palette);
  else if (characterName === 'stickfat') drawStickFat(context, palette);
  else drawChicken(context, palette);
  context.restore();
}

function drawCartoonBody(c, palette, options) {
  const { bodyColor, bellyColor, outlineColor } = options;
  const body = bodyColor != null ? bodyColor : palette.body;
  const belly = bellyColor != null ? bellyColor : palette.bodyDark;
  const outline = outlineColor != null ? outlineColor : palette.outline;
  c.lineWidth = 2.5;
  c.strokeStyle = outline;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.fillStyle = body;
  c.beginPath();
  c.ellipse(0, 2, 13, 15, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = belly;
  c.beginPath();
  c.ellipse(0, 12, 11, 7, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = palette.eyeW;
  c.beginPath();
  c.ellipse(-5, -6, 4.5, 5.5, 0, 0, Math.PI * 2);
  c.ellipse(5, -6, 4.5, 5.5, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = palette.eyeP;
  c.beginPath();
  c.arc(-5, -6, 2.2, 0, Math.PI * 2);
  c.arc(5, -6, 2.2, 0, Math.PI * 2);
  c.fill();
}

function drawChicken(c, palette) {
  c = c || ctx;
  palette = palette || getPalette('default');
  c.shadowColor = 'rgba(0,0,0,0.2)';
  c.shadowBlur = 6;
  drawCartoonBody(c, palette, {});
  c.fillStyle = palette.accent;
  c.strokeStyle = palette.outline;
  c.lineWidth = 2;
  c.beginPath();
  c.ellipse(0, -14, 5, 4, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(8, -10);
  c.quadraticCurveTo(14, -12, 12, -4);
  c.lineTo(9, -8);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = palette.extra;
  c.beginPath();
  c.ellipse(10, -2, 5, 4, 0.2, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.shadowBlur = 0;
}

function drawDuck(c, palette) {
  c = c || ctx;
  palette = palette || getPalette('default');
  c.shadowColor = 'rgba(0,0,0,0.2)';
  c.shadowBlur = 6;
  drawCartoonBody(c, palette, {});
  c.fillStyle = palette.extra;
  c.strokeStyle = palette.outline;
  c.lineWidth = 2;
  c.beginPath();
  c.ellipse(11, -4, 6, 5, 0.1, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.shadowBlur = 0;
}

function drawTiger(c, palette) {
  c = c || ctx;
  palette = palette || getPalette('default');
  c.shadowColor = 'rgba(0,0,0,0.2)';
  c.shadowBlur = 6;
  drawCartoonBody(c, palette, {});
  c.fillStyle = palette.outline;
  c.strokeStyle = palette.outline;
  c.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) {
    c.beginPath();
    c.ellipse(-6 + i * 3, 2 + (i % 2) * 3, 1.8, 7, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.shadowBlur = 0;
}

function drawCow(c, palette) {
  c = c || ctx;
  palette = palette || getPalette('default');
  c.shadowColor = 'rgba(0,0,0,0.2)';
  c.shadowBlur = 6;
  drawCartoonBody(c, palette, { bodyColor: palette.eyeW, bellyColor: palette.eyeW, outlineColor: palette.outline });
  c.fillStyle = palette.eyeP;
  c.beginPath();
  c.arc(-8, 4, 4, 0, Math.PI * 2);
  c.arc(7, -2, 3, 0, Math.PI * 2);
  c.arc(0, 10, 3.5, 0, Math.PI * 2);
  c.fill();
  c.shadowBlur = 0;
}

function drawHorse(c, palette) {
  c = c || ctx;
  palette = palette || getPalette('default');
  c.shadowColor = 'rgba(0,0,0,0.2)';
  c.shadowBlur = 6;
  drawCartoonBody(c, palette, {});
  c.fillStyle = palette.bodyDark;
  c.strokeStyle = palette.outline;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-10, -10);
  c.lineTo(-13, -18);
  c.lineTo(-8, -12);
  c.closePath();
  c.fill();
  c.stroke();
  c.shadowBlur = 0;
}

function drawGoat(c, palette) {
  c = c || ctx;
  palette = palette || getPalette('default');
  c.shadowColor = 'rgba(0,0,0,0.2)';
  c.shadowBlur = 6;
  drawCartoonBody(c, palette, { bellyColor: palette.eyeW });
  c.fillStyle = palette.extra;
  c.strokeStyle = palette.outline;
  c.lineWidth = 2;
  for (const side of [-1, 1]) {
    c.beginPath();
    c.moveTo(side * 8, -10);
    c.lineTo(side * 11, -18);
    c.lineTo(side * 6, -12);
    c.closePath();
    c.fill();
    c.stroke();
  }
  c.shadowBlur = 0;
}

function drawStickBoy(c, palette) {
  c = c || ctx;
  palette = palette || getPalette('default');
  c.strokeStyle = palette.outline;
  c.lineWidth = 3;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.arc(0, -12, 8, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = palette.body;
  c.fill();
  c.beginPath();
  c.moveTo(0, -4);
  c.lineTo(0, 14);
  c.moveTo(-10, 2);
  c.lineTo(10, 4);
  c.moveTo(0, 14);
  c.lineTo(-8, 24);
  c.moveTo(0, 14);
  c.lineTo(8, 24);
  c.stroke();
}

function drawStickGirl(c, palette) {
  c = c || ctx;
  palette = palette || getPalette('default');
  c.strokeStyle = palette.outline;
  c.lineWidth = 3;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.arc(0, -12, 8, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = palette.body;
  c.fill();
  c.beginPath();
  c.moveTo(0, -4);
  c.lineTo(0, 10);
  c.moveTo(-10, 0);
  c.lineTo(10, 2);
  c.moveTo(0, 10);
  c.lineTo(-8, 22);
  c.moveTo(0, 10);
  c.lineTo(8, 22);
  c.stroke();
  c.fillStyle = palette.accent;
  c.beginPath();
  c.moveTo(-12, 10);
  c.lineTo(12, 10);
  c.lineTo(0, 18);
  c.closePath();
  c.fill();
  c.stroke();
}

function drawStickFat(c, palette) {
  c = c || ctx;
  palette = palette || getPalette('default');
  c.strokeStyle = palette.outline;
  c.lineWidth = 3;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.fillStyle = palette.body;
  c.beginPath();
  c.ellipse(0, 8, 18, 22, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.beginPath();
  c.arc(0, -14, 6, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(-18, 4);
  c.lineTo(-28, -4);
  c.moveTo(18, 4);
  c.lineTo(28, -2);
  c.moveTo(-12, 28);
  c.lineTo(-14, 38);
  c.moveTo(12, 28);
  c.lineTo(14, 38);
  c.stroke();
}

function drawEagle(x, y, wingPhase) {
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#5D4037';
  ctx.beginPath();
  ctx.ellipse(0, 0, 20, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8D6E63';
  ctx.beginPath();
  ctx.ellipse(0, -18, 12, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFB74D';
  ctx.beginPath();
  ctx.moveTo(10, -18);
  ctx.lineTo(22, -16);
  ctx.lineTo(12, -16);
  ctx.closePath();
  ctx.fill();
  const wingY = Math.sin(wingPhase) * 12;
  ctx.fillStyle = '#6D4C41';
  ctx.beginPath();
  ctx.ellipse(-18, wingY, 8, 18, -0.3, 0, Math.PI * 2);
  ctx.ellipse(18, wingY, 8, 18, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4E342E';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawEagleAnimation() {
  const elapsed = (performance.now() - gameState.eagleAnimationStart) / 1000;
  const cx = gameState.eagleCaptureScreenX;
  const cy = gameState.eagleCaptureScreenY;
  const swoopEnd = 0.55;
  const wingPhase = elapsed * 18;
  let eagleX, eagleY;
  if (elapsed < swoopEnd) {
    const t = elapsed / swoopEnd;
    const ease = t * t * (3 - 2 * t);
    eagleX = canvas.width / 2 + (cx - canvas.width / 2) * ease;
    eagleY = -70 + (cy - 40 + 70) * ease;
  } else {
    const t = (elapsed - swoopEnd) / (EAGLE_ANIMATION_DURATION - swoopEnd);
    eagleX = cx + Math.sin(elapsed * 4) * 8;
    eagleY = cy - 40 - t * (canvas.height + 120);
  }
  drawEagle(eagleX, eagleY, wingPhase);
  if (elapsed >= swoopEnd) {
    ctx.save();
    ctx.translate(eagleX, eagleY + 36);
    const palette = getPalette(getSelectedVariant());
    const character = getSelectedCharacter();
    if (character === 'duck') drawDuck(ctx, palette);
    else if (character === 'tiger') drawTiger(ctx, palette);
    else if (character === 'cow') drawCow(ctx, palette);
    else if (character === 'horse') drawHorse(ctx, palette);
    else if (character === 'goat') drawGoat(ctx, palette);
    else if (character === 'stickboy') drawStickBoy(ctx, palette);
    else if (character === 'stickgirl') drawStickGirl(ctx, palette);
    else if (character === 'stickfat') drawStickFat(ctx, palette);
    else drawChicken(ctx, palette);
    ctx.restore();
    ctx.save();
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const ahY = eagleY + 8;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 4;
    ctx.strokeText('Ah!', eagleX, ahY);
    ctx.fillStyle = '#FFF';
    ctx.fillText('Ah!', eagleX, ahY);
    ctx.restore();
  }
}

function draw() {
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGrad.addColorStop(0, '#87CEEB');
  skyGrad.addColorStop(0.6, '#B0E0E6');
  skyGrad.addColorStop(1, '#98D8E8');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  gameState.worldSections.forEach(drawSection);
  obstacles.forEach(drawObstacle);
  logs.forEach(drawLog);
  crocodiles.forEach(drawCrocodile);
  if (gameState.eagleAnimationStart !== null) {
    const elapsed = (performance.now() - gameState.eagleAnimationStart) / 1000;
    if (elapsed < 0.55) drawPlayer();
    drawEagleAnimation();
    return;
  }
  if (gameState.eagleChaseStartTime !== null) {
    const ex = worldToScreenX(gameState.eagleWorldX);
    const ey = worldToScreenY(gameState.eagleWorldY);
    const wingPhase = (performance.now() / 1000) * 18;
    drawEagle(ex, ey, wingPhase);
  }
  drawPlayer();
  if (isPlayerSwimming()) drawSpindrift();
}

function gameLoop(timestamp) {
  const dt = Math.min(timestamp - lastTime, 50);
  lastTime = timestamp;
  update(dt);
  if (gameState.running) draw();
  animationId = requestAnimationFrame(gameLoop);
}

document.getElementById('restart-btn').addEventListener('click', () => {
  resetGame();
  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);
});

speedSlider.addEventListener('input', () => {
  if (speedValueEl) speedValueEl.textContent = speedSlider.value + '%';
});

const characterSelectScreen = document.getElementById('character-select-screen');
const characterContinueBtn = document.getElementById('character-continue-btn');

function drawAllCharacterPreviews(variant) {
  const v = variant != null ? variant : getSelectedVariant();
  document.querySelectorAll('.character-preview').forEach(can => {
    const name = can.getAttribute('data-character');
    const c = can.getContext('2d');
    if (!c || !name) return;
    c.fillStyle = '#E8F5E9';
    c.fillRect(0, 0, can.width, can.height);
    drawCharacterTo(c, name, v);
  });
}

function updateCharacterSelectionUI() {
  const selected = getSelectedCharacter();
  document.querySelectorAll('.character-option').forEach(btn => {
    const isSelected = btn.getAttribute('data-character') === selected;
    btn.classList.toggle('selected', isSelected);
    btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
  });
}

function updateVariantUI() {
  document.querySelectorAll('.variant-btn').forEach(btn => {
    const v = btn.getAttribute('data-variant');
    const unlocked = isVariantUnlocked(v);
    btn.classList.toggle('locked', !unlocked);
    btn.classList.toggle('selected', getSelectedVariant() === v);
  });
}

if (characterSelectScreen && startScreen) {
  document.getElementById('start-btn').addEventListener('click', () => {
    startScreen.classList.add('hidden');
    characterSelectScreen.classList.remove('hidden');
    updateCharacterSelectionUI();
    updateVariantUI();
    drawAllCharacterPreviews();
    if (getSelectedVariant() === 'rainbow') rainbowPreviewId = requestAnimationFrame(tickRainbowPreviews);
  });
  let rainbowPreviewId = null;
  function tickRainbowPreviews() {
    if (!characterSelectScreen.classList.contains('hidden') && getSelectedVariant() === 'rainbow') {
      drawAllCharacterPreviews('rainbow');
      rainbowPreviewId = requestAnimationFrame(tickRainbowPreviews);
    }
  }
  document.querySelectorAll('.character-option').forEach(btn => {
    btn.addEventListener('click', () => {
      setSelectedCharacter(btn.getAttribute('data-character'));
      updateCharacterSelectionUI();
    });
  });
  document.querySelectorAll('.variant-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = btn.getAttribute('data-variant');
      if (!isVariantUnlocked(v)) return;
      setSelectedVariant(v);
      updateVariantUI();
      drawAllCharacterPreviews(v);
      if (rainbowPreviewId) cancelAnimationFrame(rainbowPreviewId);
      if (v === 'rainbow') rainbowPreviewId = requestAnimationFrame(tickRainbowPreviews);
    });
  });
  if (characterContinueBtn) {
    characterContinueBtn.addEventListener('click', () => {
      if (rainbowPreviewId) cancelAnimationFrame(rainbowPreviewId);
      rainbowPreviewId = null;
      characterSelectScreen.classList.add('hidden');
      setHasPlayedOnce();
      resetGame();
      lastTime = performance.now();
      animationId = requestAnimationFrame(gameLoop);
    });
  }
}

document.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.key)) e.preventDefault();
  keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

canvas.addEventListener('click', () => canvas.focus());

// On-screen controls: always visible (work with touch on iPad and click on desktop)
(function initTouchControls() {
  const touchControls = document.getElementById('touch-controls');
  if (!touchControls) return;
  touchControls.classList.add('visible');
  touchControls.setAttribute('aria-hidden', 'false');
  const keyMap = { ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight', Space: 'Space' };
  function setKey(key, down) {
    if (keyMap[key] !== undefined) keys[keyMap[key]] = !!down;
  }
  touchControls.querySelectorAll('.touch-btn[data-key]').forEach((btn) => {
    const key = btn.getAttribute('data-key');
    if (!key) return;
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      btn.setPointerCapture(e.pointerId);
      setKey(key, true);
    });
    btn.addEventListener('pointerup', (e) => {
      e.preventDefault();
      setKey(key, false);
    });
    btn.addEventListener('pointercancel', (e) => {
      setKey(key, false);
    });
  });
})();
