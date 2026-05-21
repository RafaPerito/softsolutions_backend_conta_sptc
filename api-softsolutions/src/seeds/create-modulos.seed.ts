import { ModuloEntity } from '../infrastructure/database/entities/modulo.entity';

import { CursoEntity } from '../infrastructure/database/entities/curso.entity';

import { seedDataSource } from './seed-data-source';

export async function runSeedModulos() {
  const moduloRepo =
    seedDataSource.getRepository(
      ModuloEntity,
    );

  const cursoRepo =
    seedDataSource.getRepository(
      CursoEntity,
    );

  // ====================================================
  // EVITA DUPLICAÇÃO
  // ====================================================

  const total =
    await moduloRepo.count();

  if (total > 0) {
    console.log(
      'Módulos já existem. Seed ignorado.',
    );

    return;
  }

  const cursos =
    await cursoRepo.find();

  const modulosPorCurso = [
    {
      curso:
        'Desenvolvimento Web com Python',

      modulos: [
        {
          nome:
            'Introdução ao Python e Flask',

          tempo: 15,
        },

        {
          nome:
            'Modelagem de Dados e SQLAlchemy',

          tempo: 20,
        },

        {
          nome:
            'Integração de APIs e Autenticação',

          tempo: 25,
        },

        {
          nome:
            'Gerenciamento de Sessões e Cookies',

          tempo: 15,
        },

        {
          nome:
            'Desempenho e Escalabilidade',

          tempo: 20,
        },
      ],
    },
  ];

  for (const curso of cursos) {
    const modulosCurso =
      modulosPorCurso.find(
        (m) =>
          m.curso ===
          curso.nomeCurso,
      );

    if (!modulosCurso) {
      continue;
    }

    for (const modulo of modulosCurso.modulos) {
      await moduloRepo.insert({
        nomeModulo:
          modulo.nome,

        tempoModulo:
          modulo.tempo,

        curso,
      });
    }
  }

  console.log(
    'Módulos inseridos com sucesso!',
  );
}