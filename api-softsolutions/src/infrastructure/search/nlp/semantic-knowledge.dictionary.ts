export interface SemanticKnowledgeEntry {
  synonyms: string[];

  concepts: string[];

  relatedTerms: string[];

  boostTerms: string[];

  intents: string[];

  exclusions?: string[];

  category: string;

  searchPriority: number;
}

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
      'spring',
      'java',
      'python',
      'php',
      'node',
    ],

    concepts: [
      'desenvolvimento backend',
      'microsservicos',
      'banco de dados',
      'integracao',
    ],

    relatedTerms: [
      'spring boot',
      'flask',
      'django',
      'fastapi',
      'nestjs',
      'express',
    ],

    boostTerms: [
      'backend',
      'api',
      'java',
      'python',
      'php',
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
      'ux',
      'interface',
      'web',
      'javascript',
      'react',
      'angular',
      'vue',
      'html',
      'css',
    ],

    concepts: [
      'interfaces',
      'experiencia do usuario',
      'spa',
      'responsividade',
    ],

    relatedTerms: [
      'browser',
      'dom',
      'componentes',
      'layout',
      'web design',
    ],

    boostTerms: [
      'frontend',
      'react',
      'javascript',
      'html',
      'css',
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
      'jpa',
      'hibernate',
      'jdk',
      'jvm',
      'maven',
    ],

    concepts: [
      'backend',
      'api',
      'orientacao a objetos',
      'rest',
      'microsservicos',
    ],

    relatedTerms: [
      'backend',
      'api',
      'servidor',
      'web',
      'spring framework',
    ],

    boostTerms: [
      'java',
      'spring',
      'backend',
      'api',
    ],

    intents: [
      'buscar_curso',
      'buscar_aula',
    ],

    exclusions: ['javascript'],

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
      'node',
      'nodejs',
      'react',
      'angular',
      'vue',
      'next',
    ],

    concepts: [
      'frontend',
      'spa',
      'web',
      'interface',
    ],

    relatedTerms: [
      'frontend',
      'browser',
      'dom',
      'ui',
      'componentes',
    ],

    boostTerms: [
      'javascript',
      'frontend',
      'react',
      'node',
    ],

    intents: [
      'buscar_curso',
      'buscar_aula',
    ],

    category: 'frontend',

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
      'pandas',
      'numpy',
    ],

    concepts: [
      'backend',
      'dados',
      'automacao',
      'ia',
    ],

    relatedTerms: [
      'machine learning',
      'api',
      'backend',
      'dados',
      'automacao',
      'data science',
    ],

    boostTerms: [
      'python',
      'django',
      'flask',
      'fastapi',
    ],

    intents: [
      'buscar_curso',
      'buscar_aula',
      'buscar_ia',
    ],

    category: 'backend',

    searchPriority: 10,
  },

  // ====================================================
  // SQL / DATABASE
  // ====================================================

  sql: {
    synonyms: [
      'postgresql',
      'mysql',
      'oracle',
      'sqlite',
      'sqlserver',
    ],

    concepts: [
      'dados',
      'persistencia',
      'query',
      'banco de dados',
    ],

    relatedTerms: [
      'database',
      'dados',
      'sqlserver',
      'consultas',
      'modelagem',
    ],

    boostTerms: [
      'sql',
      'database',
      'postgresql',
      'mysql',
    ],

    intents: [
      'buscar_curso',
      'buscar_aula',
    ],

    category: 'database',

    searchPriority: 9,
  },

  // ====================================================
  // DOCKER / DEVOPS
  // ====================================================

  docker: {
    synonyms: [
      'container',
      'compose',
      'kubernetes',
      'devops',
    ],

    concepts: [
      'infraestrutura',
      'deploy',
      'cloud',
    ],

    relatedTerms: [
      'cloud',
      'deploy',
      'containerizacao',
      'infraestrutura',
    ],

    boostTerms: [
      'docker',
      'devops',
      'kubernetes',
    ],

    intents: [
      'buscar_curso',
      'buscar_aula',
    ],

    category: 'devops',

    searchPriority: 9,
  },

  // ====================================================
  // IA
  // ====================================================

  ia: {
    synonyms: [
      'ai',
      'machine learning',
      'deep learning',
      'llm',
      'chatgpt',
      'inteligencia artificial',
    ],

    concepts: [
      'inteligencia artificial',
      'dados',
      'automacao',
      'redes neurais',
    ],

    relatedTerms: [
      'machine learning',
      'deep learning',
      'neural network',
      'generative ai',
      'modelos de linguagem',
    ],

    boostTerms: [
      'ia',
      'machine learning',
      'chatgpt',
      'deep learning',
    ],

    intents: [
      'buscar_ia',
      'buscar_curso',
    ],

    category: 'ai',

    searchPriority: 10,
  },

  // ====================================================
  // CURSO
  // ====================================================

  curso: {
    synonyms: [
      'treinamento',
      'aprendizado',
      'formacao',
      'capacitação',
    ],

    concepts: [
      'educacao',
      'plataforma',
    ],

    relatedTerms: [
      'aula',
      'conteudo',
      'certificado',
      'modulo',
    ],

    boostTerms: [
      'curso',
      'aula',
      'conteudo',
    ],

    intents: [
      'buscar_curso',
    ],

    category: 'education',

    searchPriority: 8,
  },
};