"use strict";
const app = document.querySelector(".mm-app"), view = document.querySelector("#mm-view"), toast = document.querySelector("#mm-toast");
let data = { nodes: [], prefs: { language: "fa", theme: "dark", interval: 20 }, permissions: {}, events: [] }, screen = "home", category = "config", filter = "all", selected = 0, editing = 0, limit = 50, search = "", mode = "links", timer, history = [];
const t = (fa, en) => data.prefs.language === "fa" ? fa : en, esc = (s) => String(s != null ? s : "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]), num = (n) => localDigits(Number(n).toLocaleString(data.prefs.language === "fa" ? "fa-IR" : "en-US")), icon = (n) => `<i data-lucide="${n}" aria-hidden="true"></i>`;
function localDigits(value) {
  const ascii=String(value).replace(/[۰-۹٠-٩]/g,c=>String(c.charCodeAt(0)-(c>='۰'?1776:1632)));
  return data.prefs.language==='fa'?ascii.replace(/[0-9]/g,c=>'۰۱۲۳۴۵۶۷۸۹'[+c]):ascii;
}
function call(op, p = {}) {
  try {
    return JSON.parse(Native.call(op, JSON.stringify(p)));
  } catch (e) {
    return { ok: false, error: t("\u0627\u0631\u062A\u0628\u0627\u0637 \u0628\u0627 \u0628\u0631\u0646\u0627\u0645\u0647 \u0628\u0631\u0642\u0631\u0627\u0631 \u0646\u0634\u062F", "App connection failed") };
  }
}
function action(op, p = {}) {
  const r = call(op, p);
  if (r.ok === false) notify(r.error);
  return r;
}
function notify(text) {
  toast.textContent = text;
  toast.hidden = false;
  clearTimeout(timer);
  timer = setTimeout(() => toast.hidden = true, 4200);
}
function sync() {
  const r = call("snapshot");
  if (r.nodes) data = r;
}
// Expand only new placeholders, including detached render templates. Existing SVG
// icons must remain mounted during a refresh (createIcons scans/replaces them too).
function icons(root = document) {
  if (!window.lucide) return;
  root.querySelectorAll('i[data-lucide]').forEach(el => {
    const name = el.getAttribute('data-lucide');
    const definition = lucide.icons[name.replace(/(^|-)(\w)/g, (_, dash, ch) => ch.toUpperCase())];
    if (!definition) return;
    const attrs = Object.assign({}, definition[1], { 'stroke-width': 1.7 });
    Array.from(el.attributes).forEach(attr => attrs[attr.name] = attr.value);
    attrs.class = ['lucide', 'lucide-' + name, attrs.class || ''].join(' ').trim();
    el.replaceWith(lucide.createElement([definition[0], attrs, definition[2]]));
  });
}

function toggle(on, key, label) {
  return `<label class="mm-switch"><input type="checkbox" data-toggle="${key}" ${on ? "checked" : ""} aria-label="${esc(label)}"></label>`;
}
function ib(name, action2, label) {
  return `<button class="mm-icon" data-action="${action2}" aria-label="${esc(label)}">${icon(name)}</button>`;
}
function header(title, back = true, right = "") {
  return `<header class="mm-head">${back ? ib(data.prefs.language === "fa" ? "arrow-right" : "arrow-left", "back", t("\u0628\u0627\u0632\u06AF\u0634\u062A", "Back")) : ""}<div class="mm-head-title"><h1>${esc(title)}</h1></div>${right}</header>`;
}
const current = () => data.nodes.find((n) => n.id === selected);
function state(n) {
  if (!n.enabled) return "paused";
  return n.state || "pending";
}
function status(s) {
  return { good: t("\u062F\u0631 \u062F\u0633\u062A\u0631\u0633", "Online"), slow: t("\u06A9\u0646\u062F", "Slow"), bad: t("\u0628\u062F\u0648\u0646 \u067E\u0627\u0633\u062E", "No response"), paused: t("\u062E\u0627\u0645\u0648\u0634", "Paused"), pending: t("\u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631 \u062A\u0633\u062A", "Awaiting test"), unknown: t("\u0627\u06CC\u0646\u062A\u0631\u0646\u062A \u0646\u0627\u0645\u0634\u062E\u0635", "Network unavailable") }[s] || s;
}
function time(ms) {
  return ms ? localDigits(new Date(ms).toLocaleTimeString(data.prefs.language === "fa" ? "fa-IR" : "en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })) : "\u2014";
}
// Cache only visible cards, invalidated by the actual last-result timestamp.
let searchToolsOpen = false;
const sparkCache = new Map();
const chartSelections=new Map(), chartData=new Map();
function chartText(sample, hourly) {
  if(!sample)return t('نمودار را لمس کن تا پینگ را ببینی','Tap the chart to inspect response time');
  const stamp=localDigits(new Date(sample.time).toLocaleDateString(data.prefs.language==='fa'?'fa-IR':'en-US'))+' · '+time(sample.time);
  if(hourly){const count=(sample.ok||0)+(sample.fail||0);return stamp+' · '+(count?t('میانگین ساعت: ','Hourly average: ')+(sample.average>=0?num(sample.average)+' ms':t('بدون پاسخ موفق','No successful response'))+' · '+num(sample.fail||0)+t(' تست ناموفق',' failed checks'):t('بدون داده','No data'));}
  return stamp+' · '+(sample.ms>=0?num(sample.ms)+' ms':t('بدون پاسخ','No response'));
}
function interactiveChart(key,samples,markup,hourly=false,inset=0) {
  chartData.set(key,{samples,hourly,inset});
  const chosen=chartSelections.get(key),index=samples.findIndex(x=>x.time===chosen),sample=index<0?null:samples[index];
  const readout=chartText(sample,hourly),hint=t('لمس یا کلیدهای جهت برای انتخاب زمان','Tap or use arrow keys to select a time');
  return `<div class="mm-interactive-chart" data-chart="${key}" tabindex="0" role="slider" aria-label="${hint}" aria-valuemin="0" aria-valuemax="${Math.max(0,samples.length-1)}" aria-valuenow="${Math.max(0,index)}" aria-valuetext="${esc(readout)}"><div class="mm-chart-surface">${markup}${index>=0?`<span class="mm-chart-cursor" style="left:${inset+(100-2*inset)*index/Math.max(1,samples.length-1)}%"></span>`:''}</div><output class="mm-chart-readout ${sample?'mm-chart-picked':''}" aria-live="polite">${esc(readout)}</output></div>`;
}
function inspectChart(el,index) {
  const record=chartData.get(el.dataset.chart);if(!record||!record.samples.length)return;
  const sample=record.samples[Math.max(0,Math.min(record.samples.length-1,index))];
  chartSelections.set(el.dataset.chart,sample.time);render(true);
}
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-chart]');if(!el)return;
  const record=chartData.get(el.dataset.chart),box=el.querySelector('.mm-chart-surface').getBoundingClientRect();if(!record||!box.width)return;
  const inset=record.inset/100,ratio=(e.clientX-box.left)/box.width;
  inspectChart(el,Math.round((ratio-inset)/(1-2*inset)*Math.max(1,record.samples.length-1)));
});
document.addEventListener('keydown',e=>{
  const el=e.target.closest('[data-chart]');if(!el||!['ArrowLeft','ArrowRight','Home','End','Enter',' '].includes(e.key))return;
  const record=chartData.get(el.dataset.chart);if(!record||!record.samples.length)return;e.preventDefault();
  const at=record.samples.findIndex(x=>x.time===chartSelections.get(el.dataset.chart));
  inspectChart(el,e.key==='Home'?0:e.key==='End'?record.samples.length-1:e.key==='ArrowLeft'?Math.max(0,at-1):Math.min(record.samples.length-1,at+1));
});
function uptimeBadge(n){
 const known=Number.isFinite(n.uptime)&&n.uptime>=0&&n.observedMs>0;
 return `<span class="mm-uptime" title="${t('آپتایم در زمان مشاهده‌شدهٔ ۲۴ بازهٔ ساعتی اخیر؛ فاصله‌های بدون پایش محاسبه نمی‌شوند','Uptime during observed time in the last 24 hourly buckets; unmonitored gaps are excluded')}">${known?num(Math.round(n.uptime*10)/10)+t('٪','%'):'—'} <small>${t('آپتایم','uptime')}</small></span>`;
}
function sparkline(n) {
  const key = String(n.lastCheck || 0) + ':' + n.ms;
  let cached = sparkCache.get(n.id);
  if (!cached || cached.key !== key) {
    const result = call('history', {id:n.id});
    cached = {key, samples:Array.isArray(result.samples) ? result.samples.slice(-24) : []};
    sparkCache.set(n.id,cached);
    if (sparkCache.size > 100) sparkCache.delete(sparkCache.keys().next().value);
  }
  const samples=cached.samples;
  if (!samples.length) return `<div class="mm-card-spark mm-spark-empty">${t('هنوز تستی ثبت نشده','No checks yet')}</div>`;
  const max=Math.max(1,...samples.filter(x=>Number.isFinite(x.ms)&&x.ms>=0).map(x=>x.ms));
  let lines=[], run=[], dots=[];
  samples.forEach((p,i)=>{
    const x=3+i*294/Math.max(1,samples.length-1), ok=Number.isFinite(p.ms)&&p.ms>=0, y=ok?23-p.ms/max*18:26;
    if(ok) run.push(`${x},${y}`); else {if(run.length)lines.push(run.join(' '));run=[];}
    dots.push(`<circle cx="${x}" cy="${y}" r="${ok?1.4:2}" fill="var(--mm-${ok?'mint':'red'})"/>`);
  });
  if(run.length)lines.push(run.join(' '));
  return `<div class="mm-card-spark">${interactiveChart("card-"+n.id,samples,`<svg viewBox="0 0 300 30" preserveAspectRatio="none" role="img" aria-label="${t('روند تست‌های اخیر؛ نقاط قرمز تست ناموفق هستند','Recent checks; red dots are failed checks')}">${lines.map(p=>`<polyline points="${p}" fill="none" stroke="var(--mm-mint)" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`).join('')}${dots.join('')}</svg>`,false,1)}</div>`;
}
function countryBadge(n) {
  const code=String(n.countryCode||'').toUpperCase();
  let label=t('کشور نامشخص','Country unknown'),flag='';
  if(/^[A-Z]{2}$/.test(code)){label=n[data.prefs.language==='fa'?'countryFa':'countryEn']||code;
    try{label=new Intl.DisplayNames([data.prefs.language],{type:'region'}).of(code)||label;}catch(_){}
    flag=String.fromCodePoint(...[...code].map(c=>127397+c.charCodeAt(0)));}
  return `<span class="mm-country" title="${n.type==='config'?t('کشور IP خروجی مشاهده‌شده از داخل کانفیگ','Country of the exit IP observed through this configuration'):t('کشور تقریبی IP سرور','Approximate server IP country')}"><span aria-hidden="true">${flag||'◌'}</span><span>${esc(label)}</span>${n.type==='config'&&['stale','checking'].includes(n.egressState)&&n.egressAt?`<small>${t('آخرین خروجی','Last exit')}</small>`:''}</span>`;
}
function exitLocation(n) {
 const config=n.type==='config',pending=n.egressState==='checking',stale=n.egressState==='stale';
 if(!config)return `<section class="mm-exit-panel"><div class="mm-row"><h3>${t('موقعیت سرور','Server location')}</h3>${countryBadge(n)}</div></section>`;
 return `<section class="mm-exit-panel"><div class="mm-exit-heading"><span class="mm-exit-symbol">${icon('globe')}</span><h3>${t('خروجی کانفیگ','Configuration exit')}</h3></div><div class="mm-exit-country">${countryBadge(n)}</div><div class="mm-exit-address"><span class="mm-label">${t('IP خروجی','Exit IP')}</span><div class="mm-exit-ip" dir="ltr"><bdi dir="ltr">${esc(n.exitIp||'—')}</bdi><button class="mm-exit-copy" data-action="copyExit" aria-label="${t('کپی IP خروجی','Copy exit IP')}" ${!n.exitIp?'disabled':''}>${icon('copy')}</button></div></div><div class="mm-exit-bottom"><span class="mm-muted">${pending?t('در حال بررسی…','Checking…'):stale?t('آخرین نتیجه','Last result'):n.egressAt?t('آخرین بررسی','Last checked'):t('بررسی نشده','Not checked')}${n.egressAt&&!pending?` · ${time(n.egressAt)}`:''}</span><button class="mm-exit-refresh" data-action="egressRefresh" ${pending||!n.enabled?'disabled':''}>${icon('refresh-cw')}${t('بررسی دوباره','Refresh')}</button></div></section>`;
}

function card(n) {
  const displayName=data.prefs.hideAddresses&&n.host?String(n.name).split(n.host).join("••••••••"):n.name;
  const s = state(n), color = ["good", "bad", "slow"].includes(s) ? "mm-" + s : "mm-muted";
  return `<article data-monitor-id="${n.id}" class="mm-item mm-config-card ${!n.enabled ? "mm-disabled" : ""}"><button class="mm-item-main" data-detail="${n.id}" aria-label="${esc(displayName)}"><span class="mm-item-title">${esc(displayName)}</span><span class="mm-card-state ${color}"><span class="mm-dot"></span>${status(s)}${countryBadge(n)}</span></button>${toggle(n.enabled, "node-" + n.id, t("\u067E\u0627\u06CC\u0634 ", "Monitor ") + displayName)}<div class="mm-card-meta"><span class="mm-host ${data.prefs.hideAddresses?'mm-host-private':''}" dir="ltr" title="${data.prefs.hideAddresses?t('آدرس مخفی است','Address hidden'):esc(n.host)}">${data.prefs.hideAddresses?'••••••••••':esc(n.host)}</span><span class="mm-protocol-meta"><span class="mm-proto" dir="ltr">${esc(n.p)}</span>${uptimeBadge(n)}</span></div><div class="mm-latency ${color}" dir="ltr"><b>${n.ms >= 0 && n.enabled ? num(n.ms) : "\u2014"}</b>${n.ms >= 0 && n.enabled ? "<small>ms</small>" : ""}</div>${sparkline(n)}</article>`;
}

