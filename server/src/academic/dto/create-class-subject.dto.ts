import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class CreateClassSubjectDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  classId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  subjectId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  teacherId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  academicYearId: number;
}