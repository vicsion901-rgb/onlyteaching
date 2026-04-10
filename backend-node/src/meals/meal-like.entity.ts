import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Meal } from './meal.entity';
import { User } from '../users/entities/user.entity';

@Entity('meal_likes')
@Unique(['mealId', 'userId'])
@Index(['schoolCode'])
export class MealLike {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  mealId!: number;

  @ManyToOne(() => Meal, (meal) => meal.mealLikes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mealId' })
  meal!: Meal;

  @Column()
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  schoolCode!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
