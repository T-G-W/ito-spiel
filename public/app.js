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
  socket: null,
  roomCode: '',
  isHost: false,
  myId: null,
  myName: '',
  room: null,
  showSecret: false,
  draggedPlayerId: null,
  demoSessionStarted: false,
};

const entryPanel = document.getElementById('entry-panel');
const hostPanel = document.getElementById('host-panel');
const playerPanel = document.getElementById('player-panel');
const errorMessage = document.getElementById('error-message');
const themeSelect = document.getElementById('theme-select');
const themeMin = document.getElementById('theme-min');
const themeMax = document.getElementById('theme-max');
const roomCodeDisplay = document.getElementById('room-code-display');
const hostPlayerList = document.getElementById('host-player-list');
const playerPlayersList = document.getElementById('player-players-list');
const hostOrderList = document.getElementById('host-order-list');
const hostSolutionList = document.getElementById('host-solution-list');
const playerSolutionList = document.getElementById('player-solution-list');
const hostStatus = document.getElementById('host-status');
const playerStatus = document.getElementById('player-status');
const mismatchList = document.getElementById('mismatch-list');
const playerSecret = document.getElementById('player-secret');
const hostSecret = document.getElementById('host-secret');
const hostPlayerName = document.getElementById('host-player-name');
const playerNameLabel = document.getElementById('player-name-label');
const playerPersonalName = document.getElementById('player-personal-name');
const playerHeader = document.getElementById('player-header');

function setError(message) {
  errorMessage.textContent = message || '';
}

function renderThemeOptions() {
  themeSelect.innerHTML = themePool
    .map((theme, index) => `<option value="${index}">${theme.label}</option>`)
    .join('');
}

function updateThemePreview(theme = themePool[0]) {
  themeMin.textContent = theme.min;
  themeMax.textContent = theme.max;
}

function showJoinedViews() {
  entryPanel.classList.add('hidden');
  if (state.isHost) {
    hostPanel.classList.remove('hidden');
    playerPanel.classList.add('hidden');
  } else {
    hostPanel.classList.add('hidden');
    playerPanel.classList.remove('hidden');
  }
}

function renderHostPlayers() {
  if (!state.room) return;
  const players = state.room.players;
  const revealVisible = Boolean(state.room.round && state.room.round.revealed);

  hostPlayerList.innerHTML = players
    .map((player) => {
      const canSeeOwnNumber = player.id === state.myId;
      const number = revealVisible || canSeeOwnNumber ? ` · ${player.secretNumber ?? '—'}` : '';
      return `<li><span>${player.name}${number}</span><strong>${player.isHost ? 'Host' : player.id === state.myId ? 'Du' : 'Mitspieler'}</strong></li>`;
    })
    .join('');

  playerPlayersList.innerHTML = players
    .map((player) => {
      const number = revealVisible ? ` · ${player.secretNumber ?? '—'}` : '';
      return `<li><span>${player.name}${number}</span><strong>${player.id === state.myId ? 'Du' : ''}</strong></li>`;
    })
    .join('');
}

function renderOrder() {
  if (!state.room || !state.room.round) {
    hostOrderList.innerHTML = '';
    return;
  }

  const order = state.room.round.order || [];
  const revealVisible = Boolean(state.room.round.revealed);
  hostOrderList.innerHTML = order
    .map((id, index) => {
      const player = state.room.players.find((entry) => entry.id === id);
      const name = player?.name || 'Unbekannt';
      const canSeeOwnNumber = player && player.id === state.myId;
      const number = (revealVisible || canSeeOwnNumber) && player ? ` · ${player.secretNumber ?? '—'}` : '';

      return `
        <li class="order-item ${state.isHost ? 'draggable' : ''}" draggable="${state.isHost ? 'true' : 'false'}" data-player-id="${id}">
          <span class="order-slot">${index + 1}</span>
          <span>${name}${number}</span>
        </li>
      `;
    })
    .join('');

  if (state.isHost) {
    bindOrderInteractions();
  }
}

function bindOrderInteractions() {
  const items = hostOrderList.querySelectorAll('.order-item');

  items.forEach((item) => {
    item.addEventListener('dragstart', (event) => {
      state.draggedPlayerId = item.dataset.playerId;
      event.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    });

    item.addEventListener('drop', (event) => {
      event.preventDefault();
      const targetId = item.dataset.playerId;
      if (!state.draggedPlayerId || !targetId || state.draggedPlayerId === targetId) return;
      reorderHostOrder(state.draggedPlayerId, targetId);
    });
  });
}

