'use strict';

// 홍보 문구. contact 에 모집 안내(오픈채팅 링크, 인스타 계정 등)를 넣으면 결과 화면에 표시된다.
const PROMO = {
  club: '동양고전 탐구반',
  line: '싸움은 90초면 끝나지만, 제자백가의 이야기는 훨씬 깊습니다.',
  cta: '함께 읽고, 함께 논쟁해요!',
  contact: '',
};

const FIGHT_SECONDS = 50;
const SELECT_SECONDS = 12;
const RESULT_SECONDS = 15;

const cv = document.getElementById('c');
const g = cv.getContext('2d');

// ---------------------------------------------------------------- 입력

const Input = { down: {}, pressed: {}, anyPress: false, click: null };

addEventListener('keydown', e => {
  if (e.code === 'KeyM') Sound.toggle();
  if (!e.repeat) { Input.pressed[e.code] = true; Input.anyPress = true; }
  Input.down[e.code] = true;
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  Sound.init(); Sound.startBgm();
});
addEventListener('keyup', e => { Input.down[e.code] = false; });
addEventListener('blur', () => { Input.down = {}; });

cv.addEventListener('pointerdown', e => {
  const r = cv.getBoundingClientRect();
  Input.click = { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  Input.anyPress = true;
  Sound.init(); Sound.startBgm();
});

if ('ontouchstart' in window) {
  const tp = document.getElementById('touch');
  tp.hidden = false;
  tp.querySelectorAll('button').forEach(b => {
    const k = 'T_' + b.dataset.k;
    const on = e => { e.preventDefault(); Input.down[k] = true; Input.pressed[k] = true; Input.anyPress = true; b.classList.add('on'); Sound.init(); Sound.startBgm(); };
    const off = e => { e.preventDefault(); Input.down[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointerleave', off);
    b.addEventListener('pointercancel', off);
  });
}

// 방향키/WASD/터치를 모두 같은 플레이어 입력으로 합친다 (1인용).
const held = k => !!(Input.down[KEYS_P1[k]] || Input.down[KEYS_P2[k]] || Input.down['T_' + k]);
const tapped = k => !!(Input.pressed[KEYS_P1[k]] || Input.pressed[KEYS_P2[k]] || Input.pressed['T_' + k]);
const confirmPressed = () => !!(Input.pressed.Enter || Input.pressed.Space || tapped('light') || tapped('heavy') || tapped('special'));

const NEUTRAL = Object.freeze({ l: 0, r: 0, u: 0, block: 0, light: 0, heavy: 0, special: 0, ult: 0 });

function humanCtl() {
  return {
    l: held('left'), r: held('right'), u: held('up'), block: held('block'),
    light: tapped('light'), heavy: tapped('heavy'), special: tapped('special'), ult: tapped('ult'),
  };
}

// ---------------------------------------------------------------- 상태

function loadDiff() {
  try { const v = parseInt(localStorage.getItem('bgjm_diff'), 10); return v >= 0 && v < DIFFS.length ? v : 1; } catch (e) { return 1; }
}
function saveDiff() { try { localStorage.setItem('bgjm_diff', String(G.diff)); } catch (e) { /* 저장 불가 환경 */ } }

const G = {
  scene: 'title', t: 0, sceneT: 0,
  sel: 0, selT: 0, diff: loadDiff(),
  p: [], projs: [], parts: [], stage: 'academy',
  phase: 'intro', phaseT: 0, timer: 0, hitstop: 0, shake: 0, flash: 0, cutin: null,
  winner: null, timeout: false, result: null,
  attract: [CHARS[0], CHARS[4]],
};

function setScene(s) { G.scene = s; G.sceneT = 0; }

// ---------------------------------------------------------------- 전투 코어

function mkFighter(ch, side, ctl) {
  return {
    ch, side, ctl, x: side ? 690 : 270, y: GY, vx: 0, vy: 0, face: side ? -1 : 1,
    hp: ch.hp, maxhp: ch.hp, hpShow: ch.hp, meter: 0,
    state: 'idle', t: 0, anim: 0, move: null, stun: 0, shield: 0, counter: 0, invuln: 0,
    combo: 0, comboT: 0, maxCombo: 0, dmgDealt: 0, hitDone: false, lunge: false, cast: null,
    flash: 0, ghosts: [], spd: 1, dmgMul: 1, meterMul: 1, airAtk: false,
  };
}

const opp = f => (G.p[0] === f ? G.p[1] : G.p[0]);

// 피격 판정(허트박스): 발 기준 폭 ±HURT_HW, 높이 HURT_H
const HURT_HW = 26, HURT_H = 104;

function getMove(f, kind) {
  const c = f.ch, air = f.y < GY - 1;
  if (air) { // 점프 공격: 발밑까지 내려가는 높은 판정, 낙하하며 길게 유지된다
    if (kind === 'light') return { kind, air: true, startup: 3, active: 9, rec: 8, dmg: c.lightDmg + 1, reach: 72 * c.reach, y: -75, h: 135, kb: 4, stun: 15, hs: 4, gain: 7, launch: 0 };
    return { kind, air: true, startup: 7, active: 10, rec: 12, dmg: c.heavyDmg, reach: 86 * c.reach, y: -80, h: 150, kb: 8, stun: 22, hs: 7, gain: 12, launch: 0 };
  }
  if (kind === 'light') {
    return { kind, startup: 4, active: 4, rec: 9, dmg: c.lightDmg, reach: 66 * c.reach, y: -96, h: 62, kb: 3.5, stun: 14, hs: 4, gain: 7, launch: 0 };
  }
  return { kind, startup: 11, active: 5, rec: 17, dmg: c.heavyDmg, reach: 92 * c.reach, y: -105, h: 90, kb: 9, stun: 22, hs: 8, gain: 12, launch: -3 };
}

function startAttack(f, kind) {
  f.state = 'atk'; f.move = getMove(f, kind); f.t = 0; f.hitDone = false;
  if (f.move.air) f.airAtk = true; // 점프당 한 번
  Sound.play(kind === 'heavy' ? 'heavy' : 'light');
}

function spawn(kind, x, y, n, color, spd = 6, size = 4, life = 24) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, s = (0.4 + Math.random()) * spd;
    G.parts.push({ kind, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.6 + Math.random() * 0.6), max: life, size: size * (0.6 + Math.random()), color, grav: kind === 'ink' ? 0.25 : 0 });
  }
}
function dust(x, y, n) {
  for (let i = 0; i < n; i++) {
    G.parts.push({ kind: 'dust', x: x + (Math.random() - 0.5) * 30, y: y - 2, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 1.2, life: 22 + Math.random() * 12, max: 34, size: 5 + Math.random() * 6, color: '#d8c8a8', grav: -0.02 });
  }
}
function floatText(text, x, y, color, size = 28) {
  G.parts.push({ kind: 'text', text, x, y, vx: 0, vy: -1.1, life: 50, max: 50, size, color, grav: 0 });
}

