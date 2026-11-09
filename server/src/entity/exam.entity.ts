import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  type Relation,
} from 'typeorm';
import { ExamResult } from './exam-result.entity.js';
import { ClassSubject } from './class-subject.entity.js';


@Entity('exams')
export class Exam {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => ClassSubject,
    (classSubject) => classSubject.exams,
    { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' },
  )
  @JoinColumn({ name: 'class_subject_id' })
  classSubject: Relation<ClassSubject>;

  @Column({ name: 'exam_name', type: 'varchar', length: 255 })
  examName: string;

  @Column({ name: 'max_marks', type: 'integer' })
  maxMarks: number;

  @Column({ name: 'exam_date', type: 'date' })
  examDate: string;

  @OneToMany(
    () => ExamResult,
    (result) => result.exam,
  )
  results: Relation<ExamResult[]>;
}