
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SocketModule } from './socket/socket.module.js';
import { AuthModule } from './auth/auth.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentModule } from './student/student.module.js';
import { ConfigModule } from '@nestjs/config';
import { TeacherModule } from './teacher/teacher.module.js';
import { AcademicModule } from './academic/academic.module.js';
import { StudentEnrollmentModule } from './student-enrollment/student-enrollment.module.js';
import { AttendanceModule } from './attendance/attendance.module.js';
import * as Entities from './entity/index.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5431,
      username: 'postgres',
      password: 'admin',
      database: 'learning',
      entities: Object.values(Entities),
      synchronize: true,
    }),
    SocketModule,
    AuthModule,
    StudentModule,
    TeacherModule,
    AcademicModule,
    StudentEnrollmentModule,
    AttendanceModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
