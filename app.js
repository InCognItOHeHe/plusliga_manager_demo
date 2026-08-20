(function(){
  const DATA=window.VM_DATA;
  const E=window.VM_ENGINE;
  const SAVE_KEY='volley-manager-polska-demo-v12';
  const LIVE_STEP_DELAY=900;
  const SKILL_ABBR={
    serve:'SER',
    servePower:'SIŁ',
    attackWing:'ASK',
    attackMiddle:'AŚR',
    tip:'KIW',
    attackBackRow:'2L',
    blockAvoid:'OM',
    blockOut:'B-A',
    setting:'ROZ',
    setQuality:'WYS',
    reception:'PRZ',
    defense:'OBR',
    cover:'ASE',
    blockPositioning:'UBL',
    block:'BLO'
  };
  let state=loadState();
  let view='dashboard';
  let draftLeague=state.selectedLeague||DATA.leagues[0].id;
  let draftTeam=state.selectedTeam||DATA.leagues[0].teams[0];
  let liveAuto=false;
  let liveAutoTimer=null;
  let needsNormalizeSave=false;
  normalizeState();
  if(needsNormalizeSave) save();

  function loadState(){
    try{
      const raw=localStorage.getItem(SAVE_KEY);
      if(raw) return JSON.parse(raw);
    }catch(e){}
    return E.createInitialState();
  }
  function normalizeState(){
    if(typeof state.careerStarted!=='boolean') state.careerStarted=false;
    if(!['changes','stats'].includes(state.livePanel)) state.livePanel='changes';
    if(!['match','set'].includes(state.liveStatsScope)) state.liveStatsScope='match';
    if(!state.selectedLeague) state.selectedLeague=DATA.leagues[0].id;
    const l=E.leagueState(state,state.selectedLeague)||E.leagueState(state,DATA.leagues[0].id);
    if(!state.selectedTeam) state.selectedTeam=l.teams[0];
    if(typeof state.liveRevealIndex!=='number') state.liveRevealIndex=state.liveMatch?.log?.length||0;
    if(state.liveMatch&&!Array.isArray(state.liveRotationTimeline)){
      state.liveRotationTimeline=[{at:0,rotations:cloneRotations(state.liveMatch.rotations||{})}];
    }
    const repairResult=E.repairState?.(state);
    if(repairResult?.repaired) needsNormalizeSave=true;
    if(recoverFinishedLiveMatch()) needsNormalizeSave=true;
    if(clearAppliedOrOrphanLiveMatch()) needsNormalizeSave=true;
    if(hasStoredLogs(state)) needsNormalizeSave=true;
    draftLeague=state.selectedLeague;
    draftTeam=state.selectedTeam;
  }
  function save(){
    try{
      localStorage.setItem(SAVE_KEY,JSON.stringify(state,storageReplacer));
    }catch(e){
      if(e?.name!=='QuotaExceededError') throw e;
      localStorage.removeItem(SAVE_KEY);
      localStorage.setItem(SAVE_KEY,JSON.stringify(state,storageReplacer));
    }
  }

  function storageReplacer(key,value){
    if(key==='log') return [];
    return value;
  }

  function hasStoredLogs(root){
    if(root?.lastMatch?.log?.length) return true;
    if(root?.liveMatch?.log?.length) return true;
    if(root?.liveMatch?.result?.log?.length) return true;
    return !!root?.leagues?.some(l=>l.schedule?.some(m=>m.result?.log?.length));
  }
  function $(id){return document.getElementById(id);}
  function esc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
  function skillValue(p,key){return Math.round(p[key]??0);}
  function team(id){return E.team(state,id);}
  function league(){return E.leagueState(state,state.selectedLeague);}
  function currentTeam(){return team(state.selectedTeam);}
  function resultLabel(match){
    if(!match?.played) return '<span class="pill">nie rozegrano</span>';
    const r=match.result;
    return `<span class="score">${r.score.home}:${r.score.away}</span>`;
  }
  function setTitle(text){$('view-title').textContent=text;}

  function init(){
    bindEvents();
    render();
  }

  function bindEvents(){
    $('nav').addEventListener('click',e=>{
      const btn=e.target.closest('button[data-view]');
      if(!btn) return;
      if(!state.careerStarted) return;
      activateView(btn.dataset.view);
      render();
    });
    $('simulate-day').addEventListener('click',()=>{
      if(!state.careerStarted) return;
      if(hasLiveMatch()){
        activateView('match');
        render();
        return;
      }
      const own=playableOwnMatch();
      if(own){
        activateView('match');
      }else{
        const beforeLast=state.lastMatch;
        const matches=E.simulateRound(state,state.selectedLeague);
        if(matches.every(m=>!matchInvolvesSelected(m))) state.lastMatch=beforeLast;
        pushNews(`${matches.length} meczów AI w kolejce rozegranych.`);
      }
      save();
      render();
    });
    $('reset-save').addEventListener('click',()=>{
      if(!confirm('Zresetować karierę i wrócić do wyboru klubu?')) return;
      setLiveAuto(false);
      localStorage.removeItem(SAVE_KEY);
      state=E.createInitialState();
      normalizeState();
      view='dashboard';
      render();
    });
    document.addEventListener('click',e=>{
      const startLeague=e.target.closest('[data-start-league]');
      if(startLeague){
        draftLeague=startLeague.dataset.startLeague;
        draftTeam=E.leagueState(state,draftLeague).teams[0];
        render();
        return;
      }
      const startTeam=e.target.closest('[data-start-team]');
      if(startTeam){
        draftTeam=startTeam.dataset.startTeam;
        render();
        return;
      }
      const startCareer=e.target.closest('[data-start-career]');
      if(startCareer){
        state.selectedLeague=draftLeague;
        state.selectedTeam=draftTeam;
        state.careerStarted=true;
        state.lastMatch=null;
        state.liveMatch=null;
        state.liveRevealIndex=0;
        state.liveRotationTimeline=null;
        state.news=[
          {type:'start',text:`Rozpoczęto karierę w ${team(draftTeam).name}. Zarząd oczekuje stabilnego sezonu i rozwoju kadry.`}
        ];
        activateView('dashboard');
        save();
        render();
        return;
      }
      const openMatch=e.target.closest('[data-open-match]');
      if(openMatch){
        activateView('match');
        render();
        return;
      }
      const startLive=e.target.closest('[data-start-live-match]');
      if(startLive){
        const match=playableOwnMatch();
        if(match&&!hasLiveMatch()){
          state.liveMatch=E.createLiveMatch(team(match.home),team(match.away),match.id);
          state.liveRevealIndex=state.liveMatch.log.length;
          state.liveRotationTimeline=[{at:0,rotations:cloneRotations(state.liveMatch.rotations)}];
          activateView('match');
          setLiveAuto(true);
          save();
          render();
        }
        return;
      }
      const toggleAuto=e.target.closest('[data-live-toggle-auto]');
      if(toggleAuto){
        setLiveAuto(!liveAuto);
        render();
        return;
      }
      const livePanel=e.target.closest('[data-live-panel]');
      if(livePanel){
        state.livePanel=livePanel.dataset.livePanel;
        save();
        render();
        return;
      }
      const liveStatsScope=e.target.closest('[data-live-stats-scope]');
      if(liveStatsScope){
        state.liveStatsScope=liveStatsScope.dataset.liveStatsScope;
        save();
        render();
        return;
      }
      const lineupSave=e.target.closest('[data-lineup-save]');
      if(lineupSave){
        const result=saveManualLineup();
        if(!result.ok) alert(result.message);
        else pushNews(`Zapisano ustawienie meczowe ${currentTeam().short}.`);
        save();
        render();
        return;
      }
      const lineupAuto=e.target.closest('[data-lineup-auto]');
      if(lineupAuto){
        const t=currentTeam();
        t.useActiveLineup=true;
        t.activeLineupIds=E.selectLineup(t).map(p=>p.id);
        pushNews(`Ustawiono automatycznie sugerowaną siódemkę ${t.short}.`);
        save();
        render();
        return;
      }
      const challenge=e.target.closest('[data-live-challenge]');
      if(challenge){
        if(hasLiveMatch()&&isUserPendingChallenge()&&!isLiveRevealing()){
          const start=state.liveMatch.log.length;
          const result=E.resolveLiveChallenge(state.liveMatch,challenge.dataset.liveChallenge==='take');
          if(!result.ok) alert(result.message);
          pushStartSetRotationSnapshots(start);
          save();
          render();
          scheduleLiveTick();
        }
        return;
      }
      const nextPoint=e.target.closest('[data-live-next-point]');
      if(nextPoint){
        if(hasLiveMatch()){
          setLiveAuto(false);
          startSingleLiveRally();
        }
        return;
      }
      const finishLive=e.target.closest('[data-live-finish-fast]');
      if(finishLive){
        if(hasLiveMatch()){
          setLiveAuto(false);
          let guard=0;
          while(!state.liveMatch.finished&&guard<800){
            if(state.liveMatch.pendingChallenge){
              E.resolveLiveChallenge(state.liveMatch,shouldAutoTakeChallenge(state.liveMatch,state.liveMatch.pendingChallenge.challenge));
            }else{
              E.playLivePoint(state.liveMatch);
            }
            guard++;
          }
          state.liveRevealIndex=state.liveMatch.log.length;
          state.liveRotationTimeline=[{at:state.liveRevealIndex,rotations:cloneRotations(state.liveMatch.rotations)}];
          finalizeLiveMatch();
        }
        return;
      }
      const timeout=e.target.closest('[data-live-timeout]');
      if(timeout){
        if(hasLiveMatch()){
          if(isLiveRevealing()||state.liveMatch.pendingChallenge) return;
          const result=E.takeTimeoutLive(state.liveMatch,state.selectedTeam);
          if(!result.ok) alert(result.message);
          state.liveRevealIndex=state.liveMatch.log.length;
          save();
          render();
        }
        return;
      }
      const sub=e.target.closest('[data-live-sub]');
      if(sub){
        if(hasLiveMatch()){
          if(isLiveRevealing()||state.liveMatch.pendingChallenge) return;
          const out=$('live-sub-out')?.value;
          const inn=$('live-sub-in')?.value;
          const result=E.substituteLive(state.liveMatch,state.selectedTeam,out,inn);
          if(!result.ok) alert(result.message);
          state.liveRevealIndex=state.liveMatch.log.length;
          if(result.ok) pushRotationSnapshot(state.liveRevealIndex,state.liveMatch.rotations);
          save();
          render();
        }
        return;
      }
      const sim=e.target.closest('[data-sim-match]');
      if(sim){
        const match=league().schedule.find(m=>m.id===sim.dataset.simMatch);
        if(match&&canSimMatch(match)&&!hasLiveMatch()){
          E.simulateMatchInState(state,match,true);
          syncCurrentRound();
          save();
          activateView('match');
          render();
        }
      }
      const simNext=e.target.closest('[data-sim-next-team]');
      if(simNext){
        const match=playableOwnMatch();
        if(match&&!hasLiveMatch()){
          E.simulateMatchInState(state,match,true);
          syncCurrentRound();
          save();
          activateView('match');
          render();
        }
      }
    });
  }

  function activateView(name){
    view=name;
    document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  }

  function pushNews(text){
    state.news.unshift({type:'info',text});
    state.news=state.news.slice(0,8);
  }

  function hasLiveMatch(){
    return !!state.liveMatch;
  }

  function setLiveAuto(on){
    liveAuto=!!on&&hasLiveMatch()&&!state.liveMatch.finished;
    scheduleLiveTick();
  }

  function liveRevealIndex(live=state.liveMatch){
    if(!live) return 0;
    return Math.max(0,Math.min(state.liveRevealIndex??live.log.length,live.log.length));
  }

  function visibleLiveLog(live=state.liveMatch){
    if(!live) return [];
    return live.log.slice(0,liveRevealIndex(live));
  }

  function cloneRotations(rotations={}){
    const copy={};
    Object.keys(rotations||{}).forEach(id=>{
      copy[id]=Array.isArray(rotations[id])?rotations[id].slice():[];
    });
    return copy;
  }

  function ensureLiveRotationTimeline(){
    if(!state.liveMatch) return;
    if(!Array.isArray(state.liveRotationTimeline)){
      state.liveRotationTimeline=[{at:0,rotations:cloneRotations(state.liveMatch.rotations||{})}];
    }
  }

  function pushRotationSnapshot(at,rotations){
    ensureLiveRotationTimeline();
    state.liveRotationTimeline.push({at,rotations:cloneRotations(rotations||{})});
    state.liveRotationTimeline.sort((a,b)=>a.at-b.at);
  }

  function visibleRotations(live=state.liveMatch){
    if(!live) return {};
    ensureLiveRotationTimeline();
    const reveal=liveRevealIndex(live);
    let snapshot=state.liveRotationTimeline[0];
    state.liveRotationTimeline.forEach(entry=>{
      if(entry.at<=reveal) snapshot=entry;
    });
    return snapshot?.rotations||live.rotations||{};
  }

  function isLiveRevealing(){
    return !!(state.liveMatch&&liveRevealIndex(state.liveMatch)<state.liveMatch.log.length);
  }

  function pendingChallengeTeam(live=state.liveMatch){
    return live?.pendingChallenge?.challenge?.challenger||null;
  }

  function isUserPendingChallenge(live=state.liveMatch){
    return !!(live?.pendingChallenge&&pendingChallengeTeam(live)===state.selectedTeam);
  }

  function isOpponentPendingChallenge(live=state.liveMatch){
    return !!(live?.pendingChallenge&&pendingChallengeTeam(live)!==state.selectedTeam);
  }

  function shouldLiveTick(){
    if(!state.liveMatch) return false;
    if(isLiveRevealing()) return true;
    if(isOpponentPendingChallenge()) return true;
    if(state.liveMatch.pendingChallenge) return false;
    return !!liveAuto;
  }

  function scheduleLiveTick(){
    if(liveAutoTimer){
      clearTimeout(liveAutoTimer);
      liveAutoTimer=null;
    }
    if(shouldLiveTick()) liveAutoTimer=setTimeout(tickLiveAuto,LIVE_STEP_DELAY);
  }

  function revealOneLiveStep(){
    const live=state.liveMatch;
    if(!live) return false;
    const idx=liveRevealIndex(live);
    if(idx>=live.log.length) return false;
    state.liveRevealIndex=idx+1;
    return true;
  }

  function startSingleLiveRally(){
    const live=state.liveMatch;
    if(!live) return;
    if(!isLiveRevealing()&&!live.finished) playOneLiveRally();
    revealOneLiveStep();
    if(live.finished&&liveRevealIndex(live)>=live.log.length){
      finalizeLiveMatch();
      return;
    }
    save();
    render();
    scheduleLiveTick();
  }

  function tickLiveAuto(){
    if(!hasLiveMatch()){
      setLiveAuto(false);
      return;
    }
    const live=state.liveMatch;
    if(isLiveRevealing()){
      revealOneLiveStep();
      if(live.finished&&liveRevealIndex(live)>=live.log.length){
        finalizeLiveMatch();
        return;
      }
      save();
      render();
      scheduleLiveTick();
      return;
    }
    if(live.finished){
      finalizeLiveMatch();
      return;
    }
    if(isOpponentPendingChallenge(live)){
      autoResolveOpponentChallenge();
      save();
      render();
      scheduleLiveTick();
      return;
    }
    if(!liveAuto) return;
    playOneLiveRally();
    revealOneLiveStep();
    if(live.finished&&liveRevealIndex(live)>=live.log.length){
      finalizeLiveMatch();
      return;
    }
    save();
    render();
    scheduleLiveTick();
  }

  function playOneLiveRally(){
    const live=state.liveMatch;
    if(!live||live.finished) return;
    ensureLiveRotationTimeline();
    const start=live.log.length;
    pushRotationSnapshot(start+1,live.rotations);
    E.playLivePoint(live);
    pushStartSetRotationSnapshots(start);
  }

  function autoResolveOpponentChallenge(){
    const live=state.liveMatch;
    if(!live?.pendingChallenge) return;
    const start=live.log.length;
    E.resolveLiveChallenge(live,shouldAutoTakeChallenge(live,live.pendingChallenge.challenge));
    pushStartSetRotationSnapshots(start);
  }

  function shouldAutoTakeChallenge(live,challenge){
    const misses=live.challengeMisses?.[challenge.challenger]||0;
    if(misses>=2) return false;
    const hint=challenge.staffHint;
    return hint?.recommends?Math.random()<.88:Math.random()<.08;
  }

  function pushStartSetRotationSnapshots(start){
    const live=state.liveMatch;
    if(!live) return;
    live.log.slice(start).forEach((line,i)=>{
      if(/^Start seta/.test(stripHtml(line))){
        pushRotationSnapshot(start+i+1,live.rotations);
      }
    });
  }

  function findLiveScheduleMatch(live){
    if(!live) return null;
    for(const l of state.leagues){
      const match=l.schedule.find(m=>m.id===live.matchId&&m.home===live.home&&m.away===live.away);
      if(match) return match;
    }
    const leagueId=state.teamMap?.[live.home]?.league;
    const league=leagueId?E.leagueState(state,leagueId):null;
    const candidates=league?.schedule||state.leagues.flatMap(l=>l.schedule);
    return candidates.find(m=>!m.played&&m.home===live.home&&m.away===live.away)
      || candidates.find(m=>m.home===live.home&&m.away===live.away)
      || null;
  }

  function recoverFinishedLiveMatch(){
    const live=state.liveMatch;
    if(!live?.finished) return false;
    const match=findLiveScheduleMatch(live);
    if(!match) return false;
    const result=E.applyLiveMatchToState(state,match,live);
    if(result) state.lastMatch=result;
    state.liveMatch=null;
    state.liveRevealIndex=0;
    state.liveRotationTimeline=null;
    return true;
  }

  function clearAppliedOrOrphanLiveMatch(){
    const live=state.liveMatch;
    if(!live) return false;
    const match=findLiveScheduleMatch(live);
    const alreadyApplied=!!match?.played;
    const orphan=!match;
    if(!alreadyApplied&&!orphan) return false;
    if(live.finished&&live.result) state.lastMatch=live.result;
    state.liveMatch=null;
    state.liveRevealIndex=0;
    state.liveRotationTimeline=null;
    return true;
  }

  function finalizeLiveMatch(){
    const live=state.liveMatch;
    if(!live?.finished) return;
    setLiveAuto(false);
    const match=findLiveScheduleMatch(live);
    if(!match){
      pushNews('Nie udało się dopisać zakończonego meczu do terminarza. Wynik zostawiony w toku, żeby go nie zgubić.');
      state.liveRevealIndex=live.log.length;
      save();
      render();
      return;
    }
    const result=E.applyLiveMatchToState(state,match,live);
    if(result) state.lastMatch=result;
    state.liveMatch=null;
    state.liveRevealIndex=0;
    state.liveRotationTimeline=null;
    syncCurrentRound();
    activateView('match');
    save();
    render();
  }

  function matchInvolvesSelected(match){
    return match&&(match.home===state.selectedTeam||match.away===state.selectedTeam);
  }

  function playableOwnMatch(){
    return E.getCurrentRoundMatches(state,state.selectedLeague).find(m=>!m.played&&matchInvolvesSelected(m))||null;
  }

  function canSimMatch(match){
    return state.careerStarted&&!hasLiveMatch()&&!match.played&&matchInvolvesSelected(match)&&E.getCurrentRoundMatches(state,state.selectedLeague).some(m=>m.id===match.id);
  }

  function syncCurrentRound(){
    const l=league();
    const remaining=l.schedule.filter(m=>!m.played);
    l.currentRound=remaining.length?Math.min(...remaining.map(m=>m.round)):l.currentRound+1;
  }

  function updateSidebar(){
    const box=$('career-card');
    if(!box) return;
    if(!state.careerStarted){
      const l=E.leagueState(state,draftLeague);
      const t=team(draftTeam);
      box.innerHTML=`
        <div class="career-eyebrow">Nowa kariera</div>
        <div class="career-club">
          <div class="crest large">${esc(t.short)}</div>
          <div>
            <strong>${esc(t.name)}</strong>
            <span>${esc(l.name)}</span>
          </div>
        </div>
        <div class="career-meta">
          <span>Trener</span><b>${esc(t.coach)}</b>
          <span>Siła kadry</span><b>${E.teamOverall(t)}</b>
        </div>
        <p>Wybierz zespół w głównym oknie i rozpocznij sezon.</p>
      `;
      return;
    }
    const t=currentTeam();
    const l=league();
    const st=l.standings[t.id];
    const rows=E.sortedStandings(state,state.selectedLeague);
    const rank=rows.findIndex(x=>x.teamId===t.id)+1;
    const next=E.nextMatchForTeam(state,t.id);
    const opponent=next?team(next.home===t.id?next.away:next.home):null;
    box.innerHTML=`
      <div class="career-eyebrow">Twój klub</div>
      <div class="career-club">
        <div class="crest large">${esc(t.short)}</div>
        <div>
          <strong>${esc(t.name)}</strong>
          <span>${esc(l.name)}</span>
        </div>
      </div>
      <div class="career-meta">
        <span>Pozycja</span><b>${rank?`${rank}.`: '-'}</b>
        <span>Bilans</span><b>${st.w}-${st.l}</b>
        <span>Punkty</span><b>${st.points}</b>
        <span>Siła kadry</span><b>${E.teamOverall(t)}</b>
      </div>
      <div class="career-next">
        <span>Następny mecz</span>
        <strong>${opponent?esc(opponent.short):'Koniec sezonu'}</strong>
      </div>
    `;
  }

  function render(){
    document.body.classList.toggle('start-mode',!state.careerStarted);
    document.body.classList.toggle('career-mode',state.careerStarted);
    updateSidebar();
    document.querySelectorAll('.nav button').forEach(b=>{
      b.disabled=!state.careerStarted;
      b.classList.toggle('active',state.careerStarted&&b.dataset.view===view);
    });
    const actionLabel=primaryActionLabel();
    $('simulate-day').disabled=!state.careerStarted||actionLabel==='Sezon zakończony';
    $('simulate-day').textContent=actionLabel;
    if(!state.careerStarted){
      renderStart();
      return;
    }
    $('season-label').textContent=`${league().name} · sezon ${league().season}`;
    const map={
      dashboard:renderDashboard,
      squad:renderSquad,
      lineup:renderLineup,
      league:renderLeague,
      match:renderMatch,
      database:renderDatabase
    };
    map[view]();
  }

  function primaryActionLabel(){
    if(!state.careerStarted) return 'Start kariery';
    if(hasLiveMatch()) return 'Kontynuuj mecz';
    if(playableOwnMatch()) return 'Przejdź do meczu';
    const current=E.getCurrentRoundMatches(state,state.selectedLeague).filter(m=>!m.played);
    if(current.length) return 'Dokończ kolejkę';
    return 'Sezon zakończony';
  }

  function renderStart(){
    const l=E.leagueState(state,draftLeague);
    const selected=team(draftTeam);
    $('season-label').textContent='Volley Manager Polska';
    setTitle('Nowa kariera');
    $('view').innerHTML=`
      <section class="start-window">
        <div class="start-copy">
          <div class="eyebrow">Start gry</div>
          <h3>Wybierz klub i rozpocznij sezon.</h3>
          <p>Po starcie kariery grasz tylko wybranym zespołem. Pozostałe kluby symuluje komputer, a terminarz, tabela i baza ligi zostają wspólne dla całego sezonu.</p>
        </div>
        <div class="start-panel">
          <div class="league-picks">
            ${state.leagues.map(x=>`<button class="${x.id===draftLeague?'selected':''}" data-start-league="${esc(x.id)}">${esc(x.name)}</button>`).join('')}
          </div>
          <div class="team-picks">
            ${l.teams.map(id=>startTeamCard(team(id),id===draftTeam)).join('')}
          </div>
          <div class="start-footer">
            <div>
              <span class="note">Wybrany klub</span>
              <strong>${esc(selected.name)}</strong>
            </div>
            <button class="btn primary" data-start-career>Rozpocznij karierę</button>
          </div>
        </div>
      </section>
    `;
  }

  function startTeamCard(t,selected){
    return `<button class="team-pick-card ${selected?'selected':''}" data-start-team="${esc(t.id)}">
      <span class="crest">${esc(t.short)}</span>
      <span class="team-pick-main">
        <strong>${esc(t.name)}</strong>
        <small>${esc(t.city)} · trener: ${esc(t.coach)}</small>
      </span>
      <span class="pill">OVR ${E.teamOverall(t)}</span>
    </button>`;
  }

  function renderDashboard(){
    const t=currentTeam();
    const st=league().standings[t.id];
    const standings=E.sortedStandings(state,state.selectedLeague);
    const rank=standings.findIndex(x=>x.teamId===t.id)+1;
    const playable=playableOwnMatch();
    const next=playable||E.nextMatchForTeam(state,t.id);
    setTitle('Centrum klubu');
    $('view').innerHTML=`
      <div class="grid dashboard">
        ${metric('Pozycja',rank?`${rank}.`:'-')}
        ${metric('Bilans',`${st.w}-${st.l}`)}
        ${metric('Punkty',st.points)}
        ${metric('Siła składu',E.teamOverall(t))}
      </div>
      <div class="grid two-col" style="margin-top:14px">
        <section class="card">
          <div class="card-head"><span>Twój klub</span><span>${esc(t.city)}</span></div>
          <div class="card-body">
            <div class="team-title">
              <div class="crest">${esc(t.short)}</div>
              <div><h3 style="margin:0">${esc(t.name)}</h3><div class="note">Trener: ${esc(t.coach)} · liga: ${esc(league().name)}</div></div>
            </div>
            <div class="toolbar" style="margin-top:14px">
              <button class="btn primary" data-open-match ${playable||hasLiveMatch()?'':'disabled'}>${hasLiveMatch()?'Kontynuuj mecz':'Przejdź do meczu'}</button>
              <button class="btn" onclick="document.querySelector('[data-view=lineup]').click()">Ustaw skład</button>
            </div>
            ${next?matchCard(next):'<p class="note">Sezon ligowy zakończony.</p>'}
            ${!playable&&next?'<p class="note" style="margin:10px 0 0">Najpierw dokończ bieżącą kolejkę, aby przejść do następnego meczu Twojego klubu.</p>':''}
          </div>
        </section>
        <section class="card">
          <div class="card-head">Wiadomości</div>
          <div class="card-body">
            <div class="list">
              ${state.news.slice(0,7).map(n=>`<div class="note">• ${esc(n.text)}</div>`).join('')}
            </div>
          </div>
        </section>
      </div>
      <div class="grid two-col" style="margin-top:14px">
        ${standingsCard(standings.slice(0,8))}
        ${roundCard()}
      </div>
    `;
  }

  function metric(label,value){
    return `<section class="card metric"><span>${esc(label)}</span><strong>${esc(value)}</strong></section>`;
  }

  function matchCard(m){
    const h=team(m.home),a=team(m.away);
    const canSim=canSimMatch(m);
    const action=m.played
      ? '<button class="btn" disabled>OK</button>'
      : canSim
        ? `<button class="btn" data-open-match>Mecz</button>`
        : `<span class="pill">${matchInvolvesSelected(m)?'później':'AI'}</span>`;
    return `<div class="match-row">
      <div>${esc(h.name)}</div>
      <div>${resultLabel(m)}</div>
      <div class="right">${esc(a.name)}</div>
      ${action}
    </div>`;
  }

  function roundCard(){
    const matches=E.getCurrentRoundMatches(state,state.selectedLeague);
    return `<section class="card">
      <div class="card-head"><span>Kolejka ${matches[0]?.round||'-'}</span><span>${matches.filter(m=>m.played).length}/${matches.length}</span></div>
      <div class="card-body list">${matches.map(matchCard).join('')||'<p class="note">Brak meczów do rozegrania.</p>'}</div>
    </section>`;
  }

  function standingsCard(rows=E.sortedStandings(state,state.selectedLeague)){
    return `<section class="card">
      <div class="card-head">Tabela</div>
      <div class="table-wrap"><table>
        <thead><tr><th>#</th><th>Klub</th><th>M</th><th>W</th><th>P</th><th>Sety</th><th>Małe pkt</th><th>PKT</th></tr></thead>
        <tbody>
          ${rows.map((r,i)=>`
            <tr class="${r.teamId===state.selectedTeam?'highlight':''}">
              <td>${i+1}</td><td>${esc(team(r.teamId).short)} ${esc(team(r.teamId).name)}</td><td>${r.played}</td><td>${r.w}</td><td>${r.l}</td>
              <td>${r.setsFor}:${r.setsAgainst}</td><td>${r.pointsFor}:${r.pointsAgainst}</td><td><strong>${r.points}</strong></td>
            </tr>`).join('')}
        </tbody>
      </table></div>
    </section>`;
  }

  function renderSquad(){
    const t=currentTeam();
    setTitle('Skład i atrybuty');
    $('view').innerHTML=`
      <section class="card">
        <div class="card-head"><span>Kadra ${esc(t.short)}</span><span>${t.players.length} zawodników</span></div>
        <div class="table-wrap">${playersTable(t.players)}</div>
      </section>`;
  }

  function playersTable(players){
    const skills=DATA.SKILLS||[];
    return `<table class="skill-table">
      <thead><tr><th>Pos</th><th>Zawodnik</th><th>OVR</th><th title="Overall z uwzględnieniem aktualnej formy">Mecz</th><th>Forma</th>${skills.map(([key,label])=>`<th title="${esc(label)}">${esc(SKILL_ABBR[key]||label)}</th>`).join('')}<th>Kontrakt</th></tr></thead>
      <tbody>${players.slice().sort((a,b)=>a.pos.localeCompare(b.pos)||b.overall-a.overall).map(p=>`
        <tr><td><span class="pos">${esc(p.pos)}</span></td><td>${esc(p.name)}</td><td><strong>${p.overall}</strong></td><td><strong>${E.matchOverall(p)}</strong></td><td>${formBadge(p.form)}</td>${skills.map(([key])=>`<td>${skillValue(p,key)}</td>`).join('')}<td>${p.contract}</td></tr>
      `).join('')}</tbody>
    </table>`;
  }

  function playerLine(p,compact=false){
    return `<div class="match-row" style="grid-template-columns:auto 1fr auto auto">
      <span class="pos">${esc(p.pos)}</span>
      <div>${esc(p.name)} ${compact?`<span class="note">· ${esc(DATA.POS[p.pos])}</span>`:''}</div>
      <span class="pill">OVR ${p.overall}</span>
      ${formBadge(p.form)}
    </div>`;
  }

  function formBadge(value){
    const form=Number(value||5.5);
    const cls=form>=7.6?'good':form<=4.5?'bad':form<=5.4?'warn':'';
    return `<span class="form-badge ${cls}">forma ${form.toFixed(1)}</span>`;
  }

  function lineupSlots(){
    return [
      {key:'setter',label:'Rozgrywający',pos:'S'},
      {key:'opposite',label:'Atakujący',pos:'OP'},
      {key:'outside1',label:'Przyjmujący 1',pos:'OH'},
      {key:'outside2',label:'Przyjmujący 2',pos:'OH'},
      {key:'middle1',label:'Środkowy 1',pos:'MB'},
      {key:'middle2',label:'Środkowy 2',pos:'MB'},
      {key:'libero',label:'Libero',pos:'L'}
    ];
  }

  function currentLineupIds(t=currentTeam()){
    const manual=Array.isArray(t.activeLineupIds)?t.activeLineupIds:[];
    if(t.useActiveLineup&&manual.length>=6) return manual.slice(0,7);
    return E.selectLineup(t).map(p=>p.id);
  }

  function playerById(t,id){
    return t.players.find(p=>p.id===id)||null;
  }

  function lineupOptions(t,pos,selectedId){
    return t.players
      .filter(p=>p.pos===pos)
      .sort((a,b)=>E.matchOverall(b)-E.matchOverall(a)||b.overall-a.overall)
      .map(p=>`<option value="${esc(p.id)}" ${p.id===selectedId?'selected':''}>${esc(p.name)} · OVR ${p.overall} · mecz ${E.matchOverall(p)} · forma ${Number(p.form||5.5).toFixed(1)}</option>`)
      .join('');
  }

  function saveManualLineup(){
    const t=currentTeam();
    const slots=lineupSlots();
    const ids=slots.map(slot=>$(`lineup-${slot.key}`)?.value).filter(Boolean);
    const unique=new Set(ids);
    if(ids.length!==slots.length) return {ok:false,message:'Wybierz zawodnika w każdym slocie.'};
    if(unique.size!==ids.length) return {ok:false,message:'Ten sam zawodnik nie może być ustawiony w dwóch rolach.'};
    for(let i=0;i<slots.length;i++){
      const p=playerById(t,ids[i]);
      if(!p||p.pos!==slots[i].pos) return {ok:false,message:`Nieprawidłowa pozycja w slocie: ${slots[i].label}.`};
    }
    t.useActiveLineup=true;
    t.activeLineupIds=ids;
    return {ok:true};
  }

  function renderLineup(){
    const t=currentTeam();
    const ids=currentLineupIds(t);
    const selected=Object.fromEntries(lineupSlots().map((slot,i)=>[slot.key,ids[i]]));
    const lineup=ids.map(id=>playerById(t,id)).filter(Boolean);
    const avgForm=lineup.reduce((sum,p)=>sum+Number(p.form||5.5),0)/Math.max(1,lineup.length);
    setTitle('Ustawienie');
    $('view').innerHTML=`
      <div class="grid two-col lineup-page">
        <section class="card">
          <div class="card-head"><span>Ustawienie meczowe ${esc(t.short)}</span><span>${t.useActiveLineup?'ręczne':'sugerowane'}</span></div>
          <div class="card-body">
            <div class="lineup-editor">
              ${lineupSlots().map(slot=>`
                <label class="lineup-slot">
                  <span><b>${esc(slot.label)}</b><small>${esc(DATA.POS[slot.pos]||slot.pos)}</small></span>
                  <select id="lineup-${esc(slot.key)}">${lineupOptions(t,slot.pos,selected[slot.key])}</select>
                </label>
              `).join('')}
            </div>
            <div class="toolbar" style="margin:12px 0 0">
              <button class="btn primary" data-lineup-save>Zapisz ustawienie</button>
              <button class="btn" data-lineup-auto>Automatyczna siódemka</button>
            </div>
            <p class="note">To ustawienie będzie używane w szybkiej symulacji i w trybie point by point. Rotacja startowa dalej układa szóstkę na boisku według pozycji.</p>
          </div>
        </section>
        <section class="card">
          <div class="card-head"><span>Podgląd siódemki</span><span>forma ${avgForm.toFixed(1)}</span></div>
          <div class="card-body">
            <div class="lineup-summary">
              ${lineupSlots().map((slot,i)=>{
                const p=playerById(t,ids[i]);
                return `<div class="lineup-summary-row">
                  <span class="pos">${esc(slot.pos)}</span>
                  <div><strong>${p?esc(p.name):'brak'}</strong><small>${esc(slot.label)}</small></div>
                  ${p?`<span class="pill">mecz ${E.matchOverall(p)}</span>${formBadge(p.form)}`:''}
                </div>`;
              }).join('')}
            </div>
          </div>
        </section>
      </div>`;
  }

  function renderLeague(){
    setTitle('Liga i terminarz');
    const l=league();
    const grouped=Object.groupBy?Object.groupBy(l.schedule,m=>m.round):groupBy(l.schedule,m=>m.round);
    $('view').innerHTML=`
      <div class="grid two-col">
        ${standingsCard()}
        <section class="card">
          <div class="card-head"><span>Terminarz</span><span>${l.schedule.filter(m=>m.played).length}/${l.schedule.length}</span></div>
          <div class="card-body list">
            ${Object.keys(grouped).slice(0,8).map(round=>`
              <div>
                <div class="note" style="margin:8px 0 6px">Kolejka ${round}</div>
                <div class="list">${grouped[round].map(matchCard).join('')}</div>
              </div>
            `).join('')}
          </div>
        </section>
      </div>`;
  }

  function groupBy(arr,fn){
    return arr.reduce((acc,x)=>{const k=fn(x);(acc[k]||(acc[k]=[])).push(x);return acc;},{});
  }

  function renderMatch(){
    setTitle('Mecz tekstowy');
    if(hasLiveMatch()){
      $('view').innerHTML=renderLiveMatch(state.liveMatch);
      return;
    }
    const playable=playableOwnMatch();
    const next=playable||E.nextMatchForTeam(state,state.selectedTeam);
    const last=state.lastMatch;
    $('view').innerHTML=`
      <div class="grid two-col">
        <section class="card">
          <div class="card-head"><span>Następny mecz</span><span>${next?`Kolejka ${next.round}`:'-'}</span></div>
          <div class="card-body">
            ${next?matchCard(next):'<p class="note">Brak kolejnego meczu dla wybranego klubu.</p>'}
            ${!playable&&next?'<p class="note" style="margin-top:10px">Ten mecz jest w kolejnej rundzie. Najpierw dokończ mecze AI w bieżącej kolejce.</p>':''}
            <div class="toolbar" style="margin-top:12px">
              <button class="btn primary" data-start-live-match ${playable?'':'disabled'}>Point by point</button>
              <button class="btn" data-sim-next-team ${playable?'':'disabled'}>Szybka symulacja</button>
            </div>
            <p class="note" style="margin:0">Tryb point by point pokazuje zagrania po kolei. Pauza zatrzymuje mecz dopiero po zakończeniu bieżącej akcji.</p>
          </div>
        </section>
        <section class="card">
          <div class="card-head">Ostatni wynik</div>
          <div class="card-body">
            ${last?lastSummary(last):'<p class="note">Nie rozegrano jeszcze żadnego meczu.</p>'}
          </div>
        </section>
      </div>
      <section class="card" style="margin-top:14px">
        <div class="card-head"><span>Play-by-play</span><span>${last?.log?.length||0} wpisów</span></div>
        <div class="card-body">
          ${last
            ? (last.log?.length?renderLogRows(last.log,90):'<ul class="log"><li>Log akcji nie jest zapisywany po meczu. W karierze zostaje wynik, sety i statystyki.</li></ul>')
            : '<ul class="log"><li>Symuluj mecz, aby zobaczyć tekstowy przebieg akcji.</li></ul>'}
        </div>
      </section>`;
  }

  function liveTeam(live,id){
    return id===live.home?live.homeTeam:live.awayTeam;
  }

  function liveActivePlayers(t){
    const ids=t.activeLineupIds||[];
    return ids.map(id=>t.players.find(p=>p.id===id)).filter(Boolean);
  }

  function liveBenchPlayers(t){
    const ids=new Set(t.activeLineupIds||[]);
    return t.players.filter(p=>!ids.has(p.id)).sort((a,b)=>a.pos.localeCompare(b.pos)||b.overall-a.overall);
  }

  function liveRotationIds(live,t,rotations=live.rotations){
    const saved=rotations?.[t.id];
    if(Array.isArray(saved)&&saved.length>=6) return saved.slice(0,6);
    const active=liveActivePlayers(t).filter(p=>p.pos!=='L');
    return active.slice(0,6).map(p=>p.id);
  }

  function livePlayer(t,id){
    return t.players.find(p=>p.id===id)||null;
  }

  function rotationSlots(live,t,rotations=live.rotations){
    const ids=liveRotationIds(live,t,rotations);
    const libero=liveActivePlayers(t).find(p=>p.pos==='L')||t.players.find(p=>p.pos==='L');
    const raw={
      P1:livePlayer(t,ids[0]),
      P2:livePlayer(t,ids[1]),
      P3:livePlayer(t,ids[2]),
      P4:livePlayer(t,ids[3]),
      P5:livePlayer(t,ids[4]),
      P6:livePlayer(t,ids[5])
    };
    return [
      {key:'P4',zone:'Lewy przód',row:'front',raw:raw.P4},
      {key:'P3',zone:'Środek przód',row:'front',raw:raw.P3},
      {key:'P2',zone:'Prawy przód',row:'front',raw:raw.P2},
      {key:'P5',zone:'Lewy tył',row:'back',raw:raw.P5},
      {key:'P6',zone:'Środek tył',row:'back',raw:raw.P6},
      {key:'P1',zone:'Prawy tył',row:'back',raw:raw.P1}
    ].map(slot=>{
      const mbBack=slot.row==='back'&&slot.raw?.pos==='MB';
      const middleServing=slot.key==='P1'&&live.serving===t.id;
      const shown=mbBack&&libero&&!middleServing?libero:slot.raw;
      return {...slot,player:shown,replaced:shown?.id!==slot.raw?.id?slot.raw:null,server:slot.key==='P1'&&live.serving===t.id};
    });
  }

  function renderRotationCourt(live,t,rotations=visibleRotations(live)){
    const slots=rotationSlots(live,t,rotations);
    return `<div class="rotation-court">
      <div class="court-net">Siatka</div>
      <div class="attack-line">3 m</div>
      <div class="court-grid">
        ${slots.map(slot=>rotationSlot(slot)).join('')}
      </div>
    </div>`;
  }

  function rotationSlot(slot){
    const p=slot.player;
    return `<div class="rotation-slot ${slot.row} ${slot.server?'server':''}">
      <div class="slot-top">
        <span>${esc(slot.key)}</span>
        <b>${esc(slot.zone)}</b>
      </div>
      ${p?`
        <strong>${esc(p.name)}</strong>
        <em>${esc(p.pos)} · OVR ${p.overall}</em>
        ${slot.replaced?`<small>libero za ${esc(slot.replaced.name)}</small>`:''}
        ${slot.server?'<small class="serve-mark">serwis</small>':''}
      `:'<strong>brak zawodnika</strong>'}
    </div>`;
  }

  function renderLiveMatch(live){
    const home=live.homeTeam;
    const away=live.awayTeam;
    const own=liveTeam(live,state.selectedTeam);
    const ownActive=liveActivePlayers(own);
    const ownBench=liveBenchPlayers(own);
    const serving=liveTeam(live,live.serving);
    const revealing=isLiveRevealing();
    const pendingChallenge=!!(live.pendingChallenge&&!revealing);
    const userPendingChallenge=pendingChallenge&&pendingChallengeTeam(live)===state.selectedTeam;
    const opponentPendingChallenge=pendingChallenge&&!userPendingChallenge;
    const display=displayLiveState(live);
    const visibleLog=visibleLiveLog(live);
    const timeoutLeft=live.timeouts?.[state.selectedTeam]??2;
    const subsLeft=live.substitutions?.[state.selectedTeam]??6;
    const statsMode=(state.livePanel||'changes')==='stats';
    const autoLabel=opponentPendingChallenge?'Rywal analizuje':userPendingChallenge?'Czeka challenge':liveAuto?'Pauza po akcji':revealing?'Zatrzymuje po akcji':'Wolna symulacja';
    const autoNote=opponentPendingChallenge
        ? 'Rywal ma sytuację sporną. Decyzja o challenge zostanie podjęta automatycznie.'
      : userPendingChallenge
        ? 'Akcja zakończyła się sytuacją sporną. Wybierz, czy prosisz o challenge.'
      : liveAuto
        ? `Mecz sam pokazuje kolejne zagranie co ${(LIVE_STEP_DELAY/1000).toFixed(1)} s.`
      : revealing
        ? 'Pauza została wciśnięta. Bieżąca wymiana zostanie dokończona i dopiero wtedy mecz stanie.'
        : 'Mecz jest zatrzymany. Możesz puścić wolną symulację albo rozpocząć jedną akcję.';
    return `
      <section class="card live-card">
        <div class="card-head"><span>Tryb point by point</span><span>Set ${display.setNo} · serwis ${esc(serving.short)}</span></div>
        <div class="card-body">
          <div class="live-scoreboard">
            ${liveScoreClub(home,display.homeSets,display.score.home,home.id===state.selectedTeam)}
            <div class="live-center">
              <span>Sety</span>
              <strong>${display.homeSets}:${display.awaySets}</strong>
              <em>${esc(home.short)} ${display.score.home}:${display.score.away} ${esc(away.short)}</em>
            </div>
            ${liveScoreClub(away,display.awaySets,display.score.away,away.id===state.selectedTeam)}
          </div>
          <div class="toolbar live-toolbar">
            <button class="btn primary" data-live-toggle-auto ${pendingChallenge?'disabled':''}>${autoLabel}</button>
            <button class="btn" data-live-next-point ${revealing||pendingChallenge||live.finished?'disabled':''}>Jedna akcja</button>
            <button class="btn" data-live-timeout ${timeoutLeft>0&&!revealing&&!pendingChallenge&&!live.finished?'':'disabled'}>Weź czas (${timeoutLeft})</button>
            <button class="btn ghost" data-live-finish-fast>Dokończ szybko</button>
          </div>
          <p class="note" style="margin:-4px 0 0">${autoNote}</p>
          ${pendingChallenge?renderChallengeDecision(live,userPendingChallenge):''}
          <div class="live-manager ${statsMode?'stats-view':''}">
            ${renderLiveManagerPanel(live,own,ownActive,ownBench,subsLeft,revealing,pendingChallenge)}
            <div>
              <div class="eyebrow court-title">Rotacja ${esc(own.short)}</div>
              ${renderRotationCourt(live,own)}
            </div>
          </div>
        </div>
      </section>
      ${statsMode?'':`<section class="card" style="margin-top:14px">
        <div class="card-head"><span>Przebieg meczu</span><span>${logRowCount(visibleLog)} akcji</span></div>
        <div class="card-body">
          ${renderLogRows(visibleLog,80)}
        </div>
      </section>`}`;
  }

  function renderLiveManagerPanel(live,own,ownActive,ownBench,subsLeft,revealing,pendingChallenge){
    const tab=state.livePanel||'changes';
    return `<div class="live-main-panel">
      <div class="live-tabs" role="tablist" aria-label="Panel meczu">
        <button class="${tab==='changes'?'active':''}" data-live-panel="changes" type="button">Zmiany</button>
        <button class="${tab==='stats'?'active':''}" data-live-panel="stats" type="button">Statystyki</button>
      </div>
      ${tab==='stats'
        ? renderLiveStatsPanel(live,own,ownActive)
        : renderLiveChangesPanel(own,ownActive,ownBench,subsLeft,revealing,pendingChallenge,live.finished)}
    </div>`;
  }

  function renderLiveChangesPanel(own,ownActive,ownBench,subsLeft,revealing,pendingChallenge,finished){
    return `<div class="live-tab-panel">
      <div class="eyebrow">Zmiana w ${esc(own.short)}</div>
      <div class="select-row">
        <select id="live-sub-out">${ownActive.map(p=>`<option value="${esc(p.id)}">${esc(p.pos)} · ${esc(p.name)} · OVR ${p.overall}</option>`).join('')}</select>
        <select id="live-sub-in">${ownBench.map(p=>`<option value="${esc(p.id)}">${esc(p.pos)} · ${esc(p.name)} · OVR ${p.overall}</option>`).join('')}</select>
        <button class="btn" data-live-sub ${ownBench.length&&subsLeft>0&&!revealing&&!pendingChallenge&&!finished?'':'disabled'}>Wykonaj zmianę (${subsLeft})</button>
      </div>
      <p class="note">Zmiany są pozycja za pozycję i limit odnawia się w każdym secie.</p>
    </div>`;
  }

  function renderLiveStatsPanel(live,own,ownActive){
    const scope=state.liveStatsScope||'match';
    const stats=scope==='set'?(live.setStats||{}):(live.stats||{});
    const activeIds=new Set(ownActive.map(p=>p.id));
    const rows=own.players
      .map(p=>({player:p,stats:statRecord(stats,p),active:activeIds.has(p.id)}))
      .filter(row=>row.active||statActivity(row.stats)>0)
      .sort((a,b)=>
        Number(b.active)-Number(a.active) ||
        liveStatUrgency(b.player,b.stats)-liveStatUrgency(a.player,a.stats) ||
        b.player.overall-a.player.overall
      );
    const totals=rows.reduce((acc,row)=>{
      ['pts','kills','att','aces','serves','serveErrors','blocks','blockTouches','digs','recv','receptionPositive','receptionPerfect','receptionErrors','errors'].forEach(key=>acc[key]+=row.stats[key]||0);
      return acc;
    },{pts:0,kills:0,att:0,aces:0,serves:0,serveErrors:0,blocks:0,blockTouches:0,digs:0,recv:0,receptionPositive:0,receptionPerfect:0,receptionErrors:0,errors:0});
    const positiveReception=totals.receptionPositive+totals.receptionPerfect;
    return `<div class="live-tab-panel live-stats">
      <div class="stats-head">
        <div>
          <div class="eyebrow">Statystyki ${esc(own.short)}</div>
          <strong>${scope==='set'?'Obecny set':'Cały mecz'}</strong>
        </div>
        <div class="scope-toggle" role="tablist" aria-label="Zakres statystyk">
          <button class="${scope==='match'?'active':''}" data-live-stats-scope="match" type="button">Mecz</button>
          <button class="${scope==='set'?'active':''}" data-live-stats-scope="set" type="button">Set</button>
        </div>
      </div>
      <div class="stat-kpis">
        <span><b>${totals.pts}</b> pkt</span>
        <span><b>${totals.att?Math.round(totals.kills/totals.att*100):0}%</b> atak</span>
        <span><b>${totals.recv?Math.round(positiveReception/totals.recv*100):0}%</b> przyjęcie +</span>
        <span><b>${totals.aces}/${totals.serveErrors}</b> asy/bł.</span>
        <span><b>${totals.blocks}+${totals.blockTouches}</b> blok</span>
        <span><b>${totals.errors}</b> błędy</span>
      </div>
      <div class="table-wrap">
        <table class="live-stats-table">
          <thead><tr>
            <th>Pos</th><th>Zawodnik</th><th>Status</th><th>PKT</th><th title="Punkty minus błędy">+/-</th>
            <th title="Skończone ataki / próby / skuteczność">Atak</th>
            <th title="Błędy ataku / ataki zablokowane">At. bł.</th>
            <th title="Asy / błędy / próby">Serwis</th>
            <th title="Perfekcyjne, pozytywne, słabe i błędne przyjęcia">Przyjęcie</th>
            <th title="Dobre / niedokładne / błędne / wszystkie wystawy">Wyst.</th>
            <th title="Obrony, free balle i błędy obrony">Obr.</th>
            <th title="Bloki punktowe + dotknięcia bloku">Blok</th>
            <th>Błędy</th><th>Sygnał</th>
          </tr></thead>
          <tbody>
            ${rows.map(row=>renderLiveStatsRow(row.player,row.stats,row.active)).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  }

  function statRecord(stats,p){
    const s=stats?.[p.id]||{};
    return {
      pts:s.pts||0,
      aces:s.aces||0,
      blocks:s.blocks||0,
      att:s.att||0,
      kills:s.kills||0,
      errors:s.errors||0,
      digs:s.digs||0,
      recv:s.recv||0,
      sets:s.sets||0,
      serves:s.serves||0,
      serveErrors:s.serveErrors||0,
      attackErrors:s.attackErrors||0,
      attackBlocked:s.attackBlocked||0,
      blockOuts:s.blockOuts||0,
      receptionErrors:s.receptionErrors||0,
      receptionPerfect:s.receptionPerfect||0,
      receptionPositive:s.receptionPositive||0,
      receptionPoor:s.receptionPoor||0,
      receptionOverpass:s.receptionOverpass||0,
      setErrors:s.setErrors||0,
      setGood:s.setGood||0,
      setPoor:s.setPoor||0,
      netErrors:s.netErrors||0,
      ballErrors:s.ballErrors||0,
      defenseErrors:s.defenseErrors||0,
      freeBalls:s.freeBalls||0,
      blockTouches:s.blockTouches||0,
      controlledBlocks:s.controlledBlocks||0
    };
  }

  function statActivity(s){
    return (s.pts||0)+(s.att||0)+(s.recv||0)+(s.digs||0)+(s.sets||0)+(s.serves||0)+(s.blocks||0)+(s.errors||0);
  }

  function statRatioLabel(num,den){
    return den?`${num}/${den} · ${Math.round(num/den*100)}%`:'-';
  }

  function plusMinus(s){
    return (s.pts||0)-(s.errors||0);
  }

  function signedNumber(n){
    return n>0?`+${n}`:String(n);
  }

  function liveStatUrgency(p,s){
    let score=0;
    if(s.errors>=3) score+=4;
    if(s.attackErrors>=2) score+=3;
    if(s.receptionErrors>=2) score+=3;
    if(s.serveErrors>=2) score+=1;
    if((p.pos==='OH'||p.pos==='OP')&&s.att>=4&&s.kills/s.att<.25) score+=4;
    if((p.pos==='OH'||p.pos==='L')&&s.recv>=3&&s.receptionErrors/Math.max(1,s.recv)>.34) score+=4;
    if(p.pos==='S'&&s.setErrors>=1) score+=3;
    score-=Math.min(3,s.pts);
    return score;
  }

  function liveStatSignal(p,s){
    const activity=statActivity(s);
    if(!activity) return {level:'neutral',text:'bez akcji'};
    if((p.pos==='OH'||p.pos==='L')&&s.recv>=3&&s.receptionErrors/Math.max(1,s.recv)>.34) return {level:'bad',text:'przyjęcie'};
    if((p.pos==='OH'||p.pos==='OP')&&s.att>=4&&s.kills/s.att<.25) return {level:'bad',text:'atak'};
    if(p.pos==='S'&&s.setErrors>=1) return {level:'warn',text:'wystawa'};
    if(s.errors>=3) return {level:'bad',text:'błędy'};
    if(s.attackErrors>=2) return {level:'warn',text:'atak'};
    if(s.serveErrors>=2) return {level:'warn',text:'serwis'};
    if(activity<4) return {level:'neutral',text:'mało danych'};
    if(s.pts>=4&&s.errors<=1) return {level:'good',text:'forma'};
    return {level:'ok',text:'stabilnie'};
  }

  function renderLiveStatsRow(p,s,active){
    const signal=liveStatSignal(p,s);
    const attackErrors=s.attackErrors+s.attackBlocked;
    const serve=s.serves?`${s.aces}/${s.serveErrors}/${s.serves}`:(s.aces?`${s.aces}/0/0`:'-');
    const reception=s.recv?`++${s.receptionPerfect} +${s.receptionPositive} -${s.receptionPoor} bł.${s.receptionErrors}`:'-';
    const setting=s.sets?`${s.setGood}/${s.setPoor}/${s.setErrors}/${s.sets}`:'-';
    const defense=s.digs||s.freeBalls||s.defenseErrors?`${s.digs}${s.freeBalls?` · FB ${s.freeBalls}`:''}${s.defenseErrors?` · bł. ${s.defenseErrors}`:''}`:'-';
    const block=s.blocks||s.blockTouches?`${s.blocks}${s.blockTouches?`+${s.blockTouches}`:''}${s.controlledBlocks?` · k${s.controlledBlocks}`:''}`:'-';
    const pm=plusMinus(s);
    return `<tr class="${active?'':'bench-row'}">
      <td><span class="pos">${esc(p.pos)}</span></td>
      <td>${esc(p.name)}</td>
      <td><span class="pill">${active?'boisko':'poza'}</span></td>
      <td><strong>${s.pts}</strong></td>
      <td><span class="${pm<0?'bad':pm>0?'good':''}">${signedNumber(pm)}</span></td>
      <td>${statRatioLabel(s.kills,s.att)}</td>
      <td>${attackErrors?`${s.attackErrors}/${s.attackBlocked}`:'-'}</td>
      <td>${serve}</td>
      <td>${reception}</td>
      <td>${setting}</td>
      <td>${defense}</td>
      <td>${block}</td>
      <td>${s.errors||'-'}</td>
      <td><span class="signal ${signal.level}">${esc(signal.text)}</span></td>
    </tr>`;
  }

  function renderChallengeDecision(live,userCanDecide=true){
    const pending=live.pendingChallenge;
    if(!pending) return '';
    const challenge=pending.challenge;
    const t=liveTeam(live,challenge.challenger);
    const misses=live.challengeMisses?.[challenge.challenger]||0;
    const hint=userCanDecide?challenge.staffHint:null;
    return `<div class="challenge-panel">
      <div>
        <div class="eyebrow">Potencjalna sytuacja sporna</div>
        <strong>${userCanDecide?'Twój sztab może poprosić o challenge':`${esc(t.short)} analizuje challenge`}: ${esc(challenge.label)}</strong>
        ${hint?`<div class="staff-hint ${hint.recommends?'take':'skip'}">
          <b>Sztab: ${esc(hint.text)}</b>
          <small>Wiarygodność podpowiedzi: ${esc(hint.confidence)} · czytanie challenge ${Math.round(hint.rating)}/50</small>
        </div>`:''}
        <span>Nieudane challenge w tym secie: ${misses}/2</span>
      </div>
      ${userCanDecide?`<div class="challenge-actions">
        <button class="btn primary" data-live-challenge="take">Weź challenge</button>
        <button class="btn" data-live-challenge="skip">Nie bierz challenge</button>
      </div>`:`<div class="challenge-actions"><span class="pill">Decyzja rywala automatyczna</span></div>`}
    </div>`;
  }

  function displayLiveState(live){
    if(liveRevealIndex(live)>=live.log.length){
      return {homeSets:live.homeSets,awaySets:live.awaySets,setNo:live.setNo,score:{...live.score}};
    }
    const display={homeSets:0,awaySets:0,setNo:1,score:{home:0,away:0}};
    visibleLiveLog(live).forEach(line=>{
      const text=stripHtml(line);
      let m=text.match(/^Start seta\s+(\d+)/);
      if(m){
        display.setNo=Number(m[1]);
        display.score={home:0,away:0};
        return;
      }
      m=text.match(/WYNIK\s+\S+\s+(\d+):(\d+)\s+\S+/);
      if(m){
        display.score={home:Number(m[1]),away:Number(m[2])};
        return;
      }
      m=text.match(/^Koniec seta\s+(\d+):\s+\S+\s+(\d+):(\d+)\s+\S+/);
      if(m){
        const hp=Number(m[2]);
        const ap=Number(m[3]);
        display.score={home:hp,away:ap};
        if(hp>ap) display.homeSets++;
        else display.awaySets++;
      }
    });
    return display;
  }

  function stripHtml(html){
    return String(html||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  }

  function scoreFromLine(line){
    const text=stripHtml(line);
    const m=text.match(/WYNIK\s+\S+\s+(\d+:\d+)\s+\S+/);
    return m?m[1]:'';
  }

  function logRows(log){
    const rows=[];
    let current=[];
    (log||[]).forEach(line=>{
      if(String(line).includes('WYNIK')){
        rows.push({type:'rally',items:current.slice(),score:scoreFromLine(line)});
        current=[];
        return;
      }
      const text=stripHtml(line);
      const system=/^(Start seta|Koniec seta|Koniec meczu|Zmiana|Czas dla)/.test(text);
      if(system){
        if(current.length){
          rows.push({type:'system',items:current.slice(),score:''});
          current=[];
        }
        rows.push({type:'system',items:[line],score:''});
        return;
      }
      current.push(line);
    });
    if(current.length) rows.push({type:'rally',items:current,score:''});
    return rows;
  }

  function logRowCount(log){
    return (log||[]).reduce((count,line)=>count+(String(line).includes('WYNIK')?1:0),0);
  }

  function recentLogRows(log,limit=80){
    const rows=[];
    const lines=log||[];
    let current=[];
    let pendingScore='';
    const pushRally=()=>{
      if(!current.length&&!pendingScore) return;
      rows.push({type:'rally',items:current.reverse(),score:pendingScore});
      current=[];
      pendingScore='';
    };
    for(let i=lines.length-1;i>=0&&rows.length<limit;i--){
      const line=lines[i];
      if(String(line).includes('WYNIK')){
        pushRally();
        pendingScore=scoreFromLine(line);
        continue;
      }
      const text=stripHtml(line);
      const system=/^(Start seta|Koniec seta|Koniec meczu|Zmiana|Czas dla)/.test(text);
      if(system){
        pushRally();
        rows.push({type:'system',items:[line],score:''});
        continue;
      }
      current.push(line);
    }
    if(rows.length<limit) pushRally();
    return rows.slice(0,limit);
  }

  function renderLogRows(log,limit=80){
    const rows=recentLogRows(log,limit);
    if(!rows.length) return '<ul class="rally-log"><li class="rally-row system">Czekamy na pierwszą akcję.</li></ul>';
    return `<ul class="rally-log live-log">${rows.map(row=>{
      if(row.type==='system'){
        return `<li class="rally-row system"><div class="rally-flow">${row.items.map(x=>`<span class="rally-step">${x}</span>`).join('')}</div></li>`;
      }
      return `<li class="rally-row">
        <div class="rally-flow">${row.items.map(x=>`<span class="rally-step">${x}</span>`).join('')}</div>
        <div class="rally-score">${esc(row.score)}</div>
      </li>`;
    }).join('')}</ul>`;
  }

  function liveScoreClub(t,sets,points,selected){
    return `<div class="live-club ${selected?'selected':''}">
      <div class="crest">${esc(t.short)}</div>
      <div>
        <strong>${esc(t.name)}</strong>
        <span>${sets} sety · ${points} pkt w secie</span>
      </div>
    </div>`;
  }

  function lastSummary(r){
    const h=team(r.home),a=team(r.away);
    return `
      <div class="team-title">
        <div class="crest">${esc(h.short)}</div>
        <div><strong>${esc(h.name)} ${r.score.home}:${r.score.away} ${esc(a.name)}</strong><div class="note">${r.sets.map(s=>`${s.home}:${s.away}`).join(', ')}</div></div>
      </div>`;
  }

  function renderDatabase(){
    setTitle('Baza demo');
    const leagues=state.leagues.map(l=>({l,teams:l.teams.map(id=>team(id))}));
    $('view').innerHTML=`
      <section class="card">
        <div class="card-head"><span>Zakres danych</span><span>${DATA.teams.length} klubów · ${DATA.teams.reduce((s,t)=>s+t.players.length,0)} zawodników</span></div>
        <div class="card-body">
          <p class="note">To jest seed demo: realne nazwy klubów i nazwiska, atrybuty wygenerowane proceduralnie. PLS 1. Liga zawiera realne kluby oraz pulę realnych nazwisk z publicznych list/rankingów, ale wymaga późniejszego czyszczenia do pełnej oficjalnej bazy.</p>
        </div>
      </section>
      <div class="grid two-col" style="margin-top:14px">
        ${leagues.map(({l,teams})=>`
          <section class="card">
            <div class="card-head"><span>${esc(l.name)}</span><span>${teams.length} klubów</span></div>
            <div class="table-wrap"><table><thead><tr><th>Klub</th><th>Miasto</th><th>Trener</th><th>Zaw.</th><th>OVR</th></tr></thead><tbody>
              ${teams.map(t=>`<tr class="${t.id===state.selectedTeam?'highlight':''}"><td>${esc(t.name)}</td><td>${esc(t.city)}</td><td>${esc(t.coach)}</td><td>${t.players.length}</td><td>${E.teamOverall(t)}</td></tr>`).join('')}
            </tbody></table></div>
          </section>
        `).join('')}
      </div>`;
  }

  init();
})();
