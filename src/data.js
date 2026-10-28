'use strict';

const W = 960, H = 540, GY = 452;

// 학파별 캐릭터 데이터. special/ult 의 동작은 game.js 의 SPECIALS / ULTS 에서 id로 연결된다.
const CHARS = [
  {
    id: 'confucius', name: '공자', hanja: '孔子', school: '유가', schoolHanja: '儒家',
    color: '#2f6f9f', accent: '#e9c46a', hat: 'guan', weapon: 'scroll',
    hp: 100, speed: 3.3, jump: -13.2, reach: 1.0, lightDmg: 5, heavyDmg: 11,
    quote: '己所不欲 勿施於人',
    quoteKo: '내가 하고 싶지 않은 일은 남에게도 시키지 말라. (논어)',
    desc: '균형 잡힌 군자. 예(禮)로 상대의 공격을 받아쳐 되돌려 준다.',
    special: { name: '克己復禮', ko: '극기복례', desc: '반격 자세. 자세 중 맞으면 피해를 무효화하고 되받아친다.' },
    ult: { name: '仁者無敵', ko: '인자무적', desc: '어진 이의 기운이 퍼져 나가는 거대한 충격파.' },
    stage: 'academy',
  },
  {
    id: 'zhuangzi', name: '장자', hanja: '莊子', school: '도가', schoolHanja: '道家',
    color: '#5b8a72', accent: '#d9e8d2', hat: 'bun', weapon: 'whisk',
    hp: 95, speed: 3.6, jump: -14.4, reach: 1.05, lightDmg: 4, heavyDmg: 10,
    quote: '昔者莊周夢爲胡蝶',
    quoteKo: '예전에 장주가 꿈에 나비가 되었다. (장자·제물론)',
    desc: '가볍고 높이 뛴다. 나비를 날려 보내 멀리서 괴롭히는 견제형.',
    special: { name: '胡蝶之夢', ko: '호접지몽', desc: '상대를 쫓아가는 나비 세 마리를 날린다.' },
    ult: { name: '逍遙遊', ko: '소요유', desc: '나비 떼가 하늘을 뒤덮고 상대를 휘감는다.' },
    stage: 'mist',
  },
  {
    id: 'hanfei', name: '한비자', hanja: '韓非', school: '법가', schoolHanja: '法家',
    color: '#8e2f3a', accent: '#c9b27c', hat: 'crown', weapon: 'blade',
    hp: 105, speed: 3.0, jump: -12.8, reach: 1.1, lightDmg: 5, heavyDmg: 13,
    quote: '法不阿貴 繩不撓曲',
    quoteKo: '법은 귀한 자에게 아부하지 않고, 먹줄은 굽은 것에 휘지 않는다. (한비자)',
    desc: '묵직한 한 방. 상대의 발밑에 형벌의 기둥을 세워 올려친다.',
    special: { name: '信賞必罰', ko: '신상필벌', desc: '상대가 선 자리에 형벌의 기둥이 솟는다.' },
    ult: { name: '法不阿貴', ko: '법불아귀', desc: '연속으로 내리꽂히는 다섯 번의 엄벌.' },
    stage: 'palace',
  },
  {
    id: 'mozi', name: '묵자', hanja: '墨子', school: '묵가', schoolHanja: '墨家',
    color: '#5a4a3a', accent: '#e0a458', hat: 'band', weapon: 'staff',
    hp: 115, speed: 2.9, jump: -12.6, reach: 0.95, lightDmg: 5, heavyDmg: 10,
    quote: '兼相愛 交相利',
    quoteKo: '널리 서로 사랑하고 서로 이롭게 하라. (묵자·겸애)',
    desc: '튼튼한 수비의 달인. 겸애의 방패로 몸을 지키고 상처를 회복한다.',
    special: { name: '兼愛', ko: '겸애', desc: '체력을 회복하고, 다음 한 번의 공격을 막아 주는 방패를 두른다.' },
    ult: { name: '非攻', ko: '비공', desc: '침략을 막아 내는 성벽의 파동. 맞히면 체력도 회복한다.' },
    stage: 'wall',
  },
  {
    id: 'sunzi', name: '손자', hanja: '孫子', school: '병가', schoolHanja: '兵家',
    color: '#2e3b4e', accent: '#d4a017', hat: 'helmet', weapon: 'spear',
    hp: 90, speed: 4.2, jump: -13.8, reach: 1.2, lightDmg: 4, heavyDmg: 11,
    quote: '知彼知己 百戰不殆',
    quoteKo: '적을 알고 나를 알면 백 번 싸워도 위태롭지 않다. (손자병법)',
    desc: '가장 빠른 속공형. 창을 앞세워 순식간에 파고든다.',
    special: { name: '兵貴神速', ko: '병귀신속', desc: '무적 상태로 번개같이 돌진해 베어 낸다.' },
    ult: { name: '出其不意', ko: '출기불의', desc: '순식간에 뒤로 돌아가 여섯 번 연속 벤다.' },
    stage: 'battlefield',
  },
  {
    id: 'gongsun', name: '공손룡', hanja: '公孫龍', school: '명가', schoolHanja: '名家',
    color: '#8d8aa8', accent: '#f4f1de', hat: 'scholar', weapon: 'fan',
    hp: 95, speed: 3.4, jump: -13.4, reach: 1.0, lightDmg: 4, heavyDmg: 12,
    quote: '白馬非馬',
    quoteKo: '흰 말은 말이 아니다. (공손룡자)',
    desc: '논리의 궤변가. 말이 아닌 말(白馬)을 불러내 정면으로 돌파한다.',
    special: { name: '白馬非馬', ko: '백마비마', desc: '흰 말이 전장을 가로질러 돌진한다.' },
    ult: { name: '離堅白', ko: '이견백', desc: '세 마리 백마가 시차를 두고 연달아 짓밟는다.' },
    stage: 'lake',
  },
];

