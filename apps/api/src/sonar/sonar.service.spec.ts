import { ConfigService } from '@nestjs/config';
import { SonarService, SonarMetrics } from './sonar.service';

describe('SonarService', () => {
  let service: SonarService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'SONAR_HOST_URL') return 'http://localhost:9000';
        if (key === 'SONAR_TOKEN') return 'fake-sonar-token';
        return null;
      }),
    } as any;
    service = new SonarService(configService);
  });

  it('deve aplicar todos os bônus de Clean Code (A em manutenibilidade sem smells + A em segurança + cobertura >= 80%)', () => {
    const metrics: SonarMetrics = {
      qualityGateStatus: 'OK',
      maintainabilityRating: 'A',
      reliabilityRating: 'A',
      securityRating: 'A',
      codeSmellsCount: 0,
      bugsCount: 0,
      vulnerabilitiesCount: 0,
      coveragePercent: 88,
    };

    const evaluation = service.evaluateCleanCode(metrics, 200);

    expect(evaluation.qualityGatePassed).toBe(true);
    expect(evaluation.maintainabilityBonusPercent).toBe(30);
    expect(evaluation.securityBonusPercent).toBe(20);
    expect(evaluation.coverageBonusPercent).toBe(20);
    expect(evaluation.totalMultiplier).toBe(1.7);
    expect(evaluation.finalXp).toBe(340); // 200 * 1.7
    expect(evaluation.socraticSuggestions.length).toBe(0);
  });

  it('deve penalizar e sugerir reflexões socráticas se o Quality Gate falhar ou tiver baixa cobertura/smells', () => {
    const metrics: SonarMetrics = {
      qualityGateStatus: 'ERROR',
      maintainabilityRating: 'C',
      reliabilityRating: 'B',
      securityRating: 'C',
      codeSmellsCount: 12,
      bugsCount: 2,
      vulnerabilitiesCount: 1,
      coveragePercent: 42,
    };

    const evaluation = service.evaluateCleanCode(metrics, 200);

    expect(evaluation.qualityGatePassed).toBe(false);
    expect(evaluation.maintainabilityBonusPercent).toBe(0);
    expect(evaluation.securityBonusPercent).toBe(0);
    expect(evaluation.coverageBonusPercent).toBe(0);
    expect(evaluation.finalXp).toBe(80); // 200 * 0.4
    expect(evaluation.socraticSuggestions.length).toBeGreaterThan(0);
  });
});
