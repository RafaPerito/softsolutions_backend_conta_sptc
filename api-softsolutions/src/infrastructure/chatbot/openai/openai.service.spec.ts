import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { OpenaiService } from './openai.service';

const mockCreate = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
}));

describe('OpenaiService', () => {
  let service: OpenaiService;
  let mockConfigService: any;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation();
    mockConfigService = {
      get: jest.fn().mockReturnValue('test-api-key'),
    };
    service = new OpenaiService(
      mockConfigService as ConfigService,
    );
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('deve instanciar o cliente OpenAI com a chave configurada', () => {
    expect(OpenAI).toHaveBeenCalledWith({
      apiKey: 'test-api-key',
    });
    expect(mockConfigService.get).toHaveBeenCalledWith('OPENAI_API_KEY');
    expect(service).toBeDefined();
  });

  it('deve gerar resposta usando contexto, historico recente e navegacao', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: 'Use o menu Certificados.',
          },
        },
      ],
    });
    const history = Array.from({ length: 12 }).map((_, index) => ({
      role: index % 2 ? 'assistant' : 'user',
      content: `mensagem ${index}`,
    }));
    const navigationContext = {
      navigation: [
        {
          label: 'Certificados',
          route: '/certificados',
        },
      ],
    };

    const result = await service.generateResponse(
      'onde baixo certificado?',
      'Curso: Node.js',
      history,
      navigationContext,
    );

    expect(result).toBe('Use o menu Certificados.');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4.1-mini',
        temperature: 0.45,
        max_tokens: 450,
        messages: expect.any(Array),
      }),
    );

    const payload = mockCreate.mock.calls[0][0];
    expect(payload.messages).toHaveLength(12);
    expect(payload.messages[1]).toEqual({
      role: 'user',
      content: 'mensagem 2',
    });
    expect(payload.messages[10]).toEqual({
      role: 'assistant',
      content: 'mensagem 11',
    });
    expect(payload.messages[11].content).toContain(
      'onde baixo certificado?',
    );
    expect(payload.messages[11].content).toContain('Curso: Node.js');
    expect(payload.messages[11].content).toContain('Certificados');
    expect(payload.messages[11].content).toContain('SIM');
  });

  it('deve retornar mensagem padrao quando a resposta vier vazia', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{}],
    });

    await expect(
      service.generateResponse('teste', 'Nenhum conteudo relevante encontrado'),
    ).resolves.toContain('consegui responder');
  });

  it('deve tratar erro ao gerar resposta principal', async () => {
    mockCreate.mockRejectedValueOnce(new Error('falha'));

    await expect(
      service.generateResponse('teste', 'contexto'),
    ).resolves.toContain('Ocorreu um erro');
  });

  it('deve gerar small talk com historico limitado', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: 'Oi! Tudo bem?',
          },
        },
      ],
    });
    const history = Array.from({ length: 8 }).map((_, index) => ({
      role: 'user',
      content: `hist ${index}`,
    }));

    const result = await service.generateSmallTalkResponse('oi', history);

    expect(result).toBe('Oi! Tudo bem?');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4.1-mini',
        temperature: 0.7,
        max_tokens: 120,
        messages: expect.any(Array),
      }),
    );

    const payload = mockCreate.mock.calls[0][0];
    expect(payload.messages).toHaveLength(8);
    expect(payload.messages[1]).toEqual({
      role: 'user',
      content: 'hist 2',
    });
    expect(payload.messages[7]).toEqual({
      role: 'user',
      content: 'oi',
    });
  });

  it('deve retornar saudacao padrao quando small talk falhar', async () => {
    mockCreate.mockRejectedValueOnce(new Error('falha'));

    await expect(
      service.generateSmallTalkResponse('oi'),
    ).resolves.toContain('Ol');
  });
});
