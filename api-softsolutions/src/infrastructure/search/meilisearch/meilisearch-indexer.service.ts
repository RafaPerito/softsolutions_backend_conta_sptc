import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeilisearchService } from './meilisearch.service';
import { CursoEntity } from '../../database/entities/curso.entity';

@Injectable()
export class MeilisearchIndexerService {
  private readonly logger = new Logger(MeilisearchIndexerService.name);

  constructor(
    @InjectRepository(CursoEntity)
    private readonly cursoRepository: Repository<CursoEntity>,
    private readonly meilisearchService: MeilisearchService,
  ) {}

  async reindexCursosEAulas(): Promise<void> {
    const cursos = await this.cursoRepository.find({
      relations: ['modulos', 'modulos.aulas'],
    });

    const cursoDocs = cursos.map((curso: any) => ({
      id: `curso-${curso.id}`,
      tipo: 'curso',
      cursoId: curso.id,
      aulaId: null,
      titulo: curso.nomeCurso,
      descricao: `${curso.descricaoCurta || ''} ${curso.descricaoDetalhada || ''}`.trim(),
      categoria: curso.categoria || '',
      tags: [
        curso.categoria,
        curso.professor,
        ...(curso.modulos?.map((modulo: any) => modulo.nomeModulo) || []),
      ].filter(Boolean),
      conteudo: [
        curso.nomeCurso,
        curso.descricaoCurta,
        curso.descricaoDetalhada,
        curso.professor,
        curso.categoria,
        ...(curso.modulos?.map((modulo: any) => modulo.nomeModulo) || []),
        ...(curso.modulos?.flatMap(
          (modulo: any) => modulo.aulas?.map((aula: any) => aula.nomeAula) || [],
        ) || []),
      ]
        .filter(Boolean)
        .join(' '),
      professor: curso.professor || '',
      status: curso.status || '',
      avaliacao: curso.avaliacao ?? null,
      imagemCurso: curso.imagemCurso || '',
      tempoCurso: curso.tempoCurso ?? null,
      modulo: '',
      curso: curso.nomeCurso,
      videoUrl: '',
      tempoAula: null,
    }));

    const aulaDocs = cursos.flatMap((curso: any) =>
      (curso.modulos || []).flatMap((modulo: any) =>
        (modulo.aulas || []).map((aula: any) => ({
          id: `aula-${aula.id}`,
          tipo: 'aula',
          cursoId: curso.id,
          aulaId: aula.id,
          titulo: aula.nomeAula,
          descricao: aula.descricaoConteudo || '',
          categoria: curso.categoria || '',
          tags: [
            curso.categoria,
            curso.professor,
            modulo.nomeModulo,
            ...(aula.materialApoio || []),
          ].filter(Boolean),
          conteudo: [
            aula.nomeAula,
            aula.descricaoConteudo,
            modulo.nomeModulo,
            curso.nomeCurso,
            curso.descricaoCurta,
            curso.descricaoDetalhada,
            curso.categoria,
            curso.professor,
            ...(aula.materialApoio || []),
          ]
            .filter(Boolean)
            .join(' '),
          professor: curso.professor || '',
          status: curso.status || '',
          avaliacao: curso.avaliacao ?? null,
          imagemCurso: curso.imagemCurso || '',
          tempoCurso: curso.tempoCurso ?? null,
          modulo: modulo.nomeModulo || '',
          curso: curso.nomeCurso,
          videoUrl: aula.videoUrl || '',
          tempoAula: aula.tempoAula ?? null,
        })),
      ),
    );

    const documents = [...cursoDocs, ...aulaDocs];

    if (!documents.length) {
      this.logger.warn('Nenhum curso ou aula encontrado para indexação.');
      return;
    }

    await this.meilisearchService.addDocuments(documents as any);

    this.logger.log(
      `Indexação concluída: ${cursoDocs.length} cursos e ${aulaDocs.length} aulas enviados ao Meilisearch.`,
    );
  }
}