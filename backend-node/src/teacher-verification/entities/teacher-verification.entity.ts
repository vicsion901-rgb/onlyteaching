import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

/**
 * 교사 인증 기록 (한 명이 여러 번 인증/재인증 할 수 있음).
 *
 * ERD 설계 원칙 적용:
 * - BaseEntity 상속 (id, createdDate, modifiedDate, status)
 * - FK: userId → users.id (ManyToOne)
 * - 인덱스: (userId, createdDate) — 최근 인증 조회 최적화
 * - 인덱스: (verifiedSchool, verifiedName, payPeriod) — 중복 인증 방지 조회
 * - 비정규화: verified 시점 스냅샷 (이름·학교 등) 저장
 */
@Entity('teacher_verifications')
@Index(['userId', 'createdDate'])
@Index(['verifyStatus', 'createdDate'])
@Index(['verifiedSchool', 'verifiedName', 'payPeriod'])
export class TeacherVerification extends BaseEntity {
  /** users.id 참조 (FK) */
  @Column()
  userId!: string;

  @ManyToOne(() => User, (user) => user.teacherVerifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  /** 인증 결과: PENDING / VERIFIED / REJECTED */
  @Column({ default: 'PENDING' })
  verifyStatus!: string;

  /** 인증 방식: SALARY_PDF / DOCUMENT */
  @Column()
  method!: string;

  // ─── 검증 성공 시 저장되는 스냅샷 (비정규화) ───

  @Column({ type: 'varchar', nullable: true })
  verifiedName!: string | null;

  @Column({ type: 'varchar', nullable: true })
  verifiedSchool!: string | null;

  @Column({ type: 'varchar', nullable: true })
  verifiedCategory!: string | null;

  @Column({ type: 'varchar', nullable: true })
  verifiedPosition!: string | null;

  @Column({ type: 'varchar', nullable: true })
  payPeriod!: string | null;

  @Column({ type: 'varchar', nullable: true })
  issuedAt!: string | null;

  @Column({ type: 'datetime', nullable: true })
  verifiedAt!: Date | null;

  @Column({ type: 'datetime', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'varchar', nullable: true })
  rejectReason!: string | null;
}
