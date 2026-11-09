import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  type Relation,
} from 'typeorm';
import { ClassSubject } from './class-subject.entity.js';
import { StudentEnrollment } from './student-enrollment.entity.js';


@Entity('classes')
export class Class {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  standard: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  division: string | null;

  @OneToMany(
    () => StudentEnrollment,
    (enrollment) => enrollment.class,
  )
  enrollments: Relation<StudentEnrollment[]>;

  @OneToMany(
    () => ClassSubject,
    (classSubject) => classSubject.class,
  )
  classSubjects: Relation<ClassSubject[]>;
}