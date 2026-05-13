import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { QueryUnderstandingService } from '../nlp/query-understanding.service';
import { MeilisearchService } from './meilisearch.service';

import { CursoEntity } from '../../database/entities/curso.entity';

@Injectable()
export class MeilisearchIndexerService {
  private readonly logger = new Logger(MeilisearchIndexerService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly queryUnderstanding: QueryUnderstandingService,
    private readonly meiliService: MeilisearchService,
  ) {}

  async reindexCursosEAulas() {
    this.logger.log('🚀 Iniciando reindexação semântica...');

    const cursos = await this.loadCursosComAulas();

    const documents: any[] = [];

    let cursosComEmbedding = 0;
    let aulasComEmbedding = 0;

    for (const curso of cursos) {
      this.logger.log(
        `📚 Processando curso ${curso.id} - ${curso.nomeCurso}`,
      );

      const cursoDoc: any = {
        id: `curso-${curso.id}`,
        tipo: 'curso',

        cursoId: curso.id,
        aulaId: null,

        titulo: curso.nomeCurso,
        descricao: curso.descricaoCurta || '',
        descricaoDetalhada: curso.descricaoDetalhada || '',

        categoria: curso.categoria || '',
        conteudo: curso.descricaoDetalhada || '',

        professor: curso.professor || '',
        status: curso.status || 'ativo',

        avaliacao: curso.avaliacao || 0,

        imagemCurso: curso.imagemCurso || null,
        tempoCurso: curso.tempoCurso || null,

        modulo: null,
        curso: curso.nomeCurso,

        videoUrl: null,
      };

      try {
        const textoCurso = `
          ${curso.nomeCurso}
          ${curso.descricaoCurta || ''}
          ${curso.descricaoDetalhada || ''}
        `;

        const processed =
          await this.queryUnderstanding.process(textoCurso);

        if (processed.embedding?.length) {
          cursoDoc._vectors = {
            default: processed.embedding,
          };

          cursosComEmbedding++;

          this.logger.log(
            `✅ Embedding do curso ${curso.id} gerado.`,
          );
        }
      } catch (error: any) {
        this.logger.warn(
          `❌ Erro embedding curso ${curso.id}`,
        );

        console.error(error);
      }

      documents.push(cursoDoc);

      if (curso.modulos && Array.isArray(curso.modulos)) {
        for (const modulo of curso.modulos) {
          const aulas = (modulo as any).aulas || [];

          for (const aula of aulas) {
            this.logger.log(
              `🎥 Processando aula ${aula.id} - ${aula.nomeAula}`,
            );

            const aulaDoc: any = {
              id: `aula-${aula.id}`,
              tipo: 'aula',

              cursoId: curso.id,
              aulaId: aula.id,

              titulo: aula.nomeAula,

              descricao: aula.descricaoConteudo || '',
              descricaoDetalhada:
                aula.descricaoConteudo || '',

              categoria: curso.categoria || '',
              conteudo: aula.descricaoConteudo || '',

              professor: curso.professor || '',

              status: (aula as any).status || 'ativo',

              avaliacao: curso.avaliacao || 0,

              imagemCurso: curso.imagemCurso || null,
              tempoCurso: curso.tempoCurso || null,

              modulo: modulo.nomeModulo || '',
              curso: curso.nomeCurso,

              videoUrl: aula.videoUrl || null,
              tempoAula: aula.tempoAula || null,
            };

            try {
              const textoAula = `
                ${aula.nomeAula}
                ${aula.descricaoConteudo || ''}
              `;

              const processed =
                await this.queryUnderstanding.process(textoAula);

              if (processed.embedding?.length) {
                aulaDoc._vectors = {
                  default: processed.embedding,
                };

                aulasComEmbedding++;

                this.logger.log(
                  `✅ Embedding da aula ${aula.id} gerado.`,
                );
              }
            } catch (error: any) {
              this.logger.warn(
                `❌ Erro embedding aula ${aula.id}`,
              );

              console.error(error);
            }

            documents.push(aulaDoc);
          }
        }
      }
    }

    this.logger.log('📦 Enviando documentos para o Meilisearch...');

    await this.meiliService.replaceAllDocuments(documents);

    this.logger.log(
      `✅ Reindexação concluída. ${documents.length} documentos enviados.`,
    );

    this.logger.log(
      `📊 Resumo:
      Cursos com embedding: ${cursosComEmbedding}
      Aulas com embedding: ${aulasComEmbedding}
      Total documentos: ${documents.length}`,
    );

    return {
      success: true,
      totalDocuments: documents.length,
      cursosComEmbedding,
      aulasComEmbedding,
    };
  }

  private async loadCursosComAulas(): Promise<CursoEntity[]> {
    const repo = this.dataSource.getRepository(CursoEntity);

    return repo.find({
      relations: ['modulos', 'modulos.aulas'],
    });
  }
}