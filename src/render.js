'use strict';

const FONT = '"Noto Serif KR","Noto Serif CJK KR","Noto Serif CJK SC","Songti SC","Batang",serif';
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => t * t * (3 - 2 * t);

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// ---------------------------------------------------------------- 배경

const bgCache = {};

function getBackground(key) {
  if (bgCache[key]) return bgCache[key];
  const st = STAGES[key];
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const R = rng(key.length * 7919 + key.charCodeAt(0));

  const sky = g.createLinearGradient(0, 0, 0, GY);
  sky.addColorStop(0, st.top); sky.addColorStop(1, st.bot);
  g.fillStyle = sky; g.fillRect(0, 0, W, H);

  // 해/달
  const sx = 120 + R() * 700, sy = 90 + R() * 40;
  const halo = g.createRadialGradient(sx, sy, 10, sx, sy, 130);
  halo.addColorStop(0, st.sun + 'aa'); halo.addColorStop(1, st.sun + '00');
  g.fillStyle = halo; g.fillRect(sx - 140, sy - 140, 280, 280);
  g.fillStyle = st.sun; g.beginPath(); g.arc(sx, sy, 34, 0, 7); g.fill();

  // 먹으로 그린 듯한 산 능선 3겹
  for (let layer = 0; layer < 3; layer++) {
    const base = 250 + layer * 48, amp = 120 - layer * 28;
    const p1 = R() * 6, p2 = R() * 6, p3 = R() * 6;
    g.fillStyle = st.m[layer];
    g.beginPath(); g.moveTo(0, GY);
    for (let x = 0; x <= W; x += 8) {
      const y = base - amp * (0.5 + 0.28 * Math.sin(x * 0.006 + p1) + 0.2 * Math.sin(x * 0.013 + p2) + 0.1 * Math.sin(x * 0.031 + p3)) + layer * 10;
      g.lineTo(x, y);
    }
    g.lineTo(W, GY); g.closePath(); g.fill();
    const mist = g.createLinearGradient(0, base - 30, 0, base + 60);
    mist.addColorStop(0, 'rgba(255,255,255,0)');
    mist.addColorStop(1, 'rgba(255,255,255,' + (0.22 - layer * 0.04) + ')');
    g.fillStyle = mist; g.fillRect(0, base - 30, W, GY - base + 30);
  }

  STAGE_DECO[key](g, R, st);

  // 바닥
  const fl = g.createLinearGradient(0, GY, 0, H);
  fl.addColorStop(0, st.ground); fl.addColorStop(1, '#0b0907');
  g.fillStyle = fl; g.fillRect(0, GY, W, H - GY);
  g.strokeStyle = st.grass; g.lineWidth = 2; g.globalAlpha = 0.5;
  for (let i = 0; i < 90; i++) {
    const x = R() * W, y = GY + 4 + R() * (H - GY - 8), l = 6 + R() * 18;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (R() - 0.5) * 2); g.stroke();
  }
  g.globalAlpha = 1;
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, GY - 2, W, 4);

  // 비네트
  const vg = g.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 640);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);

  return (bgCache[key] = cv);
}

function pillar(g, x, w, top, col) {
  g.fillStyle = col; g.fillRect(x, top, w, GY - top);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + w * 0.7, top, w * 0.3, GY - top);
  g.fillStyle = col; g.fillRect(x - 6, top - 10, w + 12, 12); g.fillRect(x - 6, GY - 10, w + 12, 10);
}

function banner(g, x, y, w, h, col, ch) {
  g.fillStyle = col; g.beginPath();
  g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w, y + h); g.lineTo(x + w / 2, y + h - 14); g.lineTo(x, y + h); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2; g.stroke();
  if (ch) {
    g.fillStyle = 'rgba(244,241,222,.9)'; g.font = '900 ' + Math.floor(w * 0.6) + 'px ' + FONT;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, x + w / 2, y + h * 0.42);
  }
}

