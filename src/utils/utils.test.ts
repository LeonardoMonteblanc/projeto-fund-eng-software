import { describe, it, expect } from 'vitest';
import { formatarDataBR, centavosParaReais, reaisParaCentavos, gerarTAG, gerarNumeroSerie } from '../shared/utils';

describe('utils', () => {
  it('formata data BR', () => {
    expect(formatarDataBR('2024-01-15')).toBe('15/01/2024');
    expect(formatarDataBR(null)).toBe('—');
  });

  it('converte centavos para reais', () => {
    expect(centavosParaReais(12345)).toBe('R$ 123,45');
  });

  it('converte reais para centavos', () => {
    expect(reaisParaCentavos('123,45')).toBe(12345);
    expect(reaisParaCentavos(123.45)).toBe(12345);
  });

  it('gera TAG', () => {
    const tag = gerarTAG('LASFI', 1);
    expect(tag).toMatch(/^TAG-LASFI-\d{4}$/);
  });

  it('gera número de série', () => {
    const sn = gerarNumeroSerie();
    expect(sn).toMatch(/^SN-[A-Z0-9]{10}$/);
  });
});