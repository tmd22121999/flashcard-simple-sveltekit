import { writable, derived } from 'svelte/store';
import type { Flashcard } from './sheets';

export type StudyMode = 'all' | 'starred' | 'unlearned';

function createFlashcardStore() {
  const cards = writable<Flashcard[]>([]);
  const currentIndex = writable(0);
  const isFlipped = writable(false);
  const starred = writable<Set<string>>(new Set());
  const learned = writable<Set<string>>(new Set());
  const studyMode = writable<StudyMode>('all');
  const filter = writable<string>('all');

  // Load starred/learned from localStorage
  if (typeof window !== 'undefined') {
    const savedStarred = localStorage.getItem('fc_starred');
    const savedLearned = localStorage.getItem('fc_learned');
    if (savedStarred) starred.set(new Set(JSON.parse(savedStarred)));
    if (savedLearned) learned.set(new Set(JSON.parse(savedLearned)));
  }

  starred.subscribe(val => {
    if (typeof window !== 'undefined')
      localStorage.setItem('fc_starred', JSON.stringify([...val]));
  });

  learned.subscribe(val => {
    if (typeof window !== 'undefined')
      localStorage.setItem('fc_learned', JSON.stringify([...val]));
  });

  return {
    cards,
    currentIndex,
    isFlipped,
    starred,
    learned,
    studyMode,
    filter,
    flip: () => isFlipped.update(v => !v),
    next: (activeCards: Flashcard[]) => {
      isFlipped.set(false);
      currentIndex.update(i => (i + 1) % activeCards.length);
    },
    prev: (activeCards: Flashcard[]) => {
      isFlipped.set(false);
      currentIndex.update(i => (i - 1 + activeCards.length) % activeCards.length);
    },
    toggleStar: (id: string) => {
      starred.update(s => {
        const ns = new Set(s);
        ns.has(id) ? ns.delete(id) : ns.add(id);
        return ns;
      });
    },
    markLearned: (id: string) => {
      learned.update(l => {
        const nl = new Set(l);
        nl.has(id) ? nl.delete(id) : nl.add(id);
        return nl;
      });
    },
    shuffle: (activeCards: Flashcard[]) => {
      const shuffled = [...activeCards].sort(() => Math.random() - 0.5);
      cards.update(all => {
        // Replace subset
        return shuffled;
      });
      currentIndex.set(0);
      isFlipped.set(false);
    },
    reset: () => {
      currentIndex.set(0);
      isFlipped.set(false);
    }
  };
}

export const store = createFlashcardStore();
