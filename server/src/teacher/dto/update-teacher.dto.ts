import { CreateTeacherDto } from './create-teacher.dto.js';
import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateTeacherDto extends PartialType(CreateTeacherDto) {
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}