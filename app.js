const themePool = [
  { label: 'Wie sehr will ich das am Montagmorgen?', min: 'Steuererklärung', max: 'freier Tag + Sonnenschein' },
  { label: 'Wie gefährlich ist das Tier?', min: 'Hamster', max: 'Hungry Hippo im falschen Gehege' },
  { label: 'Wie scharf ist das Essen?', min: 'Toast', max: 'Reines Capsaicin' },
  { label: 'Wie peinlich wäre das in der Bahn?', min: 'leises Niesen', max: 'Karaoke ohne Kopfhörer' },
  { label: 'Wie teuer fühlt sich das an?', min: 'Kaugummi', max: 'Mondflug' },
  { label: 'Wie romantisch ist das?', min: 'Socken zu Weihnachten', max: 'spontaner Antrag' },
  { label: 'Wie sehr stört mich das auf einer WG-Party?', min: 'ein offenes Fenster', max: 'jemand räumt meinen Kühlschrank leer' },
  { label: 'Wie kindisch ist das Hobby?', min: 'Schach', max: '4000-Teile-Lego um 3 Uhr nachts' },
  { label: 'Wie sehr würde ich das zum Geburtstag wollen?', min: 'bitte nicht', max: 'sofort auspacken' },
  { label: 'Wie nervig ist das Alltagsthema?', min: 'fast vergessen', max: 'ich räume sofort alles weg' }
];

const state = {
  players: [],
  currentTheme: themePool[0],
  round: null,
  revealed: false,
};

const playerListEl = document.getElementById('player-list');
const playerCardsEl = document.getElementById('player-cards');
const themeSelectEl = document.getElementById('theme-select');
const scaleMinEl = document.getElementById('scale-min');
const scaleMaxEl = document.getElementById('scale-max');
const orderListEl = document.getElementById('order-list');
const roundStatusEl = document.getElementById('round-status');
const resultSummaryEl = document.getElementById('result-summary');
const errorListEl = document.getElementById('error-list');
const themeDescriptionEl = document.getElementById('theme-description');

function createPlayer(name = '') {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: name.trim() || `Spieler ${state.players.length + 1}`,
    secretNumber: null,
  };
}

function ensurePlayers() {
  while (state.players.length < 4) {
    state.players.push(createPlayer());
  }
  while (state.players.length > 7) {
    state.players.pop();
  }
}

function renderThemeOptions() {
  themeSelectEl.innerHTML = themePool
    .map((theme, index) => `<option value="${index}">${theme.label}</option>`)
    .join('');
  themeSelectEl.value = String(themePool.findIndex((theme) => theme.label === state.currentTheme.label));
  updateThemePreview();
}

function updateThemePreview() {
  const theme = state.currentTheme;
  scaleMinEl.textContent = theme.min;
  scaleMaxEl.textContent = theme.max;
  themeDescriptionEl.textContent = `Skala: 1 = ${theme.min} · 100 = ${theme.max}`;
}

function renderPlayerInputs() {
  playerListEl.innerHTML = state.players
    .map(
      (player, index) => `
        <div class="player-input">
          <span class="player-index">${index + 1}</span>
          <input type="text" value="${escapeHtml(player.name)}" data-player-id="${player.id}" aria-label="Spieler ${index + 1}" />
          <button class="remove-player" data-remove-id="${player.id}" aria-label="Spieler entfernen">×</button>
        </div>
      `
    )
    .join('');
}

function renderPlayerCards() {
  if (!state.round) {
    playerCardsEl.innerHTML = '<p class="muted">Noch keine Runde gestartet.</p>';
    return;
  }

  playerCardsEl.innerHTML = state.players
    .map((player) => {
      const isVisible = state.revealed || player.secretNumber === null;
      const numberText = isVisible ? player.secretNumber : '••••';
      const cardClass = state.revealed ? 'success' : '';
      return `
        <article class="player-card ${cardClass}" data-player-card="${player.id}">
          <header>
            <span class="player-name">${escapeHtml(player.name)}</span>
            <span class="muted">${state.revealed ? 'Richtig' : 'Geheim'}</span>
          </header>
          <div class="player-number ${state.revealed ? '' : 'hidden-number'}">${numberText}</div>
          <button class="secret-btn" data-number-toggle="${player.id}">
            ${state.revealed ? 'Zahl zeigen' : 'Zahl merken'}
          </button>
        </article>
      `;
    })
    .join('');
}

function renderOrderList() {
  const order = state.round?.order ?? state.players.map((player) => player.id);
  orderListEl.innerHTML = order
    .map((playerId, index) => {
      const player = state.players.find((entry) => entry.id === playerId);
      return `
        <li class="order-item" draggable="true" data-player-id="${playerId}" data-order-index="${index}">
          <span class="order-slot">${index + 1}</span>
          <span>${player ? escapeHtml(player.name) : 'Unbekannt'}</span>
        </li>
      `;
    })
    .join('');

  attachOrderDragHandlers();
}

function attachOrderDragHandlers() {
  const items = [...document.querySelectorAll('.order-item')];

  items.forEach((item) => {
    item.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', item.dataset.playerId);
      item.classList.add('dragging');
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
    });

    item.addEventListener('dragover', (event) => {
      event.preventDefault();
    });

    item.addEventListener('drop', (event) => {
      event.preventDefault();
      const draggedId = event.dataTransfer.getData('text/plain');
      const targetId = item.dataset.playerId;
      if (draggedId === targetId) return;
      reorderOrder(draggedId, targetId);
    });
  });
}

