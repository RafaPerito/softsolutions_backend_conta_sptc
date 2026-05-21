import { Injectable } from '@nestjs/common';

import * as natural from 'natural';

import {
  removeStopwords,
  porBr,
} from 'stopword';

import {
  IntentClassifier,
  IntentClassificationResult,
} from '../interfaces/intent-classifier.interface';

@Injectable()
export class IntentClassifierService
  implements IntentClassifier
{
  private readonly tokenizer =
    new natural.WordTokenizer();

  private readonly classifier =
    new natural.BayesClassifier();

  private readonly fallbackIntent =
    'desconhecida';

  private readonly confidenceThreshold =
    0.25;

  constructor() {
    this.train();
  }

  classify(
    text: string,
  ): IntentClassificationResult {
    const originalText = text ?? '';

    const normalizedText =
      this.normalizeText(originalText);

    const tokens =
      this.tokenize(normalizedText);

    const filteredTokens =
      this.removeStopWords(tokens);

    const stems = filteredTokens.map(
      (token) => this.stem(token),
    );

    const processedText = stems
      .join(' ')
      .trim();

    if (!processedText) {
      return {
        originalText,
        normalizedText,
        tokens,
        filteredTokens,
        stems,
        intent: this.fallbackIntent,
        confidence: 0,
        rankings: [],
      };
    }

    const classifications =
      this.classifier.getClassifications(
        processedText,
      );

    const best = classifications[0];

    const bestIntent =
      best &&
      best.value >=
        this.confidenceThreshold
        ? best.label
        : this.fallbackIntent;

    return {
      originalText,
      normalizedText,
      tokens,
      filteredTokens,
      stems,
      intent: bestIntent,
      confidence: best?.value ?? 0,
      rankings: classifications.map(
        (item) => ({
          label: item.label,
          value: item.value,
        }),
      ),
    };
  }

  private train(): void {
    const samples: Array<{
      text: string;
      intent: string;
    }> = [
      // ====================================================
      // CURSOS
      // ====================================================

      {
        text: 'curso de python',
        intent: 'buscar_curso',
      },

      {
        text: 'curso de java',
        intent: 'buscar_curso',
      },

      {
        text: 'curso de javascript',
        intent: 'buscar_curso',
      },

      {
        text: 'curso de frontend',
        intent: 'buscar_curso',
      },

      {
        text: 'curso backend',
        intent: 'buscar_curso',
      },

      {
        text: 'curso de docker',
        intent: 'buscar_curso',
      },

      {
        text: 'curso de sql',
        intent: 'buscar_curso',
      },

      {
        text: 'curso de react',
        intent: 'buscar_curso',
      },

      {
        text: 'curso de node',
        intent: 'buscar_curso',
      },

      {
        text: 'curso de spring boot',
        intent: 'buscar_curso',
      },

      {
        text: 'curso de nestjs',
        intent: 'buscar_curso',
      },

      {
        text: 'quero estudar backend',
        intent: 'buscar_curso',
      },

      {
        text: 'quero aprender frontend',
        intent: 'buscar_curso',
      },

      {
        text: 'quero aprender programacao',
        intent: 'buscar_curso',
      },

      {
        text: 'quero estudar tecnologia',
        intent: 'buscar_curso',
      },

      // ====================================================
      // AULAS
      // ====================================================

      {
        text: 'buscar aulas',
        intent: 'buscar_aula',
      },

      {
        text: 'aulas de docker',
        intent: 'buscar_aula',
      },

      {
        text: 'video aula de sql',
        intent: 'buscar_aula',
      },

      {
        text: 'aula de python',
        intent: 'buscar_aula',
      },

      {
        text: 'aula de java',
        intent: 'buscar_aula',
      },

      {
        text: 'aula de react',
        intent: 'buscar_aula',
      },

      {
        text: 'conteudo sobre backend',
        intent: 'buscar_aula',
      },

      // ====================================================
      // TRILHAS
      // ====================================================

      {
        text: 'trilha backend',
        intent: 'buscar_trilha',
      },

      {
        text: 'trilha frontend',
        intent: 'buscar_trilha',
      },

      {
        text: 'trilha de aprendizado',
        intent: 'buscar_trilha',
      },

      {
        text: 'trilha java backend',
        intent: 'buscar_trilha',
      },

      // ====================================================
      // CATEGORIAS
      // ====================================================

      {
        text: 'cursos de backend',
        intent: 'buscar_categoria',
      },

      {
        text: 'cursos frontend',
        intent: 'buscar_categoria',
      },

      {
        text: 'cursos de banco de dados',
        intent: 'buscar_categoria',
      },

      {
        text: 'cursos de devops',
        intent: 'buscar_categoria',
      },

      // ====================================================
      // CONTEÚDO
      // ====================================================

      {
        text: 'o que e spring boot',
        intent: 'buscar_conteudo',
      },

      {
        text: 'explicacao sobre docker',
        intent: 'buscar_conteudo',
      },

      {
        text: 'conteudo sobre java',
        intent: 'buscar_conteudo',
      },

      {
        text: 'o que e react',
        intent: 'buscar_conteudo',
      },

      {
        text: 'como funciona nodejs',
        intent: 'buscar_conteudo',
      },

      // ====================================================
      // CERTIFICADO
      // ====================================================

      {
        text: 'meu certificado',
        intent: 'certificado',
      },

      {
        text: 'emitir certificado',
        intent: 'certificado',
      },

      {
        text: 'baixar certificado',
        intent: 'certificado',
      },

      // ====================================================
      // LOGIN
      // ====================================================

      {
        text: 'nao consigo entrar',
        intent: 'login',
      },

      {
        text: 'erro no login',
        intent: 'login',
      },

      {
        text: 'senha invalida',
        intent: 'login',
      },

      {
        text: 'nao consigo acessar',
        intent: 'login',
      },

      // ====================================================
      // IA
      // ====================================================

      {
        text: 'curso de inteligencia artificial',
        intent: 'buscar_ia',
      },

      {
        text: 'machine learning',
        intent: 'buscar_ia',
      },

      {
        text: 'deep learning',
        intent: 'buscar_ia',
      },

      {
        text: 'chatgpt',
        intent: 'buscar_ia',
      },

      {
        text: 'curso de ia',
        intent: 'buscar_ia',
      },
    ];

    for (const sample of samples) {
      const processed =
        this.preprocess(sample.text);

      if (processed) {
        this.classifier.addDocument(
          processed,
          sample.intent,
        );
      }
    }

    this.classifier.train();
  }

  private preprocess(
    text: string,
  ): string {
    const normalizedText =
      this.normalizeText(text);

    const tokens =
      this.tokenize(normalizedText);

    const filteredTokens =
      this.removeStopWords(tokens);

    const stems = filteredTokens.map(
      (token) => this.stem(token),
    );

    return stems.join(' ').trim();
  }

  private normalizeText(
    text: string,
  ): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenize(
    text: string,
  ): string[] {
    return (
      this.tokenizer.tokenize(text) ?? []
    ).filter(Boolean);
  }

  private removeStopWords(
    tokens: string[],
  ): string[] {
    const customStopwords = [
      'quero',
      'gostaria',
      'buscar',
      'busque',
      'procure',
      'pesquisar',
      'mostrar',
      'mostre',
      'me',
      'pra',
      'pro',
      'tem',
      'quais',
      'voce',
      'voces',
      'sobre',
      'de',
      'do',
      'da',
      'dos',
      'das',
      'o',
      'a',
      'os',
      'as',
      'um',
      'uma',
    ];

    return removeStopwords(tokens, [
      ...porBr,
      ...customStopwords,
    ]).filter(
      (token) => token.length > 1,
    );
  }

  private stem(token: string): string {
    return natural.PorterStemmerPt.stem(
      token,
    );
  }
}