import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  type Relation,
} from 'typeorm';
import { StudentEnrollment } from './student-enrollment.entity.js';
import { ClassSubject } from './class-subject.entity.js';


@Entity('academic_years')
export class AcademicYear {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'year_name', type: 'varchar', length: 20 })
  yearName: string;

  @Column({ name: 'is_current', type: 'boolean' })
  isCurrent: boolean;

  @OneToMany(
    () => StudentEnrollment,
    (enrollment) => enrollment.academicYear,
  )
  enrollments: Relation<StudentEnrollment[]>;

  @OneToMany(
    () => ClassSubject,
    (classSubject) => classSubject.academicYear,
  )
  classSubjects: Relation<ClassSubject[]>;
}