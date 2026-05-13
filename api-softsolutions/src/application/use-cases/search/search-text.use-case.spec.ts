import { SearchTextUseCase } from './search-text.use-case';

describe('SearchTextUseCase', () => {
  let useCase: SearchTextUseCase;
  let mockMeiliService: any;
  let mockQueryUnderstanding: any;

  beforeEach(() => {
    mockMeiliService = {
      search: jest.fn(),
      searchHybrid: jest.fn(),
      supportsVectorSearch: jest.fn().mockReturnValue(false),
      rerankByEmbedding: jest.fn(),
    };
    mockQueryUnderstanding = {
      process: jest.fn().mockResolvedValue({
        normalizedText: 'teste',
        embedding: undefined,
      }),
    };
    useCase = new SearchTextUseCase(mockMeiliService, mockQueryUnderstanding);
  });

  it('deve instanciar a classe', () => {
    expect(useCase).toBeDefined();
  });

  it('deve ter método execute definido', () => {
    expect(typeof useCase.execute).toBe('function');
  });

  it('deve processar a query e chamar meilisearchService.search com texto normalizado', async () => {
    const mockResults = [{ id: 1, titulo: 'Teste' }];
    mockMeiliService.search.mockResolvedValue(mockResults);
    mockQueryUnderstanding.process.mockResolvedValue({
      normalizedText: 'teste normalizado',
    });

    const result = await useCase.execute('teste');

    expect(mockQueryUnderstanding.process).toHaveBeenCalledWith('teste');
    expect(mockMeiliService.search).toHaveBeenCalledWith('teste normalizado');
    expect(result).toEqual(mockResults);
  });

  it('deve retornar array vazio sem processar quando query vier vazia', async () => {
    const result = await useCase.execute('');

    expect(mockQueryUnderstanding.process).not.toHaveBeenCalled();
    expect(mockMeiliService.search).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('deve usar busca hibrida quando Meilisearch suportar vetor', async () => {
    const embedding = [0.1, 0.2];
    const mockResults = [{ id: 2, titulo: 'Hibrido' }];
    mockMeiliService.supportsVectorSearch.mockReturnValue(true);
    mockQueryUnderstanding.process.mockResolvedValue({
      normalizedText: 'node',
      embedding,
    });
    mockMeiliService.searchHybrid.mockResolvedValue(mockResults);

    const result = await useCase.execute('Node');

    expect(mockMeiliService.searchHybrid).toHaveBeenCalledWith('node', embedding);
    expect(mockMeiliService.search).not.toHaveBeenCalled();
    expect(result).toEqual(mockResults);
  });

  it('deve reordenar por embedding quando houver embedding e hits textuais', async () => {
    const embedding = [0.3, 0.4];
    const hits = [{ id: 3, titulo: 'Texto' }];
    const reranked = [{ id: 3, titulo: 'Texto', score: 0.9 }];
    mockQueryUnderstanding.process.mockResolvedValue({
      normalizedText: 'backend',
      embedding,
    });
    mockMeiliService.search.mockResolvedValue(hits);
    mockMeiliService.rerankByEmbedding.mockReturnValue(reranked);

    const result = await useCase.execute('Backend');

    expect(mockMeiliService.search).toHaveBeenCalledWith('backend');
    expect(mockMeiliService.rerankByEmbedding).toHaveBeenCalledWith(hits, embedding);
    expect(result).toEqual(reranked);
  });
});
