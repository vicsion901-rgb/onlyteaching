import { Module } from '@nestjs/common';

import { ProofreadController } from './proofread.controller';
import { ProofreadResponseInterceptor } from './proofread-response.interceptor';
import { ProofreadService } from './proofread.service';

@Module({
  controllers: [ProofreadController],
  providers: [ProofreadService, ProofreadResponseInterceptor],
  exports: [ProofreadService, ProofreadResponseInterceptor],
})
export class ProofreadModule {}
