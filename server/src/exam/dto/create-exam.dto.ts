import {
  IsInt,
  IsString,
  IsDateString,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateExamDto {
  @IsInt()
  @Min(1)
  classSubjectId!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  examName!: string;

  @IsInt()
  @Min(1)
  @Max(10000)
  maxMarks!: number;

  @IsDateString()
  examDate!: string;
}