// PROTOTYPE: three fixed-footprint Battlefield tiles, switchable via ?variant=.
const variants={
  A:{name:"Taskbar Strip",detail:"480×112 · management borrows the same strip"},
  B:{name:"SideScape Tile",detail:"320×220 · drawer overlays the Battlefield"},
  C:{name:"Glass Tile",detail:"384×160 · dashboard floats inside the tile"},
};
const state={variant:new URLSearchParams(location.search).get("variant")?.toUpperCase()||"A",management:false,enemies:3,paused:false};
if(!variants[state.variant])state.variant="A";
const party=[
  {role:"Knight",short:"K",klass:"knight",color:"#7897cd",hair:"#51412e",x:14,hp:82},
  {role:"Priest",short:"P",klass:"priest",color:"#f0e8d2",hair:"#c39c56",x:23,hp:67},
  {role:"Wizard",short:"W",klass:"wizard",color:"#9b77cf",hair:"#3b2e55",x:32,hp:91},
];
const foes=[
  {role:"Moss",color:"#7ccc78",x:70,hp:38},{role:"Moss",color:"#7ccc78",x:77,hp:73},{role:"Spore",color:"#d49dcf",x:84,hp:56},{role:"Whelp",color:"#e6a96f",x:90,hp:88},{role:"Whelp",color:"#e6a96f",x:95,hp:64},
];
function actor(a,enemy=false,index=0){return `<div class="actor ${enemy?"enemy":a.klass}" style="--x:${a.x}%;--actor:${a.color};--hair:${a.hair||a.color};--hp:${a.hp}%;animation-delay:${-index*.22}s"><div class="shadow"></div><div class="body"></div><div class="head"></div>${enemy?"":'<div class="weapon"></div>'}<span class="name">${a.role}</span><span class="hp"><i></i></span></div>`}
function battlefield(){return `<section class="battlefield" aria-label="Animated Battlefield"><span class="lane party">F · M · B</span><span class="lane foes">CLOSEST ←</span>${party.map((a,i)=>actor(a,false,i)).join("")}${foes.slice(0,state.enemies).map((a,i)=>actor(a,true,i)).join("")}<i class="effect bolt"></i><i class="effect arrow"></i><i class="effect impact"></i><i class="effect heal"></i><div class="battle-meta"><span>AUTO</span><span>3 / 5</span><span class="boss"><i></i></span><span>0.8s</span></div></section>`}
function members(){return party.map((p,i)=>`<div class="member"><span class="face" style="--actor:${p.color}">${p.short}</span><span><strong>${p.role}</strong><span>${["Front · Guard","Middle · Mend","Back · Nova"][i]}</span></span><em>14</em></div>`).join("")}
function management(){if(state.variant==="A")return `<aside class="management" ${state.management?"":"hidden"}>${members()}</aside>`;if(state.variant==="B")return `<aside class="management" ${state.management?"":"hidden"}><span class="panel-title">Party</span>${members()}<span class="panel-title">Loadout</span><div class="gems"><i class="gem">⚔</i><i class="gem">✦</i><i class="gem">✚</i><i class="gem">☄</i></div></aside>`;return `<aside class="management" ${state.management?"":"hidden"}><div><span class="panel-title">Formation</span><div class="members">${members()}</div></div><div><span class="panel-title">Wizard loadout</span><div class="gems"><i class="gem">✦</i><i class="gem">☄</i><i class="gem">◈</i></div><span class="panel-title">8 talents · free respec</span></div></aside>`}
function toolbar(){return `<header class="topline"><strong class="brand">Embermarch</strong><span class="stage">12 · Wave 3</span><span class="spacer"></span><button class="tool density" data-count="1">1</button><button class="tool density" data-count="3">3</button><button class="tool density" data-count="5">5</button><button class="tool pause" aria-label="Pause combat">${state.paused?"▶":"Ⅱ"}</button><button class="tool manage active">${state.management?"Fight":"Party"}</button></header>`}
function render(){document.getElementById("app").innerHTML=`<main class="prototype-page ${state.paused?"paused":""}"><div class="ruler"><span>${variants[state.variant].detail.split(" · ")[0]}</span><span>hero 32×48 source → 32×48 screen</span><span>${state.enemies} foes</span></div><article class="window variant-${state.variant.toLowerCase()} ${state.management?"management-open":""}"><div class="shell">${toolbar()}${management()}${battlefield()}</div></article><nav class="switcher" aria-label="Prototype variants"><button class="previous" aria-label="Previous variant">←</button><span class="switcher-copy"><strong>${state.variant} — ${variants[state.variant].name}</strong><span>${variants[state.variant].detail}</span></span><button class="next" aria-label="Next variant">→</button></nav></main>`;
 document.querySelector(".manage").addEventListener("click",()=>{state.management=!state.management;render()});document.querySelector(".pause").addEventListener("click",()=>{state.paused=!state.paused;render()});document.querySelectorAll(".density").forEach(el=>{if(+el.dataset.count===state.enemies)el.classList.add("active");el.addEventListener("click",()=>{state.enemies=+el.dataset.count;render()})});document.querySelector(".previous").addEventListener("click",()=>cycle(-1));document.querySelector(".next").addEventListener("click",()=>cycle(1));}
function cycle(delta){const keys=Object.keys(variants);state.variant=keys[(keys.indexOf(state.variant)+delta+keys.length)%keys.length];state.management=false;history.replaceState({},"",`?variant=${state.variant}`);render()}
addEventListener("keydown",e=>{if(["INPUT","TEXTAREA"].includes(e.target.tagName)||e.target.isContentEditable)return;if(e.key==="ArrowLeft")cycle(-1);if(e.key==="ArrowRight")cycle(1)});
render();