const STAGE_DECO = {
  academy(g, R) { // 행단: 붉은 기둥과 기와지붕
    g.fillStyle = '#3a2e26';
    g.beginPath(); g.moveTo(90, 210); g.quadraticCurveTo(480, 150, 870, 210); g.lineTo(840, 236); g.lineTo(120, 236); g.closePath(); g.fill();
    pillar(g, 150, 26, 236, '#8b2e22'); pillar(g, 784, 26, 236, '#8b2e22');
    pillar(g, 420, 22, 236, '#7a2820'); pillar(g, 520, 22, 236, '#7a2820');
    g.fillStyle = 'rgba(40,30,20,.55)'; g.fillRect(150, 236, 660, 14);
    for (let i = 0; i < 5; i++) { // 은행나무 잎
      g.fillStyle = 'rgba(230,180,60,.7)';
      g.beginPath(); g.arc(30 + i * 22 + R() * 10, 280 + R() * 120, 4 + R() * 3, 0, 7); g.fill();
    }
  },
  mist(g, R) { // 대나무
    g.strokeStyle = '#2f4a3a'; g.fillStyle = '#2f4a3a';
    for (let i = 0; i < 16; i++) {
      const x = 20 + i * 62 + R() * 30, h = 260 + R() * 150, w = 6 + R() * 4;
      g.globalAlpha = 0.45 + R() * 0.4;
      g.fillRect(x, GY - h, w, h);
      g.fillStyle = '#1d3025';
      for (let y = GY - h + 30; y < GY; y += 46) g.fillRect(x - 2, y, w + 4, 3);
      g.fillStyle = '#2f4a3a';
      for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + w / 2 + (R() - 0.5) * 60, GY - h + 20 + R() * 80, 22, 5, R() - 0.5, 0, 7); g.fill(); }
    }
    g.globalAlpha = 1;
  },
  palace(g) { // 진나라 궁전
    g.fillStyle = '#1c1013'; g.fillRect(0, 150, W, 40);
    g.fillStyle = '#5a2428';
    for (let x = 0; x < W; x += 60) { g.beginPath(); g.moveTo(x, 150); g.lineTo(x + 30, 120); g.lineTo(x + 60, 150); g.fill(); }
    for (const x of [60, 250, 650, 840]) pillar(g, x, 34, 190, '#7d1f26');
    banner(g, 150, 190, 60, 150, '#161012', '法');
    banner(g, 750, 190, 60, 150, '#161012', '法');
    banner(g, 450, 190, 60, 150, '#161012', '秦');
  },
  wall(g, R) { // 성벽
    g.fillStyle = '#6e6656'; g.fillRect(0, 300, W, GY - 300);
    g.fillStyle = '#7d7564';
    for (let x = 0; x < W; x += 56) g.fillRect(x, 270, 36, 34);
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2;
    for (let y = 300; y < GY; y += 30) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
      for (let x = (y / 30 % 2) * 30; x < W; x += 60) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 30); g.stroke(); }
    }
    banner(g, 200, 200, 44, 100, '#3a3226', '墨'); banner(g, 716, 200, 44, 100, '#3a3226', '墨');
  },
  battlefield(g, R) { // 전장
    g.strokeStyle = '#1b1c26'; g.fillStyle = '#1b1c26'; g.lineWidth = 3;
    for (let i = 0; i < 26; i++) {
      const x = 20 + i * 38 + R() * 14, h = 90 + R() * 70;
      g.beginPath(); g.moveTo(x, GY - 4); g.lineTo(x + (R() - 0.5) * 8, GY - h); g.stroke();
      g.beginPath(); g.moveTo(x - 4, GY - h + 6); g.lineTo(x + (R() - 0.5) * 8, GY - h - 16); g.lineTo(x + 4, GY - h + 6); g.fill();
    }
    banner(g, 130, 250, 54, 110, '#7a2a2a', '兵'); banner(g, 770, 250, 54, 110, '#2a3f7a', '兵');
  },
  lake(g, R) { // 연못
    const wy = 400;
    const wg = g.createLinearGradient(0, wy, 0, GY);
    wg.addColorStop(0, '#2e3a5a'); wg.addColorStop(1, '#1a2238');
    g.fillStyle = wg; g.fillRect(0, wy, W, GY - wy);
    g.strokeStyle = 'rgba(244,241,222,.25)'; g.lineWidth = 2;
    for (let i = 0; i < 26; i++) {
      const x = R() * W, y = wy + 6 + R() * (GY - wy - 12), l = 20 + R() * 50;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y); g.stroke();
    }
    g.fillStyle = '#1a2a22'; // 갈대
    for (let i = 0; i < 30; i++) {
      const x = R() * W, h = 40 + R() * 60;
      g.beginPath(); g.moveTo(x, wy + 8); g.quadraticCurveTo(x + 6, wy - h * 0.5, x + 14, wy - h); g.lineTo(x + 16, wy - h); g.quadraticCurveTo(x + 9, wy - h * 0.5, x + 3, wy + 8); g.fill();
    }
  },
};

