const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const questionPool = require('./questions');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const ROUND_DURATION_MS = 60 * 1000;

const themes = [
  { label: 'Wie sehr will ich das am Montagmorgen?', min: 'Steuererklärung', max: 'freier Tag + Sonnenschein' },
  { label: 'Wie gefährlich ist das Tier?', min: 'Hamster', max: 'Hungry Hippo im falschen Gehege' },
  { label: 'Wie scharf ist das Essen?', min: 'Toast', max: 'Reines Capsaicin' },
  { label: 'Wie peinlich wäre das in der Bahn?', min: 'leises Niesen', max: 'Karaoke ohne Kopfhörer' },
  { label: 'Wie teuer fühlt sich das an?', min: 'Kaugummi', max: 'Mondflug' },
  { label: 'Wie romantisch ist das?', min: 'Socken zu Weihnachten', max: 'spontaner Antrag' },
  { label: 'Wie sehr stört mich das auf einer WG-Party?', min: 'ein offenes Fenster', max: 'jemand räumt meinen Kühlschrank leer' },
  { label: 'Wie kindisch ist das Hobby?', min: 'Schach', max: '4000-Teile-Lego um 3 Uhr nachts' },
  { label: 'Wie sehr würde ich das zum Geburtstag wollen?', min: 'bitte nicht', max: 'sofort auspacken' },
  { label: 'Wie nervig ist das Alltagsthema?', min: 'fast vergessen', max: 'ich räume sofort alles weg' },
  { label: 'Wie mutig wäre das im Urlaub?', min: 'eine neue Eissorte', max: 'ohne Plan ins Unbekannte' },
  { label: 'Wie sehr brauche ich heute Ruhe?', min: 'ein kurzer Kaffee', max: 'ab auf eine einsame Insel' },
];

const reverseWords = [
  'ein Frühstück im Bett', 'Pizza zum Frühstück', 'ein Überraschungsanruf', 'barfuß im Regen',
  'ein freier Montag', 'laute Nachbarn', 'eine Umarmung', 'ein leerer Akku',
  'Karaoke vor Fremden', 'frische Bettwäsche', 'ein verpasster Zug', 'ein gebrauchtes Geschenk',
  'ein spontaner Roadtrip', 'ein kalter Kaffee', 'ein Tag ohne Internet', 'ein geheimes Talent',
  'eine Nacht im Zelt', 'ein Mittagsschlaf', 'ein voller Kühlschrank', 'ein leerer Kalender',
  'ein Haustier im Büro', 'eine Nachricht um Mitternacht', 'ein Regenschirm im Sturm', 'ein Überraschungsgast',
  'ein Zimmer voller Luftballons', 'ein verlorener Schlüssel', 'ein Picknick im Park', 'ein sehr langer Aufzug',
  'ein Lied aus der Kindheit', 'ein falscher Name im Café', 'ein Geschenk ohne Schleife', 'ein Anruf von Oma',
  'ein Abend ohne Termine', 'ein überfüllter Zug', 'ein Spaziergang im Schnee', 'ein kaputter Wecker',
  'ein Kuchen zum Frühstück', 'eine Warteschlange an der Kasse', 'ein Urlaub ohne Plan', 'ein peinlicher Versprecher',
  'ein Selfie mit Fremden', 'ein nasser Ärmel', 'ein Fahrrad ohne Licht', 'ein Buch mit offenem Ende',
  'ein Essen mit Stäbchen', 'ein Nachbar mit Bohrmaschine', 'ein Konzert in der ersten Reihe', 'ein Tanzkurs',
  'ein Paket vor der Tür', 'ein Abend am Lagerfeuer', 'ein fremder Hund im Garten', 'ein verlorener Regenschirm',
  'eine spontane Einladung', 'ein Witz im falschen Moment', 'ein sehr scharfes Curry', 'ein leerer Akku unterwegs',
  'eine Schlange im Zoo', 'ein platzer Reifen', 'ein Frühstück im Hotel', 'ein Ausflug bei Nebel',
  'ein Lied im Ohr', 'ein unerwarteter Bonus', 'eine Stunde im Stau', 'ein Fotoalbum',
  'ein Besuch im Freizeitpark', 'ein Tag am See', 'ein kaputter Drucker', 'ein geheimes Rezept',
  'eine Rede vor vielen Menschen', 'ein ruhiger Sonntag', 'ein voller Briefkasten', 'ein Spaziergang bei Nacht',
  'ein viel zu kleiner Regenschirm', 'ein neuer Lieblingssong', 'ein Anruf ohne Nachricht', 'ein freier Sitzplatz',
  'ein Abend mit Brettspielen', 'ein verschüttetes Getränk', 'ein vergessenes Passwort', 'ein überraschender Fund',
];
const modeInfo = {
  classic: { label: 'Classic', description: 'Jede Person baut ihre eigene Reihenfolge und sammelt Punkte.' },
  vs: { label: 'VS', description: 'Jede Person baut ihre eigene Reihenfolge und sammelt Punkte.' },
  reverse: { label: 'reverse VS', description: 'Bewerte Wörter mit einer Zahl von 1 bis 100.' },
  knockout: { label: 'Knockout VS', description: 'Die schwächste Person scheidet nach jeder Runde aus.' },
};
const rooms = new Map();

