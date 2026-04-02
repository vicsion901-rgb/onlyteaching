import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('meals')
@Unique(['schoolCode', 'mealDate'])
export class Meal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  schoolCode: string;

  @Column()
  mealDate: string;

  @Column('text')
  imageUrl: string;

  @Column({ type: 'text', nullable: true })
  caption?: string;

  @Column({ nullable: true })
  createdByUserId?: string;

  @Column({ default: 0 })
  likes: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
