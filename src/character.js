'use strict';

// 캐릭터 그리기. 먹선 윤곽 + 음영 + 학파별 복식/소품.
// 로컬 좌표: 발 밑이 (0,0), 앞쪽이 +x, 위쪽이 -y. 좌우 반전은 drawFighter 의 scale 에서 처리한다.

const INK = '#1a1410';
const SKIN = '#f3d6b3', SKIN_SH = '#dcb690', SKIN_DK = '#b98f68';

// 학파별 의복 색과 스타일
const LOOK = {
  confucius: { pants: '#2a2a32', shoe: '#1b1612', inner: '#f2ecdc', trim: '#e9c46a', hem: '#183a52', sleeve: 'wide', belt: '#1a1a22' },
  zhuangzi:  { pants: '#d8d2bc', shoe: '#8a6a3a', inner: '#efe9d6', trim: '#bfe0c6', hem: '#3f6e57', sleeve: 'wide', belt: '#8a6a3a' },
  hanfei:    { pants: '#1b1112', shoe: '#120c0c', inner: '#2a1618', trim: '#d9b64a', hem: '#17090b', sleeve: 'wide', belt: '#120a0b' },
  mozi:      { pants: '#6b5a46', shoe: '#a98a52', inner: '#8a7456', trim: '#b0392e', hem: '#3f3226', sleeve: 'short', belt: '#c9a96a', wraps: true },
  sunzi:     { pants: '#1d2433', shoe: '#2a1f14', inner: '#3a4a6a', trim: '#d4a017', hem: '#1b2230', sleeve: 'armor', belt: '#4a3418' },
  gongsun:   { pants: '#d9d5e6', shoe: '#3a3350', inner: '#f6f3ea', trim: '#c9c4e6', hem: '#6f6c8c', sleeve: 'wide', belt: '#f0ecde' },
};

function outline(g, fill, lw) {
  if (fill) { g.fillStyle = fill; g.fill(); }
  g.strokeStyle = INK; g.lineWidth = lw === undefined ? 1.6 : lw; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke();
}

function hgrad(g, x0, x1, c0, c1) {
  const gr = g.createLinearGradient(x0, 0, x1, 0);
  gr.addColorStop(0, c0); gr.addColorStop(1, c1);
  return gr;
}

// 두 마디 팔: 어깨 s → 팔꿈치 e → 손 h. 팔꿈치는 아래/뒤로 꺾는다.
function armPoints(sx, sy, ang, len) {
  const D = len * 0.93, a = len * 0.5;
  const hx = sx + Math.cos(ang) * D, hy = sy + Math.sin(ang) * D;
  const hh = Math.sqrt(Math.max(0, a * a - (D / 2) * (D / 2)));
  const mx = (sx + hx) / 2, my = (sy + hy) / 2;
  let nx = -Math.sin(ang), ny = Math.cos(ang);
  if (ny < -0.2 || (Math.abs(ny) <= 0.2 && nx > 0)) { nx = -nx; ny = -ny; }
  return { s: [sx, sy], e: [mx + nx * hh, my + ny * hh], h: [hx, hy] };
}

function tube(g, p, q, w0, w1, fill) {
  const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  g.beginPath();
  g.moveTo(p[0] + nx * w0, p[1] + ny * w0); g.lineTo(q[0] + nx * w1, q[1] + ny * w1);
  g.lineTo(q[0] - nx * w1, q[1] - ny * w1); g.lineTo(p[0] - nx * w0, p[1] - ny * w0); g.closePath();
  outline(g, fill, 1.5);
}

// 넓은 소매: 손목 아래로 늘어지는 자락(droop)이 있다.
function wideSleeve(g, A, base, trim, back) {
  const seg = (p, q) => { const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
  const n1 = seg(A.s, A.e), n2 = seg(A.e, A.h), nm = [(n1[0] + n2[0]) / 2, (n1[1] + n2[1]) / 2];
  const wS = 6.5, wE = 8, wH = 11.5, droop = back ? 6 : 9;
  const P = sgn => [
    [A.s[0] + n1[0] * wS * sgn, A.s[1] + n1[1] * wS * sgn],
    [A.e[0] + nm[0] * wE * sgn, A.e[1] + nm[1] * wE * sgn],
    [A.h[0] + n2[0] * wH * sgn, A.h[1] + n2[1] * wH * sgn],
  ];
  const up = P(1), lo = P(-1);
  g.beginPath();
  g.moveTo(up[0][0], up[0][1]); g.lineTo(up[1][0], up[1][1]); g.lineTo(up[2][0], up[2][1]);
  g.quadraticCurveTo(A.h[0] + (n2[0] > 0 ? 0 : 0), A.h[1] + droop * 2, lo[2][0], lo[2][1]);
  g.lineTo(lo[1][0], lo[1][1]); g.lineTo(lo[0][0], lo[0][1]); g.closePath();
  outline(g, base, 1.6);
  g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1.3; // 주름
  g.beginPath(); g.moveTo(A.s[0], A.s[1]); g.quadraticCurveTo(A.e[0], A.e[1] + 2, A.h[0], A.h[1] + droop * 0.6); g.stroke();
  g.strokeStyle = trim; g.lineWidth = 2.4; // 소맷부리 선
  g.beginPath(); g.moveTo(up[2][0], up[2][1]); g.quadraticCurveTo(A.h[0], A.h[1] + droop * 2, lo[2][0], lo[2][1]); g.stroke();
}

function hand(g, p, dir, r = 4.4) {
  g.beginPath(); g.arc(p[0] + dir[0] * 3, p[1] + dir[1] * 3, r, 0, 7); outline(g, SKIN, 1.4);
}

// 팔 전체를 그리고 손 위치와 방향을 돌려준다.
function drawArm(g, sx, sy, ang, len, ch, back) {
  const L = LOOK[ch.id], A = armPoints(sx, sy, ang, len);
  const base = back ? shade(ch.color, -36) : shade(ch.color, 8);
  const dx = A.h[0] - A.e[0], dy = A.h[1] - A.e[1], dl = Math.hypot(dx, dy) || 1, dir = [dx / dl, dy / dl];
  if (L.sleeve === 'short') { // 묵자: 소매를 걷어 맨팔이 드러난다
    tube(g, A.e, A.h, 5.4, 4.6, back ? SKIN_SH : SKIN);
    g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(A.e[0], A.e[1]); g.lineTo(A.h[0], A.h[1]); g.stroke();
    hand(g, A.h, dir);
    tube(g, A.s, A.e, 6.2, 6.8, base);
    g.strokeStyle = L.trim; g.lineWidth = 2.2; g.beginPath(); // 걷은 소맷단
    g.moveTo(A.e[0] - dir[1] * 7.2, A.e[1] + dir[0] * 7.2); g.lineTo(A.e[0] + dir[1] * 7.2, A.e[1] - dir[0] * 7.2); g.stroke();
  } else if (L.sleeve === 'armor') { // 손자: 가죽 소매와 청동 완갑
    tube(g, A.s, A.e, 6.4, 6.4, base);
    hand(g, A.h, dir);
    tube(g, A.e, A.h, 6.2, 5.6, shade('#2a3042', back ? -14 : 0));
    const b0 = [A.e[0] + dx * 0.35, A.e[1] + dy * 0.35];
    tube(g, b0, A.h, 7.2, 6.6, back ? '#8a6a26' : '#c2993f');
  } else {
    hand(g, A.h, dir);
    wideSleeve(g, A, base, L.trim, back);
  }
  return { h: A.h, e: A.e, dir };
}

function drawLeg(g, hipX, hipY, footX, footY, L) {
  g.lineCap = 'round';
  g.strokeStyle = INK; g.lineWidth = 11.6; g.beginPath(); g.moveTo(hipX, hipY); g.lineTo(footX, footY - 6); g.stroke();
  g.strokeStyle = L.pants; g.lineWidth = 8.6; g.beginPath(); g.moveTo(hipX, hipY); g.lineTo(footX, footY - 6); g.stroke();
  if (L.wraps) { // 각반
    g.strokeStyle = 'rgba(40,30,20,.55)'; g.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) {
      const k = 0.35 + i * 0.15, x = hipX + (footX - hipX) * k, y = hipY + (footY - 6 - hipY) * k;
      g.beginPath(); g.moveTo(x - 5, y - 1.5); g.lineTo(x + 5, y + 1.5); g.stroke();
    }
  }
  g.beginPath(); // 코가 올라간 신발
  g.moveTo(footX - 7, footY); g.lineTo(footX - 7, footY - 6);
  g.quadraticCurveTo(footX + 4, footY - 7, footX + 11, footY - 10);
  g.quadraticCurveTo(footX + 15, footY - 4, footX + 12.5, footY); g.closePath();
  outline(g, L.shoe, 1.5);
}

