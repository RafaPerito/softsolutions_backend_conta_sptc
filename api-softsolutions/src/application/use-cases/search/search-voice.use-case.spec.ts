import { SearchVoiceUseCase } from './search-voice.use-case';

describe('SearchVoiceUseCase', () => {
  let useCase: SearchVoiceUseCase;
  let mockQueryUnderstandingService: any;
  let mockSearchTextUseCase: any;

  beforeEach(() => {
    mockQueryUnderstandingService = {
      process: jest.fn(),
    };
    mockSearchTextUseCase = {
      execute: jest.fn(),
    };
    useCase = new SearchVoiceUseCase(
      mockQueryUnderstandingService,
      mockSearchTextUseCase,
    );
  });

  it('deve montar a resposta usando o processamento da query de voz', async () => {
    mockQueryUnderstandingService.process.mockResolvedValue({
      originalText: 'buscar curso python',
      normalizedText: 'buscar curso python',
      tokens: ['buscar', 'curso', 'python'],
      filteredTokens: ['curso', 'python'],
      stems: ['curs', 'python'],
      intent: 'embedding_generated',
      confidence: 0.8,
      rankings: [{ label: 'embedding_generated', value: 0.8 }],
      finalQuery: 'curso python',
      querySource: 'filteredTokens',
      matchedTerms: ['curso', 'python'],
    });
    mockSearchTextUseCase.execute.mockResolvedValue([{ id: 1 }]);

    const result = await useCase.execute({ text: 'buscar curso python' });

    expect(mockQueryUnderstandingService.process).toHaveBeenCalledWith(
      'buscar curso python',
    );
    expect(mockSearchTextUseCase.execute).toHaveBeenCalledWith(
      'buscar curso python',
    );
    expect(result.searchQuery).toBe('curso python');
    expect(result.querySource).toBe('filteredTokens');
    expect(result.matchedTerms).toEqual(['curso', 'python']);
    expect(result.rankings).toEqual([
      { label: 'embedding_generated', value: 0.8 },
    ]);
    expect(result.results).toEqual([{ id: 1 }]);
  });

  it('deve usar normalizedText quando finalQuery vier ausente', async () => {
    mockQueryUnderstandingService.process.mockResolvedValue({
      originalText: 'node avançado',
      normalizedText: 'node avancado',
      tokens: ['node', 'avancado'],
      filteredTokens: [],
      stems: ['node', 'avanc'],
      intent: 'desconhecida',
      confidence: 0.3,
      rankings: [],
      querySource: 'normalizedText',
    });
    mockSearchTextUseCase.execute.mockResolvedValue([]);

    const result = await useCase.execute({ text: 'node avançado' });

    expect(mockSearchTextUseCase.execute).toHaveBeenCalledWith('node avançado');
    expect(result.searchQuery).toBe('node avancado');
    expect(result.querySource).toBe('normalizedText');
    expect(result.matchedTerms).toEqual(['node', 'avancado']);
  });

  it('deve retornar arrays default quando campos opcionais vierem ausentes', async () => {
    mockQueryUnderstandingService.process.mockResolvedValue({
      originalText: '   ',
      normalizedText: '',
      intent: 'pesquisar',
      confidence: 0,
    });
    mockSearchTextUseCase.execute.mockResolvedValue([]);

    const result = await useCase.execute({ text: '   ' });

    expect(mockSearchTextUseCase.execute).toHaveBeenCalledWith('   ');
    expect(result.searchQuery).toBe('');
    expect(result.querySource).toBe('normalizedText');
    expect(result.tokens).toEqual([]);
    expect(result.filteredTokens).toEqual([]);
    expect(result.stems).toEqual([]);
    expect(result.rankings).toEqual([]);
    expect(result.matchedTerms).toEqual([]);
    expect(result.results).toEqual([]);
  });

  it('deve normalizar rankings para label e value', async () => {
    mockQueryUnderstandingService.process.mockResolvedValue({
      originalText: 'backend',
      normalizedText: 'backend',
      intent: 'embedding_generated',
      confidence: 1,
      rankings: [
        { label: 'embedding_generated', value: 1, extra: 'ignorado' },
      ],
      matchedTerms: ['backend'],
    });
    mockSearchTextUseCase.execute.mockResolvedValue([{ id: 2 }]);

    const result = await useCase.execute({ text: 'backend' });

    expect(result.rankings).toEqual([
      { label: 'embedding_generated', value: 1 },
    ]);
  });

  it('deve executar fallback com smart query quando busca original nao retornar resultados', async () => {
    mockQueryUnderstandingService.process.mockResolvedValue({
      originalText: 'quero backend',
      normalizedText: 'quero backend',
      tokens: ['quero', 'backend'],
      filteredTokens: ['backend'],
      synonyms: ['api', 'api'],
      boostTerms: ['node'],
      stems: ['backend'],
      intent: 'buscar_curso',
      confidence: 0.7,
      rankings: [],
      matchedTerms: ['backend'],
    });
    mockSearchTextUseCase.execute
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 3,
          curso: 'Backend Node',
          titulo: 'Node APIs',
          tipo: 'curso',
          categoria: 'Backend',
        },
      ]);

    const result = await useCase.execute({ text: 'quero backend' });

    expect(mockSearchTextUseCase.execute).toHaveBeenNthCalledWith(
      1,
      'quero backend',
    );
    expect(mockSearchTextUseCase.execute).toHaveBeenNthCalledWith(
      2,
      'backend api node',
    );
    expect(result.searchQuery).toBe('backend api node');
    expect(result.results).toHaveLength(1);
    expect(result.suggestions).toEqual([
      {
        titulo: 'Backend Node',
        tipo: 'curso',
        categoria: 'Backend',
      },
    ]);
    expect(result.requiresHumanSupport).toBe(false);
  });

  it('deve marcar suporte humano quando nao houver resultados e confianca for baixa', async () => {
    mockQueryUnderstandingService.process.mockResolvedValue({
      originalText: '???',
      normalizedText: '',
      intent: 'desconhecida',
      confidence: 0.1,
    });
    mockSearchTextUseCase.execute.mockResolvedValue([]);

    const result = await useCase.execute({ text: '???' });

    expect(result.requiresHumanSupport).toBe(true);
  });

  it('deve gerar sugestoes unicas, ignorar itens sem titulo e limitar a cinco', async () => {
    mockQueryUnderstandingService.process.mockResolvedValue({
      originalText: 'cursos',
      normalizedText: 'cursos',
      filteredTokens: ['cursos'],
      intent: 'buscar_curso',
      confidence: 0.9,
    });
    mockSearchTextUseCase.execute.mockResolvedValue([
      { id: 1, curso: 'Curso 1', titulo: 'Aula 1', tipo: 'curso', categoria: 'A' },
      { id: 2, curso: 'Curso 1', titulo: 'Aula 2', tipo: 'aula', categoria: 'A' },
      { id: 3, titulo: 'Curso 2', tipo: 'curso', categoria: 'B' },
      { id: 4, titulo: 'Curso 3', tipo: 'curso', categoria: 'C' },
      { id: 5, titulo: 'Curso 4', tipo: 'curso', categoria: 'D' },
      { id: 6, titulo: 'Curso 5', tipo: 'curso', categoria: 'E' },
      { id: 7, titulo: 'Curso 6', tipo: 'curso', categoria: 'F' },
      { id: 8 },
    ]);

    const result = await useCase.execute({ text: 'cursos' });

    expect(result.suggestions).toEqual([
      { titulo: 'Curso 1', tipo: 'curso', categoria: 'A' },
      { titulo: 'Curso 2', tipo: 'curso', categoria: 'B' },
      { titulo: 'Curso 3', tipo: 'curso', categoria: 'C' },
      { titulo: 'Curso 4', tipo: 'curso', categoria: 'D' },
      { titulo: 'Curso 5', tipo: 'curso', categoria: 'E' },
    ]);
  });
});