let platformAdReady=false;
const platformDeferred=new Set();
function platformBounds(){if(!window.Native)return;const slot=document.getElementById('platform-ad-slot');const r=slot?.getBoundingClientRect(),v=view.getBoundingClientRect();call('adBounds',{visible:!!(platformAdReady&&slot&&modal.hidden&&screen==='home'&&appVisible),viewport:window.innerWidth,left:r?.left||0,top:r?.top||0,width:r?.width||0,height:r?.height||0,clipTop:v.top,clipBottom:v.bottom});}
function platformUpdate(force=false){
 const u=data.platform?.update;
 if(!u||data.alarm||(!force&&(screen!=='home'||!modal.hidden||platformDeferred.has(u.code))))return;
 platformDeferred.add(u.code);
 showSheet(`<div class="mm-update-popup"><button class="mm-icon mm-update-close" data-action="platformLater" aria-label="${t('بستن','Close')}">${icon('x')}</button>
 <div class="mm-update-icon">${icon('download')}</div><span class="mm-update-tag">${t('یه نسخهٔ تازه داریم','A fresh update is here')}</span>
 <h2>${t('وقت به‌روزرسانیه!','Time for an update!')}</h2><p class="mm-update-subtitle">${t('Config Monitor بهتر شده؛<br>نسخهٔ جدید رو امتحان کن.','Config Monitor just got better.<br>Try the latest version.')}</p>
 <div class="mm-version-transition"><div><small>${t('نسخهٔ فعلی','Your version')}</small><strong dir="ltr">${esc(data.version||'—')}</strong></div>${icon(data.prefs.language==='fa'?'arrow-left':'arrow-right')}<div><small>${t('نسخهٔ جدید','New version')}</small><strong dir="ltr">${esc(u.version)}</strong></div></div>
 <div class="mm-update-notes"><strong>${t('چی تازه‌ست؟','What’s new?')}</strong><p>${esc(u.notes||t('بهبود عملکرد و تجربهٔ استفاده','Performance and experience improvements'))}</p></div>
 <div class="mm-update-file"><span dir="ltr">Universal APK</span><span dir="ltr">${num(Math.round((u.size||0)/1048576))} MB</span></div>
 <button class="mm-primary mm-wide" data-action="platformDownload">${icon('download')}${t('دریافت نسخهٔ جدید','Download update')}</button><button class="mm-update-later mm-wide" data-action="platformLater">${t('بعداً یادآوری کن','Remind me later')}</button><small class="mm-muted">${t('دانلود در مرورگر؛ نصب با تأیید خودت انجام می‌شه','Download in your browser. Installation needs your approval.')}</small></div>`);
 modal.classList.add('mm-update-modal');modal.querySelector('[role=dialog]').setAttribute('aria-label',t('نسخهٔ جدید','New version'));
}
window.addEventListener('resize',platformBounds);view.addEventListener('scroll',platformBounds,{passive:true});
setInterval(()=>{platformBounds();if(appVisible&&!document.hidden){platformUpdate();}},400);

function home() {
  const enabled = data.nodes.filter(n => n.enabled), good = enabled.filter(n => n.state === 'good').length, bad = enabled.filter(n => n.state === 'bad').length;
  const nodes = data.nodes.filter(n => n.type === category && (filter === 'all' || (filter === 'paused' ? !n.enabled : n.enabled && n.state === filter)) && (!search || `${n.name} ${n.host} ${n.p}`.toLowerCase().includes(search.toLowerCase())));
  return `<header class="mm-head"><div class="mm-icon mm-brand">${icon('activity')}</div><div class="mm-head-title"><h1 class="mm-en">Config Monitor</h1><div class="mm-head-sub mm-muted">${t('پایش شبکه','Network monitoring')}</div></div>${ib('scan-line','scan',t('اسکن QR','Scan QR'))}</header>
  <section class="mm-panel mm-dashboard" aria-label="${t('خلاصهٔ پایش','Monitoring overview')}">
    <div class="mm-row"><h2>${data.prefs.running ? t('پایش فعال','Monitoring active') : t('پایش متوقف','Monitoring paused')}</h2>${toggle(data.prefs.running,'running',t('پایش خودکار','Automatic monitoring'))}</div>
    <div class="mm-stats">${[[t('کل','Total'),data.nodes.length,''],[t('سالم','Online'),good,'mm-good'],[t('قطع','Offline'),bad,bad?'mm-bad':'']].map(([label,value,cls])=>`<div class="mm-stat"><span class="mm-muted">${label}</span><strong class="${cls}">${num(value)}</strong></div>`).join('')}</div>
    <div class="mm-countdown"><span id="next-label" hidden></span><span id="next-time" class="mm-tabular"></span><div class="mm-progress" role="progressbar" aria-label="${t('زمان تا بررسی بعدی','Time until next check')}" aria-valuemin="0" aria-valuemax="100"><div id="next-fill"></div></div><span id="next-hint" hidden></span></div>
  </section>
  ${data.alarm ? `<div id="active-alert"><button class="notice" data-action="ack">${icon('bell-ring')}${t('هشدار فعال است — متوجه شدم','Alert is active — Got it')}</button><button class="mm-secondary" data-action="snooze">${icon('alarm-clock')}${t('تعویق ۱۵ دقیقه','Snooze 15 minutes')}</button></div>` : ''}
  <div class="mm-row mm-list-heading"><h2>${category==='config'?t('کانفیگ‌ها','Configurations'):category==='server'?t('سرورها','Servers'):t('آدرس‌ها','Addresses')}</h2><div class="mm-head-actions"><button class="mm-icon" data-action="hideAddresses" aria-pressed="${!!data.prefs.hideAddresses}" aria-label="${data.prefs.hideAddresses?t('نمایش آدرس‌ها','Show addresses'):t('مخفی کردن آدرس‌ها','Hide addresses')}">${icon(data.prefs.hideAddresses?'eye-off':'eye')}</button><button class="mm-icon" data-action="searchTools" aria-label="${t('جست‌وجو و فیلتر','Search & filter')}" aria-controls="search-tools" aria-expanded="${searchToolsOpen}">${icon('search')}</button>${ib('plus','add',t('افزودن مانیتور','Add monitor'))}</div></div>
  <div class="mm-tabs mm-category-tabs" role="tablist" aria-label="${t('نوع مانیتور','Monitor type')}">${[['config',t('کانفیگ‌ها','Configurations')],['address',t('آدرس‌ها','Addresses')],['server',t('سرورها','Servers')]].map(([id,label])=>`<button role="tab" aria-selected="${category===id}" class="${category===id?'mm-selected':''}" data-category="${id}">${label}</button>`).join('')}</div>
  <details id="search-tools" class="mm-search-tools" ${searchToolsOpen?'open':''}><summary>${icon('sliders-horizontal')}${t('جست‌وجو و فیلتر','Search & filter')}</summary><input id="search" class="mm-field" type="search" placeholder="${t('جست‌وجوی نام یا آدرس…','Search name or host…')}" value="${esc(search)}" aria-label="${t('جست‌وجو','Search')}"><div class="mm-filters">${[['all',t('همه','All')],['bad',t('قطع','Offline')],['slow',t('کند','Slow')],['paused',t('خاموش','Paused')]].map(([id,label])=>`<button class="${filter===id?'mm-selected':''}" data-filter="${id}" aria-pressed="${filter===id}">${label}</button>`).join('')}</div></details>
  ${platformAdReady&&category==='config'?'<div id="platform-ad-slot" style="height:144px;margin:12px 0" aria-label="Advertisement"></div>':''}<div class="mm-grid">${nodes.slice(0,limit).map(card).join('')}</div>
  ${nodes.length>limit?`<button class="mm-secondary mm-wide" data-action="more">${t('نمایش بیشتر','Show more')}</button>`:''}
  ${!nodes.length?`<div class="empty">${icon(data.nodes.length?'search-x':'radar')}<h2>${data.nodes.length?t('موردی پیدا نشد','No matches'):t('اولین مانیتور را اضافه کنید','Add your first monitor')}</h2><p class="mm-muted">${t('لینک کانفیگ، QR یا آدرس دستی','Configuration link, QR or a manual address')}</p><button class="mm-secondary" data-action="add">${icon('plus')}${t('افزودن مانیتور','Add monitor')}</button></div>`:''}
  <p class="mm-caption">${t('آستانهٔ عمومی هشدار: ','Default failure threshold: ')+num(data.prefs.failureLimit||6)}</p>`;
}

