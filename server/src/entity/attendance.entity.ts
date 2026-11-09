import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  type Relation,
} from 'typeorm';

import { Student } from './student.entity.js';
import { ClassSubject } from './class-subject.entity.js';

@Entity('attendance')
export class Attendance {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => Student,
    (student) => student.attendanceRecords,
    { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' },
  )
  @JoinColumn({ name: 'student_id' })
  student: Relation<Student>;

  @ManyToOne(
    () => ClassSubject,
    (classSubject) => classSubject.attendanceRecords,
    { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' },
  )
  @JoinColumn({ name: 'class_subject_id' })
  classSubject: Relation<ClassSubject>;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 20 })
  status: string;
}