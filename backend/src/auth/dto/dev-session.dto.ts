import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class DevSessionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @Matches(/^[0-9]+$/, { message: "vkId must be numeric" })
  vkId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(32)
  nickname!: string;
}
