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

  // ====================================================
  // BUILD SMART QUERY
  // ====================================================

  private buildSmartQuery(
    processed: any,
  ): string {
    const tokens = [
      ...(processed.filteredTokens ??
        []),

      ...(processed.synonyms ?? []),

      ...(processed.boostTerms ?? []),
    ];

    return [
      ...new Set(
        tokens.filter(Boolean),
      ),
    ].join(' ');
  }

  // ====================================================
  // GENERATE SUGGESTIONS
  // ====================================================

  private generateSuggestions(
    results: any[],
  ): Array<{
    titulo: string;

    tipo?: string;

    categoria?: string;
  }> {
    const unique =
      new Map<
        string,
        {
          titulo: string;

          tipo?: string;

          categoria?: string;
        }
      >();

    for (const item of results) {
      const titulo =
        item.curso ||
        item.titulo;

      if (!titulo) {
        continue;
      }

      if (
        !unique.has(titulo)
      ) {
        unique.set(titulo, {
          titulo,

          tipo:
            item.tipo,

          categoria:
            item.categoria,
        });
      }
    }

    return Array.from(
      unique.values(),
    ).slice(0, 5);
  }

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

CONFIDENCE:
${processed.confidence}

TOKENS:
${JSON.stringify(
      processed.tokens,
    )}

FILTERED TOKENS:
${JSON.stringify(
      processed.filteredTokens,
    )}

SYNONYMS:
${JSON.stringify(
      processed.synonyms,
    )}

CONCEPTS:
${JSON.stringify(
      processed.concepts,
    )}

RELATED TERMS:
${JSON.stringify(
      processed.relatedTerms,
    )}

BOOST TERMS:
${JSON.stringify(
      processed.boostTerms,
    )}

CATEGORIES:
${JSON.stringify(
      processed.categories,
    )}
`);

    // ====================================================
    // SMART QUERY
    // ====================================================

    const smartQuery =
      this.buildSmartQuery(
        processed,
      );

    this.logger.log(`
================ SMART QUERY ================

${smartQuery}
`);

    // ====================================================
    // SEARCH
    // ====================================================

    const results =
      await this.searchTextUseCase.execute(
        dto.text,
      );

    // ====================================================
    // FALLBACK SEARCH
    // ====================================================

    let finalResults = results;

    if (
      !finalResults.length &&
      smartQuery
    ) {
      this.logger.warn(
        '⚠️ Executando fallback smart query...',
      );

      finalResults =
        await this.searchTextUseCase.execute(
          smartQuery,
        );
    }

    // ====================================================
    // HUMAN SUPPORT FLAG
    // ====================================================

    const requiresHumanSupport =
      !finalResults.length &&
      processed.confidence <
        0.2;

    // ====================================================
    // RESPONSE
    // ====================================================

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
        smartQuery ||
        processed.normalizedText,

      querySource:
        smartQuery
          ? 'filteredTokens'
          : 'normalizedText',

      matchedTerms:
        processed.matchedTerms ??
        processed.normalizedText
          .split(/\s+/)
          .filter(Boolean),

      results: finalResults,

      suggestions:
        this.generateSuggestions(
          finalResults,
        ),

      requiresHumanSupport,
    };
  }
}