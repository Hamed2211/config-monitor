const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),assert=require('assert');
const assets=path.resolve(__dirname,'../../app/src/main/assets'),origin='https://panel.configmonitor.top';
assert.equal(JSON.parse(fs.readFileSync(path.join(assets,'platform.json'),'utf8')).origin,origin);
for(const language of ['fa','en'])for(const theme of ['dark','light']){
 const dom=new JSDOM(fs.readFileSync(path.join(assets,'index.html'),'utf8'),{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,calls=[];
 let tick;w.setInterval=(fn,ms)=>{if(ms===400)tick=fn;return 1;};
 // Even a legacy snapshot must not expose the removed opt-in UI.
 const state={nodes:[],prefs:{language,theme,interval:20,running:false},events:[],permissions:{},platform:{connected:false,preset:true,prompt:true,origin,update:null}};
 w.Native={call:(op,raw)=>{calls.push({op,p:JSON.parse(raw)});return JSON.stringify(op==='snapshot'?state:{ok:true});}};
 const q=s=>{const e=d.querySelector(s);assert(e,s);return e;};
 try{w.eval(fs.readFileSync(path.join(assets,'lucide.js'),'utf8'));w.eval(fs.readFileSync(path.join(assets,'app.js'),'utf8'));
  for(const alarm of [true,false]){state.alarm=alarm;w.receive('refresh',{});tick();assert(!d.querySelector('#platform-form'));assert(!d.querySelector('#platform-consent'));}
  q('[data-nav=settings]').click();assert(!d.querySelector('[data-action=platformSettings]'));assert(!d.body.textContent.includes('Management connection'));assert(!d.body.textContent.includes('ارتباط با پنل'));
  q('[data-action=about]').click();assert(q('[data-action=platformCheck]'));assert(!d.querySelector('[data-action=platformDisconnect]'));assert(!d.querySelector('[data-action=platformErase]'));
  assert(!d.body.textContent.includes(language==='fa'?'شناسهٔ تصادفی نصب':'random installation ID'));
  assert(!calls.some(c=>['platformConfigure','platformDisconnect','platformPrompted'].includes(c.op)));
 }finally{w.close();}
}
console.log('PASS: preset origin, no manual panel settings/consent/disconnect popup even with legacy state; minimal About and update check available in fa/en and dark/light. Native automatic bootstrap is covered by JVM tests.');
