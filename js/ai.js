// ── ai.js (ausgelagert aus index.html) ────────────────────
// KI-Engine: aiEasy/Normal/Hard/Duel, Chaos/Drop/Hammer-AI.
// Referenziert COLS/ROWS/CELL/WW aus globalem Scope; BFS-Funktionen aus game-logic.js.
function aiHammerBreak(aiPos,walls,goalRow=0){
  const base=bfsPath(aiPos,walls,goalRow);
  if(!base)return null;
  const baseD=base.length-1;
  let best=null,bestGain=0;
  for(const k of walls){
    if(isSteelWall(k))continue;
    const w2=new Set(walls);w2.delete(k);
    const np=bfsPath(aiPos,w2,goalRow);
    if(!np)continue;
    const gain=baseD-(np.length-1);
    if(gain>bestGain){bestGain=gain;best=k;}
  }
  return bestGain>=2?best:null;
}
function nearestHammer(aiPos,walls,hammers){
  if(!hammers||!hammers.length)return null;
  let best=null,bestLen=Infinity;
  for(const h of hammers){
    const p=bfsTo(aiPos,h,walls);
    if(p&&(p.length-1)<bestLen){bestLen=p.length-1;best={h,path:p};}
  }
  return best;
}
function wallPos(key){
  const[type,rs,cs]=key.split('-');const r=+rs,c=+cs;
  return type==='H'?{left:c*CELL,top:(r+1)*CELL-WW/2,width:2*CELL,height:WW}:{left:(c+1)*CELL-WW/2,top:r*CELL,width:WW,height:2*CELL};
}

// ── Chaos: faire Drop-Position ─────────────────────────────
function bfsDistMap(from,walls){
  const dist=new Map();
  const q=[from];
  dist.set(ck(from.r,from.c),0);
  while(q.length){
    const cur=q.shift();
    const d=dist.get(ck(cur.r,cur.c));
    for(const[dr,dc]of[[-1,0],[1,0],[0,-1],[0,1]]){
      const nr=cur.r+dr,nc=cur.c+dc;
      if(nr<0||nr>=ROWS||nc<0||nc>=COLS)continue;
      const k=ck(nr,nc);
      if(dist.has(k))continue;
      if(edgeBlocked(cur.r,cur.c,nr,nc,walls))continue;
      dist.set(k,d+1);
      q.push({r:nr,c:nc});
    }
  }
  return dist;
}
function pickChaosPos(pA,pB,walls,goalA=0,goalB=0){
  const pa=bfsPath(pA,walls,goalA),pb=bfsPath(pB,walls,goalB);
  if(!pa||!pb)return null;
  const lenA=pa.length-1,lenB=pb.length-1;
  // Faire Zone: vertikal zwischen den beiden Spielern (richtungsneutral),
  // mit 1 Reihe Abstand zu beiden Ziellinien, nie hinter/auf einem Spieler.
  const loR=Math.min(pA.r,pB.r),hiR=Math.max(pA.r,pB.r);
  const minR=Math.max(1,loR);
  const maxR=Math.min(ROWS-2,hiR);
  if(maxR<minR)return null;
  const inZone=p=>{
    if(p.r<minR||p.r>maxR)return false;
    if(p.r===pA.r&&p.c===pA.c)return false;
    if(p.r===pB.r&&p.c===pB.c)return false;
    return true;
  };

  // Ungleichgewicht > 1: Item DIREKT auf BFS-Pfad des Schwächeren platzieren
  // → garantiert erreichbar, kein Detour vom Ziel, nicht hinter Mauern
  if(Math.abs(lenA-lenB)>1){
    const weakPath=lenA>lenB?pa:pb;
    // Bevorzugt 2–4 Schritte voraus auf seinem Pfad
    for(let k=2;k<=Math.min(4,weakPath.length-1);k++){
      if(inZone(weakPath[k]))return{r:weakPath[k].r,c:weakPath[k].c};
    }
    // Fallback: erster Pfad-Schritt der in Zone passt
    for(let k=1;k<weakPath.length;k++){
      if(inZone(weakPath[k]))return{r:weakPath[k].r,c:weakPath[k].c};
    }
  }

  // Gleichstand: Position die für beide BFS-erreichbar und ähnlich nah ist
  const dmA=bfsDistMap(pA,walls);
  const dmB=bfsDistMap(pB,walls);
  let best=null,bestScore=Infinity;
  for(let r=minR;r<=maxR;r++){
    for(let c=0;c<COLS;c++){
      if(!inZone({r,c}))continue;
      const dA=dmA.get(ck(r,c)),dB=dmB.get(ck(r,c));
      if(dA===undefined||dB===undefined)continue; // unerreichbar (hinter Mauer)
      // Kleine Summe + kleine Differenz = fair & nicht zu weit
      const score=dA+dB+Math.abs(dA-dB)*3;
      if(score<bestScore){bestScore=score;best={r,c};}
    }
  }
  return best;
}

// ── Random-Drop: Intervall je Häufigkeit ───────────────────
function dropInterval(mode){
  if(mode==='rare')return 30+Math.floor(Math.random()*11);     // 30–40
  if(mode==='often')return 20+Math.floor(Math.random()*6);     // 20–25
  if(mode==='veryoften')return 10+Math.floor(Math.random()*6); // 10–15
  return 99999;
}
// ── Random-Drop: faire Wand wählen ─────────────────────────
// Behindert eher den Führenden, niemals den Hinterherlaufenden stärker;
// tryWall garantiert, dass beide immer einen Weg zum Ziel behalten.
function pickFairDropWall(pA,pB,walls,goalA=0,goalB=0){
  const pa=bfsPath(pA,walls,goalA),pb=bfsPath(pB,walls,goalB);
  if(!pa||!pb)return null;
  const lenA=pa.length-1,lenB=pb.length-1;
  const leaderIsA=lenA<=lenB;                 // kleinere Distanz = näher am Ziel = Vorteil
  const leaderPos=leaderIsA?pA:pB;
  const trailerPos=leaderIsA?pB:pA;
  const leaderGoal=leaderIsA?goalA:goalB;
  const trailerGoal=leaderIsA?goalB:goalA;
  const lenLeader=leaderIsA?lenA:lenB;
  const lenTrailer=leaderIsA?lenB:lenA;
  const cands=wallCandidates(leaderPos,walls,6,leaderGoal);
  const scored=[];
  for(const key of cands){
    const next=tryWall(key,walls,pA,pB,goalA,goalB); // null wenn ungültig / sperrt jemanden ein
    if(!next)continue;
    const npL=bfsPath(leaderPos,next,leaderGoal),npT=bfsPath(trailerPos,next,trailerGoal);
    if(!npL||!npT)continue;
    const dLeader=(npL.length-1)-lenLeader;
    const dTrailer=(npT.length-1)-lenTrailer;
    if(dTrailer>dLeader)continue;             // Fairness: Schwächeren nie stärker behindern
    const score=dLeader-2.5*Math.max(0,dTrailer)+Math.random()*1.5;
    scored.push({key,score});
  }
  if(!scored.length)return null;
  scored.sort((a,b)=>b.score-a.score);
  const top=scored.slice(0,Math.min(5,scored.length)); // Top-5 → Zufall = unvorhersehbar
  return top[Math.floor(Math.random()*top.length)].key;
}
function getMovesFrom(pos,opp,walls){
  const moves=[];
  for(const[dr,dc]of[[-1,0],[1,0],[0,-1],[0,1]]){
    const nr=pos.r+dr,nc=pos.c+dc;
    if(nr<0||nr>=ROWS||nc<0||nc>=COLS)continue;
    if(edgeBlocked(pos.r,pos.c,nr,nc,walls))continue;
    if(nr===opp.r&&nc===opp.c){
      // Sprung wie im Brettspiel Quoridor: gerade drueber; nur wenn dahinter Wand oder Rand ist, schraeg daneben
      const jr=nr+dr,jc=nc+dc;
      if(jr>=0&&jr<ROWS&&jc>=0&&jc<COLS&&!edgeBlocked(nr,nc,jr,jc,walls)){moves.push({r:jr,c:jc});continue;}
      for(const[sr,sc]of[[dc,dr],[-dc,-dr]]){
        const kr=nr+sr,kc=nc+sc;
        if(kr<0||kr>=ROWS||kc<0||kc>=COLS)continue;
        if(edgeBlocked(nr,nc,kr,kc,walls))continue;
        moves.push({r:kr,c:kc});
      }
    }else moves.push({r:nr,c:nc});
  }
  return moves;
}

