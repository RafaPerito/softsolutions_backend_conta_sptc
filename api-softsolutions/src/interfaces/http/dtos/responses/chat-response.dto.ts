export class ChatResponseDto {
  response!: string;

  intent!: string;

  confidence!: number;

  suggestions!: string[];

  requiresHumanSupport!: boolean;
}