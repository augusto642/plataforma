import { Module, Global } from '@nestjs/common';
import { RequestContextService } from './context/request-context.service';
import { PrismaExceptionFilter } from './filters/prisma-exception.filter';

@Global()
@Module({
  providers: [RequestContextService, PrismaExceptionFilter],
  exports: [RequestContextService, PrismaExceptionFilter],
})
export class CommonModule {}