function reorderHostOrder(draggedId, targetId) {
  if (!state.room || !state.room.round || !state.roomCode) return;
  const order = [...state.room.round.order];
  const fromIndex = order.indexOf(draggedId);
  const toIndex = order.indexOf(targetId);

  if (fromIndex === -1 || toIndex === -1) return;
  order.splice(fromIndex, 1);
  order.splice(toIndex, 0, draggedId);

  state.socket.emit('update-order', { code: state.roomCode, order });
  state.draggedPlayerId = null;
}

function renderHostStatus() {
  if (!state.room) return;
  const round = state.room.round;
  if (!round) {
    hostStatus.textContent = `Zwei-Spieler-Test: ${state.room.players.length} Spieler im Raum · Runde noch nicht gestartet.`;
    return;
  }

  if (!round.revealed) {
    hostStatus.textContent = `Runde aktiv · Thema: ${state.room.theme.label}`;
  } else {
    hostStatus.textContent = `Auflösung: ${round.mismatches.length === 0 ? 'perfekt' : `${round.mismatches.length} Fehler`}`;
  }
}

function resetSecretToggle() {
  state.showSecret = false;
  if (state.room && !state.room.round) {
    playerSecret.textContent = '••••';
    playerSecret.classList.add('hidden-number');
    document.getElementById('toggle-number-btn').textContent = 'Zahl zeigen';
  }
}

function renderPlayerStatus() {
  if (!state.room) return;
  if (!state.room.round) {
    playerStatus.textContent = `Warte auf Host · ${state.room.players.length} Spieler im Raum`;
    return;
  }

  if (!state.room.round.revealed) {
    playerStatus.textContent = `Aktuell: ${state.room.theme.label}`;
  } else {
    playerStatus.textContent = 'Auflösung sichtbar.';
  }
}

function renderMismatches() {
  if (!state.room || !state.room.round || !state.room.round.mismatches) {
    mismatchList.innerHTML = '';
    return;
  }

  const summary = state.room.round.mismatches.length === 0
    ? '✅ Perfekt: alle Nachbar-Paare sind in der richtigen Reihenfolge.'
    : `⚠️ Falsche Nachbar-Paare: ${state.room.round.mismatches.length}`;

  mismatchList.innerHTML = `
    <li class="result-summary">${summary}</li>
    ${state.room.round.mismatches
      .map(
        (item) =>
          `<li><strong>${item.leftName}</strong> (${item.leftNumber}) > <strong>${item.rightName}</strong> (${item.rightNumber})</li>`
      )
      .join('')}
  `;
}

function renderSolutionOrder() {
  if (!state.room || !state.room.round || !state.room.round.revealed) {
    if (hostSolutionList) hostSolutionList.innerHTML = '';
    if (playerSolutionList) playerSolutionList.innerHTML = '';
    return;
  }

  const sortedPlayers = [...state.room.players].sort((a, b) => (a.secretNumber ?? Infinity) - (b.secretNumber ?? Infinity));
  const html = sortedPlayers
    .map((player, index) => `
      <li class="order-item">
        <span class="order-slot">${index + 1}</span>
        <span>${player.name} · ${player.secretNumber}</span>
      </li>
    `)
    .join('');

  if (hostSolutionList) hostSolutionList.innerHTML = html;
  if (playerSolutionList) playerSolutionList.innerHTML = html;
}

function renderSecret() {
  const me = state.room?.players.find((player) => player.id === state.myId);
  if (!me) return;

  if (state.isHost) {
    hostPlayerName.textContent = me.name;
    if (state.room.round && state.room.round.revealed) {
      hostSecret.textContent = me.secretNumber ?? '••••';
      hostSecret.classList.remove('hidden-number');
      document.getElementById('host-toggle-number-btn').textContent = 'Zahl verstecken';
    } else if (state.showSecret && me.secretNumber !== null) {
      hostSecret.textContent = me.secretNumber;
      hostSecret.classList.remove('hidden-number');
      document.getElementById('host-toggle-number-btn').textContent = 'Zahl verstecken';
    } else {
      hostSecret.textContent = '••••';
      hostSecret.classList.add('hidden-number');
      document.getElementById('host-toggle-number-btn').textContent = 'Zahl zeigen';
    }
  }

  playerNameLabel.textContent = 'Spieler';
  playerPersonalName.textContent = me.name;
  playerHeader.textContent = `Raum ${state.roomCode}`;

  if (state.room.round && state.room.round.revealed) {
    playerSecret.textContent = me.secretNumber ?? '••••';
    playerSecret.classList.remove('hidden-number');
    document.getElementById('toggle-number-btn').textContent = 'Zahl verstecken';
  } else if (state.showSecret && me.secretNumber !== null) {
    playerSecret.textContent = me.secretNumber;
    playerSecret.classList.remove('hidden-number');
    document.getElementById('toggle-number-btn').textContent = 'Zahl verstecken';
  } else {
    playerSecret.textContent = '••••';
    playerSecret.classList.add('hidden-number');
    document.getElementById('toggle-number-btn').textContent = 'Zahl zeigen';
  }
}

