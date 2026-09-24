// ── bot.js ─────────────────────────────────────────────────
// Bot fuer Hard und Normal in Classic und Duell. Er rechnet Zuege voraus (Alpha-Beta) mit einem
// FESTEN Denk-Budget statt einer Uhrzeit: gleich stark auf jedem Geraet, und ein Zug dauert auch
// auf schwachen Handys nicht lange. Jede Partie bekommt einen von drei Spielstilen; bei fast
// gleich guten Zuegen entscheidet der Zufall, damit sich keine Partie wiederholt.
// Regeln wie im Spiel: Sprung wie im Brettspiel Quoridor, Wand-Ueberlappung wie tryWall,
// jede Wand muss beiden Spielern einen Weg lassen (Figuren blockieren keinen Weg).
// Die Datei ist im Browser (js/bot.js) und in der App (src/lib/bot.js) gleich — bis auf die
// Export-Zeile der App am Ende.

var BOT_WIN = 100000;
var BOT_ZITTERN = 0.08; // wie stark die Gewichte je Partie schwanken (8 %)

// Merkmale einer Stellung aus Sicht des Spielers am Zug (die Gewichte g[0..5] gehoeren dazu):
// 0 am Zug sein, 1 Weg-Vorsprung, 2 Wand-Vorsprung, 3 nutzbare Waende (nie mehr als der
// Restweg des Gegners), 4 reines Rennen ohne Waende entschieden, 5 Gegner hat keine Waende mehr.
function botMerkmale(dMe, dOp, wMe, wOp) {
  return [
    1,
    dOp - dMe,
    wMe - wOp,
    Math.min(wMe, dOp) - Math.min(wOp, dMe),
    (wMe === 0 && wOp === 0) ? (dMe <= dOp ? 1 : -1) : 0,
    (wOp === 0 ? 1 : 0) - (wMe === 0 ? 1 : 0)
  ];
}

