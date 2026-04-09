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
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @CreateDateColumn()
  createdDate!: Date;

  @UpdateDateColumn()
  modifiedDate!: Date;

  @Column({ default: 'NORMAL' })
  status!: string;
}
