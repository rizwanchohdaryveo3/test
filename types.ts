
export type AspectRatio = '16:9' | '9:16';

export type GenerationState = 'idle' | 'loading' | 'polling' | 'success' | 'error' | 'selecting_key';

export interface ApiKeyCheckResult {
  hasKey: boolean;
}
