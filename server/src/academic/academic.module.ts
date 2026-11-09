import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AcademicController } from './academic.controller.js';
import { AcademicService } from './academic.service.js';

import { AcademicYear } from '../entity/academic-year.entity.js';
import { Class } from '../entity/class.entity.js';
import { Subject } from '../entity/subject.entity.js';
import { Teacher } from '../entity/teacher.entity.js';
import { ClassSubject } from '../entity/class-subject.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AcademicYear,
      Class,
      Subject,
      Teacher,
      ClassSubject,
    ]),
  ],
  controllers: [AcademicController],
  providers: [AcademicService],
  exports: [AcademicService],
})
export class AcademicModule {}