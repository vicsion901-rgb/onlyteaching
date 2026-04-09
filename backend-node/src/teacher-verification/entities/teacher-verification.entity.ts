import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

/**
 * 교사 인증 기록 (한 명이 여러 번 인증/재인증 할 수 있음).
 *
 * ERD 설계 원칙 적용:
 * - BaseEntity 상속 (id, createdDate, modifiedDate, status)
 * - FK 명명 표준: userId (users.id 참조)
 * - 인덱스: (userId, createdDate DESC) — 최근 인증 조회 최적화
 * - 비정규화: verified 시점 스냅샷 (이름·학교 등) 저장
 *   → 나중에 전학/개명해도 당시 인증 정보는 그대로
 * - 민감 데이터(급여 금액·세부 내역) 저장 금지 → verified 결과만 남김
 */
@Entity('teacher_verifications')
@Index(['userId', 'createdDate'])
@Index(['verifyStatus', 'createdDate'])
export class TeacherVerification extends BaseEntity {
  /** users.id 참조 (FK 표준) */
  @Column()
  userId!: string;

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
