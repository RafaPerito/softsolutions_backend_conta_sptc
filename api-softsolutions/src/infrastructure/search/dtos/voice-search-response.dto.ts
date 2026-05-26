export class VoiceSearchRankingDto {
  label!: string;

  value!: number;
}

export class VoiceSearchSuggestionDto {
  titulo!: string;

  tipo?: string;

  categoria?: string;
}

export class VoiceSearchResponseDto {
  originalText!: string;

  normalizedText!: string;

  tokens!: string[];

  filteredTokens!: string[];

  stems!: string[];

  intent!: string;

  confidence!: number;

  rankings!: VoiceSearchRankingDto[];

  searchQuery!: string;

  querySource!:
    | 'filteredTokens'
    | 'normalizedText';

  matchedTerms!: string[];

  requiresHumanSupport!: boolean;

  suggestions!: VoiceSearchSuggestionDto[];

  results!: Array<{
    id?: number | string;

    titulo: string;

    descricao: string;

    tipo?: string;

    categoria?: string;

    url?: string;

    curso?: string;

    modulo?: string;

    professor?: string;
  }>;
}