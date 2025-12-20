import { Module } from '@nestjs/common';
import { PromptsService } from './prompts.service';
import { PromptsController } from './prompts.controller';

@Module({
  providers: [PromptsService],
  controllers: [PromptsController]
})
export class PromptsModule {}
