describe('AvaliacaoModel', () => {

const { AvaliacaoModel } = require('./avaliacao.model');

describe('AvaliacaoModel', () => {
  it('deve criar um modelo de avaliação', () => {
    const model: AvaliacaoModel = {
      id: 1,
      nota: 5,
      comentario: 'Ótimo',
      criadoEm: new Date(),
      atualizadoEm: new Date(),
      usuarioId: 1,
      cursoId: 1,
    };
    expect(model).toBeDefined();
    expect(model.nota).toBe(5);
    expect(model.usuarioId).toBe(1);
  });
});