// Spielstile je Modus (race = Classic, duel9/duel7 = Duell) und Stufe. Felder:
// g Gewichte der Merkmale, tol Zufalls-Spielraum (Zuege so nah am besten gelten als gleich gut),
// wb Wand-Neigung, kr Strafe fuers Zuruecklaufen, vd Vorwaertsdrang, k/k1 Wand-Kandidaten im Vorausrechnen,
// tl wie weit vorne auf dem Gegnerweg Waende gesucht werden, b Denk-Budget,
// f Fehler-Wahrscheinlichkeit, fn aus wie vielen der besten Zuege ein Fehler gewaehlt wird.
var BOT_STILE = {
  race: {
    hard: [
      {"n":"Mauerer","g":[53.4,100,131.4,59.2,762.1,-182.9],"tol":24,"wb":40,"kr":200,"vd":60,"k":6,"k1":4,"tl":6,"b":240000,"f":0,"fn":1},
      {"n":"Renner","g":[53.4,100,205.3,59.2,762.1,-182.9],"tol":24,"wb":-40,"kr":200,"vd":100,"k":6,"k1":4,"tl":6,"b":240000,"f":0,"fn":1},
      {"n":"Konter","g":[53.4,100,164.2,59.2,762.1,-182.9],"tol":24,"wb":0,"kr":200,"vd":60,"k":6,"k1":4,"tl":4,"b":240000,"f":0,"fn":1}
    ],
    normal: [
      {"n":"Mauerer","g":[53.4,100,131.4,59.2,762.1,-182.9],"tol":40,"wb":40,"kr":200,"vd":60,"k":3,"k1":2,"tl":4,"b":2000,"f":0.25,"fn":3},
      {"n":"Renner","g":[53.4,100,205.3,59.2,762.1,-182.9],"tol":40,"wb":-40,"kr":200,"vd":100,"k":3,"k1":2,"tl":4,"b":2000,"f":0.25,"fn":3},
      {"n":"Konter","g":[53.4,100,164.2,59.2,762.1,-182.9],"tol":40,"wb":0,"kr":200,"vd":60,"k":3,"k1":2,"tl":4,"b":2000,"f":0.25,"fn":3}
    ]
  },
  duel9: {
    hard: [
      {"n":"Mauerer","g":[42.8,100,141.2,30.4,646.2,-21.9],"tol":24,"wb":20,"kr":60,"vd":0,"k":6,"k1":4,"tl":6,"b":330000,"f":0,"fn":1},
      {"n":"Renner","g":[42.8,100,196.1,30.4,646.2,-21.9],"tol":24,"wb":-40,"kr":60,"vd":40,"k":6,"k1":4,"tl":6,"b":330000,"f":0,"fn":1},
      {"n":"Konter","g":[42.8,100,156.9,30.4,646.2,-21.9],"tol":24,"wb":0,"kr":60,"vd":0,"k":6,"k1":4,"tl":4,"b":330000,"f":0,"fn":1}
    ],
    normal: [
      {"n":"Mauerer","g":[42.8,100,141.2,30.4,646.2,-21.9],"tol":40,"wb":20,"kr":60,"vd":0,"k":3,"k1":2,"tl":4,"b":2000,"f":0.25,"fn":3},
      {"n":"Renner","g":[42.8,100,196.1,30.4,646.2,-21.9],"tol":40,"wb":-40,"kr":60,"vd":40,"k":3,"k1":2,"tl":4,"b":2000,"f":0.25,"fn":3},
      {"n":"Konter","g":[42.8,100,156.9,30.4,646.2,-21.9],"tol":40,"wb":0,"kr":60,"vd":0,"k":3,"k1":2,"tl":4,"b":2000,"f":0.25,"fn":3}
    ]
  },
  duel7: {
    hard: [
      {"n":"Mauerer","g":[44.3,100,38.2,0,0,55.8],"tol":24,"wb":40,"kr":60,"vd":0,"k":6,"k1":4,"tl":6,"b":420000,"f":0,"fn":1},
      {"n":"Renner","g":[44.3,100,59.6,0,0,55.8],"tol":24,"wb":-40,"kr":60,"vd":40,"k":6,"k1":4,"tl":6,"b":420000,"f":0,"fn":1},
      {"n":"Konter","g":[44.3,100,47.7,0,0,55.8],"tol":24,"wb":0,"kr":60,"vd":0,"k":6,"k1":4,"tl":4,"b":420000,"f":0,"fn":1}
    ],
    normal: [
      {"n":"Mauerer","g":[44.3,100,38.2,0,0,55.8],"tol":40,"wb":40,"kr":60,"vd":0,"k":3,"k1":2,"tl":4,"b":2000,"f":0.175,"fn":3},
      {"n":"Renner","g":[44.3,100,59.6,0,0,55.8],"tol":40,"wb":-40,"kr":60,"vd":40,"k":3,"k1":2,"tl":4,"b":2000,"f":0.175,"fn":3},
      {"n":"Konter","g":[44.3,100,47.7,0,0,55.8],"tol":40,"wb":0,"kr":60,"vd":0,"k":3,"k1":2,"tl":4,"b":2000,"f":0.175,"fn":3}
    ]
  }
};

// Kopie eines Stils mit leicht verschobenen Gewichten (zw: Zufallswerte in [-1,1] je Gewicht,
// einmal pro Partie gezogen) — jede Partie spielt so ein klein wenig anders.
function botStilZiehen(stil, zw, zittern) {
  var c = {}, k;
  for (k in stil) c[k] = stil[k];
  c.g = stil.g.map(function (x, i) { return x * (1 + zittern * (zw[i] || 0)); });
  return c;
}

function botModus(rows, meGoal, oppGoal) {
  return meGoal === oppGoal ? 'race' : (rows >= 9 ? 'duel9' : 'duel7');
}

function botBrett(R, C) {
  var N = R * C, M = (R - 1) * (C - 1);
  return {
    R: R, C: C, N: N, M: M,
    dn: new Uint8Array(N), rt: new Uint8Array(N), hw: new Uint8Array(M), vw: new Uint8Array(M),
    q: new Int16Array(N), stC: new Int32Array(N), stW: new Int32Array(2 * M), st: 0, frei: [],
    pos: [0, 0], goal: [0, 0], barr: [0, 0], same: false, kosten: 0, abbruch: false, stil: null
  };
}

// Wand setzen (d=1) oder entfernen (d=-1). v: 0 = waagerecht (H), 1 = senkrecht (V).
function botWand(S, v, r, c, d) {
  var C = S.C, i = r * (C - 1) + c;
  if (v === 0) { S.hw[i] += d; S.dn[r * C + c] += d; S.dn[r * C + c + 1] += d; }
  else { S.vw[i] += d; S.rt[r * C + c] += d; S.rt[(r + 1) * C + c] += d; }
}
function botWandIdx(S, idx, d) {
  var v = idx >= S.M ? 1 : 0, rc = idx - v * S.M, W1 = S.C - 1, r = (rc / W1) | 0;
  botWand(S, v, r, rc - r * W1, d);
}
// Ueberlappungsregel wie tryWall in game-logic.js
function botWandFrei(S, v, r, c) {
  var W1 = S.C - 1, i = r * W1 + c;
  if (v === 0) return !S.hw[i] && !(c > 0 && S.hw[i - 1]) && !(c < W1 - 1 && S.hw[i + 1]) && !S.vw[i];
  return !S.vw[i] && !(r > 0 && S.vw[i - W1]) && !(r < S.R - 2 && S.vw[i + W1]) && !S.hw[i];
}

