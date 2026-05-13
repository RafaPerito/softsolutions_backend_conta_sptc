import { Injectable } from '@nestjs/common';
import { VoiceSearchRequestDto } from '../../../infrastructure/search/dtos/voice-search-request.dto';
import {
  VoiceSearchResponseDto,
  VoiceSearchRankingDto,
} from '../../../infrastructure/search/dtos/voice-search-response.dto';
import { SearchTextUseCase } from './search-text.use-case';
import { QueryUnderstandingService } from '../../../infrastructure/search/nlp/query-understanding.service';

@Injectable()
export class SearchVoiceUseCase {
  constructor(
    private readonly queryUnderstandingService: QueryUnderstandingService,
    private readonly searchTextUseCase: SearchTextUseCase,
  ) {}

  async execute(dto: VoiceSearchRequestDto): Promise<VoiceSearchResponseDto> {
    const processed = await this.queryUnderstandingService.process(dto.text);

    const results = await this.searchTextUseCase.execute(dto.text);

    return {
      originalText: processed.originalText,
      normalizedText: processed.normalizedText,
      tokens: processed.tokens ?? [],
      filteredTokens: processed.filteredTokens ?? [],
      stems: processed.stems ?? [],
      intent: processed.intent,
      confidence: processed.confidence,
      rankings: processed.rankings?.map((r) => ({ label: r.label, value: r.value })) ?? [],
      searchQuery: processed.finalQuery ?? processed.normalizedText,
      querySource: processed.querySource ?? 'normalizedText',
      matchedTerms: processed.matchedTerms ?? processed.normalizedText.split(/\s+/).filter(Boolean),
      results,
    };
  }
}