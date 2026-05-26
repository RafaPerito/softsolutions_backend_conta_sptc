import { SearchController } from './search.controller';

describe('SearchController', () => {
  let controller: SearchController;
  let mockSearchTextUseCase: any;
  let mockSearchVoiceUseCase: any;
  let mockMeilisearchIndexerService: any;
  let mockMeilisearchService: any;

  beforeEach(() => {
    mockSearchTextUseCase = {
      execute: jest.fn().mockResolvedValue([]),
    };
    mockSearchVoiceUseCase = {
      execute: jest.fn().mockResolvedValue({}),
    };
    mockMeilisearchIndexerService = {
      reindexCursosEAulas: jest.fn().mockResolvedValue(undefined),
    };
    mockMeilisearchService = {
      getSuggestions: jest.fn().mockResolvedValue([]),
    };
    controller = new SearchController(
      mockSearchTextUseCase,
      mockSearchVoiceUseCase,
      mockMeilisearchIndexerService,
      mockMeilisearchService,
    );
  });

  it('deve instanciar a classe', () => {
    expect(controller).toBeDefined();
  });

  it('deve retornar resultados de busca textual', async () => {
    const mockResults = [{ id: 1, titulo: 'Curso de Python' }];
    mockSearchTextUseCase.execute.mockResolvedValueOnce(mockResults);

    const result = await controller.textSearch({ q: 'python' } as any);

    expect(mockSearchTextUseCase.execute).toHaveBeenCalledWith('python');
    expect(result).toEqual({
      results: mockResults,
      total: 1,
      query: 'python',
    });
  });

  it('deve retornar sugestoes de autocomplete', async () => {
    mockMeilisearchService.getSuggestions.mockResolvedValueOnce(['Node']);

    const result = await controller.autocomplete('no');

    expect(mockMeilisearchService.getSuggestions).toHaveBeenCalledWith('no');
    expect(result).toEqual({ suggestions: ['Node'] });
  });

  it('deve retornar sugestoes vazias quando autocomplete vier vazio', async () => {
    const result = await controller.autocomplete('   ');

    expect(mockMeilisearchService.getSuggestions).not.toHaveBeenCalled();
    expect(result).toEqual({ suggestions: [] });
  });

  it('deve retornar resultados de busca por voz', async () => {
    const mockResult = {
      originalText: 'buscar curso',
      normalizedText: 'buscar curso',
      tokens: ['buscar', 'curso'],
      filteredTokens: ['curso'],
      stems: ['curs'],
      intent: 'buscar_curso',
      confidence: 0.8,
      rankings: [],
      searchQuery: 'curso',
      querySource: 'filteredTokens',
      matchedTerms: ['curso'],
      results: [],
    };
    mockSearchVoiceUseCase.execute.mockResolvedValueOnce(mockResult);

    const result = await controller.voiceSearch({ text: 'buscar curso' } as any);

    expect(mockSearchVoiceUseCase.execute).toHaveBeenCalledWith({
      text: 'buscar curso',
    });
    expect(result).toEqual(mockResult);
  });

  it('deve executar reindexacao', async () => {
    const result = await controller.reindex();

    expect(
      mockMeilisearchIndexerService.reindexCursosEAulas,
    ).toHaveBeenCalled();
    expect(result).toHaveProperty('message');
  });
});
