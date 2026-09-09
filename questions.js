const questionForms = [
  'Wie sehr passt das zu einem perfekten Sonntag?',
  'Wie gern würdest du das heute ausprobieren?',
  'Wie unangenehm wäre das für dich?',
  'Wie mutig wäre das im Alltag?',
  'Wie sehr würdest du dafür Geld ausgeben?',
  'Wie gut passt das zu einer Party?',
  'Wie sehr würdest du das vermissen?',
  'Wie entspannend wäre das für dich?',
  'Wie überraschend wäre das für dich?',
  'Wie sehr würdest du das weiterempfehlen?',
];

const questionTopics = [
  ['ein Frühstück', 'kalter Toast', 'Frühstück im Lieblingscafe'],
  ['ein Urlaubstag', 'im Hotel verschlafen', 'spontan mit dem Boot losfahren'],
  ['ein Haustier', 'eine Schnecke beobachten', 'einen verspielten Hund adoptieren'],
  ['ein Geschenk', 'eine einzelne Büroklammer', 'eine lange gewünschte Reise'],
  ['ein Abendessen', 'eine trockene Reiswaffel', 'ein perfektes Mehrgänge-Menü'],
  ['ein Konzert', 'ein kaputter Kopfhörer', 'die Lieblingsband in der ersten Reihe'],
  ['ein Kinofilm', 'ein langweiliger Abspann', 'der beste Film des Jahres'],
  ['ein Hobby', 'zehn Minuten Puzzle', 'ein ganzes Wochenende kreativ sein'],
  ['ein Arbeitstag', 'eine kurze Pause', 'ein freier Tag ohne Termine'],
  ['ein Montagmorgen', 'der Wecker klingelt zu früh', 'Ausschlafen bei Sonnenschein'],
  ['eine Überraschung', 'eine vergessene Nachricht', 'eine riesige Überraschungsparty'],
  ['ein Einkauf', 'eine Packung Kaugummi', 'ein komplett neuer Kleiderschrank'],
  ['ein Verkehrsmittel', 'ein kurzer Fußweg', 'eine Reise im Nachtzug'],
  ['ein Wetter', 'leichter Nieselregen', 'warme Sonne am See'],
  ['eine Sportart', 'ein kurzer Spaziergang', 'ein spannendes Finale'],
  ['eine Party', 'zwei Leute im Wohnzimmer', 'ein volles Festivalgelände'],
  ['eine Nachricht', 'ein neutrales Emoji', 'eine lange persönliche Sprachnachricht'],
  ['ein Restaurant', 'ein leerer Imbiss', 'ein Tisch im besten Restaurant der Stadt'],
  ['ein Zimmer', 'ein leerer Flur', 'ein gemütliches Zimmer mit Kamin'],
  ['ein Geräusch', 'ein leises Blätterrascheln', 'ein Feuerwerk direkt neben dir'],
  ['eine Reiseplanung', 'ein grober Notizzettel', 'ein komplett durchgeplanter Traumurlaub'],
  ['ein Buch', 'eine kurze Anleitung', 'ein fesselnder Roman'],
  ['ein Handy', 'ein altes Tastenhandy', 'das neueste Smartphone'],
  ['ein Wochenendplan', 'zu Hause bleiben', 'ein spontanes Abenteuer'],
  ['eine Begegnung', 'ein kurzes Nicken', 'ein Gespräch mit einer inspirierenden Person'],
  ['eine Fähigkeit', 'einen Knoten binden', 'ein Instrument auf der Bühne spielen'],
  ['eine Wohnung', 'ein einzelnes Regal', 'ein helles Haus mit Garten'],
  ['ein Verkehrsstau', 'eine rote Ampel', 'stundenlang im Stillstand stehen'],
  ['ein freier Tag', 'zehn Minuten Ruhe', 'ein ganzer Tag ohne Verpflichtungen'],
  ['eine Feier', 'eine kleine Tasse Kaffee', 'eine unvergessliche Hochzeit'],
];

const questions = questionTopics.flatMap(([subject, min, max]) =>
  questionForms.map((form) => ({
    label: `${form} – ${subject}?`,
    min,
    max,
  })),
);

if (questions.length !== 300) {
  throw new Error(`Der Fragenpool muss genau 300 Fragen enthalten, enthält aber ${questions.length}.`);
}

module.exports = questions;