// 움직이는 안개/꽃잎
function drawAmbient(g, key, t) {
  const st = STAGES[key];
  g.save();
  g.globalAlpha = 0.12;
  g.fillStyle = '#fff';
  for (let i = 0; i < 4; i++) {
    const x = ((t * (0.15 + i * 0.07) + i * 300) % (W + 400)) - 200;
    g.beginPath(); g.ellipse(x, 330 + i * 28, 220, 16, 0, 0, 7); g.fill();
  }
  g.globalAlpha = 0.7;
  g.fillStyle = key === 'palace' || key === 'battlefield' ? '#e9a64c' : (key === 'lake' ? '#f4f1de' : st.sun);
  for (let i = 0; i < 14; i++) {
    const x = ((i * 137 + t * (0.4 + (i % 4) * 0.15)) % (W + 40)) - 20;
    const y = ((i * 89 + t * (0.6 + (i % 3) * 0.2)) % (GY + 20));
    g.fillRect(x + Math.sin(t * 0.02 + i) * 8, y, 3, 3);
  }
  g.restore();
}

// ---------------------------------------------------------------- 캐릭터

function getPose(f) {
  const P = { lean: 0, bob: 0, legA: 0, legB: 0, armF: 1.35, armB: 1.9, crouch: 0, head: 0, trail: null, wRot: 0.5, airborne: f.y < GY - 1, lift: 0 };
  const t = f.anim;
  if (f.state === 'idle') {
    P.bob = Math.sin(t * 0.08) * 1.6;
    P.armF += Math.sin(t * 0.08) * 0.05;
    P.legA = 8; P.legB = -8;
  } else if (f.state === 'walk') {
    const s = Math.sin(t * 0.3);
    P.legA = s * 16; P.legB = -s * 16; P.lift = Math.max(0, s) * 6;
    P.armF = 1.1 + s * 0.4; P.armB = 1.9 - s * 0.4; P.lean = 3; P.bob = Math.abs(s) * -2;
  } else if (f.state === 'block') {
    P.armF = -0.45; P.armB = -0.2; P.lean = -3; P.crouch = 6; P.legA = 14; P.legB = -10;
  } else if (f.state === 'hit') {
    P.lean = -10; P.armF = 2.5; P.armB = 2.7; P.head = -0.3; P.legA = 12; P.legB = -6;
  } else if (f.state === 'win') {
    P.armF = -1.2 - Math.sin(t * 0.15) * 0.2; P.armB = -1.9; P.bob = Math.sin(t * 0.1) * 2; P.legA = 8; P.legB = -8;
  } else if (f.state === 'atk' && f.move) {
    const m = f.move, total = m.startup + m.active;
    const heavy = m.kind === 'heavy';
    if (f.t < total) {
      const p = ease(clamp(f.t / total, 0, 1));
      const a0 = heavy ? -2.9 : -2.3, a1 = heavy ? 0.9 : 0.35;
      P.armF = lerp(a0, a1, p);
      P.lean = lerp(-4, heavy ? 14 : 9, p);
      P.legA = heavy ? 18 : 12; P.legB = heavy ? -16 : -10; P.crouch = heavy ? 4 : 0;
      if (f.t >= m.startup) P.trail = { from: P.armF - (heavy ? 1.9 : 1.4), to: P.armF, heavy };
    } else {
      const p = clamp((f.t - total) / m.rec, 0, 1);
      P.armF = lerp(heavy ? 0.9 : 0.35, 1.35, p);
      P.lean = lerp(heavy ? 14 : 9, 0, p); P.legA = 14; P.legB = -12;
    }
    P.armB = 1.7;
  } else if (f.state === 'cast') {
    const p = clamp(f.t / 30, 0, 1);
    P.armF = lerp(1, -1.5, ease(p)) - Math.sin(t * 0.5) * 0.05; P.armB = lerp(1.9, -2.1, ease(p));
    P.lean = f.lunge ? 18 : 2; P.legA = f.lunge ? 22 : 12; P.legB = f.lunge ? -22 : -12;
    if (f.lunge) P.trail = { from: -0.6, to: 0.2, heavy: true };
  }
  if (P.airborne && f.state !== 'ko') { P.legA = 10; P.legB = -4; P.lift = 10; }
  return P;
}

