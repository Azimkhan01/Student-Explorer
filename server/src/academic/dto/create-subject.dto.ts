import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateSubjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  subjectName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;
}