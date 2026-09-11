import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Sse,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Observable, interval, switchMap, takeWhile, map, from } from 'rxjs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionsService } from './submissions.service';

@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Post()
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSubmissionDto,
  ) {
    return this.submissions.create(user.sub, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('activityId') activityId?: string,
  ) {
    return this.submissions.findAll(user.sub, user.role, activityId);
  }

  @Get(':id')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.submissions.findById(id, user.sub, user.role);
  }

  @Sse(':id/events')
  streamEvents(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Observable<MessageEvent> {
    return interval(600).pipe(
      switchMap(() => from(this.submissions.findById(id, user.sub, user.role))),
      map((sub) => ({ data: sub } as MessageEvent)),
      takeWhile((event: MessageEvent) => {
        const data = event.data as { status?: string } | undefined;
        const status = data?.status;
        return status === 'queued' || status === 'running' || status === 'pending';
      }, true), // inclusive of final state
    );
  }
}
