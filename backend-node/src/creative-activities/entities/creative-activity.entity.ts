import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { StudentRecord } from '../../student-records/student-record.entity';
import { User } from '../../users/entities/user.entity';

@Entity('creative_activities')
export class CreativeActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'student_record_id' })
  studentRecordId: number;

  @ManyToOne(() => StudentRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_record_id' })
  studentRecord: StudentRecord;

  @Column({ name: 'created_by_user_id', nullable: true })
  createdByUserId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser: User;

  @Column({ name: 'updated_by_user_id', nullable: true })
  updatedByUserId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'updated_by_user_id' })
  updatedByUser: User;

  @Column({ name: 'academic_year' })
  academicYear: number;

  @Column()
  grade: number;

  @Column({ nullable: true })
  semester: number;

  @Column()
  area: string; // 'autonomous','club','volunteer','career'

  @Column({ nullable: true })
  title: string;

  @Column({ nullable: true })
  summary: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ name: 'start_date', nullable: true })
  startDate: string;

  @Column({ name: 'end_date', nullable: true })
  endDate: string;

  @Column({ type: 'real', nullable: true })
  hours: number;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  organizer: string;

  @Column({ nullable: true })
  role: string;

  @Column({ name: 'sentence_status', default: 'DRAFT' })
  sentenceStatus: string; // 'DRAFT','READY','GENERATED','LOCKED','ERROR'

  @Column({ name: 'generated_sentence', type: 'text', nullable: true })
  generatedSentence: string;

  @Column({ name: 'template_version', default: 1 })
  templateVersion: number;

  @Column({ name: 'generation_meta_json', type: 'text', nullable: true })
  generationMetaJson: string;

  @Column({ name: 'last_generated_at', nullable: true })
  lastGeneratedAt: string;

  @Column({ name: 'keywords_json', type: 'text', nullable: true })
  keywordsJson: string;

  @Column({ name: 'evidence_json', type: 'text', nullable: true })
  evidenceJson: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
