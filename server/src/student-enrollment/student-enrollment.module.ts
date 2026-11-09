import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StudentEnrollment } from '../entity/student-enrollment.entity.js';
import { Student } from '../entity/student.entity.js';
import { Class } from '../entity/class.entity.js';
import { AcademicYear } from '../entity/academic-year.entity.js';

import { StudentEnrollmentController } from './student-enrollment.controller.js';
import { StudentEnrollmentService } from './student-enrollment.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentEnrollment,
      Student,
      Class,
      AcademicYear,
    ]),
  ],
  controllers: [StudentEnrollmentController],
  providers: [StudentEnrollmentService],
  exports: [StudentEnrollmentService],
})
export class StudentEnrollmentModule {}