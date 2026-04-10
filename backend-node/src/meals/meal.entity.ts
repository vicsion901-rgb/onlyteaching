import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/entities/user.entity';
import { MealLike } from './meal-like.entity';

@Entity('meals')
@Unique(['schoolCode', 'mealDate'])
@Index(['schoolCode', 'mealDate'])
export class Meal {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  schoolCode!: string;

  @Column()
  mealDate!: string;

  @Column('text')
  imageUrl!: string;

  @Column({ type: 'text', nullable: true })
  caption?: string;

  @Column({ nullable: true })
  createdByUserId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser?: User;

  @Column({ default: 0 })
  likes!: number;

  @OneToMany(() => MealLike, (ml) => ml.meal)
  mealLikes!: MealLike[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