function wallCandidates(targetPos,walls,depth,goalRow=0){
  const path=bfsPath(targetPos,walls,goalRow);
  const result=new Set();
  if(!path)return[];
  const limit=Math.min(depth,path.length);
  for(let i=0;i<limit;i++){
    const node=path[i];
    for(let dr=-1;dr<=0;dr++)for(let dc=-1;dc<=0;dc++){
      const r=node.r+dr,c=node.c+dc;
      if(r>=0&&r<ROWS-1&&c>=0&&c<COLS-1){
        result.add(`H-${r}-${c}`);
        result.add(`V-${r}-${c}`);
      }
    }
  }
  return[...result];
}

function shouldPickupItem(aiPos,humanPos,walls,aiPath,chaosItem,aiBarr,aiGoal=0){
  if(!chaosItem||!aiPath)return null;
  // Item direkt erreichbar?
  const moves=getMovesFrom(aiPos,humanPos,walls);
  const direct=moves.find(m=>m.r===chaosItem.r&&m.c===chaosItem.c);
  if(direct)return direct; // sofort einsacken
  // Detour-Berechnung: AI → Item → Ziel vs AI → Ziel
  const toItem=bfsTo(aiPos,chaosItem,walls);
  if(!toItem||toItem.length<2)return null;
  const fromItem=bfsPath(chaosItem,walls,aiGoal);
  if(!fromItem)return null;
  const itemDist=toItem.length-1;
  const detour=(itemDist+(fromItem.length-1))-(aiPath.length-1);
  // 2 Barrikaden ≈ 4-6 Zugäquivalente; je weniger Barrikaden, desto attraktiver
  const maxDetour=aiBarr<=2?6:aiBarr<=4?4:aiBarr<=7?2:1;
  if(detour>maxDetour)return null;
  const next=toItem[1];
  if(next.r===humanPos.r&&next.c===humanPos.c)return null;
  return next;
}

// ── Neuer Bot (js/bot.js) fuer Hard/Normal in Classic + Duell ──
// aiNeuesSpiel kommt beim Start jeder Partie gegen den Bot und waehlt den Spielstil fuer die ganze
// Partie. Hammer/Chaos/Zufallswaende behalten den alten Bot (deren Sonderregeln kennt bot.js nicht).
var _botSpiel={an:false,stil:0,zw:[]};
function aiNeuesSpiel(sonder,stilNr){
  const zw=[];for(let i=0;i<8;i++)zw.push(Math.random()*2-1);
  _botSpiel={an:!sonder&&typeof botZug==='function',stil:typeof stilNr==='number'?stilNr:Math.floor(Math.random()*3),zw:zw};
}
function aiNeu(stufe,aiPos,humanPos,walls,aiBarr,humBarr,recentAi,aiGoal,humGoal){
  const satz=BOT_STILE[botModus(ROWS,aiGoal,humGoal)];
  const stile=satz&&satz[stufe];
  if(!stile||!stile.length)return null;
  const d=botZug({rows:ROWS,cols:COLS,me:aiPos,opp:humanPos,meGoal:aiGoal,oppGoal:humGoal,walls:walls,meBarr:aiBarr,oppBarr:humBarr,recent:recentAi||[],stil:botStilZiehen(stile[_botSpiel.stil%stile.length],_botSpiel.zw,BOT_ZITTERN)});
  if(!d)return null;
  // Gegenpruefung mit den Spielregeln: was nicht erlaubt ist, faellt auf den alten Bot zurueck
  if(d.type==='move')return getMovesFrom(aiPos,humanPos,walls).some(m=>m.r===d.pos.r&&m.c===d.pos.c)?d:null;
  if(aiBarr<=0)return null;
  const next=tryWall(d.key,walls,aiPos,humanPos,aiGoal,humGoal);
  return next?(d.noetig?{type:'barricade',walls:next,noetig:true}:{type:'barricade',walls:next}):null;
}

// Bedenkzeit des Bots vor jedem Zug: wie ein Mensch mal schneller, mal langsamer (Mittel aus zwei Zufallszahlen = meist mittig, selten ganz kurz/lang).
// Vorher fest 500/700/1100 ms. Mindestens 500 ms, damit der Zug nie "springt".
function aiDenkzeit(stufe){
  const r=(Math.random()+Math.random())/2,b=stufe==='hard'?[900,1900]:stufe==='easy'?[500,1500]:[600,1500];
  return Math.round(b[0]+(b[1]-b[0])*r);
}

function aiMove(aiPos,humanPos,walls,aiBarr,humBarr,difficulty,recentAi,chaosItem,aiGoal=0,humGoal=0){
  difficulty=difficulty||'normal';
  if(difficulty!=='easy'&&_botSpiel.an&&!chaosItem){const d=aiNeu(difficulty,aiPos,humanPos,walls,aiBarr,humBarr,recentAi,aiGoal,humGoal);if(d)return d;}
  if(difficulty==='hard')return aiHard(aiPos,humanPos,walls,aiBarr,humBarr,recentAi,chaosItem,aiGoal,humGoal);
  if(difficulty==='easy')return aiEasy(aiPos,humanPos,walls,aiBarr,chaosItem,aiGoal,humGoal,recentAi);
  return aiNormal(aiPos,humanPos,walls,aiBarr,chaosItem,aiGoal,humGoal);
}

