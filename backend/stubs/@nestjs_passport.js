// Stub CJS para @nestjs/passport - compatible con Jest 29
"use strict";

// La API real es una factory: AuthGuard('jwt') devuelve una clase guard.
function AuthGuard(strategy) {
  return class {
    constructor() {
      this.strategy = strategy;
    }
    canActivate() {
      return true;
    }
  };
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