import { ArrayMaxSize, ArrayUnique, IsArray, IsString } from "class-validator"

export class ParticipantTermChangeRequestDto {
  @IsArray()
  @ArrayMaxSize(999)
  @ArrayUnique()
  @IsString({ each: true })
  termIds!: string[]
}
