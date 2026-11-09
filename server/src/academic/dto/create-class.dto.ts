import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  standard: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  division?: string | null;
}