// 도포 윤곽 (몸통 + 치마)
function robePath(g, lean, shY, hipY, hemY, sway) {
  g.beginPath();
  g.moveTo(lean - 15, shY); g.quadraticCurveTo(lean, shY - 3, lean + 15, shY);
  g.quadraticCurveTo(lean * 0.6 + 22, hipY, 24 + sway, hemY);
  g.quadraticCurveTo(sway * 0.5, hemY + 5, -24 + sway, hemY);
  g.quadraticCurveTo(lean * 0.6 - 22, hipY, lean - 15, shY); g.closePath();
}

// ---------------------------------------------------------------- 얼굴

function drawFace(g, f, hx, hy, tilt, ch) {
  const st = f.state, t = f.anim;
  const angry = st === 'atk' || st === 'cast', hurt = st === 'hit', ko = st === 'ko', win = st === 'win', guard = st === 'block';
  g.save(); g.translate(hx, hy); g.rotate(tilt);
  // 목
  g.fillStyle = SKIN_SH; g.fillRect(-4.5, 8, 9, 10);
  // 얼굴
  g.beginPath(); g.ellipse(0.5, 0, 11, 12.6, 0, 0, 7); outline(g, SKIN, 1.7);
  g.fillStyle = 'rgba(160,90,60,.16)'; g.beginPath(); g.arc(5, 4.5, 3.2, 0, 7); g.fill(); // 볼
  g.beginPath(); g.ellipse(-8.8, 1, 2.2, 3.4, 0, 0, 7); outline(g, SKIN_SH, 1.2); // 귀
  g.strokeStyle = SKIN_DK; g.lineWidth = 1.2; g.beginPath(); g.moveTo(10.6, -0.5); g.quadraticCurveTo(14, 2.6, 10.8, 4.2); g.stroke(); // 코
  // 눈썹
  g.strokeStyle = ch.id === 'zhuangzi' ? '#f1ede2' : '#2a211a'; g.lineWidth = ch.id === 'zhuangzi' ? 2.2 : 2; g.lineCap = 'round';
  const bl = ch.id === 'zhuangzi' ? 4 : 0;
  g.beginPath();
  if (angry) { g.moveTo(9.5 + bl, -8.8); g.lineTo(2.2, -5.4); g.moveTo(-5.2, -6.6); g.lineTo(0, -4.6); }
  else if (hurt || ko) { g.moveTo(9 + bl, -6.2); g.lineTo(2.2, -8.4); g.moveTo(-5, -7.6); g.lineTo(0, -8.6); }
  else { g.moveTo(9.4 + bl, -7.6); g.lineTo(2.2, -7.2); g.moveTo(-5, -7.4); g.lineTo(0, -7.2); }
  g.stroke();
  // 눈
  const blink = !hurt && !ko && !win && (t % 200) < 6;
  g.strokeStyle = INK; g.lineWidth = 1.7;
  const eye = (ex, rx) => {
    if (ko) { g.beginPath(); g.moveTo(ex - 2, -3.2); g.lineTo(ex + 2, 0.6); g.moveTo(ex + 2, -3.2); g.lineTo(ex - 2, 0.6); g.stroke(); }
    else if (hurt) { g.beginPath(); g.moveTo(ex - 2.2, -3.4); g.lineTo(ex + 1.6, -1.6); g.lineTo(ex - 2.2, 0.2); g.stroke(); }
    else if (win) { g.beginPath(); g.arc(ex, -0.6, 2.3, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    else if (blink) { g.beginPath(); g.moveTo(ex - 2.2, -1.4); g.lineTo(ex + 2.2, -1.4); g.stroke(); }
    else {
      g.fillStyle = '#fbf7ee'; g.beginPath(); g.ellipse(ex, -1.5, rx, angry ? 1.5 : 1.9, 0, 0, 7); g.fill(); g.lineWidth = 1; g.stroke();
      g.fillStyle = INK; g.beginPath(); g.ellipse(ex + 0.9, -1.4, 1.35, angry ? 1.35 : 1.7, 0, 0, 7); g.fill();
      g.lineWidth = 1.4; g.beginPath(); g.moveTo(ex - rx - 0.4, -1.7); g.quadraticCurveTo(ex, -1.5 - (angry ? 2.4 : 3.6), ex + rx + 0.4, -1.8); g.stroke(); // 윗 눈꺼풀
    }
  };
  eye(6, 2.4); eye(-2.6, 2.0);
  // 입
  g.strokeStyle = '#6b3a2a'; g.lineWidth = 1.5;
  if (angry) { g.beginPath(); g.ellipse(5.2, 7, 2.7, 2.3, 0, 0, 7); g.fillStyle = '#4a1d1a'; g.fill(); g.stroke(); }
  else if (hurt || ko) { g.beginPath(); g.moveTo(2.5, 8.4); g.quadraticCurveTo(5, 5.6, 8.5, 8.2); g.stroke(); }
  else if (win) { g.beginPath(); g.arc(5.2, 5.2, 3.2, 0.2, Math.PI - 0.2); g.stroke(); }
  else if (guard) { g.beginPath(); g.moveTo(2.8, 7); g.lineTo(8, 7); g.stroke(); g.strokeStyle = '#fbf7ee'; g.lineWidth = 1; g.beginPath(); g.moveTo(4, 7); g.lineTo(7, 7); g.stroke(); }
  else { g.beginPath(); g.moveTo(3, 7.2); g.quadraticCurveTo(5.6, 7.9, 8.2, 6.9); g.stroke(); }
  g.restore();
}

// 수염 / 머리카락 (얼굴 위, 모자 아래)
function drawBeard(g, ch, hx, hy, tilt, sw) {
  g.save(); g.translate(hx, hy); g.rotate(tilt);
  const mus = (col, th) => { // 콧수염
    g.beginPath(); g.moveTo(1.6, 5); g.quadraticCurveTo(7, 2.8 - th, 11.6, 5.6); g.quadraticCurveTo(7, 6 + th, 1.6, 6.6); g.closePath(); outline(g, col, 1);
  };
  switch (ch.id) {
    case 'confucius':
      g.beginPath(); g.moveTo(-9.5, 1.5); g.quadraticCurveTo(-12, 14, -4, 24 + sw * 0.4); g.quadraticCurveTo(0, 29 + sw * 0.4, 5, 24 + sw * 0.4);
      g.quadraticCurveTo(11, 14, 10, 1.5); g.quadraticCurveTo(8, 9.6, 1.5, 10.4); g.quadraticCurveTo(-7, 9.6, -9.5, 1.5); g.closePath(); outline(g, '#4a443f', 1.5);
      g.strokeStyle = 'rgba(210,205,195,.45)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-3, 13); g.lineTo(-2, 23); g.moveTo(3, 13); g.lineTo(2.5, 23); g.stroke();
      mus('#4a443f', 0.6); break;
    case 'zhuangzi':
      g.beginPath(); g.moveTo(-7, 4); g.quadraticCurveTo(-8, 16, -2, 30 + sw * 0.6); g.quadraticCurveTo(1, 36 + sw * 0.6, 3.5, 29 + sw * 0.6);
      g.quadraticCurveTo(8, 16, 8, 4); g.quadraticCurveTo(6, 10, 1, 10.6); g.quadraticCurveTo(-5, 10, -7, 4); g.closePath(); outline(g, '#f1ede2', 1.4);
      mus('#f1ede2', 0.4); break;
    case 'hanfei':
      g.beginPath(); g.moveTo(-2.6, 10.5); g.quadraticCurveTo(1, 21, 4.8, 10.5); g.closePath(); outline(g, '#1a1210', 1);
      mus('#1a1210', 0); break;
    case 'mozi':
      g.fillStyle = 'rgba(40,30,20,.3)';
      g.beginPath(); g.moveTo(-9, 3); g.quadraticCurveTo(0, 18, 10.5, 3); g.quadraticCurveTo(0, 8, -9, 3); g.fill(); break;
    case 'sunzi':
      mus('#1a1a1e', 0.2);
      g.beginPath(); g.moveTo(-1, 10); g.quadraticCurveTo(3, 16, 7, 10); g.closePath(); outline(g, '#1a1a1e', 1); break;
    case 'gongsun':
      g.beginPath(); g.moveTo(1.8, 5.2); g.quadraticCurveTo(7, 3.6, 12, 6.6); g.quadraticCurveTo(7, 5.8, 1.8, 6.4); g.closePath(); outline(g, '#3a3350', 1);
      g.beginPath(); g.moveTo(1.5, 10.5); g.quadraticCurveTo(4.5, 17, 7.5, 10.5); g.closePath(); outline(g, '#3a3350', 1); break;
  }
  g.restore();
}

// 머리 뒤쪽(머리카락 등) — 얼굴보다 먼저
function drawHairBack(g, ch, hx, hy, tilt, sw) {
  g.save(); g.translate(hx, hy); g.rotate(tilt);
  if (ch.id === 'zhuangzi') { // 흩날리는 흰 머리
    g.beginPath(); g.moveTo(-3, -12); g.quadraticCurveTo(-26 + sw, -10, -36 + sw * 1.6, 12); g.quadraticCurveTo(-24 + sw, 4, -12, 10); g.closePath(); outline(g, '#ece7d8', 1.5);
    g.strokeStyle = 'rgba(160,150,130,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-8, -4); g.quadraticCurveTo(-22 + sw, 0, -30 + sw * 1.4, 9); g.stroke();
  } else if (ch.id === 'sunzi') { // 투구 아래로 묶은 머리
    g.beginPath(); g.moveTo(-10, -2); g.quadraticCurveTo(-24 + sw, 2, -26 + sw * 1.5, 18); g.quadraticCurveTo(-16 + sw, 8, -8, 8); g.closePath(); outline(g, '#1c1816', 1.4);
  } else if (ch.id === 'mozi' || ch.id === 'hanfei' || ch.id === 'confucius' || ch.id === 'gongsun') {
    g.beginPath(); g.ellipse(-3.5, -2, 10, 12, 0, 0, 7); g.fillStyle = ch.id === 'gongsun' ? '#2c2740' : '#1d1814'; g.fill(); // 뒷머리
  }
  g.restore();
}

// 모자 / 앞머리 — 얼굴 위
function drawHat(g, ch, hx, hy, tilt, sw) {
  g.save(); g.translate(hx, hy); g.rotate(tilt);
  switch (ch.hat) {
    case 'guan': { // 유가의 관과 갓끈
      g.strokeStyle = INK; g.lineWidth = 3.4; g.beginPath(); g.moveTo(-10, -2); g.quadraticCurveTo(-14, 9 + sw * 0.4, -7, 17 + sw * 0.5); g.stroke();
      g.strokeStyle = '#f3efe2'; g.lineWidth = 1.8; g.stroke();
      g.beginPath(); g.moveTo(-12, -10); g.lineTo(-11, -17); g.lineTo(11, -17); g.lineTo(12, -10); g.closePath(); outline(g, '#1b1612', 1.6);
      g.beginPath(); g.moveTo(-7, -17); g.lineTo(-6, -27); g.lineTo(6, -27); g.lineTo(7, -17); g.closePath(); outline(g, '#2a231c', 1.6);
      g.fillStyle = ch.accent; g.fillRect(-12, -13, 24, 2.4);
      g.strokeStyle = ch.accent; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(-15, -14.5); g.lineTo(15, -14.5); g.stroke();
      break;
    }
    case 'bun': { // 도가의 상투와 머리띠
      g.beginPath(); g.arc(0, -3, 12.8, Math.PI, 0); g.closePath(); outline(g, '#ece7d8', 1.5);
      g.beginPath(); g.arc(-3, -19.5, 6, 0, 7); outline(g, '#f3efe2', 1.5);
      g.strokeStyle = ch.accent; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(-11, -19.5); g.lineTo(5, -19.5); g.stroke();
      g.strokeStyle = INK; g.lineWidth = 4.4; g.beginPath(); g.moveTo(-12.5, -7); g.quadraticCurveTo(0, -11.5, 12.8, -7); g.stroke();
      g.strokeStyle = '#5b8a72'; g.lineWidth = 2.8; g.stroke();
      g.strokeStyle = INK; g.lineWidth = 3.8; g.beginPath(); g.moveTo(-12, -7); g.quadraticCurveTo(-22, -4 + sw * 0.6, -30, 6 + sw); g.stroke();
      g.strokeStyle = '#5b8a72'; g.lineWidth = 2; g.stroke();
      break;
    }
    case 'crown': { // 한비자의 해치관
      g.beginPath(); g.moveTo(-11, -11); g.lineTo(-8, -31); g.lineTo(9, -28); g.lineTo(12, -11); g.closePath(); outline(g, '#1a1213', 1.7);
      g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-2, -29); g.lineTo(1, -13); g.stroke();
      g.beginPath(); g.moveTo(-11.5, -14.5); g.lineTo(12.2, -14.5); g.lineTo(12, -10.5); g.lineTo(-11.5, -10.5); g.closePath(); outline(g, ch.accent, 1.2);
      g.beginPath(); g.moveTo(6, -28); g.quadraticCurveTo(16, -34, 16.5, -48); g.quadraticCurveTo(10, -38, 2.5, -27); g.closePath(); outline(g, '#d9b64a', 1.4);
      break;
    }
    case 'band': { // 묵가의 거친 머리와 붉은 두건
      g.beginPath(); g.moveTo(-12.6, -3); g.lineTo(-14, -12); g.lineTo(-9, -10); g.lineTo(-8, -19); g.lineTo(-3, -12); g.lineTo(0, -21); g.lineTo(3, -12); g.lineTo(7, -19); g.lineTo(8, -10); g.lineTo(13, -12); g.lineTo(12.6, -3); g.closePath(); outline(g, '#2a211a', 1.5);
      g.beginPath(); g.moveTo(-12.8, -9.5); g.quadraticCurveTo(0, -13.5, 13, -9.5); g.lineTo(12.8, -5.2); g.quadraticCurveTo(0, -9.4, -12.6, -5.2); g.closePath(); outline(g, '#b0392e', 1.5);
      for (const k of [0, 1]) { g.beginPath(); g.moveTo(-12, -7.4); g.quadraticCurveTo(-20, -6 + sw * 0.5 + k * 4, -29 + sw * 0.8, 2 + k * 6 + sw); g.lineTo(-27 + sw * 0.8, 6 + k * 6 + sw); g.quadraticCurveTo(-18, -2 + k * 4, -11, -4.6); g.closePath(); outline(g, '#b0392e', 1.3); }
      break;
    }
    case 'helmet': { // 손자의 청동 투구와 붉은 술
      g.beginPath(); g.moveTo(-1, -17); g.quadraticCurveTo(-10, -35, -26 + sw * 1.4, -27 + sw); g.quadraticCurveTo(-14, -24 + sw * 0.4, -4, -13); g.closePath(); outline(g, '#a52a2a', 1.4);
      g.beginPath(); g.moveTo(-12.5, -5); g.lineTo(-5, -5); g.lineTo(-4, 9); g.lineTo(-11.5, 11); g.closePath(); outline(g, '#a88334', 1.4);
      g.beginPath(); g.arc(0, -3, 14, Math.PI, 0); g.closePath(); outline(g, hgrad(g, -14, 14, '#e0b954', '#a67d2a'), 1.7);
      g.beginPath(); g.rect(-14.8, -6.4, 29.6, 4.2); outline(g, '#8a6a26', 1.4);
      g.strokeStyle = 'rgba(255,240,190,.55)'; g.lineWidth = 1.6; g.beginPath(); g.arc(0, -3, 10.5, Math.PI * 1.15, Math.PI * 1.7); g.stroke();
      g.fillStyle = '#6b4a14'; g.beginPath(); g.arc(0, -17.5, 1.8, 0, 7); g.fill();
      break;
    }
    case 'scholar': { // 명가의 방건과 옥비녀
      g.beginPath(); g.moveTo(-12, -9); g.quadraticCurveTo(-22, -4 + sw * 0.6, -26, 9 + sw); g.lineTo(-22, 11 + sw); g.quadraticCurveTo(-18, -2, -10, -6); g.closePath(); outline(g, '#e6e1f0', 1.3);
      g.beginPath(); g.moveTo(-11, -22); g.lineTo(11, -22); g.lineTo(12.6, -9); g.lineTo(-12.6, -9); g.closePath(); outline(g, '#f3efe2', 1.6);
      g.strokeStyle = '#c9c4e6'; g.lineWidth = 1; for (let x = -7; x <= 7; x += 4.5) { g.beginPath(); g.moveTo(x, -21); g.lineTo(x * 1.08, -10); g.stroke(); }
      g.beginPath(); g.rect(-12.8, -11.4, 25.6, 3.4); outline(g, '#8d8aa8', 1.2);
      g.beginPath(); g.arc(3, -16, 2.8, 0, 7); outline(g, '#a8d8c0', 1.2);
      break;
    }
  }
  g.restore();
}

// ---------------------------------------------------------------- 무기

function drawWeapon(g, ch, hx, hy, ang, t, sw) {
  g.save(); g.translate(hx, hy); g.rotate(ang);
  g.lineCap = 'round'; g.lineJoin = 'round';
  switch (ch.weapon) {
    case 'scroll': { // 죽간 묶음
      g.beginPath(); g.rect(-4, -8.5, 34, 17); outline(g, '#d9c48a', 1.6);
      g.strokeStyle = '#a58a4a'; g.lineWidth = 1; for (let y = -5.5; y <= 6; y += 3.6) { g.beginPath(); g.moveTo(-4, y); g.lineTo(30, y); g.stroke(); }
      g.fillStyle = '#b0392e'; g.fillRect(4, -9.5, 3, 19); g.fillRect(19, -9.5, 3, 19);
      g.strokeStyle = '#b0392e'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(30, 0); g.quadraticCurveTo(36, 3 + sw * 0.3, 38, 9 + sw * 0.4); g.stroke();
      break;
    }
    case 'whisk': { // 불진
      g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(-8, 0); g.lineTo(20, 0); g.stroke();
      g.strokeStyle = '#a07a44'; g.lineWidth = 3; g.stroke();
      g.beginPath(); g.moveTo(20, 0);
      g.bezierCurveTo(34, -16 + sw * 0.4, 52, -12 + sw, 66, -4 + sw * 1.4);
      g.bezierCurveTo(54, 0 + sw * 0.8, 62, 8 + sw * 1.2, 68, 14 + sw * 1.6);
      g.bezierCurveTo(50, 14 + sw * 0.6, 32, 12, 20, 2); g.closePath(); outline(g, '#fbfaf4', 1.3);
      g.strokeStyle = 'rgba(150,145,130,.7)'; g.lineWidth = 0.9; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(22, 0); g.quadraticCurveTo(42, -8 + i * 6, 62 + sw, -4 + i * 6 + sw); g.stroke(); }
      break;
    }
    case 'blade': { // 검
      g.beginPath(); g.moveTo(8, -3.4); g.lineTo(54, -2.4); g.quadraticCurveTo(62, -0.6, 64, 0.6); g.lineTo(54, 2.6); g.lineTo(8, 3.4); g.closePath(); outline(g, hgrad(g, 8, 64, '#e8ecef', '#b9bfc6'), 1.3);
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(10, -0.6); g.lineTo(58, -0.2); g.stroke();
      g.beginPath(); g.rect(3.5, -8, 5, 16); outline(g, '#d9b64a', 1.3);
      g.beginPath(); g.rect(-10, -2.6, 14, 5.2); outline(g, '#3a2418', 1.2);
      g.beginPath(); g.arc(-12.5, 0, 3, 0, 7); outline(g, '#d9b64a', 1.2);
      g.strokeStyle = '#b02a2a'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(-14, 1); g.quadraticCurveTo(-20, 5 + sw * 0.4, -22, 12 + sw * 0.6); g.stroke();
      break;
    }
    case 'staff': { // 쇠로 끝을 감싼 몽둥이
      g.strokeStyle = INK; g.lineWidth = 6.6; g.beginPath(); g.moveTo(-20, 0); g.lineTo(56, 0); g.stroke();
      g.strokeStyle = '#7b5832'; g.lineWidth = 4.6; g.stroke();
      g.strokeStyle = 'rgba(40,25,10,.4)'; g.lineWidth = 1; for (let x = -10; x < 50; x += 10) { g.beginPath(); g.moveTo(x, -2); g.lineTo(x + 4, 2); g.stroke(); }
      g.beginPath(); g.rect(46, -5.4, 11, 10.8); outline(g, '#9aa0a8', 1.3);
      g.beginPath(); g.rect(-22, -4.4, 6, 8.8); outline(g, '#9aa0a8', 1.3);
      break;
    }
    case 'spear': { // 창
      g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(-28, 0); g.lineTo(66, 0); g.stroke();
      g.strokeStyle = '#6b4a2a'; g.lineWidth = 3; g.stroke();
      g.beginPath(); g.moveTo(62, -3.6); g.lineTo(92, 0); g.lineTo(62, 3.6); g.closePath(); outline(g, '#e4e8ec', 1.3);
      g.beginPath(); g.moveTo(62, -3.6); g.lineTo(92, 0); g.lineTo(62, 0); g.closePath(); g.fillStyle = 'rgba(0,0,0,.12)'; g.fill();
      g.beginPath(); g.rect(56, -4.4, 7, 8.8); outline(g, '#c2993f', 1.2);
      g.fillStyle = '#b02a2a'; // 붉은 술
      g.beginPath(); g.moveTo(58, 0); g.quadraticCurveTo(52, -9 + sw * 0.5, 44 + sw * 0.6, -8 + sw); g.quadraticCurveTo(50, 2, 58, 2); g.closePath(); outline(g, '#b02a2a', 1.1);
      g.beginPath(); g.moveTo(58, 0); g.quadraticCurveTo(52, 9 + sw * 0.5, 44 + sw * 0.6, 9 + sw); g.quadraticCurveTo(50, 0, 58, -2); g.closePath(); outline(g, '#9d2424', 1.1);
      break;
    }
    case 'fan': { // 백우선(부채)
      g.strokeStyle = '#7a6a4a'; g.lineWidth = 3; g.beginPath(); g.moveTo(-6, 0); g.lineTo(6, 0); g.stroke();
      g.beginPath(); g.moveTo(6, 0); g.arc(6, 0, 32, -0.85, 0.85); g.closePath(); outline(g, '#f7f4ea', 1.5);
      g.strokeStyle = 'rgba(120,100,70,.7)'; g.lineWidth = 1;
      for (let a = -0.75; a <= 0.76; a += 0.25) { g.beginPath(); g.moveTo(6, 0); g.lineTo(6 + Math.cos(a) * 32, Math.sin(a) * 32); g.stroke(); }
      g.strokeStyle = 'rgba(60,50,80,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(16, 6); g.quadraticCurveTo(22, -8, 30, -2); g.quadraticCurveTo(34, 2, 36, -6); g.stroke(); // 먹으로 그린 말
      break;
    }
  }
  g.restore();
}

