import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
} from '@nestjs/common';

import { SearchTextUseCase } from '../../../application/use-cases/search/search-text.use-case';

import { SearchVoiceUseCase } from '../../../application/use-cases/search/search-voice.use-case';

import { MeilisearchIndexerService } from '../../../infrastructure/search/meilisearch/meilisearch-indexer.service';

import { MeilisearchService } from '../../../infrastructure/search/meilisearch/meilisearch.service';

import { VoiceSearchRequestDto } from '../../../infrastructure/search/dtos/voice-search-request.dto';

import { VoiceSearchResponseDto } from '../../../infrastructure/search/dtos/voice-search-response.dto';

import { TextSearchQueryDto } from '../../../infrastructure/search/dtos/text-search-query.dto';

import { SearchItem } from '../../../infrastructure/search/interfaces/search-item.interface';

@Controller('search')
export class SearchController {
  constructor(
    private readonly searchTextUseCase: SearchTextUseCase,

    private readonly searchVoiceUseCase: SearchVoiceUseCase,

    private readonly meilisearchIndexerService: MeilisearchIndexerService,

    private readonly meilisearchService: MeilisearchService,
  ) {}

  // ====================================================
  // TEXT SEARCH
  // ====================================================

  @Get('text-search')
  async textSearch(
    @Query() query: TextSearchQueryDto,
  ): Promise<{
    results: SearchItem[];

    total: number;

    query: string;
  }> {
    const results =
      await this.searchTextUseCase.execute(
        query.q,
      );

    return {
      results,

      total: results.length,

      query: query.q,
    };
  }

  // ====================================================
  // AUTOCOMPLETE
  // ====================================================

  @Get('autocomplete')
  async autocomplete(
    @Query('q') q: string,
  ): Promise<{
    suggestions: string[];
  }> {
    if (!q?.trim()) {
      return {
        suggestions: [],
      };
    }

    const suggestions =
      await this.meilisearchService.getSuggestions(
        q,
      );

    return {
      suggestions,
    };
  }

  // ====================================================
  // VOICE SEARCH
  // ====================================================

  @Post('voice')
  @HttpCode(200)
  async voiceSearch(
    @Body() dto: VoiceSearchRequestDto,
  ): Promise<VoiceSearchResponseDto> {
    return this.searchVoiceUseCase.execute(
      dto,
    );
  }

  // ====================================================
  // REINDEX
  // ====================================================

  @Post('reindex')
  @HttpCode(200)
  async reindex(): Promise<{
    message: string;
  }> {
    await this.meilisearchIndexerService.reindexCursosEAulas();

    return {
      message:
        'Reindexação concluída com sucesso.',
    };
  }
}