export class EvaluateResponseDto {
  decision!: 'allow' | 'deny';
  reason?: string;
}
