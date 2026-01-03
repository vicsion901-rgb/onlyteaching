import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export type UserStatus = 'PENDING' | 'ACTIVE' | 'REJECTED';

@Entity('users')
@Unique(['schoolCode', 'teacherCode'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  schoolCode: string;

  @Column()
  teacherCode: string;

  @Column({ default: 'PENDING' })
  status: UserStatus;

  @CreateDateColumn()
  createdAt: Date;
}


