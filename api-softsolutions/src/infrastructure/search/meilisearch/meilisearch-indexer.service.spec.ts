import { CursoEntity } from '../../database/entities/curso.entity';
import { MeilisearchIndexerService } from './meilisearch-indexer.service';

describe('MeilisearchIndexerService', () => {
  let service: MeilisearchIndexerService;
  let cursoRepository: { find: jest.Mock };
  let dataSource: { getRepository: jest.Mock };
  let meilisearchService: { replaceAllDocuments: jest.Mock };
  let loggerLog: jest.SpyInstance;

  beforeEach(() => {
    cursoRepository = { find: jest.fn() };
    dataSource = {
      getRepository: jest.fn().mockReturnValue(cursoRepository),
    };
    meilisearchService = { replaceAllDocuments: jest.fn() };

    service = new MeilisearchIndexerService(
      dataSource as any,
      {} as any,
      meilisearchService as any,
    );

    loggerLog = jest.spyOn((service as any).logger, 'log').mockImplementation();
  });

  afterEach(() => {
    loggerLog.mockRestore();
  });

  it('deve indexar cursos e aulas com campos esperados', async () => {
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
    expect(meilisearchService.replaceAllDocuments).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'curso-1',
          tipo: 'curso',
          titulo: 'Curso Node',
          searchText: expect.stringContaining('curso node'),
          semanticTags: expect.any(Array),
          semanticConcepts: expect.any(Array),
        }),
        expect.objectContaining({
          id: 'aula-10',
          tipo: 'aula',
          titulo: 'Nest',
          modulo: 'API',
          videoUrl: 'video',
          tempoAula: 15,
          searchText: expect.stringContaining('nest'),
        }),
      ]),
    );
    expect(result).toEqual({
      success: true,
      totalDocuments: 2,
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
    });
  });

  it('deve ignorar modulos sem aulas', async () => {
    cursoRepository.find.mockResolvedValue([
      {
        id: 3,
        nomeCurso: 'Curso Sem Modulo',
        descricaoCurta: '',
        descricaoDetalhada: '',
        modulos: [{ nomeModulo: 'Vazio' }],
      },
    ]);

    const result = await service.reindexCursosEAulas();

    expect(meilisearchService.replaceAllDocuments).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'curso-3',
      }),
    ]);
    expect(result).toMatchObject({
      success: true,
      totalDocuments: 1,
    });
  });

  it('deve deduplicar aulas repetidas dentro do mesmo modulo', async () => {
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
                nomeAula: 'Aula Repetida',
                descricaoConteudo: undefined,
                status: undefined,
                videoUrl: undefined,
                tempoAula: undefined,
              },
              {
                id: 40,
                nomeAula: 'Aula Repetida',
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

    const result = await service.reindexCursosEAulas();
    const documents = meilisearchService.replaceAllDocuments.mock.calls[0][0];

    expect(documents).toHaveLength(2);
    expect(documents).toEqual(
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
    });
  });

  it('deve enviar lista vazia quando nao houver cursos', async () => {
    cursoRepository.find.mockResolvedValue([]);

    const result = await service.reindexCursosEAulas();

    expect(meilisearchService.replaceAllDocuments).toHaveBeenCalledWith([]);
    expect(result).toEqual({
      success: true,
      totalDocuments: 0,
    });
  });
});
