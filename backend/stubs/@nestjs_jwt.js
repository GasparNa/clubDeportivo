// Stub CJS para @nestjs/jwt - compatible con Jest 29
"use strict";

class JwtService {
  constructor() {}
  sign(payload, options) { return 'mock-jwt-token'; }
  signAsync(payload, options) { return Promise.resolve('mock-jwt-token'); }
  verify(token, options) { return { sub: 'mock-user-id' }; }
  verifyAsync(token, options) { return Promise.resolve({ sub: 'mock-user-id' }); }
  decode(token, options) { return { sub: 'mock-user-id' }; }
}

const JwtModule = {
  register(options) {
    return {
      module: class JwtModule {},
      providers: [{ provide: JwtService, useValue: new JwtService() }],
      exports: [JwtService],
    };
  },
  registerAsync(options) {
    return {
      module: class JwtModule {},
      providers: [{ provide: JwtService, useValue: new JwtService() }],
      exports: [JwtService],
    };
  },
};

module.exports = { JwtService, JwtModule };