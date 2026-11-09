import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  type Relation,
} from 'typeorm';
import { ClassSubject } from './class-subject.entity.js';


@Entity('subjects')
export class Subject {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'subject_name', type: 'varchar', length: 100 })
  subjectName: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @OneToMany(
    () => ClassSubject,
    (classSubject) => classSubject.subject,
  )
  classSubjects: Relation<ClassSubject[]>;
}