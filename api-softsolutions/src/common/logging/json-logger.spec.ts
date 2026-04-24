
import { JsonLogger } from './json-logger';

describe('JsonLogger', () => {
  let logger: JsonLogger;
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new JsonLogger();
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it('deve logar info (log)', () => {
    logger.log('mensagem info', 'contexto');
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it('deve logar warn', () => {
    logger.warn('mensagem warn', 'contexto');
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it('deve logar debug', () => {
    logger.debug('mensagem debug', 'contexto');
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it('deve logar error', () => {
    logger.error('mensagem erro', 'stack', 'contexto');
    expect(stdoutSpy).toHaveBeenCalled();
  });
});
