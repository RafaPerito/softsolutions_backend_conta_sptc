import { Injectable } from '@nestjs/common';
import * as natural from 'natural';
import { removeStopwords, porBr } from 'stopword';
import {
  IntentClassifier,
  IntentClassificationResult,
} from '../interfaces/intent-classifier.interface';

@Injectable()
export class IntentClassifierService implements IntentClassifier {
  private readonly tokenizer = new natural.WordTokenizer();
  private readonly classifier = new natural.BayesClassifier();
  private readonly fallbackIntent = 'desconhecida';
  private readonly confidenceThreshold = 0.35;

  constructor() {
    this.train();
  }

  classify(text: string): IntentClassificationResult {
    const originalText = text ?? '';
    const normalizedText = this.normalizeText(originalText);
    const tokens = this.tokenize(normalizedText);
    const filteredTokens = this.removeStopWords(tokens);
    const stems = filteredTokens.map((token) => this.stem(token));
    const processedText = stems.join(' ').trim();

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

    const classifications = this.classifier.getClassifications(processedText);
    const best = classifications[0];

    const bestIntent =
      best && best.value >= this.confidenceThreshold
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
      rankings: classifications.map((item) => ({
        label: item.label,
        value: item.value,
      })),
    };
  }

  private train(): void {
    const samples: Array<{ text: string; intent: string }> = [
      // samples mantidos
      { text: 'quero buscar curso de python', intent: 'buscar_curso' },
      // ... (mantenha os demais exemplos do seu arquivo original)
    ];

    for (const sample of samples) {
      const processed = this.preprocess(sample.text);

      if (processed) {
        this.classifier.addDocument(processed, sample.intent);
      }
    }

    this.classifier.train();
  }

  private preprocess(text: string): string {
    const normalizedText = this.normalizeText(text);
    const tokens = this.tokenize(normalizedText);
    const filteredTokens = this.removeStopWords(tokens);
    const stems = filteredTokens.map((token) => this.stem(token));

    return stems.join(' ').trim();
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenize(text: string): string[] {
    return (this.tokenizer.tokenize(text) ?? []).filter(Boolean);
  }

  private removeStopWords(tokens: string[]): string[] {
    const customStopwords = [
      'quero',
      'gostaria',
      'buscar',
      'busque',
      'procure',
      'procurar',
      'pesquisar',
      'pesquise',
      'encontre',
      'achar',
      'ver',
      'mostra',
      'mostrar',
      'me',
      'pra',
      'pro',
      'tem',
      'quais',
      'voces',
      'voce',
    ];

    return removeStopwords(tokens, [...porBr, ...customStopwords]).filter(
      (token) => token.length > 1,
    );
  }

  private stem(token: string): string {
    return natural.PorterStemmerPt.stem(token);
  }
}