export const ACCENT = 0xff6a3d;

export const KEYS = [
  { p: 0, x: 2.15, y: 0, s: 1.3, yaw: 0.5, pitch: 0.18, ring: 0, spin: 1, hot: 0, ex: 0 },
  { p: 0.16, x: 2.15, y: 0, s: 1.3, yaw: 0.5, pitch: 0.18, ring: 0, spin: 1, hot: 0, ex: 0 },
  { p: 0.3, x: 0.6, y: 0.16, s: 0.66, yaw: 0.3, pitch: 0.16, ring: 0, spin: 0, hot: 1, ex: 1 },
  { p: 0.46, x: 0.6, y: 0.16, s: 0.66, yaw: 0.3, pitch: 0.16, ring: 0, spin: 0, hot: 1, ex: 1 },
  { p: 0.58, x: 2.1, y: -0.1, s: 0.95, yaw: -0.6, pitch: 0.15, ring: 0, spin: 0, hot: 0, ex: 0 },
  { p: 0.7, x: 2.1, y: -0.1, s: 0.95, yaw: -0.6, pitch: 0.15, ring: 0, spin: 0, hot: 0, ex: 0 },
  { p: 0.78, x: 2.0, y: 0, s: 0.82, yaw: 0.3, pitch: 0.15, ring: 1, spin: 0, hot: 0, ex: 0 },
  { p: 0.9, x: 2.0, y: 0, s: 0.82, yaw: 0.3, pitch: 0.15, ring: 1, spin: 0, hot: 0, ex: 0 },
  { p: 1, x: 1.75, y: 0, s: 1.2, yaw: 0.9, pitch: 0.2, ring: 0, spin: 1, hot: 0, ex: 0 },
];

const FIELDS = ['x', 'y', 's', 'yaw', 'pitch', 'ring', 'spin', 'hot', 'ex'];

export function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

export function stateAt(p) {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const u = clamp01((p - a.p) / (b.p - a.p));
  const e = u * u * (3 - 2 * u);
  const out = {};
  for (const f of FIELDS) out[f] = a[f] + (b[f] - a[f]) * e;
  return out;
}

export const CHAPTER_COUNT = 5;

export function chapterAt(p) {
  return p < 0.2 ? 0 : p < 0.5 ? 1 : p < 0.74 ? 2 : p < 0.93 ? 3 : 4;
}

export function timerText(p) {
  const local = clamp01((p - 0.78) / 0.12);
  const secs = Math.round(900 * (1 - local));
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export const PARTS = ['sole', 'insole', 'laces', 'tongue', 'upper'];

export const EXPLODE = {
  sole: [0, -0.95, 0],
  insole: [0.05, -0.34, 0.34],
  laces: [-0.05, 0.62, -0.3],
  tongue: [-0.55, 0.98, -0.55],
  upper: [0, 0, 0],
};

export const ANCHORS = [
  { part: 'sole', point: [0.3836, -0.7647, 0.3499] },
  { part: 'insole', point: [0.0869, -0.3015, 0.0114] },
  { part: 'laces', point: [0.2442, 0.5881, 0.2996] },
  { part: 'tongue', point: [0.4026, 0.7647, -0.0851] },
];

export const CALLOUT_LABELS = ['Подошва', 'Стелька', 'Шнурки', 'Язычок'];

export const CATEGORY_ROWS = [
  { title: 'Обувь', desc: 'Кроссовки, бутсы, кеды', asset: 'sneaker', color: 0xff6a3d },
  { title: 'Одежда', desc: 'Футболки, худи, куртки', asset: 'hoodie', color: 0x4c89ff },
  { title: 'Инвентарь', desc: 'Мячи, гантели, коврики', asset: 'ball', color: 0x40cf8e },
];

export const MODEL_URLS = {
  sneaker: '/models/sneaker.glb',
  hoodie: '/models/hoodie.glb',
  ball: '/models/tennis-ball.glb',
};
