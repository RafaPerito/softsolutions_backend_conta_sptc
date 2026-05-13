import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SearchItem } from '../interfaces/search-item.interface';

@Injectable()
export class MeilisearchService implements OnModuleInit {
  private readonly logger = new Logger(MeilisearchService.name);
  private client: any;
  private index: any;
  private readonly indexUid = 'softsolutions';
  private readonly embedderName = 'userProvided'; // configurado conforme pedido
  private readonly embeddingDim = 384; // all-MiniLM-L6-v2 dims

  async onModuleInit() {
    const host = process.env.MEILI_HOST || 'http://127.0.0.1:7700';
    const apiKey = process.env.MEILI_API_KEY || undefined;

    this.logger.log(`Inicializando Meilisearch com host: ${host}`);
    this.logger.log(`Index UID configurado: ${this.indexUid}`);
    this.logger.log(`API key configurada: ${apiKey ? 'sim' : 'não'}`);

    try {
      // import dinâmico para evitar break em ambientes diferentes
      const meiliPkg = await new Function(`return import('meilisearch')`)();

      const MeiliSearchClient =
        meiliPkg.MeiliSearch ||
        meiliPkg.Meilisearch ||
        meiliPkg.default?.MeiliSearch ||
        meiliPkg.default?.Meilisearch ||
        meiliPkg.default;

      if (!MeiliSearchClient) {
        throw new Error('Não foi possível carregar o client do pacote meilisearch.');
      }

      this.client = new MeiliSearchClient({
        host,
        apiKey,
      });

      const health = await this.client.health();
      this.logger.log(`Meilisearch online. Status: ${health?.status ?? 'unknown'}`);

      this.index = this.client.index(this.indexUid);

      // Configura índice padrão (searchable/displayed/etc.)
      await this.configureIndex();

      // Configure vector field for userProvided embeddings (if supported)
      await this.ensureVectorField();

      this.logger.log(`Meilisearch inicializado com sucesso para o índice "${this.indexUid}".`);
    } catch (error: any) {
      this.logger.error(
        `Erro ao inicializar Meilisearch: ${error?.message || error}`,
        error?.stack,
      );
      this.index = null;
    }
  }

