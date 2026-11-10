import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
    InternalServerErrorException,
    ForbiddenException,
    UnauthorizedException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import {
    Repository,
    DataSource,
    In,
} from 'typeorm';

import {
    createHash,
    timingSafeEqual,
    randomBytes,
} from 'node:crypto';

import { Attendance } from '../entity/attendance.entity.js';
import { StudentEnrollment } from '../entity/student-enrollment.entity.js';
import { ClassSubject } from '../entity/class-subject.entity.js';
import { Student } from '../entity/student.entity.js';

import { CreateAttendanceDto } from './dto/create-attendance.dto.js';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto.js';
import { UpdateAttendanceDto } from './dto/update-attendance.dto.js';
import { AttendanceQueryDto } from './dto/attendance-query.dto.js';
import { StudentAttendanceQueryDto } from './dto/student-attendance-query.dto.js';
import { MarkAttendanceQRDto } from './dto/mark-attendance-qr.dto.js';
import { AttendanceSession } from '../entity/attendance-session.entity.js';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto.js';

@Injectable()
export class AttendanceService {
    private readonly logger = new Logger(AttendanceService.name);

    constructor(
        @InjectRepository(Attendance)
        private readonly attendanceRepository: Repository<Attendance>,

        @InjectRepository(StudentEnrollment)
        private readonly enrollmentRepository: Repository<StudentEnrollment>,

        @InjectRepository(ClassSubject)
        private readonly classSubjectRepository: Repository<ClassSubject>,

        @InjectRepository(AttendanceSession)
        private readonly attendanceSessionRepository: Repository<AttendanceSession>,

        private readonly dataSource: DataSource,
    ) { }

    // --------------------------------------------------
    // 1. Calculate distance between two GPS coordinates
    // --------------------------------------------------

    private calculateDistance(
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number,
    ): number {
        const earthRadius = 6371000;

        const toRadians = (value: number) => (value * Math.PI) / 180;

        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) ** 2;

