import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('students')
@Index(['residentId'], {
  unique: true,
  where: '"residentId" IS NOT NULL',
})
@Index(['name', 'birthDate', 'studentNumber'], { unique: true })
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
}