import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DiagnosticController } from './diagnostic.controller';
import { DiagnosticService } from './diagnostic.service';

@Module({
  imports: [
    // Só para a verificação OPCIONAL do Bearer no submit anônimo
    // (mesmo padrão de registro do AuthModule).
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [DiagnosticController],
  providers: [DiagnosticService],
  exports: [DiagnosticService],
})
export class DiagnosticModule {}
