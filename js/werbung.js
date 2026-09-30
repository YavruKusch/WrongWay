// Werbung im Browser: AdSense-Banner + Vollbild zwischen Matches (H5 Games Ads, adBreak).
// Bleibt komplett aus (kein Skript, kein Platz), solange PUB leer ist oder der Admin-Schalter
// features.werbung aus ist. Plaetze und Haeufigkeit: ROADMAP Entscheidungsstand Punkt 3.
// Zustimmung (KVKK: auch nicht-personalisierte Werbung braucht sie) kommt aus dem Cookie-Fenster von
// index.html (cookieConsent === 'all'); ohne sie gar keine Werbung. Googles Skript erst NACH der Zustimmung.
// Kein ?. / ?? (alte Safari), laeuft ohne Babel.
(function(){
  var PUB = '';                                  // ca-pub-..., kommt mit dem AdSense-Konto
  var SLOT = { unten: '', seite: '', kopf: '' }; // Anzeigenblock-IDs aus AdSense
  var BREIT = 1280;                              // ab dieser Fensterbreite Streifen links + rechts
  var UNTEN_H = 60;                              // reservierte Hoehe unten (px)
  var UNTEN_IM_MATCH = false;                    // im Match unten nichts (Spiel-Leisten liegen dort); am PC nur die Streifen
  var MATCH = { game: 1, twovtwo: 1 };           // Bildschirme mit laufendem Brett
  var STANDARD_JEDES = 5;                        // Vollbild nach jedem n-ten Match

  var vorschau = /[?&]werbungvorschau=1/.test(location.search);  // graue Kaesten statt echter Werbung
  var an = false, vollbild = false, jedes = STANDARD_JEDES, geladen = false, zaehler = 0, faellig = false;
  var bild = 'menu', ok = false, boxen = {};
  function ag(){ return (window.adsbygoogle = window.adsbygoogle || []); }

  function laden(){
    if (geladen || vorschau) return;
    geladen = true;
    ag();
    window.adBreak = window.adConfig = function(o){ ag().push(o); };
    var s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + PUB;
    s.setAttribute('data-ad-frequency-hint', '120s');   // Google-Mindestabstand zwischen Vollbildern
    document.head.appendChild(s);
    window.adConfig({ preloadAdBreaks: 'on', sound: 'on' });
  }

  function box(name, css, format){
    if (boxen[name]) return;
    var d = document.createElement('div');
    d.id = 'ww-werbung-' + name;
    d.style.cssText = 'position:fixed;z-index:50;display:flex;align-items:center;justify-content:center;' + css;
    if (vorschau){
      d.style.background = 'rgba(128,128,128,0.35)';
      d.textContent = 'Anzeige';
    } else {
      var ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.cssText = 'display:block;width:100%;height:100%;';
      ins.setAttribute('data-ad-client', PUB);
      ins.setAttribute('data-ad-slot', name === 'unten' ? SLOT.unten : SLOT.seite);
      ins.setAttribute('data-ad-format', format);
      d.appendChild(ins);
    }
    document.body.appendChild(d);
    boxen[name] = d;
    if (!vorschau) ag().push({});
  }

  function weg(name){
    var d = boxen[name];
    if (!d) return;
    if (d.parentNode) d.parentNode.removeChild(d);
    delete boxen[name];
  }

  // Vorschau: grauer Vollbild-Platzhalter, sofort wegtippbar (echte Laenge bestimmt Google)
  function vorschauVollbild(o){
    var d = document.createElement('div');
    d.id = 'ww-werbung-vollbild';
    d.style.cssText = 'position:fixed;inset:0;z-index:5000;display:flex;align-items:center;justify-content:center;background:rgba(90,90,90,0.95);color:#fff;font:600 18px system-ui,sans-serif;';
    d.textContent = 'Vollbild-Anzeige  \u2715';
    d.onclick = function(){ if (d.parentNode) d.parentNode.removeChild(d); if (o && o.adBreakDone) o.adBreakDone(); };
    document.body.appendChild(d);
  }

  function aktualisieren(){
    var zeigen = an && ok;
    var breit = window.innerWidth >= BREIT;
    var unten = zeigen && (!MATCH[bild] || UNTEN_IM_MATCH);
    var seiten = zeigen && breit;
    if (zeigen) laden();
    if (unten) box('unten', 'left:0;right:0;bottom:0;height:' + UNTEN_H + 'px;', 'horizontal'); else weg('unten');
    if (seiten){
      box('links', 'left:0;top:0;width:160px;', 'vertical');
      box('rechts', 'right:0;top:0;width:160px;', 'vertical');
      boxen.links.style.bottom = boxen.rechts.style.bottom = (unten ? UNTEN_H : 0) + 'px';   // bei jedem Wechsel neu
    } else { weg('links'); weg('rechts'); }
    var root = document.documentElement;
    root.classList[unten ? 'add' : 'remove']('ww-werbung-unten');
    root.classList[seiten ? 'add' : 'remove']('ww-werbung-seiten');
    root.style.setProperty('--ww-werbung-unten', (unten ? UNTEN_H : 0) + 'px');
    root.style.setProperty('--ww-werbung-seite', (seiten ? 160 : 0) + 'px');
  }

  window.WWWerbung = {
    // adminCfg aus barricade_admin_config (kommt ohnehin per Listener, kein Extra-Read); zustimmung = Cookie-Fenster
    konfig: function(cfg, zustimmung){
      var f = (cfg && cfg.features) || {};
      ok = zustimmung === true;
      if (geladen && !ok){ location.reload(); return; }   // Zustimmung zurueckgezogen: Google-Skript wieder loswerden
      an = vorschau || (!!f.werbung && !!PUB);
      vollbild = an && (vorschau || !!f.werbungVollbild);
      var n = cfg && cfg.werbungJedes;
      jedes = (typeof n === 'number' && n >= 1 && n <= 50 && Math.floor(n) === n) ? n : STANDARD_JEDES;
      aktualisieren();
    },
    // Vollbild erst beim Verlassen des Endbildschirms Richtung Menue: nie mitten in eine Revanche,
    // deren Uhr online schon laeuft
    bildschirm: function(name){
      bild = name;
      if (faellig && !MATCH[name] && name !== 'end'){
        faellig = false;
        if (vollbild && ok) (vorschau ? vorschauVollbild : window.adBreak)({ type: 'next', name: 'match_ende' });
      }
      aktualisieren();
    },
    // Revanche-Knopf: ist ein Vollbild faellig, erst die Werbung, dann weiter. Online startet die Revanche erst, wenn
    // beide sie wollen, die Uhr laeuft also noch nicht; der Gegner wartet hoechstens die Werbung ab. Kommt keine Werbung
    // in Gang (Werbeblocker, Skript fehlt), geht es nach 2 s trotzdem weiter, spaetestens nach 60 s in jedem Fall.
    weiter: function(fn){
      if (!faellig || !vollbild || !ok){ fn(); return; }
      faellig = false;
      var fertig = false, laeuft = false;
      function los(){ if (!fertig){ fertig = true; fn(); } }
      (vorschau ? vorschauVollbild : window.adBreak)({ type: 'next', name: 'revanche', beforeAd: function(){ laeuft = true; }, adBreakDone: los });
      if (!vorschau) setTimeout(function(){ if (!laeuft) los(); }, 2000);
      setTimeout(los, 60000);
    },
    // Handy-Menue: statt Logo + Schriftzug ein 320x100-Platz (Tunay-Wahl B). kopfAktiv entscheidet beim Rendern,
    // kopf(el) fuellt den leeren Platz genau einmal (React ruft den ref bei jedem Rendern erneut auf)
    kopfAktiv: function(cfg, zustimmung){
      var f = (cfg && cfg.features) || {};
      return (vorschau || (!!f.werbung && !!PUB)) && zustimmung === true && window.innerWidth < BREIT;
    },
    kopf: function(el){
      if (!el || el.firstChild || !(vorschau || PUB)) return;
      if (vorschau){
        el.style.cssText += 'background:rgba(128,128,128,0.35);border-radius:10px;display:flex;align-items:center;justify-content:center;';
        el.appendChild(document.createElement('span')).textContent = 'Anzeige';
        return;
      }
      laden();
      var ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.cssText = 'display:inline-block;width:320px;height:100px;max-width:100%;';
      ins.setAttribute('data-ad-client', PUB);
      ins.setAttribute('data-ad-slot', SLOT.kopf);
      el.appendChild(ins);
      ag().push({});
    },
    // nach dem Ende eines echten Matches; true = beim naechsten Weg ins Menue kommt ein Vollbild-Versuch
    matchEnde: function(){
      if (!vollbild || !ok) return false;
      zaehler++;
      if (zaehler % jedes !== 0) return false;
      faellig = true;
      return true;
    }
  };
  window.addEventListener('resize', function(){ if (an) aktualisieren(); });
})();
