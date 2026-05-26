import {
  Injectable,
  Logger,
} from '@nestjs/common';

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
  // NORMALIZE
  // ====================================================

  private normalize(
    text: string,
  ): string {
    return (text ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ====================================================
  // BUILD SEARCH TEXT
  // ====================================================

  private buildSearchText(
    values: string[],
  ): string {
    return values
      .filter(Boolean)
      .map((v) => this.normalize(v))
      .join(' ')
      .trim();
  }

  // ====================================================
  // DETECT SEMANTIC DATA
  // ====================================================

  private detectSemanticData(
    text: string,
  ) {
    const normalized =
      this.normalize(text);

    const semanticTags =
      new Set<string>();

    const semanticConcepts =
      new Set<string>();

    const semanticCategories =
      new Set<string>();

    for (const [key, knowledge] of Object.entries(
      SEMANTIC_KNOWLEDGE,
    )) {
      const terms = [
        key,

        ...knowledge.synonyms,

        ...(knowledge.relatedTerms ?? []),
      ];

      const matched =
        terms.some((term) =>
          normalized.includes(
            this.normalize(term),
          ),
        );

      if (!matched) {
        continue;
      }

      // ====================================================
      // TAG PRINCIPAL
      // ====================================================

      semanticTags.add(
        this.normalize(key),
      );

      // ====================================================
      // CONCEPTS
      // ====================================================

      knowledge.concepts.forEach(
        (concept) =>
          semanticConcepts.add(
            this.normalize(
              concept,
            ),
          ),
      );

      // ====================================================
      // CATEGORY
      // ====================================================

      semanticCategories.add(
        this.normalize(
          knowledge.category,
        ),
      );
    }

    return {
      semanticTags: [
        ...semanticTags,
      ],

      semanticConcepts: [
        ...semanticConcepts,
      ],

      semanticCategories: [
        ...semanticCategories,
      ],
    };
  }

  // ====================================================
  // REINDEX
  // ====================================================

  async reindexCursosEAulas() {
    this.logger.log(
      '🚀 Iniciando reindexação...',
    );

    const cursos =
      await this.loadCursosComAulas();

    this.logger.log(`
================ DATABASE DEBUG ================

TOTAL CURSOS:
${cursos.length}
`);

    const documentsMap =
      new Map<string, any>();

    // ====================================================
    // CURSOS
    // ====================================================

    for (const curso of cursos) {
      this.logger.log(
        `📚 Curso ${curso.id} - ${curso.nomeCurso}`,
      );

      const semanticData =
        this.detectSemanticData(`
${curso.nomeCurso}

${curso.descricaoCurta}

${curso.descricaoDetalhada}

${curso.categoria}
`);

      const cursoSearchText =
        this.buildSearchText([
          curso.nomeCurso,

          curso.descricaoCurta,

          curso.descricaoDetalhada,

          curso.professor,

          curso.categoria,

          ...semanticData.semanticTags,

          ...semanticData.semanticConcepts,
        ]);

      const cursoDoc = {
        id: `curso-${curso.id}`,

        tipo: 'curso',

        cursoId: curso.id,

        aulaId: null,

        titulo:
          curso.nomeCurso,

        descricao:
          curso.descricaoCurta ||
          '',

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
          curso.status ||
          'ativo',

        avaliacao:
          curso.avaliacao ||
          0,

        imagemCurso:
          curso.imagemCurso ||
          null,

        tempoCurso:
          curso.tempoCurso ||
          null,

        modulo: null,

        curso:
          curso.nomeCurso,

        videoUrl: null,

        searchText:
          cursoSearchText,

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
      // MODULOS / AULAS
      // ====================================================

      if (
        curso.modulos &&
        Array.isArray(
          curso.modulos,
        )
      ) {
        for (const modulo of curso.modulos) {
          const aulas =
            (modulo as any)
              .aulas || [];

          const aulasUnicas =
            new Map<
              number,
              any
            >();

          for (const aula of aulas) {
            aulasUnicas.set(
              aula.id,
              aula,
            );
          }

          for (const aula of aulasUnicas.values()) {
            this.logger.log(
              `🎥 Aula ${aula.id} - ${aula.nomeAula}`,
            );

            const semanticData =
              this.detectSemanticData(`
${curso.nomeCurso}

${curso.descricaoDetalhada}

${modulo.nomeModulo}

${aula.nomeAula}

${aula.descricaoConteudo}
`);

            const aulaSearchText =
              this.buildSearchText([
                aula.nomeAula,

                aula.descricaoConteudo,

                curso.nomeCurso,

                curso.professor,

                curso.categoria,

                modulo.nomeModulo,

                ...semanticData.semanticTags,

                ...semanticData.semanticConcepts,
              ]);

            const aulaDoc = {
              id: `aula-${aula.id}`,

              tipo: 'aula',

              cursoId:
                curso.id,

              aulaId:
                aula.id,

              titulo:
                aula.nomeAula,

              descricao:
                aula.descricaoConteudo ||
                '',

              descricaoDetalhada:
                aula.descricaoConteudo ||
                '',

              categoria:
                curso.categoria ||
                '',

              conteudo:
                aula.descricaoConteudo ||
                '',

              professor:
                curso.professor ||
                '',

              status:
                (aula as any)
                  .status ||
                'ativo',

              avaliacao:
                curso.avaliacao ||
                0,

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
                aula.videoUrl ||
                null,

              tempoAula:
                aula.tempoAula ||
                null,

              searchText:
                aulaSearchText,

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
    // FINAL ARRAY
    // ====================================================

    const documents =
      Array.from(
        documentsMap.values(),
      );

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
    // SEND TO MEILI
    // ====================================================

    this.logger.log(
      '📦 Enviando documentos...',
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