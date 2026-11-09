import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  IsDateString,
} from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  username: string;

  @IsEmail()
  @IsNotEmpty()
  @Length(1, 100)
  email: string;

  @IsOptional()
  @IsDateString()
  dob?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  contact?: string | null;
}