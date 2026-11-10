import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Exam } from '../entity/exam.entity.js';
import { ClassSubject } from '../entity/class-subject.entity.js';

import { ExamService } from './exam.service.js';
import { ExamController } from './exam.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Exam,
      ClassSubject,
    ]),
  ],

  controllers: [
    ExamController,
  ],

  providers: [
    ExamService,
  ],

  exports: [
    ExamService,
  ],
})
export class ExamModule {}