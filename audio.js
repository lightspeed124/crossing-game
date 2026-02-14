/**
 * Game sound effects - polished, layered, satisfying
 */
let audioCtx = null;
let bgmGain = null;
let sfxGain = null;
let bgmRunning = false;
let screamBuffer = null;
let screamLoadStarted = false;

const BGM_VOLUME = 0.18;
const SFX_VOLUME = 0.36;
const SCREAM_MP3 = 'sounds/scream.mp3';

// Two BGM tracks: paths relative to the page. Add sounds/bgm1.mp3 and sounds/bgm2.mp3.
const BGM_TRACK_PATHS = ['sounds/bgm1.mp3', 'sounds/bgm2.mp3'];
let bgmAudioEls = [];
let bgmMediaSources = [];
let bgmTrackIndex = 0;
let bgmSynthInterval = null;
let bgmUseSynth = false;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    bgmGain = audioCtx.createGain();
    bgmGain.gain.value = BGM_VOLUME;
    bgmGain.connect(audioCtx.destination);
    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = SFX_VOLUME;
    sfxGain.connect(audioCtx.destination);
  }
  return audioCtx;
}

function playTone(freq, duration, type, volume) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(sfxGain);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playStep() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime;
  const duration = 0.04;
  const bufferSize = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.42, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 320;
  filter.Q.value = 0.7;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);
  src.start(t);
  src.stop(t + duration);
}

function playSwim() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime;
  const duration = 0.12;
  const bufferSize = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const fade = 1 - (i / bufferSize) * (i / bufferSize);
    data[i] = (Math.random() * 2 - 1) * fade * 0.7;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.28, t);
  gain.gain.exponentialRampToValueAtTime(0.004, t + duration);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 500;
  filter.Q.value = 1;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);
  src.start(t);
  src.stop(t + duration);
  const osc = ctx.createOscillator();
  const g2 = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 220;
  osc.connect(g2);
  g2.connect(sfxGain);
  g2.gain.setValueAtTime(0.08, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  osc.start(t);
  osc.stop(t + 0.06);
}

function playCrossLane() {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  const freqs = [523.25, 659.25, 783.99, 1046.5];
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    osc.connect(gain);
    gain.connect(sfxGain);
    gain.gain.setValueAtTime(0, t + i * 0.07);
    gain.gain.linearRampToValueAtTime(0.28, t + i * 0.07 + 0.02);
    gain.gain.setValueAtTime(0.2, t + i * 0.07 + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.002, t + 0.5);
    osc.start(t + i * 0.07);
    osc.stop(t + 0.5);
  });
  const bass = ctx.createOscillator();
  const bg = ctx.createGain();
  bass.type = 'sine';
  bass.frequency.value = 261.63;
  bass.connect(bg);
  bg.connect(sfxGain);
  bg.gain.setValueAtTime(0, t);
  bg.gain.linearRampToValueAtTime(0.15, t + 0.05);
  bg.gain.exponentialRampToValueAtTime(0.002, t + 0.4);
  bass.start(t);
  bass.stop(t + 0.4);
}

function playLandOnLog() {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  const thud = ctx.createOscillator();
  const blip = ctx.createOscillator();
  const g1 = ctx.createGain();
  const g2 = ctx.createGain();
  thud.type = 'sine';
  blip.type = 'sine';
  thud.frequency.value = 180;
  blip.frequency.value = 520;
  thud.connect(g1);
  blip.connect(g2);
  g1.connect(sfxGain);
  g2.connect(sfxGain);
  g1.gain.setValueAtTime(0.25, t);
  g1.gain.exponentialRampToValueAtTime(0.002, t + 0.12);
  g2.gain.setValueAtTime(0, t);
  g2.gain.linearRampToValueAtTime(0.18, t + 0.02);
  g2.gain.exponentialRampToValueAtTime(0.002, t + 0.15);
  thud.start(t);
  thud.stop(t + 0.12);
  blip.start(t + 0.03);
  blip.stop(t + 0.15);
}

function noise(duration, volume, filterFreq) {
  const ctx = getAudioContext();
  const bufferSize = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * volume;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq || 1200;
  filter.Q.value = 2;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);
  src.start(ctx.currentTime);
  src.stop(ctx.currentTime + duration);
}

function playDie() {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  noise(0.18, 0.4, 1600);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(380, t);
  osc.frequency.linearRampToValueAtTime(900, t + 0.06);
  osc.frequency.linearRampToValueAtTime(400, t + 0.16);
  osc.frequency.linearRampToValueAtTime(180, t + 0.38);
  osc.connect(gain);
  gain.connect(sfxGain);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.32, t + 0.015);
  gain.gain.setValueAtTime(0.28, t + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.002, t + 0.42);
  osc.start(t);
  osc.stop(t + 0.42);
}

function playEagle() {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  osc1.type = 'sine';
  osc2.type = 'sine';
  osc1.frequency.setValueAtTime(440, t);
  osc2.frequency.setValueAtTime(554, t);
  osc1.frequency.exponentialRampToValueAtTime(220, t + 0.28);
  osc2.frequency.exponentialRampToValueAtTime(277, t + 0.28);
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(sfxGain);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.22, t + 0.04);
  gain.gain.setValueAtTime(0.18, t + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.002, t + 0.32);
  osc1.start(t);
  osc1.stop(t + 0.32);
  osc2.start(t);
  osc2.stop(t + 0.32);
}

function playEagleCaught() {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.linearRampToValueAtTime(280, t + 0.08);
  osc.frequency.linearRampToValueAtTime(200, t + 0.2);
  osc.connect(gain);
  gain.connect(sfxGain);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.35, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
  osc.start(t);
  osc.stop(t + 0.25);
}

