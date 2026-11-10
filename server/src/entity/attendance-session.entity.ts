import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  type Relation,
} from 'typeorm';

import { ClassSubject } from './class-subject.entity.js';

@Entity('attendance_sessions')
export class AttendanceSession {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => ClassSubject,
    (classSubject) => classSubject.attendanceSessions,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'class_subject_id' })
  classSubject: Relation<ClassSubject>;

  @Column({
    name: 'attendance_date',
    type: 'date',
  })
  attendanceDate: string;

  @Column({
    type: 'double precision',
  })
  latitude: number;

  @Column({
    type: 'double precision',
  })
  longitude: number;

  @Column({
    name: 'radius_meters',
    type: 'int',
  })
  radiusMeters: number;

  @Column({
    name: 'qr_token_hash',
    type: 'varchar',
    length: 64,
  })
  qrTokenHash: string;

  @Column({
    name: 'expires_at',
    type: 'timestamp',
  })
  expiresAt: Date;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;
}