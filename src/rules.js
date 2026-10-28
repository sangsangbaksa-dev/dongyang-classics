'use strict';

// 규칙 보기: 타이틀 / 학파 선택 / 대결 중 어디서든 열 수 있다. 대결 중에 열면 게임이 멈춘다.

const RULES_NAV = {
  prev: { x: 30, y: 488, w: 120, h: 36 },
  close: { x: W / 2 - 70, y: 488, w: 140, h: 36 },
  next: { x: W - 150, y: 488, w: 120, h: 36 },
};

function ruleButton(r, label, size = 16) {
  const hover = Math.floor(G.t / 40) % 2 === 0;
  g.fillStyle = 'rgba(20,14,10,.8)'; g.fillRect(r.x, r.y, r.w, r.h);
  g.strokeStyle = hover ? '#ffd86b' : 'rgba(233,196,106,.7)'; g.lineWidth = 2; g.strokeRect(r.x, r.y, r.w, r.h);
  inkText(g, label, r.x + r.w / 2, r.y + r.h / 2 + 1, size, '#f3e6c4', '#000', 0);
}

const gainOf = v => Math.round(v * METER_GAIN);

const RULE_PAGES = [
  {
    title: '대결 규칙',
    draw(x, y, w) {
      bullets([
        '대결은 1판 승부이고 제한시간은 ' + FIGHT_SECONDS + '초입니다. 상대(CPU)는 내가 고르지 않은 학파 중에서 무작위로 정해져요.',
        '상대의 체력을 먼저 0으로 만들면 승리(擊破)입니다. 시간이 끝나면 남은 체력 비율이 높은 쪽이 판정승, 같으면 무승부예요.',
        '난이도는 CPU의 체력, 공격력, 속도, 반응에만 영향을 줍니다. 내 능력치는 난이도와 상관없이 그대로예요.',
        '학파 선택은 ' + SELECT_SECONDS + '초 안에 정해야 하고(시간이 다 되면 지금 고른 학파로 시작), 결과 화면은 ' + RESULT_SECONDS + '초 뒤 자동으로 처음으로 돌아갑니다.',
        '규칙 보기는 타이틀(R), 학파 선택(R), 대결 중(H 또는 화면의 ? 버튼)에서 열 수 있어요. 대결 중에 열면 게임이 잠시 멈춥니다.',
        'Esc를 누르면 언제든 처음 화면으로 돌아갑니다. M 키는 소리를 끄고 켭니다.',
      ], x, y, w, 17, 27);
    },
  },
  {
    title: '조작 방법',
    draw(x, y, w) {
      const rows = [
        ['이동', 'A D  /  ← →'], ['점프', 'W  /  ↑'], ['방어 (누르고 있는 동안)', 'S  /  ↓'],
        ['약공격', 'J  /  ,'], ['강공격', 'K  /  .'], ['필살기 (기 50)', 'L  /  /'],
        ['극의 (기 100)', 'U  /  ;'], ['규칙 보기', 'H (대결 중) · R (타이틀/선택)'], ['소리 켜기/끄기', 'M'],
      ];
      rows.forEach(([name, key], i) => {
        const cx = x + (i % 2) * (w / 2), cy = y + Math.floor(i / 2) * 50;
        g.fillStyle = 'rgba(233,196,106,.14)'; g.fillRect(cx, cy, w / 2 - 14, 40);
        g.strokeStyle = 'rgba(233,196,106,.4)'; g.lineWidth = 1; g.strokeRect(cx, cy, w / 2 - 14, 40);
        inkText(g, name, cx + 12, cy + 21, 16, '#f3e6c4', '#000', 0, 'left');
        inkText(g, key, cx + w / 2 - 28, cy + 21, 16, '#ffd86b', '#000', 0, 'right');
      });
      wrapText('왼쪽 키(WASD, J K L U)와 오른쪽 키(방향키, , . / ;) 중 편한 쪽을 아무거나 써도 됩니다. 모바일은 화면 아래의 터치 버튼(跳 防 輕 重 技 極)을 사용하세요.', x, y + 262, w, 22, '#cbbd9a', 15);
    },
  },
  {
    title: '공격과 방어',
    draw(x, y, w) {
      bullets([
        '약공격(J): 빠르고 짧게 이어 칠 수 있어요. 강공격(K): 느리지만 피해가 크고 상대를 멀리 밀어냅니다.',
        '점프 공격: 점프 중에 J/K. 판정이 발밑까지 길게 내려가서, 뛰어들며 맞히기 좋아요. 점프 한 번에 한 번만 쓸 수 있고, 착지하면 바로 풀립니다.',
        '연계(캔슬): 약공격이 맞으면 그 후딜을 강공격이나 필살기로 끊어서 이을 수 있어요.',
        '방어(S): 땅에서 상대를 바라보고 누르고 있으면 피해가 85% 줄어듭니다. 대신 공중에서는 못 막고, 뒤에서 오는 투사체는 막을 수 없어요. 막기만으로는 체력이 0이 되지 않습니다.',
        '연타 보정: 같은 상대를 연속으로 맞히면 피해가 8%씩 줄어, 최대 50%까지 감소합니다.',
        '맞으면 잠시 굳고(경직) 뒤로 밀려납니다. 경직이 풀리기 전까지는 움직일 수 없어요.',
      ], x, y, w, 16, 25);
    },
  },
  {
    title: '기(氣) 게이지, 필살기, 극의',
    draw(x, y, w) {
      const rows = [
        ['약공격 적중', '+' + gainOf(7)], ['강공격 적중', '+' + gainOf(12)], ['투사체 적중 (나비, 기둥, 백마 등)', '+' + gainOf(4) + ' ~ ' + gainOf(8)],
        ['맞았을 때', '입은 피해 × ' + (0.9 * METER_GAIN).toFixed(2)], ['상대 공격을 막았을 때', '+' + gainOf(3) + ' (공격한 쪽은 기술 증가량의 40%)'],
      ];
      rows.forEach(([a, b], i) => {
        const cy = y + i * 30;
        g.fillStyle = i % 2 ? 'rgba(233,196,106,.06)' : 'rgba(233,196,106,.14)'; g.fillRect(x, cy, w, 28);
        inkText(g, a, x + 12, cy + 15, 15, '#f3e6c4', '#000', 0, 'left');
        inkText(g, b, x + w - 12, cy + 15, 15, '#ffd86b', '#000', 0, 'right');
      });
      const y2 = y + rows.length * 30 + 14;
      bullets([
        '기 50 이상: 필살기(L) 사용 가능, 50 소모. 게이지가 밝은 파란색이 되고 "L — 필살기 가능"이 떠요.',
        '기 100: 극의(U) 사용 가능, 100을 전부 소모. 땅에 서 있을 때만 쓸 수 있고, 컷인 연출 동안 시간이 멈춥니다. 게이지가 주황색으로 깜빡여요.',
        '밀리고 있을 때 오히려 기가 빨리 모입니다. 극의를 쓰고 싶다면 필살기를 아껴 두세요.',
      ], x, y2, w, 15, 23);
    },
  },
  {
    title: '난이도',
    draw(x, y, w) {
      DIFFS.forEach((D, i) => {
        const cy = y + i * 62, on = i === G.diff;
        g.fillStyle = on ? 'rgba(233,196,106,.22)' : 'rgba(233,196,106,.08)'; g.fillRect(x, cy, w, 56);
        g.strokeStyle = on ? D.color : 'rgba(233,196,106,.3)'; g.lineWidth = on ? 3 : 1; g.strokeRect(x, cy, w, 56);
        inkText(g, D.hanja, x + 34, cy + 28, 34, D.color, '#000', 4);
        inkText(g, D.name + (on ? '  (현재)' : ''), x + 74, cy + 18, 18, D.color, '#000', 0, 'left');
        wrapText(D.desc, x + 74, cy + 32, w - 360, 18, '#f3e6c4', 13);
        inkText(g, 'CPU 체력 ×' + D.hp.toFixed(2) + '   공격력 ×' + D.dmg.toFixed(2) + '   속도 ×' + D.speed.toFixed(2), x + w - 12, cy + 18, 13, '#cbbd9a', '#000', 0, 'right');
        inkText(g, '막기 ' + Math.round(D.react * 100) + '%  ·  응징 ' + Math.round(D.punish * 100) + '%  ·  연계 ' + Math.round(D.combo * 100) + '%', x + w - 12, cy + 40, 13, '#9a8e72', '#000', 0, 'right');
      });
      inkText(g, '난이도는 학파 선택 화면 위쪽에서 바꿀 수 있어요. (W/S 또는 ↑↓, 칩을 눌러도 됩니다)', x, y + 5 * 62 + 8, 14, '#9a8e72', '#000', 0, 'left');
    },
  },
  {
    title: '여섯 학파',
    draw(x, y, w) {
      CHARS.forEach((c, i) => {
        const cy = y + i * 58;
        g.fillStyle = i % 2 ? 'rgba(233,196,106,.06)' : 'rgba(233,196,106,.13)'; g.fillRect(x, cy, w, 54);
        inkText(g, c.hanja, x + 12, cy + 20, 24, c.accent, '#000', 4, 'left');
        inkText(g, c.name + ' · ' + c.school, x + 12, cy + 42, 13, '#cbbd9a', '#000', 0, 'left');
        wrapText('필살기 ' + c.special.name + ' — ' + c.special.desc, x + 190, cy + 6, w - 200, 20, '#f3e6c4', 13);
        wrapText('극의 ' + c.ult.name + ' — ' + c.ult.desc, x + 190, cy + 29, w - 200, 20, '#ff9a6b', 13);
      });
    },
  },
];

