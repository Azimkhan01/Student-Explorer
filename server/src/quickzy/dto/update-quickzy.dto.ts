import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateQnADTO {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  options: string[];

  @IsInt()
  @Min(0)
  correct_answer: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  marks?: number;
}

export class UpdateQuickzyDTO {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  quickzy_name?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateQnADTO)
  questions?: UpdateQnADTO[];
}