let ctx = null
let musicEl = null
let diedEl = null
let master = null
let muted = false
let started = false

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function noiseBuffer(duration) {
  const c = ensureCtx()
  const buf = c.createBuffer(1, c.sampleRate * duration, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buf
}

function playNoise({ duration = 0.15, type = 'bandpass', freq = 800, freqEnd = null, q = 1, gain = 0.3, delay = 0 }) {
  const c = ensureCtx()
  if (!c || muted) return
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(duration)
  const filter = c.createBiquadFilter()
  filter.type = type
  filter.frequency.value = freq
  filter.Q.value = q
  if (freqEnd !== null) {
    filter.frequency.setValueAtTime(freq, c.currentTime + delay)
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), c.currentTime + delay + duration)
  }
  const g = c.createGain()
  g.gain.setValueAtTime(gain, c.currentTime + delay)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration)
  src.connect(filter).connect(g).connect(master)
  src.start(c.currentTime + delay)
  src.stop(c.currentTime + delay + duration + 0.05)
}

function playTone({ freq = 100, freqEnd = null, duration = 0.2, type = 'sine', gain = 0.25, delay = 0 }) {
  const c = ensureCtx()
  if (!c || muted) return
  const osc = c.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(freq, c.currentTime + delay)
  if (freqEnd !== null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), c.currentTime + delay + duration)
  }
  const g = c.createGain()
  g.gain.setValueAtTime(gain, c.currentTime + delay)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration)
  osc.connect(g).connect(master)
  osc.start(c.currentTime + delay)
  osc.stop(c.currentTime + delay + duration + 0.05)
}

export function startAudio() {
  if (started) return
  started = true
  ensureCtx()
  const base = import.meta.env.BASE_URL
  musicEl = new Audio(`${base}audio/BloodMoon.mp3`)
  musicEl.loop = true
  musicEl.volume = 0.28
  diedEl = new Audio(`${base}audio/hunter.mp3`)
  diedEl.loop = true
  diedEl.volume = 0.32
  musicEl.play().catch(() => {})
}

export function toggleMute() {
  muted = !muted
  if (musicEl) musicEl.muted = muted
  if (diedEl) diedEl.muted = muted
  return muted
}

export function playSwing() {
  playNoise({ duration: 0.18, freq: 900, freqEnd: 180, q: 2.5, gain: 0.35 })
}

export function playHit() {
  playNoise({ duration: 0.1, type: 'lowpass', freq: 500, gain: 0.5 })
  playTone({ freq: 110, freqEnd: 55, duration: 0.14, gain: 0.4 })
}

export function playKill() {
  playNoise({ duration: 0.3, type: 'lowpass', freq: 700, freqEnd: 90, gain: 0.5 })
  playTone({ freq: 85, freqEnd: 40, duration: 0.35, gain: 0.45 })
  playTone({ freq: 160, freqEnd: 70, duration: 0.2, gain: 0.2, delay: 0.05 })
}

export function playHurt() {
  playTone({ freq: 65, freqEnd: 35, duration: 0.3, gain: 0.5 })
  playNoise({ duration: 0.2, type: 'lowpass', freq: 350, gain: 0.35 })
}

export function playStep(running) {
  playNoise({ duration: 0.07, type: 'lowpass', freq: running ? 320 : 240, gain: running ? 0.16 : 0.09 })
}

export function playDodge() {
  playNoise({ duration: 0.25, freq: 500, freqEnd: 1200, q: 1.2, gain: 0.18 })
}

export function playParry() {
  playNoise({ duration: 0.12, type: 'highpass', freq: 2500, gain: 0.12 })
}

export function playParrySuccess() {
  playTone({ freq: 1180, freqEnd: 880, duration: 0.18, type: 'square', gain: 0.14 })
  playTone({ freq: 1760, duration: 0.1, type: 'sine', gain: 0.1 })
  playNoise({ duration: 0.2, type: 'highpass', freq: 3000, gain: 0.2 })
  playTone({ freq: 70, freqEnd: 40, duration: 0.25, gain: 0.35, delay: 0.02 })
}

export function playGrowl() {
  playTone({ freq: 55, freqEnd: 38, duration: 0.5, type: 'sawtooth', gain: 0.16 })
  playNoise({ duration: 0.45, type: 'lowpass', freq: 200, gain: 0.14 })
}

export function playLevelUp() {
  playTone({ freq: 392, duration: 0.12, type: 'triangle', gain: 0.2 })
  playTone({ freq: 523, duration: 0.12, type: 'triangle', gain: 0.2, delay: 0.1 })
  playTone({ freq: 659, duration: 0.2, type: 'triangle', gain: 0.22, delay: 0.2 })
}

export function playEchoPickup() {
  playTone({ freq: 294, duration: 0.16, type: 'triangle', gain: 0.18 })
  playTone({ freq: 440, duration: 0.16, type: 'triangle', gain: 0.18, delay: 0.12 })
  playTone({ freq: 587, duration: 0.28, type: 'triangle', gain: 0.2, delay: 0.24 })
  playTone({ freq: 55, freqEnd: 40, duration: 0.3, gain: 0.22, delay: 0.05 })
}

export function playDied() {
  playTone({ freq: 220, freqEnd: 55, duration: 1.2, type: 'sine', gain: 0.35 })
  playNoise({ duration: 1.4, type: 'lowpass', freq: 400, freqEnd: 60, gain: 0.2 })
}

export function playBossRoar() {
  playTone({ freq: 70, freqEnd: 30, duration: 0.9, type: 'sawtooth', gain: 0.3 })
  playNoise({ duration: 0.8, type: 'lowpass', freq: 300, freqEnd: 80, gain: 0.3 })
}

export function switchMusic(died) {
  if (!musicEl || !diedEl) return
  if (died) {
    musicEl.pause()
    diedEl.currentTime = 0
    diedEl.play().catch(() => {})
  } else {
    diedEl.pause()
    musicEl.play().catch(() => {})
  }
}

if (typeof window !== 'undefined') {
  const kick = () => {
    startAudio()
    window.removeEventListener('pointerdown', kick)
    window.removeEventListener('keydown', kick)
  }
  window.addEventListener('pointerdown', kick)
  window.addEventListener('keydown', kick)
}
