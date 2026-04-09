import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';

/**
 * 모든 도메인 테이블의 공통 부모.
 * ERD 설계서 표준 1: 공통 컬럼 4개 (id / createdDate / modifiedDate / status)
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdDate!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  modifiedDate!: Date;

  @Column({ type: 'varchar', length: 20, default: 'NORMAL' })
  status!: string;
}