function methodLabel(value) {
  return {AUTO:t('خودکار','Automatic'),HTTPS:t('پاسخ وب · HTTPS','Web response · HTTPS'),TCP:t('پورت سرور · TCP','Server port · TCP'),ICMP:t('پینگ · ICMP','Ping · ICMP')}[value];
}
function methodPicker(value, server) {
  const descriptions={AUTO:t('انتخاب روش بر اساس نوع آدرس','Choose based on the address'),HTTPS:t('دریافت پاسخ از صفحهٔ وب','Receive a web response'),TCP:t('بررسی بازبودن پورت مشخص','Check a specific port is reachable'),ICMP:t('بررسی پاسخ مستقیم به پینگ','Check for a direct ping reply')};
  return `<label class="mm-label" id="method-label">${t('روش بررسی مستقیم','Direct check method')}</label><details id="method-menu" class="mm-method-menu"><summary class="mm-field" aria-labelledby="method-label method-value"><span id="method-value">${methodLabel(value)}</span>${icon('chevron-down')}</summary><div class="mm-method-options" role="group" aria-labelledby="method-label">${(server?['ICMP','TCP']:['AUTO','HTTPS','TCP','ICMP']).map(v=>`<label class="mm-method-option"><input type="radio" name="method" value="${v}" ${value===v?'checked':''}><span><strong>${methodLabel(v)}</strong><small>${descriptions[v]}</small></span></label>`).join('')}</div></details>`;
}
function add() {
  const n=editing?current():null, server=category==='server', direct=category!=='config', method=n?.method||(server?'ICMP':'AUTO');
  let port='443';if(server&&n){try{port=new URL(n.raw).port||'443';}catch(e){}}
  return header(editing?t('ویرایش مانیتور','Edit monitor'):server?t('افزودن سرور','Add server'):direct?t('افزودن آدرس','Add address'):t('افزودن کانفیگ','Add configuration'))+`<div class="mm-body">
  ${server?`<div class="mm-server-intro">${icon('server')}<div><strong>${t('پایش مستقیم سرور','Direct server monitoring')}</strong><p>${t('IP سرور را وارد کنید؛ زمان پاسخ و قطعی‌ها ثبت می‌شوند.','Enter the server IP to track response times and outages.')}</p></div></div>`:''}
  ${!direct&&!editing?`<div class="mm-tabs">${[['links',t('لینک / JSON','Link / JSON')],['sub',t('اشتراک','Subscription')],['qr',t('اسکن QR','Scan QR')]].map(([id,label])=>`<button data-mode="${id}" class="${mode===id?'mm-selected':''}">${label}</button>`).join('')}</div>`:''}
  <form id="add-form"><label class="mm-label" for="name">${t('نام نمایشی (اختیاری)','Display name (optional)')}</label><input class="mm-field" id="name" name="name" maxlength="120" value="${esc(n?.name||'')}" placeholder="${server?t('مثلاً سرور آلمان','e.g. Germany server'):t('مثلاً آلمان ۱','e.g. Germany 01')}">
  <label class="mm-label" for="raw">${server?t('آی‌پی سرور','Server IP'):direct?t('دامنه یا آدرس','Domain or URL'):mode==='sub'?t('آدرس اشتراک','Subscription URL'):t('لینک، JSON یا متن WireGuard','Link, JSON or WireGuard configuration')}</label>
  ${server?`<input class="mm-field mm-server-ip" id="raw" name="raw" dir="ltr" required spellcheck="false" autocapitalize="off" autocomplete="off" value="${esc(n?.host||'')}" placeholder="203.0.113.10 / 2001:db8::1"><p class="mm-caption mm-ip-hint">IPv4 / IPv6</p>`:`<textarea class="mm-field" id="raw" name="raw" dir="ltr" required spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="${direct?'google.com':mode==='sub'?'https://example.com/subscription':'vless://…\nvmess://…\ntrojan://…'}">${esc(n?.raw||'')}</textarea>`}
  ${direct?methodPicker(method,server):''}
  ${server?`<div id="server-port-field" ${method==='TCP'?'':'hidden'}><label class="mm-label" for="server-port">${t('پورت TCP','TCP port')}</label><input class="mm-field" id="server-port" name="port" type="number" inputmode="numeric" min="1" max="65535" dir="ltr" value="${esc(port)}" ${method==='TCP'?'required':''}></div><p class="notice">${t('پینگ، پاسخ‌گویی IP و TCP، بازبودن پورت را بررسی می‌کند. اگر پینگ سرور بسته است، TCP و پورت سرویس را انتخاب کنید.','Ping checks the IP response; TCP checks an open port. If ping is blocked, choose TCP and the service port.')}</p><p class="mm-caption">${t('پس از ذخیره، قوانین هشدار، گزارش‌ها و حالت تعمیرات از جزئیات سرور در دسترس‌اند.','After saving, alert rules, reports and maintenance are available in server details.')}</p>`:direct?`<p class="notice">${t('HTTPS پاسخ وب، TCP بازبودن پورت و ICMP پینگ سیستم را بررسی می‌کند. ICMP ممکن است در شبکه محدود باشد.','HTTPS checks a web response, TCP checks the port, and ICMP uses system ping, which some networks restrict.')}</p>`:`<div class="mm-protocols">${['VLESS','VMess','Trojan','SS','HY2','TUIC','AnyTLS','WireGuard','SOCKS','JSON'].map(x=>`<span>${x}</span>`).join('')}</div><p class="mm-muted">${t('هر لینک در یک خط؛ یا متن کامل فایل WireGuard را وارد کن. در پایش WireGuard از DNS سیستم استفاده می‌شود؛ DNS فایل و تنظیمات wg-quick اعمال نمی‌شوند.','One link per line, or paste a complete WireGuard config. WireGuard checks use system DNS; file DNS and wg-quick settings are not applied.')}</p>`}
  <div id="form-error" role="alert" hidden class="error-box"></div><footer class="mm-footer"><button class="mm-primary" type="submit">${icon(!direct&&mode==='sub'?'download':'check')}${!direct&&mode==='sub'?t('دریافت و بررسی','Fetch and review'):server?t('ذخیرهٔ سرور','Save server'):t('ذخیرهٔ مانیتور','Save monitor')}</button></footer></form></div>`;
}
function detail() {
  var _a;
  const n = current();
  if (!n) return home();
  const s = state(n), values = history.filter((x) => x.ms >= 0), max = Math.max(100, ...values.map((x) => x.ms)), pts = history.map((x, i) => ({ x: 10 + i * 300 / Math.max(1, history.length - 1), y: 110 - Math.max(0, x.ms) / max * 90, ok: x.ms >= 0 }));
  let segments = [], segment = [];
  pts.forEach((p) => {
    if (p.ok) segment.push(`${p.x},${p.y}`);
    else {
      if (segment.length) segments.push(segment.join(" "));
      segment = [];
    }
  });
  if (segment.length) segments.push(segment.join(" "));
  return header(n.name, true, ib("pencil", "edit", t("\u0648\u06CC\u0631\u0627\u06CC\u0634", "Edit"))) + `<div class="mm-body"><div class="mm-row"><span class="mm-proto">${esc(n.p)} \xB7 ${esc(n.transport)}</span>${toggle(n.enabled, "node-" + n.id, t("\u067E\u0627\u06CC\u0634", "Monitoring"))}</div><div class="mm-hero-stat ${["good", "bad", "slow"].includes(s) ? "mm-" + s : ""}">${n.ms >= 0 ? num(n.ms) : "\u2014"} <small>ms</small></div><p class="mm-muted">${status(s)} \xB7 ${t("\u0622\u062E\u0631\u06CC\u0646 \u0628\u0631\u0631\u0633\u06CC: ", "Last check: ")}${time(n.lastCheck)}</p><p class="mm-host">${esc(n.host)}</p>${exitLocation(n)}
<div class="mm-chart"><div class="mm-row"><h3>${t("\u062A\u0627\u0631\u06CC\u062E\u0686\u0647\u0654 \u067E\u0627\u0633\u062E", "Response history")}</h3><span class="mm-muted">${num(history.length)} ${t("\u0628\u0631\u0631\u0633\u06CC \u0627\u062E\u06CC\u0631", "recent checks")}</span></div>${history.length ? interactiveChart("detail-"+n.id,history,`<svg viewBox="0 0 320 130" role="img" aria-label="${t("\u0646\u0645\u0648\u062F\u0627\u0631 \u0632\u0645\u0627\u0646 \u067E\u0627\u0633\u062E\u061B \u0646\u0642\u0627\u0637 \u0642\u0631\u0645\u0632 \u0628\u0631\u0631\u0633\u06CC \u0646\u0627\u0645\u0648\u0641\u0642\u200C\u0627\u0646\u062F", "Response times; red dots indicate failed checks")}"><path d="M10 20H310M10 65H310M10 110H310" stroke="var(--mm-border)" fill="none"/>${segments.map((p) => `<polyline points="${p}" stroke="var(--mm-mint)" stroke-width="2.5" fill="none"/>`).join("")}${pts.map((p) => `<circle cx="${p.x}" cy="${p.ok ? p.y : 118}" r="3" fill="var(--mm-${p.ok ? "mint" : "red"})"/>`).join("")}</svg><div class="chart-labels"><span>${time(history[0].time)}</span><span>${num(max)} ms</span><span>${time(history[history.length - 1].time)}</span></div>`,false,3.125) : `<div class="empty mm-muted">${t("\u067E\u0633 \u0627\u0632 \u0627\u0648\u0644\u06CC\u0646 \u0628\u0631\u0631\u0633\u06CC\u060C \u0646\u0645\u0648\u062F\u0627\u0631 \u0646\u0645\u0627\u06CC\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F.", "The chart appears after your first check.")}</div>`}</div>
<footer class="mm-footer"><button class="mm-primary" data-action="test" ${n.enabled ? "" : "disabled"}>${icon("activity")}${t("\u062A\u0633\u062A \u0627\u06A9\u0646\u0648\u0646", "Test now")}</button></footer><div class="mm-stats"><div class="mm-stat"><span class="mm-muted">${t("\u062E\u0637\u0627\u06CC \u067E\u06CC\u0627\u067E\u06CC", "Failures")}</span><strong>${num(n.failures || 0)} / ${num(((_a = n.rules) == null ? void 0 : _a.failureLimit) || data.prefs.failureLimit || 6)}</strong></div><div class="mm-stat"><span class="mm-muted">${t("\u0645\u06CC\u0627\u0646\u06AF\u06CC\u0646 \u0627\u062E\u06CC\u0631", "Recent average")}</span><strong>${values.length ? num(Math.round(values.reduce((a, x) => a + x.ms, 0) / values.length)) + " ms" : "\u2014"}</strong></div><div class="mm-stat"><span class="mm-muted">${t("\u0622\u062E\u0631\u06CC\u0646 \u0645\u0648\u0641\u0642", "Last success")}</span><strong>${time(n.lastSuccess)}</strong></div></div>
${detailMenu()}${n.error ? `<p class="notice">${esc(errorText(n.error))}</p>` : ""}<p class="mm-caption">${t("\u062A\u0633\u062A \u0648\u0627\u0642\u0639\u06CC \u06CC\u0639\u0646\u06CC \u062F\u0631\u06CC\u0627\u0641\u062A \u067E\u0627\u0633\u062E \u0627\u0632 \u0645\u0642\u0635\u062F \u0622\u0632\u0645\u0627\u06CC\u0634 \u0627\u0632 \u0637\u0631\u06CC\u0642 \u06A9\u0627\u0646\u0641\u06CC\u06AF\u061B \u0627\u06CC\u0646 \u0639\u062F\u062F\u060C \u067E\u06CC\u0646\u06AF ICMP \u0633\u0631\u0648\u0631 \u0646\u06CC\u0633\u062A.", "A real config test requests the probe URL through this configuration. It is not the server\u2019s ICMP ping.")}</p></div><div class="mm-actions"><button class="mm-secondary" data-action="copy">${icon("copy")} ${t("\u06A9\u067E\u06CC \u06A9\u0627\u0646\u0641\u06CC\u06AF", "Copy")}</button><button class="mm-secondary mm-danger" data-action="delete">${icon("trash-2")} ${t("\u062D\u0630\u0641", "Delete")}</button></div>`;
}
function errorText(e) {
  return { timeout: t("\u0632\u0645\u0627\u0646 \u0627\u0646\u062A\u0638\u0627\u0631 \u067E\u0627\u0633\u062E \u062A\u0645\u0627\u0645 \u0634\u062F", "Response timed out"), dns_error: t("\u0646\u0627\u0645 \u062F\u0627\u0645\u0646\u0647 \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F", "DNS lookup failed"), tls_error: t("\u0628\u0631\u0642\u0631\u0627\u0631\u06CC TLS \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F", "TLS handshake failed"), connection_refused: t("\u0627\u062A\u0635\u0627\u0644 \u067E\u0630\u06CC\u0631\u0641\u062A\u0647 \u0646\u0634\u062F", "Connection refused"), config_error: t("\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0645\u0639\u062A\u0628\u0631 \u0646\u06CC\u0633\u062A", "Invalid configuration"), network_unavailable: t("\u0627\u06CC\u0646\u062A\u0631\u0646\u062A \u06AF\u0648\u0634\u06CC \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A", "Device network unavailable"), core_start_failed: t("\u0645\u0648\u062A\u0648\u0631 \u062A\u0633\u062A \u0627\u062C\u0631\u0627 \u0646\u0634\u062F", "Probe engine did not start"), engine_unavailable: t("\u0645\u0648\u062A\u0648\u0631 \u062A\u0633\u062A \u0622\u0645\u0627\u062F\u0647 \u0646\u06CC\u0633\u062A", "Probe engine unavailable"), socks_auth: t("\u0627\u062D\u0631\u0627\u0632 \u0647\u0648\u06CC\u062A \u067E\u0631\u0627\u06A9\u0633\u06CC \u0645\u062D\u0644\u06CC \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F", "Local probe authentication failed"), socks_connect: t("\u0627\u062A\u0635\u0627\u0644 \u0627\u0632 \u0637\u0631\u06CC\u0642 \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F\u061B \u0645\u0631\u062D\u0644\u0647 \u062F\u0627\u062E\u0644\u06CC \u0645\u0634\u062E\u0635 \u0646\u06CC\u0633\u062A", "Connection through the configuration failed; internal stage unknown"), http_error: t("\u0645\u0642\u0635\u062F \u067E\u0627\u0633\u062E \u0648\u0628 \u0642\u0627\u0628\u0644 \u0642\u0628\u0648\u0644 \u0646\u062F\u0627\u062F", "Target returned an unsuccessful HTTP status"), http_invalid: t("\u067E\u0627\u0633\u062E HTTP \u0645\u0639\u062A\u0628\u0631 \u0646\u0628\u0648\u062F", "Invalid HTTP response"), icmp_failed: t("\u067E\u0627\u0633\u062E ICMP \u062F\u0631\u06CC\u0627\u0641\u062A \u0646\u0634\u062F", "No ICMP reply"), cancelled: t("\u062A\u0633\u062A \u0644\u063A\u0648 \u0634\u062F", "Test cancelled"), request_failed: t("\u062A\u0633\u062A \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F\u061B \u06A9\u0627\u0646\u0641\u06CC\u06AF \u06CC\u0627 \u062F\u0633\u062A\u0631\u0633\u06CC \u0628\u0647 \u0645\u0642\u0635\u062F \u0631\u0627 \u0628\u0631\u0631\u0633\u06CC \u06A9\u0646\u06CC\u062F", "Probe failed; check the configuration and target availability") }[e] || e;
}
function setting(label, content, sub = "") {
  if(content.includes("mm-stepper"))return `<div class="mm-setting mm-step-setting"><h3>${label}</h3>${content}<p class="mm-muted">${sub}</p></div>`;
  return `<div class="mm-setting"><div><h3>${label}</h3>${sub ? `<p class="mm-muted">${sub}</p>` : ""}</div>${content}</div>`;
}
function settings() {
  const p = data.prefs, permissions = data.permissions || {};
  const ready = ['notifications','fullScreen','dnd','battery'].every(k => permissions[k]) && permissions.alarmVolume > 0;
  const label = (glyph, text) => `<span class="mm-setting-label">${icon(glyph)}<span>${text}</span></span>`;
  return header(t('تنظیمات','Settings')) + `<div class="mm-body mm-settings-page">
    <h2 class="mm-section-label">${t('ظاهر','Appearance')}</h2>
    <div class="mm-settings-group">
      ${setting(label('globe',t('زبان','Language')),segments('language',[['fa','فارسی'],['en','English']],p.language))}
      ${setting(label('palette',t('پوسته','Theme')),segments('theme',[['dark',t('مشکی','Black')],['light',t('روشن','Light')]],p.theme))}
    </div>
    <h2 class="mm-section-label">${t('پایش','Monitoring')}</h2>
    <form id="settings-form"><div class="mm-settings-group">
      ${setting(label('clock-3',t('فاصلهٔ تست','Check interval')),stepper('interval',p.interval,10,3600),t('ثانیه؛ پیش‌فرض ۲۰','Seconds; default 20'))}
      ${setting(label('triangle-alert',t('آستانهٔ خطا','Failure threshold')),stepper('global-failure-limit',p.failureLimit||6,1,100),t('تعداد خطاهای پیاپی پیش از هشدار؛ قوانین اختصاصی مقدم هستند.','Consecutive failures before an alert; monitor rules take precedence.'))}
      <div class="mm-setting mm-url-setting"><label for="testUrl" class="mm-setting-label">${icon('link')}<span>${t('آدرس مقصد تست','Probe URL')}</span></label><input id="testUrl" class="mm-field" dir="ltr" value="${esc(p.testUrl)}" required aria-describedby="probe-help"><p id="probe-help" class="mm-muted">${t('درخواست از طریق هر کانفیگ به این آدرس ارسال می‌شود.','Requested through each configuration.')}</p></div>
      ${setting(label('power',t('ادامه پس از روشن‌شدن گوشی','Resume after reboot')),toggle(p.resumeBoot,'resumeBoot',t('ادامه پس از راه‌اندازی','Resume after reboot')))}
    </div><button type="submit" class="mm-secondary mm-wide">${icon('check')}${t('ذخیره تنظیمات پایش','Save monitoring settings')}</button></form>
    <h2 class="mm-section-label">${t('هشدار','Alerts')}</h2><div class="mm-settings-group">
      ${setting(label('bell-ring',t('هشدارهای خودکار','Automatic alerts')),toggle(p.alertsEnabled!==false,'alertsEnabled',t('هشدارهای خودکار','Automatic alerts')),t('خاموش‌کردن هشدار، پایش را متوقف نمی‌کند.','Turning alerts off keeps monitoring running.'))}
      <button class="mm-setting" data-action="alertSchedule"><span class="mm-setting-label">${icon('calendar-clock')}<span>${t('زمان‌بندی هشدار','Alert schedule')}<small class="mm-alert-summary">${p.alertScheduleEnabled?localDigits(clockValue(p.alertStart??480))+' – '+localDigits(clockValue(p.alertEnd??1380)):t('همیشه فعال','Always active')}</small></span></span>${icon(data.prefs.language==='fa'?'chevron-left':'chevron-right')}</button>
      <button class="mm-setting" data-action="tones">${label('bell',t('زنگ و لرزش','Sound & vibration'))}${icon(data.prefs.language==='fa'?'chevron-left':'chevron-right')}</button>
      <button class="mm-setting" data-action="alarmTest">${label('play',t('آزمایش هشدار','Test alarm'))}${icon(data.prefs.language==='fa'?'chevron-left':'chevron-right')}</button>
      <button class="mm-setting" data-action="permissions">${label('shield-check',t('مجوزها','Permissions'))}<span class="mm-permission-summary ${ready?'mm-good':'mm-muted'}">${ready?t('آماده','Ready'):t('بررسی','Review')}${icon(data.prefs.language==='fa'?'chevron-left':'chevron-right')}</span></button>
    </div>
    ${featureMenu()}
    <p class="mm-caption">${t('پایش مداوم با اعلان دائمی انجام می‌شود. فاصلهٔ کوتاه‌تر و مانیتورهای بیشتر، مصرف باتری و داده را افزایش می‌دهند.','Continuous monitoring uses an ongoing notification. Short intervals and more monitors increase battery and data use.')}</p>
    <p class="mm-caption">Config Monitor · <span dir="ltr">${esc(data.version||"—")}</span><br>${t('اندروید ۷ و بالاتر • ذخیرهٔ محلی کانفیگ‌ها','Android 7+ • configurations stored locally')}</p>
  </div>`;
}

