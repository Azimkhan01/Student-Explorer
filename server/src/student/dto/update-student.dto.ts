import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  IsDateString,
} from 'class-validator';

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @Length(2, 50)
  username?: string;

  @IsOptional()
  @IsEmail()
  @Length(1, 100)
  email?: string;

  @IsOptional()
  @IsDateString()
  dob?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  contact?: string | null;
}