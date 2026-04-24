import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InfrastructureModule } from '../../../infrastructure/infrastructure.module';
import { UsuarioRepository } from '../../../infrastructure/database/repositories/usuario.repository';
import { CursoRepository } from '../../../infrastructure/database/repositories/curso.repository';
import { ModuloRepository } from '../../../infrastructure/database/repositories/modulo.repository';
import { AulaRepository } from '../../../infrastructure/database/repositories/aula.repository';
import { InscricaoRepository } from '../../../infrastructure/database/repositories/inscricao.repository';
import { ProgressoAulaRepository } from '../../../infrastructure/database/repositories/progresso-aula.repository';

describe('Integração: Progresso de Aula', () => {
  let usuarioRepo: UsuarioRepository;
  let cursoRepo: CursoRepository;
  let moduloRepo: ModuloRepository;
  let aulaRepo: AulaRepository;
  let inscricaoRepo: InscricaoRepository;
  let progressoRepo: ProgressoAulaRepository;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          dropSchema: true,
          autoLoadEntities: true,
          synchronize: true,
        }),
        InfrastructureModule,
      ],
    }).compile();

    usuarioRepo = module.get<UsuarioRepository>(UsuarioRepository);
    cursoRepo = module.get<CursoRepository>(CursoRepository);
    moduloRepo = module.get<ModuloRepository>(ModuloRepository);
    aulaRepo = module.get<AulaRepository>(AulaRepository);
    inscricaoRepo = module.get<InscricaoRepository>(InscricaoRepository);
    progressoRepo = module.get<ProgressoAulaRepository>(ProgressoAulaRepository);
  });

  it('deve registrar progresso de aula para usuário inscrito', async () => {
    const usuario = await usuarioRepo.create({
      nomeUsuario: 'aluno1',
      cpfUsuario: '11111111111',
      email: 'aluno1@teste.com',
      senha: '123',
      tipo: 'aluno',
      telefone: '11999999999',
    });
    const curso = await cursoRepo.create({
      nomeCurso: 'Curso Progresso',
      tempoCurso: 10,
      descricaoCurta: 'desc',
      descricaoDetalhada: 'detalhe',
      professor: 'prof',
      categoria: 'cat',
      status: 'ativo',
      avaliacao: 5,
      imagemCurso: 'img.png',
      modulos: [],
    });
    const modulo = await moduloRepo.create({
      nomeModulo: 'Módulo Progresso',
      tempoModulo: 5,
      curso,
      aulas: [],
    });
    const aula = await aulaRepo.create({
      nomeAula: 'Aula Progresso',
      tempoAula: 30,
      videoUrl: 'https://youtube.com/aula-progresso',
      descricaoConteudo: 'Conteúdo',
      modulo,
      materialApoio: ['material.pdf'],
    });
    const inscricao = await inscricaoRepo.create({
      usuario,
      curso,
      progressoAulas: [],
    });
    // Marca progresso
    const progresso = await progressoRepo.create({
      inscricao,
      aula,
      concluida: true,
      dataConclusao: new Date(),
    });
    // Valida progresso
    expect(progresso.inscricao.id).toBe(inscricao.id);
    expect(progresso.aula.id).toBe(aula.id);
    expect(progresso.concluida).toBe(true);
  });
});
