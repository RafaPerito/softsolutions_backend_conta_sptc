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

  // ====================================================
  // SMALL TALK TERMS
  // ====================================================

  private readonly smallTalkTerms =
    [
      'oi',
      'ola',
      'olá',
      'bom dia',
      'boa tarde',
      'boa noite',
      'tudo bem',
      'obrigado',
      'valeu',
      'até mais',
      'ate mais',
      'kkk',
      'rs',
      'blz',
      'eae',
      'opa',
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

  // ====================================================
  // SMALL TALK DETECTION
  // ====================================================

  private isSmallTalk(
    query: string,
  ): boolean {
    const normalized =
      this.normalize(query);

    return this.smallTalkTerms.includes(
      normalized,
    );
  }

  // ====================================================
  // CLEAN SEMANTIC NOISE
  // ====================================================

  private removeSemanticNoise(
    items: SearchItem[],
    processed: any,
  ): SearchItem[] {
    const categories =
      (
        processed.categories ??
        []
      ).map((c: string) =>
        this.normalize(c),
      );

    // ====================================================
    // IF USER ASKED BACKEND
    // REMOVE FRONTEND RESULTS
    // ====================================================

    if (
      categories.includes(
        'backend',
      )
    ) {
      items = items.filter(
        (item: any) => {
          const category =
            this.normalize(
              item.categoria ||
                '',
            );

          return (
            !category.includes(
              'frontend',
            )
          );
        },
      );
    }

    // ====================================================
    // IF USER ASKED FRONTEND
    // REMOVE BACKEND RESULTS
    // ====================================================

    if (
      categories.includes(
        'frontend',
      )
    ) {
      items = items.filter(
        (item: any) => {
          const category =
            this.normalize(
              item.categoria ||
                '',
            );

          return (
            !category.includes(
              'backend',
            )
          );
        },
      );
    }

    return items;
  }

  async execute(
    query: string,
  ): Promise<SearchItem[]> {
    if (!query?.trim()) {
      return [];
    }

    // ====================================================
    // SMALL TALK
    // ====================================================

    if (
      this.isSmallTalk(query)
    ) {
      this.logger.log(
        '💬 Small talk detectado. Ignorando busca.',
      );

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
    // IF NO TOKENS
    // ====================================================

    if (
      !cleanedTokens.length
    ) {
      this.logger.warn(
        '⚠️ Nenhum token relevante encontrado.',
      );

      return [];
    }

    // ====================================================
    // CONTROLLED EXPANSION
    // ====================================================

    const expandedTerms = [
      ...cleanedTokens,

      ...(processed.synonyms ??
        []).slice(0, 4),

      ...(processed.concepts ??
        []).slice(0, 3),

      ...(processed.boostTerms ??
        []).slice(0, 3),

      ...(processed.categories ??
        []).slice(0, 2),
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
    // SEARCH
    // ====================================================

    let hits: SearchItem[] = [];

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
    // FALLBACK
    // ====================================================

    if (!hits.length) {
      hits =
        await this.meiliService.search(
          cleanedTokens.join(
            ' ',
          ),
        );
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

        const searchableText = `
${titulo}
${descricao}
${curso}
${modulo}
${categoria}
`
          .toLowerCase()
          .trim();

        // ====================================================
        // PRIORIDADE CURSO
        // ====================================================

        if (item.tipo === 'curso') {
          score += 100000;
        }

        if (item.tipo === 'aula') {
          score += 12000;
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
            score += 90000;
          }

          if (
            titulo.startsWith(
              normalizedToken,
            )
          ) {
            score += 70000;
          }

          if (
            this.exactWordMatch(
              titulo,
              normalizedToken,
            )
          ) {
            score += 65000;
          }

          if (
            this.exactWordMatch(
              curso,
              normalizedToken,
            )
          ) {
            score += 50000;
          }

          if (
            this.exactWordMatch(
              categoria,
              normalizedToken,
            )
          ) {
            score += 30000;
          }

          if (
            this.exactWordMatch(
              descricao,
              normalizedToken,
            )
          ) {
            score += 18000;
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
            categoria.includes(
              normalized,
            )
          ) {
            score += 25000;
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
            searchableText.includes(
              normalized,
            )
          ) {
            score += 12000;
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
            searchableText.includes(
              normalized,
            )
          ) {
            score += 10000;
          }
        }

        // ====================================================
        // IA BOOST
        // ====================================================

        if (
          processed.intent ===
          'buscar_ia'
        ) {
          if (
            searchableText.includes(
              'python',
            )
          ) {
            score += 15000;
          }

          if (
            searchableText.includes(
              'dados',
            )
          ) {
            score += 8000;
          }
        }

        // ====================================================
        // HIGH RATED
        // ====================================================

        if (
          item.avaliacao &&
          item.avaliacao >= 4.5
        ) {
          score += 10000;
        }

        // ====================================================
        // GENERIC LESSON PENALTY
        // ====================================================

        const isGenericLesson =
          this.genericLessonTerms.some(
            (term) =>
              titulo.includes(
                this.normalize(term),
              ),
          );

        if (
          isGenericLesson &&
          item.tipo === 'aula'
        ) {
          score -= 25000;
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
            score -= 150000;
          }
        }

        return {
          ...item,

          semanticScore: score,
        };
      })
      .filter(
        (item) =>
          item.semanticScore > 0,
      )
      .sort(
        (a, b) =>
          (b.semanticScore ?? 0) -
          (a.semanticScore ?? 0),
      );

    // ====================================================
    // REMOVE SEMANTIC NOISE
    // ====================================================

    const filteredResults =
      this.removeSemanticNoise(
        reranked,
        processed,
      );

    this.logger.log(
      `✅ Resultado reranqueado: ${filteredResults.length} itens`,
    );

    return filteredResults.slice(
      0,
      5,
    );
  }
}