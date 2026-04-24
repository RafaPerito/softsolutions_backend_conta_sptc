describe('UsuarioModel', () => {

const { UsuarioModel } = require('./usuario.model');

describe('UsuarioModel', () => {
  it('deve criar um modelo de usuário', () => {
    const model: UsuarioModel = {
      id: 1,
      nomeUsuario: 'Teste',
      cpfUsuario: '123',
      email: 'teste@teste.com',
      senha: '123',
      tipo: 'aluno',
      telefone: '999',
    };
    expect(model).toBeDefined();
    expect(model.nomeUsuario).toBe('Teste');
  });
});