function moveTowardGoal(aiPos,humanPos,walls,aiPath){
  if(!aiPath||aiPath.length<2)return null;
  const ns=aiPath[1];
  if(ns.r!==humanPos.r||ns.c!==humanPos.c)return ns;
  if(edgeBlocked(aiPos.r,aiPos.c,ns.r,ns.c,walls))return null;
  const dr=ns.r-aiPos.r,dc=ns.c-aiPos.c;
  for(const[d2r,d2c]of[[dr,dc],[-dc,dr],[dc,-dr],[-dr,-dc]]){
    const jr=ns.r+d2r,jc=ns.c+d2c;
    if(jr===aiPos.r&&jc===aiPos.c)continue;
    if(jr<0||jr>=ROWS||jc<0||jc>=COLS)continue;
    if(edgeBlocked(ns.r,ns.c,jr,jc,walls))continue;
    return{r:jr,c:jc};
  }
  return null;
}

// Ziel-Regel (Tunay 2026-10-21/22: "nie hin und her ohne Ziel, nie in die falsche Richtung") fuer den Computer-Gegner UND die Lobby-Bots des Servers
// (lobbybots.js ruft dieselbe Funktion). Laeuft hinter jeder KI-Entscheidung, nicht hinter Hammer-Umwegen: (1) nie ein Schritt weg vom Ziel, solange
// einer nach vorn geht (Ausnahme: Chaos-Kiste mit kleinem Umweg), (2) nie zurueck aufs gerade verlassene Feld ohne Fortschritt, (3) nie zwei
// Seitenschritte hintereinander und hoechstens einer je 4 eigene Zuege (sonst Zickzack), (4) eine Wand nur, wenn sie den Gegner mehr kostet als den Bot.
// Sonst der Schritt nach vorn (bei mehreren gleich guten zufaellig). recentAi wie ueberall: aktuelles Feld zuerst, dann eigene Zugziele neueste zuerst.
function zielDist(p,W,g){const x=bfsPath(p,W,g);return x?x.length-1:99;}
function zielVor(me,op,W,g,d0){
  let beste=[],bd=d0;
  getMovesFrom(me,op,W).forEach(m=>{const d=zielDist(m,W,g);if(d<bd){bd=d;beste=[m];}else if(d===bd&&d<d0)beste.push(m);});
  return beste.length?beste[Math.floor(Math.random()*beste.length)]:null;
}
function zielRegel(d,me,op,W,gMe,gOp,recentAi,chaosItem){
  const zm=_botSpiel.zm||(_botSpiel.zm={n:0,seit:-99});
  zm.n++;
  const neuW=zm.w!==W.size;zm.w=W.size;
  if(!d)return d;
  const d0=zielDist(me,W,gMe);
  // Bewusster Zug der Fallen-Suche (bot.js 'noetig': deutlich besser als jeder Schritt nach vorn, z.B. Schutz-Wand oder Ausweichen vor einer Falle).
  // Zurueck aufs gerade verlassene Feld nur, wenn seitdem eine Wand dazukam (2026-10-30: Race schwer wich auf 9.4 aus, ging auf 10.4 wieder vor -
  // ohne neue Wand ging das ewig, bei abwesendem Menschen 200-mal hin und her)
  if(d.noetig){const v=d.type==='move'&&!neuW&&(recentAi||[]).find(x=>x.r!==me.r||x.c!==me.c);
    if(!(v&&d.pos.r===v.r&&d.pos.c===v.c&&zielDist(d.pos,W,gMe)>=d0)){if(d.type==='move'&&zielDist(d.pos,W,gMe)===d0)zm.seit=zm.n;return d;}}
  if(d.type==='move'){
    const p=d.pos,d1=zielDist(p,W,gMe),fw=zielVor(me,op,W,gMe,d0);
    const vorher=(recentAi||[]).find(x=>x.r!==me.r||x.c!==me.c)||null;
    const zurueck=!!vorher&&p.r===vorher.r&&p.c===vorher.c;
    if(!fw){
      // Es geht gerade nicht vorwaerts (Gegner im Weg): die KI entscheidet - nur nicht zurueck aufs gerade verlassene Feld, wenn ein anderer Zug nicht
      // laenger ist, sonst pendelt sie (2026-10-28: einfach sprang zurueck statt seitlich am Gegner vorbei). Ein Umweg zur Chaos-Kiste bleibt erlaubt.
      if(zurueck&&!chaosItem){let alt=null,ad=999;getMovesFrom(me,op,W).forEach(m=>{if(m.r===vorher.r&&m.c===vorher.c)return;const x=zielDist(m,W,gMe);if(x<ad){ad=x;alt=m;}});if(alt&&ad<=d1)return{type:'move',pos:alt};}
      return d;
    }
    if(chaosItem&&d1>=d0){const a=bfsTo(me,chaosItem,W),b=bfsTo(p,chaosItem,W);if(a&&b&&b.length<a.length&&(a.length-1)+zielDist(chaosItem,W,gMe)<=d0+3)return d;}
    const warSeit=!!vorher&&zielDist(vorher,W,gMe)<=d0;
    if(d1>d0||(zurueck&&d1>=d0)||(d1===d0&&(warSeit||zm.n-zm.seit<=4)))return{type:'move',pos:fw};
    if(d1===d0)zm.seit=zm.n;
    return d;
  }
  if(d.type==='barricade'&&d.walls){
    const eig=zielDist(me,d.walls,gMe)-d0,geg=zielDist(op,d.walls,gOp)-zielDist(op,W,gOp);
    // Ohne Schritt nach vorn der kuerzeste Zug, das gerade verlassene Feld nur, wenn jeder andere laenger ist (2026-10-29: hier stand der erste
    // erlaubte Zug - einfach ging so zurueck aufs verlassene Feld, statt ueber den Gegner zu springen)
    if(geg<=eig){const v=(recentAi||[]).find(x=>x.r!==me.r||x.c!==me.c);let fw=zielVor(me,op,W,gMe,d0),fd=999;if(!fw)getMovesFrom(me,op,W).forEach(m=>{const x=zielDist(m,W,gMe)+(v&&m.r===v.r&&m.c===v.c?0.5:0);if(x<fd){fd=x;fw=m;}});if(fw)return{type:'move',pos:fw};}
  }
  return d;
}

