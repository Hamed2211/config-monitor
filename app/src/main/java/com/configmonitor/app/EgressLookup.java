package com.configmonitor.app;
import org.json.*;
import java.net.*;
import java.util.*;
import java.util.concurrent.*;
/** Per-configuration results; two configs with the same entry host can have different exits. */
final class EgressLookup {
 static final Set<Long> pending=ConcurrentHashMap.newKeySet();
 static final ThreadPoolExecutor workers=new ThreadPoolExecutor(1,1,30,TimeUnit.SECONDS,new ArrayBlockingQueue<>(64),r->{Thread t=new Thread(r,"egress-lookup");t.setDaemon(true);return t;});
 static boolean due(JSONObject node,long now,boolean force){return node!=null&&node.optString("type").equals("config")&&node.optBoolean("enabled",true)&&(force||now-node.optLong("egressAttemptAt")>=(node.optString("egressState").equals("ok")?600000:120000));}
 static void request(JSONObject node,boolean force){
  if(!due(node,System.currentTimeMillis(),force))return;long id=node.optLong("id"),rev=node.optLong("revision");if(!pending.add(id))return;
  try{final JSONObject snapshot=new JSONObject(node.toString());workers.execute(()->{
   try{JSONObject current=App.db.get(id);if(current==null||current.optLong("revision")!=rev||!current.optBoolean("enabled",true))return;
    if(!App.db.egressStarted(id,rev))return;App.update();
    String ip="",country="";try{ip=EgressProbe.lookup(snapshot);country=CountryLookup.database().country(InetAddress.getByName(ip).getAddress());}catch(Exception ignored){}
    App.db.egressCompleted(id,rev,ip,country);App.update();
   }finally{pending.remove(id);}
  });}catch(JSONException|RejectedExecutionException e){pending.remove(id);}
 }
}
