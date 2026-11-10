import {
  IsInt,
  IsNumber,
  IsDateString,
  Min,
  Max,
} from 'class-validator';

export class CreateAttendanceSessionDto {
  @IsInt()
  @Min(1)
  classSubjectId: number;

  @IsDateString()
  attendanceDate: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsInt()
  @Min(1)
  @Max(10)
  durationMinutes: number;
}