function proj(owner, o) {
  const p = Object.assign({
    owner, x: 0, y: 0, vx: 0, vy: 0, w: 30, h: 30, dmg: 5, kb: 6, stun: 16, hs: 6, launch: 0, gain: 6,
    life: 60, delay: 0, pierce: false, hit: false, seed: Math.random() * 6, type: 'ink', dir: owner.face, home: false, color: '#fff',
  }, o);
  p.maxLife = p.life;
  G.projs.push(p);
  return p;
}

function meleeHit(f, o, m) {
  const x1 = f.x + f.face * (m.air ? -16 : 8), x2 = f.x + f.face * (8 + m.reach);
  const l = Math.min(x1, x2), r = Math.max(x1, x2);
  const top = f.y + m.y, bot = top + m.h;
  return l < o.x + HURT_HW && r > o.x - HURT_HW && top < o.y && bot > o.y - HURT_H && resolveHit(f, o, m);
}

function endFight(winner, timeout) {
  if (G.phase === 'ko') return;
  G.phase = 'ko'; G.phaseT = 0; G.winner = winner; G.timeout = timeout;
}

function dealHit(att, def, h, dir, blocking) {
  const cx = def.x - dir * 14, cy = def.y - 72;
  const base = h.dmg * att.dmgMul;
  if (blocking) {
    const dmg = Math.max(1, Math.round(base * 0.15));
    def.hp = Math.max(1, def.hp - dmg);
    def.vx = dir * Math.min(h.kb, 6) * 0.7;
    def.meter = Math.min(100, def.meter + 3 * def.meterMul);
    att.meter = Math.min(100, att.meter + h.gain * 0.4 * att.meterMul);
    dust(def.x, def.y, 4);
    spawn('spark', cx, cy, 8, '#9fd0ff', 6);
    spawn('ring', cx, cy, 1, '#9fd0ff', 0, 40, 14);
    Sound.play('block'); G.hitstop = Math.max(G.hitstop, 4);
    return;
  }
  att.combo = att.comboT > 0 ? att.combo + 1 : 1;
  att.comboT = 55; att.maxCombo = Math.max(att.maxCombo, att.combo);
  const dmg = Math.max(1, Math.round(base * Math.max(0.5, 1 - 0.08 * (att.combo - 1))));
  def.hp = Math.max(0, def.hp - dmg);
  att.dmgDealt += dmg;
  def.meter = Math.min(100, def.meter + dmg * 0.9 * def.meterMul);
  att.meter = Math.min(100, att.meter + h.gain * att.meterMul);
  def.flash = 6;
  dust(def.x, def.y, 5);
  def.state = 'hit'; def.t = 0; def.stun = h.stun; def.vx = dir * h.kb; def.move = null;
  def.counter = 0; def.lunge = false; def.cast = null;
  if (h.launch) def.vy = h.launch;
  const heavy = h.dmg >= 10;
  spawn('spark', cx, cy, heavy ? 16 : 9, '#fff3c4', heavy ? 10 : 7);
  spawn('ink', cx, cy, heavy ? 14 : 7, '#1a1410', 5, heavy ? 7 : 5, 34);
  spawn('ring', cx, cy, 1, '#ffe9a8', 0, heavy ? 70 : 46, 16);
  if (heavy) floatText(String(dmg), cx, cy - 30, '#ffd86b', 30);
  Sound.play(heavy ? 'hitHeavy' : 'hit');
  G.hitstop = Math.max(G.hitstop, h.hs || 5);
  G.shake = Math.max(G.shake, heavy ? 9 : 4);
  if (def.hp <= 0) {
    def.state = 'ko'; def.t = 0; def.vx = dir * 7; def.vy = -9;
    G.hitstop = 20; G.shake = 18; G.flash = 14;
    Sound.play('ko');
    endFight(att, false);
  }
}

function resolveHit(att, def, h) {
  if (def.invuln > 0 || def.state === 'ko' || G.phase !== 'fight') return false;
  const dir = Math.sign(def.x - att.x) || att.face;
  if (def.counter > 0) { // 극기복례: 피해를 무효화하고 되받아친다
    def.counter = 0; def.cast = null; def.state = 'idle'; def.t = 0; def.invuln = 26; def.face = -dir;
    spawn('ring', def.x, def.y - 70, 2, '#ffd86b', 0, 120, 20);
    spawn('spark', def.x, def.y - 70, 14, '#ffd86b', 9);
    floatText('禮 반격!', def.x, def.y - 130, '#ffd86b', 30);
    Sound.play('block'); G.hitstop = 14; G.shake = 10;
    dealHit(def, att, { dmg: 16, kb: 12, stun: 26, launch: -6, hs: 0, gain: 10 }, -dir, false);
    return true;
  }
  if (def.shield > 0) {
    def.shield--;
    spawn('ring', def.x, def.y - 70, 1, '#fff0b4', 0, 80, 18);
    spawn('spark', def.x, def.y - 70, 8, '#fff0b4', 6);
    Sound.play('block'); G.hitstop = Math.max(G.hitstop, 6);
    return true;
  }
  const blocking = def.state === 'block' && def.y >= GY - 1 && def.face === -dir;
  dealHit(att, def, h, dir, blocking);
  return true;
}

// ---------------------------------------------------------------- 필살기 / 극의

function pillarAt(f, o, dmg, delay, stun = 26) {
  proj(f, { type: 'pillar', x: o.x, y: GY, w: 70, h: 190, dmg, kb: 4, stun, hs: 8, launch: -9, life: 16, delay, gain: 8 });
}
function slashAt(f, o, rot) {
  proj(f, { type: 'slash', x: o.x, y: GY - 70, w: 90, h: 110, dmg: 5, kb: 3, stun: 14, hs: 4, life: 12, rot, color: '#d4a017', gain: 5 });
}
function butterflies(f, n, dmg, spread) {
  for (let i = 0; i < n; i++) {
    const k = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
    proj(f, { type: 'butterfly', x: f.x + f.face * 24, y: f.y - 80 + k * spread, vx: f.face * (3 + Math.random() * 2), vy: k * 2, w: 26, h: 22, dmg, kb: 4, stun: 16, hs: 4, life: 150, home: true, color: i % 2 ? '#d9f2e2' : '#bfe6d0', gain: 4 });
  }
}
function horse(f, dmg, delay = 0) {
  proj(f, { type: 'horse', x: f.x + f.face * 50, y: f.y - 36, vx: f.face * 11.5, w: 100, h: 66, dmg, kb: 10, stun: 24, hs: 8, launch: -5, life: 90, delay, gain: 8 });
}
function heal(f, n) {
  f.hp = Math.min(f.maxhp, f.hp + n);
  spawn('spark', f.x, f.y - 60, 14, '#b8f0c0', 5);
  spawn('ring', f.x, f.y - 60, 1, '#b8f0c0', 0, 80, 22);
  floatText('+' + n, f.x, f.y - 130, '#b8f0c0', 28);
  Sound.play('heal');
}

