import * as bcrypt from 'bcrypt';

import { UsuarioEntity } from '../infrastructure/database/entities/usuario.entity';

import { seedDataSource } from './seed-data-source';

export async function runSeedUsuarios() {
  const repo =
    seedDataSource.getRepository(
      UsuarioEntity,
    );

  // ====================================================
  // EVITA DUPLICAÇÃO
  // ====================================================

  const total =
    await repo.count();

  if (total > 0) {
    console.log(
      'Usuários já existem. Seed ignorado.',
    );

    return;
  }

  const senhaCriptografada =
    await bcrypt.hash(
      '123456',
      10,
    );

  await repo.insert([
    {
      nomeUsuario: 'Admin',

      cpfUsuario:
        '11144477735',

      email:
        'admin@teste.com',

      senha:
        senhaCriptografada,

      tipo:
        'administrador',

      telefone:
        '11999990000',
    },
  ]);

  console.log(
    'Usuários inseridos com sucesso!',
  );
}