import { Module } from '@nestjs/common';
import { TeacherController } from './teacher.controller.js';
import { TeacherService } from './teacher.service.js';
import { Teacher } from '../entity/teacher.entity.js';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({ 
  imports: [TypeOrmModule.forFeature([Teacher])],
  controllers: [TeacherController],
  providers: [TeacherService]
})
export class TeacherModule {}
