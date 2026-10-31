const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),assert=require('assert');
const assets=path.resolve(__dirname,'../../app/src/main/assets');
for(const language of ['fa','en']) for(const theme of ['dark','light']) {
 const dom=new JSDOM(fs.readFileSync(path.join(assets,'index.html'),'utf8'),{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
 const data={nodes:[{id:1,name:'Germany <primary>',host:'de01.example.com',p:'VLESS',type:'config',enabled:true,state:'good',ms:84,lastCheck:1},{id:2,name:'France',host:'fr01.example.com',p:'VLESS',type:'config',enabled:true,state:'bad',ms:-1,lastCheck:1}],prefs:{language,theme,interval:20,failureLimit:6,running:true,testUrl:'https://example.com',resumeBoot:true},permissions:{notifications:true,fullScreen:true,dnd:true,battery:true,alarmVolume:4},events:[]};
 const calls=[];
 w.Native={call:(op,raw)=>{const p=JSON.parse(raw);calls.push({op,p});if(op==='snapshot')return JSON.stringify(data);if(op==='schedule')return JSON.stringify({phase:'waiting',remainingMs:12000,intervalMs:20000});if(op==='history')return JSON.stringify({samples:[{time:1,ms:84},{time:2,ms:-1},{time:3,ms:126}]});if(op==='report')return JSON.stringify({from:3600000,up:1000,down:1000,availability:50,coverage:25,average:84,outages:1,buckets:[{time:3600000,ok:0,fail:5},{time:7200000,ok:5,fail:0}]});if(op==='settings')Object.assign(data.prefs,p);return '{"ok":true}';}};
 const q=s=>{const e=d.querySelector(s);assert(e,s);return e},click=s=>q(s).click();
 try {
  w.eval(fs.readFileSync(path.join(assets,'lucide.js'),'utf8'));w.eval(fs.readFileSync(path.join(assets,'app.js'),'utf8'));
  assert.equal(q('.mm-app').dir,language==='fa'?'rtl':'ltr');assert.equal(q('.mm-app').classList.contains('mm-light'),theme==='light');
  assert(q('.mm-countdown').contains(q('.mm-progress')));assert(q('.mm-countdown').contains(q('#next-time')));
  assert.equal(d.querySelectorAll('.mm-dashboard .mm-stat').length,3);
  assert.equal(d.querySelectorAll('.mm-card-spark polyline').length,4,'Actual failure gaps remain split in both cards');
  const card=q('[data-monitor-id="1"]');click('[data-action="searchTools"]');assert(q('#search-tools').open);assert.equal(d.activeElement,q('#search'));
  q('#search').value='draft';w.receive('refresh',{});assert.equal(q('#search').value,'draft');assert.strictEqual(q('[data-monitor-id="1"]'),card);
  click('[data-action="searchTools"]');assert(!q('#search-tools').open);assert.equal(q('[data-action="searchTools"]').getAttribute('aria-expanded'),'false');
  click('[data-nav="settings"]');const sections=[...d.querySelectorAll('.mm-section-label')].map(e=>e.textContent);
  assert.deepEqual(sections,language==='fa'?['ظاهر','پایش','هشدار','سایر']:['Appearance','Monitoring','Alerts','More']);
  assert(q('.mm-permission-summary').classList.contains('mm-good'));
  q('#interval').value='37';click('[data-segment="theme"][data-value="'+(theme==='dark'?'light':'dark')+'"]');assert.equal(q('#interval').value,'37');
  click('[data-action="alarmTest"]');assert(calls.some(c=>c.op==='alarmTest'));
  data.permissions.alarmVolume=0;click('[data-nav="home"]');w.receive('refresh',{});click('[data-nav="settings"]');assert(!q('.mm-permission-summary').classList.contains('mm-good'),'Do not report ready with muted alarm volume');
  click('[data-nav="reports"]');assert.equal(q('.mm-picker-name strong').textContent,'Germany <primary>');assert.equal(d.querySelectorAll('primary').length,0);
  assert(q('.mm-report-panel').contains(q('.mm-report-metrics')));assert(q('.mm-report-chart').compareDocumentPosition(q('.mm-report-metrics'))&w.Node.DOCUMENT_POSITION_FOLLOWING);
  const bars=d.querySelectorAll('.mm-report-bar');assert.equal(bars[0].style.getPropertyValue('--health'),'0%');assert.equal(bars[1].style.getPropertyValue('--health'),'100%');assert(bars[2].classList.contains('mm-no-data'));
  const report=q('.mm-report-panel');w.receive('refresh',{});assert.strictEqual(q('.mm-report-panel'),report);
  click('[data-hours="168"]');assert.equal(q('[data-hours="168"]').getAttribute('aria-pressed'),'true');assert.equal(d.querySelectorAll('.mm-report-bar').length,168);
  click('[data-action="exportCsv"]');assert(calls.some(c=>c.op==='csv'&&c.p.hours===168));
 } finally {w.close();}
}
console.log('PASS: new dashboard search, settings order/drafts/readiness, report chart/metrics, real zero-success and unknown buckets, CSV, both languages and themes. DOM checks only.');
