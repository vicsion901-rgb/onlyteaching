import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import sharp from 'sharp';
import { Between, Repository } from 'typeorm';

import { MealLike } from './meal-like.entity';
import { Meal } from './meal.entity';

interface SaveMealInput {
  schoolCode?: string;
  mealDate?: string;
  imageUrl?: string;
  caption?: string;
  createdByUserId?: string;
}

@Injectable()
export class MealsService {
  constructor(
    @InjectRepository(Meal)
    private readonly mealsRepo: Repository<Meal>,
    @InjectRepository(MealLike)
    private readonly likesRepo: Repository<MealLike>,
  ) {}

  async uploadImage(buffer: Buffer) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new BadRequestException('이미지 파일이 필요합니다');
    }

    const optimized = await sharp(buffer)
      .rotate()
      .resize({ width: 1280, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    return {
      imageUrl: `data:image/webp;base64,${optimized.toString('base64')}`,
    };
  }

  async saveMeal(input: SaveMealInput) {
    const schoolCode = input.schoolCode?.trim();
    const mealDate = this.normalizeDate(input.mealDate);
    const imageUrl = input.imageUrl?.trim();

    if (!schoolCode) {
      throw new BadRequestException('schoolCode가 필요합니다');
    }

    if (!imageUrl) {
      throw new BadRequestException('imageUrl이 필요합니다');
    }

    const existing = await this.mealsRepo.findOne({
      where: { schoolCode, mealDate },
    });

    if (existing) {
      existing.imageUrl = imageUrl;
      existing.caption = input.caption?.trim() || '';
      existing.createdByUserId = input.createdByUserId?.trim() || existing.createdByUserId;
      return this.mealsRepo.save(existing);
    }

    return this.mealsRepo.save(
      this.mealsRepo.create({
        schoolCode,
        mealDate,
        imageUrl,
        caption: input.caption?.trim() || '',
        createdByUserId: input.createdByUserId?.trim() || '',
      }),
    );
  }

  async listMeals(schoolCode?: string, startDate?: string, endDate?: string) {
    const normalizedSchoolCode = schoolCode?.trim();
    if (!normalizedSchoolCode) {
      throw new BadRequestException('schoolCode가 필요합니다');
    }

    if (startDate && endDate) {
      return this.mealsRepo.find({
        where: {
          schoolCode: normalizedSchoolCode,
          mealDate: Between(this.normalizeDate(startDate), this.normalizeDate(endDate)),
        },
        order: { mealDate: 'DESC', updatedAt: 'DESC' },
      });
    }

    return this.mealsRepo.find({
      where: { schoolCode: normalizedSchoolCode },
      order: { mealDate: 'DESC', updatedAt: 'DESC' },
      take: 20,
    });
  }

  async likeMeal(id: number, schoolCode?: string, userId?: string) {
    const normalizedSchoolCode = schoolCode?.trim();
    const normalizedUserId = userId?.trim();

    if (!normalizedSchoolCode || !normalizedUserId) {
      throw new BadRequestException('schoolCode와 userId가 필요합니다');
    }

    const meal = await this.mealsRepo.findOne({ where: { id } });
    if (!meal) {
      throw new NotFoundException('급식 게시물을 찾을 수 없습니다');
    }

    if (meal.schoolCode !== normalizedSchoolCode) {
      throw new ForbiddenException('같은 학교 게시물만 좋아요할 수 있습니다');
    }

    if (meal.createdByUserId && meal.createdByUserId === normalizedUserId) {
      throw new ForbiddenException('본인 게시물에는 좋아요할 수 없습니다');
    }

    const existingLike = await this.likesRepo.findOne({ where: { mealId: id, userId: normalizedUserId } });
    if (existingLike) {
      throw new ConflictException('이미 좋아요한 게시물입니다');
    }

    await this.likesRepo.save(
      this.likesRepo.create({
        mealId: id,
        userId: normalizedUserId,
        schoolCode: normalizedSchoolCode,
      }),
    );

    meal.likes += 1;
    const savedMeal = await this.mealsRepo.save(meal);

    return { meal: savedMeal, liked: true };
  }

  async getWeeklyLeaderboard(weekStart?: string, weekEnd?: string) {
    const startDate = this.normalizeDate(weekStart);
    const endDate = this.normalizeDate(weekEnd || weekStart);

    return this.mealsRepo
      .createQueryBuilder('meal')
      .select('meal.schoolCode', 'schoolCode')
      .addSelect('SUM(meal.likes)', 'totalLikes')
      .addSelect('COUNT(meal.id)', 'postCount')
      .where('meal.mealDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('meal.schoolCode')
      .orderBy('SUM(meal.likes)', 'DESC')
      .addOrderBy('COUNT(meal.id)', 'DESC')
      .getRawMany();
  }

  private normalizeDate(value?: string) {
    const targetDate = value?.trim() ? new Date(value) : new Date();

    if (Number.isNaN(targetDate.getTime())) {
      throw new BadRequestException('유효한 날짜가 필요합니다');
    }

    return targetDate.toISOString().slice(0, 10);
  }
}