function botNimm(S) { return S.frei.length ? S.frei.pop() : new Int16Array(S.N); }
function botGib(S, F) { S.frei.push(F); }

// Abstand jedes Feldes zur Zielreihe g (Breitensuche von der Zielreihe aus); 999 = kein Weg
function botFeld(S, g, F) {
  var C = S.C, N = S.N, q = S.q, dn = S.dn, rt = S.rt, h = 0, t = 0, u, d, c;
  F.fill(999);
  for (c = 0; c < C; c++) { F[g * C + c] = 0; q[t++] = g * C + c; }
  while (h < t) {
    u = q[h++]; d = F[u] + 1; c = u % C;
    if (u >= C && F[u - C] === 999 && !dn[u - C]) { F[u - C] = d; q[t++] = u - C; }
    if (u < N - C && F[u + C] === 999 && !dn[u]) { F[u + C] = d; q[t++] = u + C; }
    if (c > 0 && F[u - 1] === 999 && !rt[u - 1]) { F[u - 1] = d; q[t++] = u - 1; }
    if (c < C - 1 && F[u + 1] === 999 && !rt[u]) { F[u + 1] = d; q[t++] = u + 1; }
  }
  S.kosten -= 4;
}

// Nachbarfeld in Richtung k (0 hoch, 1 runter, 2 links, 3 rechts) oder -1
function botNachbar(S, u, k) {
  var C = S.C, c;
  if (k === 0) return (u >= C && !S.dn[u - C]) ? u - C : -1;
  if (k === 1) return (u < S.N - C && !S.dn[u]) ? u + C : -1;
  c = u % C;
  if (k === 2) return (c > 0 && !S.rt[u - 1]) ? u - 1 : -1;
  return (c < C - 1 && !S.rt[u]) ? u + 1 : -1;
}
// Zuege wie getValidMoves. Sprung wie im Brettspiel Quoridor: gerade ueber den Gegner; nur wenn
// dahinter Wand oder Rand ist, schraeg daneben (Richtung 0/1 = hoch/runter, 2/3 = links/rechts).
function botZuege(S, me, op, out) {
  var n = 0, k, x, y;
  for (k = 0; k < 4; k++) {
    x = botNachbar(S, me, k);
    if (x < 0) continue;
    if (x !== op) { out[n++] = x; continue; }
    y = botNachbar(S, op, k);
    if (y >= 0) { out[n++] = y; continue; }
    y = botNachbar(S, op, k < 2 ? 2 : 0); if (y >= 0) out[n++] = y;
    y = botNachbar(S, op, k < 2 ? 3 : 1); if (y >= 0) out[n++] = y;
  }
  out.length = n;
  return n;
}

// Waende, die eine Kante auf einem kuerzesten Weg des Gegners sperren (bis tl Schritte vor ihm)
function botKandidaten(S, op, Fop, tl, out) {
  var C = S.C, R = S.R, W1 = C - 1, M = S.M, q = S.q, st = ++S.st, h = 0, t = 0, n = 0, u, d, r, c, grenze;
  var stC = S.stC, stW = S.stW, dn = S.dn, rt = S.rt;
  function nimm(v, wr, wc) {
    if (wr < 0 || wr > R - 2 || wc < 0 || wc > C - 2) return;
    var i = v * M + wr * W1 + wc;
    if (stW[i] !== st) { stW[i] = st; out[n++] = i; }
  }
  function besuch(x) { if (stC[x] !== st) { stC[x] = st; q[t++] = x; } }
  grenze = Fop[op] - tl;
  q[t++] = op; stC[op] = st;
  while (h < t) {
    u = q[h++]; d = Fop[u];
    if (d === 0 || d <= grenze) continue;
    r = (u / C) | 0; c = u - r * C;
    if (r > 0 && !dn[u - C] && Fop[u - C] === d - 1) { nimm(0, r - 1, c); nimm(0, r - 1, c - 1); besuch(u - C); }
    if (r < R - 1 && !dn[u] && Fop[u + C] === d - 1) { nimm(0, r, c); nimm(0, r, c - 1); besuch(u + C); }
    if (c > 0 && !rt[u - 1] && Fop[u - 1] === d - 1) { nimm(1, r, c - 1); nimm(1, r - 1, c - 1); besuch(u - 1); }
    if (c < C - 1 && !rt[u] && Fop[u + 1] === d - 1) { nimm(1, r, c); nimm(1, r - 1, c); besuch(u + 1); }
  }
  out.length = n;
  return n;
}

