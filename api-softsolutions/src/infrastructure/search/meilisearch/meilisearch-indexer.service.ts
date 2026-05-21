import { Injectable, Logger } from '@nestjs/common';

import { DataSource } from 'typeorm';

import { QueryUnderstandingService } from '../nlp/query-understanding.service';

import { MeilisearchService } from './meilisearch.service';

import {
  SEMANTIC_KNOWLEDGE,
} from '../nlp/semantic-knowledge.dictionary';

import { CursoEntity } from '../../database/entities/curso.entity';

@Injectable()
export class MeilisearchIndexerService {
  private readonly logger = new Logger(
    MeilisearchIndexerService.name,
  );

  constructor(
    private readonly dataSource: DataSource,

    private readonly queryUnderstanding: QueryUnderstandingService,

    private readonly meiliService: MeilisearchService,
  ) {}

  // ====================================================
  // DETECÇÃO SEMÂNTICA
  // ====================================================

  private detectSemanticData(text: string) {
    const normalized = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const semanticTags =
      new Set<string>();

    const semanticConcepts =
      new Set<string>();

    const semanticCategories =
      new Set<string>();

    for (const [key, knowledge] of Object.entries(
      SEMANTIC_KNOWLEDGE,
    )) {
      const relatedTerms = [
        key,
        ...knowledge.synonyms,
      ];

      const matched =
        relatedTerms.some((term) =>
          normalized.includes(
            term.toLowerCase(),
          ),
        );

      if (!matched) continue;

      semanticTags.add(key);

      knowledge.synonyms.forEach((s) =>
        semanticTags.add(s),
      );

      knowledge.concepts.forEach((c) =>
        semanticConcepts.add(c),
      );

      semanticCategories.add(
        knowledge.category,
      );
    }

    return {
      semanticTags: [...semanticTags],

      semanticConcepts: [
        ...semanticConcepts,
      ],

      semanticCategories: [
        ...semanticCategories,
      ],
    };
  }

  // ====================================================
  // REINDEXAÇÃO
  // ====================================================

