import { Column, Entity, Index, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('students')
@Index(['residentId'], {
  unique: true,
  where: '"residentId" IS NOT NULL',
})
@Index(['name', 'birthDate', 'studentNumber'], { unique: true })
@Index(['userId'])
export class StudentEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text', nullable: true })
  studentNumber!: string | null;

  @Column({ type: 'text' })
  name!: string;

  // YYYYMMDD or YYMMDD
  @Column({ type: 'text', nullable: true })
  birthDate!: string | null;

  @Column({ type: 'text', nullable: true })
  residentId!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  /** 담당 교사 (FK → users.id) */
  @Column({ type: 'varchar', nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userId' })
  user!: User;
}