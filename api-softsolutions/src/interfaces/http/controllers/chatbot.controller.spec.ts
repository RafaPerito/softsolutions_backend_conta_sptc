import { ChatbotController } from './chatbot.controller';

describe('ChatbotController', () => {
  let controller: ChatbotController;
  let mockProcessChatUseCase: any;

  beforeEach(() => {
    mockProcessChatUseCase = {
      execute: jest.fn().mockResolvedValue({
        response: 'Resposta',
        intent: 'buscar_curso',
        confidence: 0.9,
        suggestions: [],
        requiresHumanSupport: false,
      }),
    };
    controller = new ChatbotController(mockProcessChatUseCase);
  });

  it('deve instanciar a classe', () => {
    expect(controller).toBeDefined();
  });

  it('deve delegar o chat para o use case', async () => {
    const dto = {
      message: 'quero curso de backend',
      history: [{ role: 'user', content: 'ola' }],
    } as any;

    const result = await controller.chat(dto);

    expect(mockProcessChatUseCase.execute).toHaveBeenCalledWith(dto);
    expect(result).toEqual({
      response: 'Resposta',
      intent: 'buscar_curso',
      confidence: 0.9,
      suggestions: [],
      requiresHumanSupport: false,
    });
  });
});
