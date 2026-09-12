import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class StartFishingDto {
  @IsString()
  spotId!: string;

  @IsIn(["FLOAT", "SPINNING", "FEEDER", "BOTTOM", "CARP", "TROLLING", "SEA", "ICE"])
  method!: "FLOAT" | "SPINNING" | "FEEDER" | "BOTTOM" | "CARP" | "TROLLING" | "SEA" | "ICE";
}

export class CastDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  force!: number;

  @IsNumber()
  direction!: number;

  @IsNumber()
  @Min(0.3)
  @Max(8)
  depthM!: number;

  @IsOptional()
  @IsIn(["even", "slow", "fast", "stepped", "twitch", "pause"])
  retrieve?: "even" | "slow" | "fast" | "stepped" | "twitch" | "pause";
}

export class HookDto {
  @IsNumber()
  timingMs!: number;
}

export class TickDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  reel!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  rodPressure!: number;

  @IsNumber()
  @Min(-1)
  @Max(1)
  rodDir!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  drag!: number;
}

export class DecideDto {
  @IsBoolean()
  keep!: boolean;
}

export class FeedDto {
  @IsString()
  mixItemId!: string;
}

export class NicknameDto {
  @IsString()
  nickname!: string;
}

export class ChatDto {
  @IsIn(["GLOBAL", "WATERBODY", "CLUB", "TOURNAMENT", "DIRECT"])
  channel!: "GLOBAL" | "WATERBODY" | "CLUB" | "TOURNAMENT" | "DIRECT";

  @IsString()
  roomId!: string;

  @IsString()
  body!: string;
}

export class BuyDto {
  @IsString()
  offerId!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  qty?: number;
}