function clockValue(minutes){return String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');}
function alertSchedule(){
 const p=data.prefs,enabled=!!p.alertScheduleEnabled,days=p.alertDays??127;
 const labels=data.prefs.language==='fa'?[[6,'شنبه'],[0,'یکشنبه'],[1,'دوشنبه'],[2,'سه‌شنبه'],[3,'چهارشنبه'],[4,'پنجشنبه'],[5,'جمعه']]:[[1,'Mon'],[2,'Tue'],[3,'Wed'],[4,'Thu'],[5,'Fri'],[6,'Sat'],[0,'Sun']];
 return header(t('زمان‌بندی هشدار','Alert schedule'))+`<div class="mm-body"><form id="alert-schedule-form"><div class="mm-settings-group">${setting(t('فقط در زمان‌های انتخابی','Only during selected times'),`<label class="mm-switch"><input id="alert-schedule-enabled" type="checkbox" ${enabled?'checked':''} aria-label="${t('فعال‌کردن زمان‌بندی','Enable schedule')}"></label>`)}</div><fieldset id="alert-window-fields" class="mm-alert-window" ${enabled?'':'disabled'}><legend>${t('زمان فعال بودن هشدار','Active alert window')}</legend><div class="mm-alert-days">${labels.map(([i,label])=>`<label class="mm-alert-day"><input type="checkbox" name="alert-day" value="${i}" ${days&(1<<i)?'checked':''}><span>${label}</span></label>`).join('')}</div><div class="mm-alert-times"><label for="alert-start"><span>${t('از ساعت','From')}</span><input class="mm-field" id="alert-start" type="time" value="${clockValue(p.alertStart??480)}" required></label><span class="mm-alert-time-separator">—</span><label for="alert-end"><span>${t('تا ساعت','Until')}</span><input class="mm-field" id="alert-end" type="time" value="${clockValue(p.alertEnd??1380)}" required></label></div><p class="mm-caption">${t('ساعت گوشی؛ اگر پایان زودتر از شروع باشد، بازه تا روز بعد ادامه دارد.','Device local time. An earlier end time extends the window into the following day.')}</p></fieldset><button type="submit" class="mm-primary mm-wide">${icon('check')}${t('ذخیره زمان‌بندی','Save schedule')}</button><p class="mm-caption">${t('این زمان‌بندی برای هشدارهای خودکار است؛ آزمایش دستی صدا همیشه در دسترس است.','This schedule applies to automatic alerts. Manual sound testing is always available.')}</p></form></div>`;
}

function about(){return header(t('دربارهٔ ما','About us'))+`<div class="mm-body"><section class="mm-panel mm-about-brand"><span class="mm-about-symbol">${icon('activity')}</span><h2 class="mm-en">Config Monitor</h2><p>${t('نسخهٔ برنامه','App version')} <b dir="ltr">${esc(data.version||'—')}</b></p></section><div class="mm-settings-group"><button class="mm-setting" data-about-link="site"><span class="mm-setting-label">${icon('globe')}${t('وب‌سایت','Website')}</span><bdi>configmonitor.top</bdi></button><button class="mm-setting" data-about-link="telegram"><span class="mm-setting-label">${icon('send')}${t('تلگرام','Telegram')}</span><bdi>@configmonitor</bdi></button><button class="mm-setting" data-action="platformCheck"><span class="mm-setting-label">${icon('refresh-cw')}${t('بررسی نسخهٔ جدید','Check for updates')}</span>${icon(data.prefs.language==='fa'?'chevron-left':'chevron-right')}</button></div></div>`;}

function tones() {
  let p = data.prefs;
  return header(t("\u0632\u0646\u06AF \u0647\u0634\u062F\u0627\u0631", "Alarm sound")) + `<div class="mm-body"><p class="mm-label">${t("\u0632\u0646\u06AF\u200C\u0647\u0627\u06CC \u0628\u0631\u0646\u0627\u0645\u0647", "Built-in sounds")}</p><div class="mm-settings-group">${[["gentle", t("\u0622\u0631\u0627\u0645", "Gentle")], ["pulse", t("\u0636\u0631\u0628\u0627\u0646", "Pulse")], ["bell", t("\u0632\u0646\u06AF", "Bell")], ["urgent", t("\u0641\u0648\u0631\u06CC", "Urgent")]].map(([id, label]) => `<div class="mm-tone ${p.tone === "builtin:" + id ? "mm-selected" : ""}"><input type="radio" name="tone" id="tone-${id}" value="${id}" ${p.tone === "builtin:" + id ? "checked" : ""}><label for="tone-${id}">${label}</label><button data-play="${id}" aria-label="${t("\u067E\u062E\u0634 ", "Play ") + label}">${icon("play")}</button></div>`).join("")}<button class="mm-setting" data-action="systemTone">${t("\u0627\u0646\u062A\u062E\u0627\u0628 \u0632\u0646\u06AF \u0633\u06CC\u0633\u062A\u0645", "Choose a system alarm")}${icon("music-2")}</button><button class="mm-setting" data-action="audioFile">${t("\u0641\u0627\u06CC\u0644 \u0635\u0648\u062A\u06CC \u062F\u0644\u062E\u0648\u0627\u0647", "Choose an audio file")}${icon("folder-open")}</button></div>${!p.tone.startsWith("builtin:") ? `<p class="notice">${t("\u0632\u0646\u06AF \u062F\u0644\u062E\u0648\u0627\u0647 \u0627\u0646\u062A\u062E\u0627\u0628 \u0634\u062F\u0647 \u0627\u0633\u062A", "A custom sound is selected")}</p>` : ""}<div class="mm-settings-group"><div class="mm-setting" style="display:block"><label class="mm-row" for="volume"><span>${t("\u0634\u062F\u062A \u0635\u062F\u0627\u06CC \u0628\u0631\u0646\u0627\u0645\u0647", "App volume")}</span><span id="volume-value">${num(p.volume)}\u066A</span></label><input type="range" id="volume" min="0" max="100" value="${p.volume}"></div>${setting(t("\u0644\u0631\u0632\u0634", "Vibration"), toggle(p.vibrate, "vibrate", t("\u0644\u0631\u0632\u0634", "Vibration")))}${setting(t("\u0628\u0644\u0646\u062F\u0634\u062F\u0646 \u062A\u062F\u0631\u06CC\u062C\u06CC \u0635\u062F\u0627", "Gradually increase volume"), toggle(p.gradual, "gradual", t("\u0634\u0631\u0648\u0639 \u062A\u062F\u0631\u06CC\u062C\u06CC", "Gradual start")))}</div><p class="notice">${t("\u0635\u062F\u0627 \u0627\u0632 \u06A9\u0627\u0646\u0627\u0644 \u0622\u0644\u0627\u0631\u0645 \u067E\u062E\u0634 \u0645\u06CC\u200C\u0634\u0648\u062F. \u0635\u062F\u0627\u06CC \u0622\u0644\u0627\u0631\u0645 \u06AF\u0648\u0634\u06CC \u0646\u0628\u0627\u06CC\u062F \u0635\u0641\u0631 \u0628\u0627\u0634\u062F\u061B \u062F\u0631 \u062D\u0627\u0644\u062A \u0645\u0632\u0627\u062D\u0645 \u0646\u0634\u0648\u06CC\u062F\u060C \u0627\u062C\u0627\u0632\u0647\u0654 \u0622\u0644\u0627\u0631\u0645\u200C\u0647\u0627 \u0631\u0627 \u0641\u0639\u0627\u0644 \u06A9\u0646\u06CC\u062F.", "Sound uses the alarm audio channel. Device alarm volume must be above zero; allow alarms in Do Not Disturb.")}</p><button class="mm-primary" data-action="alarmTest">${icon("volume-2")}${t("\u0622\u0632\u0645\u0627\u06CC\u0634 \u0647\u0634\u062F\u0627\u0631", "Test alarm")}</button></div>`;
}
function permissions() {
  const p = data.permissions;
  return header(t("\u0622\u0645\u0627\u062F\u0647\u200C\u0633\u0627\u0632\u06CC \u0647\u0634\u062F\u0627\u0631", "Alert readiness")) + `<div class="mm-body"><p class="notice">${t("\u0627\u06CC\u0646 \u0645\u0648\u0627\u0631\u062F \u0631\u0627 \u06CC\u06A9\u200C\u0628\u0627\u0631 \u0631\u0648\u06CC \u06AF\u0648\u0634\u06CC \u062A\u0646\u0638\u06CC\u0645 \u06A9\u0646\u06CC\u062F\u060C \u0633\u067E\u0633 \u0647\u0634\u062F\u0627\u0631 \u0622\u0632\u0645\u0627\u06CC\u0634\u06CC \u0631\u0627 \u0628\u0627 \u0635\u0641\u062D\u0647\u0654 \u0642\u0641\u0644\u200C\u0634\u062F\u0647 \u0648 \u062D\u0627\u0644\u062A \u0633\u0627\u06CC\u0644\u0646\u062A \u0627\u0645\u062A\u062D\u0627\u0646 \u06A9\u0646\u06CC\u062F.", "Configure these once, then test the alarm with your screen locked and silent mode enabled.")}</p><div class="mm-settings-group">${[["notifications", t("\u0627\u0639\u0644\u0627\u0646\u200C\u0647\u0627", "Notifications")], ["fullScreen", t("\u0647\u0634\u062F\u0627\u0631 \u062A\u0645\u0627\u0645\u200C\u0635\u0641\u062D\u0647", "Full-screen alerts")], ["battery", t("\u0628\u0627\u062A\u0631\u06CC \u0628\u062F\u0648\u0646 \u0645\u062D\u062F\u0648\u062F\u06CC\u062A", "Unrestricted battery")], ["dnd", t("\u062F\u0633\u062A\u0631\u0633\u06CC \u0645\u0632\u0627\u062D\u0645 \u0646\u0634\u0648\u06CC\u062F", "Do Not Disturb access")], ["alarmVolume", t("\u0635\u062F\u0627\u06CC \u0622\u0644\u0627\u0631\u0645 \u06AF\u0648\u0634\u06CC", "Device alarm volume")]].map(([k, label]) => `<button class="mm-setting" data-permission="${k}"><span>${label}</span><span class="permission-status ${p[k] ? "ok" : ""}">${k === "alarmVolume" ? num(p[k]) : p[k] ? t("\u0641\u0639\u0627\u0644", "Enabled") : t("\u0628\u0631\u0631\u0633\u06CC \u062A\u0646\u0638\u06CC\u0645\u0627\u062A", "Review settings")} ${icon("external-link")}</span></button>`).join("")}</div><p class="mm-muted">${t("\u0627\u0646\u062F\u0631\u0648\u06CC\u062F \u0645\u0645\u06A9\u0646 \u0627\u0633\u062A \u0648\u0642\u062A\u06CC \u0635\u0641\u062D\u0647 \u0631\u0648\u0634\u0646 \u0627\u0633\u062A\u060C \u0627\u0639\u0644\u0627\u0646 \u0628\u0631\u062C\u0633\u062A\u0647 \u0631\u0627 \u0628\u0647\u200C\u062C\u0627\u06CC \u0635\u0641\u062D\u0647\u0654 \u06A9\u0627\u0645\u0644 \u0646\u0645\u0627\u06CC\u0634 \u062F\u0647\u062F. \u062F\u0631 \u0628\u0639\u0636\u06CC \u0645\u062F\u0644\u200C\u0647\u0627 \u0645\u062C\u0648\u0632 \u0634\u0631\u0648\u0639 \u062E\u0648\u062F\u06A9\u0627\u0631 \u0646\u06CC\u0632 \u062F\u0631 \u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0633\u0627\u0632\u0646\u062F\u0647 \u0644\u0627\u0632\u0645 \u0627\u0633\u062A. \u06A9\u0627\u0631\u06A9\u0631\u062F \u062F\u0642\u06CC\u0642 \u06F2\u06F0\u062B\u0627\u0646\u06CC\u0647\u200C\u0627\u06CC \u062F\u0631 \u062E\u0648\u0627\u0628 \u0639\u0645\u06CC\u0642 \u06CC\u0627 \u067E\u0633 \u0627\u0632 \u062A\u0648\u0642\u0641 \u0627\u062C\u0628\u0627\u0631\u06CC \u062A\u0636\u0645\u06CC\u0646\u200C\u0634\u062F\u0646\u06CC \u0646\u06CC\u0633\u062A.", "Android may show a heads-up notification while the screen is on. Some manufacturers also require autostart permission. Exact 20-second checks cannot be guaranteed in deep sleep or after force-stop.")}</p><footer class="mm-footer"><button class="mm-primary" data-action="alarmTest">${icon("bell-ring")}${t("\u0622\u0632\u0645\u0627\u06CC\u0634 \u0647\u0634\u062F\u0627\u0631", "Test alarm")}</button></footer></div>`;
}
function scan() {
  return header(t("\u0627\u0633\u06A9\u0646 QR", "Scan QR")) + `<div class="mm-body"><div class="mm-scan-frame" aria-hidden="true"></div><h2 style="text-align:center">${t("\u06A9\u0627\u0646\u0641\u06CC\u06AF \u0631\u0627 \u0628\u0627 \u062F\u0648\u0631\u0628\u06CC\u0646 \u0627\u0636\u0627\u0641\u0647 \u06A9\u0646\u06CC\u062F", "Add a configuration with your camera")}</h2><p class="mm-caption">${t("\u067E\u0633 \u0627\u0632 \u062E\u0648\u0627\u0646\u062F\u0646 \u06A9\u062F\u060C \u0642\u0628\u0644 \u0627\u0632 \u0630\u062E\u06CC\u0631\u0647 \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u06CC\u062F \u0622\u0646 \u0631\u0627 \u0628\u0631\u0631\u0633\u06CC \u06A9\u0646\u06CC\u062F.", "Review the decoded configuration before saving it.")}</p></div><footer class="mm-footer"><button class="mm-primary" data-action="camera">${icon("camera")}${t("\u0628\u0627\u0632\u06A9\u0631\u062F\u0646 \u062F\u0648\u0631\u0628\u06CC\u0646", "Open camera")}</button></footer><button class="mm-secondary" data-action="gallery">${icon("image")}${t("\u0627\u0646\u062A\u062E\u0627\u0628 QR \u0627\u0632 \u06AF\u0627\u0644\u0631\u06CC", "Choose QR from gallery")}</button>`;
}
function events() {
  return header(t("\u0631\u0648\u06CC\u062F\u0627\u062F\u0647\u0627", "Events")) + `<div class="mm-body">${data.events.length ? `<div class="timeline">${data.events.map((e) => `<article class="mm-item"><div class="mm-item-main"><h3>${esc(e.name)}</h3><p class="mm-muted">${{ down: t("\u0647\u0634\u062F\u0627\u0631 \u0642\u0637\u0639 \u0627\u062A\u0635\u0627\u0644", "Failed-check alert"), latency: t("\u0647\u0634\u062F\u0627\u0631 \u062A\u0623\u062E\u06CC\u0631 \u0628\u0627\u0644\u0627", "High latency alert"), snoozeUntil: t("\u0647\u0634\u062F\u0627\u0631 \u06F1\u06F5 \u062F\u0642\u06CC\u0642\u0647 \u0628\u0647 \u062A\u0639\u0648\u06CC\u0642 \u0627\u0641\u062A\u0627\u062F", "Alert snoozed for 15 minutes"), maintenanceUntil: t("\u062A\u0639\u0645\u06CC\u0631\u0627\u062A \u0641\u0639\u0627\u0644 \u0634\u062F", "Maintenance started"), maintenanceEnded: t("\u062A\u0639\u0645\u06CC\u0631\u0627\u062A \u067E\u0627\u06CC\u0627\u0646 \u06CC\u0627\u0641\u062A", "Maintenance ended"), recovered: t("\u067E\u0627\u0633\u062E\u200C\u06AF\u0648\u06CC\u06CC \u0628\u0627\u0632\u06AF\u0634\u062A", "Response restored"), acknowledged: t("\u0647\u0634\u062F\u0627\u0631 \u062A\u0623\u06CC\u06CC\u062F \u0634\u062F", "Alert acknowledged") }[e.kind] || esc(e.kind)}</p></div><span class="mm-muted">${time(e.time)}</span></article>`).join("")}</div>` : `<div class="empty">${icon("history")}<h2>${t("\u0647\u0646\u0648\u0632 \u0631\u0648\u06CC\u062F\u0627\u062F\u06CC \u062B\u0628\u062A \u0646\u0634\u062F\u0647", "No events yet")}</h2><p class="mm-muted">${t("\u0647\u0634\u062F\u0627\u0631\u0647\u0627 \u0648 \u0628\u0627\u0632\u06AF\u0634\u062A \u0627\u062A\u0635\u0627\u0644 \u0627\u06CC\u0646\u062C\u0627 \u062B\u0628\u062A \u0645\u06CC\u200C\u0634\u0648\u0646\u062F.", "Alerts and recovery events will appear here.")}</p></div>`}</div>`;
}
function remove() {
  var _a;
  return header(t("\u062D\u0630\u0641 \u0645\u0627\u0646\u06CC\u062A\u0648\u0631", "Delete monitor")) + `<div class="mm-alert-center"><div class="mm-alert-icon">${icon("trash-2")}</div><h2>${esc((_a = current()) == null ? void 0 : _a.name)}</h2><p class="mm-muted">${t("\u0627\u06CC\u0646 \u0645\u0627\u0646\u06CC\u062A\u0648\u0631 \u0648 \u062A\u0627\u0631\u06CC\u062E\u0686\u0647\u0654 \u0628\u0631\u0631\u0633\u06CC \u0622\u0646 \u062D\u0630\u0641 \u0634\u0648\u062F\u061F", "Delete this monitor and its check history?")}</p></div><div class="mm-actions"><button class="mm-secondary" data-action="detail">${t("\u0627\u0646\u0635\u0631\u0627\u0641", "Cancel")}</button><button class="mm-primary" data-action="confirmDelete">${t("\u062D\u0630\u0641", "Delete")}</button></div>`;
}
let appVisible = true, navigationHistory = [], chooserOpen = false, scheduleState = null, scheduleReceived = 0;
const topbar = document.querySelector("#mm-topbar"), nav = document.querySelector("#mm-nav"), modal = document.querySelector("#mm-modal");
function navMarkup() {
  const current2 = ["home", "reports", "events", "settings"].includes(screen) ? screen : ["targets", "tones", "permissions", "backup", "widgetPage", "about", "alertSchedule"].includes(screen) ? "settings" : "home";
  return [["home", "activity", t("\u067E\u0627\u06CC\u0634", "Monitor")], ["reports", "chart-no-axes-combined", t("\u06AF\u0632\u0627\u0631\u0634\u200C\u0647\u0627", "Reports")], ["events", "history", t("\u0631\u0648\u06CC\u062F\u0627\u062F\u0647\u0627", "Events")], ["settings", "sliders-horizontal", t("\u062A\u0646\u0638\u06CC\u0645\u0627\u062A", "Settings")]].map(([id, i, label]) => `<button data-nav="${id}" data-action="${id}" ${current2 === id ? 'aria-current="page"' : ""}>${icon(i)}<span>${label}</span></button>`).join("");
}
function lockBackground(lock) {
  [topbar, view, nav].forEach((el) => {
    el.inert = lock;
    if (lock) el.setAttribute("aria-hidden", "true");
    else el.removeAttribute("aria-hidden");
  });
}
function dismissSheet() {
  modal.classList.remove("mm-update-modal");
  modal.hidden = true;
  modal.innerHTML = "";
  chooserOpen = false;
  lockBackground(false);
}
function showSheet(markup) {
  modal.classList.remove("mm-update-modal");
  var _a;
  modal.innerHTML = `<section class="mm-sheet" role="dialog" aria-modal="true" aria-label="${t("\u0627\u0641\u0632\u0648\u062F\u0646 \u06CC\u0627 \u0648\u06CC\u0631\u0627\u06CC\u0634 \u0645\u0627\u0646\u06CC\u062A\u0648\u0631", "Add or edit monitor")}"><div class="mm-sheet-handle"></div><div class="mm-sheet-top"></div><div class="mm-sheet-scroll">${markup}</div><div class="mm-sheet-actions"></div></section>`;
  const content = modal.querySelector(".mm-sheet-scroll"), h = content.querySelector(".mm-head");
  if (h) modal.querySelector(".mm-sheet-top").appendChild(h);
  const footer = content.querySelector(".mm-footer");
  if (footer) {
    const submit = footer.querySelector("[type=submit]");
    if (submit) submit.setAttribute("form", "add-form");
    modal.querySelector(".mm-sheet-actions").appendChild(footer);
  }
  modal.hidden = false;
  lockBackground(true);platformBounds();
  icons();
  (_a = modal.querySelector("button")) == null ? void 0 : _a.focus();
}
function chooseAdd() {
  if(category==='server'){editing=0;mode="links";go("add");return;}
  chooserOpen = true;
  showSheet(header(t("\u0627\u0641\u0632\u0648\u062F\u0646 \u0645\u0627\u0646\u06CC\u062A\u0648\u0631", "Add monitor")) + `<div class="mm-settings-group">${menuRow("addLinks", t("\u0686\u0633\u0628\u0627\u0646\u062F\u0646 \u0644\u06CC\u0646\u06A9", "Paste a link"), t("\u0644\u06CC\u0646\u06A9 \u06A9\u0627\u0646\u0641\u06CC\u06AF \u06CC\u0627 JSON", "Configuration link or JSON"), "link")}${menuRow("configFile",t("فایل WireGuard / JSON","WireGuard / JSON file"),t("انتخاب فایل .conf از گوشی","Choose a .conf file from your device"),"file-up")}${menuRow("addQr", t("\u0627\u0633\u06A9\u0646 QR", "Scan QR"), t("\u062F\u0648\u0631\u0628\u06CC\u0646 \u06CC\u0627 \u062A\u0635\u0648\u06CC\u0631 \u06AF\u0627\u0644\u0631\u06CC", "Camera or gallery image"), "scan-line")}${menuRow("addAddress", t("\u0622\u062F\u0631\u0633 \u062F\u0633\u062A\u06CC", "Manual address"), t("\u062F\u0627\u0645\u0646\u0647\u060C HTTPS\u060C TCP \u06CC\u0627 ICMP", "Domain, HTTPS, TCP or ICMP"), "globe")}${menuRow("addServer",t("سرور","Server"),t("پایش IP با پینگ یا TCP","Monitor an IP using ping or TCP"),"server")}</div>`);
}
// Keys retain monitor identity when an alarm, filter, insertion or deletion changes
// siblings. Unkeyed text/markup is reconciled within its existing parent only.
function refreshKey(node) {
  if (node.nodeType !== 1) return '';
  if (node.id) return 'id:' + node.id;
  for (const attr of ['data-monitor-id', 'data-lucide', 'data-nav', 'data-action']) {
    if (node.hasAttribute(attr)) return attr + ':' + node.getAttribute(attr);
  }
  for (const cls of ['mm-head', 'mm-body', 'mm-dashboard', 'mm-grid', 'mm-search-tools', 'mm-tabs', 'mm-footer', 'mm-chart']) {
    if (node.classList.contains(cls)) return 'class:' + cls;
  }
  return '';
}
function sameNodeType(a, b) {
  return a.nodeType === b.nodeType && a.nodeName === b.nodeName && a.namespaceURI === b.namespaceURI;
}
function patchChildren(parent, nextParent) {
  const old = Array.from(parent.childNodes), used = new Set();
  const keyed = new Map(old.map(node => [refreshKey(node), node]).filter(([key]) => key));
  Array.from(nextParent.childNodes).forEach((next, index) => {
    const key = refreshKey(next);
    let node = key ? keyed.get(key) : old.find(item => !used.has(item) && !refreshKey(item) && sameNodeType(item, next));
    if (node && (!sameNodeType(node, next) || used.has(node))) node = null;
    if (node) {
      used.add(node);
      patchNode(node, next);
    } else node = next.cloneNode(true);
    const at = parent.childNodes[index];
    if (at !== node) parent.insertBefore(node, at || null);
  });
  old.forEach(node => { if (!used.has(node) && node.parentNode === parent) parent.removeChild(node); });
}
function patchNode(node, next) {
  if (node.nodeType !== 1) {
    if (node.nodeValue !== next.nodeValue) node.nodeValue = next.nodeValue;
    return;
  }
  // The scheduler owns these live values; never clear/recreate its progress bar.
  if (['next-label', 'next-time', 'next-hint'].includes(node.id) || node.classList.contains('mm-progress')) return;
  Array.from(node.attributes).forEach(attr => {
    if (!next.hasAttribute(attr.name)) node.removeAttribute(attr.name);
  });
  Array.from(next.attributes).forEach(attr => {
    if (node.getAttribute(attr.name) !== attr.value) node.setAttribute(attr.name, attr.value);
  });
  if (node.tagName === 'INPUT' && node.type === 'checkbox') node.checked = next.checked;
  patchChildren(node, next);
}
let renderedScreen = '';
function render(background = false) {
  const tools = view.querySelector('.mm-search-tools');
  if (tools) searchToolsOpen = tools.open;
  const scroll = view.scrollTop;
  if (['detail', 'rules', 'maintenance', 'diagnostics', 'delete'].includes(screen) && !current()) screen = 'home';
  const incremental = background && renderedScreen === screen;
  // Disable browser scroll anchoring in CSS; compensate only if surviving visible
  // cards actually move. Ordinary ping updates never write scrollTop or stop a fling.
  const bounds = view.getBoundingClientRect();
  const anchors = incremental && scroll > 0 ? Array.from(view.querySelectorAll('[data-monitor-id]')).map(el => ({
    id: el.getAttribute('data-monitor-id'), top: el.getBoundingClientRect().top, bottom: el.getBoundingClientRect().bottom
  })).filter(item => item.bottom > bounds.top && item.top < bounds.bottom) : [];
  app.lang = data.prefs.language;
  app.dir = data.prefs.language === 'fa' ? 'rtl' : 'ltr';
  document.documentElement.lang = app.lang;
  document.documentElement.dir = app.dir;
  app.classList.toggle('mm-light', data.prefs.theme === 'light');
  document.body.style.background = data.prefs.theme === 'light' ? '#f4f7f6' : '#050505';
  if (screen === 'detail') history = call('history', { id: selected }).samples || [];
  chartData.clear();
  const markup = ({ home, add, detail, settings, tones, permissions, scan, events, delete: remove, targets, diagnostics, reports, rules, maintenance, backup, widgetPage, about, alertSchedule }[screen] || home)();
  if (['add', 'scan'].includes(screen)) {
    showSheet(markup);
    return;
  }
  const next = document.createElement('template');
  next.innerHTML = markup;
  icons(next.content);
  const nextHeader = document.createElement('div'), h = next.content.querySelector('.mm-head');
  if (h) nextHeader.appendChild(h);
  if (incremental) {
    patchChildren(topbar, nextHeader);
    patchChildren(view, next.content);
    // Navigation does not depend on monitor results. Keep it and its focus intact.
  } else {
    dismissSheet();
    view.textContent = '';
    view.appendChild(next.content);
    topbar.textContent = '';
    while (nextHeader.firstChild) topbar.appendChild(nextHeader.firstChild);
    nav.innerHTML = navMarkup();
    icons(nav);
    view.scrollTop = scroll;
  }
  renderedScreen = screen;
  readSchedule();
  for (const anchor of anchors) {
    const el = view.querySelector(`[data-monitor-id="${anchor.id}"]`);
    if (!el) continue;
    const delta = el.getBoundingClientRect().top - anchor.top;
    if (Math.abs(delta) > 0.5) view.scrollTop += delta;
    break;
  }
}

function go(next, root = false) {
  if (root) navigationHistory = [];
  else if (next !== screen) navigationHistory.push({ screen, selected, scroll: view.scrollTop });
  screen = next;
  chooserOpen = false;
  render();
  view.scrollTop = 0;
}
window.back = () => {
  if(modal.classList.contains("mm-update-modal")&&!modal.hidden){dismissSheet();return;}
  const menu=document.getElementById("method-menu");if(menu?.open){menu.open=false;menu.querySelector("summary").focus();return;}
  if (chooserOpen) {
    dismissSheet();
    document.getElementById("report-node")?.focus();
    return;
  }
  if (screen === "home") {
    action("exit");
    return;
  }
  const old = navigationHistory.pop();
  if (old) {
    screen = old.screen;
    selected = old.selected;
    render();
    view.scrollTop = old.scroll;
  } else go("home", true);
};
function readSchedule() {
  const s = call("schedule");
  if (s.phase) {
    scheduleState = s;
    scheduleReceived = performance.now();
  }
  drawSchedule();
}
function drawSchedule() {
  const label = document.querySelector("#next-label"), timeLabel = document.querySelector("#next-time"), fill = document.querySelector("#next-fill"), track = document.querySelector(".mm-progress"), hint = document.querySelector("#next-hint");
  if (!label || screen !== "home") return;
  const s = scheduleState || {}, stale = performance.now() - scheduleReceived > 3500;
  let phase = !data.prefs.running ? "paused" : !data.nodes.some((n) => n.enabled) ? "empty" : stale ? "unavailable" : s.phase || "unavailable";
  let remaining = Math.max(0, (s.remainingMs || 0) - (performance.now() - scheduleReceived));
  if (phase === "waiting" && remaining <= 0) phase = "queued";
  const labels = { waiting: t("\u062A\u0627 \u0634\u0631\u0648\u0639 \u062A\u0633\u062A \u0628\u0639\u062F\u06CC", "Until the next check"), checking: t("\u062F\u0631 \u062D\u0627\u0644 \u0628\u0631\u0631\u0633\u06CC", "Checking"), queued: t("\u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631 \u0646\u0648\u0628\u062A \u0628\u0631\u0631\u0633\u06CC", "Waiting for a check slot"), paused: t("\u067E\u0627\u06CC\u0634 \u0645\u062A\u0648\u0642\u0641 \u0627\u0633\u062A", "Monitoring paused"), offline: t("\u0627\u06CC\u0646\u062A\u0631\u0646\u062A \u06AF\u0648\u0634\u06CC \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A", "Device network unavailable"), empty: t("\u0645\u0627\u0646\u06CC\u062A\u0648\u0631 \u0641\u0639\u0627\u0644\u06CC \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0631\u062F", "No enabled monitors"), unavailable: t("\u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631 \u0648\u0636\u0639\u06CC\u062A \u0633\u0631\u0648\u06CC\u0633", "Waiting for service status") };
  label.hidden=true;hint.hidden=true;
  timeLabel.textContent = ['waiting','checking','queued'].includes(phase) ? num(Math.ceil(remaining/1000))+' '+t('ثانیه','sec') : labels[phase];
  let progress = ["waiting","checking","queued"].includes(phase) ? Math.max(0, Math.min(100, (1 - remaining / (s.intervalMs || 2e4)) * 100)) : phase === "checking" || phase === "queued" ? 100 : 0;
  fill.style.width = progress + "%";
  track.setAttribute("aria-valuenow", String(Math.round(progress)));
  track.classList.toggle("mm-checking", phase === "checking");
  hint.textContent = phase === "waiting" ? t("\u0632\u0645\u0627\u0646\u200C\u0628\u0646\u062F\u06CC \u0648\u0627\u0642\u0639\u06CC \u0646\u0632\u062F\u06CC\u06A9\u200C\u062A\u0631\u06CC\u0646 \u0628\u0631\u0631\u0633\u06CC", "Actual schedule of the next due check") : phase === "checking" || phase === "queued" ? t("\u0628\u0631\u0631\u0633\u06CC\u200C\u0647\u0627\u06CC \u0637\u0648\u0644\u0627\u0646\u06CC \u06CC\u0627 \u067E\u0631\u062A\u0639\u062F\u0627\u062F \u0645\u0645\u06A9\u0646 \u0627\u0633\u062A \u0632\u0645\u0627\u0646 \u0628\u06CC\u0634\u062A\u0631\u06CC \u0628\u0628\u0631\u0646\u062F", "Slow or numerous checks can take longer") : phase === "offline" ? t("\u067E\u0633 \u0627\u0632 \u0628\u0631\u06AF\u0634\u062A \u0627\u06CC\u0646\u062A\u0631\u0646\u062A\u060C \u067E\u0627\u06CC\u0634 \u0627\u062F\u0627\u0645\u0647 \u0645\u06CC\u200C\u06CC\u0627\u0628\u062F", "Monitoring resumes when the network returns") : phase === "empty" ? t("\u06A9\u0644\u06CC\u062F \u06CC\u06A9 \u0645\u0627\u0646\u06CC\u062A\u0648\u0631 \u0631\u0627 \u0631\u0648\u0634\u0646 \u06A9\u0646\u06CC\u062F", "Enable a monitor to begin") : phase === "unavailable" ? t("\u0632\u0645\u0627\u0646 \u062A\u062E\u0645\u06CC\u0646\u06CC \u0646\u0645\u0627\u06CC\u0634 \u062F\u0627\u062F\u0647 \u0646\u0645\u06CC\u200C\u0634\u0648\u062F", "No estimated countdown is shown") : t("\u0628\u0631\u0627\u06CC \u0634\u0631\u0648\u0639\u060C \u067E\u0627\u06CC\u0634 \u0631\u0627 \u0631\u0648\u0634\u0646 \u06A9\u0646\u06CC\u062F", "Turn monitoring on to begin");
}
setInterval(() => {
  if (appVisible && !document.hidden && screen === "home") readSchedule();
}, 1e3);
setInterval(() => {
  if (appVisible && !document.hidden) drawSchedule();
}, 200);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    sync();
    readSchedule();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.hidden) {
    window.back();
    return;
  }
  if (e.key === "Tab" && !modal.hidden) {
    const controls = Array.from(modal.querySelectorAll("button,input,textarea,select")).filter((el) => !el.disabled), first = controls[0], last = controls[controls.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last == null ? void 0 : last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first == null ? void 0 : first.focus();
    }
  }
});
window.receive = (event, p) => {
  var _a;
  if (event === "visibility") {
    appVisible = !!p.visible;
    if (appVisible) readSchedule();
    return;
  }
  if (event === "refresh") {
    sync();
    if (!chooserOpen && !["add", "settings", "targets", "rules", "backup", "alertSchedule"].includes(screen) && !["INPUT", "TEXTAREA", "SELECT"].includes((_a = document.activeElement) == null ? void 0 : _a.tagName)) render(true);
  } else if (event === "import") {
    sync();
    editing = 0;
    category = "config";
    mode = "links";
    go("add");
    document.querySelector("#raw").value = p.raw;
    notify(t("\u062F\u0631\u06CC\u0627\u0641\u062A \u0634\u062F\u061B \u0628\u0631\u0631\u0633\u06CC \u0648 \u0630\u062E\u06CC\u0631\u0647 \u06A9\u0646\u06CC\u062F", "Imported; review and save"));
  } else if (event === "error" || event === "message") notify(p.message);
  else if(event === "platformAd"){platformAdReady=!!p.available;if(screen==='home'&&modal.hidden)render(true);platformBounds();}
  else if(event === "platformChecked"){sync();if(!data.platform?.update)notify(t('نسخهٔ جدیدی منتشر نشده','You are up to date'));else{dismissSheet();platformUpdate(true);}}
  else if (event === "restoreReady") {
    restoreCount = p.count;
    go("backup");
  } else if (event === "restored") {
    restoreCount = null;
    sync();
    go("home");
    notify(t("\u0628\u0627\u0632\u06CC\u0627\u0628\u06CC \u0627\u0646\u062C\u0627\u0645 \u0634\u062F\u061B \u0645\u0648\u0627\u0631\u062F \u0627\u0641\u0632\u0648\u062F\u0647: ", "Restored; monitors added: ") + num(p.count));
  } else if (event === "restoreCancelled") {
    restoreCount = null;
    render();
  }
};
document.addEventListener("click", (e) => {
  if(e.target===modal){const menu=document.getElementById('method-menu');if(menu)menu.open=false;window.back();return;}
  const menu=document.getElementById('method-menu');if(menu?.open&&!menu.contains(e.target))menu.open=false;
  var _a;
  const b = e.target.closest("button");
  if (!b) return;
  const d = b.dataset;
  if(d.aboutLink){action("aboutLink",{key:d.aboutLink});return;}
  if(d.action==='copyExit'){const ip=current()?.exitIp;if(ip){action('copy',{text:ip});notify(t('IP کپی شد','IP copied'));}return;}
  if(d.action==='egressRefresh'){action('egressRefresh',{id:selected});notify(t('بررسی خروجی در صف قرار گرفت','Exit check queued'));return;}
  if(d.action==='hideAddresses'){action('settings',{hideAddresses:!data.prefs.hideAddresses});sync();render(true);return;}
  if(d.action==='platformCheck'){action('platformCheck');return;}
  if(d.action==='platformLater'){platformDeferred.add(data.platform?.update?.code);dismissSheet();return;}
  if(d.action==='platformDownload'){action('platformDownload');dismissSheet();return;}
  if(d.action==='configFile'){action('configFile');return;}
  if(d.segment){const drafts=[...document.querySelectorAll('#settings-form input')].map(el=>[el.id,el.value,el.checked]);action('settings',{[d.segment]:d.value});sync();render();for(const [id,value,checked] of drafts){const el=document.getElementById(id);if(el){el.value=value;el.checked=checked;}}return;}
  if(d.step){const el=document.getElementById(d.step);el.value=Math.max(+el.min,Math.min(+el.max,(+el.value||+el.min)+ +d.delta));el.dispatchEvent(new Event('input',{bubbles:true}));return;}
  if(d.action==='searchTools') {
    const tools = document.getElementById('search-tools');
    tools.open = !tools.open;
    searchToolsOpen = tools.open;
    b.setAttribute('aria-expanded',String(tools.open));
    if (tools.open) document.getElementById('search').focus({preventScroll:true});
    return;
  }
  if(d.action==='reportPicker'){openReportPicker();return;}
  if(d.pick){selected=+d.pick;dismissSheet();render();document.getElementById('report-node')?.focus();return;}

  if (d.nav) {
    if (d.nav === "reports" && !current() && data.nodes.length) selected = data.nodes[0].id;
    go(d.nav, true);
    return;
  }
  if (d.hours) {
    reportHours = +d.hours;
    render();
    return;
  }
  if (d.maint !== void 0) {
    action("maintenance", { id: selected, minutes: +d.maint });
    sync();
    render();
    return;
  }
  if (d.detail) {
    selected = +d.detail;
    go("detail");
    return;
  }
  if (d.category) {
    category = d.category;
    filter = "all";
    limit = 50;
    render();
    return;
  }
  if (d.filter) {
    filter = d.filter;
    limit = 50;
    render();
    return;
  }
  if (d.mode) {
    mode = d.mode;
    go(mode === "qr" ? "scan" : "add");
    return;
  }
  if (d.play) {
    action("preview", { tone: d.play });
    return;
  }
  if (d.permission) {
    action("permission", { key: d.permission });
    return;
  }
  switch (d.action) {
    case "pinWidget":
      action("widget");
      break;
    case "exportCsv":
      action("csv", { id: selected, hours: reportHours });
      break;
    case "snooze":
      action("snooze");
      break;
    case "restoreFile": {
      const password = document.querySelector("#backup-password").value;
      if (password.length < 10) {
        notify(t("\u0631\u0645\u0632 \u0628\u0627\u06CC\u062F \u062D\u062F\u0627\u0642\u0644 \u06F1\u06F0 \u0646\u0648\u06CC\u0633\u0647 \u0628\u0627\u0634\u062F", "Use at least 10 characters"));
        break;
      }
      action("restore", { password });
      document.querySelector("#backup-password").value = "";
      document.querySelector("#backup-confirm").value = "";
      break;
    }
    case "restoreCommit":
      action("restoreCommit");
      restoreCount = null;
      render();
      break;
    case "restoreCancel":
      action("restoreCancel");
      break;
    case "back":
      window.back();
      break;
    case "add":
      chooseAdd();
      break;
    case "addLinks":
    case "addAddress":
    case "addServer":
      editing = 0;
      mode = "links";
      category = d.action === "addServer" ? "server" : d.action === "addAddress" ? "address" : "config";
      dismissSheet();
      go("add");
      break;
    case "addQr":
      editing = 0;
      category = "config";
      dismissSheet();
      go("scan");
      break;
    case "edit":
      editing = selected;
      category = current().type;
      mode = "links";
      go("add");
      break;
    case "search":
      document.body.dataset.search = document.body.dataset.search === "true" ? "false" : "true";
      if (document.body.dataset.search === "false") search = "";
      render();
      (_a = document.querySelector("#search")) == null ? void 0 : _a.focus();
      break;
    case "more":
      limit += 50;
      render();
      break;
    case "test":
      action("test", { id: selected });
      notify(t("\u062A\u0633\u062A \u0634\u0631\u0648\u0639 \u0634\u062F\u061B \u0646\u062A\u06CC\u062C\u0647 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0645\u06CC\u200C\u0634\u0648\u062F", "Test started; results will update"));
      break;
    case "ack":
      action("ack");
      break;
    case "camera":
      action("scan");
      break;
    case "gallery":
    case "audioFile":
    case "systemTone":
      action(d.action);
      break;
    case "alarmTest":
      action("alarmTest");
      break;
    case "copy":
      action("copy", { text: current().raw });
      notify(t("\u06A9\u067E\u06CC \u0634\u062F", "Copied"));
      break;
    case "confirmDelete":
      action("delete", { id: selected });
      sync();
      go("home");
      break;
    case "targets":
    case "diagnostics":
    case "reports":
    case "rules":
    case "maintenance":
    case "backup":
    case "alertSchedule":
    case "about":
    case "widgetPage":
    case "settings":
    case "events":
    case "scan":
    case "tones":
    case "permissions":
    case "delete":
    case "detail":
      go(d.action);
      break;
  }
});
document.addEventListener("change", (e) => {
  const el = e.target, key = el.dataset.toggle;
  if(el.name==='method'){
    document.getElementById('method-value').textContent=methodLabel(el.value);
    const menu=document.getElementById('method-menu');menu.open=false;menu.querySelector('summary').focus();
    const field=document.getElementById('server-port-field');if(field){field.hidden=el.value!=='TCP';document.getElementById('server-port').required=el.value==='TCP';}
    return;
  }
  if(el.id==='alert-schedule-enabled'){document.getElementById('alert-window-fields').disabled=!el.checked;return;}
  if (el.id === "report-node") {
    selected = +el.value;
    render();
    return;
  }
  if (key === "running") {
    action("running", { value: el.checked });
    data.prefs.running = el.checked;
    scheduleState = null;
    readSchedule();
  } else if (key == null ? void 0 : key.startsWith("node-")) {
    action("toggle", { id: +key.slice(5), enabled: el.checked });
    sync();
    render();
  } else if (key === "theme") {
    action("settings", { theme: el.checked ? "dark" : "light" });
    sync();
    render();
  } else if (["vibrate", "gradual", "resumeBoot", "alertsEnabled"].includes(key)) {
    action("settings", { [key]: el.checked });
    sync();
  } else if (el.id === "language") {
    action("settings", { language: el.value });
    sync();
    render();
  } else if (el.name === "tone") {
    action("settings", { tone: "builtin:" + el.value });
    sync();
    render();
  } else if (el.id === "volume") {
    action("settings", { volume: +el.value });
    sync();
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "search") {
    search = e.target.value;
    const pos = e.target.selectionStart;
    render();
    const f = document.querySelector("#search");
    f.focus();
    f.setSelectionRange(pos, pos);
  }
  if (e.target.id === "volume") document.querySelector("#volume-value").textContent = num(e.target.value) + "\u066A";
});
document.addEventListener("submit", (e) => {
  e.preventDefault();
  if(e.target.id==='alert-schedule-form'){
    const enabled=document.getElementById('alert-schedule-enabled').checked;
    const days=[...document.querySelectorAll('[name="alert-day"]:checked')].reduce((sum,el)=>sum|(1<<Number(el.value)),0);
    const minutes=id=>{const value=document.getElementById(id).value;const [h,m]=value.split(':').map(Number);return value?h*60+m:NaN;},start=minutes('alert-start'),end=minutes('alert-end');
    if(enabled&&(!days||!Number.isFinite(start)||!Number.isFinite(end)||start===end)){notify(t('حداقل یک روز و ساعت شروع و پایان متفاوت انتخاب کنید.','Choose at least one day and different start and end times.'));return;}
    const result=action('settings',{alertScheduleEnabled:enabled,alertDays:days,alertStart:Number.isFinite(start)?start:480,alertEnd:Number.isFinite(end)?end:1380});
    if(result.ok){sync();go('settings');notify(t('زمان‌بندی ذخیره شد','Schedule saved'));}return;
  }
  if (e.target.id === "targets-form") {
    const targets2 = document.querySelector("#targets-list").value.split(/[\r\n]+/).map((s) => s.trim()).filter(Boolean);
    if (action("settings", { targets: targets2 }).ok) {
      sync();
      notify(t("\u0645\u0642\u0635\u062F\u0647\u0627 \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F\u0646\u062F", "Targets saved"));
    }
    return;
  }
  if (e.target.id === "rules-form") {
    const r = action("rules", { id: selected, failureLimit: +document.querySelector("#failure-limit").value, latencyEnabled: document.querySelector("#latency-enabled").checked, latencyMs: +document.querySelector("#latency-ms").value, latencyStreak: +document.querySelector("#latency-streak").value });
    if (r.ok) {
      sync();
      go("detail");
      notify(t("\u0642\u0648\u0627\u0646\u06CC\u0646 \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F\u0646\u062F", "Rules saved"));
    }
    return;
  }
  if (e.target.id === "backup-form") {
    const password = document.querySelector("#backup-password").value, confirm = document.querySelector("#backup-confirm").value;
    if (password !== confirm) {
      notify(t("\u062A\u06A9\u0631\u0627\u0631 \u0631\u0645\u0632 \u06CC\u06A9\u0633\u0627\u0646 \u0646\u06CC\u0633\u062A", "Passwords do not match"));
      return;
    }
    action("backup", { password });
    document.querySelector("#backup-password").value = "";
    document.querySelector("#backup-confirm").value = "";
    return;
  }
  if (e.target.id === "add-form") {
    const fd = new FormData(e.target);let raw=String(fd.get("raw")).trim();
    if(category==='server'&&fd.get('method')==='TCP'){
      const host=raw.replace(/^\[|\]$/g,'');raw=(host.includes(':')?'['+host+']':host)+':'+fd.get('port');
    }
    if (mode === "sub" && category === "config") {
      action("subscription", { url: raw });
      notify(t("\u062F\u0631 \u062D\u0627\u0644 \u062F\u0631\u06CC\u0627\u0641\u062A \u0627\u0634\u062A\u0631\u0627\u06A9\u2026", "Fetching subscription\u2026"));
      return;
    }
    const r = call("save", { raw, name: String(fd.get("name")).trim(), type: category, method: fd.get("method") || "HTTPS", id: editing });
    if (r.ok === false) {
      const box = document.querySelector("#form-error");
      box.hidden = false;
      box.textContent = r.error;
      return;
    }
    sync();
    filter = "all";
    go("home");
    notify(t("\u0645\u0627\u0646\u06CC\u062A\u0648\u0631 \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F", "Monitor saved"));
  } else if (e.target.id === "settings-form") {
    const r = action("settings", { interval: +document.querySelector("#interval").value, failureLimit: +document.querySelector("#global-failure-limit").value, testUrl: document.querySelector("#testUrl").value.trim() });
    if (r.ok) {
      sync();
      notify(t("\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F", "Settings saved"));
    }
  }
});
let reportHours = 24, reportData = {}, restoreCount = null;
function menuRow(action2, title, sub, glyph) {
  return `<button class="mm-setting" data-action="${action2}"><div><h3>${title}</h3><p class="mm-muted">${sub}</p></div>${icon(glyph)}</button>`;
}
function featureMenu() {
  return `<h2 class="mm-section-label">${t('سایر','More')}</h2><div class="mm-settings-group">${menuRow('backup',t('پشتیبان امن','Secure backup'),t('فایل رمزگذاری‌شده با رمز شخصی','Encrypted file with your password'),'lock-keyhole')}${menuRow('widgetPage',t('ویجت صفحهٔ اصلی','Home-screen widget'),t('وضعیت پایش، شروع و توقف','Status, start and pause'),'panels-top-left')}${menuRow('targets',t('مقصدهای جایگزین','Fallback targets'),t('موفقیت یک مقصد کافی است','One successful target is enough'),'route')}${menuRow('about',t('دربارهٔ ما','About us'),t('نسخهٔ برنامه، سایت و تلگرام','App version, website and Telegram'),'info')}</div>`;
}

