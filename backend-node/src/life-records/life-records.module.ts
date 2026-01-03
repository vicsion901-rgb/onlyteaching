import { Module } from '@nestjs/common';
import { LifeRecordsController } from './life-records.controller';
import { LifeRecordsService } from './life-records.service';

@Module({
  controllers: [LifeRecordsController],
  providers: [LifeRecordsService],
})
export class LifeRecordsModule {}











