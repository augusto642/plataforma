import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';

describe('GamificationController', () => {
  let controller: GamificationController;
  let service: {
    claimDailyBonus: jest.Mock;
    getDailyBonusStatus: jest.Mock;
  };

  beforeEach(() => {
    service = {
      claimDailyBonus: jest.fn(),
      getDailyBonusStatus: jest.fn(),
    };
    controller = new GamificationController(service as unknown as GamificationService);
  });

  it('deve delegar getDailyStatus ao serviço', async () => {
    service.getDailyBonusStatus.mockResolvedValueOnce({ claimed: false, date: '2026-11-13' });
    const user: any = { sub: 'user-1' };

    const res = await controller.getDailyStatus(user);

    expect(service.getDailyBonusStatus).toHaveBeenCalledWith('user-1');
    expect(res).toEqual({ claimed: false, date: '2026-11-13' });
  });

  it('deve delegar claimDailyBonus ao serviço', async () => {
    service.claimDailyBonus.mockResolvedValueOnce({
      claimed: true,
      xpAwarded: 50,
      bitsAwarded: 25,
      newXp: 250,
      newLevel: 2,
    });
    const user: any = { sub: 'user-1' };

    const res = await controller.claimDailyBonus(user);

    expect(service.claimDailyBonus).toHaveBeenCalledWith('user-1');
    expect(res.claimed).toBe(true);
    expect(res.xpAwarded).toBe(50);
  });
});
