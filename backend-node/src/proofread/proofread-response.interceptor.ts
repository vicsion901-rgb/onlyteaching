import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { PROOFREAD_ROUTE_CONFIG } from './proofread.decorator';
import { ProofreadService } from './proofread.service';
import type { ProofreadRouteConfig } from './proofread.types';

@Injectable()
export class ProofreadResponseInterceptor implements NestInterceptor {
  constructor(
    private readonly proofreadService: ProofreadService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const routeConfig = this.reflector.getAllAndOverride<ProofreadRouteConfig>(
      PROOFREAD_ROUTE_CONFIG,
      [context.getHandler(), context.getClass()],
    );

    if (!routeConfig) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{ body?: unknown }>();
    const protectedTokens = this.collectProtectedTokens(
      request?.body,
      routeConfig.protectedBodyFields ?? [],
    );

    return next.handle().pipe(
      mergeMap((data) => from(this.proofreadResponsePayload(data, routeConfig, protectedTokens))),
    );
  }

  private async proofreadResponsePayload(
    payload: unknown,
    routeConfig: ProofreadRouteConfig,
    protectedTokens: string[],
  ): Promise<unknown> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return payload;
    }

    const responseRecord = payload as Record<string, unknown>;
    const updatedResponse: Record<string, unknown> = { ...responseRecord };

    for (const key of routeConfig.responseFields) {
      const fieldValue = responseRecord[key];

      if (typeof fieldValue !== 'string') {
        continue;
      }

      updatedResponse[key] = await this.proofreadService.proofreadText({
        text: fieldValue,
        contentType: routeConfig.contentType,
        protectedTokens,
      });
    }

    return updatedResponse;
  }

  private collectProtectedTokens(value: unknown, protectedBodyFields: readonly string[]): string[] {
    const tokens = new Set<string>();

    for (const fieldPath of protectedBodyFields) {
      const fieldValue = this.getValueByPath(value, fieldPath);
      this.walkValueForTokens(fieldValue, tokens);
    }

    return Array.from(tokens);
  }

  private getValueByPath(value: unknown, fieldPath: string): unknown {
    if (!fieldPath) {
      return undefined;
    }

    return fieldPath
      .split('.')
      .reduce<unknown>((currentValue, segment) => {
        if (!currentValue || typeof currentValue !== 'object' || Array.isArray(currentValue)) {
          return undefined;
        }

        return (currentValue as Record<string, unknown>)[segment];
      }, value);
  }

  private walkValueForTokens(value: unknown, tokens: Set<string>): void {
    if (typeof value === 'number') {
      tokens.add(String(value));
      return;
    }

    if (typeof value === 'string') {
      const normalizedValue = value.trim();

      if (!normalizedValue) {
        return;
      }

      if (normalizedValue.length <= 40 && !normalizedValue.includes('\n') && tokens.size < 30) {
        tokens.add(normalizedValue);
      }

      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        this.walkValueForTokens(item, tokens);

        if (tokens.size >= 30) {
          break;
        }
      }
      return;
    }

    if (!value || typeof value !== 'object') {
      return;
    }

    for (const nestedValue of Object.values(value)) {
      this.walkValueForTokens(nestedValue, tokens);

      if (tokens.size >= 30) {
        break;
      }
    }
  }
}
