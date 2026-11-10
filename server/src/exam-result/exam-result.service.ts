import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { Exam } from '../entity/exam.entity.js';
import { ExamResult } from '../entity/exam-result.entity.js';
import { StudentEnrollment } from '../entity/student-enrollment.entity.js';

import { BulkExamResultDto } from './dto/bulk-exam-result.dto.js';
import { UpdateExamResultDto } from './dto/update-exam-result.dto.js';

interface AuthUser {
    id: number;
    role: 'admin' | 'teacher';
}

@Injectable()
export class ExamResultService {
    constructor(
        @InjectRepository(Exam)
        private readonly examRepository: Repository<Exam>,

        @InjectRepository(ExamResult)
        private readonly examResultRepository: Repository<ExamResult>,

        @InjectRepository(StudentEnrollment)
        private readonly enrollmentRepository: Repository<StudentEnrollment>,

        private readonly dataSource: DataSource,
    ) { }

    private async getAuthorizedExam(
        examId: number,
        user: AuthUser,
    ): Promise<Exam> {
        const exam = await this.examRepository.findOne({
            where: { id: examId },
            relations: {
                classSubject: {
                    class: true,
                    subject: true,
                    teacher: true,
                    academicYear: true,
                },
            },
        });

        if (!exam) {
            throw new NotFoundException('Exam not found');
        }

        if (user.role === 'teacher') {
            if (exam.classSubject.teacher?.id !== user.id) {
                throw new ForbiddenException(
                    'You are not authorized to manage results for this exam',
                );
            }
        } else if (user.role !== 'admin') {
            throw new ForbiddenException('Access denied');
        }

        return exam;
    }

    // Get enrolled students and their existing results.
    async getExamResults(examId: number, user: AuthUser) {
        const exam = await this.getAuthorizedExam(examId, user);

        // Fetch all students enrolled in this class and academic year
        const enrollments = await this.enrollmentRepository
            .createQueryBuilder('enrollment')
            .leftJoinAndSelect('enrollment.student', 'student')
            .leftJoin('enrollment.class', 'class')
            .leftJoin('enrollment.academicYear', 'academicYear')
            .where('class.id = :classId', {
                classId: exam.classSubject.class.id,
            })
            .andWhere('academicYear.id = :academicYearId', {
                academicYearId: exam.classSubject.academicYear.id,
            })
            .orderBy('student.username', 'ASC')
            .getMany();

        // Fetch results already submitted for this exam
        const results = await this.examResultRepository.find({
            where: {
                exam: { id: examId },
            },
            relations: {
                student: true,
            },
        });

        // Create a map for quick student-result lookup
        const resultMap = new Map(
            results.map((result) => [result.student.id, result]),
        );

        const classEntity = exam.classSubject.class;

        // Return exam details and student-wise results
        return {
            exam: {
                id: exam.id,
                examName: exam.examName,
                examDate: exam.examDate,
                maxMarks: exam.maxMarks,

                classSubjectId: exam.classSubject.id,

                className: classEntity.division
                    ? `${classEntity.standard} - ${classEntity.division}`
                    : classEntity.standard,

                subjectName: exam.classSubject.subject.subjectName,

                academicYear: exam.classSubject.academicYear.yearName,
            },

            totalStudents: enrollments.length,

            students: enrollments
                .filter((enrollment) => enrollment.student)
                .map((enrollment) => {
                    const student = enrollment.student;
                    const result = resultMap.get(student.id);

                    return {
                        studentId: student.id,
                        username: student.username,
                        email: student.email,

                        resultId: result?.id ?? null,
                        marksObtained: result?.marksObtained ?? null,
                        remarks: result?.remarks ?? "",

                        isSubmitted: !!result,
                    };
                }),
        };
    }

