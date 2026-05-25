import { Injectable } from '@nestjs/common';

import { SearchTextUseCase } from '../search/search-text.use-case';

import { QueryUnderstandingService } from '../../../infrastructure/search/nlp/query-understanding.service';

import { OpenaiService } from '../../../infrastructure/chatbot/openai/openai.service';

import { ChatRequestDto } from '../../../interfaces/http/dtos/requests/chat-request.dto';

import { ChatResponseDto } from '../../../interfaces/http/dtos/responses/chat-response.dto';

@Injectable()
export class ProcessChatUseCase {
  constructor(
    private readonly queryUnderstandingService: QueryUnderstandingService,

    private readonly searchTextUseCase: SearchTextUseCase,

    private readonly openaiService: OpenaiService,
  ) {}

  private buildContext(
    results: any[],
  ): string {
    if (!results.length) {
      return `
Nenhum conteúdo relevante encontrado na plataforma.
`;
    }

    return results
      .map(
        (item, index) => `
# Resultado ${index + 1}

Título:
${item.titulo}

Descrição:
${item.descricao}

Categoria:
${item.categoria}

Tipo:
${item.tipo}

Curso:
${item.curso ?? 'N/A'}

Professor:
${item.professor ?? 'N/A'}
`,
      )
      .join('\n');
  }

  private generateSuggestions(
    results: any[],
  ): string[] {
    return [
      ...new Set(
        results
          .map(
            (item) =>
              item.curso ||
              item.titulo,
          )
          .filter(Boolean),
      ),
    ].slice(0, 5);
  }

  async execute(
    dto: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const processed =
      await this.queryUnderstandingService.process(
        dto.message,
      );

    // ====================================================
    // SMALL TALK
    // ====================================================

    if (
      [
        'saudacao',
        'agradecimento',
        'despedida',
        'conversa',
      ].includes(processed.intent)
    ) {
      const response =
        await this.openaiService.generateSmallTalkResponse(
          dto.message,
          dto.history ?? [],
        );

      return {
        response,

        intent: processed.intent,

        confidence:
          processed.confidence,

        suggestions: [],

        requiresHumanSupport: false,

        relatedCourses: [],

        semanticContext: {
          intent:
            processed.intent,

          categories: [],

          concepts: [],
        },
      };
    }

    // ====================================================
    // SEARCH ENABLED ONLY FOR SEARCH INTENTS
    // ====================================================

    let results: any[] = [];

    const searchableIntents = [
      'buscar_curso',
      'buscar_aula',
      'buscar_trilha',
      'buscar_ia',
    ];

    if (
      searchableIntents.includes(
        processed.intent,
      )
    ) {
      results =
        await this.searchTextUseCase.execute(
          dto.message,
        );
    }

    // ====================================================
    // FILTER SEMANTIC RESULTS
    // ====================================================

    const filteredResults =
      results.filter(
        (item: any) =>
          item.semanticScore ===
            undefined ||
          item.semanticScore > 0,
      );

    const topResults =
      filteredResults.slice(0, 5);

    // ====================================================
    // IA FALLBACK
    // ====================================================

    if (
      processed.intent ===
        'buscar_ia' &&
      !topResults.length
    ) {
      return {
        response: `
No momento, a SoftSolutions ainda não possui cursos específicos de Inteligência Artificial ou Machine Learning.

Atualmente nossa plataforma é focada em desenvolvimento web, backend, frontend e tecnologias modernas de software 😊
`,

        intent: processed.intent,

        confidence:
          processed.confidence,

        suggestions: [],

        requiresHumanSupport: false,

        relatedCourses: [],

        semanticContext: {
          intent:
            processed.intent,

          categories:
            processed.categories ??
            [],

          concepts:
            processed.concepts ??
            [],
        },
      };
    }

    const context =
      this.buildContext(
        topResults,
      );

    const requiresHumanSupport =
      processed.confidence < 0.15 &&
      !topResults.length;

    const response =
      await this.openaiService.generateResponse(
        dto.message,

        context,

        dto.history ?? [],
      );

    return {
      response,

      intent: processed.intent,

      confidence:
        processed.confidence,

      suggestions:
        this.generateSuggestions(
          topResults,
        ),

      requiresHumanSupport,

      relatedCourses:
        this.generateSuggestions(
          topResults,
        ),

      semanticContext: {
        intent:
          processed.intent,

        categories:
          processed.categories ??
          [],

        concepts:
          processed.concepts ??
          [],
      },
    };
  }
}