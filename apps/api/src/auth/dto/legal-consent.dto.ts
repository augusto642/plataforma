import { Equals } from 'class-validator';

export class LegalConsentDto {
  @Equals(true)
  adultConfirmed?: boolean;

  @Equals(true)
  termsAccepted?: boolean;

  @Equals(true)
  privacyAcknowledged?: boolean;
}
