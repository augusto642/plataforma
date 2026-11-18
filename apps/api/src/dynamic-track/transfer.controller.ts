import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { TransferService } from './transfer.service';

class TransferSubmissionDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(12_000)
  sourceCode!: unknown;
}

@Controller('transfer')
@UseGuards(JwtAuthGuard)
export class TransferController {
  constructor(private readonly transfer: TransferService) {}

  @Get(':submissionId')
  @Header('Cache-Control', 'no-store')
  challenge(@CurrentUser() user: JwtPayload, @Param('submissionId', ParseUUIDPipe) submissionId: string) {
    return this.transfer.challenge(user.sub, submissionId);
  }

  @Post(':submissionId')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store')
  submit(
    @CurrentUser() user: JwtPayload,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() dto: TransferSubmissionDto,
  ) {
    if (typeof dto.sourceCode !== 'string') {
      throw new BadRequestException('Código-fonte precisa ser texto.');
    }
    return this.transfer.submit(user.sub, submissionId, dto.sourceCode);
  }
}