function bullets(items, x, y, w, size, lh) {
  let yy = y;
  for (const t of items) {
    g.fillStyle = '#ffd86b'; g.font = '700 ' + size + 'px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'top';
    g.fillText('•', x, yy);
    yy = wrapText(t, x + 18, yy, w - 18, lh, '#f3e6c4', size) + 6;
  }
  return yy;
}

function openRules() {
  G.rules = { page: 0, from: G.scene };
  setScene('rules');
  Sound.play('select');
}

function closeRules() {
  const from = G.rules.from;
  setScene(from);
  G.sceneT = 30; // 타이틀/선택의 입력 대기 시간이 다시 걸리지 않도록
  Sound.play('select');
}

function updateRules() {
  const R = G.rules, n = RULE_PAGES.length;
  const P = Input.pressed;
  if (P.Escape || P.Enter || P.Space || P.KeyH || P.KeyR || P.KeyP) { closeRules(); return; }
  if (tapped('left')) { R.page = (R.page + n - 1) % n; Sound.play('select'); }
  if (tapped('right')) { R.page = (R.page + 1) % n; Sound.play('select'); }
  if (Input.click) {
    if (clickIn(RULES_NAV.close)) { closeRules(); return; }
    if (clickIn(RULES_NAV.prev)) { R.page = (R.page + n - 1) % n; Sound.play('select'); }
    else if (clickIn(RULES_NAV.next)) {
      if (R.page === n - 1) { closeRules(); return; }
      R.page++; Sound.play('select');
    } else {
      for (let i = 0; i < n; i++) {
        const dx = W / 2 - (n - 1) * 14 + i * 28;
        if (Math.abs(Input.click.x - dx) < 12 && Math.abs(Input.click.y - 70) < 12) { R.page = i; Sound.play('select'); }
      }
    }
  }
}