function sanitizeName(name) { return String(name || '').trim().slice(0, 20) || 'Spieler'; }
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do code = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''); while (rooms.has(code));
  return code;
}
function shuffle(list) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}
function activePlayers(room) { return room.players.filter((player) => !player.eliminated); }
function randomizeOrder(room) { return shuffle(activePlayers(room).map((player) => player.id)); }

function nextQuestion(room) {
  const available = questionPool.filter((question) => question.label !== room.lastQuestionLabel);
  const pool = available.length ? available : questionPool;
  return pool[Math.floor(Math.random() * pool.length)];
}

function nextReverseWords(room, count = 8) {
  const previous = new Set(room.lastReverseWords || []);
  const available = reverseWords.filter((word) => !previous.has(word));
  const source = available.length >= count ? available : reverseWords;
  const selected = shuffle(source).slice(0, count);
  room.lastReverseWords = selected;
  return selected;
}

function createRoom(mode) {
  const code = generateRoomCode();
  const initialQuestion = nextQuestion({ lastQuestionLabel: null });
  const room = { code, mode: modeInfo[mode] ? mode : 'classic', hostId: null, players: [], theme: initialQuestion, lastQuestionLabel: initialQuestion.label, lastReverseWords: [], round: null };
  rooms.set(code, room);
  return room;
}

function assignNumbers(room) {
  const numbers = shuffle(Array.from({ length: 100 }, (_, index) => index + 1)).slice(0, activePlayers(room).length);
  activePlayers(room).forEach((player, index) => { player.secretNumber = numbers[index]; });
}

function startRound(room) {
  const players = activePlayers(room);
  room.theme = nextQuestion(room);
  room.lastQuestionLabel = room.theme.label;
  room.round = { active: true, order: randomizeOrder(room), orders: {}, reverseItems: [], reverseRatings: {}, revealed: false, mismatches: [], scores: {}, results: [], eliminatedId: null, deadlineAt: Date.now() + ROUND_DURATION_MS, timer: null };
  players.forEach((player) => { room.round.scores[player.id] = 0; });
  if (room.mode === 'reverse') {
    room.round.reverseItems = nextReverseWords(room).map((word, index) => ({ id: `word-${index}-${Date.now()}`, word, target: null }));
  } else assignNumbers(room);
  const round = room.round;
  round.timer = setTimeout(() => {
    if (room.round !== round || round.revealed) return;
    revealRound(room);
    emitRoom(room);
  }, ROUND_DURATION_MS);
}

