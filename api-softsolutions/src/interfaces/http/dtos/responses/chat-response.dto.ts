export class ChatNavigationDto {
  label!: string;

  route!: string;

  action?: string;
}

export class ChatResponseDto {
  response!: string;

  intent!: string;

  confidence!: number;

  suggestions!: string[];

  requiresHumanSupport!: boolean;

  relatedCourses?: string[];

  semanticContext?: {
    intent?: string;

    categories?: string[];

    concepts?: string[];
  };

  navigation?: ChatNavigationDto[];

  conversationId?: string;
}