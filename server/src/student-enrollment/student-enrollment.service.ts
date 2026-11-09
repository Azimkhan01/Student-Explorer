import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { StudentEnrollment } from '../entity/student-enrollment.entity.js';
import { Student } from '../entity/student.entity.js';
import { Class } from '../entity/class.entity.js';
import { AcademicYear } from '../entity/academic-year.entity.js';

import { CreateStudentEnrollmentDto } from './dto/create-student-enrollment.dto.js';
import { UpdateStudentEnrollmentDto } from './dto/update-student-enrollment.dto.js';
import { StudentEnrollmentQueryDto } from './dto/student-enrollment-query.dto.js';

@Injectable()
export class StudentEnrollmentService {
  constructor(
    @InjectRepository(StudentEnrollment)
    private readonly enrollmentRepo: Repository<StudentEnrollment>,

    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,

    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,

    @InjectRepository(AcademicYear)
    private readonly academicYearRepo: Repository<AcademicYear>,
  ) {}

  // CREATE ENROLLMENT
  async create(dto: CreateStudentEnrollmentDto) {
    const [student, schoolClass, academicYear] = await Promise.all([
      this.studentRepo.findOneBy({ id: dto.studentId }),
      this.classRepo.findOneBy({ id: dto.classId }),
      this.academicYearRepo.findOneBy({ id: dto.academicYearId }),
    ]);

    if (!student) {
      throw new NotFoundException('Student not found.');
    }

    if (!schoolClass) {
      throw new NotFoundException('Class not found.');
    }

    if (!academicYear) {
      throw new NotFoundException('Academic year not found.');
    }

    if (!student.active) {
      throw new BadRequestException(
        'This student is not active and cannot be enrolled.',
      );
    }

    // A student can have only one enrollment per academic year.
    const existingStudentEnrollment = await this.enrollmentRepo.findOne({
      where: {
        student: { id: dto.studentId },
        academicYear: { id: dto.academicYearId },
      },
    });

    if (existingStudentEnrollment) {
      throw new BadRequestException(
        'This student is already enrolled in this academic year.',
      );
    }

    // Roll number must be unique inside a class and academic year.
    const existingRollNumber = await this.enrollmentRepo.findOne({
      where: {
        rollNumber: dto.rollNumber,
        class: { id: dto.classId },
        academicYear: { id: dto.academicYearId },
      },
    });

    if (existingRollNumber) {
      throw new BadRequestException(
        'This roll number is already assigned to another student in this class.',
      );
    }

    const enrollment = this.enrollmentRepo.create({
      student,
      class: schoolClass,
      academicYear,
      rollNumber: dto.rollNumber.trim(),
      status: dto.status,
    });

    return this.enrollmentRepo.save(enrollment);
  }

  // GET ENROLLMENTS WITH PAGINATION AND SEARCH
  async findAll(query: StudentEnrollmentQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const queryBuilder = this.enrollmentRepo
      .createQueryBuilder('enrollment')
      .leftJoin('enrollment.student', 'student')
      .leftJoin('enrollment.class', 'schoolClass')
      .leftJoin('enrollment.academicYear', 'academicYear')
      .select([
        'enrollment.id',
        'enrollment.rollNumber',
        'enrollment.status',

        'student.id',
        'student.username',
        'student.email',

        'schoolClass.id',
        'schoolClass.standard',
        'schoolClass.division',

        'academicYear.id',
        'academicYear.yearName',
        'academicYear.isCurrent',
      ])
      .orderBy('enrollment.id', 'DESC');

    if (query.search?.trim()) {
      queryBuilder.andWhere(
        `(
          student.username ILIKE :search OR
          student.email ILIKE :search OR
          enrollment.rollNumber ILIKE :search OR
          schoolClass.standard ILIKE :search OR
          schoolClass.division ILIKE :search OR
          academicYear.yearName ILIKE :search
        )`,
        { search: `%${query.search.trim()}%` },
      );
    }

    if (query.academicYearId) {
      queryBuilder.andWhere('academicYear.id = :academicYearId', {
        academicYearId: query.academicYearId,
      });
    }

    if (query.classId) {
      queryBuilder.andWhere('schoolClass.id = :classId', {
        classId: query.classId,
      });
    }

    const [data, totalItems] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  // GET ONE ENROLLMENT
  async findOne(id: number) {
    const enrollment = await this.enrollmentRepo.findOne({
      where: { id },
      relations: {
        student: true,
        class: true,
        academicYear: true,
      },
      select: {
        id: true,
        rollNumber: true,
        status: true,
        student: {
          id: true,
          username: true,
          email: true,
        },
        class: {
          id: true,
          standard: true,
          division: true,
        },
        academicYear: {
          id: true,
          yearName: true,
          isCurrent: true,
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found.');
    }

    return enrollment;
  }

  // UPDATE ENROLLMENT
  async update(id: number, dto: UpdateStudentEnrollmentDto) {
    const enrollment = await this.enrollmentRepo.findOne({
      where: { id },
      relations: {
        student: true,
        class: true,
        academicYear: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found.');
    }

    const studentId = dto.studentId ?? enrollment.student.id;
    const classId = dto.classId ?? enrollment.class.id;
    const academicYearId =
      dto.academicYearId ?? enrollment.academicYear.id;
    const rollNumber = dto.rollNumber?.trim() ?? enrollment.rollNumber;

    const [student, schoolClass, academicYear] = await Promise.all([
      this.studentRepo.findOneBy({ id: studentId }),
      this.classRepo.findOneBy({ id: classId }),
      this.academicYearRepo.findOneBy({ id: academicYearId }),
    ]);

    if (!student || !schoolClass || !academicYear) {
      throw new NotFoundException(
        'Student, class or academic year could not be found.',
      );
    }

    if (!student.active) {
      throw new BadRequestException(
        'This student is not active and cannot be enrolled.',
      );
    }

    const duplicateStudent = await this.enrollmentRepo
      .createQueryBuilder('e')
      .where('e.id != :id', { id })
      .andWhere('e.student_id = :studentId', { studentId })
      .andWhere('e.academic_year_id = :academicYearId', {
        academicYearId,
      })
      .getOne();

    if (duplicateStudent) {
      throw new BadRequestException(
        'This student is already enrolled in this academic year.',
      );
    }

    const duplicateRoll = await this.enrollmentRepo
      .createQueryBuilder('e')
      .where('e.id != :id', { id })
      .andWhere('e.class_id = :classId', { classId })
      .andWhere('e.academic_year_id = :academicYearId', {
        academicYearId,
      })
      .andWhere('e.roll_number = :rollNumber', { rollNumber })
      .getOne();

    if (duplicateRoll) {
      throw new BadRequestException(
        'This roll number is already used in this class.',
      );
    }

    enrollment.student = student;
    enrollment.class = schoolClass;
    enrollment.academicYear = academicYear;
    enrollment.rollNumber = rollNumber;

    if (dto.status !== undefined) {
      enrollment.status = dto.status;
    }

    return this.enrollmentRepo.save(enrollment);
  }

  // DELETE ENROLLMENT
  async remove(id: number) {
    const enrollment = await this.enrollmentRepo.findOneBy({ id });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found.');
    }

    await this.enrollmentRepo.remove(enrollment);

    return {
      message: 'Student enrollment deleted successfully.',
    };
  }
}