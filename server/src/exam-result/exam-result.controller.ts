import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';

import type { Request } from 'express';

import { ExamResultService } from './exam-result.service.js';
import { BulkExamResultDto } from './dto/bulk-exam-result.dto.js';

import { JwtAuthGuard } from '../utils/guard/jwt-auth.guard.js';
import { RolesGuard } from '../utils/guard/roles.guard.js';
import { Roles } from '../utils/decorator/roles.decorator.js';
import { UpdateExamResultDto } from './dto/update-exam-result.dto.js';

type AuthenticatedRequest = Request & {
  user: {
    id: number;
    role: 'admin' | 'teacher';
  };
};

@Controller('exam-results')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'teacher')
export class ExamResultController {
  constructor(
    private readonly examResultService: ExamResultService,
  ) {}

  @Get('exam/:examId')
  getExamResults(
    @Param('examId', ParseIntPipe) examId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.examResultService.getExamResults(examId, req.user);
  }

  @Post('exam/:examId/bulk')
  saveBulkResults(
    @Param('examId', ParseIntPipe) examId: number,
    @Body() dto: BulkExamResultDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.examResultService.saveBulkResults(
      examId,
      dto,
      req.user,
    );
  }

  @Patch(':resultId')
  updateResult(
    @Param('resultId', ParseIntPipe) resultId: number,
    @Body() dto: UpdateExamResultDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.examResultService.updateResult(
      resultId,
      dto,
      req.user,
    );
  }

  @Delete(':resultId')
  deleteResult(
    @Param('resultId', ParseIntPipe) resultId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.examResultService.deleteResult(
      resultId,
      req.user,
    );
  }

  @Get('exam/:examId/summary')
  getExamSummary(
    @Param('examId', ParseIntPipe) examId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.examResultService.getExamSummary(examId, req.user);
  }
}