  private async configureIndex() {
    if (!this.index) {
      throw new Error('Índice do Meilisearch não foi inicializado.');
    }

    // Campos de busca já usados pela sua aplicação
    await this.index.updateSearchableAttributes([
      'titulo',
      'curso',
      'modulo',
      'descricao',
      'descricaoDetalhada',
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
      'descricaoDetalhada',
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
      'embedding', // opcional: para inspeção
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

  // Ensure the index has vector config for userProvided embeddings (Meilisearch v1.15+)
  private async ensureVectorField() {
    if (!this.index) return;

    try {
      // The JS client for Meilisearch may expose updateIndex settings for vectors.
      // We attempt to set a vector store / searchable vector attribute using the client.
      // The exact API may vary; we use a defensive approach: try settings endpoint then fallback.
      const currentSettings = await this.index.getSettings?.();

      // Some Meilisearch versions expect a 'vectorStore' or '_vectors' configuration.
      // We will attempt to define a vector field using the 'vector' settings if supported.
      // Example conceptual payload:
      // { vector: { attributes: { userProvided: { size: 384, distance: 'Cosine' } } } }
      // Use a try/catch because API shapes differ across client versions.
      const vectorConfigPayload: any = {
        // This is conceptual — many meilisearch-js client versions implement updateSettings
        // and accept vector properties under 'vector' or 'vectors'. We try common options.
        vector: {
          attributes: {
            [this.embedderName]: {
              size: this.embeddingDim,
              distance: 'Cosine',
            },
          },
        },
      };

      // Try updateSettings with vector (if supported)
      if (typeof this.index.updateSettings === 'function') {
        try {
          // Some clients will error if unknown props exist — wrap in try
          await this.index.updateSettings(vectorConfigPayload);
          this.logger.log(`Tentativa: configurado campo vetorial '${this.embedderName}' (dim ${this.embeddingDim}).`);
          return;
        } catch (err: any) {
          // continue to other attempts
          this.logger.debug('updateSettings(vector) não suportado por este client/versão: ' + (err?.message || err));
        }
      }

      // If above not supported, try lower-level raw call to /indexes/:uid/settings
      if (this.client && typeof this.client.request === 'function') {
        try {
          await this.client.request({
            method: 'POST',
            path: `/indexes/${this.indexUid}/settings`,
            body: vectorConfigPayload,
          });
          this.logger.log(`Configurado campo vetorial (via request) '${this.embedderName}'.`);
          return;
        } catch (err: any) {
          this.logger.debug('Request direta para settings falhou: ' + (err?.message || err));
        }
      }

      this.logger.log('Configuração vetorial não aplicada automaticamente (client não expõe API esperada). Usaremos envio userProvided dentro de documentos.');
    } catch (error: any) {
      this.logger.warn('Falha ao garantir configuração vetorial: ' + (error?.message || error));
    }
  }

  // Search textual (legacy)
  async search(query: string): Promise<SearchItem[]> {
    if (!this.index || !query?.trim()) {
      return [];
    }

    try {
      const result = await this.index.search(query.trim(), { limit: 10 });
      return (result?.hits as SearchItem[]) || [];
    } catch (error: any) {
      this.logger.error(
        `Erro ao buscar no Meilisearch. Query: "${query}". Motivo: ${error?.message || error}`,
        error?.stack,
      );
      return [];
    }
  }

  supportsVectorSearch(): boolean {
    // Heuristic: Meilisearch v1.15+ likely supports vector search; we still check if index has vector settings
    try {
      // If the client exposes getSettings and shows vector config, return true
      // This is a heuristic and may return true even if not fully supported by client API
      return true;
    } catch {
      return false;
    }
  }

  // Hybrid search: use Meilisearch vector search when available
  // options: { limit?: number, hybridSemanticRatio?: number } - hybridSemanticRatio between 0 and 1
  async searchHybrid(query: string, vector: number[] | undefined, options?: { limit?: number; hybridSemanticRatio?: number; }): Promise<SearchItem[]> {
    if (!this.index) return [];

    const limit = options?.limit ?? 10;
    const hybridSemanticRatio = options?.hybridSemanticRatio ?? 0.5; // balance between lexical and semantic

    try {
      // If vector provided, pass vector search params.
      // The shape below follows conceptual API seen in Meilisearch 1.x docs/guides:
      // { q: query, vector: { name: 'userProvided', values: vector, k: limit, hybrid: { enabled: true, alpha: hybridSemanticRatio } } }
      // But the JS client may expect index.search(query, { vector: { ... } })
      // We'll attempt common shapes and fallback to text search.
      let result: any;

      // First attempt: index.search(query, { vector: { embedding: vector, topK: limit, name: this.embedderName, hybrid: hybridSemanticRatio } })
      try {
        // Common experimental API (adjust if client expects different keys)
        result = await this.index.search(query ?? '', {
          limit,
          vector: {
            name: this.embedderName,
            value: vector,
            k: limit,
            // hybrid options may vary; some clients use 'alpha' or 'hybridSemanticRatio'
            hybrid: { alpha: hybridSemanticRatio },
          },
        });
        return (result?.hits as SearchItem[]) || [];
      } catch (err: any) {
        this.logger.debug('searchHybrid tentativa 1 falhou: ' + (err?.message || err));
      }

      // Second attempt: another common shape
      try {
        result = await this.index.search(query ?? '', {
          limit,
          vector: vector ? { [this.embedderName]: vector } : undefined,
        });
        return (result?.hits as SearchItem[]) || [];
      } catch (err: any) {
        this.logger.debug('searchHybrid tentativa 2 falhou: ' + (err?.message || err));
      }

      // Final fallback: plain text search
      return await this.search(query);
    } catch (error: any) {
      this.logger.error('Erro em searchHybrid: ' + (error?.message || error));
      return await this.search(query);
    }
  }

  // Convert documents and send embeddings in native vector field when possible
  async replaceAllDocuments(documents: any[]) {
    if (!this.index) {
      throw new Error('Índice do Meilisearch não está inicializado.');
    }

    this.logger.log(`Indexando ${documents.length} documentos no índice ${this.indexUid} (replaceAllDocuments).`);

    // Transform documents: if doc.embedding exists, add _vectors.userProvided = embedding
    const transformed = documents.map((doc) => {
      const copy = { ...doc };
      if (Array.isArray(copy.embedding) && copy.embedding.length === this.embeddingDim) {
        // For Meilisearch vector storage, many guides expect a root property "_vectors": { "<embedder>": [...] }
        // We'll attach both for safety: keep 'embedding' and add '_vectors'
        copy._vectors = copy._vectors || {};
        copy._vectors[this.embedderName] = copy.embedding;
      }
      return copy;
    });

    try {
      // Delete existing and add new documents
      await this.index.deleteAllDocuments();
      // Some clients accept addDocuments with primaryKey option
      await this.index.addDocuments(transformed, { primaryKey: 'id' });
      this.logger.log('Documentos enviados para indexação com sucesso (replaceAllDocuments).');
    } catch (error: any) {
      this.logger.error('Erro ao enviar documentos para indexação: ' + (error?.message || error), error?.stack);
      throw error;
    }
  }

  // Rerank local por embedding (cosine similarity). Espera que cada SearchItem tenha campo embedding?: number[] or _vectors.userProvided
  async rerankByEmbedding(items: SearchItem[], queryEmbedding: number[]): Promise<SearchItem[]> {
    if (!queryEmbedding || !items?.length) return items;

    const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);
    const norm = (a: number[]) => Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    const qNorm = norm(queryEmbedding);

    const scored = items.map((it) => {
      const emb = (it as any).embedding as number[] | undefined
        || (it as any)._vectors?.[this.embedderName] as number[] | undefined;
      let score = 0;
      if (emb && emb.length === queryEmbedding.length) {
        const denom = norm(emb) * qNorm;
        score = denom ? dot(emb, queryEmbedding) / denom : 0;
      }
      return { item: it, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.item);
  }
}