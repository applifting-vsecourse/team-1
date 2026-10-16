import { Account } from '@/modules/account/domain/account';
import { AccountType } from '@/shared/auth/domain/identity';
import { ApiProperty } from '@nestjs/swagger';

export class OrganizationSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Letní kemp z. s.' })
  name!: string;
}

export class MeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'organizator@example.com' })
  email!: string;

  @ApiProperty({ type: String, nullable: true })
  name!: string | null;

  @ApiProperty({ enum: ['ORGANIZER', 'PARTICIPANT', 'ADMIN'] })
  accountType!: AccountType;

  @ApiProperty({
    description: 'Participant must choose a password first (US-04).',
  })
  mustSetPassword!: boolean;

  @ApiProperty({ type: [OrganizationSummaryDto] })
  organizations!: OrganizationSummaryDto[];

  static fromDomain(account: Account): MeResponseDto {
    return {
      id: account.id,
      email: account.email,
      name: account.name,
      accountType: account.accountType,
      mustSetPassword: account.mustSetPassword,
      organizations: account.organizations.map((organization) => ({
        id: organization.id,
        name: organization.name,
      })),
    };
  }
}
