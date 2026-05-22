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
      'pesquisar',
      'pesquise',
      'me',
      'pra',
      'pro',
      'tem',
      'existe',
      'sobre',
      'como',
      'funciona',
      'aprender',
      'estudar',
      'curso',
      'cursos',
      'aula',
      'aulas',
      'video',
      'vídeo',
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
      'conteudo',
      'conteúdo',
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

  // ====================================================
  // NORMALIZE
  // ====================================================

  private normalize(
    value: string,
  ): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
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
    // CLEAN TOKENS
    // ====================================================

    const cleanedTokens =
      (
        processed.tokens ?? []
      ).filter(
        (token) =>
          !this.conversationalStopwords.includes(
            token.toLowerCase(),
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

      ...(processed.categories ?? []),
    ];

    const expandedQuery =
      [
        ...new Set(
          expandedTerms
            .filter(Boolean)
            .map((t) =>
              t.toLowerCase(),
            ),
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

Confidence:
${processed.confidence}

Categories:
${JSON.stringify(
      processed.categories,
    )}

Tokens:
${JSON.stringify(
      cleanedTokens,
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
        '⚠️ Sem resultados na expanded query.',
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

        const titulo =
          this.normalize(
            item.titulo || '',
          );

        const descricao =
          this.normalize(
            item.descricao ||
              item.conteudo ||
              '',
          );

        const curso =
          this.normalize(
            item.curso || '',
          );

        const modulo =
          this.normalize(
            item.modulo || '',
          );

        const categoria =
          this.normalize(
            item.categoria || '',
          );

        const semanticTags = (
          item.semanticTags ?? []
        ).map((t: string) =>
          this.normalize(t),
        );

        const semanticConcepts = (
          item.semanticConcepts ??
          []
        ).map((t: string) =>
          this.normalize(t),
        );

        const semanticCategories = (
          item.semanticCategories ??
          []
        ).map((t: string) =>
          this.normalize(t),
        );

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
          score += 70000;
        }

        if (item.tipo === 'aula') {
          score += 10000;
        }

        // ====================================================
        // EXACT MATCH
        // ====================================================

        for (const token of cleanedTokens) {
          const normalizedToken =
            this.normalize(token);

          if (
            titulo === normalizedToken
          ) {
            score += 100000;
          }

          if (
            titulo.startsWith(
              normalizedToken,
            )
          ) {
            score += 80000;
          }

          if (
            this.exactWordMatch(
              titulo,
              normalizedToken,
            )
          ) {
            score += 85000;
          }

          if (
            this.exactWordMatch(
              searchableText,
              normalizedToken,
            )
          ) {
            score += 50000;
          }

          if (
            this.exactWordMatch(
              descricao,
              normalizedToken,
            )
          ) {
            score += 25000;
          }

          if (
            this.exactWordMatch(
              curso,
              normalizedToken,
            )
          ) {
            score += 70000;
          }

          if (
            this.exactWordMatch(
              categoria,
              normalizedToken,
            )
          ) {
            score += 35000;
          }
        }

        // ====================================================
        // SYNONYM BOOST
        // ====================================================

        for (const synonym of synonyms) {
          const normalized =
            this.normalize(
              synonym,
            );

          if (
            this.exactWordMatch(
              searchableText,
              normalized,
            )
          ) {
            score += 22000;
          }

          if (
            semanticTags.includes(
              normalized,
            )
          ) {
            score += 16000;
          }
        }

        // ====================================================
        // CONCEPT BOOST
        // ====================================================

        for (const concept of concepts) {
          const normalized =
            this.normalize(
              concept,
            );

          if (
            semanticConcepts.includes(
              normalized,
            )
          ) {
            score += 22000;
          }

          if (
            searchableText.includes(
              normalized,
            )
          ) {
            score += 18000;
          }
        }

        // ====================================================
        // RELATED TERMS
        // ====================================================

        for (const related of relatedTerms) {
          const normalized =
            this.normalize(
              related,
            );

          if (
            this.exactWordMatch(
              searchableText,
              normalized,
            )
          ) {
            score += 14000;
          }
        }

        // ====================================================
        // CATEGORY BOOST
        // ====================================================

        for (const category of categories) {
          const normalized =
            this.normalize(
              category,
            );

          if (
            semanticCategories.includes(
              normalized,
            )
          ) {
            score += 35000;
          }

          if (
            categoria.includes(
              normalized,
            )
          ) {
            score += 28000;
          }
        }

        // ====================================================
        // INTENT BOOST
        // ====================================================

        switch (
          processed.intent
        ) {
          case 'buscar_curso':
            if (
              item.tipo === 'curso'
            ) {
              score += 60000;
            }
            break;

          case 'buscar_aula':
            if (
              item.tipo === 'aula'
            ) {
              score += 45000;
            }
            break;

          case 'buscar_trilha':
            if (
              item.tipo === 'curso'
            ) {
              score += 30000;
            }
            break;

          case 'buscar_ia':
            if (
              semanticCategories.includes(
                'ai',
              )
            ) {
              score += 80000;
            }
            break;
        }

        // ====================================================
        // AVALIAÇÃO
        // ====================================================

        if (
          item.avaliacao &&
          item.avaliacao >= 4.5
        ) {
          score += 12000;
        }

        // ====================================================
        // GENERIC PENALTY
        // ====================================================

        const isGenericLesson =
          this.genericLessonTerms.includes(
            titulo,
          );

        if (
          isGenericLesson &&
          item.tipo === 'aula'
        ) {
          score -= 18000;
        }

        // ====================================================
        // EXCLUSIONS
        // ====================================================

        for (const exclusion of exclusions) {
          const normalized =
            this.normalize(
              exclusion,
            );

          if (
            searchableText.includes(
              normalized,
            )
          ) {
            score -= 180000;
          }
        }

        // ====================================================
        // PARTIAL MATCH PENALTY
        // ====================================================

        for (const token of cleanedTokens) {
          const normalized =
            this.normalize(token);

          const tokenRegex =
            new RegExp(
              `\\b${normalized}\\b`,
              'i',
            );

          const partialRegex =
            new RegExp(
              normalized,
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

    return reranked.slice(0, 20);
  }
}