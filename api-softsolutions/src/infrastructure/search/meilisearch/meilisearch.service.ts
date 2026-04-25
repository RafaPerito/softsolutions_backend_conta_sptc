import { Injectable, OnModuleInit } from '@nestjs/common';
import { SearchItem } from '../interfaces/search-item.interface';

@Injectable()
export class MeilisearchService implements OnModuleInit {
  private client: any;
  private index: any;

  async onModuleInit() {
    const meiliPkg = await new Function(
      `return import('meilisearch')`,
    )();

    const MeiliSearchClient =
      meiliPkg.MeiliSearch ||
      meiliPkg.Meilisearch ||
      meiliPkg.default?.MeiliSearch ||
      meiliPkg.default?.Meilisearch ||
      meiliPkg.default;

    this.client = new MeiliSearchClient({
      host: process.env.MEILI_HOST || 'http://127.0.0.1:7700',
      apiKey: process.env.MEILI_API_KEY || undefined,
    });

    this.index = this.client.index('softsolutions');

    await this.configureIndex();
  }

  private async configureIndex() {
    await this.index.updateSearchableAttributes([
      'titulo',
      'descricao',
      'tags',
      'categoria',
      'conteudo',
    ]);

    await this.index.updateSynonyms({
      js: ['javascript'],
      javascript: ['js'],
      frontend: ['front-end', 'front end'],
      backend: ['back-end', 'back end'],
      ia: ['inteligencia artificial', 'inteligência artificial'],
      banco: ['database', 'bd'],
    });

    await this.index.updateStopWords([
      'de',
      'da',
      'do',
      'das',
      'dos',
      'a',
      'o',
      'e',
      'para',
      'com',
    ]);
  }

  async search(query: string): Promise<SearchItem[]> {
    try {
      const result = await this.index.search(query, { limit: 10 });
      return (result.hits as SearchItem[]) || [];
    } catch (error) {
      console.error('Erro ao buscar no Meilisearch:', error);
      return [];
    }
  }

  async addDocuments(documents: SearchItem[]) {
    try {
      return await this.index.addDocuments(documents);
    } catch (error) {
      console.error('Erro ao indexar documentos no Meilisearch:', error);
      throw error;
    }
  }
}