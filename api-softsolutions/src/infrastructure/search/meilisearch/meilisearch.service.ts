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
  // CONFIGURAÇÃO DO ÍNDICE
  // ====================================================

  async configureIndex(): Promise<void> {
    const index =
      await this.getOrCreateIndex();

    this.logger.log(
      '⚙️ Configurando índice...',
    );

    // ============================================
    // SEARCHABLE ATTRIBUTES
    // ============================================

    await this.client.waitForTask(
      (
        await index.updateSearchableAttributes(
          [
            'searchText',

            'titulo',

            'descricao',

            'descricaoDetalhada',

            'conteudo',

            'curso',

            'modulo',

            'professor',

            'categoria',

            'tipo',

            'semanticTags',

            'semanticConcepts',

            'semanticCategories',
          ],
        )
      ).taskUid,
    );

    // ============================================
    // FILTERABLE ATTRIBUTES
    // ============================================

    await this.client.waitForTask(
      (
        await index.updateFilterableAttributes(
          [
            'tipo',

            'categoria',

            'professor',

            'semanticCategories',
          ],
        )
      ).taskUid,
    );

    // ============================================
    // SORTABLE ATTRIBUTES
    // ============================================

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

    // ============================================
    // RANKING RULES
    // ============================================

    await this.client.waitForTask(
      (
        await index.updateRankingRules([
          'exactness',

          'words',

          'proximity',

          'attribute',

          'typo',

          'sort',
        ])
      ).taskUid,
    );

    this.logger.log(
      '✅ Índice configurado.',
    );
  }

  // ====================================================
  // REINDEXAÇÃO
  // ====================================================

  async replaceAllDocuments(
    documents: any[],
  ): Promise<void> {
    const index =
      await this.getOrCreateIndex();

    this.logger.log(
      '⚙️ Configurando índice...',
    );

    await this.configureIndex();

    this.logger.log(`
================ DOCUMENTS DEBUG ================

TOTAL DOCUMENTS:
${documents.length}
`);

    // ====================================================
    // UPSERT REAL (SEM DUPLICAÇÃO)
    // ====================================================

    this.logger.log(
      '📦 Atualizando documentos...',
    );

    const task =
      await index.updateDocuments(
        documents,
      );

    const result =
      await this.client.waitForTask(
        task.taskUid,
      );

    this.logger.log(`
================ UPDATE TASK RESULT ================

${JSON.stringify(
  result,
  null,
  2,
)}
`);

    // ====================================================
    // VALIDAÇÃO
    // ====================================================

    if (
      result.status !==
      'succeeded'
    ) {
      this.logger.error(
        '❌ Falha ao indexar documentos.',
      );

      throw new Error(
        JSON.stringify(result),
      );
    }

    // ====================================================
    // STATS
    // ====================================================

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
  // DELETE ALL DOCUMENTS
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
  // BUSCA TEXTUAL
  // ====================================================

  async search(
    query: string,
  ): Promise<SearchItem[]> {
    const index =
      await this.getOrCreateIndex();

    this.logger.log(
      `🔎 Executando busca: "${query}"`,
    );

    const response =
      await index.search(query, {
        limit: 20,

        showRankingScore: true,

        attributesToHighlight: [
          'titulo',

          'descricao',

          'curso',

          'modulo',

          'professor',
        ],
      });

    this.logger.log(`
================ RAW MEILI RESPONSE ================

${JSON.stringify(
  response.hits,
  null,
  2,
)}
`);

    this.logger.log(
      `📊 Hits retornados pelo Meili: ${response.hits.length}`,
    );

    return (response.hits ??
      []) as SearchItem[];
  }

  // ====================================================
  // AUTOCOMPLETE / SUGGESTIONS
  // ====================================================

  async getSuggestions(
    query: string,
  ): Promise<string[]> {
    const index =
      await this.getOrCreateIndex();

    const response =
      await index.search(query, {
        limit: 8,

        attributesToRetrieve: [
          'titulo',

          'curso',

          'categoria',
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

      if (hit.categoria) {
        suggestions.add(
          hit.categoria,
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