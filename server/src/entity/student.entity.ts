import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  type Relation,
} from 'typeorm';
import { StudentEnrollment } from './student-enrollment.entity.js';
// import { Attendance } from './attendance.entity.js';
import { ExamResult } from './exam-result.entity.js';


@Entity('students')
export class Student {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  username: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ type: 'date', nullable: true })
  dob: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  contact: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'student',
  })
  role: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable:true
  })
  password: string;

  @Column({
    type:'boolean',
    default:false
  })
  active:boolean;



  @OneToMany(
    () => StudentEnrollment,
    (enrollment) => enrollment.student,
  )
  enrollments: Relation<StudentEnrollment[]>;

  // @OneToMany(
  //   () => Attendance,
  //   (attendance) => attendance.student,
  // )
  // attendanceRecords: Relation<Attendance[]>;

  @OneToMany(
    () => ExamResult,
    (result) => result.student,
  )
  examResults: Relation<ExamResult[]>;
}