import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';

import { AcademicService } from './academic.service.js';

import { CreateAcademicYearDto } from './dto/create-academic-year.dto.js';
import { CreateClassDto } from './dto/create-class.dto.js';
import { CreateSubjectDto } from './dto/create-subject.dto.js';
import { CreateClassSubjectDto } from './dto/create-class-subject.dto.js';

@Controller('academic')
export class AcademicController {
  constructor(
    private readonly academicService: AcademicService,
  ) {}

  // =========================================
  // ACADEMIC YEARS
  // =========================================

  @Get('years')
  getYears() {
    
    return this.academicService.getYears();
  }

  @Post('years')
  createYear(@Body() dto: CreateAcademicYearDto) {
    return this.academicService.createYear(dto);
  }

  @Patch('years/:id/current')
  setCurrentYear(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.academicService.setCurrentYear(id);
  }

  @Delete('years/:id')
  deleteYear(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.academicService.deleteYear(id);
  }

  // =========================================
  // CLASSES
  // =========================================

  @Get('classes')
  getClasses() {
    return this.academicService.getClasses();
  }

  @Post('classes')
  createClass(@Body() dto: CreateClassDto) {
    return this.academicService.createClass(dto);
  }

  @Delete('classes/:id')
  deleteClass(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.academicService.deleteClass(id);
  }

  // =========================================
  // SUBJECTS
  // =========================================

  @Get('subjects')
  getSubjects() {
    return this.academicService.getSubjects();
  }

  @Post('subjects')
  createSubject(@Body() dto: CreateSubjectDto) {
    return this.academicService.createSubject(dto);
  }

  @Delete('subjects/:id')
  deleteSubject(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.academicService.deleteSubject(id);
  }

  // =========================================
  // ASSIGNMENTS
  // =========================================

  @Get('assignments')
  getAssignments() {
    return this.academicService.getAssignments();
  }

  @Post('assignments')
  createAssignment(@Body() dto: CreateClassSubjectDto) {
    return this.academicService.createAssignment(dto);
  }

  @Delete('assignments/:id')
  deleteAssignment(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.academicService.deleteAssignment(id);
  }
}