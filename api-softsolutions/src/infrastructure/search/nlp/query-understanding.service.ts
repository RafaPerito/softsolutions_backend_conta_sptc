import {
  Injectable,
  Logger,
} from '@nestjs/common';

import {
  SEMANTIC_KNOWLEDGE,
  AMBIGUOUS_TERMS,
} from './semantic-knowledge.dictionary';

import { IntentClassifierService } from './intent-classifier.service';

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

  matchedTerms?: string[];

  synonyms?: string[];

  concepts?: string[];

  relatedTerms?: string[];

  boostTerms?: string[];

  exclusions?: string[];

  categories?: string[];

  expandedQuery?: string;
}

@Injectable()
export class QueryUnderstandingService {
  private readonly logger =
    new Logger(
      QueryUnderstandingService.name,
    );

  private transformerInitialized =
    false;

  private embeddingPipeline: any;

  constructor(
    private readonly intentClassifier: IntentClassifierService,
  ) {
    this.logger.log(
      '🔥 QueryUnderstandingService instanciado',
    );
  }

  private normalize(
    text: string,
  ): string {
    return (text ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private removeAmbiguousTerms(
    tokens: string[],
  ): string[] {
    const exclusions =
      new Set<string>();

    for (const token of tokens) {
      const ambiguous =
        AMBIGUOUS_TERMS[token];

      if (!ambiguous) {
        continue;
      }

      ambiguous.forEach((a) =>
        exclusions.add(a),
      );
    }

    return tokens.filter(
      (token) =>
        !exclusions.has(token),
    );
  }

  private extractSemanticContext(
    tokens: string[],
  ) {
    const synonyms =
      new Set<string>();

    const concepts =
      new Set<string>();

    const relatedTerms =
      new Set<string>();

    const boostTerms =
      new Set<string>();

    const exclusions =
      new Set<string>();

    const categories =
      new Set<string>();

    for (const token of tokens) {
      const knowledge =
        SEMANTIC_KNOWLEDGE[token];

      if (!knowledge) continue;

      knowledge.synonyms.forEach(
        (s) => synonyms.add(s),
      );

      knowledge.concepts.forEach(
        (c) => concepts.add(c),
      );

      knowledge.relatedTerms.forEach(
        (r) => relatedTerms.add(r),
      );

      knowledge.boostTerms.forEach(
        (b) => boostTerms.add(b),
      );

      knowledge.exclusions?.forEach(
        (e) => exclusions.add(e),
      );

      categories.add(
        knowledge.category,
      );
    }

    return {
      synonyms: [...synonyms],

      concepts: [...concepts],

      relatedTerms: [
        ...relatedTerms,
      ],

      boostTerms: [...boostTerms],

      exclusions: [...exclusions],

      categories: [...categories],
    };
  }

  private async initTransformers() {
    if (
      this.transformerInitialized
    ) {
      return;
    }

    try {
      const tf = await import(
        '@xenova/transformers'
      );

      this.embeddingPipeline =
        await tf.pipeline(
          'feature-extraction',
          'Xenova/all-MiniLM-L6-v2',
        );

      this.transformerInitialized =
        true;
    } catch (error) {
      this.logger.error(
        'Erro Transformers',
      );

      console.error(error);
    }
  }

  async process(
    originalText: string,
  ): Promise<ProcessedQuery> {
    const text = originalText ?? '';

    const normalizedText =
      this.normalize(text);

    const classification =
      this.intentClassifier.classify(
        normalizedText,
      );

    const tokens = normalizedText
      .split(/\s+/)
      .filter(Boolean);

    const cleanedTokens =
      this.removeAmbiguousTerms(
        tokens,
      );

    const semanticContext =
      this.extractSemanticContext(
        cleanedTokens,
      );

    const expandedQuery = [
      normalizedText,
      ...semanticContext.synonyms,
      ...semanticContext.concepts,
      ...semanticContext.relatedTerms,
      ...semanticContext.boostTerms,
    ]
      .join(' ')
      .trim();

    await this.initTransformers();

    let embedding:
      | number[]
      | undefined;

    try {
      const tensor =
        await this.embeddingPipeline(
          expandedQuery,
          {
            pooling: 'mean',
            normalize: true,
          },
        );

      if (tensor?.data) {
        embedding = Array.from(
          tensor.data,
        );
      }
    } catch (error) {
      this.logger.error(
        'Erro embedding',
      );

      console.error(error);
    }

    return {
      originalText: text,

      normalizedText,

      intent:
        classification.intent,

      confidence:
        classification.confidence,

      embedding,

      tokens: cleanedTokens,

      filteredTokens:
        classification.filteredTokens,

      stems:
        classification.stems,

      rankings:
        classification.rankings,

      matchedTerms: [
        ...cleanedTokens,
        ...semanticContext.synonyms,
        ...semanticContext.concepts,
      ],

      synonyms:
        semanticContext.synonyms,

      concepts:
        semanticContext.concepts,

      relatedTerms:
        semanticContext.relatedTerms,

      boostTerms:
        semanticContext.boostTerms,

      exclusions:
        semanticContext.exclusions,

      categories:
        semanticContext.categories,

      expandedQuery,
    };
  }
}