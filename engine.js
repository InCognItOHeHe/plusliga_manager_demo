(function(){
  const DATA = window.VM_DATA;
  const DISPLAY_SKILL_KEYS = new Set((DATA.SKILLS||[]).map(([key])=>key));

  function clone(v){return JSON.parse(JSON.stringify(v));}
  function rnd(a,b){return Math.floor(Math.random()*(b-a+1))+a;}
  function rand(a,b){return a+Math.random()*(b-a);}
  function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
  function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
  function weighted(list,key){
    if(!list.length) return null;
    const sum=list.reduce((s,x)=>s+Math.max(1,typeof key==='function'?key(x):x[key]||1),0);
    let r=Math.random()*sum;
    for(const x of list){
      r-=Math.max(1,typeof key==='function'?key(x):x[key]||1);
      if(r<=0) return x;
    }
    return list[list.length-1];
  }

  function skill(p,key,fallback=50){
    if(!p) return typeof fallback==='number'?fallback:50;
    let value;
    let sourceKey=key;
    if(typeof p[key]==='number'){
      value=p[key];
    }else if(typeof fallback==='string'&&typeof p[fallback]==='number'){
      value=p[fallback];
      sourceKey=fallback;
    }else{
      return typeof fallback==='number'?fallback:50;
    }
    return DISPLAY_SKILL_KEYS.has(sourceKey)&&value<=50?value*2:value;
  }
  function formValue(p){
    if(!p||typeof p.form!=='number') return 5.5;
    return clamp(p.form>10?p.form/10:p.form,1,10);
  }
  function setForm(p,value){
    if(!p) return;
    p.form=Math.round(clamp(value,1,10)*10)/10;
  }
  function formBonus(p){
    return (formValue(p)-5.5)*1.35;
  }
  function matchOverall(p){
    return clamp(Math.round((p?.overall||50)+(formValue(p)-5.5)*2.1),1,100);
  }
  function serveSkill(p){
    return Math.round(skill(p,'serve',50)*.62+skill(p,'servePower','serve')*.38+formBonus(p));
  }
  function receiveSkill(p){
    return skill(p,'reception','receive')+formBonus(p);
  }
  function setterSkill(p){
    return Math.round(skill(p,'setting','set')*.45+skill(p,'setQuality','set')*.55+formBonus(p));
  }
  function attackSkill(p,kind='skrzydło'){
    if(kind==='środek') return Math.round(skill(p,'attackMiddle','attack')*.72+skill(p,'blockAvoid','attack')*.18+skill(p,'tip','attack')*.10+formBonus(p));
    if(kind==='pipe') return Math.round(skill(p,'attackBackRow','attack')*.72+skill(p,'blockAvoid','attack')*.18+skill(p,'blockOut','attack')*.10+formBonus(p));
    if(kind==='kiwka') return Math.round(skill(p,'tip','attack')*.70+skill(p,'blockAvoid','attack')*.20+skill(p,'setting','set')*.10+formBonus(p));
    return Math.round(skill(p,'attackWing','attack')*.62+skill(p,'blockAvoid','attack')*.18+skill(p,'blockOut','attack')*.20+formBonus(p));
  }
  function blockSkill(p){
    return Math.round(skill(p,'block',50)*.68+skill(p,'blockPositioning','block')*.32+formBonus(p));
  }
  function defenseSkill(p){
    return Math.round(skill(p,'defense',50)*.72+skill(p,'cover','defense')*.28+formBonus(p));
  }
  function score50(value){
    return clamp(value/2,1,50);
  }
  function serve50(p){return score50(serveSkill(p));}
  function power50(p){return score50(skill(p,'servePower','serve'));}
  function receive50(p){return score50(receiveSkill(p));}
  function setter50(p){return score50(setterSkill(p));}
  function attack50(p,kind='wing'){
    const mapped=kind==='mid'?'środek':kind==='pipe'?'pipe':kind==='tip'?'kiwka':'skrzydło';
    return score50(attackSkill(p,mapped));
  }
  function block50(p){return score50(blockSkill(p));}
  function defense50(p){return score50(defenseSkill(p));}
  function roll50(value,pressure=0){
    return clamp(value+rnd(-12,12)-pressure,1,60);
  }
  function teamForm(ctx,team){
    let value=ctx.teamForm?.[team.id]||0;
    if(ctx.currentScore&&typeof ctx.currentScore[team.id]==='number'){
      const own=ctx.currentScore[team.id];
      const opp=Object.keys(ctx.currentScore).filter(id=>id!==team.id).reduce((sum,id)=>sum+ctx.currentScore[id],0);
      const diff=own-opp;
      if(diff<=-8) value+=2;
      else if(diff<=-5) value+=1;
      else if(diff>=8) value-=2;
      else if(diff>=5) value-=1;
    }
    return value;
  }
  function attackLabel(kind){
    return {mid:'środek',pipe:'2. linia',tip:'kiwka',wing:'skrzydło',free:'free ball'}[kind]||'atak';
  }
  function setLabel(kind){
    return {mid:'środek',pipe:'2. linię',tip:'kiwkę',wing:'skrzydło',free:'free ball'}[kind]||'atak';
  }
  function html(v){
    return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function codeTag(code){
    return {
      SER:tag('ser','SER'),
      PS:tag('rec','PRZ'),
      WYS:tag('set','WYS'),
      AK:tag('att','AK'),
      BL:tag('blk','BL'),
      OB:tag('dig','OBR'),
      FB:tag('dig','FB'),
      SP:tag('ch','SPÓR'),
      CH:tag('ch','CH'),
      PKT:tag('pt','PKT')
    }[code]||tag('pt',code);
  }
  function action(log,code,team,player,extra=''){
    const who=player?name(player):`<strong class="step-player">${html(team.short)}</strong>`;
    log.push(`<span class="event-line">${codeTag(code)}<span class="step-team">${html(team.short)}</span>${who}${extra?`<span class="step-extra">${html(extra)}</span>`:''}</span>`);
  }
  function reasonType(reason){
    if(['kill','attackOutLine','attackOutCross','serveOut','serveAce'].includes(reason)) return 'line';
    if(['blockOut','blockTouch','controlledBlock'].includes(reason)) return 'touch';
    if(reason==='netTouch') return 'net';
    if(reason==='footFault') return 'foot';
    return null;
  }
  function challengeLabel(type){
    return {line:'linia',touch:'touch bloku',net:'siatka',foot:'linia serwisu'}[type]||'sytuacja sporna';
  }
  function challengeSuccessChance(type,event){
    const base={line:.12,touch:.16,net:.10,foot:.18}[type]||.12;
    return clamp(base+(event.veryClose?.06:0),.04,.32);
  }
  function challengeStaffRating(team){
    if(typeof team.staff?.challengeRead==='number') return clamp(team.staff.challengeRead,1,50);
    return clamp(Math.round(25+(team.rep||5)*2.1+(team.league==='plusliga'?4:0)),1,50);
  }
  function challengeStaffAccuracy(team){
    const rating=challengeStaffRating(team);
    return clamp(.52+(rating-20)*.0105,.52,.84);
  }
  function challengeStaffHint(team,willOverturn){
    const accuracy=challengeStaffAccuracy(team);
    const correct=Math.random()<accuracy;
    const recommends=correct?willOverturn:!willOverturn;
    const confidence=accuracy>=.76?'wysoka':accuracy>=.64?'średnia':'niska';
    return {
      rating:challengeStaffRating(team),
      accuracy,
      recommends,
      confidence,
      text:recommends?'warto brać challenge':'raczej odpuścić'
    };
  }
  function maybeChallengeOpportunity(event,challengingTeam,pointTeam,ctx){
    const type=reasonType(event.reason);
    if(!type) return null;
    if(!ctx.challengeMisses) ctx.challengeMisses={};
    if((ctx.challengeMisses[challengingTeam.id]||0)>=2) return null;
    const close=event.nearLine||type!=='line';
    if(!close) return null;
    const opportunityChance={line:.045,touch:.050,net:.015,foot:.035}[type]||.025;
    if(Math.random()>=opportunityChance) return null;
    const successChance=challengeSuccessChance(type,event);
    const willOverturn=Math.random()<successChance;
    return {
      challenger:challengingTeam.id,
      originalPoint:pointTeam.id,
      reason:event.reason,
      type,
      label:challengeLabel(type),
      successChance,
      willOverturn,
      staffHint:challengeStaffHint(challengingTeam,willOverturn),
      summary:event.summary||'punkt'
    };
  }
  function recordRally(ctx,log,reason){
    if(!ctx.eventStats) ctx.eventStats={rallies:0,long:0,challenges:0,overturned:0,reasons:{}};
    ctx.eventStats.rallies++;
    if(log.length>=8) ctx.eventStats.long++;
    ctx.eventStats.reasons[reason]=(ctx.eventStats.reasons[reason]||0)+1;
  }
  function finishRally(log,pointTeam,otherTeam,ctx,event){
    const challenge=maybeChallengeOpportunity(event,otherTeam,pointTeam,ctx);
    if(challenge){
      action(log,'SP',otherTeam,null,`potencjalna sytuacja sporna: ${challenge.label}`);
      recordRally(ctx,log,event.reason);
      return {point:pointTeam.id,log,kind:event.reason,challenge};
    }
    action(log,'PKT',pointTeam,null,event.summary||'punkt');
    recordRally(ctx,log,event.reason);
    return {point:pointTeam.id,log,kind:event.reason,challenge:null};
  }

  function autoChallengeDecision(ctx,challenge){
    if(!challenge) return false;
    const misses=ctx.challengeMisses?.[challenge.challenger]||0;
    if(misses>=2) return false;
    const hint=challenge.staffHint;
    return hint?.recommends?Math.random()<.88:Math.random()<.08;
  }

  function teamOverall(team){
    const lineup=activePlayers(team);
    const vals=lineup.map(p=>matchOverall(p));
    return Math.round(vals.reduce((a,b)=>a+b,0)/Math.max(1,vals.length));
  }

  function selectLineup(team){
    const byPos=pos=>team.players.filter(p=>p.pos===pos).sort((a,b)=>matchOverall(b)-matchOverall(a)||b.overall-a.overall);
    const lineup=[
      byPos('S')[0],
      byPos('OP')[0],
      byPos('OH')[0],
      byPos('OH')[1],
      byPos('MB')[0],
      byPos('MB')[1],
      byPos('L')[0]
    ].filter(Boolean);
    team.players
      .filter(p=>!lineup.includes(p))
      .sort((a,b)=>matchOverall(b)-matchOverall(a)||b.overall-a.overall)
      .forEach(p=>{if(lineup.length<7) lineup.push(p);});
    return lineup;
  }

  function activePlayers(team){
    if(team.useActiveLineup&&Array.isArray(team.activeLineupIds)){
      const picked=team.activeLineupIds.map(id=>team.players.find(p=>p.id===id)).filter(Boolean);
      const unique=uniquePlayers(picked);
      if(unique.length>=6) return unique;
    }
    return selectLineup(team);
  }

  function uniquePlayers(players){
    const seen=new Set();
    return players.filter(p=>{
      if(!p||seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }

  function initialRotation(team){
    const active=activePlayers(team);
    const byPos=pos=>active.filter(p=>p.pos===pos).sort((a,b)=>matchOverall(b)-matchOverall(a)||b.overall-a.overall);
    const picked=[
      byPos('S')[0],
      byPos('OH')[0],
      byPos('MB')[0],
      byPos('OP')[0],
      byPos('OH')[1],
      byPos('MB')[1]
    ];
    const used=new Set(picked.filter(Boolean).map(p=>p.id));
    const fillers=active
      .filter(p=>p.pos!=='L'&&!used.has(p.id))
      .sort((a,b)=>matchOverall(b)-matchOverall(a)||b.overall-a.overall);
    for(let i=0;i<picked.length;i++){
      if(!picked[i]){
        const next=fillers.shift();
        if(next){
          picked[i]=next;
          used.add(next.id);
        }
      }
    }
    return picked.filter(Boolean).slice(0,6).map(p=>p.id);
  }

  function ensureRotation(ctx,team){
    if(!ctx) return initialRotation(team);
    ctx.rotations=ctx.rotations||{};
    const current=ctx.rotations[team.id];
    const valid=Array.isArray(current)&&current.length>=6&&current.every(id=>team.players.some(p=>p.id===id));
    if(!valid) ctx.rotations[team.id]=initialRotation(team);
    return ctx.rotations[team.id];
  }

  function resetTeamRotation(ctx,team){
    ctx.rotations=ctx.rotations||{};
    ctx.rotations[team.id]=initialRotation(team);
  }

  function rotateTeam(ctx,team){
    const ids=ensureRotation(ctx,team).slice(0,6);
    if(ids.length<6) return;
    ctx.rotations[team.id]=[ids[1],ids[2],ids[3],ids[4],ids[5],ids[0]];
  }

  function courtState(team,ctx){
    const l=activePlayers(team);
    const ids=ensureRotation(ctx,team).slice(0,6);
    const line=ids.map(id=>team.players.find(p=>p.id===id)).filter(Boolean);
    const libero=l.find(p=>p.pos==='L')||weighted(l,defenseSkill);
    const front=[line[1],line[2],line[3]].filter(Boolean);
    const backRaw=[line[0],line[4],line[5]].filter(Boolean);
    const back=backRaw.map(p=>p.pos==='MB'&&libero?libero:p);
    const frontWing=front.filter(p=>p.pos==='OH'||p.pos==='OP');
    const frontMiddle=front.filter(p=>p.pos==='MB');
    const backAttackers=backRaw.filter(p=>p.pos==='OH'||p.pos==='OP');
    const passers=uniquePlayers([
      libero,
      ...back.filter(p=>p.pos==='L'||p.pos==='OH'||p.pos==='OP'),
      ...front.filter(p=>p.pos==='OH')
    ]);
    const diggers=uniquePlayers([
      libero,
      ...back.filter(p=>p.pos==='L'||p.pos==='OH'||p.pos==='OP'),
      ...front.filter(p=>p.pos==='OH'||p.pos==='OP')
    ]);
    const blockers=front.filter(p=>p.pos==='MB'||p.pos==='OH'||p.pos==='OP');
    return {
      setter:l.find(p=>p.pos==='S')||weighted(l,setterSkill),
      libero:l.find(p=>p.pos==='L')||weighted(l,defenseSkill),
      opposite:l.find(p=>p.pos==='OP')||weighted(l,p=>attackSkill(p,'skrzydło')),
      outside:l.filter(p=>p.pos==='OH'),
      middle:l.filter(p=>p.pos==='MB'),
      all:l,
      line,
      server:line[0]||weighted(l.filter(p=>p.pos!=='L'),serve50)||weighted(l,serve50),
      front,
      back,
      backRaw,
      frontWing,
      frontMiddle,
      backAttackers,
      passers,
      diggers,
      blockers
    };
  }

  function starters(team,ctx){
    return courtState(team,ctx);
  }

  function attackOptions(court,setQuality){
    const opts=[];
    court.frontWing.forEach(p=>{
      opts.push({kind:'wing',hitter:p,weight:attack50(p,'wing')*(setQuality<25?.70:1.00)});
      opts.push({kind:'tip',hitter:p,weight:attack50(p,'tip')*(setQuality<30?.18:.08)});
    });
    court.frontMiddle.forEach(p=>{
      if(setQuality>31) opts.push({kind:'mid',hitter:p,weight:attack50(p,'mid')*(setQuality>42?1.25:setQuality>36?.78:.34)});
      opts.push({kind:'tip',hitter:p,weight:attack50(p,'tip')*(setQuality>35?.10:.18)});
    });
    court.backAttackers.forEach(p=>{
      if(setQuality>24) opts.push({kind:'pipe',hitter:p,weight:attack50(p,'pipe')*(setQuality>39?.58:setQuality>30?.34:.16)});
    });
    return opts.filter(o=>o.hitter&&o.weight>0);
  }

  function chooseAttack(court,setQuality){
    const options=attackOptions(court,setQuality);
    if(options.length) return weighted(options,o=>o.weight);
    const fallback=weighted([...court.frontWing,...court.backAttackers],p=>attack50(p,'wing'))||weighted(court.all,p=>attack50(p,'wing'));
    if(!fallback) return null;
    return {kind:fallback.pos==='MB'?'mid':'wing',hitter:fallback,weight:1};
  }

  function chooseOverpassAttack(court){
    const opts=[
      ...court.frontWing.map(p=>({kind:'wing',hitter:p,weight:attack50(p,'wing')})),
      ...court.frontMiddle.map(p=>({kind:'mid',hitter:p,weight:attack50(p,'mid')*1.15}))
    ];
    return weighted(opts.length?opts:attackOptions(court,42),o=>o.weight);
  }

  function generateSchedule(teamIds,leagueId='league'){
    let arr=[...teamIds];
    if(arr.length%2) arr.push(null);
    const rounds=[];
    const n=arr.length;
    for(let r=0;r<n-1;r++){
      const matches=[];
      for(let i=0;i<n/2;i++){
        const a=arr[i],b=arr[n-1-i];
        if(a&&b){
          const flip=(r+i)%2===1;
          matches.push({id:`${leagueId}_r${r+1}m${i+1}`,round:r+1,home:flip?b:a,away:flip?a:b,played:false,result:null});
        }
      }
      rounds.push(matches);
      arr=[arr[0],arr[n-1],...arr.slice(1,n-1)];
    }
    return rounds.flat();
  }

  function emptyStanding(teamId){
    return {teamId,played:0,w:0,l:0,points:0,setsFor:0,setsAgainst:0,pointsFor:0,pointsAgainst:0};
  }

  function createInitialState(){
    const teams=clone(DATA.teams);
    const teamMap=Object.fromEntries(teams.map(t=>[t.id,t]));
    const leagues=DATA.leagues.map(l=>{
      const schedule=generateSchedule(l.teams,l.id);
      const standings=Object.fromEntries(l.teams.map(id=>[id,emptyStanding(id)]));
      return {...l,schedule,standings,currentRound:1};
    });
    return {
      season:DATA.leagues[0].season,
      teamMap,
      leagues,
      selectedLeague:DATA.leagues[0].id,
      selectedTeam:DATA.leagues[0].teams[0],
      careerStarted:false,
      lastMatch:null,
      news:[
        {type:'start',text:'Rozpoczęto demo sezonu. Zarząd oczekuje stabilizacji składu, awansu w tabeli i rozwoju młodszych zawodników.'}
      ]
    };
  }

  function leagueState(state,leagueId=state.selectedLeague){return state.leagues.find(l=>l.id===leagueId);}
  function team(state,id){return state.teamMap[id];}
  function getCurrentRoundMatches(state,leagueId=state.selectedLeague){
    const l=leagueState(state,leagueId);
    const unplayed=l.schedule.filter(m=>!m.played);
    if(!unplayed.length) return [];
    const round=Math.min(...unplayed.map(m=>m.round));
    return l.schedule.filter(m=>m.round===round);
  }
  function nextMatchForTeam(state,teamId=state.selectedTeam){
    const l=leagueState(state,state.teamMap[teamId].league);
    return l.schedule.find(m=>!m.played&&(m.home===teamId||m.away===teamId))||null;
  }

  function tag(cls,txt){return `<span class="tag ${cls}">${txt}</span>`;}
  function name(p){return `<strong class="step-player">${html(p.name)}</strong>`;}

  function emptyPlayerStats(p){
    return {
      playerId:p.id,
      teamId:p.teamId,
      pts:0,
      aces:0,
      blocks:0,
      att:0,
      kills:0,
      errors:0,
      digs:0,
      recv:0,
      sets:0,
      serves:0,
      serveErrors:0,
      attackErrors:0,
      attackBlocked:0,
      blockOuts:0,
      receptionErrors:0,
      receptionPerfect:0,
      receptionPositive:0,
      receptionPoor:0,
      receptionOverpass:0,
      setErrors:0,
      setGood:0,
      setPoor:0,
      netErrors:0,
      ballErrors:0,
      defenseErrors:0,
      freeBalls:0,
      blockTouches:0,
      controlledBlocks:0
    };
  }

  function addPlayerStat(stats,p,key,amount=1){
    if(!stats[p.id]) stats[p.id]=emptyPlayerStats(p);
    stats[p.id][key]=(stats[p.id][key]||0)+amount;
  }

  function playerStat(stats,p,key,amount=1){
    if(!p||!stats) return;
    addPlayerStat(stats,p,key,amount);
    if(stats.__setStats&&stats.__setStats!==stats) addPlayerStat(stats.__setStats,p,key,amount);
  }

  function linkSetStats(ctx){
    if(!ctx.stats||!ctx.setStats) return;
    Object.defineProperty(ctx.stats,'__setStats',{
      value:ctx.setStats,
      configurable:true
    });
  }

  function prepareTeamPlayers(team){
    team.players.forEach(p=>p.teamId=team.id);
  }

  function simulateRally(serving,receiving,ctx){
    ctx.stats=ctx.stats||{};
    linkSetStats(ctx);
    ctx.eventStats=ctx.eventStats||{rallies:0,long:0,challenges:0,overturned:0,reasons:{}};
    const s=starters(serving,ctx);
    const r=starters(receiving,ctx);
    const log=[];
    const server=s.server||weighted(s.all.filter(p=>p.pos!=='L'),serve50)||weighted(s.all,serve50);
    const serveScore=serve50(server)+teamForm(ctx,serving);
    const servePower=power50(server)+teamForm(ctx,serving)*.5;
    const serveSpeed=clamp(rand(42,58)+servePower*.9,50,108);
    const serveKind=servePower>43&&Math.random()<.58?'jump':'float';
    action(log,'SER',serving,server,`${serveSpeed.toFixed(1)} km/h ${serveKind}`);
    playerStat(ctx.stats,server,'serves');

    const serveRisk=clamp((serveSpeed-75)/34,0,1);
    const footFaultChance=serveKind==='jump'?0.010+serveRisk*.010:0.004;
    if(Math.random()<footFaultChance){
      playerStat(ctx.stats,server,'errors');
      playerStat(ctx.stats,server,'serveErrors');
      return finishRally(log,receiving,serving,ctx,{reason:'footFault',nearLine:true,veryClose:true,summary:`${server.name} przekracza linię przy serwisie.`});
    }
    const serveFaultChance=clamp(.025+serveRisk*.045-(serveScore-35)*.0015,.012,.075);
    if(Math.random()<serveFaultChance){
      const netFault=Math.random()<(.48+serveRisk*.16);
      playerStat(ctx.stats,server,'errors');
      playerStat(ctx.stats,server,'serveErrors');
      return finishRally(log,receiving,serving,ctx,{
        reason:netFault?'serveNet':'serveOut',
        nearLine:!netFault&&Math.random()<.32,
        veryClose:!netFault&&Math.random()<.14,
        summary:netFault?`${server.name} trafia serwisem w siatkę.`:`${server.name} serwuje w aut.`
      });
    }

    const passers=r.passers.length?r.passers:[r.libero,...r.outside,r.opposite].filter(Boolean);
    if(!passers.length){
      playerStat(ctx.stats,server,'aces');
      playerStat(ctx.stats,server,'pts');
      return finishRally(log,serving,receiving,ctx,{reason:'serveAce',nearLine:false,summary:`${receiving.short} nie ma przyjmujących w ustawieniu.`});
    }
    const receiveStrength=passers.reduce((sum,p)=>sum+receive50(p)+(p.pos==='L'?4:0),0)/Math.max(1,passers.length)+teamForm(ctx,receiving);
    const aceChance=clamp(.018+serveRisk*.055+(serveScore-receiveStrength)*.003,.006,.115);
    if(Math.random()<aceChance){
      playerStat(ctx.stats,server,'aces');
      playerStat(ctx.stats,server,'pts');
      return finishRally(log,serving,receiving,ctx,{
        reason:'serveAce',
        nearLine:Math.random()<.24,
        veryClose:Math.random()<.08,
        summary:`${server.name} posyła asa serwisowego.`
      });
    }

    const passTarget=weighted(passers,p=>receive50(p)+(p.pos==='L'?8:0));
    const passQuality=roll50(receive50(passTarget)+teamForm(ctx,receiving),serveSpeed>91?8:3);
    playerStat(ctx.stats,passTarget,'recv');
    if(passQuality>43) playerStat(ctx.stats,passTarget,'receptionPerfect');
    else if(passQuality>30) playerStat(ctx.stats,passTarget,'receptionPositive');
    else playerStat(ctx.stats,passTarget,'receptionPoor');
    const passWord=passQuality>43?'perfekcyjnie':passQuality>30?'pozytywnie':passQuality>22?'odrzucone':'ratunkowo';
    action(log,'PS',receiving,passTarget,passWord);
    if(passQuality<21&&Math.random()<.58){
      playerStat(ctx.stats,server,'aces');
      playerStat(ctx.stats,server,'pts');
      playerStat(ctx.stats,passTarget,'errors');
      playerStat(ctx.stats,passTarget,'receptionErrors');
      return finishRally(log,serving,receiving,ctx,{reason:'serveAce',nearLine:Math.random()<.18,summary:`${server.name} zdobywa punkt serwisem po błędzie przyjęcia.`});
    }

    let attacking=receiving;
    let defending=serving;
    let quality=passQuality;
    if(passQuality<32&&Math.random()<.34){
      playerStat(ctx.stats,passTarget,'receptionOverpass');
      const overChoice=chooseOverpassAttack(s);
      const overHitter=overChoice?.hitter||weighted(s.front,p=>attack50(p,'wing'))||weighted(s.all,p=>attack50(p,'wing'));
      const overKind=overChoice?.kind||'wing';
      const overAttack=attack50(overHitter,overKind)+teamForm(ctx,serving);
      const overSpeed=clamp(rand(42,58)+overAttack*.55,45,94);
      action(log,'AK',serving,overHitter,`${overSpeed.toFixed(1)} km/h ${attackLabel(overKind)} z przechodzącej`);
      if(Math.random()<clamp(.58+(overAttack-receive50(passTarget))*.006,.28,.80)){
        playerStat(ctx.stats,overHitter,'att');
        playerStat(ctx.stats,overHitter,'kills');
        playerStat(ctx.stats,overHitter,'pts');
        return finishRally(log,serving,receiving,ctx,{reason:'kill',nearLine:Math.random()<.22,summary:`${overHitter.name} karci przechodzącą piłkę po przyjęciu.`});
      }
      playerStat(ctx.stats,passTarget,'digs');
      action(log,'OB',receiving,passTarget,'ratunkowo po przechodzącej');
      quality=roll50(defense50(passTarget)+teamForm(ctx,receiving),6);
    }

    const maxSwings=rnd(1,6);
    for(let swing=0;swing<maxSwings;swing++){
      const atk=starters(attacking,ctx);
      const def=starters(defending,ctx);
      const setter=atk.setter||weighted(atk.all,setter50);
      playerStat(ctx.stats,setter,'sets');
      const setQuality=roll50(setter50(setter)+teamForm(ctx,attacking),quality<30?9:quality>43?-2:2);
      if(setQuality>38) playerStat(ctx.stats,setter,'setGood');
      else if(setQuality<24) playerStat(ctx.stats,setter,'setPoor');
      const attackChoice=chooseAttack(atk,setQuality);
      const attackKind=attackChoice?.kind||'wing';
      const setProblem=setQuality<24?(Math.random()<.55?'za niska':'za daleko'):null;
      action(log,'WYS',attacking,setter,setProblem?`niedokładna, ${setProblem}`:`na ${setLabel(attackKind)}`);
      if(setQuality<18&&Math.random()<.13){
        playerStat(ctx.stats,setter,'errors');
        playerStat(ctx.stats,setter,'setErrors');
        return finishRally(log,defending,attacking,ctx,{reason:'fourHits',nearLine:false,summary:`${attacking.short} nie przebija piłki w trzech odbiciach.`});
      }

      const hitter=attackChoice?.hitter;
      if(!hitter) return finishRally(log,defending,attacking,ctx,{reason:'fourHits',nearLine:false,summary:`${attacking.short} nie znajduje atakującego po niedokładnej wystawie.`});
      const attackScore=roll50(attack50(hitter,attackKind)+teamForm(ctx,attacking),setQuality<30?8:0);
      const attackSpeed=clamp(rand(45,64)+attackScore*.75,45,108);
      playerStat(ctx.stats,hitter,'att');
      const blockers=def.blockers.length?def.blockers:def.front;
      const blocker=weighted(blockers.length?blockers:def.all,block50);
      const blockScore=roll50(block50(blocker)+teamForm(ctx,defending),attackKind==='tip'?12:attackKind==='pipe'?3:0);

      const netTouchChance=clamp(.008+(blockScore>attackScore?0.012:0)+(setQuality<28?0.010:0),.004,.040);
      if(Math.random()<netTouchChance){
        const culprit=Math.random()<.55?blocker:hitter;
        const culpritTeam=culprit===blocker?defending:attacking;
        const pointTeam=culpritTeam.id===attacking.id?defending:attacking;
        playerStat(ctx.stats,culprit,'errors');
        playerStat(ctx.stats,culprit,'netErrors');
        action(log,culprit===blocker?'BL':'AK',culpritTeam,culprit,'dotknięcie siatki');
        return finishRally(log,pointTeam,culpritTeam,ctx,{reason:'netTouch',nearLine:false,summary:`${culprit.name} dotyka siatki.`});
      }

      const attackNetChance=clamp(.010+(30-setQuality)*.0025+(blockScore-attackScore)*.0015,.006,.085);
      if(Math.random()<attackNetChance||attackScore<18){
        playerStat(ctx.stats,hitter,'errors');
        playerStat(ctx.stats,hitter,'attackErrors');
        action(log,'AK',attacking,hitter,`${attackSpeed.toFixed(1)} km/h ${attackLabel(attackKind)} w siatkę`);
        return finishRally(log,defending,attacking,ctx,{reason:'attackNet',nearLine:false,summary:`${hitter.name} atakuje w siatkę.`});
      }

      const attackOutChance=clamp(.012+(31-setQuality)*.002+(32-attackScore)*.002+(blockScore>attackScore?0.008:0),.006,.095);
      if(Math.random()<attackOutChance){
        const lineOut=Math.random()<.50;
        playerStat(ctx.stats,hitter,'errors');
        playerStat(ctx.stats,hitter,'attackErrors');
        action(log,'AK',attacking,hitter,`${attackSpeed.toFixed(1)} km/h ${attackLabel(attackKind)} aut ${lineOut?'po prostej':'po skosie'}`);
        return finishRally(log,defending,attacking,ctx,{reason:lineOut?'attackOutLine':'attackOutCross',nearLine:Math.random()<.38,veryClose:Math.random()<.14,summary:`${hitter.name} atakuje w aut ${lineOut?'po prostej':'po skosie'}.`});
      }

      const blockOutChance=clamp(.018+(attackScore-blockScore)*.004+(attackKind==='wing'?0.012:0),.006,.105);
      if(Math.random()<blockOutChance&&blockScore>26){
        playerStat(ctx.stats,hitter,'kills');
        playerStat(ctx.stats,hitter,'pts');
        playerStat(ctx.stats,hitter,'blockOuts');
        action(log,'AK',attacking,hitter,`${attackSpeed.toFixed(1)} km/h ${attackLabel(attackKind)} po bloku`);
        action(log,'BL',defending,blocker,'touch, aut');
        return finishRally(log,attacking,defending,ctx,{reason:'blockOut',nearLine:false,summary:`${hitter.name} obija blok, piłka wychodzi w aut.`});
      }

      if(blockScore-attackScore>9&&Math.random()<.36){
        playerStat(ctx.stats,blocker,'blocks');
        playerStat(ctx.stats,blocker,'pts');
        playerStat(ctx.stats,hitter,'attackBlocked');
        action(log,'AK',attacking,hitter,`${attackSpeed.toFixed(1)} km/h ${attackLabel(attackKind)}`);
        action(log,'BL',defending,blocker,'punktowy');
        return finishRally(log,defending,attacking,ctx,{reason:'block',nearLine:false,summary:`${blocker.name} zamyka blokiem ostatnią piłkę.`});
      }

      const diggers=def.diggers.length?def.diggers:[def.libero,...def.outside,def.opposite].filter(Boolean);
      const digger=weighted(diggers.length?diggers:def.all,p=>defense50(p)+(p.pos==='L'?5:0));
      const blockSlows=blockScore>attackScore-3&&Math.random()<.34;
      const controlled=blockSlows&&blockScore>=attackScore+2&&Math.random()<.55;
      if(blockSlows){
        playerStat(ctx.stats,blocker,'blockTouches');
        if(controlled) playerStat(ctx.stats,blocker,'controlledBlocks');
        action(log,'AK',attacking,hitter,`${attackSpeed.toFixed(1)} km/h ${attackLabel(attackKind)}`);
        action(log,'BL',defending,blocker,controlled?'wyblok kontrolowany':'dotknięcie, gra trwa');
      }
      const digScore=roll50(defense50(digger)+teamForm(ctx,defending),attackScore>45&&!blockSlows?8:blockSlows?-6:0);
      const killChance=clamp(attackScore*.012+(attackKind==='tip'?.10:.17)-blockScore*.005-digScore*.004,.06,.66);
      if(!blockSlows&&(Math.random()<killChance||swing===maxSwings-1)){
        playerStat(ctx.stats,hitter,'kills');
        playerStat(ctx.stats,hitter,'pts');
        action(log,'AK',attacking,hitter,`${attackSpeed.toFixed(1)} km/h ${attackLabel(attackKind)} punkt`);
        return finishRally(log,attacking,defending,ctx,{reason:'kill',nearLine:Math.random()<.30,veryClose:Math.random()<.10,summary:`${hitter.name} kończy wymianę.`});
      }

      if(!blockSlows) action(log,'AK',attacking,hitter,`${attackSpeed.toFixed(1)} km/h ${attackLabel(attackKind)}`);
      playerStat(ctx.stats,digger,'digs');
      if(digScore<24&&Math.random()<.45){
        action(log,'OB',defending,digger,'niedokładnie');
        if(Math.random()<.16){
          playerStat(ctx.stats,digger,'errors');
          playerStat(ctx.stats,digger,'ballErrors');
          playerStat(ctx.stats,digger,'defenseErrors');
          return finishRally(log,attacking,defending,ctx,{reason:'fourHits',nearLine:false,summary:`${defending.short} gubi się po obronie i popełnia czwarte odbicie.`});
        }
        playerStat(ctx.stats,digger,'freeBalls');
        action(log,'FB',defending,digger,'free ball');
        quality=36;
        continue;
      }

      action(log,'OB',defending,digger,digScore>42?'kontrola':'wysoko');
      quality=digScore;
      const old=attacking;
      attacking=defending;
      defending=old;
    }

    const closerSide=starters(attacking,ctx);
    const closerChoice=chooseAttack(closerSide,34);
    const closer=closerChoice?.hitter||weighted(closerSide.all,p=>attack50(p,'wing'));
    const closerKind=closerChoice?.kind||'wing';
    const lateSpeed=clamp(rand(42,58)+attack50(closer,closerKind)*.55,42,95);
    playerStat(ctx.stats,closer,'kills');
    playerStat(ctx.stats,closer,'pts');
    action(log,'AK',attacking,closer,`${lateSpeed.toFixed(1)} km/h ${attackLabel(closerKind)} końcówka chaosu`);
    return finishRally(log,attacking,defending,ctx,{reason:'kill',nearLine:Math.random()<.25,summary:`${closer.name} kończy przedłużoną, chaotyczną wymianę.`});
  }

  function simulateMatch(homeTeam,awayTeam,opts={}){
    prepareTeamPlayers(homeTeam);
    prepareTeamPlayers(awayTeam);
    const ctx={stats:{},eventStats:{rallies:0,long:0,challenges:0,overturned:0,reasons:{}},rotations:{}};
    const sets=[];
    const log=[];
    let homeSets=0,awaySets=0;
    const firstServer=Math.random()<.5?homeTeam:awayTeam;
    let serving=firstServer;
    let setNo=1;
    while(homeSets<3&&awaySets<3&&setNo<=5){
      let hp=0,ap=0;
      const target=setNo===5?15:25;
      let rallies=0;
      serving=setNo%2===1?firstServer:(firstServer.id===homeTeam.id?awayTeam:homeTeam);
      ctx.challengeMisses={[homeTeam.id]:0,[awayTeam.id]:0};
      ctx.teamForm={[homeTeam.id]:rnd(-2,2),[awayTeam.id]:rnd(-2,2)};
      resetTeamRotation(ctx,homeTeam);
      resetTeamRotation(ctx,awayTeam);
      log.push(`<strong>Start seta ${setNo}</strong> - serwis ${serving.short}.`);
      while(!((hp>=target||ap>=target)&&Math.abs(hp-ap)>=2) && rallies<90){
        rallies++;
        const receiving=serving.id===homeTeam.id?awayTeam:homeTeam;
        ctx.currentScore={[homeTeam.id]:hp,[awayTeam.id]:ap};
        const rally=simulateRally(serving,receiving,ctx);
        const final=rally.challenge
          ? {...rally,...resolveChallengeForRally(rally,ctx,id=>id===homeTeam.id?homeTeam:awayTeam,autoChallengeDecision(ctx,rally.challenge))}
          : rally;
        const oldServing=serving;
        if(final.point===homeTeam.id) hp++; else ap++;
        if(opts.fullLog || rallies<=10 || (hp>=target-2||ap>=target-2)){
          log.push(...rally.log, ...(final.log||[]), `${tag('pt','WYNIK')} ${homeTeam.short} ${hp}:${ap} ${awayTeam.short}`);
        }
        serving=final.point===homeTeam.id?homeTeam:awayTeam;
        if(serving.id!==oldServing.id) rotateTeam(ctx,serving);
      }
      const winner=hp>ap?homeTeam:awayTeam;
      if(winner.id===homeTeam.id) homeSets++; else awaySets++;
      sets.push({home:hp,away:ap,winner:winner.id});
      log.push(`<strong>Koniec seta ${setNo}: ${homeTeam.short} ${hp}:${ap} ${awayTeam.short}</strong>`);
      setNo++;
    }
    return {
      home:homeTeam.id,
      away:awayTeam.id,
      winner:homeSets>awaySets?homeTeam.id:awayTeam.id,
      sets,
      score:{home:homeSets,away:awaySets},
      log,
      stats:ctx.stats,
      eventStats:ctx.eventStats
    };
  }

  function cloneMatchTeam(team){
    const copy=clone(team);
    prepareTeamPlayers(copy);
    copy.useActiveLineup=true;
    const manual=Array.isArray(copy.activeLineupIds)
      ? uniquePlayers(copy.activeLineupIds.map(id=>copy.players.find(p=>p.id===id)).filter(Boolean))
      : [];
    copy.activeLineupIds=manual.length>=6?manual.map(p=>p.id):selectLineup(copy).map(p=>p.id);
    return copy;
  }

  function liveTeam(live,teamId){
    return live.home===teamId?live.homeTeam:live.awayTeam;
  }

  function otherLiveTeamId(live,teamId){
    return teamId===live.home?live.away:live.home;
  }

  function setTarget(setNo){
    return setNo===5?15:25;
  }

  function liveToResult(live){
    return {
      home:live.home,
      away:live.away,
      winner:live.homeSets>live.awaySets?live.home:live.away,
      sets:live.sets.slice(),
      score:{home:live.homeSets,away:live.awaySets},
      log:live.log.slice(),
      stats:live.stats,
      eventStats:live.eventStats
    };
  }

  function challengeDecisionText(challenge,take,overturned=false){
    if(!take) return `challenge niewykorzystany (${challenge.label})`;
    return `${overturned?'decyzja zmieniona':'decyzja utrzymana'} (${challenge.label})`;
  }

  function challengePointSummary(challenge,overturned){
    if(overturned) return `Challenge udany, decyzja zmieniona. Punkt po weryfikacji.`;
    return challenge.summary||'decyzja utrzymana';
  }

  function resolveChallengeForRally(rally,ctx,getTeam,take){
    const challenge=rally.challenge;
    if(!challenge) return {point:rally.point,log:[],kind:rally.kind,taken:false,overturned:false};
    const log=[];
    let point=challenge.originalPoint;
    let kind=rally.kind;
    let overturned=false;
    const challenger=getTeam(challenge.challenger);
    if(take){
      if(!ctx.challengeMisses) ctx.challengeMisses={};
      if(!ctx.eventStats) ctx.eventStats={rallies:0,long:0,challenges:0,overturned:0,reasons:{}};
      ctx.eventStats.challenges++;
      overturned=typeof challenge.willOverturn==='boolean'?challenge.willOverturn:Math.random()<challenge.successChance;
      if(overturned){
        ctx.eventStats.overturned++;
        point=challenge.challenger;
        kind=`challenge_${challenge.reason}`;
        ctx.eventStats.reasons[kind]=(ctx.eventStats.reasons[kind]||0)+1;
      }else{
        ctx.challengeMisses[challenge.challenger]=(ctx.challengeMisses[challenge.challenger]||0)+1;
      }
      action(log,'CH',challenger,null,challengeDecisionText(challenge,true,overturned));
      log.push(`<span class="dim">${html(challenger.short)} bierze challenge: ${html(challengeDecisionText(challenge,true,overturned))}.</span>`);
    }else{
      log.push(`<span class="dim">${html(challenger.short)} nie bierze challenge: ${html(challengeDecisionText(challenge,false))}.</span>`);
    }
    action(log,'PKT',getTeam(point),null,challengePointSummary(challenge,overturned));
    return {point,log,kind,taken:take,overturned};
  }

  function resetLiveSetControls(live){
    live.challengeMisses={[live.home]:0,[live.away]:0};
    live.timeouts={[live.home]:2,[live.away]:2};
    live.substitutions={[live.home]:6,[live.away]:6};
    live.teamForm={[live.home]:rnd(-2,2),[live.away]:rnd(-2,2)};
    live.setStats={};
    live.rotations={};
    resetTeamRotation(live,live.homeTeam);
    resetTeamRotation(live,live.awayTeam);
  }

  function startLiveSet(live){
    live.score={home:0,away:0};
    resetLiveSetControls(live);
    live.serving=live.setNo%2===1?live.firstServer:otherLiveTeamId(live,live.firstServer);
    live.log.push(`<strong>Start seta ${live.setNo}</strong> - serwis ${liveTeam(live,live.serving).short}.`);
  }

  function createLiveMatch(homeTeam,awayTeam,matchId=null){
    const home=cloneMatchTeam(homeTeam);
    const away=cloneMatchTeam(awayTeam);
    const firstServer=Math.random()<.5?home.id:away.id;
    const live={
      mode:'live',
      matchId,
      home:home.id,
      away:away.id,
      homeTeam:home,
      awayTeam:away,
      firstServer,
      serving:firstServer,
      score:{home:0,away:0},
      sets:[],
      setNo:1,
      homeSets:0,
      awaySets:0,
      log:[],
      stats:{},
      setStats:{},
      eventStats:{rallies:0,long:0,challenges:0,overturned:0,reasons:{}},
      challengeMisses:{},
      teamForm:{},
      rotations:{},
      timeouts:{},
      substitutions:{},
      finished:false,
      result:null
    };
    startLiveSet(live);
    return live;
  }

  function ensureLiveShape(live){
    live.stats=live.stats||{};
    live.setStats=live.setStats||{};
    live.eventStats=live.eventStats||{rallies:0,long:0,challenges:0,overturned:0,reasons:{}};
    live.challengeMisses=live.challengeMisses||{[live.home]:0,[live.away]:0};
    live.teamForm=live.teamForm||{[live.home]:0,[live.away]:0};
    live.rotations=live.rotations||{};
    ensureRotation(live,live.homeTeam);
    ensureRotation(live,live.awayTeam);
    live.timeouts=live.timeouts||{[live.home]:2,[live.away]:2};
    live.substitutions=live.substitutions||{[live.home]:6,[live.away]:6};
  }

  function commitLivePoint(live,pointId,oldServing,extraLog=[]){
    if(pointId===live.home) live.score.home++;
    else live.score.away++;
    live.serving=pointId;
    if(live.serving!==oldServing) rotateTeam(live,liveTeam(live,live.serving));
    live.log.push(...extraLog,`${tag('pt','WYNIK')} ${live.homeTeam.short} ${live.score.home}:${live.score.away} ${live.awayTeam.short}`);

    const target=setTarget(live.setNo);
    if((live.score.home>=target||live.score.away>=target)&&Math.abs(live.score.home-live.score.away)>=2){
      const setWinner=live.score.home>live.score.away?live.home:live.away;
      if(setWinner===live.home) live.homeSets++;
      else live.awaySets++;
      live.sets.push({home:live.score.home,away:live.score.away,winner:setWinner});
      live.log.push(`<strong>Koniec seta ${live.setNo}: ${live.homeTeam.short} ${live.score.home}:${live.score.away} ${live.awayTeam.short}</strong>`);
      if(live.homeSets>=3||live.awaySets>=3){
        live.finished=true;
        live.result=liveToResult(live);
        live.log.push(`<strong>Koniec meczu: ${live.homeTeam.short} ${live.homeSets}:${live.awaySets} ${live.awayTeam.short}</strong>`);
        live.result.log=live.log.slice();
      }else{
        live.setNo++;
        startLiveSet(live);
      }
    }
    return live.result;
  }

  function playLivePoint(live){
    if(!live||live.finished) return live?.result||null;
    if(live.pendingChallenge) return null;
    ensureLiveShape(live);
    const servingTeam=liveTeam(live,live.serving);
    const receivingTeam=liveTeam(live,otherLiveTeamId(live,live.serving));
    const oldServing=live.serving;
    const ctx={
      stats:live.stats,
      setStats:live.setStats,
      eventStats:live.eventStats,
      challengeMisses:live.challengeMisses,
      teamForm:live.teamForm,
      rotations:live.rotations,
      currentScore:{[live.home]:live.score.home,[live.away]:live.score.away}
    };
    const rally=simulateRally(servingTeam,receivingTeam,ctx);
    live.rotations=ctx.rotations;
    if(rally.challenge){
      live.pendingChallenge={
        rally,
        oldServing,
        challenge:rally.challenge
      };
      live.log.push(...rally.log);
      return null;
    }
    return commitLivePoint(live,rally.point,oldServing,rally.log);
  }

  function resolveLiveChallenge(live,take){
    if(!live?.pendingChallenge) return {ok:false,message:'Nie ma sytuacji spornej do rozstrzygnięcia.'};
    ensureLiveShape(live);
    const pending=live.pendingChallenge;
    const result=resolveChallengeForRally(
      pending.rally,
      live,
      id=>liveTeam(live,id),
      !!take
    );
    live.pendingChallenge=null;
    commitLivePoint(live,result.point,pending.oldServing,result.log);
    return {ok:true,...result};
  }

  function substituteLive(live,teamId,outId,inId){
    if(!live||live.finished) return {ok:false,message:'Mecz jest już zakończony.'};
    ensureLiveShape(live);
    const t=liveTeam(live,teamId);
    if(!t) return {ok:false,message:'Nie znaleziono drużyny.'};
    if((live.substitutions[teamId]||0)<=0) return {ok:false,message:'Limit zmian w tym secie został wykorzystany.'};
    const ids=t.activeLineupIds||[];
    if(!ids.includes(outId)) return {ok:false,message:'Zawodnik schodzący nie jest aktualnie na boisku.'};
    if(ids.includes(inId)) return {ok:false,message:'Zawodnik wchodzący jest już na boisku.'};
    const out=t.players.find(p=>p.id===outId);
    const inn=t.players.find(p=>p.id===inId);
    if(!out||!inn) return {ok:false,message:'Nie znaleziono zawodników do zmiany.'};
    if(out.pos!==inn.pos) return {ok:false,message:'W tym demo zmiany wykonujemy pozycja za pozycję.'};
    t.activeLineupIds=ids.map(id=>id===outId?inId:id);
    if(live.rotations?.[teamId]){
      live.rotations[teamId]=live.rotations[teamId].map(id=>id===outId?inId:id);
    }
    live.substitutions[teamId]--;
    live.log.push(`<strong>Zmiana ${t.short}</strong>: ${inn.name} za ${out.name}.`);
    return {ok:true,message:`${inn.name} za ${out.name}`};
  }

  function takeTimeoutLive(live,teamId){
    if(!live||live.finished) return {ok:false,message:'Mecz jest już zakończony.'};
    ensureLiveShape(live);
    const t=liveTeam(live,teamId);
    if(!t) return {ok:false,message:'Nie znaleziono drużyny.'};
    if((live.timeouts[teamId]||0)<=0) return {ok:false,message:'Limit czasów w tym secie został wykorzystany.'};
    const opponent=otherLiveTeamId(live,teamId);
    live.timeouts[teamId]--;
    live.teamForm[teamId]=clamp((live.teamForm[teamId]||0)+1,-3,3);
    live.teamForm[opponent]=clamp((live.teamForm[opponent]||0)-1,-3,3);
    live.log.push(`<strong>Czas dla ${t.short}</strong> - korekta ustawienia i uspokojenie przyjęcia.`);
    return {ok:true,message:`Czas dla ${t.short}`};
  }

  function leaguePoints(result,teamId){
    const isHome=result.home===teamId;
    const won=(result.winner===teamId);
    const own=isHome?result.score.home:result.score.away;
    const opp=isHome?result.score.away:result.score.home;
    if(won) return opp===2?2:3;
    return own===2?1:0;
  }

  function applyMatchToStandings(league,match,result){
    [match.home,match.away].forEach(teamId=>{
      const st=league.standings[teamId];
      const isHome=match.home===teamId;
      const ownSets=isHome?result.score.home:result.score.away;
      const oppSets=isHome?result.score.away:result.score.home;
      const ownPts=result.sets.reduce((s,set)=>s+(isHome?set.home:set.away),0);
      const oppPts=result.sets.reduce((s,set)=>s+(isHome?set.away:set.home),0);
      st.played++;
      if(result.winner===teamId) st.w++; else st.l++;
      st.points+=leaguePoints(result,teamId);
      st.setsFor+=ownSets;
      st.setsAgainst+=oppSets;
      st.pointsFor+=ownPts;
      st.pointsAgainst+=oppPts;
    });
  }

  function syncLeagueRound(league){
    const remaining=league.schedule.filter(m=>!m.played);
    league.currentRound=remaining.length
      ? Math.min(...remaining.map(m=>m.round))
      : Math.max(0,...league.schedule.map(m=>m.round))+1;
  }

  function resultFitsMatch(match,result){
    return !!(match&&result&&match.home===result.home&&match.away===result.away);
  }

  function findScheduleMatchForResult(state,result){
    if(!result) return null;
    const preferredLeagueId=state.teamMap?.[result.home]?.league;
    const leagues=[
      preferredLeagueId?leagueState(state,preferredLeagueId):null,
      ...state.leagues
    ].filter(Boolean);
    const seen=new Set();
    for(const league of leagues){
      if(seen.has(league.id)) continue;
      seen.add(league.id);
      const exact=league.schedule.find(m=>resultFitsMatch(m,result));
      if(exact) return exact;
    }
    return null;
  }

  function rebuildStandings(state){
    state.leagues.forEach(league=>{
      league.standings=Object.fromEntries(league.teams.map(id=>[id,emptyStanding(id)]));
    });
    state.leagues.forEach(league=>{
      league.schedule.forEach(match=>{
        if(match.played&&resultFitsMatch(match,match.result)){
          applyMatchToStandings(league,match,match.result);
        }else if(match.played){
          match.played=false;
          match.result=null;
        }
      });
      syncLeagueRound(league);
    });
  }

  function normalizeTeamSetup(team){
    let repaired=0;
    team.players.forEach(p=>{
      const before=p.form;
      setForm(p,typeof p.form==='number'?formValue(p):5.5);
      if(before!==p.form) repaired++;
    });
    if(Array.isArray(team.activeLineupIds)){
      const valid=new Set(team.players.map(p=>p.id));
      const cleaned=[...new Set(team.activeLineupIds.filter(id=>valid.has(id)))];
      if(cleaned.length!==team.activeLineupIds.length){
        team.activeLineupIds=cleaned;
        repaired++;
      }
      if(team.useActiveLineup&&cleaned.length<6){
        team.useActiveLineup=false;
        repaired++;
      }
    }
    return repaired;
  }

  function statActivity(s){
    if(!s) return 0;
    return (s.serves||0)+(s.att||0)+(s.recv||0)+(s.sets||0)+(s.digs||0)+(s.blocks||0)+(s.blockTouches||0)+(s.errors||0)+(s.pts||0);
  }

  function playerFormDelta(p,s){
    const activity=statActivity(s);
    if(!activity){
      const f=formValue(p);
      if(f<6.2) return .06;
      if(f>7.4) return -.04;
      return .01;
    }
    let delta=.03;
    delta+=(s.pts||0)*.045-(s.errors||0)*.075;
    if((s.att||0)>=3){
      delta+=((s.kills||0)/s.att-.42)*.55;
      delta-=(s.attackErrors||0)*.035+(s.attackBlocked||0)*.025;
      delta+=(s.blockOuts||0)*.03;
    }
    if((s.recv||0)>=2){
      const receiveIndex=((s.receptionPerfect||0)+(s.receptionPositive||0)*.65-(s.receptionPoor||0)*.35-(s.receptionErrors||0)*.80)/s.recv;
      delta+=(receiveIndex-.35)*.32;
    }
    if((s.sets||0)>=4){
      delta+=((s.setGood||0)/s.sets-.35)*.24;
      delta-=((s.setPoor||0)/s.sets)*.18+(s.setErrors||0)*.05;
    }
    delta+=(s.aces||0)*.05-(s.serveErrors||0)*.045;
    delta+=(s.blocks||0)*.06+(s.blockTouches||0)*.012+(s.digs||0)*.012+(s.freeBalls||0)*.008-(s.defenseErrors||0)*.05;
    return clamp(delta,-.8,.8);
  }

  function updateFormsAfterResult(state,result){
    if(!result?.stats) return;
    [result.home,result.away].forEach(teamId=>{
      const t=team(state,teamId);
      if(!t) return;
      t.players.forEach(p=>{
        const delta=playerFormDelta(p,result.stats[p.id]);
        setForm(p,formValue(p)+delta);
      });
    });
  }

  function repairState(state){
    if(!state?.leagues?.length) return {repaired:0};
    let repaired=0;
    Object.values(state.teamMap||{}).forEach(t=>{
      repaired+=normalizeTeamSetup(t);
    });
    state.leagues.forEach(league=>{
      league.schedule.forEach((match,index)=>{
        const expectedId=`${league.id}_r${match.round}m${(index%Math.max(1,Math.ceil(league.teams.length/2)))+1}`;
        if(!String(match.id||'').startsWith(`${league.id}_`)){
          match.id=expectedId;
          repaired++;
        }
        if(!match.played||!match.result||resultFitsMatch(match,match.result)) return;
        const target=findScheduleMatchForResult(state,match.result);
        if(target&&!target.played){
          target.played=true;
          target.result=match.result;
        }
        match.played=false;
        match.result=null;
        repaired++;
      });
    });
    if(state.lastMatch){
      const target=findScheduleMatchForResult(state,state.lastMatch);
      if(target&&!target.played){
        target.played=true;
        target.result=state.lastMatch;
        repaired++;
      }
    }
    if(repaired) rebuildStandings(state);
    return {repaired};
  }

  function simulateMatchInState(state,match,fullLog=false){
    if(match.played) return match.result;
    const l=leagueState(state,state.teamMap[match.home].league);
    const result=simulateMatch(team(state,match.home),team(state,match.away),{fullLog});
    match.played=true;
    match.result=result;
    applyMatchToStandings(l,match,result);
    updateFormsAfterResult(state,result);
    state.lastMatch=result;
    state.news.unshift({type:'match',text:`${team(state,match.home).short} ${result.score.home}:${result.score.away} ${team(state,match.away).short}`});
    return result;
  }

  function applyLiveMatchToState(state,match,live){
    if(!live?.finished) return null;
    if(match.home!==live.home||match.away!==live.away) return null;
    if(match.played) return match.result;
    const l=leagueState(state,state.teamMap[match.home].league);
    const result=live.result||liveToResult(live);
    match.played=true;
    match.result=result;
    applyMatchToStandings(l,match,result);
    updateFormsAfterResult(state,result);
    state.lastMatch=result;
    state.news.unshift({type:'match',text:`${team(state,match.home).short} ${result.score.home}:${result.score.away} ${team(state,match.away).short}`});
    return result;
  }

  function simulateRound(state,leagueId=state.selectedLeague){
    const matches=getCurrentRoundMatches(state,leagueId).filter(m=>!m.played);
    matches.forEach(m=>simulateMatchInState(state,m,m.home===state.selectedTeam||m.away===state.selectedTeam));
    const l=leagueState(state,leagueId);
    const remaining=l.schedule.filter(m=>!m.played);
    l.currentRound=remaining.length?Math.min(...remaining.map(m=>m.round)):l.currentRound+1;
    return matches;
  }

  function sortedStandings(state,leagueId=state.selectedLeague){
    const l=leagueState(state,leagueId);
    return Object.values(l.standings).sort((a,b)=>
      b.points-a.points ||
      (b.w-a.w) ||
      ((b.setsFor-b.setsAgainst)-(a.setsFor-a.setsAgainst)) ||
      ((b.pointsFor-b.pointsAgainst)-(a.pointsFor-a.pointsAgainst))
    );
  }

  window.VM_ENGINE={
    createInitialState,
    leagueState,
    team,
    selectLineup,
    activePlayers,
    matchOverall,
    starters,
    teamOverall,
    getCurrentRoundMatches,
    nextMatchForTeam,
    simulateMatch,
    simulateMatchInState,
    createLiveMatch,
    playLivePoint,
    resolveLiveChallenge,
    substituteLive,
    takeTimeoutLive,
    applyLiveMatchToState,
    repairState,
    simulateRound,
    sortedStandings
  };
})();
