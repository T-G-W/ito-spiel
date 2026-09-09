const modeNames = { classic: 'Classic', vs: 'VS', reverse: 'reverse VS', knockout: 'Knockout VS' };
const state = { socket: io(), mode: 'classic', isHost: false, roomCode: '', myId: '', room: null, dragId: null };
const $ = (id) => document.getElementById(id);
const entryPanel = $('entry-panel');
const gamePanel = $('game-panel');
const errorMessage = $('error-message');

function setError(message) { errorMessage.textContent = message || ''; }
function selectedMode() { return document.querySelector('.mode-card.selected')?.dataset.mode || 'classic'; }
function activePlayers() { return state.room?.players.filter((player) => !player.eliminated) || []; }
function playerName(id) { return state.room?.players.find((player) => player.id === id)?.name || 'Unbekannt'; }
function escapeHtml(value) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }

function renderModes() {
  document.querySelectorAll('.mode-card').forEach((card) => card.classList.toggle('selected', card.dataset.mode === state.mode));
  $('selected-mode').textContent = `${modeNames[state.mode]} · ${state.mode === 'reverse' ? 'Wörter auf der Zahlenskala einordnen' : 'Zahlen aufsteigend einordnen'}`;
}
function showGame() { entryPanel.classList.add('hidden'); gamePanel.classList.remove('hidden'); }
function renderPlayers() {
  const players = state.room?.players || [];
  $('player-count').textContent = `${activePlayers().length} active`;
  $('player-list').innerHTML = players.map((player) => `<li class="${player.eliminated ? 'eliminated' : ''}"><span><b>${escapeHtml(player.name)}</b>${player.id === state.myId ? ' · du' : ''}${player.eliminated ? ' · raus' : ''}</span><strong>${player.score} P</strong></li>`).join('');
}
function makeOrderList(target, order, editable) {
  $(target).innerHTML = (order || []).map((id, index) => `<li class="order-item ${editable ? 'draggable' : ''}" draggable="${editable}" data-player-id="${id}"><span class="order-slot">${index + 1}</span><span>${escapeHtml(playerName(id))}</span></li>`).join('');
  if (!editable) return;
  $(target).querySelectorAll('.order-item').forEach((item) => {
    item.addEventListener('dragstart', () => { state.dragId = item.dataset.playerId; });
    item.addEventListener('dragover', (event) => event.preventDefault());
    item.addEventListener('drop', (event) => { event.preventDefault(); reorder(target, item.dataset.playerId); });
  });
}
function reorder(target, targetId) {
  const order = [...(target === 'classic-order-list' ? state.room.round.order : state.room.round.myOrder || activePlayers().map((player) => player.id))];
  const from = order.indexOf(state.dragId); const to = order.indexOf(targetId);
  if (from < 0 || to < 0 || from === to) return;
  order.splice(from, 1); order.splice(to, 0, state.dragId);
  if (target === 'classic-order-list') state.room.round.order = order;
  else state.room.round.myOrder = order;
  makeOrderList(target, order, true);
}
function renderReverse() {
  const round = state.room?.round;
  $('reverse-list').innerHTML = (round?.reverseItems || []).map((item) => `<label class="rating-row"><span>${escapeHtml(item.word)}</span><input type="number" min="1" max="100" value="${round.myRatings?.[item.id] || ''}" data-rating-id="${item.id}" placeholder="1–100" />${item.target ? `<b>${item.target}</b>` : ''}</label>`).join('');
}
function renderSolution() {
  const round = state.room?.round;
  if (!round?.revealed) { $('solution-list').innerHTML = ''; return; }
  const players = [...(state.room.players || [])].sort((a, b) => (a.secretNumber ?? Infinity) - (b.secretNumber ?? Infinity));
  $('solution-list').innerHTML = players.map((player, index) => `<li class="order-item"><span class="order-slot">${index + 1}</span><span>${escapeHtml(player.name)} · ${player.secretNumber ?? '—'}</span></li>`).join('');
}
function render() {
  if (!state.room) return;
  showGame();
  $('mode-label').textContent = modeNames[state.room.mode].toUpperCase();
  $('room-code-display').textContent = state.room.code;
  $('mode-description').textContent = state.room.modeDescription;
  $('theme-title').textContent = state.room.theme.label;
  $('theme-min').textContent = state.room.theme.min;
  $('theme-max').textContent = state.room.theme.max;
  document.querySelectorAll('.play-mode').forEach((area) => area.classList.add('hidden'));
  $(state.room.mode === 'classic' ? 'classic-area' : state.room.mode === 'reverse' ? 'reverse-area' : 'vs-area').classList.remove('hidden');
  renderPlayers();
  const round = state.room.round;
  if (!round) { $('status-text').textContent = 'Warte auf den Host.'; return; }
  const myOrder = round.myOrder || activePlayers().map((player) => player.id);
  makeOrderList('classic-order-list', round.order, state.isHost);
  makeOrderList('vs-order-list', myOrder, true);
  renderReverse();
  renderSolution();
  const submitted = state.room.mode === 'reverse' ? Object.keys(round.myRatings || {}).length : round.myOrder ? 'abgegeben' : 'offen';
  $('status-text').textContent = round.revealed ? (round.eliminatedId ? `${playerName(round.eliminatedId)} scheidet aus.` : 'Runde aufgelöst.') : `Dein Beitrag: ${submitted}`;
  $('result-list').innerHTML = round.revealed ? `<li>${round.mismatches?.length ? `${round.mismatches.length} falsche Nachbar-Paare.` : 'Starke Runde.'}</li>${activePlayers().map((player) => `<li>${escapeHtml(player.name)}: +${player.roundScore} Punkte</li>`).join('')}` : '';
}
function emit(name, data = {}) { state.socket.emit(name, { code: state.roomCode, ...data }); }
function createRoom() { const name = $('host-name').value.trim(); if (!name) return setError('Bitte deinen Namen eingeben.'); emit('create-room', { name, mode: state.mode }); }
function joinRoom() { const name = $('player-name').value.trim(); const code = $('room-code').value.trim(); if (!name || !code) return setError('Name und Raum-Code fehlen.'); state.socket.emit('join-room', { name, code }); }
function submitOrder() { emit('submit-order', { order: state.room.round.myOrder || activePlayers().map((player) => player.id) }); }
function submitRatings() { const ratings = Object.fromEntries([...document.querySelectorAll('[data-rating-id]')].map((input) => [input.dataset.ratingId, input.value])); emit('submit-ratings', { ratings }); }

document.querySelectorAll('.mode-card').forEach((card) => card.addEventListener('click', () => { state.mode = card.dataset.mode; renderModes(); }));
$('create-room-btn').addEventListener('click', createRoom);
$('join-room-btn').addEventListener('click', joinRoom);
$('start-round-btn').addEventListener('click', () => emit('start-round'));
$('reveal-order-btn').addEventListener('click', () => emit('reveal-order'));
$('submit-order-btn').addEventListener('click', submitOrder);
$('submit-ratings-btn').addEventListener('click', submitRatings);
$('reset-round-btn').addEventListener('click', () => emit('reset-round'));
state.socket.on('joined-room', ({ code, isHost }) => { state.roomCode = code; state.isHost = isHost; setError(''); });
state.socket.on('room-state', (room) => { state.room = room; state.mode = room.mode; renderModes(); render(); });
state.socket.on('room-error', setError);
renderModes();