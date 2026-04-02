export type ProofreadContentType =
  | 'general'
  | 'life-record'
  | 'autobiography';

export interface ProofreadRequest {
  text: string;
  contentType: ProofreadContentType;
  protectedTokens?: string[];
}

export interface ProofreadValidationResult {
  valid: boolean;
  reason?: string;
}

export interface ProofreadRouteConfig {
  contentType: ProofreadContentType;
  responseFields: readonly string[];
  protectedBodyFields?: readonly string[];
}
