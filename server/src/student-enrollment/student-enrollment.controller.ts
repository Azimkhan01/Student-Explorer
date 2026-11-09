import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { StudentEnrollmentService } from './student-enrollment.service.js';

import { CreateStudentEnrollmentDto } from './dto/create-student-enrollment.dto.js';
import { UpdateStudentEnrollmentDto } from './dto/update-student-enrollment.dto.js';
import { StudentEnrollmentQueryDto } from './dto/student-enrollment-query.dto.js';

@Controller('student-enrollments')
export class StudentEnrollmentController {
  constructor(
    private readonly enrollmentService: StudentEnrollmentService,
  ) {}

  @Post()
  create(@Body() dto: CreateStudentEnrollmentDto) {
    return this.enrollmentService.create(dto);
  }

  @Get()
  findAll(@Query() query: StudentEnrollmentQueryDto) {
    return this.enrollmentService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.enrollmentService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStudentEnrollmentDto,
  ) {
    return this.enrollmentService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.enrollmentService.remove(id);
  }
}