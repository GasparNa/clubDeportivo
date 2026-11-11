// Stub CJS para @nestjs/core - compatible con Jest 29
"use strict";

class Reflector {
  get(key, target) {
    return Reflect.getMetadata(key, target);
  }

  getAllAndMerge(key, targets) {
    const collection = targets
      .map((target) => this.get(key, target))
      .filter((metadata) => metadata !== undefined);

    if (!collection.length) {
      return undefined;
    }

    if (collection.length === 1) {
      return collection[0];
    }

    return collection.reduce((acc, metadata) => acc.concat(metadata), []);
  }

  getAllAndOverride(key, targets) {
    for (const target of targets) {
      const metadata = this.get(key, target);
      if (metadata !== undefined) {
        return metadata;
      }
    }

    return undefined;
  }
}

module.exports = { Reflector };
