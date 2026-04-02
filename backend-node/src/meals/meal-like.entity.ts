import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('meal_likes')
@Unique(['mealId', 'userId'])
export class MealLike {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  mealId: number;

  @Column()
  userId: string;

  @Column()
  schoolCode: string;

  @CreateDateColumn()
  createdAt: Date;
}
