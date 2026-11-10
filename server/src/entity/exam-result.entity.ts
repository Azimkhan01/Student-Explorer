// exam-result.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  type Relation,
} from 'typeorm';

import { Exam } from './exam.entity.js';
import { Student } from './student.entity.js';

@Entity('exam_results')
@Unique('UQ_exam_result_exam_student', ['exam', 'student'])
export class ExamResult {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => Exam,
    (exam) => exam.results,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'exam_id' })
  exam: Relation<Exam>;

  @ManyToOne(
    () => Student,
    (student) => student.examResults,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'student_id' })
  student: Relation<Student>;

  @Column({ name: 'marks_obtained', type: 'integer' })
  marksObtained: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remarks: string | null;
}