    // Add or update results for multiple students.
    async saveBulkResults(
        examId: number,
        dto: BulkExamResultDto,
        user: AuthUser,
    ) {
        const exam = await this.getAuthorizedExam(examId, user);

        if (!dto.results?.length) {
            throw new BadRequestException('At least one result is required');
        }

        const studentIds = dto.results.map((item) => item.studentId);

        if (new Set(studentIds).size !== studentIds.length) {
            throw new BadRequestException(
                'Duplicate student IDs are not allowed in one request',
            );
        }

        for (const item of dto.results) {
            if (
                !Number.isInteger(item.marksObtained) ||
                item.marksObtained < 0 ||
                item.marksObtained > exam.maxMarks
            ) {
                throw new BadRequestException(
                    `Invalid marks for student ${item.studentId}. Marks must be between 0 and ${exam.maxMarks}`,
                );
            }
        }


        const enrolledStudents = await this.enrollmentRepository
            .createQueryBuilder('enrollment')
            .innerJoin('enrollment.student', 'student')
            .select('student.id', 'studentId')
            .where('enrollment.class_id = :classId', {
                classId: exam.classSubject.class.id,
            })
            .andWhere('enrollment.academic_year_id = :academicYearId', {
                academicYearId: exam.classSubject.academicYear.id,
            })
            .andWhere('student.id IN (:...studentIds)', {
                studentIds,
            })
            .getRawMany();


        const enrolledIds = new Set(
            enrolledStudents.map((item) => Number(item.studentId)),
        );

        const invalidIds = studentIds.filter((id) => !enrolledIds.has(id));

        if (invalidIds.length) {
            throw new BadRequestException(
                `These students are not enrolled in this exam's class: ${invalidIds.join(', ')}`,
            );
        }

        await this.dataSource.transaction(async (manager) => {
            const repository = manager.getRepository(ExamResult);

            for (const item of dto.results) {
                await repository
                    .createQueryBuilder()
                    .insert()
                    .into(ExamResult)
                    .values({
                        exam: { id: exam.id },
                        student: { id: item.studentId },
                        marksObtained: item.marksObtained,
                        remarks: item.remarks?.trim() || null,
                    })
                    .orUpdate(
                        ['marks_obtained', 'remarks'],
                        ['exam_id', 'student_id'],
                    )
                    .execute();
            }
        });

        return {
            success: true,
            message: 'Exam results saved successfully',
            updatedCount: dto.results.length,
        };
    }

    // Update one existing result.
    async updateResult(
        resultId: number,
        dto: UpdateExamResultDto,
        user: AuthUser,
    ) {
        const result = await this.examResultRepository.findOne({
            where: { id: resultId },
            relations: {
                exam: {
                    classSubject: {
                        teacher: true,
                    },
                },
            },
        });

        if (!result) {
            throw new NotFoundException('Exam result not found');
        }

        await this.getAuthorizedExam(result.exam.id, user);

        if (
            dto.marksObtained !== undefined &&
            dto.marksObtained > result.exam.maxMarks
        ) {
            throw new BadRequestException(
                `Marks cannot exceed ${result.exam.maxMarks}`,
            );
        }

        if (dto.marksObtained !== undefined) {
            result.marksObtained = dto.marksObtained;
        }

        if (dto.remarks !== undefined) {
            result.remarks = dto.remarks.trim() || null;
        }

        const saved = await this.examResultRepository.save(result);

        return {
            success: true,
            message: 'Exam result updated successfully',
            result: saved,
        };
    }

    // Delete one result.
    async deleteResult(resultId: number, user: AuthUser) {
        const result = await this.examResultRepository.findOne({
            where: { id: resultId },
            relations: {
                exam: true,
            },
        });

        if (!result) {
            throw new NotFoundException('Exam result not found');
        }

        await this.getAuthorizedExam(result.exam.id, user);

        await this.examResultRepository.remove(result);

        return {
            success: true,
            message: 'Exam result deleted successfully',
        };
    }

    // Summary for one exam.
    async getExamSummary(examId: number, user: AuthUser) {
        const exam = await this.getAuthorizedExam(examId, user);

        const raw = await this.examResultRepository
            .createQueryBuilder('result')
            .select('COUNT(result.id)', 'enteredCount')
            .addSelect('AVG(result.marksObtained)', 'averageMarks')
            .addSelect('MAX(result.marksObtained)', 'highestMarks')
            .addSelect('MIN(result.marksObtained)', 'lowestMarks')
            .where('result.exam_id = :examId', { examId })
            .getRawOne();

        const enteredCount = Number(raw?.enteredCount ?? 0);

        const totalStudents = await this.enrollmentRepository
            .createQueryBuilder('enrollment')
            .where('enrollment.classId = :classId', {
                classId: exam.classSubject.class.id,
            })
            .andWhere('enrollment.academicYearId = :academicYearId', {
                academicYearId: exam.classSubject.academicYear.id,
            })
            .getCount();

        return {
            examId,
            examName: exam.examName,
            maxMarks: exam.maxMarks,
            totalStudents,
            enteredCount,
            pendingCount: Math.max(totalStudents - enteredCount, 0),
            averageMarks: raw?.averageMarks
                ? Number(Number(raw.averageMarks).toFixed(2))
                : 0,
            highestMarks: raw?.highestMarks === null
                ? 0
                : Number(raw.highestMarks),
            lowestMarks: raw?.lowestMarks === null
                ? 0
                : Number(raw.lowestMarks),
        };
    }
}