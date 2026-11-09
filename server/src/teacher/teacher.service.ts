
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';

import { Teacher } from '../entity/teacher.entity.js';
import { CreateTeacherDto } from './dto/create-teacher.dto.js';
import { UpdateTeacherDto } from './dto/update-teacher.dto.js';
import { TeacherQueryDto } from './dto/teacher-query.dto.js';

@Injectable()
export class TeacherService {
  constructor(
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
  ) {}

  // CREATE TEACHER
  async create(createTeacherDto: CreateTeacherDto) {
    const existingTeacher = await this.teacherRepository.findOne({
      where: { email: createTeacherDto.email },
    });

    if (existingTeacher) {
      throw new ConflictException(
        'A teacher with this email already exists',
      );
    }

    const teacher = this.teacherRepository.create(createTeacherDto);

    const savedTeacher = await this.teacherRepository.save(teacher);

    // Never return the password
    const { password, ...result } = savedTeacher;

    return result;
  }

  // GET ALL / SEARCH / PAGINATION
  async findAll(queryDto: TeacherQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
    } = queryDto;

    const query = this.teacherRepository
      .createQueryBuilder('teacher')
      .select([
        'teacher.id',
        'teacher.username',
        'teacher.email',
        'teacher.role',
        'teacher.active',
      ]);

    // SEARCH
    if (search?.trim()) {
      const searchTerm = search.trim();
      const term = `%${searchTerm.toLowerCase()}%`;

      query.where(
        new Brackets((qb) => {
          qb.where('LOWER(teacher.username) LIKE :term', {
            term,
          }).orWhere('LOWER(teacher.email) LIKE :term', {
            term,
          });

          // Search by ID when the search value is numeric
          if (/^\d+$/.test(searchTerm)) {
            qb.orWhere('teacher.id = :id', {
              id: Number(searchTerm),
            });
          }
        }),
      );
    }

    // PAGINATION
    const [teachers, totalItems] = await query
      .orderBy('teacher.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: teachers,
      meta: {
        totalItems,
        itemCount: teachers.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  // GET TEACHER BY ID
  async findOne(id: number) {
    const teacher = await this.teacherRepository
      .createQueryBuilder('teacher')
      .select([
        'teacher.id',
        'teacher.username',
        'teacher.email',
        'teacher.role',
        'teacher.active',
      ])
      .where('teacher.id = :id', { id })
      .getOne();

    if (!teacher) {
      throw new NotFoundException(
        `Teacher with ID ${id} not found`,
      );
    }

    return teacher;
  }

  // UPDATE TEACHER
  async update(id: number, updateTeacherDto: UpdateTeacherDto) {
    const teacher = await this.teacherRepository.findOne({
      where: { id },
    });

    if (!teacher) {
      throw new NotFoundException(
        `Teacher with ID ${id} not found`,
      );
    }

    // Check email uniqueness if email is being changed
    if (
      updateTeacherDto.email &&
      updateTeacherDto.email !== teacher.email
    ) {
      const existingTeacher = await this.teacherRepository.findOne({
        where: { email: updateTeacherDto.email },
      });

      if (existingTeacher) {
        throw new ConflictException(
          'A teacher with this email already exists',
        );
      }
    }

    Object.assign(teacher, updateTeacherDto);

    const updatedTeacher = await this.teacherRepository.save(teacher);

    const { password, ...result } = updatedTeacher;

    return result;
  }

  // DELETE TEACHER
  async remove(id: number) {
    const teacher = await this.teacherRepository.findOne({
      where: { id },
    });

    if (!teacher) {
      throw new NotFoundException(
        `Teacher with ID ${id} not found`,
      );
    }

    await this.teacherRepository.remove(teacher);

    return {
      message: 'Teacher deleted successfully',
      id,
    };
  }
}