function drawHat(g, ch, hx, hy, tilt) {
  g.save(); g.translate(hx, hy); g.rotate(tilt);
  switch (ch.hat) {
    case 'guan': // 유가 관
      g.fillStyle = '#17110d'; g.fillRect(-12, -17, 24, 7); g.fillRect(-7, -23, 14, 8);
      g.fillStyle = ch.accent; g.fillRect(-12, -11, 24, 2);
      break;
    case 'bun': // 도가 상투
      g.fillStyle = '#d8d4c8'; g.beginPath(); g.arc(-2, -19, 6, 0, 7); g.fill();
      g.fillStyle = '#e6e1d2'; g.beginPath(); g.arc(0, -4, 12.5, Math.PI, 0); g.fill();
      break;
    case 'crown': // 법관
      g.fillStyle = '#16100f'; g.beginPath(); g.moveTo(-11, -12); g.lineTo(-8, -34); g.lineTo(10, -30); g.lineTo(12, -12); g.closePath(); g.fill();
      g.fillStyle = ch.accent; g.fillRect(-11, -14, 23, 3);
      break;
    case 'band': // 묵가 머리띠
      g.fillStyle = '#2a211a'; g.beginPath(); g.arc(0, -3, 12.5, Math.PI, 0); g.fill();
      g.fillStyle = '#b0392e'; g.fillRect(-12.5, -9, 25, 4);
      g.fillRect(-14, -9, 4, 12);
      break;
    case 'helmet': // 병가 투구
      g.fillStyle = '#b08a3a'; g.beginPath(); g.arc(0, -3, 14, Math.PI, 0); g.fill();
      g.fillRect(-14, -5, 28, 4);
      g.fillStyle = '#9d2a2a'; g.beginPath(); g.moveTo(-1, -17); g.quadraticCurveTo(-8, -32, -18, -26); g.quadraticCurveTo(-8, -26, -3, -14); g.fill();
      break;
    case 'scholar': // 방건
      g.fillStyle = '#e8e4d4'; g.fillRect(-11, -20, 22, 16);
      g.strokeStyle = '#8d8aa8'; g.lineWidth = 1.5; g.strokeRect(-11, -20, 22, 16);
      break;
  }
  g.restore();
}

