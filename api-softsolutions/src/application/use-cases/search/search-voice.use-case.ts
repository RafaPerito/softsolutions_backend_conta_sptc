import {
  Injectable,
  Logger,
} from '@nestjs/common';

import { VoiceSearchRequestDto } from '../../../infrastructure/search/dtos/voice-search-request.dto';

import {
  VoiceSearchResponseDto,
} from '../../../infrastructure/search/dtos/voice-search-response.dto';

import { SearchTextUseCase } from './search-text.use-case';

import { QueryUnderstandingService } from '../../../infrastructure/search/nlp/query-understanding.service';

@Injectable()
export class SearchVoiceUseCase {
  private readonly logger = new Logger(
    SearchVoiceUseCase.name,
  );

  constructor(
    private readonly queryUnderstandingService: QueryUnderstandingService,

    private readonly searchTextUseCase: SearchTextUseCase,
  ) {}

  async execute(
    dto: VoiceSearchRequestDto,
  ): Promise<VoiceSearchResponseDto> {
    const processed =
      await this.queryUnderstandingService.process(
        dto.text,
      );

    this.logger.log(`
================ VOICE SEARCH DEBUG ================

ORIGINAL:
${processed.originalText}

NORMALIZED:
${processed.normalizedText}

INTENT:
${processed.intent}

TOKENS:
${JSON.stringify(
  processed.tokens,
)}

SYNONYMS:
${JSON.stringify(
  processed.synonyms,
)}

CONCEPTS:
${JSON.stringify(
  processed.concepts,
)}

CATEGORIES:
${JSON.stringify(
  processed.categories,
)}
`);

    const results =
      await this.searchTextUseCase.execute(
        dto.text,
      );

    return {
      originalText:
        processed.originalText,

      normalizedText:
        processed.normalizedText,

      tokens:
        processed.tokens ?? [],

      filteredTokens:
        processed.filteredTokens ??
        [],

      stems:
        processed.stems ?? [],

      intent:
        processed.intent,

      confidence:
        processed.confidence,

      rankings:
        processed.rankings?.map(
          (r) => ({
            label: r.label,

            value: r.value,
          }),
        ) ?? [],

      searchQuery:
        processed.normalizedText,

      querySource:
        'normalizedText',

      matchedTerms:
        processed.matchedTerms ??
        processed.normalizedText
          .split(/\s+/)
          .filter(Boolean),

      results,
    };
  }
}