// ---------------------------------------------------------------- 본체

function drawFighter(g, f, scale = 1, opts = {}) {
  const ch = f.ch, P = getPose(f), L = LOOK[ch.id];
  const alpha = (f.invuln > 0 && f.invuln % 6 < 3 && f.state !== 'cast' ? 0.45 : 1) * (opts.alpha === undefined ? 1 : opts.alpha);
  g.save();
  g.globalAlpha = alpha;
  if (f.flash > 0) g.filter = 'brightness(2.6) saturate(0.35)'; // 피격 플래시 (미지원 브라우저에서는 무시)
  const t = f.anim;
  const sway = Math.sin(t * 0.1) * 1.5 - clamp((f.vx || 0) * f.face, -6, 6) * 1.1;

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
    g.save(); g.globalAlpha = 0.35 + Math.sin(t * 0.4) * 0.15;
    g.strokeStyle = '#ffd86b'; g.lineWidth = 4; g.beginPath(); g.arc(0, -55, 56 + Math.sin(t * 0.3) * 4, 0, 7); g.stroke();
    g.fillStyle = 'rgba(255,216,107,.18)'; g.fill(); g.restore();
  }
  if (f.shield > 0) {
    g.save(); g.strokeStyle = 'rgba(255,240,180,.9)'; g.lineWidth = 3;
    g.fillStyle = 'rgba(255,240,180,.15)'; g.beginPath(); g.arc(0, -55, 62, 0, 7); g.fill(); g.stroke(); g.restore();
  }

  const y0 = P.crouch + P.bob, lean = P.lean;
  const hipY = -42 + y0 * 0.5, shY = -80 + y0, hemY = -12 + y0 * 0.3;
  const beltX = lean * 0.5;
  const hx = lean * 1.1, hy = -96 + y0 * 1.2;

  // 1) 몸 뒤에서 나부끼는 것들
  if (ch.id === 'sunzi') { // 망토
    g.beginPath(); g.moveTo(lean - 10, shY + 2);
    for (let i = 0; i <= 4; i++) g.lineTo(-18 - i * 3 + Math.sin(t * 0.12 + i) * 4 + sway * 1.5, shY + 8 + i * 15);
    g.lineTo(lean - 6, hipY + 14); g.closePath(); outline(g, hgrad(g, -34, lean, '#7a1f20', '#a52a2a'), 1.5);
  }
  if (ch.id === 'gongsun' || ch.id === 'zhuangzi') { // 허리끈 자락
    const col = ch.id === 'gongsun' ? '#f6f3ea' : '#c9e8d0';
    g.beginPath(); g.moveTo(beltX - 14, hipY); g.bezierCurveTo(-26 + sway, hipY + 8, -34 + sway * 1.6 + Math.sin(t * 0.1) * 3, hipY + 24, -30 + sway * 2, hipY + 40);
    g.lineTo(-24 + sway * 2, hipY + 40); g.bezierCurveTo(-27 + sway, hipY + 22, -20 + sway, hipY + 8, beltX - 12, hipY + 5); g.closePath(); outline(g, col, 1.3);
  }
  drawHairBack(g, ch, hx, hy, P.head, sway);

  // 2) 뒷팔
  const back = drawArm(g, lean - 6, shY + 2, P.armB, 30, ch, true);
  if (ch.weapon === 'staff') { // 묵자의 방패
    const [sx, sy] = back.h;
    g.beginPath(); g.arc(sx, sy, 18, 0, 7); outline(g, '#6f5a3a', 2);
    g.beginPath(); g.arc(sx, sy, 14.5, 0, 7); outline(g, hgrad(g, sx - 15, sx + 15, '#c9a368', '#9a7a42'), 1.4);
    g.fillStyle = '#4a3a22'; for (let a = 0; a < 6.28; a += 1.05) { g.beginPath(); g.arc(sx + Math.cos(a) * 11.5, sy + Math.sin(a) * 11.5, 1.3, 0, 7); g.fill(); }
    g.save(); g.translate(sx, sy); g.scale(f.face, 1); // 글자가 뒤집히지 않게
    g.font = '900 15px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#2a1e10'; g.fillText('墨', 0, 1); g.restore();
  }

  // 3) 다리
  drawLeg(g, -4, hipY, P.legB - 2, -P.lift * 0.3, L);
  drawLeg(g, 4, hipY, P.legA + 2, -P.lift, L);

  // 4) 도포(몸통)
  const base = ch.color, lite = shade(base, 24), dark = shade(base, -32);
  robePath(g, lean, shY, hipY, hemY, sway);
  outline(g, hgrad(g, -26, 26, dark, lite), 1.8);
  g.save(); robePath(g, lean, shY, hipY, hemY, sway); g.clip();
  // 주름과 아래쪽 어둠
  g.strokeStyle = 'rgba(0,0,0,.17)'; g.lineWidth = 1.6;
  for (const k of [-12, -3, 8]) { g.beginPath(); g.moveTo(beltX + k * 0.6, hipY + 4); g.quadraticCurveTo(k * 1.1 + sway * 0.3, -28, k * 1.4 + sway * 0.8, hemY); g.stroke(); }
  const fade = g.createLinearGradient(0, hipY, 0, hemY + 4); fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,.28)');
  g.fillStyle = fade; g.fillRect(-30, hipY, 60, 40);
  g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(-30, shY - 2, 60, 5); // 머리 아래 그림자
  outfit(g, ch, L, { lean, shY, hipY, hemY, beltX, sway, t });
  g.restore();
  armorOver(g, ch, L, { lean, shY, hipY, hemY, beltX, sway, t });

  // 5) 허리띠와 소품
  belt(g, ch, L, { lean, shY, hipY, beltX, sway, t });

  // 베기 궤적은 얼굴과 모자를 가리지 않도록 머리보다 먼저 그린다
  const fsx = lean + 8, fsy = shY + 2;
  if (P.trail && !opts.noTrail) {
    const reach = (f.move ? f.move.reach : 70) * 0.9;
    g.save();
    const grad = g.createRadialGradient(fsx, fsy, 10, fsx, fsy, reach);
    grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(1, P.trail.heavy ? 'rgba(255,230,160,.65)' : 'rgba(255,255,255,.5)');
    g.fillStyle = grad; g.beginPath(); g.moveTo(fsx, fsy); g.arc(fsx, fsy, reach, P.trail.from, P.trail.to); g.closePath(); g.fill();
    g.restore();
  }

  // 6) 머리
  drawFace(g, f, hx, hy, P.head, ch);
  drawBeard(g, ch, hx, hy, P.head, sway);
  drawHat(g, ch, hx, hy, P.head, sway);

  // 7) 앞팔 + 무기
  const front = drawArm(g, fsx, fsy, P.armF, 34, ch, false);
  drawWeapon(g, ch, front.h[0], front.h[1], P.armF + (f.state === 'atk' || f.state === 'cast' ? 0.1 : -0.7), t, sway);
  if (ch.id === 'zhuangzi') { // 어깨에 앉은 나비
    const fl = Math.abs(Math.sin(t * 0.25));
    const bx = lean - 15, by = shY - 6;
    g.fillStyle = '#bfe6f2'; g.strokeStyle = INK; g.lineWidth = 0.9;
    g.beginPath(); g.ellipse(bx - 1, by - 3 * fl, 4.4, 3 + 3 * fl, -0.5, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(bx + 3, by - 2 * fl, 3.6, 2.6 + 2.6 * fl, 0.5, 0, 7); g.fill(); g.stroke();
    g.fillStyle = INK; g.fillRect(bx - 0.6, by - 2, 1.4, 4);
  }

  g.restore();
}

