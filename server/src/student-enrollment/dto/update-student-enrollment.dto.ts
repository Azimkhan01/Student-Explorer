import { PartialType } from '@nestjs/mapped-types';
import { CreateStudentEnrollmentDto } from './create-student-enrollment.dto.js';

export class UpdateStudentEnrollmentDto extends PartialType(
  CreateStudentEnrollmentDto,
) {}