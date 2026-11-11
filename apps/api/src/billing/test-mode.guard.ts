import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Fase 1 premium (desenho §2.1) — fail-closed.
 * Se `BILLING_MODE !== 'test'`, qualquer rota de checkout retorna 503
 * ("cobrança real não ativada"). Segunda camada: a validação de
 * segredos já impede o boot com BILLING_MODE explícito != test, então
 * este guard só dispara se a configuração mudar em runtime — e mesmo
 * assim, nada cobra.
 * Ausência da variável = modo teste (o ambiente local de testes não a
 * define); valor explícito diferente de 'test' falha no boot.
 */
@Injectable()
export class TestModeGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(_context: ExecutionContext): boolean {
    const mode = this.config.get<string>('BILLING_MODE', 'test');
    if (mode !== 'test') {
      throw new ServiceUnavailableException(
        'Cobrança real não ativada: o checkout está disponível apenas em modo de testes.',
      );
    }
    return true;
  }
}