// Gueltige Waende fuer Spieler s, die den Gegner mindestens einen Schritt kosten — mit den neuen
// Abstandsfeldern, nach Gewinn sortiert (Gegner-Verlust minus eigener Verlust), hoechstens maxK.
function botWandZuege(S, s, F0, F1, tl, maxK) {
  var o = 1 - s, me = S.pos[s], op = S.pos[o], Fme = s ? F1 : F0, Fop = s ? F0 : F1;
  var dMe = Fme[me], dOp = Fop[op], kand = [], res = [], i, idx, v, rc, r, c, W1 = S.C - 1, nOp, nMe;
  botKandidaten(S, op, Fop, tl, kand);
  for (i = 0; i < kand.length; i++) {
    idx = kand[i]; v = idx >= S.M ? 1 : 0; rc = idx - v * S.M; r = (rc / W1) | 0; c = rc - r * W1;
    if (!botWandFrei(S, v, r, c)) continue;
    botWand(S, v, r, c, 1);
    nOp = botNimm(S); botFeld(S, S.goal[o], nOp);
    if (nOp[op] >= 999 || nOp[op] - dOp < 1) { botWand(S, v, r, c, -1); botGib(S, nOp); continue; }
    if (S.same) nMe = nOp;
    else { nMe = botNimm(S); botFeld(S, S.goal[s], nMe); }
    botWand(S, v, r, c, -1);
    if (nMe[me] >= 999) { botGib(S, nOp); if (nMe !== nOp) botGib(S, nMe); continue; }
    res.push({ i: idx, f0: s ? nOp : nMe, f1: s ? nMe : nOp, g: (nOp[op] - dOp) - (nMe[me] - dMe) });
  }
  res.sort(function (a, b) { return b.g - a.g; });
  for (i = maxK; i < res.length; i++) botGibPaar(S, res[i]);
  if (res.length > maxK) res.length = maxK;
  return res;
}
function botGibPaar(S, w) { botGib(S, w.f0); if (w.f1 !== w.f0) botGib(S, w.f1); }

// Dieselbe Rechnung wie Summe(g[i] * botMerkmale[i]) — ausgeschrieben, weil sie im Vorausrechnen am
// haeufigsten laeuft (bottest.js prueft die Gleichheit).
function botWert(S, s, dMe, dOp) {
  var g = S.stil.g, wMe = S.barr[s], wOp = S.barr[1 - s];
  return g[0] + g[1] * (dOp - dMe) + g[2] * (wMe - wOp) + g[3] * (Math.min(wMe, dOp) - Math.min(wOp, dMe)) +
    g[4] * ((wMe === 0 && wOp === 0) ? (dMe <= dOp ? 1 : -1) : 0) + g[5] * ((wOp === 0 ? 1 : 0) - (wMe === 0 ? 1 : 0));
}

