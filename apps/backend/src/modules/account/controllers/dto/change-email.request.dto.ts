import { ApiProperty } from "@nestjs/swagger"
import { Transform } from "class-transformer"
import { IsEmail, MaxLength } from "class-validator"

export class ChangeEmailRequestDto {
  @ApiProperty({ example: "eva.nova@example.cz" })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  newEmail!: string
}
