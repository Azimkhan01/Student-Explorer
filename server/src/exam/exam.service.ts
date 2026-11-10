import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Exam } from '../entity/exam.entity.js';
import { ClassSubject } from '../entity/class-subject.entity.js';

import { CreateExamDto } from './dto/create-exam.dto.js';

type ExamUser = {
    id: number;
    role: 'admin' | 'teacher';
};

@Injectable()
export class ExamService {
    constructor(
        @InjectRepository(Exam)
        private readonly examRepo: Repository<Exam>,

        @InjectRepository(ClassSubject)
        private readonly classSubjectRepo: Repository<ClassSubject>,
    ) { }

    // =========================================
    // GET ASSIGNMENTS
    // =========================================

    async getAssignments(user: ExamUser) {
        const where =
            user.role === 'admin'
                ? {}
                : { teacher: { id: user.id } };

        return this.classSubjectRepo.find({
            where,
            relations: {
                class: true,
                subject: true,
                teacher: true,
                academicYear: true,
            },
            order: {
                id: 'DESC',
            },
        });
    }

    // =========================================
    // VERIFY ASSIGNMENT ACCESS
    // =========================================

    private async verifyAssignmentAccess(
        user: ExamUser,
        classSubjectId: number,
    ) {
        const assignment = await this.classSubjectRepo.findOne({
            where: {
                id: classSubjectId,
            },
            relations: {
                teacher: true,
                class: true,
                subject: true,
                academicYear: true,
            },
        });

        if (!assignment) {
            throw new NotFoundException('Class-subject assignment not found');
        }

        if (
            user.role === 'teacher' &&
            assignment.teacher.id !== user.id
        ) {
            throw new ForbiddenException(
                'You cannot manage exams for another teacher\'s assignment',
            );
        }

        return assignment;
    }

    // =========================================
    // CREATE EXAM
    // =========================================

    async createExam(user: ExamUser, dto: CreateExamDto) {
        const assignment = await this.verifyAssignmentAccess(
            user,
            dto.classSubjectId,
        );

        const examName = dto.examName.trim();

        if (!examName) {
            throw new BadRequestException('Exam name cannot be empty');
        }

        const existing = await this.examRepo
            .createQueryBuilder('exam')
            .where('exam.class_subject_id = :classSubjectId', {
                classSubjectId: dto.classSubjectId,
            })
            .andWhere('LOWER(TRIM(exam.exam_name)) = LOWER(:examName)', {
                examName,
            })
            .andWhere('exam.exam_date = :examDate', {
                examDate: dto.examDate,
            })
            .getOne();

        if (existing) {
            throw new ConflictException(
                'An exam with this name already exists for this subject on this date',
            );
        }

        const exam = this.examRepo.create({
            classSubject: assignment,
            examName,
            maxMarks: dto.maxMarks,
            examDate: dto.examDate,
        });

        const savedExam = await this.examRepo.save(exam);

        return {
            success: true,
            message: 'Exam created successfully',
            data: savedExam,
        };
    }

    // =========================================
    // GET EXAMS
    // =========================================


    async getExams(user: ExamUser, classSubjectId?: number) {
        const query = this.examRepo
            .createQueryBuilder('exam')
            .leftJoinAndSelect('exam.classSubject', 'classSubject')
            .leftJoinAndSelect('classSubject.class', 'class')
            .leftJoinAndSelect('classSubject.subject', 'subject')
            .leftJoinAndSelect('classSubject.teacher', 'teacher')
            .leftJoinAndSelect('classSubject.academicYear', 'academicYear');

        if (user.role === 'teacher') {
            query.where('teacher.id = :teacherId', {
                teacherId: user.id,
            });
        }

        if (classSubjectId !== undefined) {
            if (!Number.isInteger(classSubjectId) || classSubjectId <= 0) {
                throw new BadRequestException('Invalid class subject ID');
            }

            query.andWhere('classSubject.id = :classSubjectId', {
                classSubjectId,
            });
        }

        return query
            .orderBy('exam.exam_date', 'DESC')
            .addOrderBy('exam.id', 'DESC')
            .getMany();
    }


    // =========================================
    // GET EXAM BY ID
    // =========================================

    async getExamById(user: ExamUser, id: number) {
        const exam = await this.examRepo.findOne({
            where: { id },
            relations: {
                classSubject: {
                    class: true,
                    subject: true,
                    teacher: true,
                    academicYear: true,
                },
                results: true,
            },
        });

        if (!exam) {
            throw new NotFoundException('Exam not found');
        }

        if (
            user.role === 'teacher' &&
            exam.classSubject.teacher.id !== user.id
        ) {
            throw new ForbiddenException('You cannot access this exam');
        }

        return exam;
    }

    // =========================================
    // DELETE EXAM
    // =========================================

    async deleteExam(user: ExamUser, id: number) {
        const exam = await this.examRepo.findOne({
            where: { id },
            relations: {
                classSubject: {
                    teacher: true,
                },
                results: true,
            },
        });

        if (!exam) {
            throw new NotFoundException('Exam not found');
        }

        if (
            user.role === 'teacher' &&
            exam.classSubject.teacher.id !== user.id
        ) {
            throw new ForbiddenException(
                'You cannot delete another teacher\'s exam',
            );
        }

        if (exam.results?.length > 0) {
            throw new ConflictException(
                'This exam already has student results. You cannot delete it.',
            );
        }

        await this.examRepo.remove(exam);

        return {
            success: true,
            message: 'Exam deleted successfully',
        };
    }
}