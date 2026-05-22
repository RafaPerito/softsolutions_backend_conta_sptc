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

  async execute(
    dto: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    // ====================================================
    // NLP
    // ====================================================

    const processed =
      await this.queryUnderstandingService.process(
        dto.message,
      );

    // ====================================================
    // SEARCH
    // ====================================================

    const results =
      await this.searchTextUseCase.execute(
        dto.message,
      );

    // ====================================================
    // TOP RESULTS
    // ====================================================

    const topResults =
      results.slice(0, 5);

    // ====================================================
    // CONTEXT
    // ====================================================

    const context = topResults
      .map(
        (item, index) => `
${index + 1}. ${item.titulo}

Descrição:
${item.descricao}

Categoria:
${item.categoria}

Tipo:
${item.tipo}
`,
      )
      .join('\n');

    // ====================================================
    // SUPPORT DETECTION
    // ====================================================

    const requiresHumanSupport =
      processed.confidence < 0.30;

    // ====================================================
    // PROMPT
    // ====================================================

    const prompt = `
Pergunta do usuário:
${dto.message}

Intent detectada:
${processed.intent}

Resultados encontrados:
${context}

Instruções:
- responda naturalmente
- seja amigável
- recomende cursos quando necessário
- explique funcionalidades da plataforma
- utilize os resultados encontrados
- não invente informações
- se necessário, sugira suporte humano
`;

    // ====================================================
    // OPENAI
    // ====================================================

    const response =
      await this.openaiService.generateResponse(
        prompt,
      );

    return {
      response,

      intent: processed.intent,

      confidence:
        processed.confidence,

      suggestions:
        topResults.map(
          (item) => item.titulo,
        ),

      requiresHumanSupport,
    };
  }
}