import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreativeActivitiesService } from './creative-activities.service';
import { CreativeActivitiesController } from './creative-activities.controller';
import { CreativeActivity } from './entities/creative-activity.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CreativeActivity])],
  controllers: [CreativeActivitiesController],
  providers: [CreativeActivitiesService],
})
export class CreativeActivitiesModule {}
