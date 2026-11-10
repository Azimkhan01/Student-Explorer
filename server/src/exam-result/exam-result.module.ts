import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Exam } from '../entity/exam.entity.js';
import { ExamResult } from '../entity/exam-result.entity.js';
import { StudentEnrollment } from '../entity/student-enrollment.entity.js';

import { ExamResultService } from './exam-result.service.js';
import { ExamResultController } from './exam-result.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Exam,
      ExamResult,
      StudentEnrollment,
    ]),
  ],
  controllers: [ExamResultController],
  providers: [ExamResultService],
  exports: [ExamResultService],
})
export class ExamResultModule {}