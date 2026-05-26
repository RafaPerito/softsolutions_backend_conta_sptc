import { QueryUnderstandingService } from './query-understanding.service';

describe('QueryUnderstandingService', () => {
  let service: QueryUnderstandingService;
  let intentClassifier: any;
  let loggerLog: jest.SpyInstance;
  let loggerError: jest.SpyInstance;
  let consoleError: jest.SpyInstance;

  const classification = {
    intent: 'buscar_curso',
    confidence: 0.85,
    filteredTokens: ['curso', 'backend'],
    stems: ['curs', 'backend'],
    rankings: [
      {
        label: 'buscar_curso',
        value: 0.85,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    intentClassifier = {
      classify: jest.fn().mockReturnValue(classification),
    };
    service = new QueryUnderstandingService(intentClassifier);
    loggerLog = jest.spyOn((service as any).logger, 'log').mockImplementation();
    loggerError = jest
      .spyOn((service as any).logger, 'error')
      .mockImplementation();
    consoleError = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    loggerLog.mockRestore();
    loggerError.mockRestore();
    consoleError.mockRestore();
  });

  it('deve normalizar texto removendo acentos, pontuacao e espacos extras', () => {
    expect(
      (service as any).normalize('  Curso de NEST.JS, APIs!!!  '),
    ).toBe('curso de nest js apis');
  });

  it('deve tokenizar texto ignorando tokens vazios', () => {
    expect((service as any).tokenize('curso   backend node')).toEqual([
      'curso',
      'backend',
      'node',
    ]);
  });

  it('deve remover termos ambiguos conflitantes', () => {
    expect(
      (service as any).removeAmbiguousTerms(['java', 'javascript', 'curso']),
    ).toEqual(['curso']);
    expect(
      (service as any).removeAmbiguousTerms(['sql', 'nosql', 'banco']),
    ).toEqual(['sql', 'banco']);
    expect(
      (service as any).removeAmbiguousTerms(['java', 'curso']),
    ).toEqual(['java', 'curso']);
  });

  it('deve extrair contexto semantico limitado e sem duplicidades', () => {
    const context = (service as any).extractSemanticContext([
      'backend',
      'node',
      'python',
    ]);

    expect(context).toEqual({
      synonyms: ['api', 'servidor', 'rest', 'nodejs', 'nestjs', 'express', 'django', 'flask', 'fastapi'],
      concepts: ['desenvolvimento backend', 'backend node', 'backend python'],
      boostTerms: ['backend', 'api', 'node', 'nestjs', 'python', 'django', 'flask'],
      exclusions: [],
      categories: ['backend'],
    });
  });

  it('deve incluir exclusoes semanticas quando a tecnologia possuir conflito', () => {
    const context = (service as any).extractSemanticContext(['java', 'react']);

    expect(context.exclusions).toEqual(['javascript', 'reactive']);
    expect(context.categories).toEqual(['backend', 'frontend']);
  });

  it('deve construir expandedQuery normalizada, unica e ordenada pela fonte', () => {
    const expandedQuery = (service as any).buildExpandedQuery(
      'curso backend',
      {
        synonyms: ['api', 'backend'],
        concepts: ['Desenvolvimento Backend'],
        boostTerms: ['api', 'servidor'],
      },
    );

    expect(expandedQuery).toBe(
      'curso backend api backend desenvolvimento backend servidor',
    );
  });

  it('deve processar query com embedding quando pipeline estiver pronto', async () => {
    const embeddingPipeline = jest.fn().mockResolvedValue({
      data: new Float32Array([0.1, 0.2, 0.3]),
    });
    (service as any).transformerInitialized = true;
    (service as any).embeddingPipeline = embeddingPipeline;

    const result = await service.process('Curso de Backend com Node!!!');

    expect(intentClassifier.classify).toHaveBeenCalledWith(
      'curso de backend com node',
    );
    expect(embeddingPipeline).toHaveBeenCalledWith(
      expect.stringContaining('curso de backend com node'),
      {
        pooling: 'mean',
        normalize: true,
      },
    );
    expect(result).toMatchObject({
      originalText: 'Curso de Backend com Node!!!',
      normalizedText: 'curso de backend com node',
      intent: 'buscar_curso',
      confidence: 0.85,
      tokens: ['curso', 'de', 'backend', 'com', 'node'],
      filteredTokens: ['curso', 'backend'],
      stems: ['curs', 'backend'],
      rankings: classification.rankings,
      synonyms: expect.arrayContaining(['treinamento', 'api', 'nodejs']),
      concepts: expect.arrayContaining(['educacao', 'desenvolvimento backend', 'backend node']),
      boostTerms: expect.arrayContaining(['curso', 'aula', 'backend', 'node']),
      exclusions: [],
      categories: expect.arrayContaining(['education', 'backend']),
      matchedTerms: expect.arrayContaining([
        'curso',
        'backend',
        'node',
        'treinamento',
        'api',
        'backend node',
      ]),
    });
    expect(Array.from(result.embedding ?? [])).toEqual([
      expect.closeTo(0.1),
      expect.closeTo(0.2),
      expect.closeTo(0.3),
    ]);
    expect(result.expandedQuery).toContain('curso de backend com node');
    expect(loggerLog).toHaveBeenCalledWith(
      expect.stringContaining('QUERY UNDERSTANDING'),
    );
  });

  it('deve retornar embedding undefined quando tensor nao possuir data', async () => {
    (service as any).transformerInitialized = true;
    (service as any).embeddingPipeline = jest.fn().mockResolvedValue({});

    const result = await service.process('backend');

    expect(result.embedding).toBeUndefined();
  });

  it('deve continuar sem embedding quando pipeline falhar', async () => {
    const error = new Error('embedding error');
    (service as any).transformerInitialized = true;
    (service as any).embeddingPipeline = jest.fn().mockRejectedValue(error);

    const result = await service.process('backend');

    expect(result.embedding).toBeUndefined();
    expect(loggerError).toHaveBeenCalledWith(expect.stringContaining('Erro embedding'));
    expect(consoleError).toHaveBeenCalledWith(error);
  });

  it('deve processar texto nulo como string vazia', async () => {
    intentClassifier.classify.mockReturnValueOnce({
      intent: 'desconhecida',
      confidence: 0,
      rankings: [],
    });
    (service as any).transformerInitialized = true;
    (service as any).embeddingPipeline = undefined;

    const result = await service.process(null as any);

    expect(intentClassifier.classify).toHaveBeenCalledWith('');
    expect(result).toMatchObject({
      originalText: '',
      normalizedText: '',
      intent: 'desconhecida',
      confidence: 0,
      tokens: [],
      matchedTerms: [],
      synonyms: [],
      concepts: [],
      boostTerms: [],
      exclusions: [],
      categories: [],
      expandedQuery: '',
    });
  });

  it('deve inicializar transformers apenas uma vez quando ja estiver inicializado', async () => {
    (service as any).transformerInitialized = true;
    (service as any).embeddingPipeline = undefined;

    await (service as any).initTransformers();

    expect(loggerError).not.toHaveBeenCalled();
  });
});
