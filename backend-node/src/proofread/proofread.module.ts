import { Module } from '@nestjs/common';

import { ProofreadResponseInterceptor } from './proofread-response.interceptor';
import { ProofreadService } from './proofread.service';

@Module({
  providers: [ProofreadService, ProofreadResponseInterceptor],
  exports: [ProofreadService, ProofreadResponseInterceptor],
})
export class ProofreadModule {}