function scoreOrder(order, room) {
  const players = order.map((id) => room.players.find((player) => player.id === id)).filter(Boolean);
  let score = 0;
  const mismatches = [];
  for (let index = 0; index < players.length - 1; index += 1) {
    const left = players[index];
    const right = players[index + 1];
    if (left.secretNumber < right.secretNumber) score += 1;
    else mismatches.push({ leftName: left.name, leftNumber: left.secretNumber, rightName: right.name, rightNumber: right.secretNumber });
  }
  return { score, mismatches };
}

function revealRound(room) {
  if (room.round.timer) clearTimeout(room.round.timer);
  room.round.timer = null;
  if (room.mode === 'reverse') {
    const players = activePlayers(room);
    room.round.reverseItems.forEach((item) => {
      const ratings = players
        .map((player) => Number(room.round.reverseRatings[player.id]?.[item.id]))
        .filter(Number.isFinite);
      item.target = ratings.length ? Math.round(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) : null;
    });
    room.round.results = players.map((player) => ({ playerId: player.id, playerName: player.name, totalPoints: 0, guesses: room.round.reverseItems.map((item) => {
      const guess = Number(room.round.reverseRatings[player.id]?.[item.id]);
      const distance = Number.isFinite(guess) && item.target !== null ? Math.abs(guess - item.target) : null;
      const points = distance === null ? 0 : Math.max(0, 10 - Math.floor(distance / 10));
      return { itemId: item.id, word: item.word, guess: Number.isFinite(guess) ? guess : null, target: item.target, distance, points };
    }) }));
    room.round.results.forEach((result) => {
      result.totalPoints = result.guesses.reduce((sum, guess) => sum + guess.points, 0);
      room.round.scores[result.playerId] = result.totalPoints;
    });
  } else {
    const players = activePlayers(room);
    room.round.results = players.map((player) => {
      const guessedOrder = room.round.orders[player.id] || room.round.order;
      const result = scoreOrder(guessedOrder, room);
      room.round.scores[player.id] = result.score;
      return { playerId: player.id, playerName: player.name, totalPoints: result.score, guessedOrder, mismatches: result.mismatches };
    });
    room.round.mismatches = scoreOrder(room.round.orders[room.hostId] || room.round.order, room).mismatches;
    if (room.mode === 'knockout') {
      const lowest = players.reduce((current, player) => (room.round.scores[player.id] < room.round.scores[current.id] ? player : current), players[0]);
      lowest.eliminated = true;
      room.round.eliminatedId = lowest.id;
    }
  }
  room.round.revealed = true;
  Object.entries(room.round.scores).forEach(([id, score]) => {
    const player = room.players.find((entry) => entry.id === id);
    if (player) player.score += score;
  });
}

function roomState(room, viewerId) {
  const revealVisible = Boolean(room.round?.revealed);
  const viewerIsHost = room.hostId === viewerId;
  return {
    code: room.code,
    mode: room.mode,
    modeLabel: modeInfo[room.mode].label,
    modeDescription: modeInfo[room.mode].description,
    players: room.players.map((player) => ({ id: player.id, name: player.name, secretNumber: room.mode === 'reverse' || revealVisible || player.id === viewerId ? player.secretNumber : null, score: player.score || 0, roundScore: room.round?.scores?.[player.id] || 0, isHost: player.id === room.hostId, eliminated: Boolean(player.eliminated) })),
    hostId: room.hostId,
    theme: room.theme,
    round: room.round ? { active: room.round.active, order: room.round.order, orderLocked: Object.keys(room.round.orders).length > 0, myOrder: room.round.orders[viewerId] || null, revealed: room.round.revealed, remainingMs: Math.max(0, room.round.deadlineAt - Date.now()), mismatches: room.round.mismatches || [], scores: room.round.scores || {}, results: revealVisible ? room.round.results || [] : [], reverseItems: room.round.reverseItems.map(({ id, word, target }) => ({ id, word, target: revealVisible ? target : null })), myRatings: room.round.reverseRatings[viewerId] || {}, eliminatedId: room.round.eliminatedId } : null,
  };
}

