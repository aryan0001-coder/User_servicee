import { IsOptional, IsPositive, IsString } from "class-validator";
import { Type } from "class-transformer";

export class QueryUserDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  page?: number;
}
