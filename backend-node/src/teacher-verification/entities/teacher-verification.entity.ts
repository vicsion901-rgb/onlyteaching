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
  @Column({ type: 'varchar', length: 64 })
  userId!: string;

  /** 인증 결과: PENDING / VERIFIED / REJECTED */
  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  verifyStatus!: string;

  /** 인증 방식: SALARY_PDF / DOCUMENT */
  @Column({ type: 'varchar', length: 20 })
  method!: string;

  // ─── 검증 성공 시 저장되는 스냅샷 (비정규화) ───

  @Column({ type: 'varchar', length: 50, nullable: true })
  verifiedName!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  verifiedSchool!: string | null;

  /** 예: "국공립교원", "사립교원" */
  @Column({ type: 'varchar', length: 30, nullable: true })
  verifiedCategory!: string | null;

  /** 예: "교사(초등)" */
  @Column({ type: 'varchar', length: 50, nullable: true })
  verifiedPosition!: string | null;

  /** 급여 지급 연월 (YYYY-MM) — 최근성 검증 기록 */
  @Column({ type: 'varchar', length: 7, nullable: true })
  payPeriod!: string | null;

  /** PDF 푸터에 찍힌 발급 일시 (위변조 검증 근거) */
  @Column({ type: 'varchar', length: 30, nullable: true })
  issuedAt!: string | null;

  /** 인증 완료 시각 */
  @Column({ type: 'timestamp', nullable: true })
  verifiedAt!: Date | null;

  /** 인증 만료 시각 (정책상 1년 권장) */
  @Column({ type: 'timestamp', nullable: true })
  expiresAt!: Date | null;

  /** 거부 사유 (실패 시) */
  @Column({ type: 'varchar', length: 200, nullable: true })
  rejectReason!: string | null;
}