// 학파별 도포 무늬 (도포 윤곽으로 클립된 상태에서 호출)
function outfit(g, ch, L, c) {
  const { lean, shY, hipY, hemY, beltX, sway } = c;
  const collar = () => { // 동정(안쪽 깃) 브이
    g.beginPath(); g.moveTo(lean - 7, shY - 2); g.lineTo(lean + 4, shY + 19); g.lineTo(lean + 14, shY - 2); g.lineTo(lean + 8, shY - 2); g.lineTo(lean + 4, shY + 9); g.lineTo(lean - 2, shY - 2); g.closePath();
    outline(g, L.inner, 1.2);
  };
  switch (ch.id) {
    case 'confucius':
      g.fillStyle = L.hem; g.fillRect(-30, hemY - 9, 60, 14); g.fillStyle = L.trim; g.fillRect(-30, hemY - 10, 60, 2);
      g.beginPath(); g.moveTo(lean + 4, shY + 18); g.lineTo(beltX + 3, hipY); g.lineTo(beltX + 9, hipY); g.lineTo(lean + 8, shY + 8); g.closePath(); g.fillStyle = 'rgba(0,0,0,.12)'; g.fill();
      collar(); break;
    case 'zhuangzi': {
      g.beginPath(); g.moveTo(lean - 1, shY + 2); g.lineTo(lean + 9, shY + 2); g.lineTo(beltX + 10, hemY); g.lineTo(beltX - 5, hemY); g.closePath(); outline(g, L.inner, 1.1);
      g.strokeStyle = 'rgba(255,255,255,.38)'; g.lineWidth = 1.5;
      for (const [x, y] of [[-14, -30], [14, -24], [-12, -50], [12, -52]]) { g.beginPath(); g.arc(x + sway * 0.4, y, 4, 0.3, 4.4); g.stroke(); g.beginPath(); g.arc(x + 5 + sway * 0.4, y + 3, 2.6, 3.4, 7); g.stroke(); }
      g.fillStyle = L.hem; g.fillRect(-30, hemY - 6, 60, 10); break;
    }
    case 'hanfei':
      g.beginPath(); g.moveTo(lean - 14, shY); g.lineTo(lean + 5, hipY + 6); g.lineTo(lean + 10, shY - 2); g.lineTo(lean + 1, shY + 8); g.closePath(); g.fillStyle = '#16090b'; g.fill();
      g.strokeStyle = L.trim; g.lineWidth = 1.6; g.beginPath(); g.moveTo(lean - 13, shY + 1); g.lineTo(lean + 5, hipY + 5); g.stroke();
      g.fillStyle = L.hem; g.fillRect(-30, hemY - 11, 60, 16); g.fillStyle = L.trim; g.fillRect(-30, hemY - 12, 60, 1.8);
      g.fillStyle = '#16090b'; g.fillRect(lean - 15, shY - 1, 30, 4); break;
    case 'mozi':
      g.strokeStyle = 'rgba(30,20,10,.5)'; g.lineWidth = 1.2; g.setLineDash([3, 2]);
      g.strokeRect(-9, -34, 11, 9); g.setLineDash([]);
      g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(-9, -34, 11, 9);
      g.fillStyle = L.hem; g.fillRect(-30, hemY - 6, 60, 10);
      g.beginPath(); g.moveTo(lean - 6, shY - 1); g.lineTo(lean + 4, shY + 14); g.lineTo(lean + 13, shY - 1); g.closePath(); g.fillStyle = 'rgba(0,0,0,.16)'; g.fill(); break;
    case 'sunzi':
      g.fillStyle = L.hem; g.fillRect(-30, hemY - 8, 60, 12); break;
    case 'gongsun':
      collar();
      g.strokeStyle = 'rgba(141,138,168,.45)'; g.lineWidth = 1.6;
      for (const [x, y] of [[-12, -28], [12, -34], [-10, -52], [10, -58]]) { g.beginPath(); g.arc(x + sway * 0.4, y, 5.4, 1.1, 5.2); g.stroke(); }
      g.fillStyle = L.hem; g.fillRect(-30, hemY - 7, 60, 11); g.fillStyle = '#f6f3ea'; g.fillRect(-30, hemY - 8, 60, 1.6); break;
  }
}