const SPECIALS = {
  confucius: { cost: 50, total: 46, tick(f, o, t) { if (t === 1) f.counter = 38; } },
  zhuangzi:  { cost: 50, total: 34, tick(f, o, t) { if (t === 14) butterflies(f, 3, 6, 30); } },
  hanfei:    { cost: 50, total: 42, tick(f, o, t) { if (t === 16) pillarAt(f, o, 16, 26, 28); } },
  mozi:      { cost: 50, total: 38, tick(f, o, t) { if (t === 12) { heal(f, 12); f.shield = 1; } } },
  sunzi: {
    cost: 50, total: 28,
    tick(f, o, t) {
      if (t === 1) { f.lunge = true; f.invuln = 24; }
      if (t === 6) f.vx = f.face * 17;
      if (t >= 6 && t <= 17 && !f.hitDone) {
        if (meleeHit(f, o, { dmg: 14, reach: 56, y: -100, h: 90, kb: 11, stun: 24, hs: 8, launch: -6, gain: 10 })) { f.hitDone = true; f.vx = 0; }
      }
      if (t === 18) f.vx = 0;
    },
  },
  gongsun:   { cost: 50, total: 36, tick(f, o, t) { if (t === 14) horse(f, 15); } },
};

const ULTS = {
  confucius: { cost: 100, total: 60, tick(f, o, t) {
    if (t === 20) proj(f, { type: 'wave', x: f.x + f.face * 60, y: f.y - 80, vx: f.face * 7, w: 200, h: 200, dmg: 28, kb: 14, stun: 34, hs: 12, launch: -7, life: 120, pierce: true, color: '#7fc4ff', glyph: '仁', gain: 0 });
  } },
  zhuangzi: { cost: 100, total: 60, tick(f, o, t) { if (t === 20) butterflies(f, 8, 4, 70); } },
  hanfei: { cost: 100, total: 150, tick(f, o, t) { if (t >= 20 && t <= 120 && (t - 20) % 25 === 0) pillarAt(f, o, 6, 18, 20); } },
  mozi: { cost: 100, total: 64, tick(f, o, t) {
    if (t === 20) {
      heal(f, 20); f.shield = 2;
      proj(f, { type: 'wave', x: f.x + f.face * 60, y: f.y - 80, vx: f.face * 6, w: 190, h: 190, dmg: 18, kb: 12, stun: 30, hs: 10, launch: -6, life: 110, pierce: true, color: '#ffcf70', glyph: '非', gain: 0 });
    }
  } },
  sunzi: { cost: 100, total: 112, tick(f, o, t) {
    if (t === 1) f.invuln = 112;
    if (t === 18) {
      const dir = Math.sign(o.x - f.x) || f.face;
      f.x = clamp(o.x + dir * 70, 40, W - 40); f.face = -dir;
      spawn('ink', f.x, f.y - 60, 16, '#1a1410', 8, 8, 30);
    }
    if (t >= 24 && t <= 94 && (t - 24) % 14 === 0) { slashAt(f, o, ((t - 24) / 14) % 2 ? 0.6 : -0.6); Sound.play('light'); }
  } },
  gongsun: { cost: 100, total: 96, tick(f, o, t) { if (t === 20 || t === 44 || t === 68) horse(f, 10); } },
};

function beginCast(f, kind) {
  const o = opp(f);
  const spec = (kind === 'ult' ? ULTS : SPECIALS)[f.ch.id];
  f.state = 'cast'; f.t = 0; f.hitDone = false; f.move = null;
  f.cast = { kind, spec };
  f.meter -= spec.cost;
  f.face = Math.sign(o.x - f.x) || f.face;
  Sound.play('special');
  floatText(f.ch.special.name, f.x, f.y - 150, f.ch.accent, 26);
  if (kind === 'ult') f.vx = 0;
}

function requestUlt(f) {
  if (G.cutin) return;
  G.cutin = { f, t: 0 };
  f.state = 'cast'; f.cast = { kind: 'pre' }; f.t = 0; f.vx = 0; f.invuln = 90;
  Sound.play('cutin');
}

// ---------------------------------------------------------------- 파이터 갱신

