import { UnauthorizedException } from '@nestjs/common';
import { CoursesController } from './courses.controller';

describe('CoursesController public catalog age gate', () => {
  const catalog = [{ slug: 'javascript', title: 'JavaScript' }];
  let controller: CoursesController;
  let courses: { findPublicCatalog: jest.Mock };
  let auth: { verifyGuestAgeEligibilityToken: jest.Mock };

  beforeEach(() => {
    courses = {
      findPublicCatalog: jest.fn().mockResolvedValue(catalog),
    };
    auth = {
      verifyGuestAgeEligibilityToken: jest.fn(),
    };
    controller = new CoursesController(courses as any, {} as any, auth as any, {} as any);
  });

  it('rejects catalog access without a valid eligibility token', async () => {
    auth.verifyGuestAgeEligibilityToken.mockResolvedValue(false);

    await expect(controller.findPublicCatalog()).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(courses.findPublicCatalog).not.toHaveBeenCalled();
  });

  it('returns catalog data after validating the eligibility token', async () => {
    auth.verifyGuestAgeEligibilityToken.mockResolvedValue(true);

    await expect(controller.findPublicCatalog('signed-token')).resolves.toBe(
      catalog,
    );
    expect(auth.verifyGuestAgeEligibilityToken).toHaveBeenCalledWith(
      'signed-token',
    );
    expect(courses.findPublicCatalog).toHaveBeenCalledTimes(1);
  });
});
