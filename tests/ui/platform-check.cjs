const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),assert=require('assert');
const assets=path.resolve(__dirname,'../../app/src/main/assets');
for(const language of ['fa','en'])for(const theme of ['dark','light']){
 const dom=new JSDOM(fs.readFileSync(path.join(assets,'index.html'),'utf8'),{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window,d=w.document,calls=[];
 let tick;w.setInterval=(fn,ms)=>{if(ms===400)tick=fn;return 1;};
 const state={nodes:[],prefs:{language,theme,interval:20,running:false},events:[],permissions:{},platform:{connected:true,origin:'https://panel.configmonitor.top',update:null}};
 w.Native={call:(op,raw)=>{const p=JSON.parse(raw);calls.push({op,p});return JSON.stringify(op==='snapshot'?state:{ok:true});}};
 const q=s=>{const e=d.querySelector(s);assert(e,s);return e;},click=s=>q(s).click();
 try{
  w.eval(fs.readFileSync(path.join(assets,'lucide.js'),'utf8'));w.eval(fs.readFileSync(path.join(assets,'app.js'),'utf8'));
  assert(!d.querySelector('#platform-ad-slot'));
  w.receive('platformAd',{available:true});assert(q('#platform-ad-slot'));click('[data-category=server]');assert(!d.querySelector('#platform-ad-slot'));click('[data-category=config]');assert(q('#platform-ad-slot'));
  w.receive('platformAd',{available:false});assert(!d.querySelector('#platform-ad-slot'));
  click('[data-nav=settings]');click('[data-action=about]');click('[data-action=platformCheck]');assert(calls.some(c=>c.op==='platformCheck'));
  state.platform.update={code:17,version:'2.0.1',notes:'Fix <script>unsafe()</script>',size:20971520};w.receive('platformChecked',{});assert(q('[data-action=platformDownload]'));assert(d.body.textContent.includes('<script>unsafe()</script>'));assert(!d.querySelector('.mm-sheet script'));click('[data-action=platformDownload]');assert(calls.some(c=>c.op==='platformDownload'));
  // Automatic update remains deferred during an alarm and appears afterwards.
  click('[data-nav=home]');state.platform.update={code:18,version:'2.0.2',notes:'Update',size:1000};state.alarm=true;w.receive('refresh',{});tick();assert(!d.querySelector('[data-action=platformDownload]'));
  state.alarm=false;w.receive('refresh',{});tick();assert(q('[data-action=platformDownload]'));click('[data-action=platformLater]');tick();assert(!d.querySelector('[data-action=platformDownload]'));
 }finally{w.close();}
}
console.log('PASS: automatic connection UI, ad hiding/category scope, About update check, escaped release notes, download, alarm deferral and Later behavior in fa/en and dark/light.');
