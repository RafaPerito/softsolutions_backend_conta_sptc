import { runSeedUsuarios } from './create-usuarios.seed';

import { runSeedCursos } from './create-cursos.seed';

import { runSeedModulos } from './create-modulos.seed';

import { runSeedAulas } from './create-aulas.seed';

import { seedDataSource } from './seed-data-source';

async function runAllSeeds() {
  try {
    if (
      !seedDataSource.isInitialized
    ) {
      await seedDataSource.initialize();
    }

    console.log(
      '🌱 Iniciando seeds...',
    );

    await runSeedUsuarios();

    await runSeedCursos();

    await runSeedModulos();

    await runSeedAulas();

    console.log(
      '✅ Seeds finalizados!',
    );
  } catch (error) {
    console.error(
      '❌ Erro nos seeds:',
      error,
    );
  } finally {
    if (
      seedDataSource.isInitialized
    ) {
      await seedDataSource.destroy();
    }
  }
}

runAllSeeds();