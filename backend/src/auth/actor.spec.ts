import { esGerencia } from './actor';

describe('esGerencia', () => {
  it('reconoce a GERENTE y ADMINISTRADOR como gerencia', () => {
    expect(esGerencia({ rol: 'GERENTE' })).toBe(true);
    expect(esGerencia({ rol: 'ADMINISTRADOR' })).toBe(true);
  });

  it('no reconoce a SOCIO ni a un actor sin rol', () => {
    expect(esGerencia({ rol: 'SOCIO' })).toBe(false);
    expect(esGerencia({})).toBe(false);
    expect(esGerencia(undefined)).toBe(false);
    expect(esGerencia(null)).toBe(false);
  });
});
