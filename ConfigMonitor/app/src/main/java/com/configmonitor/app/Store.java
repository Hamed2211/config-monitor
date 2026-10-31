package com.configmonitor.app;
import android.content.*;
import android.database.*;
import android.database.sqlite.*;
import org.json.*;
import java.util.*;
public final class Store extends SQLiteOpenHelper {
 public Store(Context c){super(c,"monitor.db",null,2);setWriteAheadLoggingEnabled(true);}
 public void onCreate(SQLiteDatabase d){d.execSQL("CREATE TABLE nodes(id INTEGER PRIMARY KEY AUTOINCREMENT,data TEXT NOT NULL)");d.execSQL("CREATE TABLE samples(id INTEGER PRIMARY KEY AUTOINCREMENT,node INTEGER,time INTEGER,ms INTEGER)");d.execSQL("CREATE INDEX samples_node ON samples(node,id)");d.execSQL("CREATE TABLE events(id INTEGER PRIMARY KEY AUTOINCREMENT,time INTEGER,name TEXT,kind TEXT)");createReports(d);}
 public void onUpgrade(SQLiteDatabase d,int a,int b){if(a<2)createReports(d);}
 private void createReports(SQLiteDatabase d){d.execSQL("CREATE TABLE IF NOT EXISTS report(node INTEGER,bucket INTEGER,ok INTEGER NOT NULL DEFAULT 0,fail INTEGER NOT NULL DEFAULT 0,latency INTEGER NOT NULL DEFAULT 0,up INTEGER NOT NULL DEFAULT 0,down INTEGER NOT NULL DEFAULT 0,outages INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(node,bucket))");d.execSQL("CREATE INDEX IF NOT EXISTS report_time ON report(bucket)");}
 public synchronized JSONArray all(){JSONArray out=new JSONArray();try(Cursor c=getReadableDatabase().rawQuery("SELECT id,data FROM nodes ORDER BY id",null)){while(c.moveToNext())try{out.put(new JSONObject(c.getString(1)).put("id",c.getLong(0)));}catch(Exception ignored){}}return out;}
 // Snapshot-only decoration: one grouped query, never serialized into saved configurations.
 public synchronized JSONArray dashboard(){
  JSONArray nodes=all();Map<Long,double[]> stats=new HashMap<>();long hour=3600000L,end=System.currentTimeMillis()/hour*hour,from=end-23*hour;
  try(Cursor c=getReadableDatabase().rawQuery("SELECT node,SUM(up),SUM(down) FROM report WHERE bucket>=? AND bucket<=? GROUP BY node",new String[]{""+from,""+end})){
   while(c.moveToNext()){double up=c.getLong(1),down=c.getLong(2);stats.put(c.getLong(0),new double[]{up+down>0?100*up/(up+down):-1,up+down});}
  }
  for(int i=0;i<nodes.length();i++)try{JSONObject n=nodes.getJSONObject(i);double[] v=stats.get(n.optLong("id"));CountryLookup.decorate(n);n.put("uptime",v==null?-1:v[0]).put("observedMs",v==null?0:v[1]).put("uptimeHours",24);}catch(JSONException ignored){}
  return nodes;
 }
 public synchronized JSONObject get(long id){try(Cursor c=getReadableDatabase().rawQuery("SELECT data FROM nodes WHERE id=?",new String[]{""+id})){if(c.moveToFirst())return new JSONObject(c.getString(0)).put("id",id);}catch(Exception ignored){}return null;}
 public synchronized long save(JSONObject m){long id=m.optLong("id");ContentValues v=new ContentValues();v.put("data",m.toString());if(id==0)id=getWritableDatabase().insertOrThrow("nodes",null,v);else getWritableDatabase().update("nodes",v,"id=?",new String[]{""+id});return id;}
 public synchronized void edit(JSONObject m,long id){JSONObject old=get(id);try{m.put("id",id).put("revision",old==null?1:old.optLong("revision")+1).put("enabled",old==null||old.optBoolean("enabled",true));if(old!=null)for(String key:new String[]{"rules","snoozeUntil","maintenanceUntil"})if(old.has(key))m.put(key,old.get(key));save(m);Alerts.dismiss(id);}catch(JSONException e){throw new IllegalArgumentException(e);}}
 public synchronized void toggle(long id,boolean enabled){JSONObject m=get(id);if(m==null)return;try{m.put("enabled",enabled).put("revision",m.optLong("revision")+1).put("failures",0).put("incident",false).put("ack",false).put("state","pending").put("alerted",false).put("incidentReason","").put("slowStreak",0).put("lastCheck",0);save(m);if(!enabled)Alerts.dismiss(id);}catch(Exception ignored){}}
 public synchronized void delete(long id){Alerts.dismiss(id);getWritableDatabase().delete("report","node=?",new String[]{""+id});getWritableDatabase().delete("nodes","id=?",new String[]{""+id});getWritableDatabase().delete("samples","node=?",new String[]{""+id});}
 public synchronized void event(String name,String kind){ContentValues v=new ContentValues();v.put("time",System.currentTimeMillis());v.put("name",name);v.put("kind",kind);getWritableDatabase().insert("events",null,v);getWritableDatabase().execSQL("DELETE FROM events WHERE id NOT IN (SELECT id FROM events ORDER BY id DESC LIMIT 1000)");}
 public synchronized boolean result(long id,long rev,Engine.Result r){JSONObject m=get(id);if(m==null||!m.optBoolean("enabled",true)||m.optLong("revision")!=rev)return false;SQLiteDatabase d=getWritableDatabase();d.beginTransaction();try{
  long now=System.currentTimeMillis();boolean recovered=r.ok&&m.optString("state").equals("bad");
  record(m,r,now);boolean raised=Rules.apply(m,r.ok,r.ms,now,App.prefs.getInt("failureLimit",6));
  JSONObject rules=m.optJSONObject("rules");int slow=rules==null?700:rules.optInt("latencyMs",700);
  m.put("observedAt",now).put("lastCheck",now).put("ms",r.ms).put("error",r.error).put("attempts",r.attempts).put("state",r.ok?(r.ms>slow?"slow":"good"):"bad");if(r.ok)m.put("lastSuccess",now);save(m);
  if(raised)event(m.optString("name"),m.optString("incidentReason"));if(recovered)event(m.optString("name"),"recovered");
  ContentValues v=new ContentValues();v.put("node",id);v.put("time",now);v.put("ms",r.ok?r.ms:-1);d.insertOrThrow("samples",null,v);
  d.execSQL("DELETE FROM samples WHERE node=? AND id NOT IN (SELECT id FROM samples WHERE node=? ORDER BY id DESC LIMIT 120)",new Object[]{id,id});d.setTransactionSuccessful();if(r.ok)EgressLookup.request(m,false);return raised;
 }catch(Exception e){return false;}finally{d.endTransaction();}}
 private void addBucket(long id,long bucket,long ok,long fail,long latency,long up,long down,long outages){SQLiteDatabase d=getWritableDatabase();d.execSQL("INSERT OR IGNORE INTO report(node,bucket) VALUES(?,?)",new Object[]{id,bucket});d.execSQL("UPDATE report SET ok=ok+?,fail=fail+?,latency=latency+?,up=up+?,down=down+?,outages=outages+? WHERE node=? AND bucket=?",new Object[]{ok,fail,latency,up,down,outages,id,bucket});}
 private void record(JSONObject old,Engine.Result r,long now){long id=old.optLong("id"),hour=3600000L,last=old.optLong("observedAt",old.optLong("lastCheck"));String state=old.optString("state");
  // Carry the last observed state for at most two scheduled intervals; gaps remain unknown.
  if(last>0&&last<now&&(state.equals("good")||state.equals("slow")||state.equals("bad"))){
   for(long[] slice:Observation.slices(last,now,App.interval())){long duration=slice[1];addBucket(id,slice[0],0,0,0,state.equals("bad")?0:duration,state.equals("bad")?duration:0,0);}}

  addBucket(id,now/hour*hour,r.ok?1:0,r.ok?0:1,r.ok?r.ms:0,0,0,!r.ok&&!state.equals("bad")?1:0);
  getWritableDatabase().delete("report","bucket<?",new String[]{""+(now-8L*24*hour)});
 }
 public synchronized JSONObject report(long id,int hours){long hour=3600000L,now=System.currentTimeMillis(),end=now/hour*hour,from=end-(hours-1L)*hour;JSONArray buckets=new JSONArray();long ok=0,fail=0,latency=0,up=0,down=0,outages=0;
  try(Cursor c=getReadableDatabase().rawQuery("SELECT bucket,ok,fail,latency,up,down,outages FROM report WHERE node=? AND bucket>=? AND bucket<=? ORDER BY bucket",new String[]{""+id,""+from,""+end})){while(c.moveToNext()){long o=c.getLong(1),f=c.getLong(2),l=c.getLong(3),u=c.getLong(4),d=c.getLong(5),n=c.getLong(6);ok+=o;fail+=f;latency+=l;up+=u;down+=d;outages+=n;buckets.put(App.j("time",c.getLong(0),"ok",o,"fail",f,"average",o>0?l/o:-1,"up",u,"down",d,"outages",n));}}
  return App.j("id",id,"from",from,"to",now,"hours",hours,"ok",ok,"fail",fail,"average",ok>0?latency/ok:-1,"up",up,"down",down,"outages",outages,"availability",up+down>0?100.0*up/(up+down):-1,"coverage",now>from?100.0*(up+down)/(now-from):0,"buckets",buckets);
 }
 public synchronized void rules(long id,JSONObject p)throws JSONException{JSONObject n=get(id);if(n==null)throw new IllegalArgumentException("Monitor not found");n.put("rules",Rules.validate(p)).put("revision",n.optLong("revision")+1).put("failures",0).put("slowStreak",0).put("incident",false).put("incidentReason","").put("ack",false).put("alerted",false);save(n);Alerts.dismiss(id);}
 public synchronized void suppress(long id,String key,long until)throws JSONException{JSONObject n=get(id);if(n==null)return;n.put(key,until).put("alerted",false).put("ack",false);save(n);Alerts.dismiss(id);event(n.optString("name"),until>0?key:"maintenanceEnded");}
 public synchronized void rearmSession(){SQLiteDatabase d=getWritableDatabase();d.beginTransaction();try{JSONArray a=all();for(int i=0;i<a.length();i++){JSONObject n=a.getJSONObject(i);if(Rules.rearm(n))save(n);}d.setTransactionSuccessful();}catch(JSONException e){throw new IllegalStateException(e);}finally{d.endTransaction();}}
 public synchronized void breakContinuity(){JSONArray a=all();for(int i=0;i<a.length();i++)try{JSONObject n=a.getJSONObject(i);n.put("observedAt",0).put("alerted",false);save(n);}catch(JSONException ignored){}}
 public synchronized void unknown(){JSONArray all=all();for(int i=0;i<all.length();i++)try{JSONObject m=all.getJSONObject(i);m.put("failures",0).put("ms",-1).put("observedAt",0).put("slowStreak",0).put("incident",false).put("incidentReason","").put("alerted",false).put("ack",false).put("state","unknown").put("error","network_unavailable");save(m);}catch(Exception ignored){}}
 public synchronized void acknowledge(Set<Long> ids){JSONArray all=all();for(int i=0;i<all.length();i++)try{JSONObject m=all.getJSONObject(i);if(ids.contains(m.optLong("id"))&&m.optBoolean("incident")&&!m.optBoolean("ack")){Rules.acknowledge(m);m.put("revision",m.optLong("revision")+1);save(m);event(m.optString("name"),"acknowledged");}}catch(Exception ignored){}}
 public synchronized boolean egressStarted(long id,long rev){JSONObject n=get(id);if(n==null||n.optLong("revision")!=rev||!n.optBoolean("enabled",true))return false;try{n.put("egressAttemptAt",System.currentTimeMillis()).put("egressState","checking");save(n);return true;}catch(JSONException e){return false;}}
 public synchronized void egressCompleted(long id,long rev,String ip,String country){JSONObject n=get(id);if(n==null||n.optLong("revision")!=rev||!n.optBoolean("enabled",true))return;try{
  if(!ip.isEmpty())n.put("exitIp",ip).put("countryCode",country).put("egressAt",System.currentTimeMillis()).put("egressState","ok");
  else n.put("egressState",n.optLong("egressAt")>0?"stale":"unknown");
  save(n);
 }catch(JSONException ignored){}}
 public synchronized JSONArray samples(long id){JSONArray out=new JSONArray();List<JSONObject> rows=new ArrayList<>();try(Cursor c=getReadableDatabase().rawQuery("SELECT time,ms FROM samples WHERE node=? ORDER BY id DESC LIMIT 30",new String[]{""+id})){while(c.moveToNext())rows.add(App.j("time",c.getLong(0),"ms",c.getLong(1)));}Collections.reverse(rows);for(JSONObject o:rows)out.put(o);return out;}
 public synchronized JSONArray events(){JSONArray a=new JSONArray();try(Cursor c=getReadableDatabase().rawQuery("SELECT time,name,kind FROM events ORDER BY id DESC LIMIT 100",null)){while(c.moveToNext())a.put(App.j("time",c.getLong(0),"name",c.getString(1),"kind",c.getString(2)));}return a;}
}
