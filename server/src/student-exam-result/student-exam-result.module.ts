
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exam } from '../entity/exam.entity.js';
import { Student } from '../entity/student.entity.js';
import { StudentEnrollment } from '../entity/student-enrollment.entity.js';
import { StudentExamResultController } from './student-exam-result.controller.js';
import { StudentExamResultService } from './student-exam-result.service.js';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      Exam,
      Student,
      StudentEnrollment,
    ]),
  ],
  controllers: [StudentExamResultController],
  providers: [StudentExamResultService],
})
export class StudentExamResultModule {}
