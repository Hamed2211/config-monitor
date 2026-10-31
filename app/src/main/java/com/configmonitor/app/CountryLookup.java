package com.configmonitor.app;
import org.json.*;
import java.net.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.zip.GZIPInputStream;
/** Lookup is isolated from probes: DNS delays never delay monitoring or alarms. */
final class CountryLookup {
 static final class Entry {final String country;final long expires;Entry(String c,long e){country=c;expires=e;}}
 static final Map<String,Entry> cache=Collections.synchronizedMap(new LinkedHashMap<String,Entry>(128,.75f,true){protected boolean removeEldestEntry(Map.Entry<String,Entry> e){return size()>512;}});
 static final Set<String> pending=ConcurrentHashMap.newKeySet();
 static final ThreadPoolExecutor workers=new ThreadPoolExecutor(2,2,30,TimeUnit.SECONDS,new ArrayBlockingQueue<>(64),r->{Thread t=new Thread(r,"country-lookup");t.setDaemon(true);return t;});
 static volatile CountryDatabase database;
 static synchronized CountryDatabase database()throws Exception{
  if(database==null)try(GZIPInputStream in=new GZIPInputStream(App.app.getAssets().open("country-ranges.bin.gz"))){database=new CountryDatabase(in);}return database;
 }
 static boolean publicAddress(InetAddress ip){byte[] b=ip.getAddress();if(ip.isAnyLocalAddress()||ip.isLoopbackAddress()||ip.isLinkLocalAddress()||ip.isSiteLocalAddress()||ip.isMulticastAddress())return false;
  return b.length==4?!((b[0]&255)==100&&(b[1]&255)>=64&&(b[1]&255)<=127)&&((b[0]&255)<240)&&b[0]!=0:(b[0]&254)!=252;
 }
 static void decorate(JSONObject node){
  if(node.optString("type").equals("config")){
   try{
    if(node.optLong("egressAt")<=0||node.optString("exitIp").isEmpty())node.put("countryCode","");
    String code=node.optString("countryCode");if(!code.isEmpty()){Locale region=new Locale("",code);node.put("countryFa",region.getDisplayCountry(new Locale("fa"))).put("countryEn",region.getDisplayCountry(Locale.ENGLISH));}
    if(node.optString("egressState").equals("checking")&&!EgressLookup.pending.contains(node.optLong("id")))node.put("egressState",node.optLong("egressAt")>0?"stale":"unknown");
   }catch(JSONException ignored){}return;
  }
  String host=node.optString("host").replace("[","").replace("]","").toLowerCase(Locale.ROOT);if(host.isEmpty())return;
  Entry entry=cache.get(host);long now=System.currentTimeMillis();
  try{String code=entry==null?"":entry.country;node.put("countryCode",code);if(!code.isEmpty()){Locale region=new Locale("",code);node.put("countryFa",region.getDisplayCountry(new Locale("fa"))).put("countryEn",region.getDisplayCountry(Locale.ENGLISH));}}catch(JSONException ignored){}
  if(entry!=null&&entry.expires>now||!pending.add(host))return;
  try{workers.execute(()->{String code="";try{CountryDatabase db=database();for(InetAddress ip:InetAddress.getAllByName(host)){if(publicAddress(ip)){code=db.country(ip.getAddress());if(!code.isEmpty())break;}}}catch(Exception ignored){}
   cache.put(host,new Entry(code,System.currentTimeMillis()+(code.isEmpty()?60000:21600000)));pending.remove(host);App.update();
  });}catch(RejectedExecutionException e){pending.remove(host);}
 }
}
