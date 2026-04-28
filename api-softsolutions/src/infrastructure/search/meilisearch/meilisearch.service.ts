import { Injectable, OnModuleInit } from '@nestjs/common';
import { SearchItem } from '../interfaces/search-item.interface';

@Injectable()
export class MeilisearchService implements OnModuleInit {
  private client: any;
  private index: any;
  private readonly indexUid = 'softsolutions';

  async onModuleInit() {
    const meiliPkg = await new Function(`return import('meilisearch')`)();

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

    this.index = this.client.index(this.indexUid);
    await this.configureIndex();
  }

  private async configureIndex() {
    await this.index.updateSearchableAttributes([
      'titulo',
      'curso',
      'modulo',
      'descricao',
      'categoria',
      'tags',
      'conteudo',
      'professor',
    ]);

    await this.index.updateDisplayedAttributes([
      'id',
      'tipo',
      'cursoId',
      'aulaId',
      'titulo',
      'descricao',
      'categoria',
      'tags',
      'conteudo',
      'professor',
      'status',
      'avaliacao',
      'imagemCurso',
      'tempoCurso',
      'modulo',
      'curso',
      'videoUrl',
      'tempoAula',
    ]);

    await this.index.updateFilterableAttributes([
      'tipo',
      'cursoId',
      'aulaId',
      'categoria',
      'status',
    ]);

    await this.index.updateSortableAttributes([
      'titulo',
      'avaliacao',
      'tempoCurso',
      'tempoAula',
    ]);

    await this.index.updateRankingRules([
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
    ]);

    await this.index.updateSynonyms({
      js: ['javascript'],
      javascript: ['js'],
      frontend: ['front-end', 'front end'],
      backend: ['back-end', 'back end'],
      ia: ['inteligencia artificial', 'inteligência artificial'],
      banco: ['database', 'bd'],
      curso: ['aula', 'treinamento'],
      aula: ['curso', 'lição'],
      reactnative: ['react native', 'react-native'],
      'react native': ['reactnative', 'react-native'],
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
      'um',
      'uma',
      'em',
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
      return await this.index.addDocuments(documents, { primaryKey: 'id' });
    } catch (error) {
      console.error('Erro ao indexar documentos no Meilisearch:', error);
      throw error;
    }
  }
}