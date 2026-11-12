import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';


import { CreateQuickzyDTO } from './dto/create-quickzy.dto.js';
import { UpdateQuickzyDTO } from './dto/update-quickzy.dto.js';
import { Teacher } from '../entity/teacher.entity.js';
import { QnA } from '../entity/qna.entity.js';
import { Quickzy } from '../entity/quickzy.entity.js';

@Injectable()
export class QuickzyService {
  constructor(
    @InjectRepository(Quickzy)
    private readonly quickzyRepository: Repository<Quickzy>,

    @InjectRepository(QnA)
    private readonly qnaRepository: Repository<QnA>,

    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
  ) {}

  // CREATE
  async create(teacherId: number, dto: CreateQuickzyDTO) {
    const teacher = await this.teacherRepository.findOne({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const questions = this.prepareQuestions(dto.questions);

    const quickzy = this.quickzyRepository.create({
      quickzy_name: dto.quickzy_name.trim(),
      teacher,
      questions,
    });

    return this.quickzyRepository.save(quickzy);
  }

  // VIEW ALL QUICKZIES CREATED BY TEACHER
  async findAllByTeacher(teacherId: number) {
    return this.quickzyRepository.find({
      where: { teacher_id: String(teacherId) },
      relations: { questions: true },
      order: { created_at: 'DESC' },
    });
  }

  // VIEW SINGLE QUICKZY
  async findOne(id: string, teacherId: number) {
    const quickzy = await this.quickzyRepository.findOne({
      where: {
        id,
        teacher_id: String(teacherId),
      },
      relations: { questions: true },
    });

    if (!quickzy) {
      throw new NotFoundException('Quickzy not found');
    }

    return quickzy;
  }

  // UPDATE QUICKZY
  async update(
    id: string,
    teacherId: number,
    dto: UpdateQuickzyDTO,
  ) {
    const quickzy = await this.findOne(id, teacherId);

    if (dto.quickzy_name !== undefined) {
      quickzy.quickzy_name = dto.quickzy_name.trim();
    }

    // Replace all questions only if questions are supplied.
    if (dto.questions !== undefined) {
      const newQuestions = this.prepareQuestions(dto.questions);

      // Remove previous questions.
      if (quickzy.questions.length > 0) {
        await this.qnaRepository.remove(quickzy.questions);
      }

      // Assign the new questions.
      quickzy.questions = newQuestions;
    }

    return this.quickzyRepository.save(quickzy);
  }

  // DELETE QUICKZY
  async remove(id: string, teacherId: number) {
    const quickzy = await this.findOne(id, teacherId);

    await this.quickzyRepository.remove(quickzy);

    return {
      message: 'Quickzy deleted successfully',
      id,
    };
  }

  // COMMON QUESTION VALIDATION
  private prepareQuestions(
    questions: {
      question: string;
      options: string[];
      correct_answer: number;
      marks?: number;
    }[],
  ): QnA[] {
    if (!questions?.length) {
      throw new BadRequestException(
        'At least one question is required',
      );
    }

    return questions.map((item) => {
      const question = item.question?.trim();
      const options = item.options?.map((option) => option.trim());

      if (!question) {
        throw new BadRequestException('Question cannot be empty');
      }

      if (!options || options.length < 2 || options.some((o) => !o)) {
        throw new BadRequestException(
          'Each question must have at least two non-empty options',
        );
      }

      const uniqueOptions = new Set(
        options.map((option) => option.toLowerCase()),
      );

      if (uniqueOptions.size !== options.length) {
        throw new BadRequestException(
          'Duplicate options are not allowed',
        );
      }

      if (
        !Number.isInteger(item.correct_answer) ||
        item.correct_answer < 0 ||
        item.correct_answer >= options.length
      ) {
        throw new BadRequestException(
          'Invalid correct answer index',
        );
      }

      const marks = item.marks ?? 1;

      if (!Number.isInteger(marks) || marks < 1) {
        throw new BadRequestException(
          'Marks must be at least 1',
        );
      }

      return this.qnaRepository.create({
        question,
        options,
        correct_answer: String(item.correct_answer),
        marks,
      });
    });
  }
}