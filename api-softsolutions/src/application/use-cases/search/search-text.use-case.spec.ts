import { SearchTextUseCase } from './search-text.use-case';

describe('SearchTextUseCase', () => {
  let useCase: SearchTextUseCase;
  let mockMeiliService: any;
  let mockQueryUnderstanding: any;

  const processedQuery = {
    normalizedText: 'teste',
    tokens: ['teste'],
    embedding: undefined,
    synonyms: [],
    concepts: [],
    boostTerms: [],
    categories: [],
    exclusions: [],
    intent: 'buscar_curso',
    confidence: 0.8,
  };

  beforeEach(() => {
    mockMeiliService = {
      search: jest.fn(),
      searchHybrid: jest.fn(),
      supportsVectorSearch: jest.fn().mockReturnValue(false),
    };
    mockQueryUnderstanding = {
      process: jest.fn().mockResolvedValue(processedQuery),
    };
    useCase = new SearchTextUseCase(mockMeiliService, mockQueryUnderstanding);
  });

  it('deve instanciar a classe', () => {
    expect(useCase).toBeDefined();
  });

  it('deve retornar array vazio sem processar quando query vier vazia', async () => {
    const result = await useCase.execute('');

    expect(mockQueryUnderstanding.process).not.toHaveBeenCalled();
    expect(mockMeiliService.search).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('deve ignorar small talk antes de processar busca', async () => {
    const result = await useCase.execute('oi');

    expect(mockQueryUnderstanding.process).not.toHaveBeenCalled();
    expect(mockMeiliService.search).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('deve processar a query, buscar e reranquear resultados', async () => {
    mockMeiliService.search.mockResolvedValue([
      {
        id: 1,
        titulo: 'Teste',
        descricao: 'Conteudo de teste',
        categoria: 'Backend',
        tipo: 'curso',
        avaliacao: 4.8,
      },
    ]);

    const result = await useCase.execute('teste');

    expect(mockQueryUnderstanding.process).toHaveBeenCalledWith('teste');
    expect(mockMeiliService.search).toHaveBeenCalledWith('teste');
    expect(result).toEqual([
      expect.objectContaining({
        id: 1,
        semanticScore: expect.any(Number),
      }),
    ]);
  });

  it('deve usar busca hibrida quando Meilisearch suportar vetor', async () => {
    const embedding = [0.1, 0.2];
    mockMeiliService.supportsVectorSearch.mockReturnValue(true);
    mockQueryUnderstanding.process.mockResolvedValue({
      ...processedQuery,
      normalizedText: 'node',
      tokens: ['node'],
      embedding,
    });
    mockMeiliService.searchHybrid.mockResolvedValue([
      {
        id: 2,
        titulo: 'Node',
        categoria: 'Backend',
        tipo: 'curso',
      },
    ]);

    const result = await useCase.execute('Node');

    expect(mockMeiliService.searchHybrid).toHaveBeenCalledWith(
      'node',
      embedding,
    );
    expect(mockMeiliService.search).not.toHaveBeenCalled();
    expect(result).toEqual([
      expect.objectContaining({
        id: 2,
        semanticScore: expect.any(Number),
      }),
    ]);
  });

  it('deve usar fallback textual quando busca expandida nao trouxer hits', async () => {
    mockQueryUnderstanding.process.mockResolvedValue({
      ...processedQuery,
      normalizedText: 'backend',
      tokens: ['backend'],
      synonyms: ['api'],
    });
    mockMeiliService.search
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 3,
          titulo: 'Backend',
          categoria: 'Backend',
          tipo: 'curso',
        },
      ]);

    const result = await useCase.execute('Backend');

    expect(mockMeiliService.search).toHaveBeenNthCalledWith(1, 'backend api');
    expect(mockMeiliService.search).toHaveBeenNthCalledWith(2, 'backend');
    expect(result).toEqual([
      expect.objectContaining({
        id: 3,
        semanticScore: expect.any(Number),
      }),
    ]);
  });

  it('deve filtrar ruido semantico de frontend quando categoria for backend', async () => {
    mockQueryUnderstanding.process.mockResolvedValue({
      ...processedQuery,
      tokens: ['backend'],
      categories: ['backend'],
    });
    mockMeiliService.search.mockResolvedValue([
      {
        id: 4,
        titulo: 'React',
        categoria: 'Frontend',
        tipo: 'curso',
      },
      {
        id: 5,
        titulo: 'Node',
        categoria: 'Backend',
        tipo: 'curso',
      },
    ]);

    const result = await useCase.execute('backend');

    expect(result).toEqual([
      expect.objectContaining({
        id: 5,
      }),
    ]);
  });

  it('deve retornar vazio quando todos os tokens forem stopwords', async () => {
    mockQueryUnderstanding.process.mockResolvedValue({
      ...processedQuery,
      tokens: ['quero', 'curso', 'de'],
    });

    const result = await useCase.execute('quero curso de');

    expect(mockMeiliService.search).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('deve retornar vazio quando busca expandida e fallback nao trouxerem hits', async () => {
    mockQueryUnderstanding.process.mockResolvedValue({
      ...processedQuery,
      tokens: ['golang'],
      synonyms: ['go'],
    });
    mockMeiliService.search.mockResolvedValue([]);

    const result = await useCase.execute('golang');

    expect(mockMeiliService.search).toHaveBeenNthCalledWith(1, 'golang go');
    expect(mockMeiliService.search).toHaveBeenNthCalledWith(2, 'golang');
    expect(result).toEqual([]);
  });

  it('deve filtrar ruido semantico de backend quando categoria for frontend', async () => {
    mockQueryUnderstanding.process.mockResolvedValue({
      ...processedQuery,
      tokens: ['frontend'],
      categories: ['frontend'],
    });
    mockMeiliService.search.mockResolvedValue([
      {
        id: 6,
        titulo: 'Java',
        categoria: 'Backend',
        tipo: 'curso',
      },
      {
        id: 7,
        titulo: 'React',
        categoria: 'Frontend',
        tipo: 'curso',
      },
    ]);

    const result = await useCase.execute('frontend');

    expect(result).toEqual([
      expect.objectContaining({
        id: 7,
      }),
    ]);
  });

  it('deve aplicar boosts de categoria, conceito, sinonimo e IA', async () => {
    mockQueryUnderstanding.process.mockResolvedValue({
      ...processedQuery,
      intent: 'buscar_ia',
      tokens: ['python'],
      synonyms: ['dados'],
      concepts: ['machine learning'],
      boostTerms: ['ia'],
      categories: ['backend'],
    });
    mockMeiliService.search.mockResolvedValue([
      {
        id: 8,
        titulo: 'Python para IA',
        descricao: 'Machine learning e dados',
        curso: 'Python Dados',
        modulo: 'IA',
        categoria: 'Backend',
        tipo: 'aula',
        avaliacao: 4.6,
      },
    ]);

    const result = await useCase.execute('python');

    expect(result).toEqual([
      expect.objectContaining({
        id: 8,
        semanticScore: expect.any(Number),
      }),
    ]);
    expect(result[0].semanticScore).toBeGreaterThan(100000);
  });

  it('deve remover resultados penalizados por exclusoes semanticas', async () => {
    mockQueryUnderstanding.process.mockResolvedValue({
      ...processedQuery,
      tokens: ['java'],
      exclusions: ['javascript'],
    });
    mockMeiliService.search.mockResolvedValue([
      {
        id: 9,
        titulo: 'JavaScript moderno',
        descricao: 'Frontend',
        categoria: 'Frontend',
        tipo: 'material',
      },
    ]);

    const result = await useCase.execute('java');

    expect(result).toEqual([]);
  });

  it('deve penalizar aula generica e priorizar aula especifica', async () => {
    mockQueryUnderstanding.process.mockResolvedValue({
      ...processedQuery,
      tokens: ['node'],
    });
    mockMeiliService.search.mockResolvedValue([
      {
        id: 10,
        titulo: 'Introducao Node',
        descricao: 'Node',
        categoria: 'Backend',
        tipo: 'aula',
      },
      {
        id: 11,
        titulo: 'Node APIs',
        descricao: 'Node',
        categoria: 'Backend',
        tipo: 'aula',
      },
    ]);

    const result = await useCase.execute('node');

    expect(result.map((item) => item.id)).toEqual([11, 10]);
  });
});
