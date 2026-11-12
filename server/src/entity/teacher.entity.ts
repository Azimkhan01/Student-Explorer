import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  type Relation,
} from 'typeorm';

import { ClassSubject } from './class-subject.entity.js';
import { Quickzy } from './quickzy.entity.js';

@Entity('teachers')
export class Teacher {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  username: string;

  @Column({ type: 'varchar', length: 100 })
  email: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  password: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'teacher',
  })
  role: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  active: boolean;

  // Class Subject Relationship
  @OneToMany(
    () => ClassSubject,
    (classSubject) => classSubject.teacher,
  )
  classSubjects: Relation<ClassSubject[]>;

  // Quickzy Relationship
  @OneToMany(
    () => Quickzy,
    (quickzy) => quickzy.teacher,
  )
  quickzies: Relation<Quickzy[]>;
}