function refreshView() {
  if (!state.room) return;
  roomCodeDisplay.textContent = state.room.code;
  updateThemePreview(state.room.theme);
  themeSelect.value = String(themePool.findIndex((theme) => theme.label === state.room.theme.label));
  renderHostPlayers();
  renderOrder();
  renderSolutionOrder();
  renderHostStatus();
  renderPlayerStatus();
  renderMismatches();
  if (!state.room.round) {
    resetSecretToggle();
  }
  renderSecret();
}

function openDemoSecondPlayer(code, hostName) {
  if (state.demoSessionStarted) return;
  state.demoSessionStarted = true;

  const url = new URL(window.location.href);
  url.searchParams.set('demoJoin', '1');
  url.searchParams.set('demoName', hostName === 'Anna' ? 'Ben' : 'Anna');
  url.searchParams.set('demoCode', code);
  window.open(url.toString(), '_blank');
}

function handleAutoDemoJoin() {
  const params = new URLSearchParams(window.location.search);
  const demoJoin = params.get('demoJoin');
  const demoName = params.get('demoName');
  const demoCode = params.get('demoCode');

  if (!demoJoin || !demoName || !demoCode) return;

  state.socket.on('connect', () => {
    state.socket.emit('join-room', { name: demoName, code: demoCode });
  });
}

function bindSocket() {
  state.socket = io();

  state.socket.on('joined-room', ({ code, isHost, name }) => {
    state.roomCode = code;
    state.isHost = isHost;
    state.myId = state.socket.id;
    state.myName = name;
    if (isHost && !state.demoSessionStarted) {
      openDemoSecondPlayer(code, name);
    }
    showJoinedViews();
    setError('');
  });

  state.socket.on('room-state', (room) => {
    state.room = room;
    refreshView();
  });

  state.socket.on('room-error', (message) => {
    setError(message);
  });

  handleAutoDemoJoin();
}

function createRoom() {
  const name = document.getElementById('host-name').value.trim();
  if (!name) {
    setError('Bitte einen Namen eingeben.');
    return;
  }

  state.socket.emit('create-room', { name });
}

function joinRoom() {
  const name = document.getElementById('player-name').value.trim();
  const code = document.getElementById('room-code').value.trim();
  if (!name || !code) {
    setError('Bitte Name und Raum-Code eingeben.');
    return;
  }

  state.socket.emit('join-room', { name, code });
}

function startRound() {
  if (!state.roomCode) return;
  state.socket.emit('start-round', { code: state.roomCode });
}

function revealOrder() {
  if (!state.roomCode) return;
  state.socket.emit('reveal-order', { code: state.roomCode });
}

function resetRound() {
  if (!state.roomCode) return;
  state.socket.emit('reset-round', { code: state.roomCode });
}

function toggleSecret() {
  if (!state.room) return;
  state.showSecret = !state.showSecret;
  renderSecret();
}

function toggleHostSecret() {
  if (!state.room) return;
  state.showSecret = !state.showSecret;
  renderSecret();
}

function demoTwoPlayerTest() {
  const hostName = document.getElementById('host-name').value.trim() || 'Anna';
  const codeTarget = document.getElementById('room-code').value.trim();
  if (codeTarget) {
    document.getElementById('player-name').value = 'Ben';
    joinRoom();
    return;
  }

  state.socket.emit('create-room', { name: hostName });
}

function bindControls() {
  document.getElementById('create-room-btn').addEventListener('click', createRoom);
  document.getElementById('join-room-btn').addEventListener('click', joinRoom);
  document.getElementById('demo-two-player-btn').addEventListener('click', demoTwoPlayerTest);
  document.getElementById('start-round-btn').addEventListener('click', startRound);
  document.getElementById('reveal-order-btn').addEventListener('click', revealOrder);
  document.getElementById('reset-round-btn').addEventListener('click', resetRound);
  document.getElementById('toggle-number-btn').addEventListener('click', toggleSecret);
  document.getElementById('host-toggle-number-btn').addEventListener('click', toggleHostSecret);

  themeSelect.addEventListener('change', () => {
    if (!state.roomCode || !state.isHost) return;
    state.socket.emit('update-theme', { code: state.roomCode, themeIndex: Number(themeSelect.value) });
  });
}

bindSocket();
bindControls();
renderThemeOptions();
updateThemePreview();