function drawWeapon(g, ch, hx, hy, ang) {
  g.save(); g.translate(hx, hy); g.rotate(ang);
  g.lineCap = 'round';
  switch (ch.weapon) {
    case 'scroll':
      g.strokeStyle = '#5b3d22'; g.lineWidth = 3; g.beginPath(); g.moveTo(-6, 0); g.lineTo(34, 0); g.stroke();
      g.fillStyle = '#e8d8a8'; g.fillRect(2, -8, 26, 16);
      g.strokeStyle = '#8a7340'; g.lineWidth = 1;
      for (let x = 6; x < 28; x += 5) { g.beginPath(); g.moveTo(x, -8); g.lineTo(x, 8); g.stroke(); }
      break;
    case 'whisk':
      g.strokeStyle = '#8a6a3a'; g.lineWidth = 3; g.beginPath(); g.moveTo(-6, 0); g.lineTo(18, 0); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.moveTo(18, 0);
      g.quadraticCurveTo(36, -12, 52, -6); g.quadraticCurveTo(40, 0, 52, 8); g.quadraticCurveTo(34, 12, 18, 0); g.fill();
      break;
    case 'blade':
      g.fillStyle = '#c9cdd2'; g.beginPath(); g.moveTo(8, -3); g.lineTo(54, -2); g.lineTo(60, 0); g.lineTo(54, 2); g.lineTo(8, 3); g.closePath(); g.fill();
      g.fillStyle = '#c9b27c'; g.fillRect(4, -7, 5, 14); g.fillStyle = '#3a2418'; g.fillRect(-8, -2, 12, 4);
      break;
    case 'staff':
      g.strokeStyle = '#6b4a2a'; g.lineWidth = 4; g.beginPath(); g.moveTo(-18, 0); g.lineTo(52, 0); g.stroke();
      g.fillStyle = '#9a9a9a'; g.fillRect(48, -4, 8, 8);
      break;
    case 'spear':
      g.strokeStyle = '#5b3d22'; g.lineWidth = 3; g.beginPath(); g.moveTo(-26, 0); g.lineTo(66, 0); g.stroke();
      g.fillStyle = '#d6d9dc'; g.beginPath(); g.moveTo(64, -5); g.lineTo(88, 0); g.lineTo(64, 5); g.closePath(); g.fill();
      g.fillStyle = '#b02a2a'; g.beginPath(); g.arc(62, 0, 5, 0, 7); g.fill();
      break;
    case 'fan':
      g.strokeStyle = '#7a6a4a'; g.lineWidth = 2; g.beginPath(); g.moveTo(-4, 0); g.lineTo(6, 0); g.stroke();
      g.fillStyle = '#f4f1de'; g.beginPath(); g.moveTo(6, 0); g.arc(6, 0, 30, -0.8, 0.8); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(120,100,70,.7)'; g.lineWidth = 1;
      for (let a = -0.7; a <= 0.71; a += 0.35) { g.beginPath(); g.moveTo(6, 0); g.lineTo(6 + Math.cos(a) * 30, Math.sin(a) * 30); g.stroke(); }
      break;
  }
  g.restore();
}

function drawArm(g, sx, sy, ang, len, col, w0, w1) {
  const hx = sx + Math.cos(ang) * len, hy = sy + Math.sin(ang) * len;
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(sx + nx * w0, sy + ny * w0); g.lineTo(hx + nx * w1, hy + ny * w1);
  g.lineTo(hx - nx * w1, hy - ny * w1); g.lineTo(sx - nx * w0, sy - ny * w0); g.closePath(); g.fill();
  g.fillStyle = '#f1d3b0'; g.beginPath(); g.arc(hx, hy, 4.5, 0, 7); g.fill();
  return [hx, hy];
}

