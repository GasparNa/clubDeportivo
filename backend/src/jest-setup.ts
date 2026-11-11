// Jest setup: mock de módulos ESM de NestJS para compatibilidad con Jest 29
import 'reflect-metadata';

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