function playScreamSynth() {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(720, t);
  osc.frequency.linearRampToValueAtTime(580, t + 0.08);
  osc.frequency.linearRampToValueAtTime(420, t + 0.2);
  osc.frequency.linearRampToValueAtTime(320, t + 0.35);
  osc.frequency.linearRampToValueAtTime(200, t + 0.55);
  osc.connect(gain);
  gain.connect(sfxGain);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.36, t + 0.03);
  gain.gain.setValueAtTime(0.3, t + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
  osc.start(t);
  osc.stop(t + 0.6);
  setTimeout(() => {
    if (ctx.state !== 'closed') {
      noise(0.15, 0.45, 600);
    }
  }, 50);
}

function playScream() {
  const ctx = getAudioContext();
  if (screamBuffer) {
    const src = ctx.createBufferSource();
    src.buffer = screamBuffer;
    src.connect(sfxGain);
    src.start(0);
    return;
  }
  if (screamLoadStarted) {
    playScreamSynth();
    return;
  }
  screamLoadStarted = true;
  playScreamSynth();
  fetch(SCREAM_MP3)
    .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error('Not found'))))
    .then((buf) => ctx.decodeAudioData(buf))
    .then((decoded) => {
      screamBuffer = decoded;
    })
    .catch(() => {});
}

function playDrown() {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  filter.Q.value = 0.5;
  filter.connect(sfxGain);
  for (let i = 0; i < 5; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 280 - i * 25;
    osc.connect(gain);
    gain.connect(filter);
    gain.gain.setValueAtTime(0, t + i * 0.055);
    gain.gain.linearRampToValueAtTime(0.2, t + i * 0.055 + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.002, t + i * 0.055 + 0.14);
    osc.start(t + i * 0.055);
    osc.stop(t + 0.45);
  }
  noise(0.25, 0.25, 400);
}

function initBGMAudioElements() {
  if (bgmAudioEls.length >= 2) return true;
  const ctx = getAudioContext();
  const baseUrl = typeof window !== 'undefined' && window.location ? window.location.href : '';
  for (let i = 0; i < BGM_TRACK_PATHS.length; i++) {
    const url = baseUrl ? new URL(BGM_TRACK_PATHS[i], baseUrl).href : BGM_TRACK_PATHS[i];
    const audio = new Audio(url);
    audio.preload = 'auto';
    const source = ctx.createMediaElementSource(audio);
    source.connect(bgmGain);
    bgmAudioEls.push(audio);
    bgmMediaSources.push(source);
  }
  return bgmAudioEls.length >= 2;
}

function playNextBGMTrack() {
  if (!bgmRunning || bgmUseSynth || bgmAudioEls.length < 2) return;
  const idx = bgmTrackIndex;
  const audio = bgmAudioEls[idx];
  const next = bgmAudioEls[1 - idx];
  audio.currentTime = 0;
  audio.onended = () => {
    if (!bgmRunning) return;
    bgmTrackIndex = 1 - idx;
    playNextBGMTrack();
  };
  audio.onerror = () => {
    if (!bgmUseSynth) {
      bgmUseSynth = true;
      startBGMSynth();
    }
  };
  next.pause();
  next.currentTime = 0;
  const p = audio.play();
  if (p && typeof p.catch === 'function') p.catch(() => {});
}

const BGM_SYNTH_MELODY = [
  [523.25, 659.25, 783.99, 659.25],
  [523.25, 587.33, 659.25, 523.25],
  [783.99, 659.25, 587.33, 523.25],
  [392, 523.25, 659.25, 523.25]
];
const BGM_BEAT_MS = 480;
const BGM_BEAT_DURATION = BGM_BEAT_MS / 1000;

function startBGMSynth() {
  const ctx = getAudioContext();
  let step = 0;
  function tick() {
    if (!bgmRunning) return;
    const row = step % 4;
    const col = Math.floor((step / 4) % 4);
    const freq = BGM_SYNTH_MELODY[row][col];
    const t = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.value = freq;
    osc2.frequency.value = freq * 1.5;
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(bgmGain);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.008, t + BGM_BEAT_DURATION * 0.85);
    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + BGM_BEAT_DURATION * 0.85);
    osc2.stop(t + BGM_BEAT_DURATION * 0.85);
    step++;
    bgmSynthInterval = setTimeout(tick, BGM_BEAT_MS);
  }
  tick();
}

function startBGM() {
  if (bgmRunning) return;
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  bgmRunning = true;
  bgmTrackIndex = 0;
  bgmUseSynth = false;
  if (initBGMAudioElements()) {
    playNextBGMTrack();
  } else {
    startBGMSynth();
    return;
  }
  // If first track fails to play (e.g. 404), fall back to synth after a short delay
  setTimeout(() => {
    if (bgmRunning && !bgmUseSynth && bgmAudioEls.length >= 2) {
      const a = bgmAudioEls[0];
      if (a.readyState < 2 && a.error) {
        bgmUseSynth = true;
        startBGMSynth();
      }
    }
  }, 1500);
}

function stopBGM() {
  bgmRunning = false;
  for (let i = 0; i < bgmAudioEls.length; i++) {
    try {
      bgmAudioEls[i].pause();
      bgmAudioEls[i].currentTime = 0;
    } catch (_) {}
  }
  if (bgmSynthInterval) {
    clearTimeout(bgmSynthInterval);
    bgmSynthInterval = null;
  }
}

function setBGMVolume(v) {
  if (bgmGain) bgmGain.gain.value = v;
}

function setSFXVolume(v) {
  if (sfxGain) sfxGain.gain.value = v;
}
