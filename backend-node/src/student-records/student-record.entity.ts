import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('student_records')
@Unique(['number'])
export class StudentRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  number: number;

@Column({ nullable: true })
name?: string;

@Column({ nullable: true })
residentNumber?: string;

@Column({ nullable: true })
address?: string;

@Column({ nullable: true })
sponsor?: string;

@Column({ nullable: true })
remark?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