// Einfach = ein ANFAENGER, kein kaputter Bot (Tunay 2026-10-14: "sehr schlecht, menschlich, jede Partie anders"). Er geht meist den kuerzesten Weg,
// macht aber oft einen Seitenschritt statt vorwaerts (nie zurueck aufs gerade verlassene Feld), sieht einen Sieg im naechsten Zug immer, setzt
// selten und spaet Waende (nur wenn der Gegner gleichauf oder vorne ist, nur auf dem Gegnerweg, nie mit Nettoverlust) und hoechstens 2-6 pro Partie.
// Der Charakter (Fehlerlust, Wandlust, Wandvorrat) kommt je Partie aus _botSpiel.zw — jede Partie spielt sich anders.
function aiEasy(aiPos,humanPos,walls,barrLeft,chaosItem,aiGoal=0,humGoal=0,recentAi){
  const zw=_botSpiel.zw||[];
  const pFehler=0.14+0.08*(zw[0]||0),pWand=0.20+0.10*(zw[1]||0),vorrat=Math.max(2,4+Math.round(2*(zw[2]||0)));
  if(_botSpiel.e0===undefined)_botSpiel.e0=barrLeft;
  const aiPath=bfsPath(aiPos,walls,aiGoal);
  const humPath=bfsPath(humanPos,walls,humGoal);
  if(!aiPath)return null;
  const aiD=aiPath.length-1,humD=humPath?humPath.length-1:999;
  const legal=getMovesFrom(aiPos,humanPos,walls);
  // Sieg im naechsten Zug: nur ueber legale Zuege (der Gegner kann auf dem Zielfeld stehen)
  const sieg=legal.find(m=>m.r===aiGoal);
  if(sieg)return{type:'move',pos:sieg};

  // Easy: nimmt das Item nur wenn quasi gratis (Detour-Toleranz in shouldPickupItem niedrig)
  if(chaosItem){
    const pick=shouldPickupItem(aiPos,humanPos,walls,aiPath,chaosItem,barrLeft,aiGoal);
    if(pick)return{type:'move',pos:pick};
  }

  // Waende: selten, nur gegen einen gleichauf liegenden oder fuehrenden Gegner, nur mit Nettogewinn >= 0 und Gegnerverlust >= 1
  const benutzt=_botSpiel.e0-barrLeft;
  if(barrLeft>0&&benutzt<vorrat&&humD<=aiD+2&&Math.random()<pWand){
    const cands=wallCandidates(humanPos,walls,4,humGoal);
    for(let i=cands.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [cands[i],cands[j]]=[cands[j],cands[i]];
    }
    for(const k of cands){
      const next=tryWall(k,walls,aiPos,humanPos,aiGoal,humGoal);
      if(!next)continue;
      const nh=bfsPath(humanPos,next,humGoal),na=bfsPath(aiPos,next,aiGoal);
      if(!nh||!na)continue;
      const gewinn=(nh.length-1)-humD,kosten=(na.length-1)-aiD;
      if(gewinn>=1&&gewinn-kosten>=0)return{type:'barricade',walls:next};
    }
  }

  // Seitenschritt statt vorwaerts (menschlicher Fehler): ein legaler Zug, der den Abstand zum Ziel nicht verkuerzt, aber auch nicht
  // zurueck auf eines der letzten Felder fuehrt
  const m=moveTowardGoal(aiPos,humanPos,walls,aiPath);
  if(Math.random()<pFehler){
    const letzte=(recentAi||[]).slice(0,3);
    const seit=legal.filter(c=>{
      if(letzte.some(p=>p.r===c.r&&p.c===c.c))return false;
      if(m&&c.r===m.r&&c.c===m.c)return false;
      const pc=bfsPath(c,walls,aiGoal);
      return pc&&pc.length-1===aiD;
    });
    if(seit.length)return{type:'move',pos:seit[Math.floor(Math.random()*seit.length)]};
  }
  if(m){
    // mehrere gleich kurze Wege: einen zufaellig waehlen (statt immer denselben) — jede Partie sieht anders aus
    const vor=legal.filter(c=>{const pc=bfsPath(c,walls,aiGoal);return pc&&pc.length-1===aiD-1;});
    if(vor.length>1)return{type:'move',pos:vor[Math.floor(Math.random()*vor.length)]};
    return{type:'move',pos:m};
  }
  const fallback=legal;
  return fallback.length?{type:'move',pos:fallback[0]}:null;
}

function aiNormal(aiPos,humanPos,walls,barrLeft,chaosItem,aiGoal=0,humGoal=0){
  const aiPath=bfsPath(aiPos,walls,aiGoal),humPath=bfsPath(humanPos,walls,humGoal);
  if(!aiPath)return null;
  const aiD=aiPath.length-1,humD=humPath?humPath.length-1:999;
  if(aiD===1){const gm=getMovesFrom(aiPos,humanPos,walls).find(m=>m.r===aiGoal);if(gm)return{type:'move',pos:gm};}
  // Item einsammeln wenn lohnenswert
  if(chaosItem){
    const pick=shouldPickupItem(aiPos,humanPos,walls,aiPath,chaosItem,barrLeft,aiGoal);
    if(pick)return{type:'move',pos:pick};
  }
  let bestWall=null,bestRel=humD-aiD;
  if(barrLeft>0){
    for(let r=0;r<ROWS-1;r++)for(let c=0;c<COLS-1;c++)for(const t of['H','V']){
      const next=tryWall(`${t}-${r}-${c}`,walls,aiPos,humanPos,aiGoal,humGoal);
      if(!next)continue;
      const nh=bfsPath(humanPos,next,humGoal),na=bfsPath(aiPos,next,aiGoal);
      if(!nh||!na)continue;
      const rel=(nh.length-1)-(na.length-1);
      if(rel>bestRel){bestRel=rel;bestWall=next;}
    }
  }
  const bestMove=moveTowardGoal(aiPos,humanPos,walls,aiPath);
  const minGain=(humD-aiD)>3?3:1;
  if(bestWall&&bestRel-(humD-aiD)>=minGain)return{type:'barricade',walls:bestWall};
  if(bestMove)return{type:'move',pos:bestMove};
  if(bestWall)return{type:'barricade',walls:bestWall};
  return null;
}

