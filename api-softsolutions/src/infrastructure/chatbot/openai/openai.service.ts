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

  async generateResponse(
    prompt: string,
  ): Promise<string> {
    try {
      const completion =
        await this.client.chat.completions.create(
          {
            model: 'gpt-4.1-mini',

            temperature: 0.4,

            max_tokens: 500,

            messages: [
              {
                role: 'system',

                content: `
Você é o ChatBot oficial da plataforma educacional SoftSolutions.

Seu objetivo é:
- ajudar usuários
- recomendar cursos
- auxiliar navegação
- orientar certificados
- responder dúvidas educacionais
- responder de forma objetiva e amigável

IMPORTANTE:
- nunca invente cursos
- use apenas o contexto fornecido
- caso não encontre resposta suficiente, sugira suporte humano
`,
              },

              {
                role: 'user',

                content: prompt,
              },
            ],
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
}