function detailMenu() {
  const n = current();
  return `<div class="mm-settings-group">${menuRow("diagnostics", t("\u062C\u0632\u0626\u06CC\u0627\u062A \u0622\u062E\u0631\u06CC\u0646 \u062A\u0633\u062A", "Last test details"), t("\u0645\u0642\u0635\u062F\u0647\u0627 \u0648 \u0639\u0644\u062A \u062B\u0628\u062A\u200C\u0634\u062F\u0647\u0654 \u062E\u0637\u0627", "Targets and observed error cause"), "scan-line")}${menuRow("reports", t("\u06AF\u0632\u0627\u0631\u0634 \u067E\u0627\u06CC\u062F\u0627\u0631\u06CC", "Reliability report"), t("\u06F2\u06F4 \u0633\u0627\u0639\u062A / \u06F7 \u0631\u0648\u0632 \u0648 \u062E\u0631\u0648\u062C\u06CC CSV", "24 hours / 7 days and CSV export"), "chart-no-axes-combined")}${menuRow("rules", t("\u0642\u0648\u0627\u0646\u06CC\u0646 \u0647\u0634\u062F\u0627\u0631", "Alert rules"), t("\u0642\u0637\u0639 \u0627\u062A\u0635\u0627\u0644 \u0648 \u062A\u0623\u062E\u06CC\u0631 \u0628\u0627\u0644\u0627", "Failed checks and high latency"), "bell-ring")}${menuRow("maintenance", t("\u062D\u0627\u0644\u062A \u062A\u0639\u0645\u06CC\u0631\u0627\u062A", "Maintenance"), n.maintenanceUntil > Date.now() ? t("\u0647\u0634\u062F\u0627\u0631\u0647\u0627 \u0645\u0648\u0642\u062A\u0627\u064B \u0628\u06CC\u200C\u0635\u062F\u0627 \u0647\u0633\u062A\u0646\u062F", "Alerts are temporarily suppressed") : t("\u0627\u062F\u0627\u0645\u0647\u0654 \u062A\u0633\u062A \u0628\u062F\u0648\u0646 \u0647\u0634\u062F\u0627\u0631 \u0635\u0648\u062A\u06CC", "Continue checking without alarms"), "wrench")}</div>${n.snoozeUntil > Date.now() ? `<p class="notice">${t("\u062A\u0639\u0648\u06CC\u0642 \u0647\u0634\u062F\u0627\u0631 \u062A\u0627 ", "Snoozed until ")}${time(n.snoozeUntil)}</p>` : ""}`;
}
function targets() {
  let urls = data.prefs.targets || [data.prefs.testUrl];
  return header(t("\u0645\u0642\u0635\u062F\u0647\u0627\u06CC \u062A\u0633\u062A", "Probe targets")) + `<div class="mm-body"><div class="mm-feature-hero">${icon("route")}<h2>${t("\u06CC\u06A9 \u067E\u0627\u0633\u062E \u06A9\u0627\u0641\u06CC \u0627\u0633\u062A", "One response is enough")}</h2><p class="mm-muted">${t("\u0645\u0642\u0635\u062F\u0647\u0627 \u0628\u0647 \u062A\u0631\u062A\u06CC\u0628 \u0627\u0632 \u062F\u0627\u062E\u0644 \u06A9\u0627\u0646\u0641\u06CC\u06AF \u062A\u0633\u062A \u0645\u06CC\u200C\u0634\u0648\u0646\u062F. \u0641\u0642\u0637 \u0627\u06AF\u0631 \u0647\u0645\u0647 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0627\u0634\u0646\u062F\u060C \u06CC\u06A9 \u062E\u0637\u0627 \u062B\u0628\u062A \u0645\u06CC\u200C\u0634\u0648\u062F.", "Targets are tested in order through the configuration. Only an unsuccessful cycle counts as one failure.")}</p></div><form id="targets-form"><label class="mm-label" for="targets-list">${t("\u0647\u0631 \u0645\u0642\u0635\u062F \u062F\u0631 \u06CC\u06A9 \u062E\u0637\u061B \u06F1 \u062A\u0627 \u06F5 \u0645\u0642\u0635\u062F", "One target per line; 1\u20135 targets")}</label><textarea class="mm-field mm-targets" id="targets-list" dir="ltr" required spellcheck="false">${esc(urls.join("\n"))}</textarea><p class="notice">${t("\u0645\u0642\u0635\u062F\u0647\u0627\u06CC \u0633\u0628\u06A9 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F. \u0627\u06CC\u0646 \u062A\u0646\u0638\u06CC\u0645 \u0641\u0642\u0637 \u0628\u0631\u0627\u06CC \u062A\u0633\u062A \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0627\u0633\u062A\u061B \u0622\u062F\u0631\u0633\u200C\u0647\u0627\u06CC \u062F\u0633\u062A\u06CC \u0645\u0633\u062A\u0642\u0644 \u0628\u0631\u0631\u0633\u06CC \u0645\u06CC\u200C\u0634\u0648\u0646\u062F.", "Choose lightweight targets. This setting applies to configurations; manual addresses are tested independently.")}</p><button class="mm-primary" type="submit">${icon("check")}${t("\u0630\u062E\u06CC\u0631\u0647 \u0645\u0642\u0635\u062F\u0647\u0627", "Save targets")}</button></form></div>`;
}
function diagnostics() {
  const n = current();
  if (!n) return home();
  const attempts = n.attempts || [];
  const stages = { dns: t("\u0646\u0627\u0645 \u062F\u0627\u0645\u0646\u0647", "DNS"), tls: t("TLS \u0645\u0642\u0635\u062F", "Target TLS"), connect: t("\u0627\u062A\u0635\u0627\u0644", "Connection"), engine: t("\u0645\u0648\u062A\u0648\u0631 \u062A\u0633\u062A", "Probe engine"), http: t("\u067E\u0627\u0633\u062E \u0648\u0628", "HTTP response"), unknown: t("\u0645\u0631\u062D\u0644\u0647 \u0645\u0634\u062E\u0635 \u0646\u0634\u062F\u0647", "Stage not exposed") };
  return header(t("\u062C\u0632\u0626\u06CC\u0627\u062A \u062A\u0633\u062A", "Test details")) + `<div class="mm-body"><h2>${esc(n.name)}</h2><p class="mm-muted">${t("\u0622\u062E\u0631\u06CC\u0646 \u0628\u0631\u0631\u0633\u06CC: ", "Last check: ")}${time(n.lastCheck)}</p><div class="mm-settings-group">${attempts.map((a, i) => `<article class="mm-attempt"><div class="mm-row"><span class="mm-chip">${t("\u0645\u0642\u0635\u062F ", "Target ")}${num(i + 1)}</span><span class="${a.ok ? "mm-good" : "mm-bad"}">${a.ok ? num(a.ms) + " ms" : t("\u0646\u0627\u0645\u0648\u0641\u0642", "Failed")}</span></div><p class="mm-host mm-break">${esc(a.target)}</p><p>${a.ok ? t("\u067E\u0627\u0633\u062E \u0648\u0627\u0642\u0639\u06CC \u062F\u0631\u06CC\u0627\u0641\u062A \u0634\u062F", "A real response was received") : esc(errorText(a.error))}</p>${!a.ok ? `<p class="mm-muted">${t("\u0645\u0631\u062D\u0644\u0647\u0654 \u0642\u0627\u0628\u0644 \u062A\u0634\u062E\u06CC\u0635: ", "Identified stage: ")}${stages[a.stage] || stages.unknown}</p>` : ""}</article>`).join("") || `<div class="empty">${t("\u0647\u0646\u0648\u0632 \u0646\u062A\u06CC\u062C\u0647\u200C\u0627\u06CC \u062B\u0628\u062A \u0646\u0634\u062F\u0647", "No test results yet")}</div>`}</div><p class="notice">${t("\u0627\u06AF\u0631 \u0645\u0648\u062A\u0648\u0631 \u062A\u0633\u062A \u0645\u0631\u062D\u0644\u0647\u0654 \u062E\u0637\u0627 \u0631\u0627 \u0645\u0634\u062E\u0635 \u0646\u06A9\u0646\u062F\u060C \u0647\u0645\u0627\u0646 \xAB\u0645\u0631\u062D\u0644\u0647 \u0645\u0634\u062E\u0635 \u0646\u0634\u062F\u0647\xBB \u0646\u0645\u0627\u06CC\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F. \u0645\u0648\u0641\u0642\u200C\u0628\u0648\u062F\u0646 DNS\u060C TLS \u06CC\u0627 \u0627\u062D\u0631\u0627\u0632 \u0647\u0648\u06CC\u062A \u062D\u062F\u0633 \u0632\u062F\u0647 \u0646\u0645\u06CC\u200C\u0634\u0648\u062F.", "When the engine does not expose the failure stage, it remains unknown. DNS, TLS and authentication success are never inferred.")}</p><button class="mm-primary" data-action="test" ${n.enabled ? "" : "disabled"}>${icon("activity")}${t("\u062A\u0633\u062A \u062F\u0648\u0628\u0627\u0631\u0647", "Test again")}</button></div>`;
}
const duration = (ms) => num(Math.round(ms / 6e4)) + t(" \u062F\u0642\u06CC\u0642\u0647", " min");
function reports() {
  if (!current() && data.nodes.length) selected = data.nodes[0].id;
  const n = current();
  if (!n) return header(t('گزارش‌ها','Reports')) + `<div class="empty">${icon('chart-no-axes-combined')}<h2>${t('هنوز مانیتوری ندارید','No monitors yet')}</h2><p class="mm-muted">${t('پس از افزودن مانیتور و شروع پایش، گزارش ساخته می‌شود.','Add a monitor and start checking to collect a report.')}</p></div>`;
  reportData = call('report',{id:selected,hours:reportHours});
  const r = reportData, known = (r.up||0)+(r.down||0), buckets = r.buckets||[], bars = [], hourly = [];
  for (let i=0;i<reportHours;i++) {
    const at = (r.from||0)+i*36e5, b = buckets.find(x=>x.time===at), count = b ? b.ok+b.fail : 0;
    hourly.push(b||{time:at,ok:0,fail:0,average:-1});
    const health = count ? Math.max(0,Math.min(100,b.ok/count*100)) : 0;
    bars.push(`<span class="mm-report-bar ${count?'':'mm-no-data'}" style="--health:${health}%" title="${esc(new Date(at).toLocaleString(data.prefs.language==='fa'?'fa-IR':'en-US'))}: ${count?num(Math.round(health))+'%':t('بدون داده','No data')}"></span>`);
  }
  const s = state(n), statusClass = ['good','slow','bad'].includes(s)?'mm-'+s:'mm-muted';
  return header(t('گزارش پایداری','Reliability report')) + `<div class="mm-body mm-reports-page">
    <button id="report-node" class="mm-field mm-picker" data-action="reportPicker" aria-label="${esc(t('انتخاب مانیتور: ','Select monitor: ')+n.name)}" aria-haspopup="dialog"><span class="mm-picker-name"><strong>${esc(n.name)}</strong><small class="${statusClass}"><span class="mm-dot"></span>${status(s)}</small></span>${icon('chevron-down')}</button>
    <div class="mm-tabs mm-report-period" role="group" aria-label="${t('بازهٔ گزارش','Report period')}">${[[24,t('۲۴ ساعت','24 hours')],[168,t('۷ روز','7 days')]].map(([hours,label])=>`<button data-hours="${hours}" aria-pressed="${reportHours===hours}" class="${reportHours===hours?'mm-selected':''}">${label}</button>`).join('')}</div>
    <div class="mm-report-hero"><strong>${known&&Number.isFinite(r.availability)?num(Math.round(r.availability*100)/100)+(data.prefs.language==='fa'?'٪':'%'):'—'}</strong><span>${t('پایداری در زمان مشاهده‌شده','Availability during observed time')}</span><span class="mm-muted">${t('پوشش زمانی: ','Time coverage: ')}${num(Math.round((r.coverage||0)*10)/10)}${data.prefs.language==='fa'?'٪':'%'}</span></div>
    <section class="mm-chart mm-report-panel"><h3>${t('روند پایداری','Reliability trend')}</h3><p class="mm-muted">${t('نرخ موفقیت ساعتی تست‌ها','Hourly check success rate')}</p><div class="mm-report-plot"><div class="mm-report-axis" aria-hidden="true"><span>${num(100)}%</span><span>${num(50)}%</span><span>${num(0)}%</span></div>${interactiveChart("report-"+n.id+"-"+reportHours,hourly,`<div class="mm-report-chart" style="gap:${reportHours>24?1:3}px" role="img" aria-label="${t('سبز: موفق؛ قرمز: ناموفق؛ خاکستری: بدون داده','Green: success; red: failure; grey: no data')}">${bars.join('')}</div>`,true,50/reportHours)}</div>
    <div class="chart-labels"><span>${localDigits(new Date(r.from||Date.now()).toLocaleDateString(data.prefs.language==='fa'?'fa-IR':'en-US'))}</span><span>${t('اکنون','Now')}</span></div>
    <div class="mm-stats mm-report-metrics"><div class="mm-stat"><span class="mm-muted">${t('زمان قطعی','Observed downtime')}</span><strong>${duration(r.down||0)}</strong></div><div class="mm-stat"><span class="mm-muted">${t('میانگین پینگ','Average response')}</span><strong class="mm-good" dir="ltr">${Number.isFinite(r.average)&&r.average>=0?num(r.average)+' ms':'—'}</strong></div><div class="mm-stat"><span class="mm-muted">${t('تعداد قطعی','Outage starts')}</span><strong class="${r.outages?'mm-bad':''}">${num(r.outages||0)}</strong></div></div></section>
    <button class="mm-secondary mm-wide" data-action="exportCsv">${icon('download')}${t('خروجی CSV','Export CSV')}</button>
    <p class="mm-caption">${num(r.ok||0)} ${t('موفق','successful')} · ${num(r.fail||0)} ${t('ناموفق','failed')}</p>
    <p class="mm-report-note mm-muted">${t('گزارش از مرز ساعتی محاسبه می‌شود. هر بررسی حداکثر تا دو فاصلهٔ تست معتبر است؛ توقف پایش و فاصله‌های طولانی، زمان نامشخص‌اند.','Reports use hourly boundaries. Each check remains valid for up to two check intervals; pauses and longer gaps are unknown.')}</p>
  </div>`;
}

