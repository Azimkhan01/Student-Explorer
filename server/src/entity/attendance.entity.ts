
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
  type Relation,
} from 'typeorm';

import { StudentEnrollment } from './student-enrollment.entity.js';
import { ClassSubject } from './class-subject.entity.js';

@Entity('attendance')
@Unique(
  'UQ_attendance_enrollment_subject_date',
  ['studentEnrollment', 'classSubject', 'attendanceDate'],
)
export class Attendance {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => StudentEnrollment,
    (enrollment) => enrollment.attendanceRecords,
    { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' },
  )
  @JoinColumn({ name: 'student_enrollment_id' })
  studentEnrollment: Relation<StudentEnrollment>;

  @ManyToOne(
    () => ClassSubject,
    (classSubject) => classSubject.attendanceRecords,
    { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' },
  )
  @JoinColumn({ name: 'class_subject_id' })
  classSubject: Relation<ClassSubject>;

  @Column({ type: 'date', name: 'attendance_date' })
  attendanceDate: string;

  @Column({ type: 'varchar', length: 20 })
  status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remarks: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
