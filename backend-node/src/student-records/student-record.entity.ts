import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/entities/user.entity';

@Entity('student_records')
@Unique(['number'])
@Index(['userId'])
@Index(['name'])
export class StudentRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  number: number;

  @Column({ type: 'text', nullable: true })
  name: string | null;

  @Column({ type: 'text', nullable: true })
  residentNumber: string | null;

  @Column({ type: 'text', nullable: true })
  birthDate: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'text', nullable: true })
  sponsor: string | null;

  @Column({ type: 'text', nullable: true })
  remark: string | null;

  /** 담당 교사 (FK → users.id) */
  @Column({ type: 'varchar', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


