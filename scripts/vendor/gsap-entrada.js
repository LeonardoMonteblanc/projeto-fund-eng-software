/**
 * Ponto de entrada do bundle GSAP.
 *
 * O `index.js` do pacote exporta apenas o núcleo. Este arquivo reúne o núcleo
 * e o plugin ScrollTrigger em um único módulo ESM, já registrado, para que a
 * interface importe tudo de uma vez.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };
export default gsap;
