// ── sound.js (ausgelagert aus index.html) ─────────────────
// AudioContext-System: getCtx(), playSound(). Keine externen Abhaengigkeiten.
// ── Sound ───────────────────────────────────────────────────
let _ctx=null;
function getCtx(){try{if(_ctx&&_ctx.state==='closed')_ctx=null;if(!_ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;_ctx=new C();}return _ctx;}catch{return null;}}
async function playSound(type){
  try{
    if(window.__soundOn===false)return;
    let ctx=getCtx();if(!ctx)return;
    if(ctx.state!=='running'){
      try{await ctx.resume();}catch(e){}
      if(ctx.state!=='running'&&(ctx.state==='interrupted'||ctx.state==='closed')){
        try{ctx.close();}catch(e){}
        _ctx=null;ctx=getCtx();if(!ctx)return;
        try{await ctx.resume();}catch(e){}
      }
    }
    const now=ctx.currentTime;
    if(type==='move'){
      // Mechanischer Tasten-Klick: kurzer Noise-Tick + leiser tiefer Thump
      const noiseDur=0.025;
      const buf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*noiseDur),ctx.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.exp(-i/(ctx.sampleRate*0.005));
      const ns=ctx.createBufferSource();ns.buffer=buf;
      const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=1800;
      const nsG=ctx.createGain();nsG.gain.setValueAtTime(0.18,now);nsG.gain.exponentialRampToValueAtTime(0.001,now+0.035);
      ns.connect(hp);hp.connect(nsG);nsG.connect(ctx.destination);ns.start(now);
      // Tiefer Thump für den "thock"
      const o=ctx.createOscillator();o.type='sine';
      o.frequency.setValueAtTime(220,now);
      o.frequency.exponentialRampToValueAtTime(90,now+0.05);
      const og=ctx.createGain();og.gain.setValueAtTime(0.22,now);og.gain.exponentialRampToValueAtTime(0.001,now+0.07);
      o.connect(og);og.connect(ctx.destination);o.start(now);o.stop(now+0.09);
    }else if(type==='wall'){
      const buf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*0.18),ctx.sampleRate);
      const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.exp(-i/(ctx.sampleRate*0.025));
      const src=ctx.createBufferSource();src.buffer=buf;
      const filt=ctx.createBiquadFilter();filt.type='lowpass';filt.frequency.value=320;
      const g=ctx.createGain();src.connect(filt);filt.connect(g);g.connect(ctx.destination);
      g.gain.setValueAtTime(1,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.18);src.start();
    }else if(type==='click'){
      // Heller, snappy UI-Klick (Clash-Royale-Stil)
      const j=1+(Math.random()*2-1)*0.05;
      const o=ctx.createOscillator();o.type='triangle';
      o.frequency.setValueAtTime(720*j,now);o.frequency.exponentialRampToValueAtTime(1180*j,now+0.05);
      const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=4400;
      const og=ctx.createGain();og.gain.setValueAtTime(0.0001,now);og.gain.exponentialRampToValueAtTime(0.3,now+0.008);og.gain.exponentialRampToValueAtTime(0.001,now+0.11);
      o.connect(lp);lp.connect(og);og.connect(ctx.destination);o.start(now);o.stop(now+0.13);
      const o2=ctx.createOscillator();o2.type='sine';
      o2.frequency.setValueAtTime(1500*j,now);o2.frequency.exponentialRampToValueAtTime(2100*j,now+0.06);
      const o2g=ctx.createGain();o2g.gain.setValueAtTime(0.0001,now);o2g.gain.exponentialRampToValueAtTime(0.12,now+0.006);o2g.gain.exponentialRampToValueAtTime(0.001,now+0.08);
      o2.connect(o2g);o2g.connect(ctx.destination);o2.start(now);o2.stop(now+0.1);
      const nb=ctx.createBuffer(1,Math.floor(ctx.sampleRate*0.01),ctx.sampleRate);
      const ndd=nb.getChannelData(0);for(let i=0;i<ndd.length;i++)ndd[i]=(Math.random()*2-1)*Math.exp(-i/(ctx.sampleRate*0.002));
      const ns=ctx.createBufferSource();ns.buffer=nb;
      const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=3000;
      const ng=ctx.createGain();ng.gain.setValueAtTime(0.14,now);ng.gain.exponentialRampToValueAtTime(0.001,now+0.02);
      ns.connect(hp);hp.connect(ng);ng.connect(ctx.destination);ns.start(now);
    }else if(type==='pickup'){
      [880,1175,1568].forEach((f,i)=>{
        const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=f;
        const t=now+i*0.06;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.22,t+0.02);g.gain.exponentialRampToValueAtTime(0.001,t+0.18);
        o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+0.2);
      });
      const o2=ctx.createOscillator(),g2=ctx.createGain();o2.type='sine';
      o2.frequency.setValueAtTime(2093,now+0.12);o2.frequency.exponentialRampToValueAtTime(3136,now+0.28);
      g2.gain.setValueAtTime(0,now+0.12);g2.gain.linearRampToValueAtTime(0.12,now+0.16);g2.gain.exponentialRampToValueAtTime(0.001,now+0.34);
      o2.connect(g2);g2.connect(ctx.destination);o2.start(now+0.12);o2.stop(now+0.36);
    }else if(type==='break'){
      const o=ctx.createOscillator();o.type='sine';
      o.frequency.setValueAtTime(160,now);o.frequency.exponentialRampToValueAtTime(45,now+0.18);
      const og=ctx.createGain();og.gain.setValueAtTime(0.5,now);og.gain.exponentialRampToValueAtTime(0.001,now+0.22);
      o.connect(og);og.connect(ctx.destination);o.start(now);o.stop(now+0.24);
      const dur=0.22;const buf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*dur),ctx.sampleRate);
      const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.exp(-i/(ctx.sampleRate*0.04));
      const src=ctx.createBufferSource();src.buffer=buf;
      const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=2200;bp.Q.value=0.7;
      const g=ctx.createGain();g.gain.setValueAtTime(0.5,now);g.gain.exponentialRampToValueAtTime(0.001,now+dur);
      src.connect(bp);bp.connect(g);g.connect(ctx.destination);src.start(now);
    }else if(type==='win'){
      [523,659,784,1047].forEach((f,i)=>{
        const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.value=f;
        const t=now+i*0.12;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.25,t+0.04);g.gain.exponentialRampToValueAtTime(0.001,t+0.3);o.start(t);o.stop(t+0.35);
      });
    }else if(type==='lose'){
      // Sad trombone "wah wah wah waaa"
      const notes=[[392,0,0.18],[349,0.2,0.18],[311,0.4,0.18],[247,0.6,0.7]];
      notes.forEach(([f,delay,dur])=>{
        const t=now+delay;
        const o=ctx.createOscillator();o.type='triangle';
        o.frequency.setValueAtTime(f*1.08,t);
        o.frequency.exponentialRampToValueAtTime(f*0.88,t+dur*0.7);
        // Slight 2nd harmonic for richer brass tone
        const o2=ctx.createOscillator();o2.type='sawtooth';
        o2.frequency.setValueAtTime(f*1.08,t);
        o2.frequency.exponentialRampToValueAtTime(f*0.88,t+dur*0.7);
        const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;
        const g=ctx.createGain();
        g.gain.setValueAtTime(0,t);
        g.gain.linearRampToValueAtTime(0.18,t+0.04);
        g.gain.setValueAtTime(0.18,t+dur*0.65);
        g.gain.exponentialRampToValueAtTime(0.001,t+dur);
        o.connect(lp);o2.connect(lp);lp.connect(g);g.connect(ctx.destination);
        o.start(t);o.stop(t+dur+0.05);
        o2.start(t);o2.stop(t+dur+0.05);
      });
    }else if(type==='laugh'){
      // Realistisches Lachen: zwei Formanten (F1=730, F2=1090 für /a/) + Vibrato + "h"-Aspiration
      const haCount=9+Math.floor(Math.random()*4);
      const basePitch=155+Math.random()*45;
      for(let i=0;i<haCount;i++){
        const t=now+i*0.135+(Math.random()-0.5)*0.015;
        // Pitch-Kontur: Anstieg, Plateau, dann starkes Fallen
        let pitch;
        if(i<2){pitch=basePitch+i*22;}
        else if(i<haCount-3){pitch=basePitch+44-(i-2)*3+(Math.random()-0.5)*8;}
        else{pitch=basePitch+44-(haCount-5)*3-(i-(haCount-3))*22;}
        const burstDur=0.095+Math.random()*0.035;
        const att=0.008+Math.random()*0.006;

        // Glottal-Quelle: Sägezahn mit leichtem Pitch-Fall (natürliches Decay)
        const o=ctx.createOscillator();o.type='sawtooth';
        o.frequency.setValueAtTime(pitch,t);
        o.frequency.exponentialRampToValueAtTime(pitch*0.78,t+burstDur);
        // Vibrato (5.5 Hz, ~2% Pitch-Modulation für Lebendigkeit)
        const vib=ctx.createOscillator();vib.type='sine';
        vib.frequency.value=5.5+Math.random();
        const vibG=ctx.createGain();vibG.gain.value=pitch*0.022;
        vib.connect(vibG);vibG.connect(o.frequency);

        // Parallele Formant-Bandpässe für /a/-Vokal
        const f1=ctx.createBiquadFilter();f1.type='bandpass';
        f1.frequency.value=730;f1.Q.value=8;
        const f2=ctx.createBiquadFilter();f2.type='bandpass';
        f2.frequency.value=1090;f2.Q.value=10;
        const g1=ctx.createGain();g1.gain.value=1;
        const g2=ctx.createGain();g2.gain.value=0.65;
        const mix=ctx.createGain();

        // Lowpass für warmen Brustton
        const lp=ctx.createBiquadFilter();lp.type='lowpass';
        lp.frequency.value=3200;lp.Q.value=0.5;

        // Hüllkurve: schneller Attack, mittleres Plateau, schnelles Decay (Lach-typisch)
        const g=ctx.createGain();
        const peak=0.18+Math.random()*0.04;
        g.gain.setValueAtTime(0,t);
        g.gain.linearRampToValueAtTime(peak,t+att);
        g.gain.setValueAtTime(peak*0.85,t+burstDur*0.4);
        g.gain.exponentialRampToValueAtTime(0.001,t+burstDur);

        o.connect(f1);o.connect(f2);
        f1.connect(g1);f2.connect(g2);
        g1.connect(mix);g2.connect(mix);
        mix.connect(lp);lp.connect(g);g.connect(ctx.destination);

        vib.start(t);o.start(t);
        vib.stop(t+burstDur+0.03);o.stop(t+burstDur+0.03);

        // "h"-Aspiration vor jedem Ha (gefilterter Noise-Burst)
        const aspDur=0.025;
        const buf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*aspDur),ctx.sampleRate);
        const d=buf.getChannelData(0);
        for(let j=0;j<d.length;j++)d[j]=(Math.random()*2-1);
        const ns=ctx.createBufferSource();ns.buffer=buf;
        const nbp=ctx.createBiquadFilter();nbp.type='bandpass';
        nbp.frequency.value=1500;nbp.Q.value=0.8;
        const ng=ctx.createGain();
        ng.gain.setValueAtTime(0.05,t-0.012);
        ng.gain.exponentialRampToValueAtTime(0.001,t-0.012+aspDur);
        ns.connect(nbp);nbp.connect(ng);ng.connect(ctx.destination);
        ns.start(t-0.012);

        // Tiefes Einatmen zwischen Bursts (jeden 3. Burst)
        if(i>1&&i%3===0&&i<haCount-1){
          const inDur=0.09;
          const ibuf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*inDur),ctx.sampleRate);
          const id=ibuf.getChannelData(0);
          for(let j=0;j<id.length;j++){
            const env=Math.sin(j/id.length*Math.PI);
            id[j]=(Math.random()*2-1)*env;
          }
          const ins=ctx.createBufferSource();ins.buffer=ibuf;
          const ibp=ctx.createBiquadFilter();ibp.type='bandpass';
          ibp.frequency.value=900;ibp.Q.value=0.6;
          const ig=ctx.createGain();ig.gain.value=0.06;
          ins.connect(ibp);ibp.connect(ig);ig.connect(ctx.destination);
          ins.start(t+burstDur+0.01);
        }
      }
    }else if(type==='cry'){
      // Realistisches Schluchzen: /u/-Formanten (F1=300,F2=870) mit starkem Vibrato (Whimpering)
      const sobs=5;
      for(let i=0;i<sobs;i++){
        const t=now+i*0.42+(Math.random()-0.5)*0.04;
        // Pitch fällt mit jedem Sob, leichte Variation
        const pitch=275-i*18+(Math.random()-0.5)*12;
        const burstDur=0.28+Math.random()*0.05;

        // Einatmen vor dem Sob (das charakteristische Schluchzen)
        const inhaleDur=0.13;
        const inBuf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*inhaleDur),ctx.sampleRate);
        const inD=inBuf.getChannelData(0);
        for(let j=0;j<inD.length;j++){
          const ramp=Math.min(j/(inD.length*0.3),1)*Math.max(0,1-(j-inD.length*0.5)/(inD.length*0.5));
          inD[j]=(Math.random()*2-1)*ramp;
        }
        const ins=ctx.createBufferSource();ins.buffer=inBuf;
        const ibp=ctx.createBiquadFilter();ibp.type='bandpass';
        ibp.frequency.value=1100;ibp.Q.value=0.7;
        const ig=ctx.createGain();ig.gain.value=0.075;
        ins.connect(ibp);ibp.connect(ig);ig.connect(ctx.destination);
        ins.start(t-inhaleDur);

        // Glottal-Quelle für "huh"-Laut
        const o=ctx.createOscillator();o.type='sawtooth';
        o.frequency.setValueAtTime(pitch*1.15,t);
        o.frequency.exponentialRampToValueAtTime(pitch*0.65,t+burstDur*0.92);
        // Starkes Vibrato (Whimpering-Effekt, 7 Hz, größere Amplitude)
        const vib=ctx.createOscillator();vib.type='sine';
        vib.frequency.value=6.5+Math.random();
        const vibG=ctx.createGain();vibG.gain.value=pitch*0.05;
        vib.connect(vibG);vibG.connect(o.frequency);

        // /u/-Formanten
        const f1=ctx.createBiquadFilter();f1.type='bandpass';
        f1.frequency.value=320;f1.Q.value=7;
        const f2=ctx.createBiquadFilter();f2.type='bandpass';
        f2.frequency.value=860;f2.Q.value=9;
        const g1=ctx.createGain();g1.gain.value=1.1;
        const g2=ctx.createGain();g2.gain.value=0.45;
        const mix=ctx.createGain();
        const lp=ctx.createBiquadFilter();lp.type='lowpass';
        lp.frequency.value=2000;lp.Q.value=0.4;

        // Hüllkurve mit Plateau (gezogenes Heulen)
        const g=ctx.createGain();
        g.gain.setValueAtTime(0,t);
        g.gain.linearRampToValueAtTime(0.15,t+0.04);
        g.gain.linearRampToValueAtTime(0.13,t+burstDur*0.55);
        g.gain.exponentialRampToValueAtTime(0.001,t+burstDur);

        o.connect(f1);o.connect(f2);
        f1.connect(g1);f2.connect(g2);
        g1.connect(mix);g2.connect(mix);
        mix.connect(lp);lp.connect(g);g.connect(ctx.destination);
        vib.start(t);o.start(t);
        vib.stop(t+burstDur+0.05);o.stop(t+burstDur+0.05);

        // Schniefen am Ende des Sobs
        if(i<sobs-1){
          const sniffT=t+burstDur+0.08;
          const sniffDur=0.11;
          const sBuf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*sniffDur),ctx.sampleRate);
          const sd=sBuf.getChannelData(0);
          for(let j=0;j<sd.length;j++){
            // Schnelles Crescendo wie ein Sniff
            const env=Math.pow(j/sd.length,2);
            sd[j]=(Math.random()*2-1)*env;
          }
          const ns=ctx.createBufferSource();ns.buffer=sBuf;
          const nbp=ctx.createBiquadFilter();nbp.type='bandpass';
          nbp.frequency.value=2400;nbp.Q.value=1.4;
          const ng=ctx.createGain();
          ng.gain.setValueAtTime(0.06,sniffT);
          ng.gain.exponentialRampToValueAtTime(0.001,sniffT+sniffDur);
          ns.connect(nbp);nbp.connect(ng);ng.connect(ctx.destination);
          ns.start(sniffT);
        }
      }
    }else if(type==='angry'){
      // Realistisches "Grrahh!": Knurren das in Schrei übergeht
      // Phase 1: Tiefes Knurren mit Rauheit (Grrrr)
      const growlDur=0.4;
      const growlPitch=110;
      const og=ctx.createOscillator();og.type='sawtooth';
      og.frequency.setValueAtTime(growlPitch,now);
      og.frequency.linearRampToValueAtTime(growlPitch*1.1,now+growlDur);
      // Subharmonik
      const og2=ctx.createOscillator();og2.type='square';
      og2.frequency.setValueAtTime(growlPitch*0.5,now);
      og2.frequency.linearRampToValueAtTime(growlPitch*0.55,now+growlDur);
      // Rauheit-LFO (35 Hz Tremolo)
      const rough=ctx.createOscillator();rough.type='sine';
      rough.frequency.value=35;
      const roughG=ctx.createGain();roughG.gain.value=0.35;
      // Vibrato
      const vib=ctx.createOscillator();vib.type='sine';
      vib.frequency.value=4.5;
      const vibG=ctx.createGain();vibG.gain.value=4;
      vib.connect(vibG);vibG.connect(og.frequency);
      // /r/-ähnliche Formanten (tiefer und rumpelig)
      const f1=ctx.createBiquadFilter();f1.type='bandpass';
      f1.frequency.value=380;f1.Q.value=5;
      const f2=ctx.createBiquadFilter();f2.type='bandpass';
      f2.frequency.value=1200;f2.Q.value=6;
      const lp=ctx.createBiquadFilter();lp.type='lowpass';
      lp.frequency.value=1800;lp.Q.value=2;
      const gMix=ctx.createGain();
      const g=ctx.createGain();
      g.gain.setValueAtTime(0,now);
      g.gain.linearRampToValueAtTime(0.22,now+0.04);
      g.gain.setValueAtTime(0.22,now+growlDur*0.85);
      g.gain.linearRampToValueAtTime(0.001,now+growlDur);
      // Tremolo per gain modulation
      rough.connect(roughG);roughG.connect(g.gain);
      const g1=ctx.createGain();g1.gain.value=1;
      const g2=ctx.createGain();g2.gain.value=0.5;
      const gSub=ctx.createGain();gSub.gain.value=0.25;
      og.connect(f1);og.connect(f2);og2.connect(gSub);
      f1.connect(g1);f2.connect(g2);
      g1.connect(gMix);g2.connect(gMix);gSub.connect(gMix);
      gMix.connect(lp);lp.connect(g);g.connect(ctx.destination);
      vib.start(now);og.start(now);og2.start(now);rough.start(now);
      vib.stop(now+growlDur+0.05);og.stop(now+growlDur+0.05);
      og2.stop(now+growlDur+0.05);rough.stop(now+growlDur+0.05);

      // Phase 2: Lauter "AHH!" Schrei am Ende
      const yellStart=now+growlDur*0.85;
      const yellDur=0.35;
      const yellPitch=180;
      const oy=ctx.createOscillator();oy.type='sawtooth';
      oy.frequency.setValueAtTime(yellPitch,yellStart);
      oy.frequency.linearRampToValueAtTime(yellPitch*1.25,yellStart+0.08);
      oy.frequency.exponentialRampToValueAtTime(yellPitch*0.7,yellStart+yellDur);
      const yvib=ctx.createOscillator();yvib.type='sine';
      yvib.frequency.value=6;
      const yvibG=ctx.createGain();yvibG.gain.value=yellPitch*0.035;
      yvib.connect(yvibG);yvibG.connect(oy.frequency);
      // /a/-Formanten für AH-Schrei
      const yf1=ctx.createBiquadFilter();yf1.type='bandpass';
      yf1.frequency.value=750;yf1.Q.value=7;
      const yf2=ctx.createBiquadFilter();yf2.type='bandpass';
      yf2.frequency.value=1150;yf2.Q.value=8;
      const ylp=ctx.createBiquadFilter();ylp.type='lowpass';
      ylp.frequency.value=3500;
      const ymix=ctx.createGain();
      const yg=ctx.createGain();
      yg.gain.setValueAtTime(0,yellStart);
      yg.gain.linearRampToValueAtTime(0.28,yellStart+0.05);
      yg.gain.setValueAtTime(0.24,yellStart+yellDur*0.5);
      yg.gain.exponentialRampToValueAtTime(0.001,yellStart+yellDur);
      const yg1=ctx.createGain();yg1.gain.value=1;
      const yg2=ctx.createGain();yg2.gain.value=0.7;
      oy.connect(yf1);oy.connect(yf2);
      yf1.connect(yg1);yf2.connect(yg2);
      yg1.connect(ymix);yg2.connect(ymix);
      ymix.connect(ylp);ylp.connect(yg);yg.connect(ctx.destination);
      yvib.start(yellStart);oy.start(yellStart);
      yvib.stop(yellStart+yellDur+0.05);oy.stop(yellStart+yellDur+0.05);

      // Wütendes Ausatmen am Ende
      const huffT=yellStart+yellDur;
      const huffDur=0.2;
      const hBuf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*huffDur),ctx.sampleRate);
      const hd=hBuf.getChannelData(0);
      for(let i=0;i<hd.length;i++){
        const env=Math.exp(-i/(hd.length*0.4));
        hd[i]=(Math.random()*2-1)*env;
      }
      const hns=ctx.createBufferSource();hns.buffer=hBuf;
      const hbp=ctx.createBiquadFilter();hbp.type='bandpass';
      hbp.frequency.value=550;hbp.Q.value=0.9;
      const hg=ctx.createGain();
      hg.gain.value=0.14;
      hns.connect(hbp);hbp.connect(hg);hg.connect(ctx.destination);
      hns.start(huffT);
    }else if(type==='confused'){
      // Realistisches "Häää?" - aufsteigende Frage-Intonation mit /ä/-Formanten + Vibrato am Ende
      const dur=0.7;
      // /ä/-Formanten (F1=550, F2=1700)
      const o=ctx.createOscillator();o.type='sawtooth';
      // Pitch-Kontur: kurz halten, dann steigen (deutsche Frage-Intonation)
      o.frequency.setValueAtTime(165,now);
      o.frequency.setValueAtTime(175,now+0.06);
      o.frequency.linearRampToValueAtTime(180,now+0.35);
      o.frequency.linearRampToValueAtTime(245,now+dur*0.75);
      o.frequency.linearRampToValueAtTime(295,now+dur);
      // Leichtes Vibrato, stärker zum Ende (typisch für gezogenes "Häää?")
      const vib=ctx.createOscillator();vib.type='sine';
      vib.frequency.value=5.5;
      const vibG=ctx.createGain();
      vibG.gain.setValueAtTime(2,now);
      vibG.gain.linearRampToValueAtTime(8,now+dur);
      vib.connect(vibG);vibG.connect(o.frequency);

      const f1=ctx.createBiquadFilter();f1.type='bandpass';
      f1.frequency.value=550;f1.Q.value=7;
      const f2=ctx.createBiquadFilter();f2.type='bandpass';
      f2.frequency.value=1700;f2.Q.value=9;
      const g1=ctx.createGain();g1.gain.value=1;
      const g2=ctx.createGain();g2.gain.value=0.55;
      const mix=ctx.createGain();
      const lp=ctx.createBiquadFilter();lp.type='lowpass';
      lp.frequency.value=3000;

      const g=ctx.createGain();
      // "h"-Aspiration-Phase + gezogenes ä
      g.gain.setValueAtTime(0,now);
      g.gain.linearRampToValueAtTime(0.06,now+0.04);
      g.gain.linearRampToValueAtTime(0.17,now+0.12);
      g.gain.setValueAtTime(0.16,now+dur*0.75);
      g.gain.linearRampToValueAtTime(0.13,now+dur*0.92);
      g.gain.exponentialRampToValueAtTime(0.001,now+dur);

      o.connect(f1);o.connect(f2);
      f1.connect(g1);f2.connect(g2);
      g1.connect(mix);g2.connect(mix);
      mix.connect(lp);lp.connect(g);g.connect(ctx.destination);
      vib.start(now);o.start(now);
      vib.stop(now+dur+0.05);o.stop(now+dur+0.05);

      // "h"-Atem am Anfang (gefilterter Noise)
      const hDur=0.1;
      const hBuf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*hDur),ctx.sampleRate);
      const hd=hBuf.getChannelData(0);
      for(let i=0;i<hd.length;i++){
        const env=Math.exp(-i/(hd.length*0.5));
        hd[i]=(Math.random()*2-1)*env;
      }
      const hns=ctx.createBufferSource();hns.buffer=hBuf;
      const hbp=ctx.createBiquadFilter();hbp.type='bandpass';
      hbp.frequency.value=1800;hbp.Q.value=0.8;
      const hg=ctx.createGain();
      hg.gain.value=0.08;
      hns.connect(hbp);hbp.connect(hg);hg.connect(ctx.destination);
      hns.start(now);
    }
  }catch{}
}
