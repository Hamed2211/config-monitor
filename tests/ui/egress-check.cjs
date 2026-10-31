const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),assert=require('assert');
const assets=path.resolve(__dirname,'../../app/src/main/assets');
for(const language of ['fa','en'])for(const theme of ['dark','light']){
 const dom=new JSDOM(fs.readFileSync(path.join(assets,'index.html'),'utf8'),{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
 const node={id:1,name:'Tunnel',host:'iran-entry.example',p:'VLESS',transport:'TCP',type:'config',enabled:true,state:'good',ms:80,countryCode:'DE',egressAt:Date.now(),egressState:'ok',exitIp:'8.8.8.8',samples:[]};
 const state={version:'2.2.1',nodes:[node],prefs:{language,theme,interval:20,running:true},permissions:{},events:[],platform:{update:null}},calls=[];
 w.Native={call:(op,raw)=>{const args=JSON.parse(raw);calls.push({op,args});return JSON.stringify(op==='snapshot'?state:op==='history'?{samples:[]}:{ok:true});}};
 try{
 w.eval(fs.readFileSync(path.join(assets,'lucide.js'),'utf8'));w.eval(fs.readFileSync(path.join(assets,'app.js'),'utf8'));
 d.querySelector('[data-detail="1"]').click();let panel=()=>d.querySelector('.mm-exit-panel');
 assert(panel());assert(panel().textContent.includes('🇩🇪'));assert.equal(panel().querySelector('bdi').textContent,'8.8.8.8');assert(!panel().textContent.includes('ipify'));
 panel().querySelector('[data-action=copyExit]').click();assert(calls.some(x=>x.op==='copy'&&x.args.text==='8.8.8.8'));
 panel().querySelector('[data-action=egressRefresh]').click();assert(calls.some(x=>x.op==='egressRefresh'&&x.args.id===1));
 node.egressState='checking';w.receive('refresh',{});assert(panel().querySelector('[data-action=egressRefresh]').disabled);assert(panel().textContent.includes(language==='fa'?'در حال بررسی':'Checking'));
 node.egressState='stale';w.receive('refresh',{});assert(panel().textContent.includes(language==='fa'?'آخرین نتیجه':'Last result'));assert.equal(panel().querySelector('bdi').textContent,'8.8.8.8');
 node.egressState='unknown';node.countryCode='';node.exitIp='';node.egressAt=0;w.receive('refresh',{});assert.equal(panel().querySelector('bdi').textContent,'—');assert(panel().textContent.includes(language==='fa'?'کشور نامشخص':'Country unknown'));assert(!panel().textContent.includes(node.host));
 node.enabled=false;w.receive('refresh',{});assert(panel().querySelector('[data-action=egressRefresh]').disabled);
 }finally{w.close();}
}
console.log('PASS: configuration management exit IP/country, manual refresh, stale/unknown/checking states, no entry-host fallback, disabled controls; both languages and themes.');
