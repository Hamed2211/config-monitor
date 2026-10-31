const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),assert=require('assert');
const assets=path.resolve(__dirname,'../../app/src/main/assets');
for(const language of ['fa','en'])for(const theme of ['dark','light']){
 const dom=new JSDOM(fs.readFileSync(path.join(assets,'index.html'),'utf8'),{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
 const state={nodes:[{id:1,name:'Config',type:'config',host:'example.com',p:'VLESS',enabled:true,state:'good',ms:70},{id:2,name:'IP server',type:'server',host:'2001:db8::1',raw:'https://[2001:db8::1]:22',method:'TCP',p:'TCP',enabled:true,state:'good',ms:10}],prefs:{language,theme,interval:20,running:true},events:[],permissions:{}};const calls=[];
 w.Native={call:(op,raw)=>{const p=JSON.parse(raw);calls.push({op,p});if(op==='snapshot')return JSON.stringify(state);if(op==='history')return '{"samples":[]}';if(op==='report')return '{"buckets":[]}';if(op==='save'){const n={id:p.id||3,...p,host:'2001:db8::2',p:p.method,enabled:true};if(p.id)state.nodes[state.nodes.findIndex(n=>n.id===p.id)]=n;else state.nodes.push(n);}return '{"ok":true}';}};
 const q=s=>{const e=d.querySelector(s);assert(e,s);return e},click=s=>q(s).click();
 try{
  w.eval(fs.readFileSync(path.join(assets,'lucide.js'),'utf8'));w.eval(fs.readFileSync(path.join(assets,'app.js'),'utf8'));
  assert.equal(d.querySelectorAll('[data-category]').length,3);click('[data-category=server]');assert.equal(d.querySelectorAll('[data-monitor-id]').length,1);assert(q('[data-monitor-id="2"]'));
  click('[data-action=add]');assert(!q('#mm-modal').hidden);assert.equal(q('input[name=method]:checked').value,'ICMP');assert(q('#server-port-field').hidden);assert.equal(d.querySelectorAll('select#method').length,0);
  q('#raw').value='2001:db8::2';q('#name').value='draft';click('#method-menu summary');assert(q('#method-menu').open);click('input[name=method][value=TCP]');assert(!q('#method-menu').open);assert(!q('#server-port-field').hidden);assert(q('#server-port').required);q('#server-port').value='8443';w.receive('refresh',{});assert.equal(q('#raw').value,'2001:db8::2');assert.equal(q('#name').value,'draft');assert.equal(q('#server-port').value,'8443');
  click('#method-menu summary');click('#name');assert(!q('#method-menu').open);assert(!q('#mm-modal').hidden);
  q('#add-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));const save=calls.filter(c=>c.op==='save').pop().p;assert.equal(save.raw,'[2001:db8::2]:8443');assert.equal(save.type,'server');assert.equal(save.method,'TCP');assert(q('#mm-modal').hidden);
  click('[data-detail="2"]');click('[data-action=edit]');assert.equal(q('#raw').value,'2001:db8::1');assert.equal(q('#server-port').value,'22');assert.equal(q('input[name=method]:checked').value,'TCP');
  click('#method-menu summary');w.back();assert(!q('#method-menu').open);assert(!q('#mm-modal').hidden);click('#mm-modal');assert(q('#mm-modal').hidden);assert(q('[data-action=edit]'));assert(!q('#mm-view').inert);
  click('[data-nav=home]');click('[data-category=address]');click('[data-action=add]');click('[data-action=addAddress]');assert.equal(d.querySelectorAll('input[name=method]').length,4);click('#method-menu summary');click('input[name=method][value=HTTPS]');assert.equal(q('#method-value').textContent,language==='fa'?'پاسخ وب · HTTPS':'Web response · HTTPS');click('#mm-modal');assert(q('#mm-modal').hidden);
  click('[data-nav=reports]');click('#report-node');assert(d.querySelectorAll('.mm-pick-row').length===3);click('#picker-search');assert(!q('#mm-modal').hidden);click('#mm-modal');assert(q('#mm-modal').hidden);assert.equal(d.activeElement,q('#report-node'));
  click('[data-nav=home]');click('[data-category=config]');click('[data-action=add]');click('#mm-modal');assert(q('#mm-modal').hidden);assert(!calls.some(c=>c.op==='exit'),'Backdrop must not exit app');
 }finally{w.close();}
}
console.log('PASS: server tabs, ICMP/TCP controls, IPv6 payload, editing, protected drafts, address method menu, backdrop/back dismissal, report picker; both languages and themes.');
