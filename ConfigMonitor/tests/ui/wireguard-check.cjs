const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),assert=require('assert');
const assets=path.resolve(__dirname,'../../app/src/main/assets');
for(const language of ['fa','en'])for(const theme of ['dark','light']){
 const dom=new JSDOM(fs.readFileSync(path.join(assets,'index.html'),'utf8'),{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window,d=w.document;
 const at=1700000000000,from=Math.floor(at/36e5)*36e5;
 const samples=[{time:at,ms:0},{time:at+20000,ms:-1},{time:at+40000,ms:123}];
 const state={nodes:[{id:1,name:'WireGuard',host:'example.com:51820',p:'WireGuard',type:'config',enabled:true,state:'good',ms:0,lastCheck:at,uptime:99.2,observedMs:5000},{id:2,name:'New',host:'example.com',p:'VLESS',type:'config',enabled:true,state:'pending',ms:-1,uptime:-1,observedMs:0}],prefs:{language,theme,interval:20,running:true},events:[],permissions:{}};const calls=[];
 w.Native={call:(op,raw)=>{const p=JSON.parse(raw);calls.push({op,p});if(op==='snapshot')return JSON.stringify(state);if(op==='history')return JSON.stringify({samples:p.id===1?samples:[]});if(op==='report')return JSON.stringify({from,hours:24,up:1000,down:100,availability:90.9,buckets:[{time:from,ok:2,fail:1,average:61},{time:from+36e5,ok:0,fail:2,average:-1}]});return '{"ok":true}';}};
 const q=s=>{const el=d.querySelector(s);assert(el,s);return el},click=s=>q(s).click(),key=(sel,k)=>q(sel).dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true}));
 const number=n=>n.toLocaleString(language==='fa'?'fa-IR':'en-US');
 try{
  w.eval(fs.readFileSync(path.join(assets,'lucide.js'),'utf8'));w.eval(fs.readFileSync(path.join(assets,'app.js'),'utf8'));
  assert(q('[data-monitor-id="1"] .mm-uptime').textContent.includes(number(99.2)));assert(q('[data-monitor-id="2"] .mm-uptime').textContent.includes('—'));
  assert.equal(q('[data-monitor-id="1"] .mm-latency b').textContent,number(0));
  let chart=q('[data-chart="card-1"]');chart.focus();chart.querySelector('.mm-chart-surface').getBoundingClientRect=()=>({left:10,width:300});chart.querySelector('svg').dispatchEvent(new w.MouseEvent('click',{bubbles:true,clientX:160}));
  assert(chart.querySelector('output').textContent.includes(language==='fa'?'بدون پاسخ':'No response'));assert.strictEqual(q('[data-chart="card-1"]'),chart);assert.strictEqual(d.activeElement,chart);
  key('[data-chart="card-1"]','End');assert(chart.querySelector('output').textContent.includes(number(123)+' ms'));assert(chart.querySelector('.mm-chart-cursor').style.left==='99%');
  const text=chart.querySelector('output').textContent;state.nodes[0].lastCheck+=20000;state.nodes[0].ms=80;samples.push({time:at+60000,ms:80});w.receive('refresh',{});assert.strictEqual(q('[data-chart="card-1"]'),chart);assert.equal(chart.querySelector('output').textContent,text);
  key('[data-chart="card-1"]','Home');assert(chart.querySelector('output').textContent.includes(number(0)+' ms'));
  click('[data-detail="1"]');key('[data-chart="detail-1"]','End');assert(q('[data-chart="detail-1"] output').textContent.includes(number(80)+' ms'));key('[data-chart="detail-1"]','Home');key('[data-chart="detail-1"]','ArrowRight');assert(q('[data-chart="detail-1"] output').textContent.includes(language==='fa'?'بدون پاسخ':'No response'));
  click('[data-nav=reports]');key('[data-chart="report-1-24"]','Home');assert(q('[data-chart="report-1-24"] output').textContent.includes(language==='fa'?'میانگین ساعت':'Hourly average'));assert(q('[data-chart="report-1-24"] output').textContent.includes(number(61)+' ms'));key('[data-chart="report-1-24"]','ArrowRight');assert(q('[data-chart="report-1-24"] output').textContent.includes(language==='fa'?'بدون پاسخ موفق':'No successful response'));key('[data-chart="report-1-24"]','End');assert(q('[data-chart="report-1-24"] output').textContent.includes(language==='fa'?'بدون داده':'No data'));
  click('[data-nav=home]');click('[data-action=add]');click('[data-action=configFile]');assert(calls.some(c=>c.op==='configFile'));w.receive('import',{raw:'[Interface]\nPrivateKey = sample\n[Peer]'});assert(q('#raw').value.startsWith('[Interface]'));assert(q('.mm-protocols').textContent.includes('WireGuard'));assert(d.body.textContent.includes(language==='fa'?'DNS سیستم':'system DNS'));
  // Numeric fallback must also work on WebViews which return ASCII for fa-IR.
  w.Number.prototype.toLocaleString=function(){return String(this.valueOf());};w.receive('refresh',{});click('[data-action=back]');click('[data-nav=home]');assert(q('[data-monitor-id="1"] .mm-latency b').textContent.includes(language==='fa'?'۸۰':'80'));
 }finally{w.close();}
}
console.log('PASS: WireGuard file import UI; observed uptime/unknown; touch and keyboard chart selection; zero/failure/unknown samples; hourly averages; persistent selection/focus; numeral fallback in fa/en, dark/light.');
