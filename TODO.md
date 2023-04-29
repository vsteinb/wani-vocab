startpunkte sind herauszufinden. Verschiebe diese aufeinender, bevor verglichen wird.
Beziehe auch den Abstand der Startpunkte zueinander in die Bewertung mit ein.


Bugs:
bei resize fehlt letter-hint

Pro stroke:
1. perzentilen um perfekten stroke malen (kann unabhängig schon bei draw geschen, um Zeit zu sparen)

2. Minuspunkte bestimmen:
- lege drawn in perzentilen
- Verhältnis Strokelänge

3. verechnen:
misses = (Summe der Perzentilen * rel. Anteil am drawn) * andere Penalties
score ist dann misses * 5%

Pro kanji:
gewichte results der strokes nach strokelänge

Pro vocab:
arithmetischer mw