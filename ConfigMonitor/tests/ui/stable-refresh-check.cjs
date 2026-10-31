const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),assert=require('assert');
const assets=path.resolve(__dirname,'../../app/src/main/assets');
const dom=new JSDOM(fs.readFileSync(path.join(assets,'index.html'),'utf8'),{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;
let data={nodes:Array.from({length:60},(_,i)=>({id:i+1,name:'Monitor '+(i+1),host:'server'+i+'.example.com',p:'VLESS',transport:'TCP',type:'config',enabled:true,state:'good',ms:84,lastCheck:1})),prefs:{language:'fa',theme:'dark',interval:20,failureLimit:6,running:true,testUrl:'https://example.com'},permissions:{},events:[],alarm:false};
w.Native={call:(op,raw)=>{const p=JSON.parse(raw);if(op==='snapshot')return JSON.stringify(data);if(op==='schedule')return JSON.stringify({phase:'waiting',remainingMs:12000,intervalMs:20000});if(op==='history'){const n=data.nodes.find(n=>n.id===p.id);return JSON.stringify({samples:[{time:1,ms:60},{time:2,ms:n?.ms??-1}]});}if(op==='report')return JSON.stringify({buckets:[],from:1000,up:1000,down:0,coverage:100,average:data.nodes[0].ms});return '{"ok":true}';}};
w.eval(fs.readFileSync(path.join(assets,'lucide.js'),'utf8'));w.eval(fs.readFileSync(path.join(assets,'app.js'),'utf8'));
const q=s=>{const el=d.querySelector(s);assert(el,s);return el},click=s=>q(s).click(),refresh=()=>w.receive('refresh',{});
try{
 const card=q('[data-detail="20"]').closest('article'),button=q('[data-detail="20"]'),header=q('#mm-topbar .mm-head'),nav=q('#mm-nav button'),icon=q('#mm-topbar svg'),grid=q('.mm-grid'),progress=q('#next-fill'),summary=q('.mm-search-tools summary');
 button.focus();q('#mm-view').scrollTop=1700;
 let scrollWrites=0,scrollValue=1700;Object.defineProperty(q('#mm-view'),'scrollTop',{configurable:true,get:()=>scrollValue,set:v=>{scrollWrites++;scrollValue=v;}});
 for(let i=0;i<25;i++){data.nodes[19].ms=i%2?-1:100+i;data.nodes[19].state=i%2?'bad':'good';data.nodes[19].lastCheck++;refresh();}
 assert.strictEqual(q('[data-detail="20"]').closest('article'),card,'Background results must keep the existing card mounted');
 assert.strictEqual(q('[data-detail="20"]'),button);assert.strictEqual(d.activeElement,button,'Refresh must preserve keyboard/accessibility focus');
 for(const [selector,node] of [['#mm-topbar .mm-head',header],['#mm-nav button',nav],['#mm-topbar svg',icon],['.mm-grid',grid],['#next-fill',progress],['.mm-search-tools summary',summary]])assert.strictEqual(q(selector),node,selector+' was replaced');
 assert.equal(scrollWrites,0,'Ordinary result updates must not write scrollTop or cancel momentum scrolling');
 assert(q('[data-detail="20"]').textContent.includes('در دسترس'));assert(card.querySelector('.mm-latency').textContent.includes('۱۲۴'));
 // Identical data must not remount any content or recreate SVG icons.
 const observer=new w.MutationObserver(()=>{});observer.observe(q('#mm-view'),{subtree:true,childList:true});refresh();
 assert.equal(observer.takeRecords().filter(r=>Array.from(r.removedNodes).some(n=>n.nodeType===1)).length,0);observer.disconnect();
 // Insertion/removal above the list must keep surviving cards and focus.
 data.alarm=true;refresh();assert.strictEqual(q('.mm-grid'),grid);assert.strictEqual(q('[data-detail="20"]').closest('article'),card);q('[data-action="ack"]');
 data.alarm=false;data.nodes.unshift({...data.nodes[0],id:100,name:'Inserted'});refresh();assert.strictEqual(q('[data-detail="20"]').closest('article'),card);
 data.nodes=data.nodes.filter(n=>n.id!==2);refresh();assert.strictEqual(q('[data-detail="20"]').closest('article'),card);assert(!d.querySelector('[data-detail="2"]'));
 // Filters must continue to add/remove matching cards as states change.
 click('[data-filter="bad"]');data.nodes[0].state='bad';refresh();q('[data-detail="100"]');data.nodes[0].state='good';refresh();assert(!d.querySelector('[data-detail="100"]'));
 click('[data-filter="all"]');click('[data-detail="20"]');const body=q('.mm-body'),detailChart=q('.mm-chart svg');data.nodes.find(n=>n.id===20).ms=777;refresh();assert.strictEqual(q('.mm-body'),body,'Detail entrance animation must not restart');assert.strictEqual(q('.mm-chart svg'),detailChart);assert(q('.mm-hero-stat').textContent.includes('۷۷۷'));
 click('[data-nav="reports"]');const report=q('.mm-body'),picker=q('#report-node');refresh();assert.strictEqual(q('.mm-body'),report);assert.strictEqual(q('#report-node'),picker);
 click('#report-node');const sheet=q('.mm-sheet');q('#picker-search').value='server';refresh();assert.strictEqual(q('.mm-sheet'),sheet);assert.equal(q('#picker-search').value,'server');w.back();
 click('[data-nav="settings"]');const input=q('#interval');input.value='37';refresh();assert.strictEqual(q('#interval'),input);assert.equal(input.value,'37');
 console.log('PASS: persistent cards/header/nav/icons/progress, 25 result changes, no scroll writes, focus, keyed insert/delete, filters, details/reports, sheet and settings drafts.');
}finally{w.close();}
