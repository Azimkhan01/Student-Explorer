import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  type Relation,
  Unique,
} from 'typeorm';

import { Student } from './student.entity.js';
import { Class } from './class.entity.js';
import { AcademicYear } from './academic-year.entity.js';

@Entity('student_enrollments')
@Unique('UQ_student_academic_year', ['student', 'academicYear'])
@Unique('UQ_class_year_roll_number', [
  'class',
  'academicYear',
  'rollNumber',
])
export class StudentEnrollment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => Student,
    (student) => student.enrollments,
    { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' },
  )
  @JoinColumn({ name: 'student_id' })
  student: Relation<Student>;

  @ManyToOne(
    () => Class,
    (classEntity) => classEntity.enrollments,
    { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' },
  )
  @JoinColumn({ name: 'class_id' })
  class: Relation<Class>;

  @ManyToOne(
    () => AcademicYear,
    (academicYear) => academicYear.enrollments,
    { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' },
  )
  @JoinColumn({ name: 'academic_year_id' })
  academicYear: Relation<AcademicYear>;

  @Column({ name: 'roll_number', type: 'varchar' })
  rollNumber: string;

  @Column({ type: 'varchar', length: 25 })
  status: string;
}