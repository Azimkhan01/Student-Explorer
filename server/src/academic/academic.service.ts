import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';

import { AcademicYear } from '../entity/academic-year.entity.js';
import { Class } from '../entity/class.entity.js';
import { Subject } from '../entity/subject.entity.js';
import { Teacher } from '../entity/teacher.entity.js';
import { ClassSubject } from '../entity/class-subject.entity.js';

import { CreateAcademicYearDto } from './dto/create-academic-year.dto.js';
import { CreateClassDto } from './dto/create-class.dto.js';
import { CreateSubjectDto } from './dto/create-subject.dto.js';
import { CreateClassSubjectDto } from './dto/create-class-subject.dto.js';

@Injectable()
export class AcademicService {
    constructor(
        @InjectRepository(AcademicYear)
        private readonly yearRepo: Repository<AcademicYear>,

        @InjectRepository(Class)
        private readonly classRepo: Repository<Class>,

        @InjectRepository(Subject)
        private readonly subjectRepo: Repository<Subject>,

        @InjectRepository(Teacher)
        private readonly teacherRepo: Repository<Teacher>,

        @InjectRepository(ClassSubject)
        private readonly classSubjectRepo: Repository<ClassSubject>,

        private readonly dataSource: DataSource,
    ) { }

    // =========================================
    // ACADEMIC YEARS
    // =========================================

    async getYears() {
        return this.yearRepo.find({
            order: { id: 'DESC' },
        });
    }

    async createYear(dto: CreateAcademicYearDto) {
        const existing = await this.yearRepo.findOne({
            where: { yearName: dto.yearName },
        });

        if (existing) {
            throw new ConflictException('Academic year already exists');
        }

        const year = this.yearRepo.create({
            yearName: dto.yearName,
            isCurrent: false,
        });

        return this.yearRepo.save(year);
    }

    async setCurrentYear(id: number) {
        return this.dataSource.transaction(async (manager) => {
            const yearRepo = manager.getRepository(AcademicYear);

            const year = await yearRepo.findOne({
                where: { id },
            });

            if (!year) {
                throw new NotFoundException('Academic year not found');
            }

            // Only one academic year can be current.
            await yearRepo.update(
                { isCurrent: true },
                { isCurrent: false },
            );

            year.isCurrent = true;

            return yearRepo.save(year);
        });
    }

    async deleteYear(id: number) {
        const year = await this.yearRepo.findOne({
            where: { id },
        });

        if (!year) {
            throw new NotFoundException('Academic year not found');
        }

        if (year.isCurrent) {
            throw new BadRequestException(
                'You cannot delete the current academic year',
            );
        }

        await this.yearRepo.remove(year);

        return { message: 'Academic year deleted successfully' };
    }

    // =========================================
    // CLASSES
    // =========================================

    async getClasses() {
        return this.classRepo.find({
            order: { id: 'DESC' },
        });
    }

    async createClass(dto: CreateClassDto) {
        const existing = await this.classRepo.findOne({
            where: {
                standard: dto.standard,
                division: dto.division ?? IsNull(),
            },
        });

        if (existing) {
            throw new ConflictException(
                'This class and division already exist',
            );
        }

        const newClass = this.classRepo.create({
            standard: dto.standard,
            division: dto.division ?? null,
        });

        return this.classRepo.save(newClass);
    }

    async deleteClass(id: number) {
        const classEntity = await this.classRepo.findOne({
            where: { id },
        });

        if (!classEntity) {
            throw new NotFoundException('Class not found');
        }

        await this.classRepo.remove(classEntity);

        return { message: 'Class deleted successfully' };
    }

    // =========================================
    // SUBJECTS
    // =========================================

    async getSubjects() {
        return this.subjectRepo.find({
            order: { id: 'DESC' },
        });
    }

    async createSubject(dto: CreateSubjectDto) {
        const existing = await this.subjectRepo.findOne({
            where: { code: dto.code },
        });

        if (existing) {
            throw new ConflictException('Subject code already exists');
        }

        const subject = this.subjectRepo.create({
            subjectName: dto.subjectName,
            code: dto.code,
        });

        return this.subjectRepo.save(subject);
    }

    async deleteSubject(id: number) {
        const subject = await this.subjectRepo.findOne({
            where: { id },
        });

        if (!subject) {
            throw new NotFoundException('Subject not found');
        }

        await this.subjectRepo.remove(subject);

        return { message: 'Subject deleted successfully' };
    }

    // =========================================
    // CLASS SUBJECT ASSIGNMENTS
    // =========================================

    async getAssignments() {
        return this.classSubjectRepo.find({
            relations: {
                class: true,
                subject: true,
                teacher: true,
                academicYear: true,
            },
            order: { id: 'DESC' },
        });
    }

    async createAssignment(dto: CreateClassSubjectDto) {
        const [classEntity, subject, teacher, academicYear] =
            await Promise.all([
                this.classRepo.findOne({ where: { id: dto.classId } }),
                this.subjectRepo.findOne({ where: { id: dto.subjectId } }),
                this.teacherRepo.findOne({ where: { id: dto.teacherId } }),
                this.yearRepo.findOne({ where: { id: dto.academicYearId } }),
            ]);

        if (!classEntity) {
            throw new NotFoundException('Class not found');
        }

        if (!subject) {
            throw new NotFoundException('Subject not found');
        }

        if (!teacher) {
            throw new NotFoundException('Teacher not found');
        }

        if (!academicYear) {
            throw new NotFoundException('Academic year not found');
        }

        // Prevent the same subject being assigned twice
        // to the same class in the same academic year.
        const existing = await this.classSubjectRepo.findOne({
            where: {
                class: { id: dto.classId },
                subject: { id: dto.subjectId },
                academicYear: { id: dto.academicYearId },
            },
        });

        if (existing) {
            throw new ConflictException(
                'This subject is already assigned to this class for this academic year',
            );
        }

        const assignment = this.classSubjectRepo.create({
            class: classEntity,
            subject,
            teacher,
            academicYear,
        });

        return this.classSubjectRepo.save(assignment);
    }

    async deleteAssignment(id: number) {
        const assignment = await this.classSubjectRepo.findOne({
            where: { id },
        });

        if (!assignment) {
            throw new NotFoundException('Assignment not found');
        }

        await this.classSubjectRepo.remove(assignment);

        return { message: 'Assignment deleted successfully' };
    }
}