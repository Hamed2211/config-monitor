const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('assert'),path=require('path');const assets=path.resolve(__dirname,'../../app/src/main/assets');
const dom=new JSDOM(fs.readFileSync(path.join(assets,'index.html'),'utf8'),{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;let calls=[];
let state={nodes:[{id:1,name:'Germany',raw:'vless://example',p:'VLESS',host:'de01.example.net',transport:'TCP',type:'config',enabled:true,state:'good',ms:84}],prefs:{language:'fa',theme:'dark',interval:20,testUrl:'https://example.com',targets:['https://example.com'],running:true,tone:'builtin:gentle'},permissions:{},events:[]},schedule={phase:'waiting',remainingMs:15000,intervalMs:20000,active:0,queued:0};
w.Native={call:(op,raw)=>{const p=JSON.parse(raw);calls.push({op,p});if(op==='snapshot')return JSON.stringify(state);if(op==='schedule')return JSON.stringify(schedule);if(op==='history')return JSON.stringify({samples:[{time:1,ms:50},{time:2,ms:65},{time:3,ms:-1},{time:4,ms:80},{time:5,ms:60}]});if(op==='settings')Object.assign(state.prefs,p);if(op==='report')return '{"buckets":[],"from":1000,"up":0,"down":0,"coverage":0,"average":-1}';return '{"ok":true}';}};
w.eval(fs.readFileSync(path.join(assets,'app.js'),'utf8'));const q=s=>{const el=d.querySelector(s);assert(el,'Missing '+s);return el},click=s=>q(s).click();
assert(!q('#mm-view').contains(q('.mm-head')));assert(q('#mm-topbar').contains(q('.mm-head')));assert(q('#mm-nav'));assert(q('.mm-card-meta .mm-host'));assert(q('.mm-card-meta .mm-proto'));assert.equal(q('.mm-latency small').textContent,'ms');assert.equal(q('.mm-latency').dir,'ltr');assert(q('#next-time').textContent.includes('۱۵'));
assert.equal(d.querySelectorAll('.mm-card-spark polyline').length,2,'Never connect the chart across a failed test');
assert.equal(d.querySelectorAll('.mm-card-spark circle').length,5,'Each actual result is represented');
q('.mm-search-tools').open=true;
const historyCalls=calls.filter(c=>c.op==='history').length;
w.receive('refresh',{});
assert.equal(calls.filter(c=>c.op==='history').length,historyCalls,'Refresh must reuse unchanged history');
assert(q('.mm-search-tools').open,'Background refresh must preserve search expansion');
state.nodes[0].lastCheck=12345;w.receive('refresh',{});
assert.equal(calls.filter(c=>c.op==='history').length,historyCalls+1,'New result must refresh history');

for(const phase of ['checking','queued']){schedule={...schedule,phase,active:2};w.receive('refresh',{});assert(q('#next-label').hidden);assert(q('#next-time').textContent.includes('ثانیه'));}
schedule={...schedule,phase:'offline'};w.receive('refresh',{});assert(q('#next-time').textContent.includes('اینترنت'));
click('[data-action="add"]');assert(!q('#mm-modal').hidden);click('[data-action="addLinks"]');assert(q('.mm-sheet-scroll').contains(q('#add-form')));assert(q('.mm-sheet-actions').contains(q('[type="submit"]')));assert.equal(q('[type="submit"]').getAttribute('form'),'add-form');q('#raw').value='keep this draft';w.receive('refresh',{});assert.equal(q('#raw').value,'keep this draft');w.back();assert(q('#mm-modal').hidden);
click('[data-detail="1"]');assert(q('#mm-topbar').textContent.includes('Germany'));q('#mm-view').scrollTop=300;w.receive('refresh',{});assert.equal(q('#mm-view').scrollTop,300);click('[data-action="rules"]');click('[data-action="back"]');assert(q('#mm-topbar').textContent.includes('Germany'));click('[data-nav="reports"]');q('#report-node');click('[data-nav="settings"]');click('[data-segment="language"][data-value="en"]');click('[data-nav="home"]');assert.equal(q('.mm-app').dir,'ltr');assert(q('.mm-card-meta .mm-host'));
state.nodes=[];click('[data-nav="reports"]');w.receive('refresh',{});assert(q('#mm-view').textContent.includes('No monitors yet'));console.log('PASS: fixed header outside scroller; real scheduler states; no fake reset; RTL/LTR metadata and inline ms; bottom navigation; sheet footer outside form scrolling; draft and scroll preservation; report selector and empty state.');w.close();