function findRoomBySocket(socketId) { return [...rooms.values()].find((room) => room.players.some((player) => player.id === socketId)); }
function emitRoom(room) { room.players.forEach((player) => io.to(player.id).emit('room-state', roomState(room, player.id))); }

app.use(express.static(path.join(__dirname, 'public'), { index: false }));
io.on('connection', (socket) => {
  socket.on('create-room', ({ name, mode }) => {
    const room = createRoom(mode);
    const hostName = sanitizeName(name);
    room.hostId = socket.id;
    room.players.push({ id: socket.id, name: hostName, secretNumber: null, score: 0, eliminated: false });
    socket.join(room.code);
    socket.emit('joined-room', { code: room.code, isHost: true, name: hostName });
    emitRoom(room);
  });
  socket.on('join-room', ({ name, code }) => {
    const room = rooms.get(String(code || '').toUpperCase());
    if (!room) return socket.emit('room-error', 'Dieser Raum existiert nicht.');
    if (room.players.length >= 7) return socket.emit('room-error', 'Der Raum ist schon voll.');
    const playerName = sanitizeName(name);
    room.players.push({ id: socket.id, name: playerName, secretNumber: null, score: 0, eliminated: false });
    socket.join(room.code);
    socket.emit('joined-room', { code: room.code, isHost: false, name: playerName });
    emitRoom(room);
  });
  socket.on('update-theme', ({ code, themeIndex }) => {
    const room = rooms.get(String(code || '').toUpperCase());
    if (room?.hostId === socket.id) { room.theme = themes[Number(themeIndex)] || themes[0]; emitRoom(room); }
  });
  socket.on('start-round', ({ code }) => {
    const room = rooms.get(String(code || '').toUpperCase());
    if (!room || room.hostId !== socket.id) return;
    if (room.round && !room.round.revealed) return socket.emit('room-error', 'Diese Runde läuft bereits.');
    if (activePlayers(room).length < 2) return socket.emit('room-error', 'Es müssen mindestens 2 aktive Spieler im Raum sein.');
    startRound(room); emitRoom(room);
  });
  socket.on('update-classic-order', ({ code, order }) => {
    const room = rooms.get(String(code || '').toUpperCase());
    if (!room?.round || room.mode !== 'classic' || room.round.revealed || Object.keys(room.round.orders).length > 0) return;
    const valid = new Set(activePlayers(room).map((player) => player.id));
    const clean = Array.isArray(order) ? order.filter((id) => valid.has(id)) : [];
    if (clean.length === valid.size && new Set(clean).size === valid.size) {
      room.round.order = clean;
      emitRoom(room);
    }
  });
  socket.on('submit-order', ({ code, order }) => {
    const room = rooms.get(String(code || '').toUpperCase());
    if (!room?.round || room.round.revealed || room.round.orders[socket.id]) return;
    const valid = new Set(activePlayers(room).map((player) => player.id));
    const clean = Array.isArray(order) ? order.filter((id) => valid.has(id)) : [];
    if (clean.length === valid.size && new Set(clean).size === valid.size) {
      room.round.orders[socket.id] = clean;
      const allPlayersSubmitted = activePlayers(room).every((player) => room.round.orders[player.id]);
      if (allPlayersSubmitted) revealRound(room);
    }
    emitRoom(room);
  });
  socket.on('submit-ratings', ({ code, ratings }) => {
    const room = rooms.get(String(code || '').toUpperCase());
    if (!room?.round || room.mode !== 'reverse' || room.round.revealed || room.round.reverseRatings[socket.id]) return;
    const valid = new Set(room.round.reverseItems.map((item) => item.id));
    const clean = Object.fromEntries(Object.entries(ratings || {}).filter(([id, value]) => valid.has(id) && Number.isFinite(Number(value))).map(([id, value]) => [id, Math.max(1, Math.min(100, Number(value)))]));
    if (Object.keys(clean).length !== valid.size) return socket.emit('room-error', 'Bitte alle Wörter bewerten, bevor du abgibst.');
    room.round.reverseRatings[socket.id] = clean;
    const allPlayersSubmitted = activePlayers(room).every((player) => room.round.reverseRatings[player.id]);
    if (allPlayersSubmitted) revealRound(room);
    emitRoom(room);
  });
  socket.on('reveal-order', ({ code }) => {
    const room = rooms.get(String(code || '').toUpperCase());
    if (room?.hostId !== socket.id || !room.round || room.round.revealed) return;
    if (Date.now() < room.round.deadlineAt) {
      return socket.emit('room-error', `Die Runde läuft noch ${Math.ceil((room.round.deadlineAt - Date.now()) / 1000)} Sekunden.`);
    }
    revealRound(room);
    emitRoom(room);
  });
  socket.on('reset-round', ({ code }) => {
    const room = rooms.get(String(code || '').toUpperCase());
    if (room?.hostId !== socket.id) return;
    if (room.round?.timer) clearTimeout(room.round.timer);
    room.round = null;
    room.players.forEach((player) => { player.secretNumber = null; });
    emitRoom(room);
  });
  socket.on('disconnect', () => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;
    room.players = room.players.filter((player) => player.id !== socket.id);
    if (!room.players.length) return rooms.delete(room.code);
    if (room.hostId === socket.id) room.hostId = room.players[0].id;
    emitRoom(room);
  });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'preview.html')));