function rules() {
  const n = current();
  if (!n) return home();
  const r = n.rules || {};
  return header(t("\u0642\u0648\u0627\u0646\u06CC\u0646 \u0647\u0634\u062F\u0627\u0631", "Alert rules")) + `<div class="mm-body"><h2>${esc(n.name)}</h2><p class="mm-muted">${t("\u0627\u06CC\u0646 \u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0641\u0642\u0637 \u0628\u0631\u0627\u06CC \u0647\u0645\u06CC\u0646 \u0645\u0627\u0646\u06CC\u062A\u0648\u0631 \u0627\u0633\u062A.", "These rules apply only to this monitor.")}</p><form id="rules-form"><div class="mm-settings-group"><label class="mm-setting" for="failure-limit"><span>${t("\u062A\u0639\u062F\u0627\u062F \u062E\u0637\u0627\u06CC \u067E\u06CC\u0627\u067E\u06CC", "Consecutive failures")}</span><input class="mm-field mm-short" id="failure-limit" type="number" min="1" max="100" value="${r.failureLimit || data.prefs.failureLimit || 6}" required></label>${setting(t("\u0647\u0634\u062F\u0627\u0631 \u062A\u0623\u062E\u06CC\u0631 \u0628\u0627\u0644\u0627", "High latency alert"), `<label class="mm-switch"><input type="checkbox" id="latency-enabled" ${r.latencyEnabled ? "checked" : ""} aria-label="${t("\u0647\u0634\u062F\u0627\u0631 \u062A\u0623\u062E\u06CC\u0631 \u0628\u0627\u0644\u0627", "High latency alert")}"></label>`)}<label class="mm-setting" for="latency-ms"><span>${t("\u0622\u0633\u062A\u0627\u0646\u0647\u0654 \u062A\u0623\u062E\u06CC\u0631 (ms)", "Latency threshold (ms)")}</span><input class="mm-field mm-short" id="latency-ms" type="number" min="50" max="120000" required value="${r.latencyMs || 700}"></label><label class="mm-setting" for="latency-streak"><span>${t("\u062A\u0639\u062F\u0627\u062F \u062A\u0633\u062A \u06A9\u0646\u062F\u0650 \u067E\u06CC\u0627\u067E\u06CC", "Consecutive slow checks")}</span><input class="mm-field mm-short" id="latency-streak" type="number" min="1" max="100" required value="${r.latencyStreak || 3}"></label></div><p class="notice">${t("\u0630\u062E\u06CC\u0631\u0647\u0654 \u0642\u0627\u0646\u0648\u0646\u060C \u0634\u0645\u0627\u0631\u0646\u062F\u0647\u200C\u0647\u0627\u06CC \u0647\u0634\u062F\u0627\u0631 \u0627\u06CC\u0646 \u0645\u0627\u0646\u06CC\u062A\u0648\u0631 \u0631\u0627 \u0627\u0632 \u0646\u0648 \u0634\u0631\u0648\u0639 \u0645\u06CC\u200C\u06A9\u0646\u062F.", "Saving a rule resets this monitor\u2019s alert counters.")}</p><button type="submit" class="mm-primary">${icon("check")}${t("\u0630\u062E\u06CC\u0631\u0647 \u0642\u0648\u0627\u0646\u06CC\u0646", "Save rules")}</button></form></div>`;
}
function maintenance() {
  const n = current();
  if (!n) return home();
  let active = n.maintenanceUntil > Date.now();
  return header(t("\u062D\u0627\u0644\u062A \u062A\u0639\u0645\u06CC\u0631\u0627\u062A", "Maintenance")) + `<div class="mm-body"><div class="mm-feature-hero">${icon("wrench")}<h2>${esc(n.name)}</h2><p class="mm-muted">${t("\u0628\u0631\u0631\u0633\u06CC \u0648 \u062B\u0628\u062A \u06AF\u0632\u0627\u0631\u0634 \u0627\u062F\u0627\u0645\u0647 \u062F\u0627\u0631\u062F\u061B \u0635\u062F\u0627\u06CC \u0647\u0634\u062F\u0627\u0631 \u0627\u06CC\u0646 \u0645\u0627\u0646\u06CC\u062A\u0648\u0631 \u0645\u0648\u0642\u062A\u0627\u064B \u062E\u0627\u0645\u0648\u0634 \u0645\u06CC\u200C\u0634\u0648\u062F.", "Checks and history continue while this monitor\u2019s alerts are suppressed.")}</p></div>${active ? `<p class="notice">${t("\u0641\u0639\u0627\u0644 \u062A\u0627 ", "Active until ")}${time(n.maintenanceUntil)}</p><button class="mm-primary" data-maint="0">${t("\u067E\u0627\u06CC\u0627\u0646 \u062A\u0639\u0645\u06CC\u0631\u0627\u062A", "End maintenance")}</button>` : ""}<div class="mm-maint-options">${[30, 60, 120].map((m) => `<button class="mm-secondary" data-maint="${m}">${num(m)} ${t("\u062F\u0642\u06CC\u0642\u0647", "minutes")}</button>`).join("")}</div><p class="mm-caption">${t("\u067E\u0633 \u0627\u0632 \u067E\u0627\u06CC\u0627\u0646\u060C \u0627\u06AF\u0631 \u0645\u0634\u06A9\u0644 \u0647\u0645\u0686\u0646\u0627\u0646 \u0648\u062C\u0648\u062F \u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F\u060C \u0646\u062A\u06CC\u062C\u0647\u0654 \u062A\u0633\u062A \u062A\u0627\u0632\u0647 \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u062F \u0647\u0634\u062F\u0627\u0631 \u0631\u0627 \u0641\u0639\u0627\u0644 \u06A9\u0646\u062F.", "After maintenance ends, a fresh failing check can trigger an alert if the problem persists.")}</p></div>`;
}
function backup() {
  return header(t("\u067E\u0634\u062A\u06CC\u0628\u0627\u0646 \u0627\u0645\u0646", "Secure backup")) + `<div class="mm-body"><div class="mm-feature-hero">${icon("lock-keyhole")}<h2>${t("\u06A9\u0627\u0646\u0641\u06CC\u06AF\u200C\u0647\u0627\u060C \u0628\u0627 \u0631\u0645\u0632 \u062E\u0648\u062F\u062A\u0627\u0646", "Your configurations, your password")}</h2><p class="mm-muted">${t("\u06A9\u0627\u0646\u0641\u06CC\u06AF\u200C\u0647\u0627\u060C \u0642\u0648\u0627\u0646\u06CC\u0646 \u0648 \u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u062F\u0631 \u06CC\u06A9 \u0641\u0627\u06CC\u0644 \u0631\u0645\u0632\u06AF\u0630\u0627\u0631\u06CC\u200C\u0634\u062F\u0647 \u0630\u062E\u06CC\u0631\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F. \u0631\u0645\u0632 \u0642\u0627\u0628\u0644 \u0628\u0627\u0632\u06CC\u0627\u0628\u06CC \u0646\u06CC\u0633\u062A.", "Save configurations, rules and settings in an encrypted file. A forgotten password cannot be recovered.")}</p></div><form id="backup-form"><label class="mm-label" for="backup-password">${t("\u0631\u0645\u0632 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u061B \u062D\u062F\u0627\u0642\u0644 \u06F1\u06F0 \u0646\u0648\u06CC\u0633\u0647", "Backup password; at least 10 characters")}</label><input class="mm-field" id="backup-password" type="password" autocomplete="off" minlength="10" maxlength="1024" required><label class="mm-label" for="backup-confirm">${t("\u062A\u06A9\u0631\u0627\u0631 \u0631\u0645\u0632 \u0628\u0631\u0627\u06CC \u0633\u0627\u062E\u062A \u0641\u0627\u06CC\u0644", "Confirm password when creating a file")}</label><input class="mm-field" id="backup-confirm" type="password" autocomplete="off" maxlength="1024"><div class="mm-maint-options"><button class="mm-primary" type="submit">${icon("download")}${t("\u0633\u0627\u062E\u062A \u067E\u0634\u062A\u06CC\u0628\u0627\u0646", "Create backup")}</button><button class="mm-secondary" type="button" data-action="restoreFile">${icon("upload")}${t("\u0628\u0627\u0632\u06CC\u0627\u0628\u06CC \u0627\u0632 \u0641\u0627\u06CC\u0644", "Restore file")}</button></div></form>${restoreCount !== null ? `<section class="mm-panel"><h3>${num(restoreCount)} ${t("\u0645\u0627\u0646\u06CC\u062A\u0648\u0631 \u062F\u0631 \u0641\u0627\u06CC\u0644", "monitors in file")}</h3><p class="notice">${t("\u0645\u0648\u0627\u0631\u062F \u062C\u062F\u06CC\u062F \u0627\u0636\u0627\u0641\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F\u061B \u0645\u0648\u0627\u0631\u062F \u062A\u06A9\u0631\u0627\u0631\u06CC \u0648 \u062A\u0627\u0631\u06CC\u062E\u0686\u0647\u0654 \u0645\u0648\u062C\u0648\u062F \u062F\u0633\u062A\u200C\u0646\u062E\u0648\u0631\u062F\u0647 \u0645\u06CC\u200C\u0645\u0627\u0646\u0646\u062F. \u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0628\u0631\u0646\u0627\u0645\u0647 \u0627\u0632 \u0641\u0627\u06CC\u0644 \u0628\u0627\u0632\u06CC\u0627\u0628\u06CC \u0645\u06CC\u200C\u0634\u0648\u062F. \u0627\u062F\u0627\u0645\u0647 \u0645\u06CC\u200C\u062F\u0647\u06CC\u062F\u061F", "New monitors will be added; duplicates and existing history are preserved. App settings will be restored from the file. Continue?")}</p><div class="mm-actions"><button class="mm-primary" data-action="restoreCommit">${t("\u0628\u0627\u0632\u06CC\u0627\u0628\u06CC", "Restore")}</button><button class="mm-secondary" data-action="restoreCancel">${t("\u0627\u0646\u0635\u0631\u0627\u0641", "Cancel")}</button></div></section>` : ""}<p class="mm-caption">${t("\u062A\u0627\u0631\u06CC\u062E\u0686\u0647 \u0648 \u0641\u0627\u06CC\u0644 \u0632\u0646\u06AF \u0633\u0641\u0627\u0631\u0634\u06CC \u062F\u0627\u062E\u0644 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646 \u0646\u06CC\u0633\u062A\u0646\u062F. \u0641\u0627\u06CC\u0644 \u0647\u0631 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646 \u062D\u062F\u0627\u06A9\u062B\u0631 \u06F3\u06F2 \u0645\u06AF\u0627\u0628\u0627\u06CC\u062A \u0627\u0633\u062A.", "History and custom audio files are excluded. Each backup file can be up to 32 MiB.")}<br>AES-256-GCM \xB7 PBKDF2-SHA256</p></div>`;
}
function widgetPage() {
  const enabled = data.nodes.filter((n) => n.enabled), good = enabled.filter((n) => ["good", "slow"].includes(n.state)).length;
  return header(t("\u0648\u06CC\u062C\u062A \u0635\u0641\u062D\u0647\u0654 \u0627\u0635\u0644\u06CC", "Home-screen widget")) + `<div class="mm-body"><div class="mm-feature-hero">${icon("panels-top-left")}<h2>${t("\u0648\u0636\u0639\u06CC\u062A \u067E\u0627\u06CC\u0634\u060C \u062F\u0631 \u06CC\u06A9 \u0646\u06AF\u0627\u0647", "Monitor status at a glance")}</h2></div><section class="mm-widget-preview"><h2 class="mm-en mm-good">Config Monitor</h2><p>${data.prefs.running ? t("\u067E\u0627\u06CC\u0634 \u0641\u0639\u0627\u0644 \u0627\u0633\u062A", "Monitoring active") : t("\u067E\u0627\u06CC\u0634 \u0645\u062A\u0648\u0642\u0641 \u0627\u0633\u062A", "Monitoring paused")}</p><p class="mm-muted">${num(good)} ${t("\u0633\u0627\u0644\u0645", "online")} \xB7 ${num(enabled.length)} ${t("\u0641\u0639\u0627\u0644", "enabled")}</p><div class="mm-actions"><span class="mm-chip">${t("\u0634\u0631\u0648\u0639 / \u062A\u0648\u0642\u0641", "Start / pause")}</span><span class="mm-chip">${t("\u0628\u0627\u0632\u06A9\u0631\u062F\u0646 \u0628\u0631\u0646\u0627\u0645\u0647", "Open app")}</span></div></section><button class="mm-primary" data-action="pinWidget">${icon("plus")}${t("\u0627\u0641\u0632\u0648\u062F\u0646 \u0628\u0647 \u0635\u0641\u062D\u0647\u0654 \u0627\u0635\u0644\u06CC", "Add to home screen")}</button><p class="notice">${t("\u0627\u06AF\u0631 \u067E\u0646\u062C\u0631\u0647\u0654 \u0627\u0641\u0632\u0648\u062F\u0646 \u0628\u0627\u0632 \u0646\u0634\u062F\u060C \u0631\u0648\u06CC \u0635\u0641\u062D\u0647\u0654 \u0627\u0635\u0644\u06CC \u0646\u06AF\u0647 \u062F\u0627\u0631\u06CC\u062F \u0648 \u0627\u0632 \u0628\u062E\u0634 \u0648\u06CC\u062C\u062A\u200C\u0647\u0627 Config Monitor \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F.", "If no add dialog appears, long-press your home screen and select Config Monitor from Widgets.")}</p></div>`;
}
sync();
render();

