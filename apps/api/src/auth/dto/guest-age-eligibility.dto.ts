import { Equals, IsBoolean } from 'class-validator';

export class GuestAgeEligibilityDto {
  @IsBoolean()
  @Equals(true)
  adultConfirmed!: boolean;
}
