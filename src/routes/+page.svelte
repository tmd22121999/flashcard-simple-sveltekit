<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { store } from '$lib/store';
  import {
    fetchFromGoogleSheetsAPI,
    fetchFromPublicCSV,
    SAMPLE_CARDS,
    type Flashcard,
    type SheetConfig,
  } from '$lib/sheets';

  // ── State ────────────────────────────────────────────
  let allCards: Flashcard[] = [];
  let activeCards: Flashcard[] = [];
  let categories: string[] = [];

  let loading = false;
  let error = '';
  let showSettings = false;
  let showProgress = false;

  // Settings
  let sheetMode: 'api' | 'csv' | 'sample' = 'api';
  let spreadsheetId = '';
  let apiKey = '';
  let sheetName = 'flashcards';
  let csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSivsE4gmxDz9AGneWECstifvhuEdZI6IVO-wV4jLG0bHgNQb_yK-aOpNQ8GO-kuTtR1j59bovGPhEd/pub?output=csv';
  let selectedCategory = 'all';

  // Card state (from store)
  let currentIndex = 0;
  let isFlipped = false;
  let starredIds = new Set<string>();
  let learnedIds = new Set<string>();
  let studyMode: 'all' | 'starred' | 'unlearned' = 'all';

  $: store.currentIndex.subscribe(v => (currentIndex = v));
  $: store.isFlipped.subscribe(v => (isFlipped = v));
  $: store.starred.subscribe(v => (starredIds = v));
  $: store.learned.subscribe(v => (learnedIds = v));
  $: store.studyMode.subscribe(v => (studyMode = v));

  $: {
    // Filter by category
    let base = allCards;
    if (selectedCategory !== 'all') base = base.filter(c => c.category === selectedCategory);

    // Filter by study mode
    if (studyMode === 'starred') base = base.filter(c => starredIds.has(c.id));
    else if (studyMode === 'unlearned') base = base.filter(c => !learnedIds.has(c.id));

    activeCards = base;
  }

  $: currentCard = activeCards[currentIndex] ?? null;
  console.log("🚀 ~ currentCard:", currentCard)
  $: progress = activeCards.length ? Math.round(((currentIndex + 1) / activeCards.length) * 100) : 0;
  $: learnedCount = activeCards.filter(c => learnedIds.has(c.id)).length;

  // ── Load ────────────────────────────────────────────
  async function loadCards() {
    loading = true;
    error = '';
    store.reset();
    try {
      if (sheetMode === 'sample') {
        allCards = SAMPLE_CARDS;
      } else if (sheetMode === 'api') {
        if (!spreadsheetId || !apiKey) throw new Error('Vui lòng nhập Spreadsheet ID và API Key');
        const cfg: SheetConfig = { spreadsheetId, apiKey, sheetName };
        allCards = await fetchFromGoogleSheetsAPI(cfg);
        console.log("🚀 ~ loadCards ~ allCards:", allCards)
      } else {
        if (!csvUrl) throw new Error('Vui lòng nhập URL CSV');
        allCards = await fetchFromPublicCSV(csvUrl);
      }

      // Extract categories
      const cats = [...new Set(allCards.map(c => c.category).filter(Boolean))] as string[];
      categories = cats;
      selectedCategory = 'all';

      if (allCards.length === 0) throw new Error('Sheet không có dữ liệu');
    } catch (e: any) {
      error = e.message || 'Đã xảy ra lỗi';
    } finally {
      loading = false;
      showSettings = allCards.length === 0;
    }
  }

  function shuffle() {
    const shuffled = [...activeCards].sort(() => Math.random() - 0.5);
    allCards = allCards.map(c => shuffled.find(s => s.id === c.id) || c);
    const remapped = [...shuffled];
    // rebuild active
    activeCards = remapped;
    store.reset();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (showSettings) return;
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': store.next(activeCards); break;
      case 'ArrowLeft': case 'ArrowUp': store.prev(activeCards); break;
      case ' ': e.preventDefault(); store.flip(); break;
      case 's': case 'S': if (currentCard) store.toggleStar(currentCard.id); break;
      case 'l': case 'L': if (currentCard) store.markLearned(currentCard.id); break;
    }
  }

  onMount(() => {
    loadCards();
    console.log("🚀 ~ saved:", )
    // Load saved settings
    const saved = localStorage.getItem('fc_settings');
    if (saved) {
      const s = JSON.parse(saved);
      sheetMode = s.sheetMode ?? 'sample';
      spreadsheetId = s.spreadsheetId ?? '';
      apiKey = s.apiKey ?? '';
      sheetName = s.sheetName ?? 'Sheet1';
      csvUrl = s.csvUrl ?? '';
    }
  });

  function saveSettings() {
    localStorage.setItem('fc_settings', JSON.stringify({ sheetMode, spreadsheetId, apiKey, sheetName, csvUrl }));
    loadCards();
    showSettings = false;
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<main class="app">
  <!-- Header -->
  <header>
    <div class="logo">
      <span class="logo-icon">⬡</span>
      <span>FlashCard</span>
    </div>
    <nav>
      <button class="nav-btn" class:active={studyMode === 'all'} on:click={() => { store.studyMode.set('all'); store.reset(); }}>
        Tất cả <span class="badge">{allCards.length}</span>
      </button>
      <button class="nav-btn" class:active={studyMode === 'starred'} on:click={() => { store.studyMode.set('starred'); store.reset(); }}>
        ★ Đã đánh dấu <span class="badge">{starredIds.size}</span>
      </button>
      <button class="nav-btn" class:active={studyMode === 'unlearned'} on:click={() => { store.studyMode.set('unlearned'); store.reset(); }}>
        Chưa học <span class="badge">{allCards.filter(c => !learnedIds.has(c.id)).length}</span>
      </button>
    </nav>
    <div class="header-actions">
      <button class="icon-btn" title="Trộn bài" on:click={shuffle}>⇄</button>
      <button class="icon-btn" title="Cài đặt" on:click={() => showSettings = true}>⚙</button>
    </div>
  </header>

  <!-- Category filter -->
  {#if categories.length > 0}
    <div class="category-bar">
      <button class="cat-chip" class:active={selectedCategory === 'all'} on:click={() => { selectedCategory = 'all'; store.reset(); }}>
        Tất cả
      </button>
      {#each categories as cat}
        <button class="cat-chip" class:active={selectedCategory === cat} on:click={() => { selectedCategory = cat; store.reset(); }}>
          {cat}
        </button>
      {/each}
    </div>
  {/if}

  <!-- Main content -->
  <div class="content">
    {#if loading}
      <div class="loader-wrap">
        <div class="spinner"></div>
        <p>Đang tải dữ liệu…</p>
      </div>
    {:else if error && activeCards.length === 0}
      <div class="empty-state">
        <div class="empty-icon">⚠</div>
        <h2>Không thể tải dữ liệu</h2>
        <p>{error}</p>
        <button class="btn-primary" on:click={() => showSettings = true}>Cấu hình nguồn dữ liệu</button>
      </div>
    {:else if activeCards.length === 0}
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <h2>Không có thẻ nào</h2>
        <p>Thay đổi bộ lọc hoặc chế độ học</p>
      </div>
    {:else if currentCard}
      <!-- Progress bar -->
      <div class="progress-wrap">
        <div class="progress-info">
          <span class="progress-count">{currentIndex + 1} / {activeCards.length}</span>
          <span class="progress-learned">{learnedCount} đã học</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: {progress}%"></div>
        </div>
      </div>

      <!-- Card -->
      <div class="card-area">
        <button
          class="card"
          class:flipped={isFlipped}
          class:learned={learnedIds.has(currentCard.id)}
          on:click={store.flip}
          aria-label="Lật thẻ"
        >
          <div class="card-inner">
            <div class="card-face card-front">
              <div class="card-badge">Câu hỏi</div>
              {#if currentCard.category}
                <span class="card-category">{currentCard.category}</span>
              {/if}
              <p class="card-text">{currentCard.front}</p>
              {#if currentCard.hint}
                <div class="card-hint">💡 {currentCard.hint}</div>
              {/if}
              <div class="flip-cue">Nhấn để lật ↩</div>
            </div>
            <div class="card-face card-back">
              <div class="card-badge back">Trả lời</div>
              <p class="card-text">{currentCard.back}</p>
              <div class="flip-cue">Nhấn để lật ↩</div>
            </div>
          </div>
        </button>

        <!-- Card actions -->
        <div class="card-actions">
          <button
            class="action-btn star"
            class:active={starredIds.has(currentCard.id)}
            on:click={() => store.toggleStar(currentCard.id)}
            title="Đánh dấu (S)"
          >
            {starredIds.has(currentCard.id) ? '★' : '☆'}
          </button>
          <div class="nav-btns">
            <button class="nav-arrow" on:click={() => store.prev(activeCards)} title="Trước (←)">←</button>
            <button class="nav-arrow" on:click={() => store.next(activeCards)} title="Tiếp (→)">→</button>
          </div>
          <button
            class="action-btn learned"
            class:active={learnedIds.has(currentCard.id)}
            on:click={() => store.markLearned(currentCard.id)}
            title="Đánh dấu đã học (L)"
          >
            {learnedIds.has(currentCard.id) ? '✓ Đã học' : '✓ Học rồi'}
          </button>
        </div>

        <!-- Keyboard hint -->
        <div class="kb-hints">
          <span>← → Điều hướng</span>
          <span>Space Lật thẻ</span>
          <span>S Đánh dấu</span>
          <span>L Học rồi</span>
        </div>
        <div class="card-comment">
            {#each currentCard.comment ?? [] as item}
              <div class="card-comment-item">{item}</div>
            {/each}
            </div>
      </div>
    {/if}
  </div>

  <!-- Settings Modal -->
  {#if showSettings}
    <div class="modal-overlay" on:click|self={() => showSettings = false} role="dialog" aria-modal="true">
      <div class="modal">
        <button class="modal-close" on:click={() => showSettings = false}>✕</button>
        <h2 class="modal-title">⚙ Cấu hình nguồn dữ liệu</h2>

        <div class="mode-tabs">
          <button class="mode-tab" class:active={sheetMode === 'sample'} on:click={() => sheetMode = 'sample'}>
            Demo
          </button>
          <button class="mode-tab" class:active={sheetMode === 'api'} on:click={() => sheetMode = 'api'}>
            Google Sheets API
          </button>
          <button class="mode-tab" class:active={sheetMode === 'csv'} on:click={() => sheetMode = 'csv'}>
            CSV Public
          </button>
        </div>

        {#if sheetMode === 'sample'}
          <div class="info-box">
            <p>🎯 Dùng dữ liệu mẫu có sẵn để thử nghiệm ứng dụng.</p>
          </div>
        {:else if sheetMode === 'api'}
          <div class="info-box">
            <p>📋 Kết nối trực tiếp với Google Sheets qua API v4. Sheet phải có cột: <code>Front</code>, <code>Back</code> (và tuỳ chọn: <code>Category</code>, <code>Hint</code>)</p>
          </div>
          <label class="field">
            <span>Spreadsheet ID</span>
            <input bind:value={spreadsheetId} placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" />
            <small>Lấy từ URL: docs.google.com/spreadsheets/d/<b>[ID]</b>/edit</small>
          </label>
          <label class="field">
            <span>API Key</span>
            <input bind:value={apiKey} type="password" placeholder="AIzaSy..." />
            <small>Tạo tại <a href="https://console.cloud.google.com/apis/credentials" target="_blank">Google Cloud Console</a> → Enable Sheets API</small>
          </label>
          <label class="field">
            <span>Tên Sheet</span>
            <input bind:value={sheetName} placeholder="Sheet1" />
          </label>
        {:else}
          <div class="info-box">
            <p>🔗 Dùng Google Sheet đã publish dạng CSV (không cần API key). Vào <b>File → Share → Publish to web → CSV</b> để lấy link.</p>
          </div>
          <label class="field">
            <span>URL CSV</span>
            <input bind:value={csvUrl} placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv" />
          </label>
        {/if}

        <div class="modal-actions">
          <button class="btn-secondary" on:click={() => showSettings = false}>Huỷ</button>
          <button class="btn-primary" on:click={saveSettings}>Tải dữ liệu</button>
        </div>
      </div>
    </div>
  {/if}
</main>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* ── Header ── */
  header {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 18px 32px;
    border-bottom: 1px solid var(--border);
    background: rgba(20, 20, 24, 0.8);
    backdrop-filter: blur(12px);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'Playfair Display', serif;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text);
    white-space: nowrap;
  }

  .logo-icon {
    color: var(--accent);
    font-size: 1.4rem;
  }

  nav {
    display: flex;
    gap: 4px;
    flex: 1;
  }

  .nav-btn {
    background: none;
    border: 1px solid transparent;
    color: var(--text-muted);
    padding: 6px 14px;
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.82rem;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .nav-btn:hover { color: var(--text); border-color: var(--border); }
  .nav-btn.active { color: var(--accent); border-color: var(--accent); background: rgba(232,197,71,0.08); }

  .badge {
    background: var(--surface2);
    color: var(--text-muted);
    border-radius: 20px;
    padding: 1px 7px;
    font-size: 0.72rem;
  }

  .header-actions { display: flex; gap: 8px; }

  .icon-btn {
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text-muted);
    width: 36px;
    height: 36px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s;
    display: flex; align-items: center; justify-content: center;
  }
  .icon-btn:hover { color: var(--text); border-color: var(--accent); }

  /* ── Category Bar ── */
  .category-bar {
    display: flex;
    gap: 8px;
    padding: 12px 32px;
    overflow-x: auto;
    border-bottom: 1px solid var(--border);
    scrollbar-width: none;
  }
  .category-bar::-webkit-scrollbar { display: none; }

  .cat-chip {
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text-muted);
    padding: 4px 14px;
    border-radius: 20px;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.78rem;
    white-space: nowrap;
    transition: all 0.2s;
  }
  .cat-chip:hover { border-color: var(--accent2); color: var(--text); }
  .cat-chip.active { background: var(--accent2); border-color: var(--accent2); color: white; }

  /* ── Content ── */
  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 24px;
    gap: 24px;
  }

  /* ── Loader ── */
  .loader-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    color: var(--text-muted);
    margin-top: 80px;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Empty State ── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    margin-top: 80px;
    text-align: center;
  }
  .empty-icon { font-size: 3rem; }
  .empty-state h2 { font-family: 'Playfair Display', serif; font-size: 1.5rem; }
  .empty-state p { color: var(--text-muted); margin-bottom: 8px; }

  /* ── Progress ── */
  .progress-wrap { width: 100%; max-width: 640px; }
  .progress-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 0.8rem;
    color: var(--text-muted);
    font-family: 'DM Mono', monospace;
  }
  .progress-learned { color: var(--success); }
  .progress-bar {
    height: 3px;
    background: var(--surface2);
    border-radius: 2px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent2), var(--accent));
    border-radius: 2px;
    transition: width 0.4s ease;
  }

  /* ── Card ── */
  .card-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    width: 100%;
    max-width: 640px;
  }

  .card {
    width: 100%;
    height: 340px;
    perspective: 1200px;
    cursor: pointer;
    border: none;
    background: none;
    padding: 0;
  }

  .card-inner {
    width: 100%;
    height: 100%;
    position: relative;
    transform-style: preserve-3d;
    transition: transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: var(--radius);
  }

  .card.flipped .card-inner { transform: rotateY(180deg); }

  .card-face {
    position: absolute;
    inset: 0;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    border-radius: var(--radius);
    padding: 36px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    box-shadow: var(--shadow);
    transition: box-shadow 0.3s;
  }

  .card-front {
    background: linear-gradient(135deg, #16161c 0%, #1a1a22 100%);
    border: 1px solid var(--border);
  }

  .card-back {
    background: linear-gradient(135deg, #14102a 0%, #1c1535 100%);
    border: 1px solid rgba(124, 106, 255, 0.3);
    transform: rotateY(180deg);
  }

  .card.learned .card-front { border-color: rgba(74, 222, 128, 0.3); }
  .card:hover .card-inner { box-shadow: 0 30px 80px rgba(0,0,0,0.7); }

  .card-badge {
    position: absolute;
    top: 16px;
    left: 20px;
    font-family: 'DM Mono', monospace;
    font-size: 0.68rem;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .card-badge.back { color: rgba(124, 106, 255, 0.5); }

  .card-category {
    position: absolute;
    top: 16px;
    right: 20px;
    font-size: 0.68rem;
    color: var(--accent);
    font-family: 'DM Mono', monospace;
    background: rgba(232,197,71,0.1);
    border: 1px solid rgba(232,197,71,0.2);
    padding: 2px 8px;
    border-radius: 4px;
  }

  .card-text {
    font-family: 'Playfair Display', serif;
    font-size: clamp(1.1rem, 3vw, 1.6rem);
    line-height: 1.5;
    color: var(--text);
    max-width: 480px;
  }

  .card-back .card-text {
    color: #c5bff8;
    font-style: italic;
  }

  .card-hint {
    position: absolute;
    bottom: 52px;
    font-size: 0.78rem;
    color: var(--text-muted);
    background: var(--surface2);
    padding: 4px 12px;
    border-radius: 6px;
    border: 1px solid var(--border);
  }

  .flip-cue {
    position: absolute;
    bottom: 16px;
    font-size: 0.7rem;
    color: var(--text-dim);
    font-family: 'DM Mono', monospace;
  }

  /* ── Card Actions ── */
  .card-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 12px;
  }

  .action-btn {
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text-muted);
    padding: 8px 18px;
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.82rem;
    transition: all 0.2s;
    min-width: 90px;
  }

  .action-btn.star:hover, .action-btn.star.active {
    color: var(--accent);
    border-color: var(--accent);
    background: rgba(232,197,71,0.1);
  }
  .action-btn.learned:hover, .action-btn.learned.active {
    color: var(--success);
    border-color: var(--success);
    background: rgba(74,222,128,0.1);
  }

  .nav-btns { display: flex; gap: 8px; }

  .nav-arrow {
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text);
    width: 48px;
    height: 40px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1.1rem;
    transition: all 0.2s;
    display: flex; align-items: center; justify-content: center;
  }
  .nav-arrow:hover { border-color: var(--accent2); color: var(--accent2); }

  /* ── Keyboard Hints ── */
  .kb-hints {
    display: flex;
    gap: 16px;
    font-family: 'DM Mono', monospace;
    font-size: 0.68rem;
    color: var(--text-dim);
  }

  /* ── Modal ── */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(8px);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .modal {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 36px;
    width: 100%;
    max-width: 500px;
    position: relative;
    box-shadow: 0 40px 100px rgba(0,0,0,0.8);
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text-muted);
    width: 32px;
    height: 32px;
    border-radius: 6px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
  }
  .modal-close:hover { color: var(--text); }

  .modal-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.3rem;
    margin-bottom: 24px;
  }

  .mode-tabs {
    display: flex;
    gap: 4px;
    background: var(--surface2);
    padding: 4px;
    border-radius: 10px;
    margin-bottom: 24px;
  }

  .mode-tab {
    flex: 1;
    background: none;
    border: none;
    color: var(--text-muted);
    padding: 7px 10px;
    border-radius: 7px;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.78rem;
    transition: all 0.2s;
  }
  .mode-tab.active { background: var(--surface); color: var(--text); }

  .info-box {
    background: rgba(124,106,255,0.08);
    border: 1px solid rgba(124,106,255,0.2);
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 20px;
    font-size: 0.82rem;
    color: var(--text-muted);
    line-height: 1.6;
  }
  .info-box code {
    background: var(--surface2);
    padding: 1px 6px;
    border-radius: 4px;
    color: var(--accent);
    font-family: 'DM Mono', monospace;
    font-size: 0.78rem;
  }
  .info-box a { color: var(--accent2); }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
  }
  .field span {
    font-size: 0.78rem;
    color: var(--text-muted);
    font-family: 'DM Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .field small {
    font-size: 0.72rem;
    color: var(--text-dim);
    line-height: 1.5;
  }
  .field small a { color: var(--accent2); }
  .field input {
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 10px 14px;
    border-radius: 8px;
    font-family: 'DM Mono', monospace;
    font-size: 0.82rem;
    outline: none;
    transition: border-color 0.2s;
    width: 100%;
  }
  .field input:focus { border-color: var(--accent2); }

  .modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 24px;
  }

  .btn-primary {
    background: var(--accent);
    color: #0d0d0f;
    border: none;
    padding: 10px 22px;
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    font-weight: 600;
    font-size: 0.85rem;
    transition: all 0.2s;
  }
  .btn-primary:hover { background: #f5d060; transform: translateY(-1px); }

  .btn-secondary {
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text-muted);
    padding: 10px 22px;
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.85rem;
    transition: all 0.2s;
  }
  .btn-secondary:hover { color: var(--text); }
  .card-comment{width: 100%;}
  .card-comment-item{
    width: 100%;
    padding: 4px;
    border-radius: 8px;
    margin: 4px;
    border: 1px solid antiquewhite;
}

  /* ── Responsive ── */
  @media (max-width: 640px) {
    header {
      padding: 14px 16px;
      flex-wrap: wrap;
      gap: 12px;
    }
    nav { order: 3; width: 100%; overflow-x: auto; }
    .kb-hints { display: none; }
    .card { height: 280px; }
    .card-text { font-size: 1rem; }
    .content { padding: 20px 16px; }
    .category-bar { padding: 10px 16px; }
  }
</style>