function segments(key,choices,value){return `<div class="mm-segments" role="group">${choices.map(([v,label])=>`<button type="button" data-segment="${key}" data-value="${v}" aria-pressed="${value===v}">${label}</button>`).join('')}</div>`;}
function stepper(id,value,min,max){return `<div class="mm-stepper" dir="ltr"><button type="button" data-step="${id}" data-delta="-1" aria-label="${t('کاهش','Decrease')}">−</button><input class="mm-field" id="${id}" type="number" min="${min}" max="${max}" value="${value}" required aria-label="${id==='interval'?t('فاصلهٔ تست به ثانیه','Check interval in seconds'):t('تعداد خطا','Failure limit')}"><button type="button" data-step="${id}" data-delta="1" aria-label="${t('افزایش','Increase')}">+</button></div>`;}
function pickerRows(query=''){const q=query.trim().toLocaleLowerCase();return data.nodes.filter(n=>(n.name+' '+n.host+' '+n.p).toLocaleLowerCase().includes(q)).map(n=>`<button class="mm-pick-row ${selected===n.id?'mm-picked':''}" data-pick="${n.id}" aria-current="${selected===n.id}"><span><strong>${esc(n.name)}</strong><small dir="ltr">${esc(n.host)} · ${esc(n.p)}</small><small>${esc(status(n.state))}</small></span>${selected===n.id?icon('check'):''}</button>`).join('')||`<p class="mm-muted">${t('موردی یافت نشد','No matches')}</p>`;}
function openReportPicker(){chooserOpen=true;showSheet(header(t('انتخاب مانیتور','Select monitor'),false,ib('x','back',t('بستن','Close')))+`<label class="mm-label" for="picker-search">${t('جست‌وجوی نام یا آدرس','Search name or address')}</label><input class="mm-field" id="picker-search" type="search"><div id="picker-results">${pickerRows()}</div>`);modal.querySelector('[role=dialog]').setAttribute('aria-label',t('انتخاب مانیتور','Select monitor'));}
document.addEventListener('input',e=>{if(e.target.id==='picker-search'){document.getElementById('picker-results').innerHTML=pickerRows(e.target.value);icons();}});

document.addEventListener('toggle', e => {
  if (e.target.id !== 'search-tools') return;
  searchToolsOpen = e.target.open;
  document.querySelector('[data-action="searchTools"]')?.setAttribute('aria-expanded',String(searchToolsOpen));
}, true);
