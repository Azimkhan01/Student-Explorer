import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  type Relation,
  CreateDateColumn,
} from 'typeorm';

import { Quickzy } from './quickzy.entity.js';

@Entity('quickzy_qna')
export class QnA {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  quickzy_id: string;

  @ManyToOne(() => Quickzy, (quickzy) => quickzy.questions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'quickzy_id' })
  quickzy: Relation<Quickzy>;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'json' })
  options: string[];

  @Column({ type: 'varchar', length: 500 })
  correct_answer: string;

  @Column({ type: 'int', default: 1 })
  marks: number;

  @CreateDateColumn()
  created_at: Date;
}