// Negamax mit Alpha-Beta: Wert aus Sicht von Spieler s (am Zug)
function botSuche(S, s, F0, F1, tiefe, alpha, beta, ply) {
  if (--S.kosten < 0) S.abbruch = true;
  if (S.abbruch) return 0;
  var o = 1 - s, me = S.pos[s], op = S.pos[o], Fme = s ? F1 : F0, Fop = s ? F0 : F1;
  var gz = S.goal[s] * S.C, zz = [], n = botZuege(S, me, op, zz), i, sc, best = -Infinity, ww, w;
  for (i = 0; i < n; i++) if (zz[i] >= gz && zz[i] < gz + S.C) return BOT_WIN - ply;
  if (tiefe <= 0) return botWert(S, s, Fme[me], Fop[op]);
  zz.sort(function (a, b) { return Fme[a] - Fme[b]; });
  for (i = 0; i < n; i++) {
    S.pos[s] = zz[i];
    sc = -botSuche(S, o, F0, F1, tiefe - 1, -beta, -alpha, ply + 1);
    S.pos[s] = me;
    if (S.abbruch) return 0;
    if (sc > best) { best = sc; if (sc > alpha) { alpha = sc; if (alpha >= beta) return best; } }
  }
  if (S.barr[s] > 0) {
    ww = botWandZuege(S, s, F0, F1, S.stil.tl, tiefe >= 2 ? S.stil.k : S.stil.k1);
    for (i = 0; i < ww.length; i++) {
      w = ww[i];
      if (alpha < beta && !S.abbruch) {
        botWandIdx(S, w.i, 1); S.barr[s]--;
        sc = -botSuche(S, o, w.f0, w.f1, tiefe - 1, -beta, -alpha, ply + 1);
        botWandIdx(S, w.i, -1); S.barr[s]++;
        if (sc > best) { best = sc; if (sc > alpha) alpha = sc; }
      }
      botGibPaar(S, w);
    }
    if (S.abbruch) return 0;
  }
  // Eingesperrt (kein Zug, keine Wand): wie eine normale Stellung bewerten
  return best === -Infinity ? botWert(S, s, Fme[me], Fop[op]) : best;
}

// Ein Durchgang an der Wurzel. Zuege, die mehr als tol schlechter sind als der beste,
// werden nur grob widerlegt (Fenster), alle anderen bekommen einen genauen Wert.
function botWurzel(S, wurzel, tiefe) {
  var best = -Infinity, i, m, a, sc, tol = S.stil.tol;
  for (i = 0; i < wurzel.length; i++) {
    m = wurzel[i];
    a = best === -Infinity ? -Infinity : best - tol - m.bonus - 1;
    if (m.wand >= 0) { botWandIdx(S, m.wand, 1); S.barr[0]--; } else S.pos[0] = m.zug;
    sc = -botSuche(S, 1, m.f0, m.f1, tiefe - 1, -Infinity, -a, 1);
    if (m.wand >= 0) { botWandIdx(S, m.wand, -1); S.barr[0]++; } else S.pos[0] = S.start;
    if (S.abbruch) return false;
    m.s = sc + m.bonus;
    if (m.s > best) best = m.s;
  }
  return true;
}

