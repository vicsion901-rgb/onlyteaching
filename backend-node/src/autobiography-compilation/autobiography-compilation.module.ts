import { Module } from '@nestjs/common';
import { AutobiographyCompilationController } from './autobiography-compilation.controller';
import { AutobiographyCompilationService } from './autobiography-compilation.service';

@Module({
  controllers: [AutobiographyCompilationController],
  providers: [AutobiographyCompilationService],
})
export class AutobiographyCompilationModule {}
