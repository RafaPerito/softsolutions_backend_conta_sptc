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

  // ====================================================
  // NORMALIZATION
  // ====================================================

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

  // ====================================================
  // TOKENIZE
  // ====================================================

  private tokenize(
    text: string,
  ): string[] {
    return text
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  // ====================================================
  // REMOVE AMBIGUOUS TERMS
  // ====================================================

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
        exclusions.add(
          this.normalize(a),
        ),
      );
    }

    return tokens.filter(
      (token) =>
        !exclusions.has(
          this.normalize(token),
        ),
    );
  }

  // ====================================================
  // SEMANTIC CONTEXT
  // ====================================================

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
        SEMANTIC_KNOWLEDGE[
          token
        ];

      if (!knowledge) {
        continue;
      }

      knowledge.synonyms.forEach(
        (s) =>
          synonyms.add(
            this.normalize(s),
          ),
      );

      knowledge.concepts.forEach(
        (c) =>
          concepts.add(
            this.normalize(c),
          ),
      );

      knowledge.relatedTerms.forEach(
        (r) =>
          relatedTerms.add(
            this.normalize(r),
          ),
      );

      knowledge.boostTerms.forEach(
        (b) =>
          boostTerms.add(
            this.normalize(b),
          ),
      );

      knowledge.exclusions?.forEach(
        (e) =>
          exclusions.add(
            this.normalize(e),
          ),
      );

      categories.add(
        this.normalize(
          knowledge.category,
        ),
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

  // ====================================================
  // QUERY EXPANSION
  // ====================================================

  private buildExpandedQuery(
    normalizedText: string,
    semanticContext: any,
  ): string {
    return [
      normalizedText,

      ...semanticContext.synonyms,

      ...semanticContext.concepts,

      ...semanticContext.relatedTerms,

      ...semanticContext.boostTerms,

      ...semanticContext.categories,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  // ====================================================
  // EMBEDDINGS
  // ====================================================

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

      this.logger.log(
        '✅ Transformers inicializado',
      );
    } catch (error) {
      this.logger.error(
        '❌ Erro ao inicializar transformers',
      );

      console.error(error);
    }
  }

  // ====================================================
  // PROCESS
  // ====================================================

  async process(
    originalText: string,
  ): Promise<ProcessedQuery> {
    const text =
      originalText ?? '';

    const normalizedText =
      this.normalize(text);

    // ====================================================
    // NLP CLASSIFICATION
    // ====================================================

    const classification =
      this.intentClassifier.classify(
        normalizedText,
      );

    // ====================================================
    // TOKENS
    // ====================================================

    const rawTokens =
      this.tokenize(
        normalizedText,
      );

    const cleanedTokens =
      this.removeAmbiguousTerms(
        rawTokens,
      );

    // ====================================================
    // SEMANTIC CONTEXT
    // ====================================================

    const semanticContext =
      this.extractSemanticContext(
        cleanedTokens,
      );

    // ====================================================
    // EXPANDED QUERY
    // ====================================================

    const expandedQuery =
      this.buildExpandedQuery(
        normalizedText,
        semanticContext,
      );

    // ====================================================
    // EMBEDDING
    // ====================================================

    await this.initTransformers();

    let embedding:
      | number[]
      | undefined;

    try {
      if (
        this.embeddingPipeline
      ) {
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
      }
    } catch (error) {
      this.logger.error(
        '❌ Erro embedding',
      );

      console.error(error);
    }

    // ====================================================
    // MATCHED TERMS
    // ====================================================

    const matchedTerms = [
      ...cleanedTokens,

      ...semanticContext.synonyms,

      ...semanticContext.concepts,

      ...semanticContext.relatedTerms,

      ...semanticContext.boostTerms,
    ];

    // ====================================================
    // DEBUG
    // ====================================================

    this.logger.log(`
================ QUERY UNDERSTANDING ================

ORIGINAL:
${originalText}

NORMALIZED:
${normalizedText}

INTENT:
${classification.intent}

CONFIDENCE:
${classification.confidence}

TOKENS:
${JSON.stringify(
      rawTokens,
    )}

CLEANED TOKENS:
${JSON.stringify(
      cleanedTokens,
    )}

FILTERED TOKENS:
${JSON.stringify(
      classification.filteredTokens,
    )}

SYNONYMS:
${JSON.stringify(
      semanticContext.synonyms,
    )}

CONCEPTS:
${JSON.stringify(
      semanticContext.concepts,
    )}

RELATED TERMS:
${JSON.stringify(
      semanticContext.relatedTerms,
    )}

BOOST TERMS:
${JSON.stringify(
      semanticContext.boostTerms,
    )}

CATEGORIES:
${JSON.stringify(
      semanticContext.categories,
    )}

EXPANDED QUERY:
${expandedQuery}
`);

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

      matchedTerms,

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