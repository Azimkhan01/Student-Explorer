import {
  IsDateString,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AttendanceQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  classSubjectId: number;

  @IsDateString()
  attendanceDate: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  academicYearId?: number;
}