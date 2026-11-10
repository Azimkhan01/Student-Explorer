
import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    ParseIntPipe,
    UseGuards,
    Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { AttendanceService } from './attendance.service.js';

import { CreateAttendanceDto } from './dto/create-attendance.dto.js';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto.js';
import { UpdateAttendanceDto } from './dto/update-attendance.dto.js';
import { AttendanceQueryDto } from './dto/attendance-query.dto.js';
import { JwtAuthGuard } from '../utils/guard/jwt-auth.guard.js';
import { MarkAttendanceQRDto } from './dto/mark-attendance-qr.dto.js';
import { Roles } from '../utils/decorator/roles.decorator.js';
import { RolesGuard } from '../utils/guard/roles.guard.js';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto.js';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
    constructor(
        private readonly attendanceService: AttendanceService,
    ) { }

    // Get students and their existing attendance for a class subject
    @Get('sheet')
    @Roles('teacher')
    getStudentsForAttendance(
        @Query() query: AttendanceQueryDto,
    ) {
        return this.attendanceService.getStudentsForAttendance(query);
    }

    // Submit attendance for multiple students
    @Post('bulk')
    @Roles('teacher')
    bulkCreateAttendance(
        @Body() dto: BulkAttendanceDto,
    ) {
        return this.attendanceService.bulkCreateAttendance(dto);
    }

    // Create attendance for one student
    @Post()
    @Roles('teacher')
    createAttendance(
        @Body() dto: CreateAttendanceDto,
    ) {
        return this.attendanceService.createAttendance(dto);
    }

    // Get attendance summary for a class subject and date
    @Get('summary')
    @Roles('teacher')
    getAttendanceSummary(
        @Query() query: AttendanceQueryDto,
    ) {
        return this.attendanceService.getAttendanceSummary(query);
    }

    // Get all attendance records for a student enrollment
    @Get('enrollment/:enrollmentId')
    @Roles('teacher')
    getStudentAttendance(
        @Param('enrollmentId', ParseIntPipe) enrollmentId: number,
    ) {
        return this.attendanceService.getStudentAttendance(enrollmentId);
    }

    // Get a particular attendance record
    @Get(':id')
    getAttendanceById(
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.attendanceService.getAttendanceById(id);
    }

    // Update attendance
    @Patch(':id')
    updateAttendance(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateAttendanceDto,
    ) {
        return this.attendanceService.updateAttendance(id, dto);
    }

    // Delete attendance
    @Delete(':id')
    @Roles('teacher', 'admin')
    deleteAttendance(
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.attendanceService.deleteAttendance(id);
    }

    @Get('student/me')
    @Roles('student')
    getMyAttendance(
        @Req() req: Request & { user: { id: number } },
        @Query('month') month: string,
    ) {
        return this.attendanceService.getStudentAttendanceHistory(
            req.user.id,
            { month },
        );
    }

    @Post('qr/mark')
    @Roles('student')
    markAttendanceUsingQR(
        @Req() req: Request & { user: { id: number } },
        @Body() dto: MarkAttendanceQRDto,
    ) {
        return this.attendanceService.markAttendanceUsingQR(
            req.user.id,
            dto,
        );
    }

    // --------------------------------------------------
    // CREATE QR ATTENDANCE SESSION - TEACHER
    // --------------------------------------------------

    @Post('session/create')
    @Roles('teacher')
    createAttendanceSession(
        @Req() req: Request & { user: { id: number } },
        @Body() dto: CreateAttendanceSessionDto,
    ) {
        return this.attendanceService.createAttendanceSession(
            req.user.id,
            dto,
        );
    }

    // --------------------------------------------------
    // CLOSE QR ATTENDANCE SESSION - TEACHER
    // --------------------------------------------------

    @Post('session/:id/close')
    @Roles('teacher')
    closeAttendanceSession(
        @Req() req: Request & { user: { id: number } },
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.attendanceService.closeAttendanceSession(
            req.user.id,
            id,
        );
    }
}
