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
});
