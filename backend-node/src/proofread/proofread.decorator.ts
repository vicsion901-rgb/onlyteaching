import { SetMetadata } from '@nestjs/common';

import type { ProofreadRouteConfig } from './proofread.types';

export const PROOFREAD_ROUTE_CONFIG = 'proofread:route-config';

export const Proofreadable = (config: ProofreadRouteConfig) =>
  SetMetadata(PROOFREAD_ROUTE_CONFIG, config);