function drawRules() {
  const R = G.rules, page = RULE_PAGES[R.page], n = RULE_PAGES.length;
  g.drawImage(getBackground('academy'), 0, 0);
  g.fillStyle = 'rgba(10,7,5,.86)'; g.fillRect(0, 0, W, H);
  inkText(g, '規則', 30, 38, 34, '#ffd86b', '#000', 6, 'left');
  inkText(g, '규칙 보기', 100, 40, 22, '#f3e6c4', '#000', 4, 'left');
  inkText(g, (R.page + 1) + ' / ' + n + '  ' + page.title, W - 30, 40, 22, '#e9c46a', '#000', 4, 'right');
  for (let i = 0; i < n; i++) { // 쪽 표시
    const dx = W / 2 - (n - 1) * 14 + i * 28;
    g.fillStyle = i === R.page ? '#ffd86b' : 'rgba(233,196,106,.3)';
    g.beginPath(); g.arc(dx, 70, i === R.page ? 6 : 4.5, 0, 7); g.fill();
  }
  panel(30, 90, W - 60, 386, 0.6);
  page.draw(56, 108, W - 112);
  ruleButton(RULES_NAV.prev, '◀ 이전');
  ruleButton(RULES_NAV.close, '닫기');
  ruleButton(RULES_NAV.next, R.page === n - 1 ? '닫기 ✕' : '다음 ▶');
  inkText(g, '← → 쪽 넘기기 · Enter / Esc / H 닫기', W / 2, 533, 12, '#9a8e72', '#000', 0);
}