server.listen(PORT, () => console.log(`ITO server running on http://localhost:${PORT}`));
/*
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

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

const rooms = new Map();

function sanitizeName(name) {
  return String(name || '').trim().slice(0, 20) || 'Spieler';
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randomizeOrder(room) {
  const order = room.players.map((player) => player.id);
  const mixed = shuffle(order);
  if (mixed.length > 1 && mixed.every((id, index) => id === order[index])) {
    const first = mixed.shift();
    mixed.push(first);
  }
  return mixed;
}

function roomState(room, viewerId) {
  const viewerIsHost = room.hostId === viewerId;
  const revealVisible = Boolean(room.round && room.round.revealed);
  const players = room.players.map((player) => ({
    id: player.id,
    name: player.name,
    secretNumber: revealVisible || viewerIsHost || player.id === viewerId ? player.secretNumber : null,
    isHost: player.id === room.hostId,
  }));

  return {
    code: room.code,
    players,
    hostId: room.hostId,
    theme: room.theme,
    round: room.round
      ? {
          active: room.round.active,
    const themes = [
          revealed: room.round.revealed,
          mismatches: room.round.mismatches || [],
        }
      : null,
  };
}

function createRoom() {
  const code = generateRoomCode();
  const room = {
    code,
    hostId: null,
    players: [],
    theme: themePool[0],
    round: null,
  };
  rooms.set(code, room);
  return room;
}

function findRoomBySocket(socketId) {
  for (const room of rooms.values()) {
    if (room.players.some((player) => player.id === socketId)) {
      return room;
    }
  }
  return null;
}

function emitRoom(room) {
  const payload = roomState(room, room.hostId);
  io.to(room.code).emit('room-state', payload);

  room.players.forEach((player) => {
    const privateState = roomState(room, player.id);
    io.to(player.id).emit('room-state', privateState);
  });
}

function assignNumbers(room) {
  const numbers = shuffle(Array.from({ length: 100 }, (_, index) => index + 1)).slice(0, room.players.length);
  room.players.forEach((player, index) => {
    player.secretNumber = numbers[index];
  });
}

function startRound(room) {
  room.round = {
    active: true,
    order: randomizeOrder(room),
    revealed: false,
    mismatches: [],
  };
  assignNumbers(room);
}

function computeMismatches(room) {
  if (!room.round || !room.round.order) return [];
  const orderedPlayers = room.round.order.map((id) => room.players.find((player) => player.id === id)).filter(Boolean);
  const mismatches = [];

  for (let index = 0; index < orderedPlayers.length - 1; index += 1) {
    const left = orderedPlayers[index];
    const right = orderedPlayers[index + 1];
    if (left.secretNumber > right.secretNumber) {
      mismatches.push({
        leftName: left.name,
        leftNumber: left.secretNumber,
        rightName: right.name,
        rightNumber: right.secretNumber,
      });
    }
  }

  return mismatches;
}

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  socket.on('create-room', ({ name }) => {
    const room = createRoom();
    const hostName = sanitizeName(name);
    room.hostId = socket.id;
    room.players.push({ id: socket.id, name: hostName, secretNumber: null });
    socket.join(room.code);
    socket.emit('joined-room', { code: room.code, isHost: true, name: hostName });
    emitRoom(room);
  });

  socket.on('join-room', ({ name, code }) => {
    const room = rooms.get(String(code || '').toUpperCase());
    if (!room) {
      socket.emit('room-error', 'Dieser Raum existiert nicht.');
      return;
    }

    if (room.players.length >= 7) {
      socket.emit('room-error', 'Der Raum ist schon voll.');
      return;
    }

    const playerName = sanitizeName(name);
    room.players.push({ id: socket.id, name: playerName, secretNumber: null });
    socket.join(room.code);
    socket.emit('joined-room', { code: room.code, isHost: false, name: playerName });
    emitRoom(room);
  });

  socket.on('update-theme', ({ code, themeIndex }) => {
    const room = rooms.get(String(code || '').toUpperCase());
    if (!room || room.hostId !== socket.id) return;
    room.theme = themePool[Number(themeIndex)] || themePool[0];
    emitRoom(room);
  });

  socket.on('start-round', ({ code }) => {
    const room = rooms.get(String(code || '').toUpperCase());
    if (!room || room.hostId !== socket.id) return;
    if (room.players.length < 2 || room.players.length > 7) {
      socket.emit('room-error', 'Es müssen 2–7 Spieler im Raum sein.');
      return;
    }
    startRound(room);
    emitRoom(room);
  });

  socket.on('update-order', ({ code, order }) => {
    const room = rooms.get(String(code || '').toUpperCase());
    if (!room || room.hostId !== socket.id) return;
    room.round = room.round || { active: true, order: [], revealed: false, mismatches: [] };
    room.round.order = Array.isArray(order) ? order : room.players.map((player) => player.id);
    room.round.revealed = false;
    room.round.mismatches = [];
    emitRoom(room);
  });

  socket.on('reveal-order', ({ code }) => {
    const room = rooms.get(String(code || '').toUpperCase());
    if (!room || room.hostId !== socket.id || !room.round) return;
    room.round.revealed = true;
    room.round.mismatches = computeMismatches(room);
    emitRoom(room);
  });

  socket.on('reset-round', ({ code }) => {
    const room = rooms.get(String(code || '').toUpperCase());
    if (!room || room.hostId !== socket.id) return;
    room.round = null;
    room.players.forEach((player) => {
      player.secretNumber = null;
    });
    emitRoom(room);
  });

  socket.on('disconnect', () => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;

    room.players = room.players.filter((player) => player.id !== socket.id);

    if (room.players.length === 0) {
      rooms.delete(room.code);
      return;
    }

    if (room.hostId === socket.id) {
      room.hostId = room.players[0].id;
    }

    if (room.round) {
      room.round.order = room.round.order.filter((id) => room.players.some((player) => player.id === id));
    }

    emitRoom(room);
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`ITO server running on http://localhost:${PORT}`);
});
*/
