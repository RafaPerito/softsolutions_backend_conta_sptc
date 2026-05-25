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
    0.12;

  // ====================================================
  // HEURISTIC MAP
  // ====================================================

  private readonly heuristicIntents: Record<
    string,
    string[]
  > = {
    saudacao: [
      'oi',
      'ola',
      'olá',
      'bom dia',
      'boa tarde',
      'boa noite',
      'e ai',
      'eae',
    ],

    agradecimento: [
      'obrigado',
      'obrigada',
      'valeu',
      'agradeco',
      'agradeço',
    ],

    despedida: [
      'tchau',
      'ate mais',
      'até mais',
      'falou',
      'fui',
    ],

    conversa: [
      'tudo bem',
      'como voce esta',
      'como você está',
      'como vai',
    ],

    buscar_curso: [
      'curso',
      'cursos',
      'aprender',
      'estudar',
      'treinamento',
      'formacao',
      'backend',
      'frontend',
      'java',
      'python',
      'react',
      'node',
      'nestjs',
      'spring',
      'docker',
      'sql',
      'programacao',
      'api',
      'microsservicos',
    ],

    buscar_aula: [
      'aula',
      'aulas',
      'video',
      'conteudo',
      'modulo',
      'explicacao',
    ],

    buscar_trilha: [
      'trilha',
      'carreira',
      'roadmap',
      'especializacao',
    ],

    buscar_conteudo: [
      'o que e',
      'como funciona',
      'explica',
      'conceito',
      'definicao',
    ],

    buscar_ia: [
      'ia',
      'ai',
      'machine learning',
      'deep learning',
      'chatgpt',
      'inteligencia artificial',
      'llm',
    ],

    login: [
      'login',
      'senha',
      'acesso',
      'entrar',
    ],

    certificado: [
      'certificado',
      'emitir',
      'baixar certificado',
    ],
  };

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

    const heuristicResult =
      this.detectHeuristicIntent(
        normalizedText,
      );

    const classifications =
      this.classifier.getClassifications(
        processedText,
      );

    const best = classifications[0];

    let finalIntent =
      this.fallbackIntent;

    let finalConfidence = 0;

    if (
      heuristicResult.confidence >=
      0.6
    ) {
      finalIntent =
        heuristicResult.intent;

      finalConfidence =
        heuristicResult.confidence;
    } else if (
      best &&
      best.value >=
        this.confidenceThreshold
    ) {
      finalIntent = best.label;

      finalConfidence = best.value;
    } else if (
      heuristicResult.confidence >
      0
    ) {
      finalIntent =
        heuristicResult.intent;

      finalConfidence =
        heuristicResult.confidence;
    }

    return {
      originalText,

      normalizedText,

      tokens,

      filteredTokens,

      stems,

      intent: finalIntent,

      confidence: Number(
        finalConfidence.toFixed(3),
      ),

      rankings: classifications.map(
        (item) => ({
          label: item.label,
          value: item.value,
        }),
      ),
    };
  }

  // ====================================================
  // HEURISTIC INTENT DETECTION
  // ====================================================

  private detectHeuristicIntent(
    text: string,
  ): {
    intent: string;
    confidence: number;
  } {
    let bestIntent =
      this.fallbackIntent;

    let bestScore = 0;

    for (const [
      intent,
      keywords,
    ] of Object.entries(
      this.heuristicIntents,
    )) {
      let score = 0;

      for (const keyword of keywords) {
        if (
          text.includes(
            keyword.toLowerCase(),
          )
        ) {
          score += 1;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }

    const confidence =
      Math.min(
        0.95,
        bestScore * 0.25,
      );

    return {
      intent: bestIntent,
      confidence,
    };
  }

  // ====================================================
  // TRAIN
  // ====================================================

  private train(): void {
    const samples: Array<{
      text: string;
      intent: string;
    }> = [
      // SAUDAÇÕES

      {
        text: 'oi',
        intent: 'saudacao',
      },

      {
        text: 'boa tarde',
        intent: 'saudacao',
      },

      {
        text: 'bom dia',
        intent: 'saudacao',
      },

      // AGRADECIMENTO

      {
        text: 'obrigado',
        intent: 'agradecimento',
      },

      {
        text: 'valeu',
        intent: 'agradecimento',
      },

      // CURSOS

      {
        text:
          'quero aprender backend com java',
        intent: 'buscar_curso',
      },

      {
        text:
          'curso de python',
        intent: 'buscar_curso',
      },

      {
        text:
          'curso de react',
        intent: 'buscar_curso',
      },

      // IA

      {
        text:
          'curso de inteligencia artificial',
        intent: 'buscar_ia',
      },

      {
        text:
          'machine learning',
        intent: 'buscar_ia',
      },

      // LOGIN

      {
        text:
          'erro no login',
        intent: 'login',
      },

      // CERTIFICADO

      {
        text:
          'emitir certificado',
        intent: 'certificado',
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

  // ====================================================
  // PREPROCESS
  // ====================================================

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
      this.tokenizer.tokenize(text) ??
      []
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

  private stem(
    token: string,
  ): string {
    return natural.PorterStemmerPt.stem(
      token,
    );
  }
}