function tickFighter(f, o) {
  const I = G.phase === 'fight' ? f.ctl(f, o) : NEUTRAL;
  f.anim++; f.t++;
  if (f.invuln > 0) f.invuln--;
  if (f.counter > 0) f.counter--;
  if (f.comboT > 0 && --f.comboT === 0) f.combo = 0;
  f.hpShow += (f.hp - f.hpShow) * 0.08;
  const ground = f.y >= GY;

  if (f.state === 'ko') {
    // 물리만
  } else if (f.state === 'hit') {
    if (--f.stun <= 0 && ground) { f.state = 'idle'; f.t = 0; }
  } else if (f.state === 'atk') {
    const m = f.move;
    if (!f.hitDone && f.t >= m.startup && f.t < m.startup + m.active && meleeHit(f, o, m)) f.hitDone = true;
    if (f.hitDone && f.t > m.startup + 1) { // 캔슬
      if (I.heavy && m.kind === 'light') startAttack(f, 'heavy');
      else if (I.special && f.meter >= 50) beginCast(f, 'special');
    }
    // 점프 공격은 착지하면 후딜 없이 바로 풀린다
    if (f.state === 'atk' && (f.t >= m.startup + m.active + m.rec || (m.air && ground && f.t >= m.startup + m.active))) { f.state = 'idle'; f.t = 0; }
    if (!ground && (I.l || I.r)) f.vx = (I.r - I.l) * f.ch.speed * f.spd * 0.7;
  } else if (f.state === 'cast') {
    const c = f.cast;
    if (c && c.spec) {
      c.spec.tick(f, o, f.t);
      if (f.t >= c.spec.total) { f.state = 'idle'; f.t = 0; f.lunge = false; f.cast = null; f.counter = 0; }
    }
  } else if (f.state === 'win') {
    // 대기
  } else { // idle / walk / block
    if (ground) f.face = Math.sign(o.x - f.x) || f.face;
    if (I.ult && f.meter >= 100 && ground) requestUlt(f);
    else if (I.special && f.meter >= 50) beginCast(f, 'special');
    else if (I.heavy && (ground || !f.airAtk)) startAttack(f, 'heavy');
    else if (I.light && (ground || !f.airAtk)) startAttack(f, 'light');
    else if (ground && I.block) { f.state = 'block'; f.vx = 0; }
    else {
      if (ground && I.u) { f.vy = f.ch.jump; Sound.play('jump'); dust(f.x, f.y, 5); }
      const mv = I.r - I.l;
      if (ground) { f.vx = mv * f.ch.speed * f.spd; f.state = mv ? 'walk' : 'idle'; if (mv && f.anim % 11 === 0) dust(f.x - mv * 10, f.y, 1); }
      else if (mv) f.vx = mv * f.ch.speed * f.spd * 0.8;
      if (!ground) f.state = 'idle';
    }
  }

  // 잔상: 돌진/순간이동 중에만 남긴다
  if (f.flash > 0) f.flash--;
  const fast = f.lunge || (f.state === 'cast' && f.cast && f.cast.kind === 'ult' && f.ch.id === 'sunzi');
  if (fast && f.anim % 2 === 0) f.ghosts.push({ x: f.x, y: f.y, face: f.face, state: f.state, t: f.t, anim: f.anim, move: f.move, ch: f.ch, life: 12 });
  for (const gh of f.ghosts) gh.life--;
  if (f.ghosts.length && f.ghosts[0].life <= 0) f.ghosts = f.ghosts.filter(gh => gh.life > 0);

  // 물리
  if (f.y < GY || f.vy < 0) f.vy += 0.72;
  const fallV = f.vy;
  f.y += f.vy;
  if (f.y >= GY) {
    if (fallV > 5 && f.state !== 'ko') dust(f.x, GY, 6);
    f.y = GY; f.vy = 0; f.airAtk = false;
  }
  f.x += f.vx;
  if (f.y >= GY && f.state !== 'walk' && !f.lunge) f.vx *= f.state === 'ko' ? 0.9 : 0.8;
  f.x = clamp(f.x, 34, W - 34);
}

function separate() {
  const [a, b] = G.p;
  if (a.y < GY - 40 || b.y < GY - 40 || a.lunge || b.lunge) return;
  const d = b.x - a.x, min = 46;
  if (Math.abs(d) < min) {
    const push = (min - Math.abs(d)) / 2 * (d >= 0 ? 1 : -1);
    a.x = clamp(a.x - push, 34, W - 34); b.x = clamp(b.x + push, 34, W - 34);
  }
}

function tickProjs() {
  for (const p of G.projs) {
    if (p.delay > 0) { p.delay--; continue; }
    const owner = p.owner, def = opp(owner);
    p.life--;
    if (p.home) {
      p.vx += clamp((def.x - p.x) * 0.01, -0.25, 0.25);
      p.vx = clamp(p.vx, -5.5, 5.5);
      p.vy += clamp((def.y - 60 - p.y) * 0.02, -0.4, 0.4) + Math.sin(G.t * 0.2 + p.seed) * 0.12;
      p.vy = clamp(p.vy, -4, 4);
    }
    p.x += p.vx; p.y += p.vy;
    if (!p.hit) {
      let hitbox;
      if (p.type === 'pillar') hitbox = p.life > p.maxLife - 6 ? [p.x - p.w / 2, GY - p.h, p.x + p.w / 2, GY] : null;
      else if (p.type === 'slash') hitbox = p.life > p.maxLife - 3 ? [p.x - 45, GY - 125, p.x + 45, GY] : null;
      else hitbox = [p.x - p.w / 2, p.y - p.h / 2, p.x + p.w / 2, p.y + p.h / 2];
      if (hitbox && hitbox[0] < def.x + HURT_HW && hitbox[2] > def.x - HURT_HW && hitbox[1] < def.y && hitbox[3] > def.y - HURT_H) {
        if (resolveHit(owner, def, p)) { p.hit = true; if (!p.pierce && p.type !== 'pillar' && p.type !== 'slash') p.life = 0; }
      }
    }
    if (p.x < -150 || p.x > W + 150) p.life = 0;
  }
  G.projs = G.projs.filter(p => p.life > 0);
}

function tickParts() {
  for (const p of G.parts) { p.x += p.vx; p.y += p.vy; p.vy += p.grav; p.vx *= 0.96; p.life--; }
  G.parts = G.parts.filter(p => p.life > 0);
}

// ---------------------------------------------------------------- AI (난이도별)

