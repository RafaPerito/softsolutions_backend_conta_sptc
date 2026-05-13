import { Injectable, Logger } from '@nestjs/common';

interface ProcessedQuery {
  originalText: string;
  normalizedText: string;

  intent: string;
  confidence: number;

  embedding?: number[];

  tokens?: string[];
  filteredTokens?: string[];
  stems?: string[];

  rankings?: {
    label: string;
    value: number;
  }[];

  finalQuery?: string;

  querySource?: 'filteredTokens' | 'normalizedText';

  matchedTerms?: string[];
}

@Injectable()
export class QueryUnderstandingService {
  private readonly logger = new Logger(
    QueryUnderstandingService.name,
  );

  private transformerInitialized = false;

  private embeddingPipeline: any;

  constructor() {
    this.logger.log(
      '🔥 QueryUnderstandingService instanciado',
    );
  }

  private normalize(text: string): string {
    return (text ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async initTransformers() {
    if (this.transformerInitialized) {
      return;
    }

    this.logger.log(
      '🚀 Inicializando Transformers.js...',
    );

    try {
      const tf = await import('@xenova/transformers');

      this.logger.log(
        '📦 Carregando embedding pipeline...',
      );

      this.embeddingPipeline = await tf.pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
      );

      this.transformerInitialized = true;

      this.logger.log(
        '✅ Embedding pipeline carregado com sucesso.',
      );
    } catch (error: any) {
      this.logger.error(
        '❌ Erro ao inicializar Transformers.js',
      );

      console.error(error);

      throw error;
    }
  }

  async process(
    originalText: string,
  ): Promise<ProcessedQuery> {
    const text = originalText ?? '';

    const normalizedText = this.normalize(text);

    if (!normalizedText) {
      return {
        originalText: text,
        normalizedText,

        intent: 'desconhecida',
        confidence: 0,

        tokens: [],
        filteredTokens: [],
        stems: [],

        rankings: [],

        finalQuery: '',

        querySource: 'normalizedText',

        matchedTerms: [],
      };
    }

    await this.initTransformers();

    let embedding: number[] | undefined;

    try {
      this.logger.log(
        `🧠 Gerando embedding para: "${normalizedText.slice(0, 80)}"`,
      );

      const tensor = await this.embeddingPipeline(
        normalizedText,
        {
          pooling: 'mean',
          normalize: true,
          quantize: false,
        },
      );

      if (tensor?.data) {
        embedding = Array.from(tensor.data);
      }

      if (embedding && embedding.length > 0) {
        this.logger.log(
          `✅ Embedding gerado com ${embedding.length} dimensões.`,
        );
      } else {
        this.logger.warn(
          '⚠️ Embedding vazio ou inválido.',
        );
      }
    } catch (error: any) {
      this.logger.error(
        '❌ Falha ao gerar embedding',
      );

      console.error(error);
    }

    const tokens = normalizedText
      .split(/\s+/)
      .filter(Boolean);

    return {
      originalText: text,
      normalizedText,

      intent: 'embedding_generated',

      confidence: embedding ? 1 : 0,

      embedding,

      tokens,
      filteredTokens: tokens,
      stems: tokens,

      rankings: [],

      finalQuery: normalizedText,

      querySource: 'normalizedText',

      matchedTerms: tokens,
    };
  }
}