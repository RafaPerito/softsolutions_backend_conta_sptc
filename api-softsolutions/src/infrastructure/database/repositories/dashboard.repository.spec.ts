import { DashboardRepository } from './dashboard.repository';

describe('DashboardRepository', () => {
  let repo: DashboardRepository;
  let inscricaoRepo: any;
  let certificadoRepo: any;
  let progressoRepo: any;
  let cursoRepo: any;
  let avaliacaoRepo: any;

  beforeEach(() => {
    inscricaoRepo = { findByUsuario: jest.fn() };
    certificadoRepo = { findAllByUsuario: jest.fn() };
    progressoRepo = {};
    cursoRepo = {};
    avaliacaoRepo = { };
    repo = new DashboardRepository(
      inscricaoRepo,
      certificadoRepo,
      progressoRepo,
      cursoRepo,
      avaliacaoRepo,
    );
  });

  it('deve retornar dashboard com dados mínimos', async () => {
    inscricaoRepo.findByUsuario.mockResolvedValue([]);
    certificadoRepo.findAllByUsuario.mockResolvedValue([]);
    repo.getHistoricoEstudo = jest.fn().mockReturnValue([]);
    repo.getCursosPorCategoria = jest.fn().mockReturnValue([]);
    repo.getNotasMedias = jest.fn().mockResolvedValue([]);
    repo.getTempoTotalEstudado = jest.fn().mockReturnValue(0);
    repo.getAvaliacoesPorUsuario = jest.fn().mockResolvedValue([]);
    repo.getDiasConsecutivos = jest.fn().mockReturnValue(0);
    repo.getSequenciaAtualConsecutiva = jest.fn().mockReturnValue(0);
    const result = await repo.getDashboardData(1);
    expect(result).toHaveProperty('totalCursosInscritos', 0);
    expect(result).toHaveProperty('totalCertificados', 0);
  });

  it('deve calcular progressoPorCurso corretamente', async () => {
    inscricaoRepo.findByUsuario.mockResolvedValue([
      {
        status: 'ativo',
        curso: { id: 1, nomeCurso: 'Curso' },
        progressoAulas: [ { concluida: true }, { concluida: false } ]
      }
    ]);
    certificadoRepo.findAllByUsuario.mockResolvedValue([{}]);
    repo.getHistoricoEstudo = jest.fn().mockReturnValue([{ data: '2024-01-01' }]);
    repo.getCursosPorCategoria = jest.fn().mockReturnValue([]);
    repo.getNotasMedias = jest.fn().mockResolvedValue([]);
    repo.getTempoTotalEstudado = jest.fn().mockReturnValue(0);
    repo.getAvaliacoesPorUsuario = jest.fn().mockResolvedValue([]);
    repo.getDiasConsecutivos = jest.fn().mockReturnValue(1);
    repo.getSequenciaAtualConsecutiva = jest.fn().mockReturnValue(1);
    const result = await repo.getDashboardData(1);
    expect(result.progressoPorCurso[0]).toHaveProperty('percentualConcluido', 50);
  });

  it('deve lidar com cursos sem progressoAulas', async () => {
    inscricaoRepo.findByUsuario.mockResolvedValue([
      {
        status: 'ativo',
        curso: { id: 1, nomeCurso: 'Curso' },
        progressoAulas: undefined
      }
    ]);
    certificadoRepo.findAllByUsuario.mockResolvedValue([{}]);
    repo.getHistoricoEstudo = jest.fn().mockReturnValue([]);
    repo.getCursosPorCategoria = jest.fn().mockReturnValue([]);
    repo.getNotasMedias = jest.fn().mockResolvedValue([]);
    repo.getTempoTotalEstudado = jest.fn().mockReturnValue(0);
    repo.getAvaliacoesPorUsuario = jest.fn().mockResolvedValue([]);
    repo.getDiasConsecutivos = jest.fn().mockReturnValue(0);
    repo.getSequenciaAtualConsecutiva = jest.fn().mockReturnValue(0);
    const result = await repo.getDashboardData(1);
    expect(result.progressoPorCurso[0]).toHaveProperty('percentualConcluido', 0);
  });
});