function aiCtl(D) {
  const st = { planT: 0, plan: 'wait', blk: 0, cool: 0, dodge: 0, dodgeDir: 0, seen: new WeakSet() };
  return (f, o) => {
    const I = { l: 0, r: 0, u: 0, block: 0, light: 0, heavy: 0, special: 0, ult: 0 };
    const dx = o.x - f.x, d = Math.abs(dx), dir = Math.sign(dx) || f.face;
    const toward = () => { if (dir > 0) I.r = 1; else I.l = 1; };
    const away = () => { if (dir > 0) I.l = 1; else I.r = 1; };
    const ground = f.y >= GY;
    const act = f.state === 'idle' || f.state === 'walk' || f.state === 'block';
    const coolSet = base => { st.cool = Math.round((base + (Math.random() * 14 | 0)) * D.cool); };
    if (st.cool > 0) st.cool--;

    // 공격 중: 적중하면 연계로 이어간다
    if (f.state === 'atk') {
      if (f.hitDone && Math.random() < D.combo * 0.35) { if (f.meter >= 50 && Math.random() < 0.5) I.special = 1; else I.heavy = 1; }
      return I;
    }
    if (!act) return I;

    // 위협 감지: 상대 공격의 첫 프레임마다 한 번만 막을지 굴린다
    if (o.state === 'atk' && o.move && o.t <= 2 && d < o.move.reach + 70 && !st.seen.has(o.move)) {
      st.seen.add(o.move);
      if (Math.random() < D.react) st.blk = o.move.startup + o.move.active + 3;
    }
    // 투사체 / 형벌 기둥
    for (const p of G.projs) {
      if (p.owner === f || p.hit || st.seen.has(p)) continue;
      if (p.type === 'pillar' || p.type === 'slash') {
        if (Math.abs(p.x - f.x) < 80 && Math.random() < D.proj) { st.seen.add(p); st.dodge = 22; st.dodgeDir = f.x >= p.x ? 1 : -1; }
      } else if (p.delay <= 0 && Math.abs(p.x - f.x) < 230 && Math.sign(p.vx) === -Math.sign(p.x - f.x)) {
        st.seen.add(p);
        if (Math.random() < D.proj) { if (ground && Math.random() < 0.5) I.u = 1; else st.blk = 22; }
      }
    }
    if (st.dodge > 0) { st.dodge--; if (st.dodgeDir > 0) I.r = 1; else I.l = 1; return I; }
    if (st.blk > 0 && ground) { st.blk--; I.block = 1; return I; }

    // 극의 / 필살기
    if (f.meter >= 100 && d < 420 && st.cool === 0 && Math.random() < D.ult) { I.ult = 1; coolSet(60); return I; }
    if (f.meter >= 50 && d > 120 && d < 360 && st.cool === 0 && Math.random() < D.ult * 1.2) { I.special = 1; coolSet(50); return I; }
    // 빈틈 응징 / 대공
    if (o.state === 'atk' && o.move && o.t > o.move.startup + o.move.active && d < o.move.reach + 40 && st.cool === 0 && Math.random() < D.punish * 0.25) {
      if (d < 100) I.heavy = 1; else toward();
      coolSet(30); return I;
    }
    if (o.y < GY - 40 && d < 140 && st.cool === 0 && Math.random() < D.anti * 0.2) { I.heavy = 1; coolSet(30); return I; }
    if (!ground && !f.airAtk && d < 110 && st.cool === 0 && Math.random() < 0.1) { I.light = 1; coolSet(20); return I; } // 점프 공격

    // 일반 계획
    if (--st.planT <= 0) {
      const r = Math.random();
      if (d > 260) st.plan = r < 0.65 ? 'approach' : r < 0.85 ? 'special' : 'wait';
      else if (d > 130) st.plan = r < 0.4 ? 'approach' : r < 0.6 ? 'poke' : r < 0.75 ? 'wait' : r < 0.9 ? 'special' : 'back';
      else st.plan = r < 0.4 ? 'poke' : r < 0.58 ? 'heavy' : r < 0.74 ? 'back' : r < 0.86 ? 'guard' : 'jump';
      st.planT = Math.round((18 + (Math.random() * 28 | 0)) * D.think);
    }
    switch (st.plan) {
      case 'approach': toward(); break;
      case 'back': away(); break;
      case 'guard': I.block = 1; break;
      case 'jump': if (ground) { I.u = 1; toward(); } st.plan = 'wait'; break;
      case 'poke':
        if (d > 85) toward(); else if (st.cool === 0) { I.light = 1; coolSet(26); }
        break;
      case 'heavy':
        if (d > 105) toward(); else if (st.cool === 0) { I.heavy = 1; coolSet(40); }
        break;
      case 'special':
        if (f.meter >= 50 && st.cool === 0) { I.special = 1; coolSet(50); } else st.plan = 'approach';
        break;
    }
    return I;
  };
}

// ---------------------------------------------------------------- 장면 전환

function startFight(playerChar) {
  const others = CHARS.filter(c => c !== playerChar);
  const enemyChar = others[Math.floor(Math.random() * others.length)];
  const D = DIFFS[G.diff];
  const enemy = mkFighter(enemyChar, 1, aiCtl(D));
  enemy.maxhp = enemy.hp = enemy.hpShow = Math.round(enemyChar.hp * D.hp);
  enemy.spd = D.speed; enemy.dmgMul = D.dmg; enemy.meterMul = D.meter;
  G.p = [mkFighter(playerChar, 0, humanCtl), enemy];
  G.stage = enemyChar.stage;
  G.projs = []; G.parts = []; G.cutin = null; G.hitstop = 0; G.shake = 0; G.flash = 0;
  G.phase = 'intro'; G.phaseT = 0; G.timer = FIGHT_SECONDS * 60; G.winner = null; G.timeout = false;
  setScene('fight');
  Sound.play('gong');
}

function finishFight() {
  const [me, en] = G.p;
  const draw = G.timeout && !G.winner;
  G.result = {
    win: G.winner === me, draw, me, en, diff: DIFFS[G.diff],
    time: Math.round((FIGHT_SECONDS * 60 - G.timer) / 60),
  };
  setScene('result');
  Sound.play(G.result.win ? 'win' : 'gong');
}

// ---------------------------------------------------------------- 갱신

const CARD = { w: 140, h: 190, gap: 12, x0: 30, y: 84 };
const cardX = i => CARD.x0 + i * (CARD.w + CARD.gap);
const diffChip = i => ({ x: 290 + i * 92, y: 14, w: 86, h: 34 });

function updateTitle() {
  if (G.sceneT > 20 && (Input.anyPress)) { Sound.play('confirm'); G.sel = 0; G.selT = 0; setScene('select'); }
}

function updateSelect() {
  G.selT++;
  const n = CHARS.length;
  if (tapped('left')) { G.sel = (G.sel + n - 1) % n; Sound.play('select'); }
  if (tapped('right')) { G.sel = (G.sel + 1) % n; Sound.play('select'); }
  const nd = DIFFS.length;
  if (tapped('up')) { G.diff = (G.diff + nd - 1) % nd; saveDiff(); Sound.play('select'); }
  if (tapped('block')) { G.diff = (G.diff + 1) % nd; saveDiff(); Sound.play('select'); }
  if (Input.click) {
    const { x, y } = Input.click;
    for (let i = 0; i < nd; i++) {
      const c = diffChip(i);
      if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) { G.diff = i; saveDiff(); Sound.play('select'); Input.click = null; return; }
    }
    for (let i = 0; i < n; i++) {
      if (x >= cardX(i) && x <= cardX(i) + CARD.w && y >= CARD.y && y <= CARD.y + CARD.h) {
        if (G.sel === i) { Sound.play('confirm'); startFight(CHARS[i]); return; }
        G.sel = i; Sound.play('select');
      }
    }
  }
  if (G.sceneT > 15 && confirmPressed()) { Sound.play('confirm'); startFight(CHARS[G.sel]); return; }
  if (G.selT >= SELECT_SECONDS * 60) { startFight(CHARS[G.sel]); }
}

function updateFight() {
  if (G.flash > 0) G.flash--;
  if (G.shake > 0) G.shake *= 0.85;
  if (G.cutin) {
    if (++G.cutin.t >= 85) { const f = G.cutin.f; G.cutin = null; f.invuln = 0; beginCast(f, 'ult'); }
    return;
  }
  if (G.hitstop > 0) { G.hitstop--; return; }

  G.phaseT++;
  if (G.phase === 'intro' && G.phaseT >= 110) { G.phase = 'fight'; G.phaseT = 0; }
  if (G.phase === 'fight') {
    G.timer--;
    if (G.timer <= 0) {
      const [a, b] = G.p, ra = a.hp / a.maxhp, rb = b.hp / b.maxhp;
      endFight(Math.abs(ra - rb) < 0.001 ? null : (ra > rb ? a : b), true);
      Sound.play('gong');
    }
  }
  const [a, b] = G.p;
  tickFighter(a, b); tickFighter(b, a);
  separate();
  tickProjs();
  tickParts();
  if (G.phase === 'ko') {
    if (G.phaseT === 70 && G.winner && G.winner.state !== 'ko') { G.winner.state = 'win'; G.winner.vx = 0; }
    if (G.phaseT >= 190) finishFight();
  }
}