// 손자의 갑옷: 클립 바깥(어깨 보호대, 찰갑)
function armorOver(g, ch, L, c) {
  if (ch.id !== 'sunzi') return;
  const { lean, shY, hipY, beltX, sway } = c;
  // 흉갑
  g.beginPath(); g.moveTo(lean - 13, shY + 1); g.lineTo(lean + 13, shY + 1); g.lineTo(beltX + 14, hipY + 3); g.lineTo(beltX - 14, hipY + 3); g.closePath();
  outline(g, hgrad(g, lean - 14, lean + 14, '#8a6a26', '#e0b954'), 1.7);
  g.save(); g.clip();
  g.strokeStyle = 'rgba(40,25,5,.55)'; g.lineWidth = 1;
  for (let y = shY + 6; y < hipY + 3; y += 5.5) { g.beginPath(); g.moveTo(lean - 16, y); g.lineTo(lean + 16, y); g.stroke(); }
  for (let r = 0, y = shY + 1; y < hipY + 3; y += 5.5, r++) for (let x = lean - 14 + (r % 2) * 3; x < lean + 15; x += 6) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 5.5); g.stroke(); }
  g.strokeStyle = 'rgba(255,240,190,.6)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(lean + 2, shY + 1); g.lineTo(beltX + 2, hipY + 3); g.stroke();
  g.restore();
  // 어깨 보호대
  for (const sx of [lean - 13, lean + 13]) { g.beginPath(); g.ellipse(sx, shY + 3, 8.5, 6, 0, 0, 7); outline(g, hgrad(g, sx - 9, sx + 9, '#a88334', '#e0b954'), 1.6); g.strokeStyle = 'rgba(40,25,5,.5)'; g.lineWidth = 1; g.beginPath(); g.arc(sx, shY + 3, 4.5, 0.4, 5.9); g.stroke(); }
  // 허리 아래 찰갑 조각
  for (let i = 0; i < 5; i++) {
    const x = beltX - 22 + i * 9, len = 18 + (i % 2) * 3 + Math.sin(c.t * 0.1 + i) * 0.8 + sway * 0.2;
    g.beginPath(); g.moveTo(x, hipY + 2); g.lineTo(x + 8.5, hipY + 2); g.lineTo(x + 8, hipY + 2 + len); g.lineTo(x + 0.5, hipY + 2 + len); g.closePath();
    outline(g, hgrad(g, x, x + 9, '#8a6a26', '#caa040'), 1.3);
  }
}

