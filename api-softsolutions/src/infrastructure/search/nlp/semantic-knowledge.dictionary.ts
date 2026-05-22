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

  c: ['c#', 'c++'],
};

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
      'nestjs',
      'express',
    ],

    concepts: [
      'desenvolvimento backend',
      'microsservicos',
      'banco de dados',
      'integracao',
      'arquitetura server side',
    ],

    relatedTerms: [
      'spring boot',
      'flask',
      'django',
      'fastapi',
      'nestjs',
      'express',
      'api rest',
      'jwt',
    ],

    boostTerms: [
      'backend',
      'api',
      'java',
      'python',
      'php',
      'nodejs',
    ],

    intents: [
      'buscar_curso',
      'buscar_aula',
      'buscar_trilha',
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
      'frontend web',
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
      'buscar_trilha',
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
      'java backend',
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
      'java web',
    ],

    boostTerms: [
      'java',
      'spring',
      'backend',
      'api',
      'spring boot',
    ],

    intents: [
      'buscar_curso',
      'buscar_aula',
      'buscar_trilha',
    ],

    exclusions: [
      'javascript',
    ],

    category: 'backend',

    searchPriority: 10,
  },

  // ====================================================
  // SPRING
  // ====================================================

  spring: {
    synonyms: [
      'spring boot',
      'java',
      'jpa',
      'hibernate',
    ],

    concepts: [
      'backend',
      'api',
      'microsservicos',
    ],

    relatedTerms: [
      'java backend',
      'spring framework',
      'rest api',
    ],

    boostTerms: [
      'spring',
      'spring boot',
      'java',
    ],

    intents: [
      'buscar_curso',
      'buscar_aula',
    ],

    exclusions: [
      'javascript',
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
  // REACT
  // ====================================================

  react: {
    synonyms: [
      'reactjs',
      'jsx',
      'frontend',
    ],

    concepts: [
      'spa',
      'componentizacao',
      'frontend moderno',
    ],

    relatedTerms: [
      'componentes',
      'hooks',
      'frontend',
      'estado',
    ],

    boostTerms: [
      'react',
      'reactjs',
    ],

    intents: [
      'buscar_curso',
      'buscar_aula',
    ],

    exclusions: [
      'reactive',
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
      'express',
      'nestjs',
    ],

    concepts: [
      'backend',
      'api',
      'javascript backend',
    ],

    relatedTerms: [
      'servidor',
      'backend javascript',
      'rest api',
    ],

    boostTerms: [
      'node',
      'nestjs',
      'nodejs',
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
  // SQL
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
      'consultas',
      'modelagem',
      'relacional',
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
  // DOCKER
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
      'trilha',
    ],

    boostTerms: [
      'curso',
      'aula',
      'conteudo',
      'trilha',
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
      'certificacao',
    ],

    concepts: [
      'emissao',
      'conclusao',
      'curso finalizado',
    ],

    relatedTerms: [
      'baixar certificado',
      'emitir certificado',
      'pdf',
    ],

    boostTerms: [
      'certificado',
      'certificacao',
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
      'autenticacao',
    ],

    concepts: [
      'usuario',
      'credenciais',
    ],

    relatedTerms: [
      'esqueci senha',
      'erro login',
      'nao consigo acessar',
    ],

    boostTerms: [
      'login',
      'senha',
      'acesso',
    ],

    intents: [
      'login',
    ],

    category: 'support',

    searchPriority: 10,
  },
};