        return (
            earthRadius *
            2 *
            Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        );
    }

    // --------------------------------------------------
    // 2. Get class subject details
    // --------------------------------------------------

    private async getClassSubject(classSubjectId: number) {
        const classSubject = await this.classSubjectRepository.findOne({
            where: { id: classSubjectId },
            relations: {
                class: true,
                subject: true,
                teacher: true,
                academicYear: true,
            },
        });

        if (!classSubject) {
            throw new NotFoundException('Class subject not found');
        }

        return classSubject;
    }

    // --------------------------------------------------
    // 3. Get students for attendance sheet
    // --------------------------------------------------

    async getStudentsForAttendance(query: AttendanceQueryDto) {
        const classSubject = await this.getClassSubject(
            query.classSubjectId,
        );

        if (
            query.academicYearId &&
            query.academicYearId !== classSubject.academicYear.id
        ) {
            throw new BadRequestException(
                'Academic year does not match the class subject',
            );
        }

        const enrollments = await this.enrollmentRepository.find({
            where: {
                class: { id: classSubject.class.id },
                academicYear: { id: classSubject.academicYear.id },
            },
            relations: {
                student: true,
            },
            order: {
                rollNumber: 'ASC',
            },
        });

        const existingAttendance = await this.attendanceRepository.find({
            where: {
                classSubject: { id: query.classSubjectId },
                attendanceDate: query.attendanceDate,
            },
            relations: {
                studentEnrollment: true,
            },
        });

        const attendanceMap = new Map(
            existingAttendance.map((record) => [
                record.studentEnrollment.id,
                record,
            ]),
        );

        return {
            classSubject: {
                id: classSubject.id,
                class: classSubject.class,
                subject: classSubject.subject,
                teacher: classSubject.teacher,
                academicYear: classSubject.academicYear,
            },

            attendanceDate: query.attendanceDate,

            totalStudents: enrollments.length,

            attendance: enrollments.map((enrollment) => {
                const existing = attendanceMap.get(enrollment.id);

                return {
                    studentEnrollmentId: enrollment.id,
                    studentId: enrollment.student.id,
                    username: enrollment.student.username,
                    email: enrollment.student.email,
                    rollNumber: enrollment.rollNumber,

                    status: existing?.status ?? null,
                    remarks: existing?.remarks ?? null,
                    attendanceId: existing?.id ?? null,
                };
            }),
        };
    }

    // --------------------------------------------------
    // 4. Create single attendance
    // --------------------------------------------------

    async createAttendance(dto: CreateAttendanceDto) {
        const classSubject = await this.getClassSubject(
            dto.classSubjectId,
        );

        const enrollment = await this.enrollmentRepository.findOne({
            where: {
                id: dto.studentEnrollmentId,
                class: { id: classSubject.class.id },
                academicYear: { id: classSubject.academicYear.id },
            },
        });

        if (!enrollment) {
            throw new BadRequestException(
                'Student is not enrolled in this class and academic year',
            );
        }

        const attendance = this.attendanceRepository.create({
            studentEnrollment: { id: enrollment.id },
            classSubject: { id: classSubject.id },
            attendanceDate: dto.attendanceDate,
            status: dto.status,
            remarks: dto.remarks ?? null,
        });

        return this.attendanceRepository.save(attendance);
    }

    // --------------------------------------------------
    // 5. Bulk create / update attendance
    // --------------------------------------------------

    async bulkCreateAttendance(dto: BulkAttendanceDto) {
        this.logger.log('========== BULK ATTENDANCE STARTED ==========');

        try {
            const classSubject = await this.getClassSubject(
                dto.classSubjectId,
            );

            const enrollmentIds = dto.records.map(
                (record) => record.studentEnrollmentId,
            );

            if (new Set(enrollmentIds).size !== enrollmentIds.length) {
                throw new BadRequestException(
                    'Duplicate student enrollment IDs found',
                );
            }

            if (enrollmentIds.length === 0) {
                throw new BadRequestException(
                    'At least one attendance record is required',
                );
            }

            const enrollments = await this.enrollmentRepository.find({
                where: {
                    id: In(enrollmentIds),
                    class: { id: classSubject.class.id },
                    academicYear: { id: classSubject.academicYear.id },
                },
            });

            if (enrollments.length !== enrollmentIds.length) {
                throw new BadRequestException(
                    'One or more students are not enrolled in this class',
                );
            }

            const savedRecords = await this.dataSource.transaction(
                async (manager) => {
                    const repository = manager.getRepository(Attendance);

                    const existingRecords = await repository.find({
                        where: {
                            classSubject: { id: dto.classSubjectId },
                            attendanceDate: dto.attendanceDate,
                            studentEnrollment: {
                                id: In(enrollmentIds),
                            },
                        },
                        relations: {
                            studentEnrollment: true,
                        },
                    });

                    const existingMap = new Map(
                        existingRecords.map((record) => [
                            record.studentEnrollment.id,
                            record,
                        ]),
                    );

                    const attendanceRecords = dto.records.map((record) => {
                        const existing = existingMap.get(
                            record.studentEnrollmentId,
                        );

                        return repository.create({
                            ...(existing ? { id: existing.id } : {}),

                            studentEnrollment: {
                                id: record.studentEnrollmentId,
                            },

                            classSubject: {
                                id: dto.classSubjectId,
                            },

                            attendanceDate: dto.attendanceDate,
                            status: record.status,
                            remarks: record.remarks ?? null,
                        });
                    });

                    return repository.save(attendanceRecords);
                },
            );

            this.logger.log(
                '========== BULK ATTENDANCE COMPLETED =========',
            );

            return {
                success: true,
                message: 'Attendance saved successfully',
                totalSaved: savedRecords.length,
                data: savedRecords,
            };
        } catch (error) {
            this.logger.error(
                'Bulk attendance failed',
                error instanceof Error ? error.stack : String(error),
            );

            if (
                error instanceof BadRequestException ||
                error instanceof NotFoundException
            ) {
                throw error;
            }

            throw new InternalServerErrorException(
                'Unable to save attendance. Check the backend logs.',
            );
        }
    }

    // --------------------------------------------------
    // 6. Get attendance by ID
    // --------------------------------------------------

    async getAttendanceById(id: number) {
        const attendance = await this.attendanceRepository.findOne({
            where: { id },
            relations: {
                studentEnrollment: {
                    student: true,
                    class: true,
                    academicYear: true,
                },
                classSubject: {
                    subject: true,
                    teacher: true,
                    class: true,
                    academicYear: true,
                },
            },
        });

        if (!attendance) {
            throw new NotFoundException('Attendance record not found');
        }

        return attendance;
    }

    // --------------------------------------------------
    // 7. Update attendance
    // --------------------------------------------------

    async updateAttendance(
        id: number,
        dto: UpdateAttendanceDto,
    ) {
        const attendance = await this.getAttendanceById(id);

        Object.assign(attendance, dto);

        return this.attendanceRepository.save(attendance);
    }

    // --------------------------------------------------
    // 8. Delete attendance
    // --------------------------------------------------

    async deleteAttendance(id: number) {
        const attendance = await this.getAttendanceById(id);

        await this.attendanceRepository.remove(attendance);

        return {
            message: 'Attendance deleted successfully',
            id,
        };
    }

    // --------------------------------------------------
    // 9. Get attendance history by enrollment ID
    // --------------------------------------------------

    async getStudentAttendance(studentEnrollmentId: number) {
        const enrollment = await this.enrollmentRepository.findOne({
            where: { id: studentEnrollmentId },
            relations: {
                student: true,
                class: true,
                academicYear: true,
            },
        });

        if (!enrollment) {
            throw new NotFoundException(
                'Student enrollment not found',
            );
        }

        return this.attendanceRepository.find({
            where: {
                studentEnrollment: { id: studentEnrollmentId },
            },
            relations: {
                classSubject: {
                    subject: true,
                    teacher: true,
                },
            },
            order: {
                attendanceDate: 'DESC',
            },
        });
    }

    // --------------------------------------------------
    // 10. Get attendance summary
    // --------------------------------------------------

    async getAttendanceSummary(query: AttendanceQueryDto) {
        await this.getClassSubject(query.classSubjectId);

        const result = await this.attendanceRepository
            .createQueryBuilder('attendance')
            .select('attendance.status', 'status')
            .addSelect('COUNT(attendance.id)', 'count')
            .where('attendance.class_subject_id = :classSubjectId', {
                classSubjectId: query.classSubjectId,
            })
            .andWhere('attendance.attendance_date = :date', {
                date: query.attendanceDate,
            })
            .groupBy('attendance.status')
            .getRawMany();

        const summary = {
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            totalMarked: 0,
        };

        for (const record of result) {
            const status = record.status as keyof typeof summary;
            const count = Number(record.count);

            if (status in summary && status !== 'totalMarked') {
                summary[status] = count;
                summary.totalMarked += count;
            }
        }

        return summary;
    }

    // --------------------------------------------------
    // 11. Get logged-in student's attendance history
    // --------------------------------------------------

    async getStudentAttendanceHistory(
        studentId: number,
        query: StudentAttendanceQueryDto,
    ) {
        const student = await this.enrollmentRepository.manager
            .getRepository(Student)
            .findOne({
                where: { id: studentId },
            });

        if (!student) {
            throw new NotFoundException('Student not found');
        }

        const qb = this.attendanceRepository
            .createQueryBuilder('attendance')
            .innerJoin('attendance.studentEnrollment', 'enrollment')
            .innerJoin('enrollment.student', 'student')
            .innerJoin('attendance.classSubject', 'classSubject')
            .innerJoin('classSubject.subject', 'subject')
            .select('attendance.id', 'id')
            .addSelect('attendance.attendanceDate', 'attendanceDate')
            .addSelect('attendance.status', 'status')
            .addSelect('attendance.remarks', 'remarks')
            .addSelect('subject.subjectName', 'subjectName')
            .addSelect('subject.code', 'subjectCode')
            .where('student.id = :studentId', { studentId });

        if (query.month) {
            const [year, month] = query.month.split('-').map(Number);

            const startDate = `${query.month}-01`;

            const endDate = new Date(Date.UTC(year, month, 0))
                .toISOString()
                .slice(0, 10);

            qb.andWhere(
                'attendance.attendanceDate >= :startDate',
                { startDate },
            ).andWhere(
                'attendance.attendanceDate <= :endDate',
                { endDate },
            );
        }

        const records = await qb
            .orderBy('attendance.attendanceDate', 'DESC')
            .getRawMany();

        const summary: any = {
            total: records.length,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            percentage: 0,
        };

        for (const record of records) {
            if (
                record.status === 'present' ||
                record.status === 'absent' ||
                record.status === 'late' ||
                record.status === 'excused'
            ) {
                summary[record.status]++;
            }
        }

        // Present and late count as attended.
        summary.percentage =
            summary.total > 0
                ? Number(
                    (
                        ((summary.present + summary.late) /
                            summary.total) *
                        100
                    ).toFixed(2),
                )
                : 0;

        return {
            summary,
            records,
        };
    }

    // --------------------------------------------------
    // 12. Mark attendance using QR + GPS
    // --------------------------------------------------

    async markAttendanceUsingQR(
        studentId: number,
        dto: MarkAttendanceQRDto,
    ) {
        this.logger.log('========== QR ATTENDANCE STARTED ==========');

        try {
            // STEP 1: Parse QR payload.

            let qr: {
                sessionId: number;
                token: string;
            };

            try {
                qr = JSON.parse(dto.qrData);
            } catch {
                throw new BadRequestException('Invalid QR code');
            }

            if (
                !qr ||
                !Number.isInteger(qr.sessionId) ||
                qr.sessionId <= 0 ||
                typeof qr.token !== 'string' ||
                qr.token.length < 1
            ) {
                throw new BadRequestException(
                    'Invalid QR code information',
                );
            }

            // STEP 2: Find active session.

            const session =
                await this.attendanceSessionRepository.findOne({
                    where: {
                        id: qr.sessionId,
                        isActive: true,
                    },
                    relations: {
                        classSubject: {
                            class: true,
                            academicYear: true,
                            subject: true,
                        },
                    },
                });

            if (!session) {
                throw new NotFoundException(
                    'Attendance session not found or no longer active',
                );
            }

            // STEP 3: Check expiry.

            if (Date.now() >= new Date(session.expiresAt).getTime()) {
                await this.attendanceSessionRepository.update(
                    { id: session.id },
                    { isActive: false },
                );

                throw new BadRequestException(
                    'Attendance QR code has expired',
                );
            }

            // STEP 4: Verify token hash.

            const receivedHash = createHash('sha256')
                .update(qr.token)
                .digest();

            const storedHash = Buffer.from(
                session.qrTokenHash,
                'hex',
            );

            if (
                storedHash.length !== receivedHash.length ||
                !timingSafeEqual(storedHash, receivedHash)
            ) {
                throw new UnauthorizedException(
                    'Invalid attendance QR token',
                );
            }

            // STEP 5: Validate GPS input.

            if (
                !Number.isFinite(dto.latitude) ||
                !Number.isFinite(dto.longitude) ||
                !Number.isFinite(dto.accuracy)
            ) {
                throw new BadRequestException(
                    'Invalid GPS coordinates',
                );
            }

            if (dto.accuracy > 50) {
                throw new BadRequestException(
                    `GPS accuracy is too low (${Math.round(dto.accuracy)}m). Please try again.`,
                );
            }

            // STEP 6: Calculate distance from trusted session coordinates.

            const distance = this.calculateDistance(
                Number(session.latitude),
                Number(session.longitude),
                dto.latitude,
                dto.longitude,
            );

            this.logger.debug(
                `Student distance: ${distance.toFixed(2)}m`,
            );

            if (
                distance + dto.accuracy >
                Number(session.radiusMeters)
            ) {
                throw new ForbiddenException(
                    `You are outside the allowed attendance location. Distance: ${Math.round(distance)}m`,
                );
            }

            // STEP 7: Find the student's enrollment.

            const enrollment = await this.enrollmentRepository.findOne({
                where: {
                    student: { id: studentId },
                    class: {
                        id: session.classSubject.class.id,
                    },
                    academicYear: {
                        id: session.classSubject.academicYear.id,
                    },
                },
            });

            if (!enrollment) {
                throw new ForbiddenException(
                    'You are not enrolled in this class',
                );
            }

            // STEP 8: Check duplicate and save inside transaction.
            // A unique database constraint is still required to prevent
            // simultaneous duplicate requests.

            const saved = await this.dataSource.transaction(
                async (manager) => {
                    const attendanceRepo =
                        manager.getRepository(Attendance);

                    const existing = await attendanceRepo.findOne({
                        where: {
                            studentEnrollment: { id: enrollment.id },
                            classSubject: {
                                id: session.classSubject.id,
                            },
                            attendanceDate: session.attendanceDate,
                        },
                    });

                    if (existing) {
                        throw new BadRequestException(
                            'Your attendance has already been marked for this subject today',
                        );
                    }

                    const attendance = attendanceRepo.create({
                        studentEnrollment: { id: enrollment.id },
                        classSubject: {
                            id: session.classSubject.id,
                        },
                        attendanceDate: session.attendanceDate,
                        status: 'present',
                        remarks: 'Marked through QR code',
                    });

                    return attendanceRepo.save(attendance);
                },
            );

            this.logger.log(
                `QR attendance saved. Attendance ID: ${saved.id}`,
            );

            return {
                success: true,
                message: 'Attendance marked successfully',
                data: {
                    attendanceId: saved.id,
                    attendanceDate: saved.attendanceDate,
                    status: saved.status,
                    subjectName:
                        session.classSubject.subject.subjectName,
                    distanceMeters: Math.round(distance),
                },
            };
        } catch (error) {
            this.logger.error(
                'QR attendance failed',
                error instanceof Error
                    ? error.stack
                    : String(error),
            );

            if (
                error instanceof BadRequestException ||
                error instanceof NotFoundException ||
                error instanceof UnauthorizedException ||
                error instanceof ForbiddenException
            ) {
                throw error;
            }

            throw new InternalServerErrorException(
                'Unable to mark QR attendance',
            );
        }
    }

    // --------------------------------------------------
    // 13. CREATE QR ATTENDANCE SESSION
    // --------------------------------------------------

    async createAttendanceSession(
        teacherId: number,
        dto: CreateAttendanceSessionDto,
    ) {
        // Find class subject and its teacher
        const classSubject = await this.getClassSubject(
            dto.classSubjectId,
        );

        // Verify that this subject belongs to the logged-in teacher
        if (classSubject.teacher.id !== teacherId) {
            throw new ForbiddenException(
                'You are not authorized to create attendance for this class',
            );
        }

        // Validate GPS coordinates
        if (
            !Number.isFinite(dto.latitude) ||
            !Number.isFinite(dto.longitude) ||
            dto.latitude < -90 ||
            dto.latitude > 90 ||
            dto.longitude < -180 ||
            dto.longitude > 180
        ) {
            throw new BadRequestException('Invalid GPS coordinates');
        }

        // Validate session duration
        if (
            !Number.isInteger(dto.durationMinutes) ||
            dto.durationMinutes < 1 ||
            dto.durationMinutes > 10
        ) {
            throw new BadRequestException(
                'Session duration must be between 1 and 10 minutes',
            );
        }

        // Validate attendance date
        const today = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(new Date());

        if (dto.attendanceDate !== today) {
            throw new BadRequestException(
                'QR attendance can only be generated for today',
            );
        }

        // Generate a secure random token
        const token = randomBytes(32).toString('hex');

        // Store only the token hash in the database
        const qrTokenHash = createHash('sha256')
            .update(token)
            .digest('hex');

        // Fixed server-controlled geofence radius
        const radiusMeters = 50;

        // Calculate expiry
        const expiresAt = new Date(
            Date.now() + dto.durationMinutes * 60 * 1000,
        );

        // Deactivate previous active sessions for this class subject
        await this.attendanceSessionRepository.update(
            {
                classSubject: { id: classSubject.id },
                isActive: true,
            },
            {
                isActive: false,
            },
        );

        // Create new attendance session
        const session = this.attendanceSessionRepository.create({
            classSubject: { id: classSubject.id },
            attendanceDate: dto.attendanceDate,
            latitude: dto.latitude,
            longitude: dto.longitude,
            radiusMeters,
            qrTokenHash,
            expiresAt,
            isActive: true,
        });

        const savedSession =
            await this.attendanceSessionRepository.save(session);

        this.logger.log(
            `QR attendance session created: ${savedSession.id}`,
        );

        // Return raw token only once
        return {
            success: true,
            message: 'QR attendance session created successfully',
            sessionId: savedSession.id,
            token,
            expiresAt: savedSession.expiresAt,
            radiusMeters,
        };
    }


    // --------------------------------------------------
    // 14. CLOSE QR ATTENDANCE SESSION
    // --------------------------------------------------

    async closeAttendanceSession(
        teacherId: number,
        sessionId: number,
    ) {
        const session =
            await this.attendanceSessionRepository.findOne({
                where: { id: sessionId },
                relations: {
                    classSubject: {
                        teacher: true,
                    },
                },
            });

        if (!session) {
            throw new NotFoundException(
                'Attendance session not found',
            );
        }

        // Verify session ownership
        if (session.classSubject.teacher.id !== teacherId) {
            throw new ForbiddenException(
                'You cannot close another teacher attendance session',
            );
        }

        if (!session.isActive) {
            return {
                success: true,
                message: 'Attendance session is already closed',
            };
        }

        session.isActive = false;

        await this.attendanceSessionRepository.save(session);

        return {
            success: true,
            message: 'Attendance session closed successfully',
            sessionId: session.id,
        };
    }
}