import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  type Relation,
} from 'typeorm';

import { Teacher } from './teacher.entity.js';
import { QnA } from './qna.entity.js';

@Entity('quickzies')
export class Quickzy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  quickzy_name: string;

  // Teacher who created the Quickzy
  @Column({ type: 'uuid' })
  teacher_id: string;

  @ManyToOne(() => Teacher, (teacher) => teacher.quickzies, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'teacher_id' })
  teacher: Relation<Teacher>;

  // One Quickzy can have multiple questions
  @OneToMany(() => QnA, (qna) => qna.quickzy, {
    cascade: true,
  })
  questions: QnA[];

  @CreateDateColumn()
  created_at: Date;
}