// 허리띠와 매달린 소품
function belt(g, ch, L, c) {
  const { hipY, beltX, sway, t } = c;
  if (ch.id === 'mozi') { // 꼰 새끼줄 허리띠
    g.beginPath(); g.rect(beltX - 17, hipY - 2, 34, 6); outline(g, L.belt, 1.4);
    g.strokeStyle = 'rgba(90,60,30,.6)'; g.lineWidth = 1.2; for (let x = beltX - 15; x < beltX + 16; x += 4) { g.beginPath(); g.moveTo(x, hipY - 2); g.lineTo(x + 3, hipY + 4); g.stroke(); }
  } else if (ch.id === 'sunzi') {
    g.beginPath(); g.rect(beltX - 17, hipY - 2, 34, 6); outline(g, L.belt, 1.4);
    g.beginPath(); g.rect(beltX - 4, hipY - 3, 8, 8); outline(g, '#e0b954', 1.3);
  } else {
    g.beginPath(); g.rect(beltX - 17, hipY - 2, 34, 6); outline(g, L.belt, 1.5);
    g.strokeStyle = ch.accent; g.lineWidth = 1.4; g.beginPath(); g.moveTo(beltX - 17, hipY + 1); g.lineTo(beltX + 17, hipY + 1); g.stroke();
  }
  // 앞쪽에 늘어진 띠 매듭과 자락
  g.beginPath(); g.moveTo(beltX + 10, hipY + 3); g.quadraticCurveTo(beltX + 14 + sway * 0.4, hipY + 14, beltX + 11 + sway * 0.8, hipY + 24);
  g.lineTo(beltX + 6 + sway * 0.8, hipY + 23); g.quadraticCurveTo(beltX + 8, hipY + 12, beltX + 6, hipY + 3); g.closePath(); outline(g, ch.id === 'mozi' ? '#c9a96a' : ch.accent, 1.2);
  const sw2 = Math.sin(t * 0.1) * 1.6 + sway * 0.6;
  if (ch.id === 'confucius') { // 옥패
    g.strokeStyle = '#d9c070'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(beltX - 8, hipY + 4); g.lineTo(beltX - 8 + sw2 * 0.4, hipY + 15); g.stroke();
    g.beginPath(); g.ellipse(beltX - 8 + sw2 * 0.6, hipY + 19, 3.6, 5, 0.1, 0, 7); outline(g, '#8fcfae', 1.3);
    g.beginPath(); g.arc(beltX - 8 + sw2 * 0.6, hipY + 19, 1.2, 0, 7); g.fillStyle = '#e8f6ee'; g.fill();
  } else if (ch.id === 'zhuangzi') { // 호리병박
    const gx = beltX - 9 + sw2 * 0.5, gy = hipY + 14;
    g.strokeStyle = '#8a6a3a'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(beltX - 8, hipY + 4); g.lineTo(gx, gy - 6); g.stroke();
    g.beginPath(); g.arc(gx, gy, 4, 0, 7); outline(g, '#c9a14a', 1.2);
    g.beginPath(); g.arc(gx + 0.5, gy + 7, 5.6, 0, 7); outline(g, '#d8b35a', 1.2);
  } else if (ch.id === 'hanfei') { // 칼집
    g.save(); g.translate(beltX - 14, hipY + 2); g.rotate(2.35 + sw2 * 0.01);
    g.beginPath(); g.rect(0, -3, 36, 6); outline(g, '#1a1010', 1.3);
    g.fillStyle = '#d9b64a'; g.fillRect(2, -3.4, 3, 6.8); g.fillRect(28, -3.4, 3, 6.8);
    g.restore();
  } else if (ch.id === 'gongsun') { // 비단 주머니
    g.strokeStyle = '#8d8aa8'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(beltX - 8, hipY + 4); g.lineTo(beltX - 8 + sw2 * 0.4, hipY + 12); g.stroke();
    g.beginPath(); g.ellipse(beltX - 8 + sw2 * 0.6, hipY + 17, 5, 5.6, 0, 0, 7); outline(g, '#8d8aa8', 1.2);
  }
}
