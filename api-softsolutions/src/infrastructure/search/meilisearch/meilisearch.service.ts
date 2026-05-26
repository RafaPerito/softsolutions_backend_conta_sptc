import {
  Injectable,
  Logger,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { MeiliSearch } from 'meilisearch';

import { SearchItem } from '../interfaces/search-item.interface';

@Injectable()
export class MeilisearchService {
  private readonly logger = new Logger(
    MeilisearchService.name,
  );

  private readonly client: MeiliSearch;

  private readonly indexName =
    'softsolutions';

  constructor(
    private readonly configService: ConfigService,
  ) {
    const host =
      this.configService.get<string>(
        'MEILI_HOST',
      ) || 'http://meilisearch:7700';

    const apiKey =
      this.configService.get<string>(
        'MEILI_API_KEY',
      ) || '';

    this.logger.log(
      `🔎 Conectando ao Meilisearch: ${host}`,
    );

    this.client = new MeiliSearch({
      host,
      apiKey,
    });
  }

  // ====================================================
  // GET OR CREATE INDEX
  // ====================================================

  private async getOrCreateIndex() {
    try {
      await this.client.getIndex(
        this.indexName,
      );
    } catch {
      this.logger.log(
        `🆕 Criando índice ${this.indexName}...`,
      );

      await this.client.createIndex(
        this.indexName,
        {
          primaryKey: 'id',
        },
      );

      this.logger.log(
        '✅ Índice criado.',
      );
    }

    return this.client.index(
      this.indexName,
    );
  }

  // ====================================================
  // CONFIGURE INDEX
  // ====================================================

  async configureIndex(): Promise<void> {
    const index =
      await this.getOrCreateIndex();

    this.logger.log(
      '⚙️ Configurando índice...',
    );

    // ====================================================
    // SEARCHABLE ATTRIBUTES
    // ====================================================

    await this.client.waitForTask(
      (
        await index.updateSearchableAttributes(
          [
            'titulo',

            'curso',

            'categoria',

            'modulo',

            'descricao',

            'descricaoDetalhada',

            'conteudo',

            'professor',

            'searchText',

            'semanticTags',

            'semanticConcepts',
          ],
        )
      ).taskUid,
    );

    // ====================================================
    // FILTERABLE
    // ====================================================

    await this.client.waitForTask(
      (
        await index.updateFilterableAttributes(
          [
            'tipo',

            'categoria',

            'professor',
          ],
        )
      ).taskUid,
    );

    // ====================================================
    // SORTABLE
    // ====================================================

    await this.client.waitForTask(
      (
        await index.updateSortableAttributes(
          [
            'avaliacao',

            'tempoCurso',
          ],
        )
      ).taskUid,
    );

    // ====================================================
    // TYPO TOLERANCE
    // ====================================================

    await this.client.waitForTask(
      (
        await index.updateTypoTolerance({
          enabled: true,

          minWordSizeForTypos: {
            oneTypo: 5,
            twoTypos: 9,
          },
        })
      ).taskUid,
    );

    // ====================================================
    // STOP WORDS
    // ====================================================

    await this.client.waitForTask(
      (
        await index.updateStopWords([
          'de',
          'da',
          'do',
          'das',
          'dos',
          'e',
          'a',
          'o',
          'os',
          'as',
          'para',
          'com',
          'em',
          'curso',
          'aula',
          'video',
          'videos',
        ])
      ).taskUid,
    );

    // ====================================================
    // RANKING RULES
    // ====================================================

    await this.client.waitForTask(
      (
        await index.updateRankingRules([
          'words',

          'typo',

          'proximity',

          'attribute',

          'sort',

          'exactness',
        ])
      ).taskUid,
    );

    this.logger.log(
      '✅ Índice configurado.',
    );
  }

  // ====================================================
  // REINDEX
  // ====================================================

  async replaceAllDocuments(
    documents: any[],
  ): Promise<void> {
    const index =
      await this.getOrCreateIndex();

    await this.configureIndex();

    this.logger.log(`
================ DOCUMENTS DEBUG ================

TOTAL DOCUMENTS:
${documents.length}
`);

    // ====================================================
    // DELETE OLD DOCUMENTS
    // ====================================================

    this.logger.log(
      '🗑️ Limpando documentos antigos...',
    );

    const deleteTask =
      await index.deleteAllDocuments();

    await this.client.waitForTask(
      deleteTask.taskUid,
    );

    // ====================================================
    // INSERT NEW DOCUMENTS
    // ====================================================

    this.logger.log(
      '📦 Inserindo documentos...',
    );

    const insertTask =
      await index.addDocuments(
        documents,
      );

    const result =
      await this.client.waitForTask(
        insertTask.taskUid,
      );

    if (
      result.status !==
      'succeeded'
    ) {
      this.logger.error(
        '❌ Erro ao indexar.',
      );

      throw new Error(
        JSON.stringify(result),
      );
    }

    const stats =
      await index.getStats();

    this.logger.log(`
================ INDEX STATS ================

${JSON.stringify(
  stats,
  null,
  2,
)}
`);

    this.logger.log(
      '✅ Reindexação finalizada.',
    );
  }

  // ====================================================
  // DELETE ALL
  // ====================================================

  async deleteAllDocuments(): Promise<void> {
    const index =
      await this.getOrCreateIndex();

    const task =
      await index.deleteAllDocuments();

    await this.client.waitForTask(
      task.taskUid,
    );
  }

  // ====================================================
  // SEARCH
  // ====================================================

  async search(
    query: string,
  ): Promise<SearchItem[]> {
    const index =
      await this.getOrCreateIndex();

    const normalizedQuery =
      query
        ?.toLowerCase()
        ?.trim();

    this.logger.log(
      `🔎 Executando busca: "${normalizedQuery}"`,
    );

    const response =
      await index.search(
        normalizedQuery,
        {
          limit: 15,

          showRankingScore: true,

          matchingStrategy:
            'all',

          attributesToHighlight: [
            'titulo',

            'descricao',

            'curso',
          ],
        },
      );

    this.logger.log(`
================ RAW MEILI RESPONSE ================

${JSON.stringify(
  response.hits,
  null,
  2,
)}
`);

    this.logger.log(
      `📊 Hits retornados: ${response.hits.length}`,
    );

    return (response.hits ??
      []) as SearchItem[];
  }

  // ====================================================
  // SUGGESTIONS
  // ====================================================

  async getSuggestions(
    query: string,
  ): Promise<string[]> {
    const index =
      await this.getOrCreateIndex();

    const response =
      await index.search(query, {
        limit: 10,

        matchingStrategy:
          'last',

        attributesToRetrieve: [
          'titulo',

          'curso',
        ],
      });

    const suggestions =
      new Set<string>();

    for (const hit of response
      .hits as any[]) {
      if (hit.titulo) {
        suggestions.add(
          hit.titulo,
        );
      }

      if (hit.curso) {
        suggestions.add(
          hit.curso,
        );
      }
    }

    return [...suggestions]
      .filter(Boolean)
      .slice(0, 8);
  }

  // ====================================================
  // VECTOR SEARCH
  // ====================================================

  supportsVectorSearch(): boolean {
    return false;
  }

  async searchHybrid(
    query: string,
    embedding?: number[],
  ): Promise<SearchItem[]> {
    return this.search(query);
  }

  async rerankByEmbedding(
    hits: SearchItem[],
    embedding: number[],
  ): Promise<SearchItem[]> {
    return hits;
  }
}