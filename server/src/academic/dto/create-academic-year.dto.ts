import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateAcademicYearDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  yearName: string;
}