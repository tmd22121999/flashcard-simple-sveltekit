type Form = {
  m: string;
}
type HanziWord = {
  s: string;
  f: Form[];
};

import rawCards from '$lib/data/1.min.json';

export const cards = rawCards as unknown as HanziWord[];

export const cardsMap = new Map(
  cards.map(card => [card.s, card])
);
export const words =  cards.map(card => card.s)
 