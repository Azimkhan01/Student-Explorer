import { Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Student } from '../entity/student.entity.js';
import { CheckStudentDTO } from './dto/checkStudent.dto.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';
import { CreateStudentDto } from './dto/create-student.dto.js';
import { StudentQueryDto } from './dto/student-query.dto.js';
import { ClientProxy } from '@nestjs/microservices';
import { SendStudentEmailDTO } from './dto/SendStudentCreateEmail.dto.js';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class StudentService {

    constructor(
        @Inject('USER_SERVICE')
        private readonly userClient: ClientProxy,
        @InjectRepository(Student) private readonly studentRepository: Repository<Student>
    ) { }

    async checkStudent(checkStudentdto: CheckStudentDTO) {
        try {
            const student = await this.studentRepository.findOne({
                where: {
                    username: checkStudentdto.username,
                    email: checkStudentdto.email
                }
            });
            if (!student)
                return { message: "No Student is Created by Admin with username or the email !", status: false }
            else
                return { message: "Student Found Successfully!", status: true, student };
        }
        catch (err) {
            console.log(err)
            throw new InternalServerErrorException("Some Error Occur while finding the student record!");
        }
    }


    // CREATE STUDENT
    async create(createStudentDto: CreateStudentDto) {
        const student = this.studentRepository.create(createStudentDto);

        const savedStudent = await this.studentRepository.save(student);

        await firstValueFrom(
            this.userClient.send(
                { cmd: 'send-student-invitation' },
                {
                    email: savedStudent.email,
                    username: savedStudent.username,
                },
            ),
        );

        return savedStudent;
    }

    async findAll(queryDto: StudentQueryDto) {
        const {
            page = 1,
            limit = 10,
            search,
        } = queryDto;

        const query = this.studentRepository
            .createQueryBuilder('student');

        // SEARCH
        if (search?.trim()) {
            const term = `%${search.trim().toLowerCase()}%`;

            query.where(
                new Brackets((qb) => {
                    qb.where('LOWER(student.username) LIKE :term', {
                        term,
                    })
                        .orWhere('LOWER(student.email) LIKE :term', {
                            term,
                        });

                    // Search by ID only when the search is numeric
                    if (/^\d+$/.test(search.trim())) {
                        qb.orWhere('student.id = :id', {
                            id: Number(search.trim()),
                        });
                    }
                }),
            );
        }

        // TOTAL RECORD COUNT + PAGINATION
        const [students, totalItems] = await query
            .orderBy('student.id', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        const totalPages = Math.ceil(totalItems / limit);

        return {
            data: students,

            meta: {
                totalItems,
                itemCount: students.length,
                itemsPerPage: limit,
                totalPages,
                currentPage: page,
            },
        };
    }

    // GET STUDENT BY ID
    async findOne(id: number) {
        const student = await this.studentRepository.findOne({
            where: { id },
        });

        if (!student) {
            throw new NotFoundException(
                `Student with ID ${id} not found`,
            );
        }

        return student;
    }

    // UPDATE STUDENT
    async update(id: number, updateStudentDto: UpdateStudentDto) {
        const student = await this.findOne(id);

        Object.assign(student, updateStudentDto);

        return await this.studentRepository.save(student);
    }

    // DELETE STUDENT
    async remove(id: number) {
        const student = await this.findOne(id);

        await this.studentRepository.remove(student);

        return {
            message: 'Student deleted successfully',
            id,
        };
    }

}