// ── Aggressive Duell-KI (nur Duell-Modus, 7x7 & 9x9) ──────────────
// Distanz = kürzester Pfad (BFS = A*-Ergebnis auf ungewichtetem Grid).
// Bewertet jede sinnvolle Mauer und wählt strategisch zwischen Blocken und Vordrang.
function duelDist(pos,walls,goal){const p=bfsPath(pos,walls,goal);return p?p.length-1:Infinity;}
function duelBestWall(aiPos,humPos,walls,aiGoal,humGoal){
  // Kandidaten: Mauern entlang des Gegnerpfads (verlangsamen ihn maximal)
  const cand=wallCandidates(humPos,walls,5,humGoal);
  const baseHum=duelDist(humPos,walls,humGoal);
  const baseAi=duelDist(aiPos,walls,aiGoal);
  let best=null,bestScore=-Infinity;
  for(const key of cand){
    const nw=tryWall(key,walls,aiPos,humPos,aiGoal,humGoal); // null = ungültig / sperrt jemanden ein
    if(!nw)continue;
    const newHum=duelDist(humPos,nw,humGoal);
    const newAi=duelDist(aiPos,nw,aiGoal);
    if(newHum===Infinity||newAi===Infinity)continue;
    const humDelay=newHum-baseHum;   // wie sehr Gegner verlangsamt wird (gut)
    const aiCost=newAi-baseAi;       // wie sehr man sich selbst behindert (schlecht)
    if(humDelay<=0)continue;         // nur Mauern die wirklich blocken
    // Score: Gegner-Verzögerung stark gewichten, Eigenschaden doppelt bestrafen
    const score=humDelay*3-aiCost*2;
    if(score>bestScore){bestScore=score;best={key,walls:nw,humDelay,aiCost};}
  }
  return best;
}
function aiDuel(aiPos,humanPos,walls,aiBarr,humBarr,recentAi,chaosItem,aiGoal,humGoal){
  const recent=recentAi||[];
  const initMoves=getMovesFrom(aiPos,humanPos,walls);
  // 1) Sofortiger Sieg
  for(const m of initMoves)if(m.r===aiGoal)return{type:'move',pos:m};
  // Item direkt erreichbar mitnehmen
  if(chaosItem){const d=initMoves.find(m=>m.r===chaosItem.r&&m.c===chaosItem.c);if(d)return{type:'move',pos:d};}

  const aiPath=bfsPath(aiPos,walls,aiGoal);
  const humPath=bfsPath(humanPos,walls,humGoal);
  if(!aiPath)return{type:'move',pos:initMoves[0]||aiPos};
  const aiD=aiPath.length-1;
  const humD=humPath?humPath.length-1:999;
  const advance=()=>{
    const m=moveTowardGoal(aiPos,humanPos,walls,aiPath);
    if(m){
      const wasRecent=recent.slice(0,4).some(p=>p.r===m.r&&p.c===m.c);
      if(!wasRecent)return{type:'move',pos:m};
      const alt=initMoves.filter(mv=>!recent.slice(0,4).some(p=>p.r===mv.r&&p.c===mv.c));
      if(alt.length>0)return{type:'move',pos:alt[0]};
    }
    return m?{type:'move',pos:m}:(initMoves.length?{type:'move',pos:initMoves[0]}:null);
  };

  // 2) Gegner führt (humD < aiD): aggressiv blocken (70%)
  if(humD<aiD&&aiBarr>0){
    const block=duelBestWall(aiPos,humanPos,walls,aiGoal,humGoal);
    if(block){
      // 70% blocken wenn die Mauer wirklich etwas bringt; sonst vorrücken
      const wantBlock=Math.random()<0.7&&block.humDelay>=1;
      if(wantBlock)return{type:'barricade',key:block.key,walls:block.walls};
    }
    return advance();
  }

  // 3) KI führt oder gleichauf: clever vordrängen, aber Gegner einmauern wenn extrem effektiv
  if(aiBarr>0){
    const block=duelBestWall(aiPos,humanPos,walls,aiGoal,humGoal);
    // Nur blocken wenn es den Gegner deutlich (>=2) verzögert und kaum eigenen Schaden macht
    if(block&&block.humDelay>=2&&block.aiCost<=1&&Math.random()<0.45){
      return{type:'barricade',key:block.key,walls:block.walls};
    }
    // Bei sehr knappem Vorsprung des Gegners zumindest leicht blocken
    if(block&&humD<=aiD+1&&block.humDelay>=1&&block.aiCost<=0&&Math.random()<0.35){
      return{type:'barricade',key:block.key,walls:block.walls};
    }
  }
  return advance();
}

// ── Duell-KI v2: klare Abstufung (Normal solide, Hard nahezu unschlagbar) ──
// Misst wie stark ein einzelner Gegnerzug den eigenen Weg verzoegern koennte (klein = robuster).
function worstWallDelay(target,walls,goal,pA,pB,goalA,goalB){
  const base=duelDist(target,walls,goal);
  if(base===Infinity)return 99;
  const cands=wallCandidates(target,walls,4,goal);
  let worst=0;
  for(const k of cands){
    const nw=tryWall(k,walls,pA,pB,goalA,goalB);
    if(!nw)continue;
    const nd=duelDist(target,nw,goal);
    if(nd===Infinity)continue;
    const delay=nd-base;
    if(delay>worst)worst=delay;
  }
  return worst;
}
// Anzahl kanten-disjunkter Wege zum Ziel (mehr = schwerer mit einer Mauer zu kappen).
function aiDisjoint(start,goal,walls,cap){
  try{return disjointPaths2(start,goal,walls,ROWS,COLS,cap);}catch(_){return 1;}
}

// Duell-Normal: 1-Zug-Vorausschau, blockt optimal gewaehlt & rueckt klug vor.
// Deutlich ueber Easy (optimale Mauerwahl statt zufaellig), klar unter Hard (kein Minimax).
function aiDuelNormal(aiPos,humanPos,walls,aiBarr,humBarr,recentAi,chaosItem,aiGoal,humGoal){
  if(_botSpiel.an&&!chaosItem){const d=aiNeu('normal',aiPos,humanPos,walls,aiBarr,humBarr,recentAi,aiGoal,humGoal);if(d)return d;}
  const initMoves=getMovesFrom(aiPos,humanPos,walls);
  for(const m of initMoves)if(m.r===aiGoal)return{type:'move',pos:m};
  if(chaosItem){const d=initMoves.find(m=>m.r===chaosItem.r&&m.c===chaosItem.c);if(d)return{type:'move',pos:d};}
  const aiPath=bfsPath(aiPos,walls,aiGoal),humPath=bfsPath(humanPos,walls,humGoal);
  if(!aiPath)return{type:'move',pos:initMoves[0]||aiPos};
  const aiD=aiPath.length-1,humD=humPath?humPath.length-1:999;
  const advance=()=>{const m=moveTowardGoal(aiPos,humanPos,walls,aiPath);return m?{type:'move',pos:m}:(initMoves.length?{type:'move',pos:initMoves[0]}:null);};
  if(chaosItem){const pick=shouldPickupItem(aiPos,humanPos,walls,aiPath,chaosItem,aiBarr,aiGoal);if(pick)return{type:'move',pos:pick};}
  const block=aiBarr>0?duelBestWall(aiPos,humanPos,walls,aiGoal,humGoal):null;
  // Gegner fuehrt oder gleichauf -> aggressiv blocken
  if(block&&humD<=aiD&&block.humDelay>=1&&block.aiCost<=1){
    const p=humD<aiD?0.85:0.55;
    if(Math.random()<p)return{type:'barricade',key:block.key,walls:block.walls};
  }
  // KI fuehrt -> nur sehr effiziente Mauern setzen
  if(block&&block.humDelay>=2&&block.aiCost<=0&&Math.random()<0.4){
    return{type:'barricade',key:block.key,walls:block.walls};
  }
  return advance();
}

