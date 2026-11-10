import { IsOptional, Matches } from 'class-validator';

export class StudentAttendanceQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'Month must be in YYYY-MM format',
  })
  month?: string;
}