// f: {ch, x, y, face, state, t, anim, move, ...}. scale 로 도감용 축소도 가능.
function drawFighter(g, f, scale = 1, opts = {}) {
  const ch = f.ch, P = getPose(f);
  const alpha = f.invuln > 0 && f.invuln % 6 < 3 && f.state !== 'cast' ? 0.45 : 1;
  g.save();
  g.globalAlpha = alpha;

  // 그림자
  const air = clamp((GY - f.y) / 160, 0, 1);
  if (!opts.noShadow) {
    g.fillStyle = 'rgba(0,0,0,' + (0.35 - air * 0.2) + ')';
    g.beginPath(); g.ellipse(f.x, GY + 2, 30 * (1 - air * 0.4) * scale, 7 * scale, 0, 0, 7); g.fill();
  }

  g.translate(f.x, f.y);
  g.scale(f.face * scale, scale);

  if (f.state === 'ko') {
    const a = clamp(f.t * 0.1, 0, 1.45);
    g.translate(-4, f.y >= GY ? -6 : 0);
    g.rotate(-a);
  }

  // 상태 오라
  if (f.counter > 0) {
    g.save(); g.globalAlpha = 0.35 + Math.sin(f.anim * 0.4) * 0.15;
    g.strokeStyle = '#ffd86b'; g.lineWidth = 4; g.beginPath(); g.arc(0, -55, 56 + Math.sin(f.anim * 0.3) * 4, 0, 7); g.stroke();
    g.fillStyle = 'rgba(255,216,107,.18)'; g.fill(); g.restore();
  }
  if (f.shield > 0) {
    g.save(); g.strokeStyle = 'rgba(255,240,180,.9)'; g.lineWidth = 3;
    g.fillStyle = 'rgba(255,240,180,.15)'; g.beginPath(); g.arc(0, -55, 62, 0, 7); g.fill(); g.stroke(); g.restore();
  }

  const y0 = P.crouch + P.bob;
  const lean = P.lean;
  const hipY = -42 + y0 * 0.5, shY = -80 + y0;

  // 뒷팔
  const sleeve = ch.color, sleeveDark = shade(ch.color, -25), sleeveLight = shade(ch.color, 18);
  const backH = drawArm(g, lean - 6, shY + 2, P.armB, 30, sleeveDark, 8, 11);
  if (ch.weapon === 'staff') { // 묵자의 방패
    g.fillStyle = ch.accent; g.beginPath(); g.arc(backH[0], backH[1], 15, 0, 7); g.fill();
    g.strokeStyle = '#3a2a1a'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#3a2a1a'; g.beginPath(); g.arc(backH[0], backH[1], 4, 0, 7); g.fill();
  }

  // 다리
  g.strokeStyle = '#1b1612'; g.lineWidth = 8; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-4, hipY); g.lineTo(P.legB - 2, -P.lift * 0.3); g.stroke();
  g.beginPath(); g.moveTo(4, hipY); g.lineTo(P.legA + 2, -P.lift); g.stroke();
  g.fillStyle = '#0e0b09';
  g.fillRect(P.legB - 6, -4, 14, 5); g.fillRect(P.legA - 2, -4 - P.lift, 14, 5);

  // 도포
  g.fillStyle = sleeve;
  g.beginPath();
  g.moveTo(lean - 15, shY); g.lineTo(lean + 15, shY);
  g.quadraticCurveTo(lean * 0.6 + 22, hipY, 24, -12 + y0 * 0.3);
  g.lineTo(-24, -12 + y0 * 0.3);
  g.quadraticCurveTo(lean * 0.6 - 22, hipY, lean - 15, shY); g.closePath(); g.fill();
  g.fillStyle = sleeveLight; // 옷깃
  g.beginPath(); g.moveTo(lean - 6, shY); g.lineTo(lean + 8, hipY + 6); g.lineTo(lean + 14, shY); g.lineTo(lean + 2, shY + 8); g.closePath(); g.fill();
  g.fillStyle = ch.accent; g.fillRect(lean * 0.5 - 17, hipY - 2, 34, 6); // 허리띠
  g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(-24, -16 + y0 * 0.3, 48, 4);

  // 머리
  const hx = lean * 1.1, hy = -96 + y0 * 1.2;
  g.fillStyle = '#f1d3b0'; g.beginPath(); g.arc(hx, hy, 12.5, 0, 7); g.fill();
  g.fillStyle = '#1b1612'; g.fillRect(hx + 4, hy - 2, 2.4, 3.2); g.fillRect(hx - 2, hy - 2, 2.4, 3.2);
  if (f.state === 'hit' || f.state === 'ko') { g.fillRect(hx + 2, hy + 5, 6, 2); } else { g.fillRect(hx + 3, hy + 5, 5, 1.4); }
  if (ch.id === 'confucius' || ch.id === 'mozi' || ch.id === 'zhuangzi') {
    g.fillStyle = ch.id === 'zhuangzi' ? '#e6e1d2' : '#2a211a';
    g.beginPath(); g.moveTo(hx - 6, hy + 8); g.lineTo(hx + 6, hy + 8); g.lineTo(hx + 1, hy + 22); g.closePath(); g.fill();
  }
  drawHat(g, ch, hx, hy, P.head);

  // 앞팔 + 무기
  const armLen = 34;
  const fsx = lean + 8, fsy = shY + 2;
  if (P.trail && !opts.noTrail) {
    const reach = (f.move ? f.move.reach : 70) * 0.9;
    g.save();
    const grad = g.createRadialGradient(fsx, fsy, 10, fsx, fsy, reach);
    grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(1, P.trail.heavy ? 'rgba(255,230,160,.65)' : 'rgba(255,255,255,.5)');
    g.fillStyle = grad; g.beginPath(); g.moveTo(fsx, fsy); g.arc(fsx, fsy, reach, P.trail.from, P.trail.to); g.closePath(); g.fill();
    g.restore();
  }
  const hand = drawArm(g, fsx, fsy, P.armF, armLen, sleeveLight, 9, 12);
  drawWeapon(g, ch, hand[0], hand[1], P.armF + (f.state === 'atk' || f.state === 'cast' ? 0.1 : -0.7));

  g.restore();
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + amt, 0, 255), gg = clamp(((n >> 8) & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255);
  return 'rgb(' + r + ',' + gg + ',' + b + ')';
}

