import { TypeOrmModule } from '@nestjs/typeorm';

import { Attendance } from '../entity/attendance.entity.js';
import { StudentEnrollment } from '../entity/student-enrollment.entity.js';
import { ClassSubject } from '../entity/class-subject.entity.js';
import { AttendanceSession } from '../entity/attendance-session.entity.js';
import { AttendanceController } from './attendance.controller.js';
import { AttendanceService } from './attendance.service.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Attendance,
      StudentEnrollment,
      ClassSubject,
      AttendanceSession,
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}