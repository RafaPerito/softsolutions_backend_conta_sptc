import { ProcessChatUseCase } from './process-chat.use-case';

describe('ProcessChatUseCase', () => {
  let useCase: ProcessChatUseCase;
  let mockQueryUnderstandingService: any;
  let mockSearchTextUseCase: any;
  let mockOpenaiService: any;

  beforeEach(() => {
    mockQueryUnderstandingService = {
      process: jest.fn().mockResolvedValue({
        intent: 'buscar_curso',
        confidence: 0.9,
        categories: ['backend'],
        concepts: ['api'],
      }),
    };
    mockSearchTextUseCase = {
      execute: jest.fn().mockResolvedValue([]),
    };
    mockOpenaiService = {
      generateResponse: jest.fn().mockResolvedValue('Resposta gerada'),
      generateSmallTalkResponse: jest.fn().mockResolvedValue('Ola!'),
    };

    useCase = new ProcessChatUseCase(
      mockQueryUnderstandingService,
      mockSearchTextUseCase,
      mockOpenaiService,
    );
  });

  it('deve instanciar a classe', () => {
    expect(useCase).toBeDefined();
  });

  it('deve responder small talk sem executar busca textual', async () => {
    mockQueryUnderstandingService.process.mockResolvedValueOnce({
      intent: 'saudacao',
      confidence: 0.95,
    });

    const result = await useCase.execute({
      message: 'oi',
      history: [{ role: 'user', content: 'ola' }],
    } as any);

    expect(mockSearchTextUseCase.execute).not.toHaveBeenCalled();
    expect(mockOpenaiService.generateSmallTalkResponse).toHaveBeenCalledWith(
      'oi',
      [{ role: 'user', content: 'ola' }],
    );
    expect(result).toEqual({
      response: 'Ola!',
      intent: 'saudacao',
      confidence: 0.95,
      suggestions: [],
      requiresHumanSupport: false,
      relatedCourses: [],
      navigation: [],
      semanticContext: {
        intent: 'saudacao',
        categories: [],
        concepts: [],
      },
    });
  });

  it('deve detectar navegacao e enviar contexto para o OpenAI', async () => {
    mockQueryUnderstandingService.process.mockResolvedValueOnce({
      intent: 'duvida',
      confidence: 0.7,
    });

    const result = await useCase.execute({
      message: 'como recuperar senha',
    } as any);

    expect(mockSearchTextUseCase.execute).not.toHaveBeenCalled();
    expect(mockOpenaiService.generateResponse).toHaveBeenCalledWith(
      'como recuperar senha',
      expect.stringContaining('Nenhum'),
      [],
      expect.objectContaining({
        navigation: [
          expect.objectContaining({
            label: 'Recuperar Senha',
            route: '/recuperar-senha',
          }),
        ],
      }),
    );
    expect(result.navigation).toEqual([
      expect.objectContaining({
        label: 'Recuperar Senha',
        route: '/recuperar-senha',
      }),
    ]);
  });

  it('deve buscar, filtrar resultados semanticamente e gerar sugestoes unicas', async () => {
    mockSearchTextUseCase.execute.mockResolvedValueOnce([
      {
        titulo: 'Node Basico',
        descricao: 'APIs com Node',
        categoria: 'Backend',
        tipo: 'curso',
        curso: 'Node.js',
        professor: 'Ana',
        semanticScore: 50,
      },
      {
        titulo: 'Node Aula',
        descricao: 'Express',
        categoria: 'Backend',
        tipo: 'aula',
        curso: 'Node.js',
        professor: 'Ana',
        semanticScore: 10,
      },
      {
        titulo: 'Frontend',
        descricao: 'React',
        categoria: 'Frontend',
        tipo: 'curso',
        semanticScore: 0,
      },
    ]);

    const result = await useCase.execute({
      message: 'curso de backend node',
    } as any);

    expect(mockSearchTextUseCase.execute).toHaveBeenCalledWith(
      'curso de backend node',
    );
    expect(mockOpenaiService.generateResponse).toHaveBeenCalledWith(
      'curso de backend node',
      expect.stringContaining('Node Basico'),
      [],
      expect.objectContaining({
        navigation: [
          expect.objectContaining({
            label: 'Cursos',
            route: '/cursos-lista',
          }),
        ],
      }),
    );
    expect(mockOpenaiService.generateResponse.mock.calls[0][1]).not.toContain(
      'Frontend',
    );
    expect(result.suggestions).toEqual(['Node.js']);
    expect(result.relatedCourses).toEqual(['Node.js']);
    expect(result.semanticContext).toEqual({
      intent: 'buscar_curso',
      categories: ['backend'],
      concepts: ['api'],
    });
  });

  it('deve retornar fallback especifico para IA quando nao houver resultados', async () => {
    mockQueryUnderstandingService.process.mockResolvedValueOnce({
      intent: 'buscar_ia',
      confidence: 0.8,
      categories: ['ia'],
      concepts: ['machine learning'],
    });

    const result = await useCase.execute({
      message: 'tem curso de inteligencia artificial?',
    } as any);

    expect(mockSearchTextUseCase.execute).toHaveBeenCalledWith(
      'tem curso de inteligencia artificial?',
    );
    expect(mockOpenaiService.generateResponse).not.toHaveBeenCalled();
    expect(result.response).toContain('Intelig');
    expect(result.suggestions).toEqual([]);
    expect(result.semanticContext).toEqual({
      intent: 'buscar_ia',
      categories: ['ia'],
      concepts: ['machine learning'],
    });
  });

  it('deve solicitar suporte humano quando baixa confianca e sem contexto', async () => {
    mockQueryUnderstandingService.process.mockResolvedValueOnce({
      intent: 'desconhecido',
      confidence: 0.1,
    });

    const result = await useCase.execute({
      message: 'xyz',
    } as any);

    expect(result.requiresHumanSupport).toBe(true);
    expect(result.suggestions).toEqual([]);
    expect(mockOpenaiService.generateResponse).toHaveBeenCalledWith(
      'xyz',
      expect.stringContaining('Nenhum'),
      [],
      null,
    );
  });

  it('deve montar contexto com fallbacks N/A e limitar sugestoes a cinco itens', async () => {
    mockSearchTextUseCase.execute.mockResolvedValueOnce(
      Array.from({ length: 6 }).map((_, index) => ({
        titulo: `Titulo ${index + 1}`,
        descricao: `Descricao ${index + 1}`,
        categoria: 'Backend',
        tipo: 'curso',
        semanticScore: 10 + index,
      })),
    );

    const result = await useCase.execute({
      message: 'quero cursos',
    } as any);

    const context = mockOpenaiService.generateResponse.mock.calls[0][1];
    expect(context).toContain('Curso:\nN/A');
    expect(context).toContain('Professor:\nN/A');
    expect(context).toContain('Titulo 5');
    expect(context).not.toContain('Titulo 6');
    expect(result.suggestions).toEqual([
      'Titulo 1',
      'Titulo 2',
      'Titulo 3',
      'Titulo 4',
      'Titulo 5',
    ]);
  });

  it('deve detectar navegacao por match exato e por palavra isolada', () => {
    expect((useCase as any).detectNavigation('login')).toEqual(
      expect.objectContaining({
        navigation: [
          expect.objectContaining({
            route: '/login',
          }),
        ],
      }),
    );
    expect((useCase as any).detectNavigation('preciso de suporte')).toEqual(
      expect.objectContaining({
        navigation: [
          expect.objectContaining({
            route: '/contato',
          }),
        ],
      }),
    );
  });

  it('deve retornar null quando navegacao nao atingir confianca minima', () => {
    expect((useCase as any).detectNavigation('palavra qualquer')).toBeNull();
  });

  it('deve usar arrays vazios em semanticContext quando categorias e conceitos vierem ausentes', async () => {
    mockQueryUnderstandingService.process.mockResolvedValueOnce({
      intent: 'certificado',
      confidence: 0.6,
    });

    const result = await useCase.execute({
      message: 'certificado',
    } as any);

    expect(result.semanticContext).toEqual({
      intent: 'certificado',
      categories: [],
      concepts: [],
    });
    expect(result.requiresHumanSupport).toBe(false);
  });
});
