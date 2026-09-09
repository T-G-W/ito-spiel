# ITO

Partyspiel für **4–7 Spieler**.  
Jeder hat heimlich eine Zahl. Es gibt ein Thema mit einer Skala von wenig nach viel. Die Gruppe muss sich in der richtigen Reihenfolge aufstellen – **ohne Zahlen zu nennen**.

Dauer pro Runde: ca. 5–10 Minuten.

---

## Ziel

Die geheimen Zahlen von links nach rechts **aufsteigend** sortieren (kleinste Zahl links, größte rechts).

Zwei Spielweisen:

- **Kooperativ:** Die ganze Gruppe gewinnt, wenn die Reihenfolge stimmt (oder nur 0–1 Fehler hat).
- **Punkte:** Jeder richtige Nachbar-Vergleich gibt Punkte. Wer die Reihe sprengt, verliert Leben.

---

## Vorbereitung

1. Host startet eine Runde und wählt (oder generiert) ein Thema inkl. Skalen-Enden.
2. Jeder Spieler bekommt **heimlich** eine Zahl von **1–100**.
3. Niemand darf die eigene Zahl nennen, zeigen oder andeuten („meine ist zweistellig“, „knapp über 50“ …).

---

## Ablauf

1. Host liest Thema und Skala vor.
2. Freie Diskussion. Nur Bilder, Vergleiche, Anekdoten, Gefühl.
3. Die Gruppe einigt sich auf eine Reihenfolge und stellt sich so auf (oder sortiert Namen auf dem Screen).
4. Auflösung: Zahlen aufdecken.
5. Prüfen, ob die Reihe streng aufsteigend ist.

Optional: Danach kurz nachbesprechen, *warum* zwei enge Zahlen vertauscht wurden. Das ist oft der witzigste Teil.

---

## Was erlaubt / verboten ist

**Erlaubt**
- Vergleiche mit Alltagsdingen
- Persönliche Einschätzung („für mich wäre das …“)
- Ungefähre Lage auf der Skala in Worten („eher am unteren Ende“, „knapp hinter der Mitte“)

**Verboten**
- Konkrete Zahlen
- Prozent, Noten, „erste Hälfte / zweite Hälfte“ als getarnte Zahl
- Die eigene Karte zeigen

Hausregel festlegen, bevor die erste Runde startet.

---

## Beispiel (5 Spieler)

**Thema:** Wie sehr würde ich das zum Geburtstag wollen?  
**Skala:** 1 = bitte nicht · 100 = sofort auspacken

| Spieler | Geheime Zahl | Typischer Satz |
|---|---|---|
| Anna | 14 | „Höflich lächeln und später weiterverschenken.“ |
| Ben | 37 | „Okay, aber ich renn nicht extra in den Keller.“ |
| Chiara | 41 | „Ähnlich wie Ben, nur ein Tick persönlicher.“ |
| David | 68 | „Oh nice – noch am selben Abend ausprobieren.“ |
| Emma | 94 | „Das erste Paket. Alle anderen müssen warten.“ |

Sortierung nach dem Gespräch:

```
Anna – Ben – Chiara – David – Emma
 14     37      41      68      94
```

→ richtig.

Wäre Chiara vor Ben gegangen (41 vor 37), wäre die Runde verloren. Genau solche engen Paare erzeugen den Streit.

---

## Weitere Themen-Ideen

| Thema | 1 | 100 |
|---|---|---|
| Wie gefährlich ist das Tier? | Hamster | Hungry Hippo im falschen Gehege |
| Wie scharf ist das Essen? | Toast | Reines Capsaicin |
| Wie peinlich wäre das in der Bahn? | leise niesen | Karaoke ohne Kopfhörer |
| Wie teuer fühlt sich das an? | Kaugummi | Mondflug |
| Wie sehr will ich das am Montagmorgen? | Steuererklärung | freier Tag + Sonnenschein |
| Wie romantisch ist das? | Socken zu Weihnachten | spontaner Antrag |
| Wie sehr stört mich das auf einer WG-Party? | ein offenes Fenster | jemand räumt meinen Kühlschrank leer |
| Wie kindisch ist das Hobby? | Schach | 4000-Teile-Lego um 3 Uhr nachts |

Gute Themen sind subjektiv. Schlechte Themen haben eine „objektive“ Reihenfolge, die jeder kennt (z. B. „Höhe von Bergen“).

---

## Varianten

**Enger Zahlenraum**  
Zahlen nur 1–20. Viel mehr Kollisionen, härtere Diskussion.

**Leben**  
Die Gruppe hat 3 Leben. Jede falsche Reihe kostet 1 Leben.

**Verräter**  
Ein Spieler kennt alle Zahlen (oder darf lügen) und versucht, die Reihe zu sprengen. Danach Abstimmung: Wer war’s?

**Doppel-Thema**  
Zwei Skalen nacheinander mit denselben Zahlen. Zweite Runde geht schneller, weil ihr schon ein Gefühl füreinander habt.

**Stille Runde**  
Nur ein Satz pro Person, dann sofort aufstellen. Sehr kurz, sehr brutal.

---

## Web-App – grobe Spec

### Screens
- Lobby: Room-Code, Namen, Spieleranzahl 4–7
- Host: Thema wählen / würfeln, Runde starten
- Spieler-Handy: nur die eigene Zahl + aktuelles Thema
- Gemeinsamer Screen (optional): Thema, Skala, Namens-Slots zum Sortieren
- Reveal: Zahlen unter den Namen, falsch sortierte Paare markieren

### Daten pro Runde
- `theme`, `scaleMinLabel`, `scaleMaxLabel`
- `players[]`: id, name, secretNumber
- `proposedOrder[]`: playerIds
- `result`: korrekt / Fehlerpaare

### Logik
- Zahlen unique ziehen (1–100, ohne Doppelte)
- Validierung: `order[i].number < order[i+1].number` für alle i
- Optional: Abstand anzeigen („37 und 41 – nur 4 auseinander“)

### UX-Details, die sich lohnen
- „Zahl merken“-Button, der die Zahl nach 8 Sekunden ausblendet
- Drag-and-drop der Namen auf dem Host-Screen
- Themen-Generator mit Kategorien (Essen, Peinlich, Gefahr, Wunsch)
- Kurze Regelkarte in der Lobby („keine Zahlen“)

---

## Warum das Spiel trägt

ITO ist kein Lügen-Spiel wie Imposter und kein Rate-Spiel wie Wer-bin-ich. Der Konflikt sitzt in der **Sprache**: Zwei Leute beschreiben „mittel“, meinen aber 37 und 68. Die Gruppe muss herausfinden, wessen „mittel“ näher an 1 und wessen näher an 100 liegt.
