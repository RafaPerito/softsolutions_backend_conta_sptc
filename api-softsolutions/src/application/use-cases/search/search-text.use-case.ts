import {
  Injectable,
  Logger,
} from '@nestjs/common';

import { MeilisearchService } from '../../../infrastructure/search/meilisearch/meilisearch.service';

import { SearchItem } from '../../../infrastructure/search/interfaces/search-item.interface';

import { QueryUnderstandingService } from '../../../infrastructure/search/nlp/query-understanding.service';

@Injectable()
export class SearchTextUseCase {
  private readonly logger = new Logger(
    SearchTextUseCase.name,
  );

  private readonly conversationalStopwords =
    [
      'quem',
      'qual',
      'quais',
      'gostaria',
      'quero',
      'mostrar',
      'mostre',
      'procure',
      'buscar',
      'busque',
      'me',
      'existe',
      'tem',
      'voces',
      'voce',
      'de',
      'do',
      'da',
      'dos',
      'das',
      'o',
      'a',
      'os',
      'as',
      'e',
    ];

  private readonly genericLessonTerms =
    [
      'introducao',
      'introdução',
      'conceitos principais',
      'praticas',
      'práticas',
      'exercicios',
      'exercícios',
      'modulo',
      'módulo',
    ];

  constructor(
    private readonly meiliService: MeilisearchService,

    private readonly queryUnderstanding: QueryUnderstandingService,
  ) {}

  // ====================================================
  // EXACT WORD MATCH
  // ====================================================

  private exactWordMatch(
    text: string,
    term: string,
  ): boolean {
    const escaped =
      term.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      );

    const regex = new RegExp(
      `\\b${escaped}\\b`,
      'i',
    );

