export interface SemanticKnowledgeEntry {
  synonyms: string[];

  concepts: string[];

  relatedTerms?: string[];

  boostTerms: string[];

  intents: string[];

  exclusions?: string[];

  category: string;

  searchPriority: number;
}

// ====================================================
// AMBIGUOUS TERMS
// ====================================================

export const AMBIGUOUS_TERMS: Record<
  string,
  string[]
> = {
  java: ['javascript'],

  javascript: ['java'],

  react: ['reactive'],

  sql: ['nosql'],
};

// ====================================================
// CONTROLLED SEMANTIC KNOWLEDGE
// ====================================================

export const SEMANTIC_KNOWLEDGE: Record<
  string,
  SemanticKnowledgeEntry
> = {
  // ====================================================
  // BACKEND
  // ====================================================

  backend: {
    synonyms: [
      'api',
      'servidor',
      'rest',
    ],

    concepts: [
      'desenvolvimento backend',
    ],

    boostTerms: [
      'backend',
      'api',
    ],

    intents: [
      'buscar_curso',
      'buscar_aula',
    ],

    category: 'backend',

    searchPriority: 10,
  },

  // ====================================================
  // FRONTEND
  // ====================================================

  frontend: {
    synonyms: [
      'ui',
      'interface',
      'web',
    ],

    concepts: [
      'frontend web',
    ],

    boostTerms: [
      'frontend',
      'web',
    ],

    intents: [
      'buscar_curso',
      'buscar_aula',
    ],

    category: 'frontend',

    searchPriority: 10,
  },

  // ====================================================
  // JAVA
  // ====================================================

  java: {
    synonyms: [
      'spring',
      'spring boot',
    ],

    concepts: [
      'backend java',
    ],

    boostTerms: [
      'java',
      'spring',
    ],

    exclusions: [
      'javascript',
    ],

    intents: [
      'buscar_curso',
      'buscar_aula',
    ],

    category: 'backend',

    searchPriority: 10,
  },

  // ====================================================
  // JAVASCRIPT
  // ====================================================

  javascript: {
    synonyms: [
      'js',
      'typescript',
    ],

    concepts: [
      'frontend javascript',
    ],

    boostTerms: [
      'javascript',
      'frontend',
    ],

    intents: [
      'buscar_curso',
      'buscar_aula',
    ],

    category: 'frontend',

    searchPriority: 10,
  },

  // ====================================================
  // REACT
  // ====================================================

  react: {
    synonyms: [
      'reactjs',
      'jsx',
    ],

    concepts: [
      'frontend react',
    ],

    boostTerms: [
      'react',
      'reactjs',
    ],

    exclusions: [
      'reactive',
    ],

    intents: [
      'buscar_curso',
      'buscar_aula',
    ],

    category: 'frontend',

    searchPriority: 10,
  },

  // ====================================================
  // NODE
  // ====================================================

  node: {
    synonyms: [
      'nodejs',
      'nestjs',
      'express',
    ],

    concepts: [
      'backend node',
    ],

    boostTerms: [
      'node',
      'nestjs',
    ],

    intents: [
      'buscar_curso',
      'buscar_aula',
    ],

    category: 'backend',

    searchPriority: 10,
  },

  // ====================================================
  // PYTHON
  // ====================================================

  python: {
    synonyms: [
      'django',
      'flask',
      'fastapi',
    ],

    concepts: [
      'backend python',
    ],

    boostTerms: [
      'python',
      'django',
      'flask',
    ],

    intents: [
      'buscar_curso',
      'buscar_aula',
    ],

    category: 'backend',

    searchPriority: 10,
  },

  // ====================================================
  // SQL
  // ====================================================

  sql: {
    synonyms: [
      'postgresql',
      'mysql',
    ],

    concepts: [
      'banco de dados',
    ],

    boostTerms: [
      'sql',
      'database',
    ],

    intents: [
      'buscar_curso',
      'buscar_aula',
    ],

    category: 'database',

    searchPriority: 9,
  },

  // ====================================================
  // DOCKER
  // ====================================================

  docker: {
    synonyms: [
      'container',
      'compose',
    ],

    concepts: [
      'infraestrutura',
    ],

    boostTerms: [
      'docker',
      'devops',
    ],

    intents: [
      'buscar_curso',
      'buscar_aula',
    ],

    category: 'devops',

    searchPriority: 9,
  },

  // ====================================================
  // CURSO
  // ====================================================

  curso: {
    synonyms: [
      'treinamento',
      'aprendizado',
    ],

    concepts: [
      'educacao',
    ],

    boostTerms: [
      'curso',
      'aula',
    ],

    intents: [
      'buscar_curso',
    ],

    category: 'education',

    searchPriority: 8,
  },

  // ====================================================
  // CERTIFICADO
  // ====================================================

  certificado: {
    synonyms: [
      'diploma',
      'comprovante',
    ],

    concepts: [
      'emissao',
    ],

    boostTerms: [
      'certificado',
    ],

    intents: [
      'certificado',
    ],

    category: 'support',

    searchPriority: 10,
  },

  // ====================================================
  // LOGIN
  // ====================================================

  login: {
    synonyms: [
      'acesso',
      'senha',
      'entrar',
    ],

    concepts: [
      'usuario',
    ],

    boostTerms: [
      'login',
      'senha',
    ],

    intents: [
      'login',
    ],

    category: 'support',

    searchPriority: 10,
  },
};