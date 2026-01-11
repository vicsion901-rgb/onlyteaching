import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('achievement_standards')
export class AchievementStandard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  subject: string;

  @Column()
  grade_group: string; // 예: 1-2, 3-4, 5-6

  @Column()
  area: string;

  @Column()
  code: string;

  @Column()
  standard: string;
}

