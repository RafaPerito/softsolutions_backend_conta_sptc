import { UpdateUsuarioUseCase } from './update-usuario.use-case';
import { UsuarioRepository } from '../../../infrastructure/database/repositories/usuario.repository';
import * as bcrypt from 'bcrypt';
import { UsuarioModel } from '../../../domain/models/usuario.model';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('UpdateUsuarioUseCase', () => {
  let useCase: UpdateUsuarioUseCase;
  let usuarioRepo: jest.Mocked<UsuarioRepository>;

  const usuarioBase: UsuarioModel = {
    id: 1,
    nomeUsuario: 'Lucas',
    cpfUsuario: '04852227012',
    email: 'lucas@email.com',
    senha: 'hash-atual',
    tipo: 'aluno',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    (bcrypt.hash as jest.Mock).mockResolvedValue('novo-hash');
    usuarioRepo = { findById: jest.fn(), update: jest.fn() } as any;
    useCase = new UpdateUsuarioUseCase(usuarioRepo);
  });

  it('deve atualizar usuario com telefone formatado em 11 digitos', async () => {
    usuarioRepo.findById.mockResolvedValue(usuarioBase);
    usuarioRepo.update.mockImplementation(async (_id, data) => ({
      ...usuarioBase,
      ...data,
    }));

    const result = await useCase.execute(1, { telefone: '11999999999' });

    expect(usuarioRepo.update).toHaveBeenCalledWith(1, {
      telefone: '(11) 99999-9999',
    });
    expect(result).not.toHaveProperty('senha');
  });

  it('deve atualizar usuario com telefone formatado em 10 digitos', async () => {
    usuarioRepo.findById.mockResolvedValue(usuarioBase);
    usuarioRepo.update.mockImplementation(async (_id, data) => ({
      ...usuarioBase,
      ...data,
    }));

    const result = await useCase.execute(1, { telefone: '1133334444' });

    expect(result.telefone).toBe('(11) 3333-4444');
  });

  it('deve lancar erro se usuario nao for encontrado', async () => {
    usuarioRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute(1, {})).rejects.toThrow('Usu');
  });

  it('deve lancar erro se tentar alterar CPF', async () => {
    usuarioRepo.findById.mockResolvedValue(usuarioBase);

    await expect(
      useCase.execute(1, { cpfUsuario: '12345678900' }),
    ).rejects.toThrow('CPF');
  });

  it('deve lancar erro para email invalido', async () => {
    usuarioRepo.findById.mockResolvedValue(usuarioBase);

    await expect(useCase.execute(1, { email: 'invalido' })).rejects.toThrow(
      'Email',
    );
  });

  it('deve lancar erro para telefone invalido', async () => {
    usuarioRepo.findById.mockResolvedValue(usuarioBase);

    await expect(useCase.execute(1, { telefone: '123' })).rejects.toThrow(
      'Telefone',
    );
  });

  it('deve remover alteracao de tipo e manter senha quando ja corresponder ao hash', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
    usuarioRepo.findById.mockResolvedValue(usuarioBase);
    usuarioRepo.update.mockImplementation(async (_id, data) => ({
      ...usuarioBase,
      ...data,
    }));

    await useCase.execute(1, { tipo: 'administrador', senha: '123456' });

    expect(usuarioRepo.update).toHaveBeenCalledWith(1, { senha: '123456' });
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it('deve gerar novo hash quando a senha for diferente', async () => {
    usuarioRepo.findById.mockResolvedValue(usuarioBase);
    usuarioRepo.update.mockImplementation(async (_id, data) => ({
      ...usuarioBase,
      ...data,
    }));

    await useCase.execute(1, { senha: 'nova-senha' });

    expect(usuarioRepo.update).toHaveBeenCalledWith(1, { senha: 'novo-hash' });
  });
});
