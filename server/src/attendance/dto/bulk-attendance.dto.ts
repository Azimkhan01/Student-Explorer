import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMinSize,
  MaxLength,
  Min,
  IsEnum,
} from 'class-validator';

import { Type } from 'class-transformer';

import { AttendanceStatus } from './create-attendance.dto.js';

export class AttendanceRecordDto {
  @IsInt()
  @Min(1)
  studentEnrollmentId: number;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remarks?: string;
}

export class BulkAttendanceDto {
  @IsInt()
  @Min(1)
  classSubjectId: number;

  @IsDateString()
  attendanceDate: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records: AttendanceRecordDto[];
}