import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MealLike } from './meal-like.entity';
import { Meal } from './meal.entity';
import { MealsController } from './meals.controller';
import { MealsService } from './meals.service';

@Module({
  imports: [TypeOrmModule.forFeature([Meal, MealLike])],
  controllers: [MealsController],
  providers: [MealsService],
})
export class MealsModule {}