const STAGES = {
  academy:     { name: '곡부 행단',   top: '#e8dcc0', bot: '#cdb98f', sun: '#c8553d', m: ['#b9b39a', '#9a9a86', '#6f7a68'], ground: '#4a3d2e', grass: '#6b7d4e' },
  mist:        { name: '안개 낀 산',  top: '#dfe6df', bot: '#b9c8bd', sun: '#f4f1de', m: ['#a9bdb0', '#86a092', '#587566'], ground: '#33433a', grass: '#6a8f74' },
  palace:      { name: '함양 궁전',   top: '#3a1e22', bot: '#7a3a32', sun: '#e9a64c', m: ['#4c262a', '#3a1e22', '#2a1519'], ground: '#1d1214', grass: '#5a2a2a' },
  wall:        { name: '송나라 성벽', top: '#d8d2c4', bot: '#b0a58f', sun: '#e0a458', m: ['#a29a88', '#857d6c', '#615a4c'], ground: '#4b4338', grass: '#7a7452' },
  battlefield: { name: '장평 벌판',   top: '#4a4f66', bot: '#c58b5c', sun: '#f2c46d', m: ['#5d5f78', '#464a60', '#2f3246'], ground: '#2c2a2a', grass: '#6a5a3c' },
  lake:        { name: '조나라 연못', top: '#232c47', bot: '#5c6a8f', sun: '#f4f1de', m: ['#3f4a6c', '#2e3856', '#1e2640'], ground: '#1e2433', grass: '#3f5a6a' },
};

// 난이도. hp/dmg/speed/meter 는 상대(CPU)의 능력 배율, 나머지는 AI 판단 확률이다.
//  react: 상대 공격을 보고 막을 확률, proj: 투사체 회피, punish: 빈틈 응징, anti: 대공,
//  combo: 적중 후 연계, ult: 극의/필살기 사용, cool: 공격 간격 배율, think: 판단 주기 배율
const DIFFS = [
  { id: 'easy',       name: '하',     hanja: '下',   color: '#8fd0a0', desc: '입문. 상대가 느리고 약하며 거의 막지 못한다.',
    hp: 0.8,  dmg: 0.7,  speed: 0.92, meter: 0.8, react: 0.02, proj: 0.0,  punish: 0.0,  anti: 0.0,  combo: 0.1,  ult: 0.0,   cool: 1.6,  think: 1.4 },
  { id: 'normal',     name: '중',     hanja: '中',   color: '#e9c46a', desc: '표준. 기본기를 막고 가끔 필살기를 쓴다.',
    hp: 1.0,  dmg: 1.0,  speed: 1.0,  meter: 1.0, react: 0.12, proj: 0.1,  punish: 0.05, anti: 0.1,  combo: 0.25, ult: 0.015, cool: 1.0,  think: 1.0 },
  { id: 'hard',       name: '상',     hanja: '上',   color: '#f0a050', desc: '도전. 빈틈을 찌르고 연계하며 투사체를 피한다.',
    hp: 1.1,  dmg: 1.1,  speed: 1.05, meter: 1.2, react: 0.35, proj: 0.35, punish: 0.3,  anti: 0.4,  combo: 0.5,  ult: 0.03,  cool: 0.75, think: 0.8 },
  { id: 'expert',     name: '최상',   hanja: '極',   color: '#e8643c', desc: '고수. 대부분의 공격에 반응하고 확실히 응징한다.',
    hp: 1.25, dmg: 1.2,  speed: 1.1,  meter: 1.5, react: 0.6,  proj: 0.6,  punish: 0.55, anti: 0.7,  combo: 0.75, ult: 0.06,  cool: 0.5,  think: 0.6 },
  { id: 'impossible', name: '불가능', hanja: '絶',   color: '#c0392b', desc: '천하무적. 체력과 공격력이 압도적이고 거의 실수하지 않는다.',
    hp: 1.6,  dmg: 1.5,  speed: 1.2,  meter: 2.2, react: 0.88, proj: 0.85, punish: 0.85, anti: 0.95, combo: 0.95, ult: 0.12,  cool: 0.3,  think: 0.4 },
];

const KEYS_P1 = { left: 'KeyA', right: 'KeyD', up: 'KeyW', block: 'KeyS', light: 'KeyJ', heavy: 'KeyK', special: 'KeyL', ult: 'KeyU' };
const KEYS_P2 = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', block: 'ArrowDown', light: 'Comma', heavy: 'Period', special: 'Slash', ult: 'Semicolon' };