// Duell-Hard: Minimax (Alpha-Beta, Tiefe 3) + Pfad-Robustheit.
// Sichert den eigenen Weg ab (schwer blockierbar) und blockt den Gegner vorausschauend.
function aiDuelHard(aiPos,humanPos,walls,aiBarr,humBarr,recentAi,chaosItem,aiGoal,humGoal){
  if(_botSpiel.an&&!chaosItem){const d=aiNeu('hard',aiPos,humanPos,walls,aiBarr,humBarr,recentAi,aiGoal,humGoal);if(d)return d;}
  const initMoves=getMovesFrom(aiPos,humanPos,walls);
  for(const m of initMoves)if(m.r===aiGoal)return{type:'move',pos:m};
  if(chaosItem){const direct=initMoves.find(m=>m.r===chaosItem.r&&m.c===chaosItem.c);if(direct)return{type:'move',pos:direct};}
  const recent=recentAi||[];
  const aiFwdDown=aiGoal>aiPos.r;
  const aiPathInit=bfsPath(aiPos,walls,aiGoal);
  const humPathInit=bfsPath(humanPos,walls,humGoal);

  // Endspiel-Sprint: klar in Front & sehr kurzer Pfad -> direkt durchlaufen.
  if(aiPathInit&&aiPathInit.length>1){
    const aiDI=aiPathInit.length-1;
    const humDI=humPathInit?humPathInit.length-1:999;
    if((aiBarr<=0&&!chaosItem)||(aiDI<=2&&humDI>aiDI)){
      const m=moveTowardGoal(aiPos,humanPos,walls,aiPathInit);
      if(m)return{type:'move',pos:m};
    }
  }

  const t0=Date.now();
  const TIME=700;

  const evalState=(ap,hp,w,ab,hb)=>{
    const apath=bfsPath(ap,w,aiGoal),hpath=bfsPath(hp,w,humGoal);
    if(!apath)return-99999;
    if(!hpath)return 99999;
    if(ap.r===aiGoal)return 50000;
    if(hp.r===humGoal)return-50000;
    const aiD=apath.length-1,humD=hpath.length-1;
    return(humD-aiD)*28 - aiD*4 + humD*1.0 + (ab-hb)*5;
  };

  const genActions=(ap,hp,w,ab,hb,forAi,maxWalls)=>{
    const me=forAi?ap:hp;
    const opp=forAi?hp:ap;
    const myBarr=forAi?ab:hb;
    const meGoal=forAi?aiGoal:humGoal;
    const oppGoal=forAi?humGoal:aiGoal;
    const acts=[];
    const myPath=bfsPath(me,w,meGoal);
    const moves=getMovesFrom(me,opp,w);
    for(const m of moves){
      let pri=0;
      if(myPath&&myPath.length>1&&myPath[1].r===m.r&&myPath[1].c===m.c)pri=30;
      if(meGoal>me.r?m.r>me.r:m.r<me.r)pri+=8;
      acts.push({type:'move',pos:m,_p:pri});
    }
    if(myBarr>0){
      const cands=wallCandidates(opp,w,6,oppGoal);
      const oldOppPath=bfsPath(opp,w,oppGoal);
      const oldOppD=oldOppPath?oldOppPath.length-1:0;
      const myOldD=myPath?myPath.length-1:0;
      const scored=[];
      for(const k of cands){
        const next=tryWall(k,w,ap,hp,aiGoal,humGoal);
        if(!next)continue;
        const np=bfsPath(opp,next,oppGoal);
        if(!np)continue;
        const myNew=bfsPath(me,next,meGoal);
        if(!myNew)continue;
        const gain=((np.length-1)-oldOppD)-((myNew.length-1)-myOldD);
        if(gain<=0)continue;
        scored.push({next,gain});
      }
      scored.sort((a,b)=>b.gain-a.gain);
      const lim=Math.min(maxWalls,scored.length);
      for(let i=0;i<lim;i++)acts.push({type:'barricade',walls:scored[i].next,_p:scored[i].gain*8});
    }
    acts.sort((a,b)=>b._p-a._p);
    return acts;
  };

  const search=(ap,hp,w,ab,hb,depth,maximizing,alpha,beta)=>{
    if(ap.r===aiGoal)return 50000-depth;
    if(hp.r===humGoal)return-50000+depth;
    if(depth===0||Date.now()-t0>TIME)return evalState(ap,hp,w,ab,hb);
    const maxW=depth>=2?4:3;
    const acts=genActions(ap,hp,w,ab,hb,maximizing,maxW);
    if(acts.length===0)return evalState(ap,hp,w,ab,hb);
    if(maximizing){
      let best=-Infinity;
      for(const a of acts){
        const s=a.type==='move'
          ?search(a.pos,hp,w,ab,hb,depth-1,false,alpha,beta)
          :search(ap,hp,a.walls,ab-1,hb,depth-1,false,alpha,beta);
        if(s>best)best=s;
        if(best>alpha)alpha=best;
        if(beta<=alpha)break;
      }
      return best;
    }
    let best=Infinity;
    for(const a of acts){
      const s=a.type==='move'
        ?search(ap,a.pos,w,ab,hb,depth-1,true,alpha,beta)
        :search(ap,hp,a.walls,ab,hb-1,depth-1,true,alpha,beta);
      if(s<best)best=s;
      if(best<beta)beta=best;
      if(beta<=alpha)break;
    }
    return best;
  };

  let bestScore=-Infinity,bestAction=null;
  const myActs=genActions(aiPos,humanPos,walls,aiBarr,humBarr,true,8);
  for(const a of myActs){
    let s=a.type==='move'
      ?search(a.pos,humanPos,walls,aiBarr,humBarr,3,false,-Infinity,Infinity)
      :search(aiPos,humanPos,a.walls,aiBarr-1,humBarr,3,false,-Infinity,Infinity);
    // Resultierender Zustand fuer Robustheits-Bewertung (eigenen Weg schuetzen)
    const rPos=a.type==='move'?a.pos:aiPos;
    const rW=a.type==='move'?walls:a.walls;
    const worst=worstWallDelay(rPos,rW,aiGoal,rPos,humanPos,aiGoal,humGoal);
    s-=worst*9;                                  // schwer blockierbarer Weg = besser
    s+=aiDisjoint(rPos,aiGoal,rW,3)*6;           // mehr Ausweichrouten = besser
    if(a.type==='move'){
      if(aiPathInit&&aiPathInit.length>1&&aiPathInit[1].r===a.pos.r&&aiPathInit[1].c===a.pos.c)s+=20;
      if(aiFwdDown?a.pos.r>aiPos.r:a.pos.r<aiPos.r)s+=6;
      else if(aiFwdDown?a.pos.r<aiPos.r:a.pos.r>aiPos.r)s-=4;
      if(chaosItem){
        const oldD=Math.abs(aiPos.r-chaosItem.r)+Math.abs(aiPos.c-chaosItem.c);
        const newD=Math.abs(a.pos.r-chaosItem.r)+Math.abs(a.pos.c-chaosItem.c);
        if(newD<oldD&&newD<=4)s+=(5-newD)*4;
        if(newD===0)s+=30;
      }
      if(recent.length>=2){
        for(let i=1;i<Math.min(recent.length,5);i++){
          if(recent[i].r===a.pos.r&&recent[i].c===a.pos.c){s-=(6-i)*12;break;}
        }
      }
    }
    if(s>bestScore){bestScore=s;bestAction=a;}
  }
  if(!bestAction){
    if(aiPathInit&&aiPathInit.length>1)return{type:'move',pos:aiPathInit[1]};
    const fm=getMovesFrom(aiPos,humanPos,walls);
    if(fm.length)return{type:'move',pos:fm[0]};
    return null;
  }
  if(bestAction.type==='move')return{type:'move',pos:bestAction.pos};
  return{type:'barricade',walls:bestAction.walls};
}

