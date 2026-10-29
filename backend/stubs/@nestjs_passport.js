// Stub CJS para @nestjs/passport - compatible con Jest 29
"use strict";

class AuthGuard {
  constructor(strategy) {
    this.strategy = strategy;
  }
  canActivate(context) {
    return true;
  }
}

const PassportModule = {
  register(options) {
    return {
      module: class PassportModule {},
      providers: [],
      exports: [],
    };
  },
  registerAsync(options) {
    return {
      module: class PassportModule {},
      providers: [],
      exports: [],
    };
  },
};

module.exports = { AuthGuard, PassportModule };