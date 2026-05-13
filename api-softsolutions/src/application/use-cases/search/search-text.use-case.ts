import { Injectable } from '@nestjs/common';
import { MeilisearchService } from '../../../infrastructure/search/meilisearch/meilisearch.service';
import { SearchItem } from '../../../infrastructure/search/interfaces/search-item.interface';
import { QueryUnderstandingService } from '../../../infrastructure/search/nlp/query-understanding.service';

@Injectable()
export class SearchTextUseCase {
  constructor(
    private readonly meiliService: MeilisearchService,
    private readonly queryUnderstanding: QueryUnderstandingService,
  ) {}

  async execute(query: string): Promise<SearchItem[]> {
    if (!query?.trim()) return [];

    const processed = await this.queryUnderstanding.process(query);

    if (this.meiliService.supportsVectorSearch()) {
      return this.meiliService.searchHybrid(processed.normalizedText, processed.embedding);
    }

    const hits = await this.meiliService.search(processed.normalizedText);

    if (processed.embedding && hits?.length) {
      return this.meiliService.rerankByEmbedding(hits, processed.embedding);
    }

    return hits;
  }
}