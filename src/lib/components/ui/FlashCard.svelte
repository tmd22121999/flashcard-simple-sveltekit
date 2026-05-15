<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { store } from '$lib/store';
  import { Button } from 'flowbite-svelte';
  import { PlaySolid } from 'flowbite-svelte-icons';

  import {
    fetchFromGoogleSheetsAPI,
    fetchFromPublicCSV,
    SAMPLE_CARDS,
    type Flashcard,
    type SheetConfig,
  } from '$lib/sheets';

  import HanziWriter from 'hanzi-writer';

  // ─────────────────────────────
  // STATE (Svelte 5 runes)
  // ─────────────────────────────
  let allCards = $state<Flashcard[]>([]);
  let categories = $state<string[]>([]);
  let selectedCategory = $state('all');

  let loading = $state(false);
  let error = $state('');
  let showSettings = $state(false);

  let sheetMode = $state<'api' | 'csv' | 'sample'>('api');
  let spreadsheetId = $state('');
  let apiKey = $state('');
  let sheetName = $state('flashcards');
  let csvUrl = $state(
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vSivsE4gmxDz9AGneWECstifvhuEdZI6IVO-wV4jLG0bHgNQb_yK-aOpNQ8GO-kuTtR1j59bovGPhEd/pub?output=csv'
  );

  // UI state from store (mirror sang local state)
  let currentIndex = $state(0);
  let isFlipped = $state(false);
  let starredIds = $state(new Set<string>());
  let learnedIds = $state(new Set<string>());
  let studyMode = $state<'all' | 'starred' | 'unlearned'>('all');

  // ─────────────────────────────
  // sync legacy store → state
  // ─────────────────────────────
  store.currentIndex.subscribe((v) => (currentIndex = v));
  store.isFlipped.subscribe((v) => (isFlipped = v));
  store.starred.subscribe((v) => (starredIds = v));
  store.learned.subscribe((v) => (learnedIds = v));
  store.studyMode.subscribe((v) => (studyMode = v));

  // ─────────────────────────────
  // DERIVED STATE
  // ─────────────────────────────
  let activeCards = $derived(() => {
    let base = allCards;

    if (selectedCategory !== 'all') {
      base = base.filter((c) => c.category === selectedCategory);
    }

    if (studyMode === 'starred') {
      base = base.filter((c) => starredIds.has(c.id));
    } else if (studyMode === 'unlearned') {
      base = base.filter((c) => !learnedIds.has(c.id));
    }

    return base;
  });

  let currentCard = $derived(() => activeCards[currentIndex] ?? null);

  let progress = $derived(() =>
    activeCards.length
      ? Math.round(((currentIndex + 1) / activeCards.length) * 100)
      : 0
  );

  let learnedCount = $derived(
    () => activeCards.filter((c) => learnedIds.has(c.id)).length
  );

  // ─────────────────────────────
  // HANZI WRITER EFFECT
  // ─────────────────────────────
  let el: HTMLDivElement;

  $effect(() => {
    if (!el || !currentCard) return;

    el.innerHTML = '';

    HanziWriter.create(el, currentCard.front[0], {
      width: 200,
      height: 200,
      showOutline: true,
    });
  });

  // ─────────────────────────────
  // SPEECH
  // ─────────────────────────────
  function speak(text: string = '你') {
    const voices = speechSynthesis.getVoices();

    const cnVoice = voices.filter(
      (v) => v.lang.includes('zh') || v.lang.includes('cmn')
    );

    if (!cnVoice.length) return;

    const randomVoice = cnVoice[Math.floor(Math.random() * cnVoice.length)];

    const u = new SpeechSynthesisUtterance(text);

    if (randomVoice) {
      u.voice = randomVoice;
      u.lang = randomVoice.lang;
    }

    speechSynthesis.speak(u);
  }

  function stop() {
    speechSynthesis.cancel();
  }

  // ─────────────────────────────
  // LOAD DATA
  // ─────────────────────────────
  async function loadCards() {
    loading = true;
    error = '';

    store.reset();

    try {
      if (sheetMode === 'sample') {
        allCards = SAMPLE_CARDS;
      } else if (sheetMode === 'api') {
        if (!spreadsheetId || !apiKey)
          throw new Error('Missing Spreadsheet ID or API Key');

        const cfg: SheetConfig = {
          spreadsheetId,
          apiKey,
          sheetName,
        };

        allCards = await fetchFromGoogleSheetsAPI(cfg);
      } else {
        if (!csvUrl) throw new Error('Missing CSV URL');
        allCards = await fetchFromPublicCSV(csvUrl);
      }

      categories = [
        ...new Set(allCards.map((c) => c.category).filter(Boolean)),
      ];

      selectedCategory = 'all';

      if (!allCards.length) throw new Error('Empty sheet');
    } catch (e: any) {
      error = e.message ?? 'Error';
    } finally {
      loading = false;
      showSettings = allCards.length === 0;
    }
  }

  function shuffle() {
    const shuffled = [...activeCards].sort(() => Math.random() - 0.5);

    allCards = allCards.map((c) => shuffled.find((s) => s.id === c.id) || c);

    store.reset();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (showSettings) return;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        store.next(activeCards);
        break;

      case 'ArrowLeft':
      case 'ArrowUp':
        store.prev(activeCards);
        break;

      case ' ':
        e.preventDefault();
        store.flip();
        break;

      case 's':
      case 'S':
        if (currentCard) store.toggleStar(currentCard.id);
        break;

      case 'l':
      case 'L':
        if (currentCard) store.markLearned(currentCard.id);
        break;
    }
  }

  function saveSettings() {
    localStorage.setItem(
      'fc_settings',
      JSON.stringify({
        sheetMode,
        spreadsheetId,
        apiKey,
        sheetName,
        csvUrl,
      })
    );

    loadCards();
    showSettings = false;
  }

  onMount(() => {
    loadCards();

    const saved = localStorage.getItem('fc_settings');
    if (!saved) return;

    const s = JSON.parse(saved);

    sheetMode = s.sheetMode ?? 'sample';
    spreadsheetId = s.spreadsheetId ?? '';
    apiKey = s.apiKey ?? '';
    sheetName = s.sheetName ?? 'Sheet1';
    csvUrl = s.csvUrl ?? '';
  });
</script>

<svelte:window on:keydown={handleKeydown} />
