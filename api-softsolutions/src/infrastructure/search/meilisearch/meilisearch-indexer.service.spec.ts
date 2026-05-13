import { CursoEntity } from '../../database/entities/curso.entity';
import { MeilisearchIndexerService } from './meilisearch-indexer.service';

describe('MeilisearchIndexerService', () => {
  let service: MeilisearchIndexerService;
  let cursoRepository: { find: jest.Mock };
  let dataSource: { getRepository: jest.Mock };
  let queryUnderstanding: { process: jest.Mock };
  let meilisearchService: { replaceAllDocuments: jest.Mock };
  let loggerWarn: jest.SpyInstance;
  let loggerLog: jest.SpyInstance;
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    cursoRepository = { find: jest.fn() };
    dataSource = {
      getRepository: jest.fn().mockReturnValue(cursoRepository),
    };
    queryUnderstanding = {
      process: jest.fn().mockResolvedValue({ embedding: [0.1, 0.2] }),
    };
    meilisearchService = { replaceAllDocuments: jest.fn() };

    service = new MeilisearchIndexerService(
      dataSource as any,
      queryUnderstanding as any,
      meilisearchService as any,
    );

    loggerWarn = jest.spyOn((service as any).logger, 'warn').mockImplementation();
    loggerLog = jest.spyOn((service as any).logger, 'log').mockImplementation();
    consoleError = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    loggerWarn.mockRestore();
    loggerLog.mockRestore();
    consoleError.mockRestore();
  });

  it('deve indexar cursos e aulas com embeddings e campos esperados', async () => {
    cursoRepository.find.mockResolvedValue([
      {
        id: 1,
        nomeCurso: 'Curso Node',
        descricaoCurta: 'Curta',
        descricaoDetalhada: 'Detalhada',
        categoria: 'Backend',
        professor: 'Lucas',
        status: 'ativo',
        avaliacao: 4.5,
        imagemCurso: 'img.png',
        tempoCurso: 30,
        modulos: [
          {
            nomeModulo: 'API',
            aulas: [
              {
                id: 10,
                nomeAula: 'Nest',
                descricaoConteudo: 'Controllers',
                videoUrl: 'video',
                tempoAula: 15,
              },
            ],
          },
        ],
      },
    ]);

    const result = await service.reindexCursosEAulas();

    expect(dataSource.getRepository).toHaveBeenCalledWith(CursoEntity);
    expect(cursoRepository.find).toHaveBeenCalledWith({
      relations: ['modulos', 'modulos.aulas'],
    });
    expect(queryUnderstanding.process).toHaveBeenCalledTimes(2);
    expect(meilisearchService.replaceAllDocuments).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'curso-1',
          tipo: 'curso',
          titulo: 'Curso Node',
          _vectors: { default: [0.1, 0.2] },
        }),
        expect.objectContaining({
          id: 'aula-10',
          tipo: 'aula',
          titulo: 'Nest',
          modulo: 'API',
          videoUrl: 'video',
          tempoAula: 15,
          _vectors: { default: [0.1, 0.2] },
        }),
      ]),
    );
    expect(result).toEqual({
      success: true,
      totalDocuments: 2,
      cursosComEmbedding: 1,
      aulasComEmbedding: 1,
    });
  });

  it('deve aplicar fallbacks quando campos opcionais vierem ausentes', async () => {
    cursoRepository.find.mockResolvedValue([
      {
        id: 2,
        nomeCurso: 'Curso Sem Aula',
        descricaoCurta: undefined,
        descricaoDetalhada: undefined,
        categoria: undefined,
        professor: undefined,
        status: undefined,
        avaliacao: undefined,
        imagemCurso: undefined,
        tempoCurso: undefined,
        modulos: undefined,
      },
    ]);
    queryUnderstanding.process.mockResolvedValue({ embedding: undefined });

    const result = await service.reindexCursosEAulas();

    expect(meilisearchService.replaceAllDocuments).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'curso-2',
        descricao: '',
        descricaoDetalhada: '',
        categoria: '',
        conteudo: '',
        professor: '',
        status: 'ativo',
        avaliacao: 0,
        imagemCurso: null,
        tempoCurso: null,
        modulo: null,
        videoUrl: null,
      }),
    ]);
    expect(result).toMatchObject({
      totalDocuments: 1,
      cursosComEmbedding: 0,
      aulasComEmbedding: 0,
    });
  });

  it('deve continuar indexando quando gerar embedding de curso falhar', async () => {
    cursoRepository.find.mockResolvedValue([
      {
        id: 3,
        nomeCurso: 'Curso Falha',
        descricaoCurta: '',
        descricaoDetalhada: '',
        modulos: [],
      },
    ]);
    queryUnderstanding.process.mockRejectedValue(new Error('embedding error'));

    const result = await service.reindexCursosEAulas();

    expect(loggerWarn).toHaveBeenCalledWith(expect.stringContaining('curso 3'));
    expect(consoleError).toHaveBeenCalledWith(expect.any(Error));
    expect(meilisearchService.replaceAllDocuments).toHaveBeenCalledWith([
      expect.not.objectContaining({ _vectors: expect.anything() }),
    ]);
    expect(result).toMatchObject({
      success: true,
      totalDocuments: 1,
      cursosComEmbedding: 0,
    });
  });

  it('deve continuar indexando quando gerar embedding de aula falhar', async () => {
    cursoRepository.find.mockResolvedValue([
      {
        id: 4,
        nomeCurso: 'Curso Aula',
        descricaoCurta: '',
        descricaoDetalhada: '',
        modulos: [
          {
            nomeModulo: undefined,
            aulas: [
              {
                id: 40,
                nomeAula: 'Aula Falha',
                descricaoConteudo: undefined,
                status: undefined,
                videoUrl: undefined,
                tempoAula: undefined,
              },
            ],
          },
        ],
      },
    ]);
    queryUnderstanding.process
      .mockResolvedValueOnce({ embedding: [0.5] })
      .mockRejectedValueOnce(new Error('aula embedding error'));

    const result = await service.reindexCursosEAulas();

    expect(loggerWarn).toHaveBeenCalledWith(expect.stringContaining('aula 40'));
    expect(meilisearchService.replaceAllDocuments).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'aula-40',
          descricao: '',
          categoria: '',
          professor: '',
          status: 'ativo',
          avaliacao: 0,
          imagemCurso: null,
          tempoCurso: null,
          modulo: '',
          videoUrl: null,
          tempoAula: null,
        }),
      ]),
    );
    expect(result).toMatchObject({
      totalDocuments: 2,
      cursosComEmbedding: 1,
      aulasComEmbedding: 0,
    });
  });

  it('deve enviar lista vazia quando nao houver cursos', async () => {
    cursoRepository.find.mockResolvedValue([]);

    const result = await service.reindexCursosEAulas();

    expect(meilisearchService.replaceAllDocuments).toHaveBeenCalledWith([]);
    expect(result).toEqual({
      success: true,
      totalDocuments: 0,
      cursosComEmbedding: 0,
      aulasComEmbedding: 0,
    });
  });
});