    return regex.test(text);
  }

  async execute(
    query: string,
  ): Promise<SearchItem[]> {
    if (!query?.trim()) {
      return [];
    }

    this.logger.log(
      `🔎 Busca recebida: "${query}"`,
    );

    const processed =
      await this.queryUnderstanding.process(
        query,
      );

    // ====================================================
    // QUERY CLEANUP
    // ====================================================

    const cleanedTokens =
      (
        processed.tokens ?? []
      ).filter(
        (token) =>
          !this.conversationalStopwords.includes(
            token,
          ),
      );

    // ====================================================
    // EXPANSÃO SEMÂNTICA
    // ====================================================

    const expandedTerms = [
      ...cleanedTokens,

      ...(processed.synonyms ?? []),

      ...(processed.concepts ?? []),

      ...(processed.relatedTerms ?? []),

      ...(processed.boostTerms ?? []),
    ];

    const expandedQuery =
      [
        ...new Set(
          expandedTerms.filter(Boolean),
        ),
      ].join(' ');

    this.logger.log(`
================ QUERY EXPANSION ================

Original:
${query}

Normalized:
${processed.normalizedText}

Expanded:
${expandedQuery}

Intent:
${processed.intent}

Categories:
${JSON.stringify(
      processed.categories,
    )}
`);

    // ====================================================
    // SEARCH STRATEGIES
    // ====================================================

    let hits: SearchItem[] = [];

    // ====================================================
    // STRATEGY 1
    // EXPANDED QUERY
    // ====================================================

    this.logger.log(`
================ SEARCH STRATEGY 1 ================

${expandedQuery}
`);

    if (
      this.meiliService.supportsVectorSearch()
    ) {
      hits =
        await this.meiliService.searchHybrid(
          expandedQuery,

          processed.embedding,
        );
    } else {
      hits =
        await this.meiliService.search(
          expandedQuery,
        );
    }

    // ====================================================
    // STRATEGY 2
    // NORMALIZED QUERY
    // ====================================================

    if (!hits.length) {
      this.logger.warn(
        '⚠️ Expanded query sem resultados. Tentando normalized query...',
      );

      hits =
        await this.meiliService.search(
          processed.normalizedText,
        );
    }

    // ====================================================
    // STRATEGY 3
    // CLEANED TOKENS
    // ====================================================

    if (
      !hits.length &&
      cleanedTokens.length
    ) {
      const tokenQuery =
        cleanedTokens.join(' ');

      this.logger.warn(`
⚠️ Tentando cleaned tokens:

${tokenQuery}
`);

      hits =
        await this.meiliService.search(
          tokenQuery,
        );
    }

    // ====================================================
    // STRATEGY 4
    // TOKEN INDIVIDUAL
    // ====================================================

    if (
      !hits.length &&
      cleanedTokens.length
    ) {
      for (const token of cleanedTokens) {
        this.logger.warn(`
⚠️ Tentando token individual:

${token}
`);

        hits =
          await this.meiliService.search(
            token,
          );

        if (hits.length) {
          break;
        }
      }
    }

    this.logger.log(
      `📊 Hits encontrados: ${hits.length}`,
    );

    if (!hits?.length) {
      return [];
    }

    const exclusions =
      processed.exclusions ?? [];

    const synonyms =
      processed.synonyms ?? [];

    const categories =
      processed.categories ?? [];

    const concepts =
      processed.concepts ?? [];

    const relatedTerms =
      processed.relatedTerms ?? [];

    // ====================================================
    // RERANK
    // ====================================================

    const reranked = hits
      .map((item: any) => {
        let score = 0;

        const titulo = (
          item.titulo || ''
        )
          .toLowerCase()
          .trim();

        const descricao = (
          item.descricao ||
          item.conteudo ||
          ''
        ).toLowerCase();

        const curso = (
          item.curso || ''
        ).toLowerCase();

        const modulo = (
          item.modulo || ''
        ).toLowerCase();

        const categoria = (
          item.categoria || ''
        ).toLowerCase();

        const semanticTags =
          item.semanticTags ?? [];

        const semanticConcepts =
          item.semanticConcepts ?? [];

        const semanticCategories =
          item.semanticCategories ?? [];

        const searchableText = `
${titulo}
${descricao}
${curso}
${modulo}
${categoria}
${semanticTags.join(' ')}
${semanticConcepts.join(' ')}
${semanticCategories.join(' ')}
`
          .toLowerCase()
          .trim();

        // ====================================================
        // ENTITY PRIORITY
        // ====================================================

        if (item.tipo === 'curso') {
          score += 50000;
        }

        if (item.tipo === 'aula') {
          score += 5000;
        }

        // ====================================================
        // EXACT TOKEN MATCH
        // ====================================================

        for (const token of cleanedTokens) {
          // ============================================
          // EXACT TITLE
          // ============================================

          if (
            titulo === token
          ) {
            score += 90000;
          }

          // ============================================
          // TITLE STARTS WITH TOKEN
          // ============================================

          if (
            titulo.startsWith(
              token,
            )
          ) {
            score += 60000;
          }

          // ============================================
          // EXACT TITLE WORD MATCH
          // ============================================

          if (
            this.exactWordMatch(
              titulo,
              token,
            )
          ) {
            score += 75000;
          }

          // ============================================
          // SEARCHABLE TEXT
          // ============================================

          if (
            this.exactWordMatch(
              searchableText,
              token,
            )
          ) {
            score += 50000;
          }

          // ============================================
          // DESCRIPTION
          // ============================================

          if (
            this.exactWordMatch(
              descricao,
              token,
            )
          ) {
            score += 22000;
          }

          // ============================================
          // COURSE NAME
          // ============================================

          if (
            this.exactWordMatch(
              curso,
              token,
            )
          ) {
            score += 65000;
          }

          // ============================================
          // CATEGORY
          // ============================================

          if (
            this.exactWordMatch(
              categoria,
              token,
            )
          ) {
            score += 32000;
          }
        }

        // ====================================================
        // SYNONYM BOOST
        // ====================================================

        for (const synonym of synonyms) {
          if (
            this.exactWordMatch(
              searchableText,
              synonym.toLowerCase(),
            )
          ) {
            score += 18000;
          }

          if (
            semanticTags.includes(
              synonym.toLowerCase(),
            )
          ) {
            score += 14000;
          }
        }

        // ====================================================
        // CONCEPT BOOST
        // ====================================================

        for (const concept of concepts) {
          if (
            semanticConcepts.includes(
              concept,
            )
          ) {
            score += 18000;
          }
        }

        // ====================================================
        // RELATED TERMS BOOST
        // ====================================================

        for (const related of relatedTerms) {
          if (
            this.exactWordMatch(
              searchableText,
              related.toLowerCase(),
            )
          ) {
            score += 10000;
          }
        }

        // ====================================================
        // CATEGORY BOOST
        // ====================================================

        for (const category of categories) {
          if (
            semanticCategories.includes(
              category,
            )
          ) {
            score += 25000;
          }
        }

        // ====================================================
        // INTENT BOOST
        // ====================================================

        if (
          processed.intent ===
          'buscar_curso'
        ) {
          if (item.tipo === 'curso') {
            score += 45000;
          }
        }

        if (
          processed.intent ===
          'buscar_aula'
        ) {
          if (item.tipo === 'aula') {
            score += 30000;
          }
        }

        if (
          processed.intent ===
          'buscar_ia'
        ) {
          if (
            semanticCategories.includes(
              'ai',
            )
          ) {
            score += 60000;
          }
        }

        // ====================================================
        // GENERIC LESSON PENALTY
        // ====================================================

        const normalizedTitle =
          titulo.trim();

        const isGenericLesson =
          this.genericLessonTerms.includes(
            normalizedTitle,
          );

        if (
          isGenericLesson &&
          item.tipo === 'aula'
        ) {
          score -= 12000;
        }

        // ====================================================
        // EXCLUSION PENALTY
        // ====================================================

        for (const exclusion of exclusions) {
          if (
            searchableText.includes(
              exclusion.toLowerCase(),
            )
          ) {
            score -= 150000;
          }
        }

        // ====================================================
        // PARTIAL WORD PENALTY
        // ====================================================

        for (const token of cleanedTokens) {
          const tokenRegex =
            new RegExp(
              `\\b${token}\\b`,
              'i',
            );

          const partialRegex =
            new RegExp(
              token,
              'i',
            );

          const hasExact =
            tokenRegex.test(
              searchableText,
            );

          const hasPartial =
            partialRegex.test(
              searchableText,
            );

          if (
            hasPartial &&
            !hasExact
          ) {
            score -= 90000;
          }
        }

        this.logger.debug(`
================ RERANK DEBUG ================

Título:
${titulo}

Tipo:
${item.tipo}

Categoria:
${categoria}

Score:
${score}
`);

        return {
          ...item,

          semanticScore: score,
        };
      })
      .sort(
        (a, b) =>
          (b.semanticScore ?? 0) -
          (a.semanticScore ?? 0),
      );

    this.logger.log(
      `✅ Resultado reranqueado: ${reranked.length} itens`,
    );

    return reranked;
  }
}