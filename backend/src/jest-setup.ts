// Jest setup: mock de módulos ESM de NestJS para compatibilidad con Jest 29
jest.mock('@nestjs/common', () => {
  const actual = jest.requireActual('@nestjs/common');
  return actual;
});

jest.mock('@nestjs/core', () => {
  const actual = jest.requireActual('@nestjs/core');
  return actual;
});

jest.mock('@nestjs/jwt', () => ({
  JwtService: jest.fn().mockImplementation(() => ({
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
    verify: jest.fn().mockReturnValue({ sub: 'mock' }),
    verifyAsync: jest.fn().mockResolvedValue({ sub: 'mock' }),
    decode: jest.fn().mockReturnValue({ sub: 'mock' }),
  })),
  JwtModule: {
    register: jest.fn().mockReturnValue({
      module: class {},
      providers: [],
      exports: [],
    }),
    registerAsync: jest.fn().mockReturnValue({
      module: class {},
      providers: [],
      exports: [],
    }),
  },
}));

jest.mock('@nestjs/passport', () => ({
  PassportModule: {
    register: jest.fn().mockReturnValue({
      module: class {},
      providers: [],
      exports: [],
    }),
    registerAsync: jest.fn().mockReturnValue({
      module: class {},
      providers: [],
      exports: [],
    }),
  },
  AuthGuard: jest.fn().mockImplementation((strategy?: string) => {
    return class {
      canActivate() {
        return true;
      }
    };
  }),
}));

jest.mock('passport-jwt', () => ({
  Strategy: class {},
  ExtractJwt: {
    fromAuthHeaderAsBearerToken: jest.fn().mockReturnValue(() => 'mock-token'),
    fromHeader: jest.fn(),
    fromUrlQueryParameter: jest.fn(),
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$10$hashedpassword'),
  compare: jest.fn().mockResolvedValue(true),
  genSalt: jest.fn().mockResolvedValue('salt'),
}));

jest.mock('class-validator', () => ({
  ...jest.requireActual('class-validator'),
  validate: jest.fn().mockResolvedValue([]),
  validateOrReject: jest.fn().mockResolvedValue(undefined),
  IsString: jest.fn()(),
  IsEmail: jest.fn()(),
  IsOptional: jest.fn()(),
  IsNumber: jest.fn()(),
  IsUUID: jest.fn()(),
  IsEnum: jest.fn()(),
  IsDateString: jest.fn()(),
  MinLength: jest.fn()(),
  MaxLength: jest.fn()(),
  Min: jest.fn()(),
  Max: jest.fn()(),
}));

jest.mock('class-transformer', () => ({
  ...jest.requireActual('class-transformer'),
  Transform: jest.fn()(),
  Type: jest.fn()(),
  Exclude: jest.fn()(),
  Expose: jest.fn()(),
  plainToClass: jest.fn((cls, plain) => plain),
  plainToInstance: jest.fn((cls, plain) => plain),
  classToPlain: jest.fn((obj) => obj),
  instanceToPlain: jest.fn((obj) => obj),
}));