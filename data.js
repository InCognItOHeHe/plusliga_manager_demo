(function(){
  const POS = { S:'Rozgrywający', OP:'Atakujący', OH:'Przyjmujący', MB:'Środkowy', L:'Libero' };
  const SKILLS = [
    ['serve','Serwis'],
    ['servePower','Siła serwisu'],
    ['attackWing','Atak ze skrzydła'],
    ['attackMiddle','Atak ze środka'],
    ['tip','Kiwka'],
    ['attackBackRow','Atak z 2 linii'],
    ['blockAvoid','Omijanie bloku'],
    ['blockOut','Atak blok-aut'],
    ['setting','Rozegranie'],
    ['setQuality','Wystawa'],
    ['reception','Przyjęcie'],
    ['defense','Obrona'],
    ['cover','Asekuracja'],
    ['blockPositioning','Ustawianie do bloku'],
    ['block','Blok']
  ];
  const DISPLAY_SKILL_MAX = 50;
  const POSITION_BASE = {
    S:{serve:63,receive:48,set:82,attack:42,block:56,defense:60,physical:58},
    OP:{serve:72,receive:48,set:36,attack:82,block:64,defense:55,physical:78},
    OH:{serve:68,receive:72,set:38,attack:75,block:58,defense:69,physical:70},
    MB:{serve:62,receive:32,set:34,attack:68,block:82,defense:48,physical:76},
    L:{serve:36,receive:86,set:56,attack:18,block:20,defense:88,physical:62}
  };
  const OVERALL_WEIGHTS = {
    S:{setting:.34,setQuality:.30,serve:.08,defense:.08,cover:.06,block:.06,blockPositioning:.03,physical:.03,stamina:.02},
    OP:{attackWing:.24,attackBackRow:.18,blockOut:.14,blockAvoid:.09,serve:.11,servePower:.07,block:.07,physical:.06,defense:.02,stamina:.02},
    OH:{attackWing:.20,reception:.20,defense:.11,attackBackRow:.10,blockOut:.08,serve:.08,blockAvoid:.07,cover:.06,servePower:.04,block:.04,stamina:.02},
    MB:{block:.25,attackMiddle:.25,blockPositioning:.18,physical:.10,serve:.08,servePower:.04,stamina:.04,tip:.03,cover:.03},
    L:{reception:.36,defense:.32,cover:.14,setting:.06,setQuality:.04,physical:.04,stamina:.04}
  };
  const OVERALL_POSITION_ADJUST = { S:0, OP:-5, OH:-1, MB:-3, L:-5 };
  const STAT_ADJUSTMENTS = {
    // PlusLiga 2025/26: leaders from Volleyball World/PlusLiga rankings.
    'Kamil Rychlicki':{attack:96,serve:82,physical:88,stamina:90},
    'Wilfredo Leon':{attack:95,serve:96,receive:86,defense:84,physical:92,stamina:91},
    'Aaron Russell':{attack:93,serve:89,receive:82,defense:82,physical:88},
    'Bartosz Filipiak':{attack:92,serve:84,physical:86,stamina:88},
    'Patrik Indra':{attack:93,serve:82,physical:86},
    'Moritz Karlitzek':{attack:92,serve:95,receive:81,defense:80},
    'Tobias Brand':{attack:89,serve:86,receive:82,defense:84},
    'Bartłomiej Bołądź':{attack:92,serve:84,block:77,physical:88},
    'Karol Butryn':{attack:91,serve:84,physical:87},
    'Bartosz Bednorz':{attack:90,serve:89,receive:93,defense:86,block:78},
    'Aliaksei Nasevich':{attack:91,serve:88,physical:86},
    'Chizoba Eduardo Neves Atu':{attack:91,serve:87,physical:86},
    'Mathis Henno':{attack:89,serve:86,receive:87,defense:84},
    'Hilir Henno':{attack:88,serve:88,receive:82,defense:84},
    'Jan Hadrava':{attack:89,serve:88,physical:85},
    'Artur Szalpuk':{attack:88,receive:81,defense:82},
    'Antoine Pothron':{attack:88,serve:88,receive:80},
    'Asparuh Asparuhov':{attack:88,serve:87,receive:80},
    'Bartosz Kwolek':{attack:87,serve:84,receive:85,defense:86,block:76},
    'Kevin Tillie':{attack:87,receive:91,defense:85},
    'Amirhossein Esfandiar':{attack:86,serve:84,receive:78,defense:80,stamina:86},
    'Piotr Orczyk':{attack:85,serve:80,receive:82,defense:80,stamina:86},
    'Nicolas Szerszeń':{attack:85,serve:83,receive:78,defense:80,stamina:85},
    'Remigiusz Kapica':{attack:85,serve:84,physical:84,stamina:84},
    'Milad Ebadipour':{attack:84,serve:80,receive:82,defense:81,stamina:86},
    'Mateusz Bieniek':{attack:86,serve:93,block:91,physical:86},
    'Paweł Halaba':{attack:86,serve:87,receive:82,defense:82},
    'Michał Gierżot':{attack:86,serve:83,receive:80,defense:83},
    'Igor Grobelny':{attack:85,serve:84,receive:86,block:75},
    'Aleks Grozdanov':{attack:83,serve:82,block:97,physical:87},
    'Danny Demyanenko':{attack:82,serve:81,block:92,physical:86},
    'Bartłomiej Lemański':{attack:82,serve:84,block:94,physical:86},
    'Łukasz Usowicz':{attack:80,serve:78,block:91,physical:84},
    'Szymon Jakubiszak':{attack:81,serve:78,block:90,physical:84},
    'Fynnian McCarthy':{attack:80,serve:89,block:88,physical:84},
    'Jurij Semeniuk':{attack:78,serve:76,block:86,physical:83},
    'Sebastian Adamczyk':{attack:78,serve:76,block:85,physical:82},
    'Jan Firlej':{set:97,serve:80,defense:87,stamina:90},
    'Marcin Komenda':{set:96,serve:78,block:76,defense:86,stamina:90},
    'Miguel Tavares':{set:95,serve:92,defense:80,stamina:88},
    'Marcin Janusz':{set:94,serve:79,defense:84},
    'Johannes Tille':{set:93,serve:82,defense:82},
    'Grzegorz Łomacz':{set:92,serve:76,defense:80},
    'Benjamin Toniutti':{set:92,serve:74,defense:82},
    'Quinn Isaacson':{set:90,serve:80,defense:78},
    'Luciano De Cecco':{set:93,serve:76,defense:80},
    'Joseph Worsley':{set:89,serve:76,defense:79},
    'Jakub Popiwczak':{receive:95,defense:97,set:71},
    'Damian Wojtaszek':{receive:93,defense:95,set:70},
    'Voitto Köykkä':{receive:88,defense:92,set:68},
    'Thales Hoss':{receive:92,defense:94,set:70},
    'Maksymilian Granieczny':{receive:89,defense:91,set:68},
    'Bartosz Mariański':{receive:88,defense:90,set:67},
    'Jakub Ciunajtis':{receive:88,defense:92,set:66},
    'Maksym Kędzierski':{receive:84,defense:88,set:65},
    // PLS 1 Liga 2025/26: ranking points/MVP/serve/reception/digging leaders.
    'Luis Paolinetti':{attack:92,serve:82,block:70,defense:70,physical:87,stamina:91},
    'Patryk Szwaradzki':{attack:91,serve:87,block:68,defense:70,physical:86,stamina:90},
    'Maciej Krysiak':{attack:89,serve:86,receive:82,defense:82,stamina:91},
    'Szymon Romać':{attack:89,serve:86,block:74,defense:76,physical:86,stamina:89},
    'Kamil Maruszczyk':{attack:89,serve:82,receive:83,defense:82,stamina:91},
    'Mateusz Linda':{attack:88,serve:82,block:72,physical:85,stamina:89},
    'Tomasz Polczyk':{attack:86,serve:82,receive:80,defense:79,stamina:88},
    'Grzegorz Pająk':{set:92,serve:80,defense:82,stamina:91},
    'Michał Superlak':{attack:88,serve:86,block:74,physical:86,stamina:88},
    'Wojciech Włodarczyk':{attack:85,serve:82,receive:80,defense:80,stamina:88},
    'Gonzalo Quiroga':{attack:84,serve:79,receive:80,defense:79,stamina:86},
    'Krzysztof Gibek':{attack:80,serve:78,receive:79,defense:78,stamina:82},
    'Damian Hudzik':{attack:80,serve:76,block:86,defense:69,physical:84,stamina:84},
    'Maciej Wóz':{attack:79,serve:77,block:86,defense:69,physical:83,stamina:83},
    'Dawid Sokołowski':{attack:82,serve:81,receive:76,defense:75,stamina:84},
    'Michał Grabek':{set:81,serve:84,defense:76},
    'Błażej Podleśny':{set:82,serve:80,defense:80,stamina:86},
    'Łukasz Tynecki':{receive:89,defense:86,set:64},
    'Marcel Hendzelewski':{attack:78,receive:87,defense:82},
    'Kacper Taudul':{receive:87,defense:85,set:63},
    'Wiktor Mielczarek':{attack:76,receive:86,defense:81},
    'Dominik Jaglarski':{receive:85,defense:89,set:64},
    'Bartosz Dzierżyński':{receive:84,defense:88,set:63},
    'Jakub Dereń':{receive:83,defense:87,set:63},
    'Szymon Bereza':{set:80,serve:75,defense:79},
    'Jakob Solgaard Thelle':{set:87,serve:75,block:70,defense:72,stamina:89},
    'Kamil Dębski':{attack:82,serve:76,receive:84,defense:80,stamina:88},
    'Kajetan Tokajuk':{attack:85,serve:78,receive:85,defense:81,stamina:89},
    'Bartosz Pietruczuk':{attack:79,serve:75,receive:80,defense:76,stamina:82},
    'Bartosz Bućko':{attack:76,serve:72,receive:78,defense:74,stamina:78},
    'Szymon Biniek':{receive:85,defense:84,set:64,stamina:86},
    'Marcel Chmielewski':{receive:82,defense:80,set:63,stamina:80},
    'Bartłomiej Zawalski':{attack:84,serve:76,block:90,defense:70,physical:84,stamina:88},
    'Mateusz Zawalski':{attack:78,serve:74,block:82,defense:67,physical:81,stamina:80},
    'Tomasz Kalembka':{attack:84,serve:76,block:92,defense:70,physical:85,stamina:90},
    'Bartłomiej Krulicki':{attack:82,serve:76,block:90,defense:70,physical:84,stamina:88},
    'Bartłomiej Mordyl':{attack:80,serve:74,block:88,defense:68,physical:84,stamina:84},
    'Mateusz Pietras':{attack:78,serve:72,block:86,defense:68,physical:83,stamina:82},
    'Patrik Lamanec':{attack:80,serve:68,block:62,defense:62,physical:76,stamina:76}
  };

  function hash(str){
    let h=2166136261;
    for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}
    return h>>>0;
  }
  function jitter(name,key,amp=7){
    const n=hash(name+key)%1000/1000;
    return Math.round((n*2-1)*amp);
  }
  function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
  function skillCap(level){return level==='plusliga'?98:94;}
  function limitRating(value,name,key,level,lo=20,hi=skillCap(level)){
    const rounded=Math.round(value);
    if(rounded>hi){
      const spread=1+(hash(`${name}:${key}:cap`)%6);
      return clamp(hi-spread,lo,hi);
    }
    return clamp(rounded,lo,hi);
  }
  function scaleDisplayedSkills(out){
    SKILLS.forEach(([key])=>{
      if(typeof out[key]==='number') out[key]=clamp(Math.round(out[key]/2),1,DISPLAY_SKILL_MAX);
    });
  }
  function avg(...vals){return Math.round(vals.reduce((s,v)=>s+v,0)/vals.length);}
  function overallRating(out,pos){
    const weights=OVERALL_WEIGHTS[pos];
    const total=Object.values(weights).reduce((sum,v)=>sum+v,0);
    const rating=Object.keys(weights).reduce((sum,k)=>sum+(out[k]||0)*weights[k],0)/total;
    return clamp(Math.round(rating+(OVERALL_POSITION_ADJUST[pos]||0)),1,100);
  }
  function deriveSkills(out,name,pos,level){
    const max=skillCap(level);
    const make=(key,val,lo=20,hi=max)=>limitRating(val+jitter(name,key,4),name,key,level,lo,hi);
    out.servePower=make('servePower',out.serve*.65+out.physical*.35);
    out.attackWing=make('attackWing',
      pos==='OH'||pos==='OP'?out.attack:
      pos==='S'?out.attack*.82:
      pos==='MB'?out.attack*.70:
      out.attack*.45,20,max);
    out.attackMiddle=make('attackMiddle',
      pos==='MB'?out.attack+5:
      pos==='OP'?out.attack*.72:
      pos==='OH'?out.attack*.62:
      pos==='S'?out.attack*.58:
      out.attack*.35,18,max);
    out.tip=make('tip',
      pos==='S'?out.set*.55+out.attack*.25+out.defense*.20:
      out.attack*.55+out.set*.20+out.defense*.25,20,max);
    out.attackBackRow=make('attackBackRow',
      pos==='OH'||pos==='OP'?out.attack*.88+out.physical*.12:
      pos==='S'?out.attack*.58:
      pos==='MB'?out.attack*.48:
      out.attack*.25,15,max);
    out.blockAvoid=make('blockAvoid',out.attack*.62+out.physical*.20+out.set*.08+out.defense*.10,20,max);
    out.blockOut=make('blockOut',out.attack*.68+out.physical*.22+out.serve*.10,20,max);
    out.setting=make('setting',out.set*.78+out.defense*.12+out.receive*.10,20,max);
    out.setQuality=make('setQuality',out.set*.84+out.defense*.10+out.physical*.06,20,max);
    out.reception=make('reception',out.receive,15,max);
    out.cover=make('cover',out.defense*.62+out.receive*.28+out.set*.10,20,max);
    out.blockPositioning=make('blockPositioning',out.block*.70+out.defense*.15+out.physical*.15,20,max);
    out.serve=avg(out.serve,out.servePower);
    out.receive=out.reception;
    out.set=avg(out.setting,out.setQuality);
    out.attack=pos==='MB'?avg(out.attackMiddle,out.blockAvoid,out.tip):pos==='L'?avg(out.tip,out.attackWing):avg(out.attackWing,out.attackBackRow,out.blockAvoid,out.blockOut);
    out.block=avg(out.block,out.blockPositioning);
    out.defense=avg(out.defense,out.cover);
  }
  function attrs(name,pos,rep,level){
    const base=POSITION_BASE[pos];
    const bump=rep + (level==='plusliga'?8:0);
    const out={};
    Object.keys(base).forEach(k=>out[k]=clamp(base[k]+bump+jitter(name,k),20,99));
    out.stamina=clamp(66+bump+jitter(name,'stamina',9),35,98);
    out.form=clamp(Math.round((6.2+jitter(name,'form',18)/10)*10)/10,1,10);
    const statAdjustment=STAT_ADJUSTMENTS[name]||null;
    Object.assign(out,statAdjustment||{});
    // Czołówka PLS 1 Ligi powinna być blisko dołu PlusLigi, żeby awans nie tworzył sztucznej przepaści.
    if(level==='pls1'){
      ['serve','receive','set','attack','block','defense','physical','stamina'].forEach(k=>out[k]+=5);
    }
    if(!statAdjustment){
      const penalty=level==='plusliga'?1:3;
      ['serve','receive','set','attack','block','defense','physical','stamina'].forEach(k=>out[k]-=penalty);
    }
    Object.keys(out).forEach(k=>{
      if(k==='form') return;
      out[k]=limitRating(out[k],name,k,level);
    });
    deriveSkills(out,name,pos,level);
    out.overall=overallRating(out,pos);
    scaleDisplayedSkills(out);
    return out;
  }
  function p(name,pos,nat){return {name,pos,nat};}
  function makePlayers(teamId,level,rep,entries){
    return entries.map((e,i)=>({
      id:`${teamId}-p${i+1}`,
      name:e.name,
      pos:e.pos,
      age:19+(hash(e.name)%18),
      nationality:e.nat||'POL',
      contract:2026+(hash(e.name+'c')%3),
      ...attrs(e.name,e.pos,rep,level)
    }));
  }
  function staffRatings(rep,league){
    return {
      challengeRead:Math.max(20,Math.min(50,Math.round(25+rep*2.1+(league==='plusliga'?4:0))))
    };
  }
  function team(id,name,short,league,city,rep,coach,entries){
    return {id,name,short,league,city,rep,coach,staff:staffRatings(rep,league),players:makePlayers(id,league,rep,entries)};
  }

  const plusligaTeams = [
    team('luk','BOGDANKA LUK Lublin','LUK','plusliga','Lublin',9,'Stephane Antiga',[
      p('Marcin Komenda','S'),p('Rafał Prokopczuk','S'),p('Wilfredo Leon','OH'),p('Hilir Henno','OH'),p('Jakub Wachnik','OH'),p('Mikołaj Sawicki','OH'),p('Aleks Grozdanov','MB'),p('Fynnian McCarthy','MB'),p('Maciej Zając','MB'),p('Daenan Gyimah','MB'),p('Jackson Young','MB'),p('Kewin Sasak','OP'),p('Mateusz Malinowski','OP'),p('Thales Hoss','L'),p('Maciej Czyrek','L')
    ]),
    team('zaw','Aluron CMC Warta Zawiercie','ZAW','plusliga','Zawiercie',10,'Michał Winiarski',[
      p('Miguel Tavares','S'),p('Jakub Nowosielski','S'),p('Bartosz Kwolek','OH'),p('Aaron Russell','OH'),p('Patryk Łaba','OH'),p('Jakub Czerwiński','OH'),p('Mateusz Bieniek','MB'),p('Jurij Gladyr','MB'),p('Miłosz Zniszczoł','MB'),p('Adrian Markiewicz','MB'),p('Kyle Ensing','OP'),p('Bartłomiej Bołądź','OP'),p('Jakub Popiwczak','L'),p('Dawid Ogórek','L')
    ]),
    team('prw','PGE Projekt Warszawa','PRO','plusliga','Warszawa',10,'Tommi Tiilikainen',[
      p('Jan Firlej','S'),p('Michał Kozłowski','S'),p('Bartosz Bednorz','OH'),p('Kevin Tillie','OH'),p('Brandon Koppers','OH'),p('Bartosz Firszt','OH'),p('Jakub Kochanowski','MB'),p('Karol Kłos','MB'),p('Jurij Semeniuk','MB'),p('Jakub Strulak','MB'),p('Linus Weber','OP'),p('Bartosz Gomułka','OP'),p('Damian Wojtaszek','L'),p('Maciej Olenderek','L')
    ]),
    team('jsw','JSW Jastrzębski Węgiel','JSW','plusliga','Jastrzębie-Zdrój',9,'Andrzej Kowal',[
      p('Benjamin Toniutti','S'),p('Joshua Tuaniga','S'),p('Michał Gierżot','OH'),p('Nicolas Szerszeń','OH'),p('Miran Kujundżić','OH'),p('Adrian Staszewski','OH'),p('Anton Brehme','MB'),p('Mateusz Kufka','MB'),p('Jordan Zaleszczyk','MB'),p('Łukasz Usowicz','MB'),p('Łukasz Kaczmarek','OP'),p('Adam Lorenc','OP'),p('Jakub Jurczyk','L'),p('Maksymilian Granieczny','L')
    ]),
    team('zak','ZAKSA Kędzierzyn-Koźle','ZAK','plusliga','Kędzierzyn-Koźle',8,'Andrea Giani',[
      p('Quinn Isaacson','S'),p('Marcin Krawiecki','S'),p('Jakub Szymański','OH'),p('Rafał Szymura','OH'),p('Igor Grobelny','OH'),p('Bartosz Zych','OH'),p('Szymon Jakubiszak','MB'),p('Karol Urbanowicz','MB'),p('Konrad Stajer','MB'),p('Wojciech Kraj','MB'),p('Kamil Rychlicki','OP'),p('Mateusz Rećko','OP'),p('Mateusz Czunkiewicz','L'),p('Bartosz Fijałek','L')
    ]),
    team('res','Asseco Resovia Rzeszów','RES','plusliga','Rzeszów',9,'Massimo Botti',[
      p('Marcin Janusz','S'),p('Wiktor Nowak','S'),p('Lukas Vasina','OH'),p('Klemen Cebulj','OH'),p('Artur Szalpuk','OH'),p('Yacine Louati','OH'),p('Dawid Woch','MB'),p('Cezary Sapiński','MB'),p('Mateusz Poręba','MB'),p('Danny Demyanenko','MB'),p('Beau Graham','MB'),p('Jakub Bucki','OP'),p('Karol Butryn','OP'),p('Michał Potera','L'),p('Paweł Zatorski','L'),p('Erik Shoji','L')
    ]),
    team('skr','PGE GiEK Skra Bełchatów','SKR','plusliga','Bełchatów',7,'Krzysztof Stelmach',[
      p('Grzegorz Łomacz','S'),p('Kajetan Kubicki','S'),p('Daniel Chitigoi','OH'),p('Kamil Szymendera','OH'),p('Zouheir El Graoui','OH'),p('Antoine Pothron','OH'),p('Bartłomiej Lemański','MB'),p('Michał Szalacha','MB'),p('Mateusz Nowak','MB'),p('Łukasz Wiśniewski','MB'),p('Alan Souza','OP'),p('Arkadiusz Żakieta','OP'),p('Maksym Kędzierski','L'),p('Kamil Szymura','L')
    ]),
    team('nor','Steam Hemarpol Politechnika Częstochowa','CZE','plusliga','Częstochowa',7,'Guillermo Falasca',[
      p('Luciano De Cecco','S'),p('Tomasz Kowalski','S'),p('Milad Ebadipour','OH'),p('Bartłomiej Lipiński','OH'),p('Jakub Kiedos','OH'),p('Artur Sługocki','OH'),p('Jakub Nowak','MB'),p('Sebastian Adamczyk','MB'),p('Daniel Popiela','MB'),p('Damian Radziwon','MB'),p('Patrik Indra','OP'),p('Samuel Jeanlys','OP'),p('Mateusz Masłowski','L'),p('Bartosz Makoś','L')
    ]),
    team('ols','Indykpol AZS Olsztyn','OLS','plusliga','Olsztyn',6,'Daniel Pliński',[
      p('Johannes Tille','S'),p('Łukasz Kozub','S'),p('Moritz Karlitzek','OH'),p('Paweł Halaba','OH'),p('Mateusz Janikowski','OH'),p('Karol Borkowski','OH'),p('Kacper Sienkiewicz','OH'),p('Seweryn Lipiński','MB'),p('Dawid Siwczyk','MB'),p('Jakub Majchrzak','MB'),p('Paweł Cieślik','MB'),p('Arthur Szwarc','OP'),p('Jan Hadrava','OP'),p('Szymon Patecki','OP'),p('Jakub Ciunajtis','L'),p('Kuba Hawryluk','L')
    ]),
    team('sle','Ślepsk Malow Suwałki','SLE','plusliga','Suwałki',6,'Dominik Kwapisiewicz',[
      p('Kamil Droszyński','S'),p('Karol Jankiewicz','S'),p('Asparuh Asparuhov','OH'),p('Henrique Honorato','OH'),p('Joachim Panou','OH'),p('Antoni Kwasigroch','OH'),p('David Smith','MB'),p('Jan Nowakowski','MB'),p('Joaquin Gallego','MB'),p('Jakub Macyra','MB'),p('Marcin Grzeszczak','MB'),p('Bartosz Filipiak','OP'),p('Damian Wierzbicki','OP'),p('Bartosz Mariański','L'),p('Jakub Kubacki','L')
    ]),
    team('tre','Energa Trefl Gdańsk','TRE','plusliga','Gdańsk',6,'Mariusz Sordyl',[
      p('Joseph Worsley','S'),p('Przemysław Stępień','S'),p('Tobias Brand','OH'),p('Piotr Orczyk','OH'),p('Damian Kogut','OH'),p('Rafał Sobański','OH'),p('Piotr Nowakowski','MB'),p('Moustapha M\'Baye','MB'),p('Paweł Pietraszko','MB'),p('Mariusz Schamlewski','MB'),p('Aliaksei Nasevich','OP'),p('Damian Schulz','OP'),p('Voitto Köykkä','L'),p('Fabian Majcherski','L')
    ]),
    team('bar','Barkom Każany Lwów','BAR','plusliga','Lwów',5,'Ugis Krastins',[
      p('Yamato Nakano','S'),p('Lukas Kampa','S'),p('Julius Firkal','OH'),p('Lorenzo Pope','OH'),p('Oleh Shevchenko','OH'),p('Illia Kovalov','OH'),p('Mykola Kuts','MB'),p('Mousse Gueye','MB'),p('Andrii Rohozyn','MB'),p('Vladyslav Shchurov','MB'),p('Vasyl Tupchii','OP'),p('Dmytro Viietskyi','OP'),p('Oskar Woźny','L'),p('Yaroslav Pampushko','L')
    ]),
    team('chl','InPost ChKS Chełm','CHL','plusliga','Chełm',5,'Krzysztof Andrzejewski',[
      p('Jay Blankenau','S'),p('Grzegorz Jacznik','S'),p('Amirhossein Esfandiar','OH'),p('Paweł Rusin','OH'),p('Tomasz Piotrowski','OH'),p('Łukasz Łapszyński','OH'),p('Aleksander Nowik','OH'),p('Mariusz Marcyniak','MB'),p('Łukasz Swodczyk','MB'),p('Jakub Turski','MB'),p('Rune Fasteland','MB'),p('Jędrzej Goss','OP'),p('Remigiusz Kapica','OP'),p('Jędrzej Gruszczyński','L'),p('Daniel Ostaszewski','L'),p('Sonae Kazuma','L')
    ]),
    team('csg','Cuprum Stilon Gorzów','GOR','plusliga','Gorzów Wlkp.',5,'Hubert Henno',[
      p('Eduardo Carisio Sobrinho','S'),p('Mateusz Maciejewicz','S'),p('Mathis Henno','OH'),p('Marcin Waliński','OH'),p('Kamil Kwasowski','OH'),p('Wojciech Więcławski','OH'),p('Patryk Niemiec','MB'),p('Marcin Kania','MB'),p('Krzysztof Rejno','MB'),p('Hubert Węgrzyn','MB'),p('Chizoba Eduardo Neves Atu','OP'),p('Daniel Gąsior','OP'),p('Szymon Gregorowicz','L'),p('Kamil Dembiec','L')
    ])
  ];

  const pls1Teams = [
    team('gks','GKS Katowice','GKS','pls1','Katowice',6,'Emil Siewiorek',[
      p('Piotr Fenoszyn','S'),p('Grzegorz Pająk','S'),p('Krzysztof Gibek','OH'),p('Mateusz Łysikowski','OH'),p('Gonzalo Quiroga','OH'),p('Wojciech Włodarczyk','OH'),p('Damian Hudzik','MB'),p('Bartłomiej Krulicki','MB'),p('Bartosz Schmidt','MB'),p('Maciej Wóz','MB'),p('Damian Domagała','OP'),p('Michał Superlak','OP'),p('Kajetan Marek','L'),p('Patryk Waloch','L')
    ]),
    team('bbts','BBTS Bielsko-Biała','BBT','pls1','Bielsko-Biała',5,'Serhiy Kapelus',[
      p('Szymon Janus','S'),p('Jakob Solgaard Thelle','S','NOR'),p('Patrik Lamanec','OP','SVK'),p('Szymon Romać','OP'),p('Kamil Dębski','OH'),p('Bartosz Bućko','OH'),p('Bartosz Pietruczuk','OH'),p('Kajetan Tokajuk','OH'),p('Marek Polok','MB'),p('Wojciech Siek','MB'),p('Mateusz Zawalski','MB'),p('Bartłomiej Zawalski','MB'),p('Szymon Biniek','L'),p('Marcel Chmielewski','L')
    ]),
    team('ani','CUK Anioły Toruń','ANI','pls1','Toruń',5,'Marcin Kryś',[
      p('Błażej Podleśny','S'),p('Łukasz Sternik','S'),p('Luis Paolinetti','OP','BRA'),p('Jakub Skadorwa','OP'),p('Łukasz Kalinowski','OH'),p('Maciej Krysiak','OH'),p('Adrian Andruszkiewicz','OH'),p('Adam Surgut','OH'),p('Konrad Jankowski','MB'),p('Markus Kosian','MB'),p('Robert Brzóstowicz','MB'),p('Kamil Urbańczyk','MB'),p('Łukasz Tynecki','L'),p('Mateusz Podborączyński','L')
    ]),
    team('kks','KKS Mickiewicz Kluczbork','KKS','pls1','Kluczbork',4,'Mariusz Łysiak',[
      p('Szymon Bereza','S'),p('Radosław Gil','S'),p('Paweł Gryc','OP'),p('Mateusz Linda','OP'),p('Kamil Maruszczyk','OH'),p('Michał Gawrzydek','OH'),p('Artur Pasiński','OH'),p('Jakub Rybicki','OH'),p('Bartłomiej Janus','MB'),p('Konrad Mucha','MB'),p('Tomasz Kalembka','MB'),p('Jędrzej Kaźmierczak','MB'),p('Marcin Jaskuła','L'),p('Michał Łysiak','L'),p('Koshiro Nishi','L','JPN')
    ]),
    team('nys','Stal Nysa','NYS','pls1','Nysa',4,'Mark Lebedew',[
      p('Dawid Pawlun','S'),p('Patryk Szczurek','S'),p('Wiktor Musiał','OP'),p('Dimitris Mouchlias','OP','GRE'),p('Kamil Kosiba','OH'),p('Max Schulz','OH','GER'),p('Dominik Depowski','OH'),p('Maciej Pacholski','OH'),p('Rafał Putkowski','MB'),p('Dominik Kramczyński','MB'),p('Bartłomiej Mordyl','MB'),p('Wiktor Rajsner','MB'),p('Adam Kowalski','L'),p('Jakub Olejniczak','L')
    ]),
    team('bed','Nowak-Mosty MKS Będzin','BED','pls1','Będzin',4,'Radosław Kolanek',[
      p('Mateusz Szpernalowski','S'),p('Dawid Gruszczyński','S'),p('Patryk Szwaradzki','OP'),p('Kacper Wnuk','OP'),p('Ryszard Sałata','OH'),p('Radosław Puczkowski','OH'),p('Tomasz Polczyk','OH'),p('Maciej Ptaszyński','OH'),p('Jakub Sadkowski','MB'),p('Artur Ratajczak','MB'),p('Miłosz Wróbel','MB'),p('Mariusz Połyński','MB'),p('Maciej Nowowsiak','L'),p('Maciej Sas','L')
    ]),
    team('avi','PZL LEONARDO Avia Świdnik','AVI','pls1','Świdnik',3,'Jakub Guz',[
      p('Krzysztof Pigłowski','S'),p('Jaromir Orlicz','S'),p('Tomasz Kryński','OP'),p('Krzysztof Rykała','OP'),p('Karol Rawiak','OH'),p('Marcin Ociepski','OH'),p('Dawid Sokołowski','OH'),p('Wiktor Borkowski','OH'),p('Hubert Piwowarczyk','MB'),p('Konrad Machowicz','MB'),p('Adrian Gwardiak','MB'),p('Igor Oziabło','MB'),p('Tomasz Kuś','L'),p('Dawid Hajbowicz','L')
    ]),
    team('kps','KPS Siedlce','KPS','pls1','Siedlce',3,'Witold Chwastyniak',[
      p('Marcel Bakaj','S'),p('Tymon Majewski-Nowak','S'),p('Przemysław Kupka','OP'),p('Jakub Wiśniewski','OP'),p('Adrian Kacperkiewicz','OH'),p('Mikołaj Miszczuk','OH'),p('Damian Czetowicz','OH'),p('Michał Grabek','OH'),p('Patryk Czyrniański','OH'),p('Michał Kozłowski','MB'),p('Kamil Momot','MB'),p('Bartłomiej Wójcik','MB'),p('Dawid Libera','MB'),p('Bartosz Chromik','L'),p('Bartosz Tomczak','L')
    ]),
    team('jaw','MCKiS Jaworzno','JAW','pls1','Jaworzno',2,'Dawid Murek',[
      p('Michał Szczechowicz','S'),p('Oskar Wojtaszkiewicz','S'),p('Patryk Strzeżek','OP'),p('Karol Borończyk','OP'),p('Wiktor Mielczarek','OH'),p('Jakub Serewis','OH'),p('Sławomir Stolc','OH'),p('Dominik Czerny','OH'),p('Paweł Żeliński','MB'),p('Mateusz Pietras','MB'),p('Patryk Cichosz-Dzyga','MB'),p('Piotr Janusz','MB'),p('Michał Klimkowski','L'),p('Jakub Dereń','L')
    ]),
    team('rad','PIERROT Czarni Radom','RAD','pls1','Radom',2,'Krzysztof Michalski',[
      p('Bartosz Sławiński','S'),p('Kacper Gonciarz','S'),p('Rafał Faryna','OP'),p('Jędrzej Ziółkowski','OP'),p('Michał Kowal','OH'),p('Michał Wójcik','OH'),p('Jakub Szczurowski','OH'),p('Jakub Urbanowicz','OH'),p('Kamil Kowalczyk','MB'),p('Adam Miniak','MB'),p('Szymon Rakowski','MB'),p('Patryk Szymański','MB'),p('Adam Kornak','L'),p('Paweł Filipowicz','L')
    ]),
    team('lec','Lechia Tomaszów Mazowiecki','LEC','pls1','Tomaszów Maz.',2,'Kamil Czapnik',[
      p('Dawid Suski','S'),p('Jakub Rutkowski','S'),p('Igor Zawadzki','OP'),p('Tytus Nowik','OP'),p('Adrian Kopij','OH'),p('Marcel Hendzelewski','OH'),p('Artur Brzostowicz','OH'),p('Filip Balasz','OH'),p('Oskar Kukie','MB'),p('Jakub Zimoląg','MB'),p('Jakub Abramowicz','MB'),p('Wiktor Przybyłek','MB'),p('Miłosz Kotela','L'),p('Dominik Jaglarski','L')
    ]),
    team('ast','Karton-Pak Astra Nowa Sól','AST','pls1','Nowa Sól',1,'Konrad Cop',[
      p('Piotr Lipiński','S'),p('Artur Becker','S'),p('Jakub Kaliszuk','OP'),p('Marcel Woźny','OP'),p('Igor Rybak','OP'),p('Piotr Śliwka','OH'),p('Bartłomiej Potrykus','OH'),p('Fabian Leitermeier','OH'),p('Kacper Pakos','OH'),p('Oskar Laskowski','MB'),p('Jakub Potempa','MB'),p('Ernest Kaciczak','MB'),p('Aleksander Maciejewski','MB'),p('Patryk Foltynowicz','L'),p('Filip Popiwczak','L')
    ]),
    team('bks','BKS Bydgoszcz','BKS','pls1','Bydgoszcz',1,'Michal Masny',[
      p('Oliwier Winiarski','S'),p('Błażej Bień','S'),p('Łukasz Szarek','OP'),p('Dominik Rakowski','OP'),p('Sebastian Lisicki','OH'),p('Jakub Kraut','OH'),p('Patryk Mendel','OH'),p('Iwo Grabek','OH'),p('Emil Narkowicz','MB'),p('Adam Golik','MB'),p('Tymon Ramotowski','MB'),p('Mateusz Siwicki','MB'),p('Bartosz Dzierżyński','L')
    ]),
    team('spa','KS Sparta Grodzisk Mazowiecki','SPA','pls1','Grodzisk Maz.',1,'Tomasz Rosa',[
      p('Mikołaj Słotarski','S'),p('Marcin Karakuła','S'),p('Mateusz Cackowski','OP'),p('Mateusz Piotrowski','OP'),p('Jakub Czyżowski','OH'),p('Jakub Buczek','OH'),p('Bartosz Stępień','OH'),p('Bartłomiej Skorek','OH'),p('Kamil Leliwa','MB'),p('Michał Gregorowicz','MB'),p('Kamil Drzazga','MB'),p('Bartosz Michalak','MB'),p('Dariusz Bonisławski','L'),p('Tomasz Gawron','L')
    ]),
    team('aug','KS NECKO Augustów','AUG','pls1','Augustów',0,'Dmitriy Skori',[
      p('Konrad Buczek','S'),p('Jakub Konieczny','S'),p('Kamil Kulbacki','OP'),p('Oleg Krikun','OP','RUS'),p('Kacper Taudul','OH'),p('Marian Szlejter','OH'),p('Piotr Łukasik','OH'),p('Filip Jarosiński','OH'),p('Patryk Rodek','OH'),p('Jakub Cholewiński','MB'),p('Łukasz Rudzewicz','MB'),p('Radosław Sterna','MB'),p('Damian Baran','MB'),p('Jakub Krupiński','L'),p('Maksymilian Opioła','L')
    ]),
    team('sms','SMS PZPS Spała','SMS','pls1','Spała',-1,'Jacek Nawrocki',[
      p('Maciej Drąg','S'),p('Jakub Przybyłkowicz','S'),p('Bartosz Hoffmann','S'),p('Mateusz Madaj','OP'),p('Paweł Guzy','OP'),p('Adam Potempa','OP'),p('Wiktor Raczyński','OH'),p('Michał Smętek','OH'),p('Karol Leppert','OH'),p('Oskar Trawka','OH'),p('Patryk Głowa','OH'),p('Cezary Ślusarz','MB'),p('Tymoteusz Lenik','MB'),p('Marcin Hływa','MB'),p('Bartosz Sawicki','MB'),p('Olgierd Skóra','MB'),p('Marcel Schadach','L'),p('Łukasz Malek','L')
    ])
  ];

  const leagues = [
    {id:'plusliga',name:'PlusLiga',season:'2025/26',level:1,teams:plusligaTeams.map(t=>t.id)},
    {id:'pls1',name:'PLS 1. Liga',season:'2025/26',level:2,teams:pls1Teams.map(t=>t.id)}
  ];
  const teams = [...plusligaTeams,...pls1Teams];
  const teamMap = Object.fromEntries(teams.map(t=>[t.id,t]));

  window.VM_DATA = {
    POS,
    SKILLS,
    DISPLAY_SKILL_MAX,
    leagues,
    teams,
    teamMap,
    sources:[
      'PlusLiga 2025/2026 - oficjalne transfery i składy klubowe PLS',
      'Volleyball World / PlusLiga 2025/2026 - rankingi zawodników: punkty, atak, blok, serwis, rozegranie, przyjęcie, obrona',
      'Polsat Sport - PLS 1 Liga 2025/2026: składy drużyn i trenerzy',
      'PLS 1 Liga 2025/2026 - rankingi MVP, punktów, serwisu, przyjęcia i obrony'
    ]
  };
})();
