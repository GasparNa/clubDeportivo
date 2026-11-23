const SECRETO_VALIDO = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUV';

type ValidarEntorno = () => void;

describe('validarEntorno (JWT_SECRET)', () => {
  let validarEntorno: ValidarEntorno;
  let stderr: jest.SpyInstance;
  let salida: string;
  let nodeEnvOriginal: string | undefined;
  let jwtOriginal: string | undefined;
  let databaseUrlOriginal: string | undefined;

  beforeEach(async () => {
    nodeEnvOriginal = process.env.NODE_ENV;
    jwtOriginal = process.env.JWT_SECRET;
    databaseUrlOriginal = process.env.DATABASE_URL;
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = SECRETO_VALIDO;
    process.env.DATABASE_URL = 'postgresql://usuario:clave@localhost:5432/club';

    jest.resetModules();
    salida = '';
    stderr = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation((mensaje: any) => {
        salida += String(mensaje);
        return true;
      });
    jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    ({ validarEntorno } = await import('./main'));
  });

  afterEach(() => {
    process.env.NODE_ENV = nodeEnvOriginal;
    process.env.JWT_SECRET = jwtOriginal;
    process.env.DATABASE_URL = databaseUrlOriginal;
    jest.restoreAllMocks();
  });

  function fatal(): any {
    return JSON.parse(salida.trim().split('\n').filter(Boolean).pop() ?? '{}');
  }

  it('rechaza un secreto corto con JSON fatal', () => {
    process.env.JWT_SECRET = 'corto';

    validarEntorno();

    expect(fatal().level).toBe('fatal');
    expect(fatal().message).toContain('JWT_SECRET');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('rechaza un placeholder conocido con JSON fatal', () => {
    process.env.JWT_SECRET = 'your-jwt-secret-change-me';

    validarEntorno();

    expect(fatal().level).toBe('fatal');
    expect(fatal().message).toContain('JWT_SECRET');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('rechaza el placeholder de CI aunque tenga más de 32 caracteres', () => {
    process.env.JWT_SECRET = 'ci-placeholder-ci-placeholder-32chars';

    validarEntorno();

    expect(fatal().level).toBe('fatal');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('acepta un secreto de 48 caracteres sin placeholders', () => {
    validarEntorno();

    expect(stderr).not.toHaveBeenCalled();
    expect(process.exit).not.toHaveBeenCalled();
  });
});
