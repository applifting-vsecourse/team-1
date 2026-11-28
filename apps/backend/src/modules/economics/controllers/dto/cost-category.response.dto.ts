import { Locale } from "@/core/email/locale"
import {
  CostCategory,
  CostCategoryKey,
  costCategoryName,
  defaultCostCategories,
} from "@/modules/economics/domain/cost-category"
import { ApiProperty } from "@nestjs/swagger"

export class CostCategoryResponseDto {
  @ApiProperty()
  id!: string

  @ApiProperty({
    enum: defaultCostCategories().map((category) => category.defaultKey),
    nullable: true,
    description: "Which default category this is; null for a category of the organizer's own.",
  })
  defaultKey!: CostCategoryKey | null

  @ApiProperty({ description: "Default categories follow Accept-Language." })
  name!: string

  @ApiProperty()
  position!: number

  static fromDomain(category: CostCategory, locale: Locale): CostCategoryResponseDto {
    return {
      id: category.id,
      defaultKey: category.defaultKey,
      name: costCategoryName(category, locale),
      position: category.position,
    }
  }
}