function aiHard(aiPos,humanPos,walls,aiBarr,humBarr,recentAi,chaosItem,aiGoal=0,humGoal=0){
  const initMoves=getMovesFrom(aiPos,humanPos,walls);
  // Sofortiger Sieg hat absolute Priorität (eigene Zielreihe erreichen)
  for(const m of initMoves)if(m.r===aiGoal)return{type:'move',pos:m};
  // Item-Pickup wenn direkt erreichbar (sehr lohnenswert) — vor Minimax
  if(chaosItem){
    const direct=initMoves.find(m=>m.r===chaosItem.r&&m.c===chaosItem.c);
    if(direct)return{type:'move',pos:direct};
  }
  const recent=recentAi||[];
  // Vorwärts = Richtung eigenes Ziel
  const aiFwdDown=aiGoal>aiPos.r;

  // Endspiel-Sprint: bei kurzem Pfad und klarem Vorsprung direkt zum Ziel laufen,
  // statt unnötig Mauern zu suchen oder im Minimax-Rauschen zu trödeln.
  const aiPathInit=bfsPath(aiPos,walls,aiGoal);
  const humPathInit=bfsPath(humanPos,walls,humGoal);
  if(aiPathInit&&aiPathInit.length>1){
    const aiDI=aiPathInit.length-1;
    const humDI=humPathInit?humPathInit.length-1:999;
    // Reine Zielverfolgung (deterministisch, kein Kreiseln) wenn:
    // - keine Mauern mehr zum Setzen (und kein lohnendes Item), ODER
    // - kurzer Pfad mit Vorsprung, ODER
    // - klar in Führung
    if((aiBarr<=0&&!chaosItem)||(aiDI<=3&&humDI>aiDI+1)||humDI>aiDI+2){
      const m=moveTowardGoal(aiPos,humanPos,walls,aiPathInit);
      if(m)return{type:'move',pos:m};
    }
  }

  // Statische Evaluation: positiver Score = gut für AI
  const evalState=(ap,hp,w,ab,hb)=>{
    const apath=bfsPath(ap,w,aiGoal),hpath=bfsPath(hp,w,humGoal);
    if(!apath)return-99999;
    if(!hpath)return 99999;
    if(ap.r===aiGoal)return 50000;
    if(hp.r===humGoal)return-50000;
    const aiD=apath.length-1,humD=hpath.length-1;
    // Hauptfaktor: relative Distanz
    // Eigener Progress STARK belohnt (verhindert Trödeln/Hin-und-Her)
    // Gegner-Distanz leichter Bonus
    // Mauern-Reserve sekundär
    return(humD-aiD)*25 - aiD*3.5 + humD*0.8 + (ab-hb)*3;
  };

  // Aktionen für aktuellen Spieler generieren, sortiert für Alpha-Beta-Effizienz
  const genActions=(ap,hp,w,ab,hb,forAi,maxWalls)=>{
    const me=forAi?ap:hp;
    const opp=forAi?hp:ap;
    const myBarr=forAi?ab:hb;
    const meGoal=forAi?aiGoal:humGoal;
    const oppGoal=forAi?humGoal:aiGoal;
    const acts=[];
    const myPath=bfsPath(me,w,meGoal);
    const moves=getMovesFrom(me,opp,w);
    for(const m of moves){
      let pri=0;
      if(myPath&&myPath.length>1&&myPath[1].r===m.r&&myPath[1].c===m.c)pri=30;
      // Bonus für Schritt Richtung eigenes Ziel
      if(meGoal>me.r?m.r>me.r:m.r<me.r)pri+=8;
      acts.push({type:'move',pos:m,_p:pri});
    }
    if(myBarr>0){
      const cands=wallCandidates(opp,w,6,oppGoal);
      const oldOppPath=bfsPath(opp,w,oppGoal);
      const oldOppD=oldOppPath?oldOppPath.length-1:0;
      const scored=[];
      for(const k of cands){
        const next=tryWall(k,w,ap,hp,aiGoal,humGoal);
        if(!next)continue;
        const np=bfsPath(opp,next,oppGoal);
        if(!np)continue;
        const myNew=bfsPath(me,next,meGoal);
        if(!myNew)continue;
        // Score: wieviel verlangsamt es Gegner abzüglich Eigenkosten
        const gain=((np.length-1)-oldOppD)-((myNew.length-1)-(myPath?myPath.length-1:0));
        if(gain<=0)continue; // Nur Mauern die wirklich helfen
        scored.push({next,gain});
      }
      scored.sort((a,b)=>b.gain-a.gain);
      const lim=Math.min(maxWalls,scored.length);
      for(let i=0;i<lim;i++){
        acts.push({type:'barricade',walls:scored[i].next,_p:scored[i].gain*8});
      }
    }
    acts.sort((a,b)=>b._p-a._p);
    return acts;
  };

  // Minimax mit Alpha-Beta
  const search=(ap,hp,w,ab,hb,depth,maximizing,alpha,beta)=>{
    if(ap.r===aiGoal)return 50000-depth;
    if(hp.r===humGoal)return-50000+depth;
    if(depth===0)return evalState(ap,hp,w,ab,hb);
    const maxW=depth>=2?6:4;
    const acts=genActions(ap,hp,w,ab,hb,maximizing,maxW);
    if(acts.length===0)return evalState(ap,hp,w,ab,hb);
    if(maximizing){
      let best=-Infinity;
      for(const a of acts){
        const s=a.type==='move'
          ?search(a.pos,hp,w,ab,hb,depth-1,false,alpha,beta)
          :search(ap,hp,a.walls,ab-1,hb,depth-1,false,alpha,beta);
        if(s>best)best=s;
        if(best>alpha)alpha=best;
        if(beta<=alpha)break;
      }
      return best;
    }
    let best=Infinity;
    for(const a of acts){
      const s=a.type==='move'
        ?search(ap,a.pos,w,ab,hb,depth-1,true,alpha,beta)
        :search(ap,hp,a.walls,ab,hb-1,depth-1,true,alpha,beta);
      if(s<best)best=s;
      if(best<beta)beta=best;
      if(beta<=alpha)break;
    }
    return best;
  };

  // Wurzel: 3 Halbzüge tief suchen (AI → Opp → AI → eval)
  let bestScore=-Infinity,bestAction=null;
  const myActs=genActions(aiPos,humanPos,walls,aiBarr,humBarr,true,10);
  for(const a of myActs){
    let s=a.type==='move'
      ?search(a.pos,humanPos,walls,aiBarr,humBarr,2,false,-Infinity,Infinity)
      :search(aiPos,humanPos,a.walls,aiBarr-1,humBarr,2,false,-Infinity,Infinity);
    if(a.type==='move'){
      // Starker Bias auf den BFS-Hauptpfad: verhindert Wechsel zwischen gleich­langen
      // Pfaden, wodurch die AI sonst zickzack laufen würde.
      if(aiPathInit&&aiPathInit.length>1&&aiPathInit[1].r===a.pos.r&&aiPathInit[1].c===a.pos.c){
        s+=20;
      }
      // Zusätzlicher Bonus für tatsächliche Annäherung Richtung eigenes Ziel
      if(aiFwdDown?a.pos.r>aiPos.r:a.pos.r<aiPos.r)s+=6;
      else if(aiFwdDown?a.pos.r<aiPos.r:a.pos.r>aiPos.r)s-=4;
      // Bonus für Annäherung ans Chaos-Item (proportional zum Wert von +2 Barrikaden)
      if(chaosItem){
        const oldD=Math.abs(aiPos.r-chaosItem.r)+Math.abs(aiPos.c-chaosItem.c);
        const newD=Math.abs(a.pos.r-chaosItem.r)+Math.abs(a.pos.c-chaosItem.c);
        if(newD<oldD&&newD<=4)s+=(5-newD)*4; // näher heran lohnt, je näher desto mehr
        if(newD===0)s+=30; // direkt drauf (auch wenn schon oben abgefangen)
      }
      // Starke Cycling-Strafe: verhindert Hin-und-Her zwischen besuchten Feldern
      if(recent.length>=2){
        for(let i=1;i<Math.min(recent.length,5);i++){
          if(recent[i].r===a.pos.r&&recent[i].c===a.pos.c){
            s-=(6-i)*12; // -60 / -48 / -36 / -24 für i=1..4
            break;
          }
        }
      }
    }
    if(s>bestScore){bestScore=s;bestAction=a;}
  }

  // Fallback: vorwärts gehen wenn nichts gefunden
  if(!bestAction){
    const aiPath=bfsPath(aiPos,walls,aiGoal),sm=aiPath&&moveTowardGoal(aiPos,humanPos,walls,aiPath);
    if(sm)return{type:'move',pos:sm};
    const fm=getMovesFrom(aiPos,humanPos,walls);
    if(fm.length)return{type:'move',pos:fm[0]};
    return null;
  }

  if(bestAction.type==='move')return{type:'move',pos:bestAction.pos};
  return{type:'barricade',walls:bestAction.walls};
}

