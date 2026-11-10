import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  EXCUSED = 'excused',
}

export class CreateAttendanceDto {
  @IsInt()
  @Min(1)
  studentEnrollmentId: number;

  @IsInt()
  @Min(1)
  classSubjectId: number;

  @IsString()
  attendanceDate: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remarks?: string;
}