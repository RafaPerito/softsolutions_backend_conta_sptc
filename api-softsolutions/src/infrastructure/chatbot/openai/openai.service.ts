import {
  Injectable,
  Logger,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import OpenAI from 'openai';

@Injectable()
export class OpenaiService {
  private readonly logger =
    new Logger(OpenaiService.name);

  private readonly client: OpenAI;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.client = new OpenAI({
      apiKey:
        this.configService.get<string>(
          'OPENAI_API_KEY',
        ),
    });
  }

  // ====================================================
  // DEFAULT RESPONSE
  // ====================================================

  async generateResponse(
    userMessage: string,

    context: string,

    conversationHistory: Array<{
      role: string;
      content: string;
    }> = [],

    navigationContext?: any,
  ): Promise<string> {
    try {
      const hasRelevantContext =
        !context.includes(
          'Nenhum conteúdo relevante encontrado',
        );

      const messages: any[] = [
        {
          role: 'system',

          content: `
Você é o assistente oficial da plataforma educacional SoftSolutions.

IDENTIDADE:
- você ajuda usuários da plataforma;
- você recomenda cursos reais da plataforma;
- você responde dúvidas educacionais;
- você ajuda usuários a navegar pelo site;
- você conversa naturalmente;
- você NÃO é um vendedor insistente.

COMPORTAMENTO:
- seja natural;
- seja humano;
- seja amigável;
- mantenha contexto da conversa;
- utilize emojis moderadamente;
- respostas curtas ou médias;
- não repita cursos sem necessidade;
- não force recomendações;
- não transforme toda conversa em marketing.

REGRAS IMPORTANTES:
- utilize SOMENTE o contexto fornecido;
- nunca invente cursos;
- nunca invente tecnologias disponíveis;
- nunca invente trilhas;
- nunca diga que "não possui informações" se existir contexto de navegação;
- se existir navegação da plataforma, explique naturalmente como acessar;
- não recomende frontend quando o usuário pedir backend;
- não recomende backend quando o usuário pedir frontend;
- se o usuário apenas cumprimentar, converse normalmente;
- se o usuário perguntar algo casual, responda casualmente;
- só recomende cursos quando fizer sentido.

QUANDO EXISTIR CONTEXTO RELEVANTE:
- cite os cursos encontrados;
- explique rapidamente o motivo da recomendação;
- mantenha resposta objetiva;
- evite listar cursos demais.

QUANDO EXISTIR NAVEGAÇÃO:
- explique naturalmente onde o usuário deve clicar;
- considere que a funcionalidade existe na plataforma;
- ajude o usuário a encontrar a área correta;
- seja útil e contextual;
- nunca responda que não sabe onde fica.

QUANDO NÃO EXISTIR CONTEXTO:
- seja transparente;
- diga que atualmente não há conteúdos específicos;
- ofereça ajuda relacionada SEM inventar conteúdos.

FORMATO:
- linguagem humana;
- boa legibilidade;
- respostas modernas;
- sem exageros;
- sem parecer robótico.
`,
        },
      ];

      // ====================================================
      // HISTORY
      // ====================================================

      for (const item of conversationHistory.slice(
        -10,
      )) {
        messages.push({
          role: item.role,

          content:
            item.content,
        });
      }

      // ====================================================
      // NAVIGATION CONTEXT
      // ====================================================

      const navigationInstructions =
        navigationContext
          ? `
NAVEGAÇÃO DETECTADA:

O usuário provavelmente deseja acessar uma funcionalidade da plataforma.

INFORMAÇÕES DE NAVEGAÇÃO:
${JSON.stringify(
  navigationContext.navigation,
  null,
  2,
)}

IMPORTANTE:
- responda naturalmente;
- explique ao usuário como acessar;
- NÃO diga que não possui informações;
- considere que a plataforma POSSUI essa funcionalidade;
- seja útil e contextual;
- mantenha tom humano.
`
          : '';

      // ====================================================
      // CURRENT QUESTION
      // ====================================================

      messages.push({
        role: 'user',

        content: `
Pergunta atual:
${userMessage}

Contexto encontrado:
${context}

${navigationInstructions}

EXISTE CONTEXTO RELEVANTE?
${
  hasRelevantContext
    ? 'SIM'
    : 'NAO'
}

INSTRUÇÕES:
- utilize apenas o contexto encontrado;
- mantenha continuidade natural da conversa;
- recomende cursos SOMENTE se forem relevantes;
- se existir navegação, explique naturalmente;
- não invente informações;
- não force recomendações;
- respostas simples devem ser simples.
`,
      });

      const completion =
        await this.client.chat.completions.create(
          {
            model: 'gpt-4.1-mini',

            temperature: 0.45,

            max_tokens: 450,

            messages,
          },
        );

      return (
        completion.choices[0]?.message
          ?.content ??
        'Não consegui responder sua dúvida.'
      );
    } catch (error) {
      this.logger.error(
        'Erro OpenAI',
      );

      console.error(error);

      return 'Ocorreu um erro ao processar sua solicitação.';
    }
  }

  // ====================================================
  // SMALL TALK
  // ====================================================

  async generateSmallTalkResponse(
    userMessage: string,

    conversationHistory: Array<{
      role: string;
      content: string;
    }> = [],
  ): Promise<string> {
    try {
      const messages: any[] = [
        {
          role: 'system',

          content: `
Você é o assistente oficial da SoftSolutions.

COMPORTAMENTO:
- responda naturalmente;
- seja amigável;
- respostas curtas;
- tom humano;
- conversa casual;
- utilize emojis moderadamente;
- NÃO recomende cursos;
- NÃO venda nada;
- NÃO invente assuntos;
- apenas converse normalmente.
`,
        },
      ];

      // ====================================================
      // HISTORY
      // ====================================================

      for (const item of conversationHistory.slice(
        -6,
      )) {
        messages.push({
          role: item.role,

          content:
            item.content,
        });
      }

      // ====================================================
      // USER MESSAGE
      // ====================================================

      messages.push({
        role: 'user',

        content: userMessage,
      });

      const completion =
        await this.client.chat.completions.create(
          {
            model: 'gpt-4.1-mini',

            temperature: 0.7,

            max_tokens: 120,

            messages,
          },
        );

      return (
        completion.choices[0]?.message
          ?.content ??
        'Olá! 😊'
      );
    } catch (error) {
      this.logger.error(
        'Erro SmallTalk OpenAI',
      );

      console.error(error);

      return 'Olá! 😊';
    }
  }
}