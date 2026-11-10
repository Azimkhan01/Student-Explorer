
import {
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../utils/guard/jwt-auth.guard.js';
import { RolesGuard } from '../utils/guard/roles.guard.js';
import { StudentExamResultService } from './student-exam-result.service.js';
import { Roles } from '../utils/decorator/roles.decorator.js';


interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    role: 'admin' | 'teacher' | 'student';
  };
}

@Controller('student-exam-result')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentExamResultController {
  constructor(
    private readonly studentExamResultService: StudentExamResultService,
  ) {}

  @Get('exam-results')
  @Roles('student','admin')
  getStudentExamResults(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.studentExamResultService.getStudentExamResults(
      req.user,
    );
  }
}
