describe('DashboardUseCase', () => {

const { BuildDashboardUseCase } = require('./build-dashboard.use-case');

describe('BuildDashboardUseCase', () => {
  it('deve instanciar a classe', () => {
    const useCase = new BuildDashboardUseCase({} as any);
    expect(useCase).toBeDefined();
  });
});
