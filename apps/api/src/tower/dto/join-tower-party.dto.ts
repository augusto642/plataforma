import { IsUUID } from 'class-validator';

export class JoinTowerPartyDto {
  @IsUUID()
  partyId!: string;
}
