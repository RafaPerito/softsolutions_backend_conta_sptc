import { PLATFORM_NAVIGATION } from './platform-navigation.dictionary';

describe('PLATFORM_NAVIGATION', () => {
  it('deve possuir entradas de navegacao validas', () => {
    expect(PLATFORM_NAVIGATION.length).toBeGreaterThan(0);

    for (const item of PLATFORM_NAVIGATION) {
      expect(item.keywords.length).toBeGreaterThan(0);
      expect(item.navigation.length).toBeGreaterThan(0);

      for (const navigation of item.navigation) {
        expect(navigation.label).toEqual(expect.any(String));
        expect(navigation.route).toMatch(/^\/.+/);
        expect(navigation.description).toEqual(expect.any(String));
      }
    }
  });

  it('deve mapear areas principais da plataforma', () => {
    const routes = PLATFORM_NAVIGATION.flatMap((item) =>
      item.navigation.map((navigation) => navigation.route),
    );

    expect(routes).toEqual(
      expect.arrayContaining([
        '/login',
        '/cadastro',
        '/certificados',
        '/cursos-lista',
        '/quem-somos',
        '/contato',
        '/recuperar-senha',
      ]),
    );
  });

  it('deve incluir palavras-chave com variacoes comuns', () => {
    const keywords = PLATFORM_NAVIGATION.flatMap((item) => item.keywords);

    expect(keywords).toEqual(
      expect.arrayContaining([
        'login',
        'cadastroo',
        'certificados',
        'backend',
        'softsolutions',
        'suporte',
        'recuperar senha',
      ]),
    );
  });
});
