/** Validação declarativa com mensagens PT-BR e normalização de entrada. */

import { ErroApp } from './errors.js';
import { isoValida, normalizar, parseISO } from './utils.js';

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizarEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

export function emailValido(email) {
  return RE_EMAIL.test(normalizarEmail(email));
}

/** Validação completa de CNPJ (dígitos verificadores). */
export function cnpjValido(cnpj) {
  const d = String(cnpj ?? '').replace(/\D/g, '');
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;
  const calc = (base, pesos) => {
    const soma = base.split('').reduce((acc, dig, i) => acc + Number(dig) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const dv1 = calc(d.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (dv1 !== Number(d[12])) return false;
  const dv2 = calc(d.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return dv2 === Number(d[13]);
}

export function formatarCNPJ(cnpj) {
  const d = String(cnpj ?? '').replace(/\D/g, '').padStart(14, '0').slice(0, 14);
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function telefoneValido(telefone) {
  const d = String(telefone ?? '').replace(/\D/g, '');
  return d.length === 10 || d.length === 11;
}

export function senhaValida(senha) {
  const s = String(senha ?? '');
  return s.length >= 8 && s.length <= 128 && /[A-Za-zÀ-ÿ]/.test(s) && /\d/.test(s);
}

export class Validador {
  constructor() {
    /** @type {Record<string,string>} */
    this.erros = {};
  }

  get valido() {
    return Object.keys(this.erros).length === 0;
  }

  falhar(campo, mensagem) {
    if (!this.erros[campo]) this.erros[campo] = mensagem;
    return this;
  }

  manual(campo, condicao, mensagem) {
    if (!condicao) this.falhar(campo, mensagem);
    return this;
  }

  texto(campo, valor, { rotulo = campo, obrigatorio = true, min = 0, max = 4000 } = {}) {
    const s = String(valor ?? '').trim();
    if (!s) {
      if (obrigatorio) this.falhar(campo, `${rotulo} é obrigatório.`);
      return null;
    }
    if (s.length < min) this.falhar(campo, `${rotulo} deve ter no mínimo ${min} caracteres.`);
    if (s.length > max) this.falhar(campo, `${rotulo} deve ter no máximo ${max} caracteres.`);
    return s;
  }

  email(campo, valor, { obrigatorio = true, rotulo = 'E-mail' } = {}) {
    const s = normalizarEmail(valor);
    if (!s) {
      if (obrigatorio) this.falhar(campo, `${rotulo} é obrigatório.`);
      return null;
    }
    if (!emailValido(s)) this.falhar(campo, `${rotulo} inválido.`);
    if (s.length > 180) this.falhar(campo, `${rotulo} deve ter no máximo 180 caracteres.`);
    return s;
  }

  cnpj(campo, valor, { obrigatorio = true, rotulo = 'CNPJ' } = {}) {
    const d = String(valor ?? '').replace(/\D/g, '');
    if (!d) {
      if (obrigatorio) this.falhar(campo, `${rotulo} é obrigatório.`);
      return null;
    }
    if (!cnpjValido(d)) this.falhar(campo, `${rotulo} inválido.`);
    return d;
  }

  telefone(campo, valor, { obrigatorio = true, rotulo = 'Telefone' } = {}) {
    const s = String(valor ?? '').trim();
    if (!s) {
      if (obrigatorio) this.falhar(campo, `${rotulo} é obrigatório.`);
      return null;
    }
    if (!telefoneValido(s)) this.falhar(campo, `${rotulo} deve conter DDD + número (10 ou 11 dígitos).`);
    return s;
  }

  data(campo, valor, { obrigatorio = true, rotulo = 'Data', min = null, max = null } = {}) {
    const s = String(valor ?? '').trim();
    if (!s) {
      if (obrigatorio) this.falhar(campo, `${rotulo} é obrigatória.`);
      return null;
    }
    if (!isoValida(s)) this.falhar(campo, `${rotulo} inválida. Use o formato AAAA-MM-DD.`);
    else {
      if (min && s < min) this.falhar(campo, `${rotulo} não pode ser anterior a ${min}.`);
      if (max && s > max) this.falhar(campo, `${rotulo} não pode ser posterior a ${max}.`);
    }
    return s;
  }

  inteiro(campo, valor, { obrigatorio = true, rotulo = campo, min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
    if (valor === '' || valor === null || valor === undefined) {
      if (obrigatorio) this.falhar(campo, `${rotulo} é obrigatório.`);
      return null;
    }
    const n = Number(valor);
    if (!Number.isInteger(n)) {
      this.falhar(campo, `${rotulo} deve ser um número inteiro.`);
      return null;
    }
    if (n < min) this.falhar(campo, `${rotulo} deve ser maior ou igual a ${min}.`);
    if (n > max) this.falhar(campo, `${rotulo} deve ser menor ou igual a ${max}.`);
    return n;
  }

  decimal(campo, valor, { obrigatorio = true, rotulo = campo, min = null, max = null, estritamentePositivo = false, casas = 6 } = {}) {
    if (valor === '' || valor === null || valor === undefined) {
      if (obrigatorio) this.falhar(campo, `${rotulo} é obrigatório.`);
      return null;
    }
    let n;
    if (typeof valor === 'number') n = valor;
    else {
      const s = String(valor).trim().replace(/\s/g, '');
      n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
    }
    if (!Number.isFinite(n)) {
      this.falhar(campo, `${rotulo} deve ser um número válido.`);
      return null;
    }
    if (min !== null && n < min) this.falhar(campo, `${rotulo} deve ser maior ou igual a ${min}.`);
    if (max !== null && n > max) this.falhar(campo, `${rotulo} deve ser menor ou igual a ${max}.`);
    if (estritamentePositivo && n <= 0) this.falhar(campo, `${rotulo} deve ser maior que zero.`);
    const fator = 10 ** casas;
    return Math.round(n * fator) / fator;
  }

  booleano(campo, valor, { padrao = false } = {}) {
    if (valor === undefined || valor === null || valor === '') return padrao;
    if (typeof valor === 'boolean') return valor;
    if (['true', '1', 'sim', 'on'].includes(String(valor).toLowerCase())) return true;
    if (['false', '0', 'nao', 'não', 'off'].includes(String(valor).toLowerCase())) return false;
    this.falhar(campo, 'Valor booleano inválido.');
    return padrao;
  }

  enum(campo, valor, valores, { obrigatorio = true, rotulo = campo } = {}) {
    if (valor === '' || valor === null || valor === undefined) {
      if (obrigatorio) this.falhar(campo, `${rotulo} é obrigatório.`);
      return null;
    }
    if (!valores.includes(valor)) {
      this.falhar(campo, `${rotulo} inválido.`);
      return null;
    }
    return valor;
  }

  motivo(campo, valor, { obrigatorio = true, min = 5 } = {}) {
    const s = String(valor ?? '').trim();
    if (!s) {
      if (obrigatorio) this.falhar(campo, 'Informe o motivo da operação (mínimo 5 caracteres).');
      return null;
    }
    if (s.length < min) this.falhar(campo, `O motivo deve ter no mínimo ${min} caracteres.`);
    if (s.length > 1000) this.falhar(campo, 'O motivo deve ter no máximo 1000 caracteres.');
    return s;
  }

  senha(campo, valor) {
    const s = String(valor ?? '');
    if (!s) {
      this.falhar(campo, 'A senha é obrigatória.');
      return null;
    }
    if (!senhaValida(s)) {
      this.falhar(campo, 'A senha deve ter de 8 a 128 caracteres, com ao menos uma letra e um número.');
    }
    return s;
  }

  ordem(campoA, dataA, campoB, dataB, mensagem) {
    if (dataA && dataB && parseISO(dataA) && parseISO(dataB) && dataA > dataB) this.falhar(campoA, mensagem);
    return this;
  }

  lancar() {
    if (!this.valido) {
      throw ErroApp.validacao(this.erros, Object.keys(this.erros).length === 1
        ? 'Há um campo com problema. Corrija e tente novamente.'
        : `Há ${Object.keys(this.erros).length} campos com problema. Corrija-os e tente novamente.`);
    }
  }
}

/** Compara textos ignorando acentos/caixa — útil para unicidade. */
export function mesmoTexto(a, b) {
  return normalizar(a) === normalizar(b);
}