// ---------------------------------------------------------------- 투사체 / 효과

function drawProj(g, p, t) {
  g.save(); g.translate(p.x, p.y);
  switch (p.type) {
    case 'butterfly': {
      const fl = Math.sin(t * 0.7 + p.seed) * 0.8;
      g.rotate(Math.atan2(p.vy, p.vx));
      g.fillStyle = p.color || '#bfe6d0';
      g.beginPath(); g.ellipse(0, -7, 12, 7 * (0.4 + Math.abs(fl)), -0.5, 0, 7); g.fill();
      g.beginPath(); g.ellipse(0, 7, 12, 7 * (0.4 + Math.abs(fl)), 0.5, 0, 7); g.fill();
      g.fillStyle = '#243a30'; g.fillRect(-6, -1.5, 14, 3);
      break;
    }
    case 'pillar': {
      if (p.delay > 0) { // 예고선
        g.globalAlpha = 0.5 + Math.sin(t * 0.5) * 0.3;
        g.fillStyle = p.warn || 'rgba(190,40,40,.5)';
        g.beginPath(); g.ellipse(0, GY - p.y + 2, p.w * 0.55, 9, 0, 0, 7); g.fill();
        g.strokeStyle = '#ff6b5a'; g.lineWidth = 2; g.stroke();
      } else {
        const k = p.life / p.maxLife, hgt = Math.min(1, (1 - k) * 4) * p.h;
        g.translate(0, GY - p.y);
        const gr = g.createLinearGradient(-p.w / 2, 0, p.w / 2, 0);
        gr.addColorStop(0, '#5a1015'); gr.addColorStop(0.5, '#ff8a6a'); gr.addColorStop(1, '#5a1015');
        g.fillStyle = gr; g.globalAlpha = Math.min(1, k * 3);
        g.fillRect(-p.w / 2, -hgt, p.w, hgt);
        g.fillStyle = '#16100f'; g.font = '900 28px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('罰', 0, -hgt * 0.55);
      }
      break;
    }
    case 'slash': {
      if (p.delay > 0) break;
      const k = p.life / p.maxLife;
      g.rotate(p.rot || -0.6); g.globalAlpha = k;
      g.strokeStyle = '#f4f1de'; g.lineWidth = 6 * k + 1; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-70, 0); g.quadraticCurveTo(0, -18, 70, 0); g.stroke();
      g.strokeStyle = p.color || '#d4a017'; g.lineWidth = 2; g.stroke();
      break;
    }
    case 'wave': {
      const k = p.life / p.maxLife;
      g.scale(p.dir, 1); g.globalAlpha = 0.35 + k * 0.5;
      const gr = g.createRadialGradient(0, 0, 4, 0, 0, p.h * 0.6);
      gr.addColorStop(0, p.color); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, p.w * 0.6, p.h * 0.55, 0, 0, 7); g.fill();
      g.strokeStyle = p.color; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, p.h * 0.5, -1.2, 1.2); g.stroke();
      g.lineWidth = 2; g.beginPath(); g.arc(-14, 0, p.h * 0.4, -1.2, 1.2); g.stroke();
      if (p.glyph) { g.fillStyle = '#fff'; g.font = '900 38px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p.glyph, -6, 0); }
      break;
    }
    case 'horse': {
      g.scale(p.dir, 1);
      const gal = Math.sin(t * 0.5 + p.seed);
      g.globalAlpha = 0.92;
      g.fillStyle = '#f7f4ea';
      g.beginPath(); g.ellipse(0, 0, 44, 20, 0, 0, 7); g.fill();            // 몸
      g.beginPath(); g.ellipse(40, -18, 14, 10, -0.6, 0, 7); g.fill();       // 머리
      g.beginPath(); g.moveTo(30, -12); g.lineTo(34, -34); g.lineTo(44, -10); g.fill(); // 목/갈기
      g.fillStyle = '#d7d2c0'; g.beginPath(); g.moveTo(34, -34); g.quadraticCurveTo(22, -30, 20, -10); g.lineTo(30, -12); g.fill();
      g.strokeStyle = '#f7f4ea'; g.lineWidth = 6; g.lineCap = 'round';
      for (const [lx, ph] of [[-30, 0], [-14, 1.6], [18, 3.2], [34, 4.8]]) {
        const s = Math.sin(t * 0.5 + p.seed + ph);
        g.beginPath(); g.moveTo(lx, 12); g.lineTo(lx + s * 16, 34 + Math.abs(gal) * 2); g.stroke();
      }
      g.beginPath(); g.moveTo(-44, -4); g.quadraticCurveTo(-64, 4 + gal * 4, -62, 22); g.stroke();
      g.fillStyle = '#16100f'; g.beginPath(); g.arc(44, -20, 2, 0, 7); g.fill();
      g.globalAlpha = 0.4; g.fillStyle = '#e8e4d4';
      for (let i = 1; i < 5; i++) { g.beginPath(); g.ellipse(-60 - i * 24, 0, 22, 6, 0, 0, 7); g.fill(); }
      break;
    }
    default: {
      g.fillStyle = p.color || '#fff'; g.beginPath(); g.arc(0, 0, p.w / 2, 0, 7); g.fill();
    }
  }
  g.restore();
}

