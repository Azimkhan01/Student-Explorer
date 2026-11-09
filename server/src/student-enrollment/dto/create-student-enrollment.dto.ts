import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  IsIn,
} from 'class-validator';

export class CreateStudentEnrollmentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  studentId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  classId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  academicYearId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  rollNumber: string;

  @IsString()
  @IsIn(['active', 'completed', 'transferred', 'withdrawn'])
  status: string;
}