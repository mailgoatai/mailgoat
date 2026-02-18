import { parseScheduleInput } from '../scheduler';

describe('scheduler utilities', () => {
  it('parses valid local datetime format', () => {
    const date = parseScheduleInput('2026-03-01 09:00');

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(1);
    expect(date.getHours()).toBe(9);
    expect(date.getMinutes()).toBe(0);
  });

  it('rejects invalid datetime format', () => {
    expect(() => parseScheduleInput('03/01/2026 09:00')).toThrow('Invalid --schedule format');
  });

  it('rejects impossible date', () => {
    expect(() => parseScheduleInput('2026-02-30 09:00')).toThrow('Invalid scheduled date/time');
  });
});
