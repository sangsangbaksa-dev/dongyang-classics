'use strict';

// 외부 파일 없이 WebAudio 로 효과음과 오음계(宮商角徵羽) 배경음을 만든다.
const Sound = {
  ctx: null, master: null, muted: false, noiseBuf: null, bgmTimer: null, bgmOn: false,

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    const n = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, n, n);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  },

  toggle() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
  },

  tone(freq, dur, type = 'sine', vol = 0.3, slide = 0, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },

  noise(dur, vol = 0.3, freq = 1200, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },

  play(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'light':   this.noise(0.08, 0.25, 2400); break;
      case 'heavy':   this.noise(0.16, 0.35, 1400); this.tone(120, 0.15, 'sawtooth', 0.12, -60); break;
      case 'hit':     this.noise(0.1, 0.5, 900); this.tone(180, 0.1, 'square', 0.2, -100); break;
      case 'hitHeavy':this.noise(0.18, 0.7, 600); this.tone(110, 0.2, 'square', 0.3, -70); break;
      case 'block':   this.tone(900, 0.07, 'triangle', 0.25, -300); this.noise(0.05, 0.2, 3000); break;
      case 'jump':    this.tone(300, 0.12, 'sine', 0.1, 200); break;
      case 'special': this.tone(440, 0.25, 'triangle', 0.25, 440); this.noise(0.25, 0.2, 2000); break;
      case 'heal':    [523, 659, 784].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.2, 0, i * 0.08)); break;
      case 'cutin':   this.tone(80, 0.9, 'sawtooth', 0.3, 40); this.noise(0.6, 0.4, 500); this.tone(196, 1.2, 'triangle', 0.25); break;
      case 'ko':      this.tone(70, 1.4, 'sine', 0.6, -30); this.tone(140, 1.0, 'triangle', 0.3, -60); this.noise(0.4, 0.5, 400); break;
      case 'gong':    this.tone(98, 1.6, 'sine', 0.5); this.tone(147, 1.2, 'triangle', 0.2); break;
      case 'select':  this.tone(660, 0.08, 'triangle', 0.2); break;
      case 'confirm': this.tone(523, 0.08, 'triangle', 0.25); this.tone(784, 0.14, 'triangle', 0.25, 0, 0.07); break;
      case 'win':     [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.25, 0, i * 0.12)); break;
    }
  },

  startBgm() {
    if (!this.ctx || this.bgmOn) return;
    this.bgmOn = true;
    const scale = [0, 2, 4, 7, 9, 12, 14, 16];
    const root = 146.83; // D3
    let step = 0, idx = 3;
    this.bgmTimer = setInterval(() => {
      if (this.muted) return;
      idx = Math.max(0, Math.min(scale.length - 1, idx + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
      const f = root * Math.pow(2, scale[idx] / 12);
      if (step % 2 === 0 || Math.random() < 0.4) this.tone(f, 0.9, 'triangle', 0.07);
      if (step % 8 === 0) this.tone(root / 2, 2.2, 'sine', 0.1);
      if (step % 16 === 8) this.tone(root * 1.5, 1.6, 'sine', 0.05);
      step++;
    }, 320);
  },
};