// z: {rows, cols, me:{r,c}, opp:{r,c}, meGoal, oppGoal, walls (Set/Array 'H-r-c'), meBarr, oppBarr,
//     recent: [{r,c}] (eigene letzte Felder, aktuelles zuerst), stil, rnd (optional), info (optional {})}
// Ergebnis: {type:'move', pos:{r,c}} oder {type:'wall', key:'H-r-c'}
function botZug(z) {
  var R = z.rows, C = z.cols, S = botBrett(R, C), rnd = z.rnd || Math.random, stil = z.stil;
  var recent = z.recent || [], i, j, m, tiefe, fertig = 0, best, wahl, kand, zz = [], n, F0, F1, ww, p;
  (z.walls.forEach ? z.walls : []).forEach(function (k) {
    var a = k.split('-');
    botWand(S, a[0] === 'H' ? 0 : 1, +a[1], +a[2], 1);
  });
  S.pos[0] = z.me.r * C + z.me.c; S.pos[1] = z.opp.r * C + z.opp.c; S.start = S.pos[0];
  S.goal[0] = z.meGoal; S.goal[1] = z.oppGoal; S.barr[0] = z.meBarr; S.barr[1] = z.oppBarr;
  S.same = z.meGoal === z.oppGoal; S.stil = stil; S.kosten = stil.b;
  F0 = botNimm(S); botFeld(S, S.goal[0], F0);
  F1 = S.same ? F0 : botNimm(S);
  if (!S.same) botFeld(S, S.goal[1], F1);
  n = botZuege(S, S.pos[0], S.pos[1], zz);
  for (i = 0; i < n; i++) if (((zz[i] / C) | 0) === S.goal[0]) return { type: 'move', pos: { r: z.meGoal, c: zz[i] % C } };
  // Zuletzt besuchte Felder (ohne das aktuelle — das Spiel fuehrt es doppelt): Zuruecklaufen kostet,
  // am meisten aufs gerade verlassene Feld.
  var vorher = [];
  for (j = 0; j < recent.length && vorher.length < 4; j++) {
    p = recent[j].r * C + recent[j].c;
    if (p !== S.start && vorher.indexOf(p) < 0) vorher.push(p);
  }
  var wurzel = [];
  for (i = 0; i < n; i++) {
    m = { zug: zz[i], wand: -1, f0: F0, f1: F1, bonus: 0, s: 0, ok: -Infinity };
    j = vorher.indexOf(zz[i]);
    if (j >= 0) m.bonus = -stil.kr * (4 - j) / 4;
    if (stil.vd && F0[zz[i]] < F0[S.start]) m.bonus += stil.vd; // Vorwaertsdrang: echter Fortschritt zaehlt extra
    wurzel.push(m);
  }
  if (S.barr[0] > 0) {
    ww = botWandZuege(S, 0, F0, F1, 99, 999);
    for (i = 0; i < ww.length; i++) wurzel.push({ zug: -1, wand: ww[i].i, f0: ww[i].f0, f1: ww[i].f1, bonus: stil.wb, s: 0, ok: -Infinity });
  }
  if (!wurzel.length) return null; // eingesperrt und keine Wand mehr: der alte Bot uebernimmt
  for (tiefe = 1; tiefe <= 12; tiefe++) {
    if (!botWurzel(S, wurzel, tiefe)) break;
    fertig = tiefe;
    for (i = 0; i < wurzel.length; i++) wurzel[i].ok = wurzel[i].s;
    wurzel.sort(function (a, b) { return b.ok - a.ok; });
    if (Math.abs(wurzel[0].ok) > BOT_WIN / 2) break;
  }
  if (z.info) {
    z.info.tiefe = fertig; z.info.kosten = stil.b - S.kosten;
    z.info.wurzel = wurzel.map(function (w) { return { zug: w.zug >= 0 ? ((w.zug / C) | 0) + ',' + (w.zug % C) : w.wand, wert: w.ok }; });
  }
  if (!fertig) {
    // Budget reicht nicht einmal fuer eine Ebene: auf dem kuerzesten Weg weiter
    zz.sort(function (a, b) { return F0[a] - F0[b]; });
    return { type: 'move', pos: { r: (zz[0] / C) | 0, c: zz[0] % C } };
  }
  best = wurzel[0].ok;
  kand = [];
  // Erzwungener Sieg bzw. erzwungene Niederlage: nur der schnellste Sieg / das laengste Halten
  // zaehlt — sonst waehlt der Zufall zwischen schnellem und langsamem Sieg und der Bot laeuft Umwege.
  if (Math.abs(best) > BOT_WIN / 2) {
    for (i = 0; i < wurzel.length; i++) if (wurzel[i].ok === best) kand.push(wurzel[i]);
  } else if (stil.f > 0 && rnd() < stil.f) {
    // Ein Fehler soll wie ein menschlicher aussehen: eine andere Wand oder ein anderer Schritt Richtung Ziel —
    // nie weg vom Ziel und nie zurueck auf ein gerade besuchtes Feld, sonst laeuft er sichtbar hin und her
    // (Tunays Handy-Test 2026-09-23). Der beste Zug bleibt immer Kandidat.
    for (i = 0; i < Math.min(stil.fn, wurzel.length); i++) {
      m = wurzel[i];
      if (m.ok > -BOT_WIN / 2 && (i === 0 || m.wand >= 0 || (F0[m.zug] < F0[S.start] && vorher.indexOf(m.zug) < 0))) kand.push(m);
    }
  }
  if (!kand.length) for (i = 0; i < wurzel.length; i++) if (wurzel[i].ok >= best - stil.tol) kand.push(wurzel[i]);
  // Unter gleich guten Zuegen nie auf der Stelle treten: gibt es einen Schritt Richtung Ziel, fallen Figurenzuege
  // ohne Fortschritt weg (Waende bleiben). Rechnet der Bot tief genug, ist es ihm sonst egal, ob er jetzt oder
  // spaeter geht — er truedelte einen sicheren Sieg endlos hin und her (Handy- und Browser-Test 2026-09-23).
  if (kand.some(function (x) { return x.wand < 0 && F0[x.zug] < F0[S.start]; })) {
    kand = kand.filter(function (x) { return x.wand >= 0 || F0[x.zug] < F0[S.start]; });
  }
  wahl = kand[Math.floor(rnd() * kand.length) % kand.length];
  if (wahl.wand >= 0) {
    p = wahl.wand; j = p >= S.M ? 1 : 0; p -= j * S.M;
    return { type: 'wall', key: (j ? 'V-' : 'H-') + ((p / (C - 1)) | 0) + '-' + (p % (C - 1)) };
  }
  return { type: 'move', pos: { r: (wahl.zug / C) | 0, c: wahl.zug % C } };
}