function updateResult() {
  const left = RESULT_SECONDS * 60 - G.sceneT;
  if ((G.sceneT > 60 && confirmPressed()) || Input.click && G.sceneT > 60 || left <= 0) { setScene('title'); }
}

function update() {
  G.t++; G.sceneT++;
  switch (G.scene) {
    case 'title': updateTitle(); break;
    case 'select': updateSelect(); break;
    case 'fight': updateFight(); break;
    case 'result': updateResult(); break;
  }
  if (Input.pressed.Escape && G.scene !== 'title') setScene('title');
  Input.pressed = {}; Input.anyPress = false; Input.click = null;
}

// ---------------------------------------------------------------- 그리기

function wrapText(text, x, y, maxW, lh, color, size, align = 'left') {
  g.font = '400 ' + size + 'px ' + FONT; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'top';
  const words = text.split(' '); let line = '', yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) { g.fillText(line, x, yy); line = w; yy += lh; } else line = test;
  }
  g.fillText(line, x, yy);
  return yy + lh;
}

function dummy(ch, x, y, face, extra) {
  return Object.assign({ ch, x, y, face, state: 'idle', t: 0, anim: G.t, move: null, invuln: 0, counter: 0, shield: 0, vx: 0, vy: 0 }, extra);
}

function panel(x, y, w, h, alpha = 0.6) {
  g.fillStyle = 'rgba(14,10,8,' + alpha + ')'; g.fillRect(x, y, w, h);
  g.strokeStyle = 'rgba(233,196,106,.55)'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

function drawTitle() {
  g.drawImage(getBackground('academy'), 0, 0);
  drawAmbient(g, 'academy', G.t);
  const a = dummy(G.attract[0], 250, GY, 1, { anim: G.t });
  const b = dummy(G.attract[1], 710, GY, -1, { anim: G.t + 30 });
  const cyc = G.t % 160;
  if (cyc > 100 && cyc < 116) { a.state = 'atk'; a.move = getMove(a, 'heavy'); a.t = cyc - 100; }
  drawFighter(g, a, 1.15); drawFighter(g, b, 1.15);
  g.fillStyle = 'rgba(12,8,6,.5)'; g.fillRect(0, 70, W, 250);
  inkText(g, '百家爭鳴', W / 2, 150, 120, '#f3e6c4', '#1a0f0a', 12);
  inkText(g, '전국난투', W / 2, 250, 58, '#e9c46a', '#1a0f0a', 8);
  inkText(g, '제자백가 90초 대결', W / 2, 300, 22, '#f3e6c4', '#1a0f0a', 5);
  if (Math.floor(G.t / 30) % 2 === 0) inkText(g, '아무 키나 누르거나 화면을 터치하세요', W / 2, 395, 26, '#fff', '#1a0f0a', 6);
  inkText(g, PROMO.club, W / 2, 500, 18, '#e9c46a', '#1a0f0a', 4);
}

function drawSelect() {
  g.drawImage(getBackground('mist'), 0, 0);
  g.fillStyle = 'rgba(12,8,6,.55)'; g.fillRect(0, 0, W, H);
  const left = Math.max(0, Math.ceil(SELECT_SECONDS - G.selT / 60));
  inkText(g, '학파를 고르시오', 30, 36, 28, '#f3e6c4', '#000', 6, 'left');
  inkText(g, left + '초', W - 30, 36, 28, left <= 3 ? '#ff7a6b' : '#e9c46a', '#000', 6, 'right');
  DIFFS.forEach((D, i) => {
    const c = diffChip(i), on = i === G.diff;
    g.fillStyle = on ? D.color : 'rgba(20,14,10,.75)'; g.fillRect(c.x, c.y, c.w, c.h);
    g.strokeStyle = on ? '#fff' : 'rgba(233,196,106,.45)'; g.lineWidth = on ? 3 : 2; g.strokeRect(c.x, c.y, c.w, c.h);
    inkText(g, D.name, c.x + c.w / 2, c.y + c.h / 2 + 1, 18, on ? '#1a1008' : '#cbbd9a', on ? 'rgba(255,255,255,.0)' : '#000', 0);
  });
  inkText(g, '난이도 ▲▼ (W/S)', 290, 62, 11, '#9a8e72', '#000', 3, 'left');
  CHARS.forEach((ch, i) => {
    const x = cardX(i), sel = i === G.sel;
    const grad = g.createLinearGradient(0, CARD.y, 0, CARD.y + CARD.h);
    grad.addColorStop(0, sel ? '#4a3a26' : '#2a2018'); grad.addColorStop(1, sel ? '#2a1e12' : '#17110c');
    g.fillStyle = grad; g.fillRect(x, CARD.y - (sel ? 8 : 0), CARD.w, CARD.h + (sel ? 8 : 0));
    g.strokeStyle = sel ? '#ffd86b' : 'rgba(233,196,106,.35)'; g.lineWidth = sel ? 4 : 2;
    g.strokeRect(x, CARD.y - (sel ? 8 : 0), CARD.w, CARD.h + (sel ? 8 : 0));
    const f = dummy(ch, x + CARD.w / 2, CARD.y + 135, 1, { anim: G.t + i * 10 });
    if (sel && G.t % 120 > 90 && G.t % 120 < 106) { f.state = 'atk'; f.move = getMove(f, 'heavy'); f.t = G.t % 120 - 90; }
    g.save(); g.beginPath(); g.rect(x, CARD.y - 8, CARD.w, CARD.h + 8); g.clip();
    drawFighter(g, f, 0.85, { noShadow: true });
    g.restore();
    inkText(g, ch.hanja, x + CARD.w / 2, CARD.y + 160, 26, sel ? '#ffd86b' : '#f3e6c4', '#000', 4);
    inkText(g, ch.school, x + CARD.w / 2, CARD.y + 182, 14, '#cbbd9a', '#000', 3);
  });
  const ch = CHARS[G.sel];
  panel(30, 292, W - 60, 214, 0.7);
  inkText(g, ch.hanja + ' ' + ch.name, 56, 322, 32, ch.accent, '#000', 5, 'left');
  inkText(g, ch.schoolHanja + ' · ' + ch.school, 56 + 220, 324, 18, '#cbbd9a', '#000', 3, 'left');
  inkText(g, ch.quote, 56, 366, 28, '#f3e6c4', '#000', 5, 'left');
  wrapText(ch.quoteKo, 56, 390, 420, 22, '#d8caa4', 15);
  wrapText(ch.desc, 56, 440, 420, 22, '#f3e6c4', 16);
  inkText(g, '필살기  ' + ch.special.name, 510, 322, 20, '#ffd86b', '#000', 4, 'left');
  wrapText(ch.special.ko + ' — ' + ch.special.desc, 510, 340, 390, 20, '#f3e6c4', 14);
  inkText(g, '극의  ' + ch.ult.name, 510, 398, 20, '#ff9a6b', '#000', 4, 'left');
  wrapText(ch.ult.ko + ' — ' + ch.ult.desc, 510, 416, 390, 20, '#f3e6c4', 14);
  const D = DIFFS[G.diff];
  inkText(g, '난이도 ' + D.hanja + ' ' + D.name, 56, 488, 16, D.color, '#000', 4, 'left');
  wrapText(D.desc, 150, 481, 330, 16, '#cbbd9a', 12);
  wrapText('◀ ▶ / A D 학파 선택 · J 또는 Enter 결정 · 카드를 한 번 더 누르면 결정', 510, 468, 390, 18, '#9a8e72', 12);
}

function drawHud() {
  const [a, b] = G.p;
  const barW = 370, y = 22;
  [[a, 30, 1], [b, W - 30, -1]].forEach(([f, x0, dir]) => {
    const bx = dir > 0 ? x0 : x0 - barW;
    g.fillStyle = 'rgba(10,8,6,.75)'; g.fillRect(bx - 3, y - 3, barW + 6, 24);
    const hpw = barW * clamp(f.hp / f.maxhp, 0, 1), sw = barW * clamp(f.hpShow / f.maxhp, 0, 1);
    const drawBar = (w, col) => { g.fillStyle = col; g.fillRect(dir > 0 ? bx : bx + barW - w, y, w, 18); };
    drawBar(sw, '#a8372c'); drawBar(hpw, f.hp / f.maxhp < 0.3 ? '#e8742c' : '#e9c46a');
    g.strokeStyle = '#f3e6c4'; g.lineWidth = 2; g.strokeRect(bx - 3, y - 3, barW + 6, 24);
    // 기(氣) 게이지
    const my = y + 30, mw = barW * 0.7, mx = dir > 0 ? x0 : x0 - mw;
    g.fillStyle = 'rgba(10,8,6,.75)'; g.fillRect(mx - 2, my - 2, mw + 4, 12);
    const fw = mw * f.meter / 100;
    g.fillStyle = f.meter >= 100 ? (G.t % 10 < 5 ? '#ff9a6b' : '#ffd86b') : f.meter >= 50 ? '#8fd0ff' : '#4a7fa8';
    g.fillRect(dir > 0 ? mx : mx + mw - fw, my, fw, 8);
    g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(mx + mw / 2 - 1, my - 2, 2, 12);
    inkText(g, f.ch.hanja + ' ' + f.ch.name, x0, y + 62, 20, '#f3e6c4', '#000', 4, dir > 0 ? 'left' : 'right');
  });
  // 타이머
  const sec = Math.max(0, Math.ceil(G.timer / 60));
  g.fillStyle = 'rgba(10,8,6,.8)'; g.beginPath(); g.arc(W / 2, 40, 30, 0, 7); g.fill();
  g.strokeStyle = '#e9c46a'; g.lineWidth = 3; g.stroke();
  inkText(g, String(sec), W / 2, 42, 32, sec <= 10 ? '#ff7a6b' : '#f3e6c4', '#000', 0);
  const D = DIFFS[G.diff];
  inkText(g, D.hanja + ' ' + D.name, W / 2, 84, 14, D.color, '#000', 4);
  // 조작 안내
  const me = a, show = G.t < 60 * 8 || G.phase === 'intro';
  g.globalAlpha = show ? 0.95 : 0.4;
  inkText(g, 'A D 이동 · W 점프 · S 방어 · J 약공격 · K 강공격 · L 필살기(기 50) · U 극의(기 100)', W / 2, H - 16, 15, '#f3e6c4', '#000', 4);
  g.globalAlpha = 1;
  if (me.meter >= 100 && G.phase === 'fight') inkText(g, 'U — 극의 발동!', 30, 128, 20, '#ff9a6b', '#000', 4, 'left');
  else if (me.meter >= 50 && G.phase === 'fight') inkText(g, 'L — 필살기 가능', 30, 128, 18, '#8fd0ff', '#000', 4, 'left');
  if (a.combo >= 2) inkText(g, a.combo + ' 연타!', 30, 160, 34, '#ffd86b', '#000', 6, 'left');
}

function drawCutin() {
  const c = G.cutin, f = c.f, ch = f.ch, k = c.t / 85;
  const slide = Math.min(1, c.t / 10), out = k > 0.85 ? (k - 0.85) / 0.15 : 0;
  g.save();
  g.fillStyle = 'rgba(0,0,0,' + 0.55 * (1 - out) + ')'; g.fillRect(0, 0, W, H);
  g.translate(0, 0);
  g.fillStyle = ch.color; g.globalAlpha = 0.92 * (1 - out);
  g.beginPath(); g.moveTo(0, 150); g.lineTo(W * slide, 120); g.lineTo(W * slide, 400); g.lineTo(0, 370); g.closePath(); g.fill();
  g.globalAlpha = 1 - out;
  g.strokeStyle = ch.accent; g.lineWidth = 4; g.stroke();
  const fx = lerp(-200, 170, ease(slide));
  drawFighter(g, dummy(ch, fx, 380, 1, { state: 'cast', t: 30, anim: G.t, cast: null }), 2.2, { noShadow: true });
  inkText(g, ch.ult.name, W * 0.64, 235, 110, '#fff', '#000', 12);
  inkText(g, ch.ult.ko, W * 0.64, 318, 36, ch.accent, '#000', 6);
  inkText(g, ch.quote, W / 2, 440, 28, '#f3e6c4', '#000', 6);
  g.restore();
}

function drawFight() {
  g.save();
  const sh = G.shake;
  if (sh > 0.5) g.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
  const [a, b] = G.p;
  if (G.phase === 'ko' && G.winner) { // 결정타 줌인
    const loser = G.winner === a ? b : a;
    const z = 1 + 0.14 * ease(clamp(G.phaseT / 24, 0, 1)) * (1 - clamp((G.phaseT - 120) / 60, 0, 1));
    const fx = clamp(loser.x, W * 0.25, W * 0.75), fy = GY - 70;
    g.translate(fx, fy); g.scale(z, z); g.translate(-fx, -fy);
  }
  g.drawImage(getBackground(G.stage), 0, 0);
  drawAmbient(g, G.stage, G.t);
  for (const f of G.p) for (const gh of f.ghosts) drawFighter(g, Object.assign({}, gh, { invuln: 0, counter: 0, shield: 0, flash: 0 }), 1, { alpha: 0.3 * gh.life / 12, noShadow: true, noTrail: true });
  const order = a.state === 'atk' || a.state === 'cast' ? [b, a] : [a, b];
  order.forEach(f => drawFighter(g, f));
  for (const p of G.projs) drawProj(g, p, G.t);
  drawParticles(g, G.parts);
  g.restore();
  if (a.hp / a.maxhp < 0.3 && G.phase === 'fight') { // 위기 비네트
    const pulse = 0.25 + 0.15 * Math.sin(G.t * 0.15);
    const vg = g.createRadialGradient(W / 2, H / 2, 260, W / 2, H / 2, 620);
    vg.addColorStop(0, 'rgba(160,20,20,0)'); vg.addColorStop(1, 'rgba(160,20,20,' + pulse + ')');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }
  drawHud();

  if (G.phase === 'intro') {
    if (G.phaseT < 55) {
      inkText(g, a.ch.hanja + '  對  ' + b.ch.hanja, W / 2, 230, 64, '#f3e6c4', '#000', 10);
      inkText(g, b.ch.school + '의 ' + b.ch.name + '이(가) 도전한다', W / 2, 290, 24, '#e9c46a', '#000', 5);
      inkText(g, '난이도 ' + DIFFS[G.diff].hanja + ' ' + DIFFS[G.diff].name, W / 2, 330, 20, DIFFS[G.diff].color, '#000', 5);
    } else {
      const s = 1 + Math.max(0, 70 - G.phaseT) * 0.03;
      inkText(g, '開戰!', W / 2, 250, 120 * s, '#ffd86b', '#3a0e0a', 14);
    }
  }
  if (G.phase === 'ko') {
    const s = 1 + Math.max(0, 30 - G.phaseT) * 0.05;
    inkText(g, G.timeout ? '時間終了' : '擊破!', W / 2, 240, 110 * s, '#ff7a6b', '#000', 14);
    if (G.timeout) inkText(g, G.winner ? G.winner.ch.name + ' 판정승' : '무승부', W / 2, 310, 30, '#f3e6c4', '#000', 6);
  }
  if (G.flash > 0) { g.fillStyle = 'rgba(255,255,255,' + G.flash / 18 + ')'; g.fillRect(0, 0, W, H); }
  if (G.cutin) drawCutin();
}

function drawResult() {
  const R = G.result, me = R.me, en = R.en;
  g.drawImage(getBackground(me.ch.stage), 0, 0);
  g.fillStyle = 'rgba(10,7,5,.72)'; g.fillRect(0, 0, W, H);
  const big = R.draw ? '分' : R.win ? '勝' : '敗';
  const col = R.draw ? '#cbbd9a' : R.win ? '#ffd86b' : '#9a9a9a';
  inkText(g, big, 150, 130, 190, col, '#000', 14);
  const hail = R.diff.id === 'impossible' ? '천하무적! 불가능을 꺾었다!' : R.diff.id === 'expert' ? '천하에 이름을 떨쳤다!' : '천하 제일의 논객!';
  inkText(g, R.draw ? '무승부' : R.win ? hail : '아쉽게 패배했습니다', 300, 70, 34, col, '#000', 6, 'left');
  inkText(g, me.ch.name + ' (' + me.ch.school + ')  vs  ' + en.ch.name + ' (' + en.ch.school + ')', 300, 118, 20, '#f3e6c4', '#000', 4, 'left');
  inkText(g, '난이도 ' + R.diff.hanja + ' ' + R.diff.name + '  ·  입힌 피해 ' + me.dmgDealt + '  ·  최대 연타 ' + me.maxCombo + '  ·  전투 ' + R.time + '초', 300, 152, 18, '#cbbd9a', '#000', 4, 'left');

  drawFighter(g, dummy(me.ch, 150, 330, 1, { anim: G.t, state: R.win ? 'win' : 'idle' }), 1.5);

  panel(300, 182, 630, 128, 0.7);
  inkText(g, me.ch.quote, 330, 218, 34, '#f3e6c4', '#000', 6, 'left');
  wrapText(me.ch.quoteKo, 330, 246, 570, 22, '#d8caa4', 16);
  wrapText('당신이 고른 ' + me.ch.school + '(' + me.ch.schoolHanja + ') — ' + me.ch.desc, 330, 274, 570, 20, '#f3e6c4', 14);
  wrapText((R.win ? '논파한 ' : '맞선 ') + en.ch.school + '의 말: ' + en.ch.quote + ' — ' + en.ch.quoteKo, 330, 292, 570, 20, '#9a8e72', 12);

  panel(30, 360, W - 60, 150, 0.78);
  inkText(g, PROMO.club, 56, 392, 32, '#ffd86b', '#000', 6, 'left');
  wrapText(PROMO.line, 56, 418, 600, 24, '#f3e6c4', 18);
  wrapText(PROMO.cta, 56, 448, 600, 24, '#e9c46a', 18);
  if (PROMO.contact) wrapText(PROMO.contact, 56, 478, 840, 22, '#9fd0ff', 16);
  const left = Math.max(0, Math.ceil(RESULT_SECONDS - G.sceneT / 60));
  inkText(g, left + '초 후 처음으로', W - 56, 392, 18, '#cbbd9a', '#000', 4, 'right');
  if (Math.floor(G.t / 30) % 2 === 0 && G.sceneT > 60) inkText(g, '아무 키나 눌러 다시 도전', W - 56, 422, 18, '#fff', '#000', 4, 'right');
}

function render() {
  g.clearRect(0, 0, W, H);
  switch (G.scene) {
    case 'title': drawTitle(); break;
    case 'select': drawSelect(); break;
    case 'fight': drawFight(); break;
    case 'result': drawResult(); break;
  }
  if (Sound.muted) inkText(g, '🔇 M', W - 16, H - 14, 14, '#9a8e72', '#000', 3, 'right');
}

// ---------------------------------------------------------------- 메인 루프

let last = performance.now(), acc = 0;
const STEP = 1000 / 60;
function frame(now) {
  const dt = Math.min(50, now - last); last = now;
  acc += dt * (G.scene === 'fight' && G.phase === 'ko' && G.phaseT < 60 ? 0.4 : 1);
  while (acc >= STEP) { update(); acc -= STEP; }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 자동 테스트용 훅
window.__game = { G, startFight, CHARS, setScene, update };
