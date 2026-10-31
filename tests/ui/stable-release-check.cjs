const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),assert=require('assert');
const assets=path.resolve(__dirname,'../../app/src/main/assets');
for(const language of ['fa','en'])for(const theme of ['dark','light']){
 const dom=new JSDOM(fs.readFileSync(path.join(assets,'index.html'),'utf8'),{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
 let tick;w.setInterval=(f,ms)=>{if(ms===400)tick=f;return 1;};
 const node={id:1,name:'Private config',host:'private.example.com',p:'VLESS',type:'config',enabled:true,state:'good',ms:80,countryCode:'DE',countryFa:'آلمان',countryEn:'Germany',samples:[]};
 const state={version:'2.2.0',nodes:[node],prefs:{language,theme,interval:20,running:true},permissions:{},events:[],platform:{update:null}};
 const calls=[];w.Native={call:(op,raw)=>{const args=JSON.parse(raw);calls.push({op,args});if(op==='settings')Object.assign(state.prefs,args);return JSON.stringify(op==='snapshot'?state:{ok:true});}};
 try{
  w.eval(fs.readFileSync(path.join(assets,'lucide.js'),'utf8'));w.eval(fs.readFileSync(path.join(assets,'app.js'),'utf8'));
  const click=s=>{assert(d.querySelector(s),s);d.querySelector(s).click();};
  assert(d.querySelector('.mm-country').textContent.includes('🇩🇪'));
  assert(d.querySelector('.mm-country').textContent.includes(language==='fa'?'آلمان':'Germany'));
  click('[data-action=hideAddresses]');assert.equal(state.prefs.hideAddresses,true);assert(!d.querySelector('.mm-config-card').outerHTML.includes(node.host));
  for(let i=0;i<10;i++){node.ms++;w.receive('refresh',{});assert(!d.querySelector('.mm-config-card').outerHTML.includes(node.host));}
  assert.equal(d.querySelector('[data-action=hideAddresses]').getAttribute('aria-pressed'),'true');
  click('[data-action=hideAddresses]');assert(d.querySelector('.mm-host').textContent.includes(node.host));
  delete node.countryCode;w.receive('refresh',{});assert(d.querySelector('.mm-country').textContent.includes(language==='fa'?'نامشخص':'unknown'));
  state.platform.update={code:21,version:'2.3.0',notes:'Line one\n<script>bad()</script>',size:1024*1024};w.receive('refresh',{});tick();
  assert(d.querySelector('.mm-update-modal .mm-update-popup'));assert.equal(d.querySelectorAll('.mm-version-transition strong').length,2);assert(!d.querySelector('#mm-modal script'));
  click('#mm-modal');assert(d.querySelector('#mm-modal').hidden);tick();assert(d.querySelector('#mm-modal').hidden);
  state.alarm=true;state.platform.update.code=22;w.receive('platformChecked',{});assert(d.querySelector('#mm-modal').hidden);
 }finally{w.close();}
}
console.log('PASS: country/flag and unknown states, persistent privacy action across refresh, panel-style update popup, escaped notes, backdrop dismissal and active-alarm exclusion in both languages/themes.');
