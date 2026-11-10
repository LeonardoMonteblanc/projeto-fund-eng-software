/**
 * Camada de movimento da interface LabUcs.
 *
 * Usa GSAP com ScrollTrigger para três processos de leitura:
 * revelação progressiva dos blocos, revelação de texto por varredura e
 * empilhamento dos cartões indicadores durante a rolagem.
 *
 * Todas as animações operam apenas sobre `transform` e `opacity`, e são
 * desligadas quando o usuário pede movimento reduzido.
 */

import { gsap, ScrollTrigger } from '../assets/vendor/gsap.esm.js';

const PREFIXO = 'ucs';

let registrado = false;

function movimentoReduzido() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Divide um texto em palavras Wrapper, preservando a marcação original. */
function dividirPalavras(elemento) {
  if (!elemento.dataset.palavras) {
    const palavras = elemento.textContent.trim().split(/\s+/);
    elemento.innerHTML = palavras
      .map((palavra) => `<span class="${PREFIXO}-palavra">${palavra}</span>`)
      .join(' ');
    elemento.dataset.palavras = '1';
  }
  return [...elemento.querySelectorAll(`.${PREFIXO}-palavra`)];
}

/**
 * Revela os blocos anotados com `data-revelar` quando entram na viewport.
 * A opacidade inicial é aplicada por CSS para evitar um quadro sem estilo.
 */
export function revelarBlocos(raiz = document) {
  const alvos = raiz.querySelectorAll('[data-revelar]');
  if (!alvos.length) return;

  if (movimentoReduzido()) {
    gsap.set(alvos, { opacity: 1, y: 0 });
    return;
  }

  alvos.forEach((alvo) => {
    gsap.fromTo(alvo,
      { opacity: 0, y: 22 },
      {
        opacity: 1,
        y: 0,
        duration: .68,
        ease: 'power2.out',
        scrollTrigger: { trigger: alvo, start: 'top 88%', once: true }
      });
  });
}

/**
 * Revela o texto por varredura: as palavras partem com 10% de opacidade e
 * ganham legibilidade conforme o bloco atravessa a viewport.
 */
export function varrerTexto(raiz = document) {
  const alvos = raiz.querySelectorAll('[data-varrer]');
  if (!alvos.length) return;

  if (movimentoReduzido()) {
    alvos.forEach((alvo) => { alvo.style.opacity = '1'; });
    return;
  }

  alvos.forEach((alvo) => {
    const palavras = dividirPalavras(alvo);
    gsap.fromTo(palavras,
      { opacity: .1 },
      {
        opacity: 1,
        ease: 'none',
        stagger: .08,
        scrollTrigger: { trigger: alvo, start: 'top 92%', end: 'top 42%', scrub: true }
      });
  });
}

/**
 * Empilhamento dos cartões indicadores: cada cartão entra com um atraso
 * curto em relação ao anterior, de modo que a grade se assenta como um
 * conjunto em vez de surgir de uma vez.
 */
export function empilharCartoes(raiz = document) {
  const alvos = raiz.querySelectorAll('[data-empilhar]');
  if (!alvos.length) return;

  if (movimentoReduzido()) {
    gsap.set(alvos, { opacity: 1, y: 0, scale: 1 });
    return;
  }

  [...alvos].forEach((alvo, indice) => {
    gsap.fromTo(alvo,
      { opacity: 0, y: 48, scale: .96 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: .7,
        ease: 'power3.out',
        delay: indice * .045,
        scrollTrigger: { trigger: alvo, start: 'top 90%', once: true }
      });
  });
}

/**
 * Pilha rolante: os cartões de uma lista curta se sobrepõem à medida que a
 * página sobe, imitando um fichário. O cartão em foco volta a subir e ganha
 * escala, revelando o conteúdo completo.
 */
export function pilhaCartoes(raiz = document) {
  const alvos = raiz.querySelectorAll('[data-pilha]');
  if (!alvos.length) return;

  if (movimentoReduzido()) {
    gsap.set(alvos, { opacity: 1, y: 0, scale: 1 });
    return;
  }

  const lista = [...alvos];
  lista.forEach((cartao, indice) => {
    gsap.fromTo(cartao,
      { opacity: 0, y: 26 },
      {
        opacity: 1,
        y: 0,
        duration: .55,
        ease: 'power2.out',
        delay: indice * .06,
        scrollTrigger: { trigger: cartao, start: 'top 92%', once: true }
      });
  });

  gsap.to(lista, {
    y: (i) => -i * 14,
    ease: 'none',
    scrollTrigger: {
      trigger: lista[0].parentElement,
      start: 'top 68%',
      end: () => `bottom ${lista[lista.length - 1].offsetTop + 60}px`,
      scrub: .7
    }
  });
}

/** Faixa contínua com os laboratórios e seus totais de equipamentos. */
export function rodarFaixa(raiz = document) {
  const faixas = raiz.querySelectorAll('[data-faixa]');
  if (!faixas.length || movimentoReduzido()) return;

  faixas.forEach((faixa) => {
    const trilha = faixa.querySelector('.faixa-trilha');
    if (!trilha) return;
    const original = trilha.innerHTML;
    trilha.innerHTML = original + original;
    const largura = trilha.scrollWidth / 2;
    gsap.to(trilha, {
      x: -largura,
      duration: Math.max(28, largura / 42),
      ease: 'none',
      repeat: -1
    });
  });
}

/** Prepara a página: registra os plugins e dispara as sequências. */
export function iniciarMovimento(raiz = document) {
  if (!registrado) {
    gsap.registerPlugin(ScrollTrigger);
    registrado = true;
  }
  revelarBlocos(raiz);
  varrerTexto(raiz);
  empilharCartoes(raiz);
  pilhaCartoes(raiz);
  rodarFaixa(raiz);
  ScrollTrigger.refresh();
}

export { gsap, ScrollTrigger };
