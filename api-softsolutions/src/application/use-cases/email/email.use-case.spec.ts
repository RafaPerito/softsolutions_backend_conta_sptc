describe('EmailUseCase', () => {

const { EnviarEmailUseCase } = require('./enviar-email.use-case');

describe('EnviarEmailUseCase', () => {
  it('deve instanciar a classe', () => {
    const useCase = new EnviarEmailUseCase();
    expect(useCase).toBeDefined();
  });
});
