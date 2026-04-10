import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  Index,
} from 'typeorm';
import { TeacherVerification } from '../../teacher-verification/entities/teacher-verification.entity';

export type UserStatus = 'PENDING' | 'ACTIVE' | 'REJECTED';

@Entity('users')
@Unique(['schoolCode', 'teacherCode'])
@Index(['emailHash'])
@Index(['status'])
@Index(['schoolName'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** 로그인 ID (기존 필드 유지) */
  @Column()
  schoolCode!: string;

  /**
   * ⚠️ 기존 필드 (평문 비밀번호 또는 확인용 토큰).
   * 신규 가입자는 사용하지 않음 — passwordHash 사용.
   */
  @Column()
  teacherCode!: string;

  // ─── 신규 보안 필드 (P0) ───

  @Column({ type: 'varchar', nullable: true })
  passwordHash!: string | null;

  @Column({ type: 'varchar', nullable: true })
  nameEnc!: string | null;

  @Column({ type: 'varchar', nullable: true })
  emailEnc!: string | null;

  @Column({ type: 'varchar', nullable: true })
  emailHash!: string | null;

  @Column({ type: 'varchar', nullable: true })
  phoneEnc!: string | null;

  @Column({ type: 'varchar', nullable: true })
  schoolName!: string | null;

  // ─── 상태 / 메타 ───

  @Column({ default: 'PENDING' })
  status!: UserStatus;

  @CreateDateColumn()
  createdAt!: Date;

  // ─── 관계 (FK) ───

  @OneToMany(() => TeacherVerification, (tv) => tv.user)
  teacherVerifications!: TeacherVerification[];
}
