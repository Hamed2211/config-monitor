const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),assert=require('assert');
const assets=path.resolve(__dirname,'../../app/src/main/assets');
for(const language of ['fa','en'])for(const theme of ['dark','light']){
 const dom=new JSDOM(fs.readFileSync(path.join(assets,'index.html'),'utf8'),{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,calls=[];
 const state={version:'2.3.0',nodes:[],prefs:{language,theme,interval:20,running:true},permissions:{},events:[],platform:{update:null}};
 w.Native={call:(op,raw)=>{const args=JSON.parse(raw);calls.push({op,args});if(op==='settings')Object.assign(state.prefs,args);return JSON.stringify(op==='snapshot'?state:{ok:true});}};
 const q=s=>{const e=d.querySelector(s);assert(e,s);return e;},change=e=>e.dispatchEvent(new w.Event('change',{bubbles:true})),submit=()=>q('#alert-schedule-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 try{
 w.eval(fs.readFileSync(path.join(assets,'lucide.js'),'utf8'));w.eval(fs.readFileSync(path.join(assets,'app.js'),'utf8'));
 q('[data-nav=settings]').click();let master=q('[data-toggle=alertsEnabled]');assert(master.checked);master.checked=false;change(master);assert.equal(state.prefs.alertsEnabled,false);assert.equal(state.prefs.running,true);
 q('[data-action=alertSchedule]').click();assert(q('#alert-window-fields').disabled);assert.equal(d.querySelectorAll('[name=alert-day]').length,7);
 let enabled=q('#alert-schedule-enabled');enabled.checked=true;change(enabled);assert(!q('#alert-window-fields').disabled);
 for(const e of d.querySelectorAll('[name=alert-day]'))e.checked=e.value==='6';q('#alert-start').value='22:00';q('#alert-end').value='07:00';w.receive('refresh',{});assert.equal(q('#alert-start').value,'22:00');submit();assert.equal(state.prefs.alertScheduleEnabled,true);assert.equal(state.prefs.alertDays,64);assert.equal(state.prefs.alertStart,1320);assert.equal(state.prefs.alertEnd,420);assert.equal(state.prefs.alertsEnabled,false);assert(!d.body.textContent.includes('NaN'));
 q('[data-action=alertSchedule]').click();assert.equal(q('#alert-start').value,'22:00');assert.equal(q('[name=alert-day][value="6"]').checked,true);let count=calls.filter(c=>c.op==='settings').length;
 for(const e of d.querySelectorAll('[name=alert-day]'))e.checked=false;submit();assert.equal(calls.filter(c=>c.op==='settings').length,count);
 q('[name=alert-day][value="6"]').checked=true;q('#alert-end').value='22:00';submit();assert.equal(calls.filter(c=>c.op==='settings').length,count);
 enabled=q('#alert-schedule-enabled');enabled.checked=false;change(enabled);submit();assert.equal(state.prefs.alertScheduleEnabled,false);assert(q('[data-action=alertSchedule]'));
 q('[data-action=about]').click();assert(!d.querySelector('.mm-about-card p'));assert(d.body.textContent.includes('2.3.0'));assert(q('[data-action=platformCheck]'));
 }finally{w.close();}
}
console.log('PASS: alert master switch, monitoring independence, schedule persistence, draft stability, overnight/day selection, validation, disabled schedule, minimal About; fa/en and light/dark.');
