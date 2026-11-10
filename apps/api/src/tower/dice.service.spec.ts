import { DiceService } from './dice.service';

describe('DiceService', () => {
  it('dado fixo: devolve a sequência programada, na ordem', () => {
    const dice = new DiceService();
    dice.setFixedRolls([1, 6, 3]);
    expect(dice.roll()).toBe(1);
    expect(dice.roll()).toBe(6);
    expect(dice.roll()).toBe(3);
  });

  it('sem dado fixo: rola entre 1 e 6', () => {
    const dice = new DiceService();
    for (let i = 0; i < 100; i++) {
      const roll = dice.roll();
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(6);
    }
  });
});