function reorderOrder(draggedId, targetId) {
  if (!state.round) return;
  const nextOrder = [...state.round.order];
  const fromIndex = nextOrder.indexOf(draggedId);
  const toIndex = nextOrder.indexOf(targetId);
  if (fromIndex === -1 || toIndex === -1) return;

  nextOrder.splice(fromIndex, 1);
  nextOrder.splice(toIndex, 0, draggedId);
  state.round.order = nextOrder;
  renderOrderList();
}

function randomizeNumbers() {
  ensurePlayers();
  const pool = [...Array(100).keys()].map((_, index) => index + 1);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  state.players.forEach((player, index) => {
    player.secretNumber = pool[index];
  });

  if (state.round) {
    state.round.order = state.players.map((player) => player.id);
  }

  renderPlayerCards();
  renderOrderList();
}

function startRound() {
  ensurePlayers();
  state.currentTheme = themePool[Number(themeSelectEl.value) || 0];
  state.players.forEach((player) => {
    player.secretNumber = null;
  });
  randomizeNumbers();

  state.round = {
    theme: state.currentTheme.label,
    min: state.currentTheme.min,
    max: state.currentTheme.max,
    order: state.players.map((player) => player.id),
  };
  state.revealed = false;

  roundStatusEl.textContent = `${state.currentTheme.label} · ${state.players.length} Spieler`;
  resultSummaryEl.textContent = 'Runde läuft. Ordnet die Gruppe so, dass die Zahlen von links nach rechts aufsteigend sind.';
  errorListEl.innerHTML = '';
  renderPlayerCards();
  renderOrderList();
  renderThemeOptions();
}

function revealOrder() {
  if (!state.round) return;
  state.revealed = true;
  const orderedNumbers = state.round.order.map((id) => {
    const player = state.players.find((entry) => entry.id === id);
    return { player, number: player?.secretNumber ?? null };
  });

  const mismatches = [];
  for (let i = 0; i < orderedNumbers.length - 1; i += 1) {
    const left = orderedNumbers[i];
    const right = orderedNumbers[i + 1];
    if (left.number !== null && right.number !== null && left.number > right.number) {
      mismatches.push({ left, right });
    }
  }

  if (mismatches.length === 0) {
    resultSummaryEl.textContent = '✅ Die Reihenfolge ist korrekt.';
    resultSummaryEl.style.color = '#2a8f62';
    errorListEl.innerHTML = '<li>Keine fehlerhaften Nachbar-Paare.</li>';
  } else {
    resultSummaryEl.textContent = `⚠️ ${mismatches.length} fehlerhafte Paarung(en).`;
    resultSummaryEl.style.color = '#b64141';
    errorListEl.innerHTML = mismatches
      .map(
        ({ left, right }) =>
          `<li>${escapeHtml(left.player.name)} (${left.number}) > ${escapeHtml(right.player.name)} (${right.number})</li>`
      )
      .join('');
  }

  renderPlayerCards();
  renderOrderList();
}

function resetRound() {
  state.round = null;
  state.revealed = false;
  roundStatusEl.textContent = 'Noch keine Runde aktiv.';
  resultSummaryEl.textContent = 'Runde noch offen.';
  resultSummaryEl.style.color = 'inherit';
  errorListEl.innerHTML = '';
  state.players.forEach((player) => {
    player.secretNumber = null;
  });
  renderPlayerCards();
  renderOrderList();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function bindEvents() {
  document.getElementById('new-round-btn').addEventListener('click', startRound);
  document.getElementById('randomize-btn').addEventListener('click', randomizeNumbers);
  document.getElementById('reveal-btn').addEventListener('click', revealOrder);
  document.getElementById('reset-btn').addEventListener('click', resetRound);
  document.getElementById('add-player-btn').addEventListener('click', () => {
    if (state.players.length >= 7) return;
    state.players.push(createPlayer());
    renderPlayerInputs();
    if (state.round) {
      state.round.order = state.players.map((player) => player.id);
      renderOrderList();
    }
  });

  playerListEl.addEventListener('input', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const player = state.players.find((entry) => entry.id === input.dataset.playerId);
    if (!player) return;
    player.name = input.value.trim() || `Spieler ${state.players.indexOf(player) + 1}`;
    renderOrderList();
    renderPlayerCards();
  });

  playerListEl.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-id]');
    if (!button) return;
    const playerId = button.dataset.removeId;
    const index = state.players.findIndex((player) => player.id === playerId);
    if (index === -1) return;
    if (state.players.length <= 4) return;
    state.players.splice(index, 1);
    renderPlayerInputs();
    if (state.round) {
      state.round.order = state.players.map((player) => player.id);
      renderOrderList();
    }
  });

  playerCardsEl.addEventListener('click', (event) => {
    const button = event.target.closest('[data-number-toggle]');
    if (!button) return;
    const player = state.players.find((entry) => entry.id === button.dataset.numberToggle);
    if (!player || !state.round) return;
    if (state.revealed) {
      state.revealed = false;
      renderPlayerCards();
      return;
    }
    player.secretNumber = player.secretNumber ?? Math.floor(Math.random() * 100) + 1;
    renderPlayerCards();
  });

  themeSelectEl.addEventListener('change', () => {
    state.currentTheme = themePool[Number(themeSelectEl.value)];
    updateThemePreview();
  });
}

function init() {
  ensurePlayers();
  renderThemeOptions();
  renderPlayerInputs();
  renderPlayerCards();
  renderOrderList();
  bindEvents();
}

init();
