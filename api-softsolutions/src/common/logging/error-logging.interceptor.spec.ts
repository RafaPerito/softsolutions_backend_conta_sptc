
import { ErrorLoggingInterceptor } from './error-logging.interceptor';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { JsonLogger } from './json-logger';

describe('ErrorLoggingInterceptor', () => {
  let interceptor: ErrorLoggingInterceptor;
  let context: Partial<ExecutionContext>;
  let callHandler: Partial<CallHandler>;
  let logger: JsonLogger;

  beforeEach(() => {
    logger = new JsonLogger();
    interceptor = new ErrorLoggingInterceptor(logger);
    context = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ requestId: 'req-id' }),
      }),
      getClass: jest.fn().mockReturnValue({ name: 'TestContext' }),
    };
    callHandler = {
      handle: jest.fn().mockReturnValue({ pipe: jest.fn() }),
    };
  });

  it('deve instanciar o interceptor', () => {
    expect(interceptor).toBeDefined();
  });

  it('deve chamar handle', () => {
    interceptor.intercept(context as any, callHandler as any);
    expect(callHandler.handle).toHaveBeenCalled();
  });
});
