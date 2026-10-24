import { describe, expect, test } from 'vitest';
import PAL from '../art-src/palette.json';
import { panelArt, sourceOf } from '../src/ui/panelArt';
import { panelHTML, type PanelView } from '../src/ui/stationPanel';

/* 31-8Б: окна капельной кофеварки собраны из предмета бара (часть drip): налив из колбы («drip») и заварка колбы («carafe») */
const art = (task: string): string => panelArt({ task, col: '#5A3A28', col2: PAL.colors.PAPER, drink: 'filter_coffee', size: '0.3', cold: false });
const colors = new Set(Object.values(PAL.colors).map((c) => c.toLowerCase()).concat(['#5a3a28']));
const widths = new Set([PAL.stroke.L, PAL.stroke.M, PAL.stroke.D].map(String));

describe('окна кофеварки', () => {
  test('источник — предмет бара drip; в окне корпус, колба, уровень #xpCar и передний слой', () => {
    for (const t of ['drip', 'carafe']) {
      expect(sourceOf(t, 'filter_coffee')).toEqual([{ part: 'drip', marker: 'data-item="drip"' }]);
      const s = art(t);
      expect(s, t).toContain('data-item="drip"');
      expect(s, t).toContain('id="xpCar"');
      expect(s, t).toContain('data-full="52.0"');
    }
  });
  test('налив из колбы: стакан с #xpLiq, у окна заварки стакана нет', () => {
    expect(art('drip')).toContain('id="xpLiq"');
    expect(art('carafe')).not.toContain('id="xpLiq"');
  });
  test('цвета только из палитры, толщины только L/M/D', () => {
    for (const t of ['drip', 'carafe']) {
      const s = art(t);
      for (const m of s.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{6})"/g)) expect(colors.has((m[1] as string).toLowerCase()), `${t}: цвет ${m[1]}`).toBe(true);
      for (const m of s.matchAll(/stroke-width="([\d.]+)"/g)) expect(widths.has(String(Number(m[1]))), `${t}: толщина ${m[1]}`).toBe(true);
    }
  });
  test('разметка окна заварки: три порции в первой фазе, кнопки кофе и воды в следующих, шкала при ожидании', () => {
    const base: PanelView = { task: 'carafe', kind: 'carafe', title: 'Заварить', hint: '', col: '#7A4A38', col2: '#FFF8EC', max: 1, zone: [0, 0], holdLabel: '' };
    const sizes = [{ size: '0.6', label: '0,6 л', disabled: false }, { size: '0.9', label: '0,9 л', disabled: true }, { size: '1.2', label: '1,2 л', disabled: false }];
    const size = panelHTML({ ...base, carafe: { phase: 'size', sizes, doneLabel: '', holdLabel: '' } });
    expect((size.match(/data-xsize=/g) ?? []).length).toBe(3);
    expect(size).toMatch(/data-xsize="0\.9" disabled/);
    const coffee = panelHTML({ ...base, zone: [38, 44], max: 70, carafe: { phase: 'coffee', sizes, doneLabel: 'Дальше', holdLabel: 'Засыпать (держите)' } });
    for (const k of ['data-xhold', 'data-xdump', 'data-xdone', 'data-xback']) expect(coffee).toContain(k);
    expect(coffee).toContain('Дальше');
    const wait = panelHTML({ ...base, carafe: { phase: 'brewing', sizes, doneLabel: '', holdLabel: '' } });
    expect(wait).toContain('id="xpFill"');
    expect(wait).not.toContain('data-xhold');
  });
});