  async reindexCursosEAulas() {
    this.logger.log(
      '🚀 Iniciando reindexação semântica...',
    );

    const cursos =
      await this.loadCursosComAulas();

    // ====================================================
    // DEBUG DATABASE
    // ====================================================

    this.logger.log(`
================ DATABASE DEBUG ================

TOTAL CURSOS:
${cursos.length}

PRIMEIRO CURSO:
${JSON.stringify(
  cursos[0],
  null,
  2,
)}
`);

    // ====================================================
    // EVITA DUPLICAÇÃO
    // ====================================================

    const documentsMap =
      new Map<string, any>();

    // ====================================================
    // PROCESSA CURSOS
    // ====================================================

    for (const curso of cursos) {
      this.logger.log(
        `📚 Processando curso ${curso.id} - ${curso.nomeCurso}`,
      );

      const semanticData =
        this.detectSemanticData(`
        ${curso.nomeCurso}
        ${curso.descricaoCurta}
        ${curso.descricaoDetalhada}
        ${curso.categoria}
      `);

      const cursoDoc: any = {
        id: `curso-${curso.id}`,

        tipo: 'curso',

        cursoId: curso.id,

        aulaId: null,

        titulo: curso.nomeCurso,

        descricao:
          curso.descricaoCurta || '',

        descricaoDetalhada:
          curso.descricaoDetalhada ||
          '',

        categoria:
          curso.categoria || '',

        conteudo:
          curso.descricaoDetalhada ||
          '',

        professor:
          curso.professor || '',

        status:
          curso.status || 'ativo',

        avaliacao:
          curso.avaliacao || 0,

        imagemCurso:
          curso.imagemCurso || null,

        tempoCurso:
          curso.tempoCurso || null,

        modulo: null,

        curso: curso.nomeCurso,

        videoUrl: null,

        // ====================================================
        // CAMPO AGREGADOR
        // ====================================================

        searchText: `
curso
curso online
curso de tecnologia
curso profissionalizante
aprendizado
educacao
educação
professor
modulo
módulo
conteudo
conteúdo
video aula
vídeo aula
backend
frontend
programacao
programação

${curso.nomeCurso}

${curso.descricaoCurta}

${curso.descricaoDetalhada}

${curso.professor}

${curso.categoria}

${semanticData.semanticTags.join(
  ' ',
)}

${semanticData.semanticConcepts.join(
  ' ',
)}

${semanticData.semanticCategories.join(
  ' ',
)}
`,

        semanticTags:
          semanticData.semanticTags,

        semanticConcepts:
          semanticData.semanticConcepts,

        semanticCategories:
          semanticData.semanticCategories,
      };

      documentsMap.set(
        cursoDoc.id,
        cursoDoc,
      );

      // ====================================================
      // PROCESSA MÓDULOS
      // ====================================================

      if (
        curso.modulos &&
        Array.isArray(curso.modulos)
      ) {
        for (const modulo of curso.modulos) {
          const aulas =
            (modulo as any).aulas ||
            [];

          // ====================================================
          // EVITA AULAS DUPLICADAS
          // ====================================================

          const aulasUnicas =
            new Map<number, any>();

          for (const aula of aulas) {
            aulasUnicas.set(
              aula.id,
              aula,
            );
          }

          for (const aula of aulasUnicas.values()) {
            this.logger.log(
              `🎥 Processando aula ${aula.id} - ${aula.nomeAula}`,
            );

            const semanticData =
              this.detectSemanticData(`
              ${curso.nomeCurso}
              ${curso.descricaoCurta}
              ${curso.descricaoDetalhada}

              ${modulo.nomeModulo}

              ${aula.nomeAula}
              ${aula.descricaoConteudo}
            `);

            const aulaDoc: any = {
              id: `aula-${aula.id}`,

              tipo: 'aula',

              cursoId: curso.id,

              aulaId: aula.id,

              titulo: aula.nomeAula,

              descricao:
                aula.descricaoConteudo ||
                '',

              descricaoDetalhada:
                aula.descricaoConteudo ||
                '',

              categoria:
                curso.categoria || '',

              conteudo:
                aula.descricaoConteudo ||
                '',

              professor:
                curso.professor || '',

              status:
                (aula as any).status ||
                'ativo',

              avaliacao:
                curso.avaliacao || 0,

              imagemCurso:
                curso.imagemCurso ||
                null,

              tempoCurso:
                curso.tempoCurso ||
                null,

              modulo:
                modulo.nomeModulo ||
                '',

              curso:
                curso.nomeCurso,

              videoUrl:
                aula.videoUrl || null,

              tempoAula:
                aula.tempoAula || null,

              // ====================================================
              // CAMPO AGREGADOR
              // ====================================================

              searchText: `
aula
video aula
vídeo aula
conteudo educacional
conteúdo educacional
professor
curso
modulo
módulo
aprendizado
backend
frontend
programacao
programação

${aula.nomeAula}

${aula.descricaoConteudo}

${curso.nomeCurso}

${curso.professor}

${curso.categoria}

${modulo.nomeModulo}

${semanticData.semanticTags.join(
  ' ',
)}

${semanticData.semanticConcepts.join(
  ' ',
)}

${semanticData.semanticCategories.join(
  ' ',
)}
`,

              semanticTags:
                semanticData.semanticTags,

              semanticConcepts:
                semanticData.semanticConcepts,

              semanticCategories:
                semanticData.semanticCategories,
            };

            documentsMap.set(
              aulaDoc.id,
              aulaDoc,
            );
          }
        }
      }
    }

    // ====================================================
    // CONVERTE MAP PARA ARRAY
    // ====================================================

    const documents = Array.from(
      documentsMap.values(),
    );

    // ====================================================
    // DEBUG DOCUMENTS
    // ====================================================

    this.logger.log(`
================ DOCUMENT DEBUG ================

TOTAL DOCUMENTS:
${documents.length}

PRIMEIRO DOCUMENTO:
${JSON.stringify(
  documents[0],
  null,
  2,
)}
`);

    // ====================================================
    // INDEXAÇÃO
    // ====================================================

    this.logger.log(
      '📦 Enviando documentos para o Meilisearch...',
    );

    await this.meiliService.replaceAllDocuments(
      documents,
    );

    this.logger.log(
      `✅ Reindexação concluída. ${documents.length} documentos enviados.`,
    );

    return {
      success: true,

      totalDocuments:
        documents.length,
    };
  }

  // ====================================================
  // LOAD DATABASE
  // ====================================================

  private async loadCursosComAulas(): Promise<
    CursoEntity[]
  > {
    const repo =
      this.dataSource.getRepository(
        CursoEntity,
      );

    return repo.find({
      relations: [
        'modulos',
        'modulos.aulas',
      ],
    });
  }
}