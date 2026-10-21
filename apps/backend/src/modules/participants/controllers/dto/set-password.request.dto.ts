import { MIN_PASSWORD_LENGTH } from "@/modules/participants/domain/password"
import { ApiProperty } from "@nestjs/swagger"

export class SetPasswordRequestDto {
  @ApiProperty({ minLength: MIN_PASSWORD_LENGTH, example: "my-own-password" })
  password!: string
}
