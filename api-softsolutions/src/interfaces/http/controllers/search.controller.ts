import {
  Controller,
  Get,
  Post,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { SearchTextUseCase } from '../../../application/use-cases/search/search-text.use-case';
import { MeilisearchIndexerService } from '../../../infrastructure/search/meilisearch/meilisearch-indexer.service';

@Controller('search')
export class SearchController {
  constructor(
    private readonly searchTextUseCase: SearchTextUseCase,
    private readonly meilisearchIndexerService: MeilisearchIndexerService,
  ) {}

  @Get('text-search')
  async textSearch(@Query('q') q: string) {
    if (!q?.trim()) {
      throw new BadRequestException('Query vazia');
    }

    const results = await this.searchTextUseCase.execute(q.trim());

    return { results };
  }

  @Post('reindex')
  async reindex() {
    await this.meilisearchIndexerService.reindexCursosEAulas();

    return {
      message: 'Reindexação concluída com sucesso.',
    };
  }
}