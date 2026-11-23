import { configuracionThrottle } from './throttle.config';

describe('configuracionThrottle', () => {
  const originales = {
    ttl: process.env.THROTTLE_TTL,
    limit: process.env.THROTTLE_LIMIT,
  };

  afterEach(() => {
    for (const [clave, valor] of Object.entries(originales)) {
      const variable = clave === 'ttl' ? 'THROTTLE_TTL' : 'THROTTLE_LIMIT';

      if (valor === undefined) {
        delete process.env[variable];
      } else {
        process.env[variable] = valor;
      }
    }
  });

  it('devuelve los defaults sin THROTTLE_LIMIT ni THROTTLE_TTL', () => {
    delete process.env.THROTTLE_TTL;
    delete process.env.THROTTLE_LIMIT;

    expect(configuracionThrottle()).toEqual({ ttl: 60000, limit: 10 });
  });

  it.each([
    { ttl: '0', limit: '0' },
    { ttl: '-1', limit: '-5' },
    { ttl: 'no-numero', limit: 'abc' },
  ])('cae a los defaults con valores inválidos $ttl / $limit', ({ ttl, limit }) => {
    process.env.THROTTLE_TTL = ttl;
    process.env.THROTTLE_LIMIT = limit;

    expect(configuracionThrottle()).toEqual({ ttl: 60000, limit: 10 });
  });
});
