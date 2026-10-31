const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),assert=require('assert');
const assets=path.resolve(__dirname,'../../app/src/main/assets');
for(const language of ['fa','en'])for(const theme of ['dark','light']){
 const dom=new JSDOM(fs.readFileSync(path.join(assets,'index.html'),'utf8'),{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,calls=[];
 const state={version:'2.0.0-beta3',nodes:[],prefs:{language,theme,interval:20,running:false},events:[],permissions:{}};
 w.Native={call:(op,raw)=>{calls.push({op,p:JSON.parse(raw)});return JSON.stringify(op==='snapshot'?state:{ok:true});}};
 const q=s=>{const el=d.querySelector(s);assert(el,s);return el;};
 try{w.eval(fs.readFileSync(path.join(assets,'lucide.js'),'utf8'));w.eval(fs.readFileSync(path.join(assets,'app.js'),'utf8'));q('[data-nav=settings]').click();assert(d.body.textContent.includes(state.version));assert(!d.body.textContent.includes('1.8.0-beta1'));q('[data-action=about]').click();assert(d.body.textContent.includes('configmonitor.top'));assert(d.body.textContent.includes('@configmonitor'));assert(d.body.textContent.includes(state.version));q('[data-about-link=site]').click();q('[data-about-link=telegram]').click();assert.deepEqual(calls.filter(c=>c.op==='aboutLink').map(c=>c.p),[{key:'site'},{key:'telegram'}]);state.version='2.1.0';w.receive('refresh',{});assert(d.body.textContent.includes('2.1.0'));assert(!d.body.textContent.includes('2.0.0-beta3'));q('[data-action=back]').click();assert(q('[data-action=about]'));}finally{w.close();}
}
console.log('PASS: Settings → About us, website/Telegram actions, runtime version refresh, back navigation in fa/en and dark/light.');
