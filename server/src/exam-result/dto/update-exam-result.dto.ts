import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateExamResultDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  marksObtained?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remarks?: string;
}