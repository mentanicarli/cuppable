import { baristaCells, baristaParts, personParts, type BaristaFace, type MoodId } from '../../src/render/world/art';
import { patienceMax, estimatedPrepSeconds } from '../../src/game/patience';
import { rollOrder } from '../../src/game/orders';
import type { Rng } from '../../src/game/types';

/** Хеш cyrb53: достаточно для сравнения «картинка не изменилась», без зависимости от node. */
export const sha = (s: string): string => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16) + '-' + s.length;
};
export const mulberry = (a: number): Rng => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Фиксированные старые внешности (до 32-Б, без sex/age/facial): картинка не должна меняться. hp — название аксессуара «наушники» в текущем коде. */
export function fixedLooks(hp: string): Record<string, unknown>[] {
  const base = { skin: '#EBC09A', hairCol: '#3A2A22', cloth: '#C4694A', pants: '#4F4A5A', acc: 'none', item: 'none', build: 'mid' };
  const out: Record<string, unknown>[] = [];
  for (const hair of ['grey', 'short', 'bob', 'bun', 'curly', 'beanie', 'long', 'pony']) {
    out.push({ ...base, hair, outfit: 'sweater', hat: '#5F7A8A', hairCol: hair === 'grey' ? '#CFC4B4' : '#7A3E2B' });
  }
  for (const outfit of ['hoodie', 'coat', 'jacket', 'suit']) out.push({ ...base, hair: 'short', outfit, cloth: '#4A5568', shoe: '#FBF4E8' });
  out.push({ ...base, hair: 'bob', outfit: 'coat', acc: 'glasses', item: 'tote', build: 'round', mustache: true });
  out.push({ ...base, hair: 'bun', outfit: 'hoodie', acc: 'backpack', build: 'slim' });
  out.push({ ...base, hair: 'pony', outfit: 'hoodie', acc: hp, build: 'slim' });
  out.push({ ...base, hair: 'short', outfit: 'suit', item: 'briefcase', pants: '#3A3440', skin: '#A26C49' });
  out.push({ ...base, hair: 'curly', outfit: 'coat', acc: 'scarf', skin: '#F5D0AE' });
  return out;
}

const MOODS: MoodId[] = ['neutral', 'happy', 'joy', 'wait', 'annoyed', 'angry'];
/** Хеш всех частей фигуры (клетки атласа, сидячие клетки, головы всех настроений, моргание, взгляд). */
export function partsHash(look: never): string {
  const parts: string[] = [];
  for (const seat of [false, true]) {
    const p = personParts(look, seat);
    for (const c of [...p.cells, ...p.seatCells]) parts.push(c.id, JSON.stringify(c.box), c.svg);
    parts.push(String(p.hairBack), p.skin);
    for (const m of MOODS) for (const b of [false, true]) parts.push(p.head(m, b, { x: 0, y: 0 }), p.head(m, b, { x: 1.9, y: 0.4 }));
  }
  return sha(parts.join('\u0001'));
}

export function baristaHash(): string {
  const b = baristaParts();
  const faces: BaristaFace[] = ['smile', 'blink', 'joy', 'focus', 'tired'];
  return sha([b.body, b.arm, b.arm2, b.heldCup, ...faces.map((f) => b.head(f)), ...baristaCells().map((c) => c.id + JSON.stringify(c.box) + c.svg)].join('\u0001'));
}

/** Поток заказов так, как его бросает spawn: rollOrder → patienceMax → внешность → art, ph, walk. */
export function orderStream(rng: Rng, look: (type: 'regular' | 'student' | 'hurry') => void, n = 400): string {
  const types = ['regular', 'student', 'regular', 'hurry', 'student'] as const;
  const eq = { tea: true, matcha: true, juice: true, ice: true, drip: true };
  const state = { rank: 6, day: 14, milk: true, eq };
  const log: unknown[] = [];
  for (let i = 0; i < n; i++) {
    const type = types[i % types.length] as 'regular' | 'student' | 'hurry';
    const order = rollOrder(state, type, rng);
    const pat = patienceMax(type, { cozy: false, helper: false, prep: estimatedPrepSeconds(order), day: 14, rng });
    look(type);
    log.push(order, Math.round(pat * 1000), rng(), rng(), rng());
  }
  return sha(JSON.stringify(log));
}
