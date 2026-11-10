import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';

import type { Request } from 'express';

import { ExamService } from './exam.service.js';
import { CreateExamDto } from './dto/create-exam.dto.js';

import { JwtAuthGuard } from '../utils/guard/jwt-auth.guard.js';
import { RolesGuard } from '../utils/guard/roles.guard.js';
import { Roles } from '../utils/decorator/roles.decorator.js';

type AuthenticatedRequest = Request & {
  user: {
    id: number;
    role: 'admin' | 'teacher';
  };
};

@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamController {
  constructor(
    private readonly examService: ExamService,
  ) {}

  @Get('assignments')
  @Roles('admin', 'teacher')
  getAssignments(@Req() req: AuthenticatedRequest) {
    return this.examService.getAssignments(req.user);
  }

  @Post()
  @Roles('admin', 'teacher')
  createExam(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateExamDto,
  ) {
    return this.examService.createExam(req.user, dto);
  }

  @Get()
  @Roles('admin', 'teacher')
  getExams(
    @Req() req: AuthenticatedRequest,
    @Query('classSubjectId') classSubjectId?: string,
  ) {
    const parsedId =
      classSubjectId === undefined
        ? undefined
        : Number(classSubjectId);

    return this.examService.getExams(req.user, parsedId);
  }

  @Get(':id')
  @Roles('admin', 'teacher')
  getExamById(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.examService.getExamById(req.user, id);
  }

  @Delete(':id')
  @Roles('admin', 'teacher')
  deleteExam(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.examService.deleteExam(req.user, id);
  }
}