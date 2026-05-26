import { ConfigService } from '@nestjs/config';
import { MeiliSearch } from 'meilisearch';
import { MeilisearchService } from './meilisearch.service';

const mockIndex = {
  updateSearchableAttributes: jest.fn(),
  updateFilterableAttributes: jest.fn(),
  updateSortableAttributes: jest.fn(),
  updateTypoTolerance: jest.fn(),
  updateStopWords: jest.fn(),
  updateRankingRules: jest.fn(),
  deleteAllDocuments: jest.fn(),
  addDocuments: jest.fn(),
  getStats: jest.fn(),
  search: jest.fn(),
};

const mockClient = {
  getIndex: jest.fn(),
  createIndex: jest.fn(),
  index: jest.fn(),
  waitForTask: jest.fn(),
};

jest.mock('meilisearch', () => ({
  MeiliSearch: jest.fn().mockImplementation(() => mockClient),
}));

describe('MeilisearchService', () => {
  let service: MeilisearchService;
  let configService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          MEILI_HOST: 'http://localhost:7700',
          MEILI_API_KEY: 'key',
        };

        return values[key];
      }),
    };
    mockClient.getIndex.mockResolvedValue({});
    mockClient.createIndex.mockResolvedValue({ taskUid: 1 });
    mockClient.index.mockReturnValue(mockIndex);
    mockClient.waitForTask.mockResolvedValue({ status: 'succeeded' });

    for (const method of [
      'updateSearchableAttributes',
      'updateFilterableAttributes',
      'updateSortableAttributes',
      'updateTypoTolerance',
      'updateStopWords',
      'updateRankingRules',
      'deleteAllDocuments',
      'addDocuments',
    ]) {
      mockIndex[method].mockResolvedValue({ taskUid: 1 });
    }

    mockIndex.getStats.mockResolvedValue({ numberOfDocuments: 1 });
    mockIndex.search.mockResolvedValue({ hits: [{ id: '1', titulo: 'Node' }] });
    service = new MeilisearchService(configService as ConfigService);
    jest.spyOn((service as any).logger, 'log').mockImplementation();
    jest.spyOn((service as any).logger, 'error').mockImplementation();
  });

  it('deve instanciar o cliente com host e apiKey configurados', () => {
    expect(MeiliSearch).toHaveBeenCalledWith({
      host: 'http://localhost:7700',
      apiKey: 'key',
    });
  });

  it('deve usar valores padrao quando configuracao nao existir', () => {
    configService.get.mockReturnValue(undefined);

    new MeilisearchService(configService as ConfigService);

    expect(MeiliSearch).toHaveBeenLastCalledWith({
      host: 'http://meilisearch:7700',
      apiKey: '',
    });
  });

  it('deve criar indice quando ele nao existir e configurar atributos', async () => {
    mockClient.getIndex.mockRejectedValueOnce(new Error('not found'));

    await service.configureIndex();

    expect(mockClient.createIndex).toHaveBeenCalledWith('softsolutions', {
      primaryKey: 'id',
    });
    expect(mockIndex.updateSearchableAttributes).toHaveBeenCalled();
    expect(mockIndex.updateFilterableAttributes).toHaveBeenCalledWith([
      'tipo',
      'categoria',
      'professor',
    ]);
    expect(mockIndex.updateTypoTolerance).toHaveBeenCalledWith({
      enabled: true,
      minWordSizeForTypos: {
        oneTypo: 5,
        twoTypos: 9,
      },
    });
    expect(mockClient.waitForTask).toHaveBeenCalled();
  });

  it('deve substituir todos os documentos e validar task final', async () => {
    await service.replaceAllDocuments([{ id: '1' }]);

    expect(mockIndex.deleteAllDocuments).toHaveBeenCalled();
    expect(mockIndex.addDocuments).toHaveBeenCalledWith([{ id: '1' }]);
    expect(mockIndex.getStats).toHaveBeenCalled();
  });

  it('deve lancar erro quando task de insercao falhar', async () => {
    mockClient.waitForTask
      .mockResolvedValueOnce({ status: 'succeeded' })
      .mockResolvedValueOnce({ status: 'succeeded' })
      .mockResolvedValueOnce({ status: 'succeeded' })
      .mockResolvedValueOnce({ status: 'succeeded' })
      .mockResolvedValueOnce({ status: 'succeeded' })
      .mockResolvedValueOnce({ status: 'succeeded' })
      .mockResolvedValueOnce({ status: 'succeeded' })
      .mockResolvedValueOnce({ status: 'failed' });

    await expect(service.replaceAllDocuments([{ id: '1' }])).rejects.toThrow(
      'failed',
    );
  });

  it('deve apagar documentos', async () => {
    await service.deleteAllDocuments();

    expect(mockIndex.deleteAllDocuments).toHaveBeenCalled();
    expect(mockClient.waitForTask).toHaveBeenCalledWith(1);
  });

  it('deve buscar com query normalizada', async () => {
    await expect(service.search('  Node  ')).resolves.toEqual([
      { id: '1', titulo: 'Node' },
    ]);

    expect(mockIndex.search).toHaveBeenCalledWith('node', {
      limit: 15,
      showRankingScore: true,
      matchingStrategy: 'all',
      attributesToHighlight: ['titulo', 'descricao', 'curso'],
    });
  });

  it('deve retornar sugestoes unicas', async () => {
    mockIndex.search.mockResolvedValueOnce({
      hits: [
        { titulo: 'Node', curso: 'Backend' },
        { titulo: 'Node', curso: 'APIs' },
      ],
    });

    await expect(service.getSuggestions('no')).resolves.toEqual([
      'Node',
      'Backend',
      'APIs',
    ]);
  });

  it('deve manter fallback de busca vetorial desabilitado', async () => {
    jest.spyOn(service, 'search').mockResolvedValue([{ id: '1' } as any]);

    expect(service.supportsVectorSearch()).toBe(false);
    await expect(service.searchHybrid('node', [0.1])).resolves.toEqual([
      { id: '1' },
    ]);
    await expect(
      service.rerankByEmbedding([{ id: '2' } as any], [0.2]),
    ).resolves.toEqual([{ id: '2' }]);
  });
});
