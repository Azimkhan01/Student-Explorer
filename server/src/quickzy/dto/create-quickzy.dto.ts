
import {
  IsArray,
  IsNotEmpty,
  IsString,
  IsInt,
  Min,
  ValidateNested,
  ArrayMinSize,
  IsOptional,
} from 'class-validator';

import { Type } from 'class-transformer';

export class CreateQnADTO {
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

export class CreateQuickzyDTO {
  @IsString()
  @IsNotEmpty()
  quickzy_name: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQnADTO)
  questions: CreateQnADTO[];
}
