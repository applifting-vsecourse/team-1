import {
  ALLERGIES_MAX_LENGTH,
  KitchenTermSummary,
  MEAL_OPTION_NAME_MAX_LENGTH,
  MEAL_OPTIONS_MAX,
  MealOption,
  OwnMeals,
} from "@/modules/meals/domain/meals"
import { ApiProperty } from "@nestjs/swagger"
import { Type } from "class-transformer"
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator"

export class MealOptionInputDto {
  @ApiProperty({ required: false, description: "Id of an existing option; omitted for a new one." })
  @IsOptional()
  @IsString()
  id?: string

  @ApiProperty({ maxLength: MEAL_OPTION_NAME_MAX_LENGTH })
  @IsString()
  @MaxLength(MEAL_OPTION_NAME_MAX_LENGTH)
  name!: string
}

export class SaveMealOptionsRequestDto {
  @ApiProperty({ type: [MealOptionInputDto], maxItems: MEAL_OPTIONS_MAX })
  @IsArray()
  @ArrayMaxSize(MEAL_OPTIONS_MAX)
  @ValidateNested({ each: true })
  @Type(() => MealOptionInputDto)
  options!: MealOptionInputDto[]
}

export class MealOptionDto {
  @ApiProperty() id!: string
  @ApiProperty() name!: string

  static fromDomain(option: MealOption): MealOptionDto {
    return { id: option.id, name: option.name }
  }
}

export class SaveMealsRequestDto {
  @ApiProperty({ type: [String], description: "Ids of the ticked options of the event." })
  @IsArray()
  @IsString({ each: true })
  optionIds!: string[]

  @ApiProperty({ maxLength: ALLERGIES_MAX_LENGTH, description: "Empty clears the allergies." })
  @IsString()
  @MaxLength(ALLERGIES_MAX_LENGTH)
  allergies!: string
}

export class OwnMealsResponseDto {
  @ApiProperty() applicationId!: string
  @ApiProperty() eventName!: string
  @ApiProperty() firstName!: string
  @ApiProperty() lastName!: string
  @ApiProperty({ type: [MealOptionDto] }) options!: MealOptionDto[]
  @ApiProperty({ type: [String] }) selectedOptionIds!: string[]
  @ApiProperty({ type: String, nullable: true }) allergies!: string | null

  static fromDomain(meals: OwnMeals): OwnMealsResponseDto {
    return { ...meals, options: meals.options.map((option) => MealOptionDto.fromDomain(option)) }
  }
}

class KitchenOptionCountDto extends MealOptionDto {
  @ApiProperty() count!: number
}

class KitchenAllergyDto {
  @ApiProperty() applicationId!: string
  @ApiProperty() firstName!: string
  @ApiProperty() lastName!: string
  @ApiProperty() allergies!: string
}

export class KitchenTermSummaryDto {
  @ApiProperty() termId!: string
  @ApiProperty({ type: String, nullable: true }) name!: string | null
  @ApiProperty() startsOn!: string
  @ApiProperty() endsOn!: string
  @ApiProperty() total!: number
  @ApiProperty({ description: "Confirmed participants without any ticked restriction." })
  regular!: number
  @ApiProperty({ type: [KitchenOptionCountDto], description: "Counts may overlap." })
  options!: KitchenOptionCountDto[]
  @ApiProperty({ type: [KitchenAllergyDto] }) allergies!: KitchenAllergyDto[]

  static fromDomain(summary: KitchenTermSummary): KitchenTermSummaryDto {
    return {
      ...summary,
      startsOn: summary.startsOn.toISOString().slice(0, 10),
      endsOn: summary.endsOn.toISOString().slice(0, 10),
    }
  }
}