// ── Replay ─────────────────────────────────────────────────
function applyMoves(moveList,step,map){
  const sp=startPos(map||'classic');
  let pA={...sp.A},pB={...sp.B};
  const walls=new Set();
  for(let i=0;i<Math.min(step,moveList.length);i++){
    const m=moveList[i];
    if(m.d)walls.add(m.d); // gefallene Drop-Wand (Folgen-Feld, auch am Emote-Eintrag des Bot-Spiels)
    if(m.type==='emote')continue;
    if(m.type==='move'){if(m.p==='A')pA={r:m.r,c:m.c};else pB={r:m.r,c:m.c};}
    else if(m.type==='break')walls.delete(m.k);
    else walls.add(m.k);
  }
  return{pA,pB,walls};
}
function applyMovesWithOwner(moveList,step,map){
  const sp=startPos(map||'classic');
  let pA={...sp.A},pB={...sp.B};
  const walls=new Set();
  const wallOwner={};
  const golden=new Set(); // gefallene Drop-Waende (goldene Optik wie im Spiel)
  for(let i=0;i<Math.min(step,moveList.length);i++){
    const m=moveList[i];
    if(m.d){walls.add(m.d);golden.add(m.d);} // gefallene Drop-Wand, ohne Besitzer
    if(m.type==='emote')continue;
    if(m.type==='move'){if(m.p==='A')pA={r:m.r,c:m.c};else pB={r:m.r,c:m.c};}
    else if(m.type==='break'){walls.delete(m.k);delete wallOwner[m.k];golden.delete(m.k);}
    else{walls.add(m.k);wallOwner[m.k]=m.p||null;}
  }
  return{pA,pB,walls,wallOwner,golden};
}
// Gegenstaende im Replay: Chaos-Kiste (ci), liegende Haemmer (h), wer einen haelt (hd) — Folgen-Felder der Verlaufs-
// Eintraege (Server seit 2026-09-26, lokale Spiele stempeln sie selbst). hm = Hammer-Modus: dort liegen zu Beginn
// die drei Start-Haemmer (aus der Brettgroesse, wie beim Server).
function applyItems(moveList,step,hm){
  let chaosItem=null,hammers=hm?makeHammers():[],held={A:false,B:false};
  for(let i=0;i<Math.min(step,moveList.length);i++){
    const m=moveList[i];
    if(m.ci!==undefined)chaosItem=m.ci||null;
    if(m.h)hammers=m.h;
    if(m.hd)held={A:!!m.hd.A,B:!!m.hd.B};
  }
  return{chaosItem,hammers,held};
}
// Lokale Spiele (Bot, 2 Spieler an einem Geraet): was am letzten Verlaufs-Eintrag fehlt, damit der Verlauf den aktuellen
// Stand von Kiste/Haemmern/Haltern kennt — leer, wenn er schon stimmt. Online schreibt der Server diese Felder selbst.
function itemStempel(moveList,hm,chaosItem,hammers,held){
  const it=applyItems(moveList,moveList.length,hm);
  const nh=function(l){return JSON.stringify(l.map(function(x){return{r:x.r,c:x.c,id:x.id};}));};
  const add={};
  const ci=chaosItem?{r:chaosItem.r,c:chaosItem.c}:null;
  if(JSON.stringify(it.chaosItem)!==JSON.stringify(ci))add.ci=ci;
  if(nh(it.hammers)!==nh(hammers))add.h=JSON.parse(nh(hammers));
  if(it.held.A!==!!held.A||it.held.B!==!!held.B)add.hd={A:!!held.A,B:!!held.B};
  return add;
}