function drawParticles(g, parts) {
  for (const p of parts) {
    const k = Math.min(1, p.life / p.max);
    g.save(); g.globalAlpha = clamp(k * 1.5, 0, 1);
    switch (p.kind) {
      case 'ink':
        g.fillStyle = p.color; g.beginPath(); g.arc(p.x, p.y, p.size * (0.5 + k * 0.5), 0, 7); g.fill(); break;
      case 'spark':
        g.strokeStyle = p.color; g.lineWidth = 3 * k + 1; g.beginPath();
        g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2); g.stroke(); break;
      case 'ring':
        g.strokeStyle = p.color; g.lineWidth = 5 * k + 1; g.beginPath(); g.arc(p.x, p.y, p.size * (1 - k) + 6, 0, 7); g.stroke(); break;
      case 'text':
        g.fillStyle = p.color; g.font = '900 ' + p.size + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 4; g.strokeText(p.text, p.x, p.y); g.fillText(p.text, p.x, p.y); break;
      case 'glyph':
        g.fillStyle = p.color; g.font = '900 ' + p.size + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(p.text, p.x, p.y); break;
    }
    g.restore();
  }
}

// 붓글씨 느낌의 외곽선 글자
function inkText(g, text, x, y, size, fill, stroke = '#000', lw = 6, align = 'center') {
  g.save();
  g.font = '900 ' + size + 'px ' + FONT; g.textAlign = align; g.textBaseline = 'middle';
  g.lineJoin = 'round';
  if (lw) { g.strokeStyle = stroke; g.lineWidth = lw; g.strokeText(text, x, y); }
  g.fillStyle = fill; g.fillText(text, x, y);
  g.restore();
}
