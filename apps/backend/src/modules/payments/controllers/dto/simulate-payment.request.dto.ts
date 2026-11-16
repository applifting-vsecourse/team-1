import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsString } from "class-validator"

export class SimulatePaymentRequestDto {
  @ApiProperty({ description: "Term whose remaining debt the simulated payment settles." })
  @IsString()
  @IsNotEmpty()
  termId!: string
}
