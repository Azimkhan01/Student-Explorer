import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  type Relation,
} from 'typeorm';
import { Exam } from './exam.entity.js';
import { Attendance } from './attendance.entity.js';
import { AcademicYear } from './academic-year.entity.js';
import { Teacher } from './teacher.entity.js';
import { Subject } from './subject.entity.js';
import { Class } from './class.entity.js';


@Entity('class_subjects')
export class ClassSubject {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => Class,
    (classEntity) => classEntity.classSubjects,
    { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' },
  )
  @JoinColumn({ name: 'class_id' })
  class: Relation<Class>;

  @ManyToOne(
    () => Subject,
    (subject) => subject.classSubjects,
    { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' },
  )
  @JoinColumn({ name: 'subject_id' })
  subject: Relation<Subject>;

  @ManyToOne(
    () => Teacher,
    (teacher) => teacher.classSubjects,
    { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' },
  )
  @JoinColumn({ name: 'teacher_id' })
  teacher: Relation<Teacher>;

  @ManyToOne(
    () => AcademicYear,
    (academicYear) => academicYear.classSubjects,
    { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' },
  )
  @JoinColumn({ name: 'academic_year_id' })
  academicYear: Relation<AcademicYear>;

  @OneToMany(
    () => Attendance,
    (attendance) => attendance.classSubject,
  )
  attendanceRecords: Relation<Attendance[]>;

  @OneToMany(
    () => Exam,
    (exam) => exam.classSubject,
  )
  exams: Relation<Exam[]>;
}