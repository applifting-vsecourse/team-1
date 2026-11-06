import { OrganizationProfile } from "@/modules/account/domain/organization"
import { ApiProperty } from "@nestjs/swagger"

export class OrganizationProfileResponseDto {
  @ApiProperty() id!: string
  @ApiProperty() name!: string
  @ApiProperty({ nullable: true, type: String }) contactEmail!: string | null
  @ApiProperty({ nullable: true, type: String }) contactPhone!: string | null
  @ApiProperty() bankAccount!: string

  static fromDomain(profile: OrganizationProfile): OrganizationProfileResponseDto {
    return {
      id: profile.id,
      name: profile.name,
      contactEmail: profile.contactEmail,
      contactPhone: profile.contactPhone,
      bankAccount: profile.bankAccount,
    }
  }
}
