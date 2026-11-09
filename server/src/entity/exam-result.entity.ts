import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  type Relation,
} from 'typeorm';

import { Exam } from './exam.entity.js';
import { Student } from './student.entity.js';

@Entity('exam_results')
export class ExamResult {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => Exam,
    (exam) => exam.results,
    { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' },
  )
  @JoinColumn({ name: 'exam_id' })
  exam: Relation<Exam>;

  @ManyToOne(
    () => Student,
    (student) => student.examResults,
    { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' },
  )
  @JoinColumn({ name: 'student_id' })
  student: Relation<Student>;

  @Column({ name: 'marks_obtained', type: 'integer' })
  marksObtained: number;

  @Column({ type: 'varchar', length: 255 })
  remarks: string;
}