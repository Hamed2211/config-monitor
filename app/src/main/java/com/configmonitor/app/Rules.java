package com.configmonitor.app;
import org.json.*;
/** Acknowledgement starts a fresh threshold window without changing measured status. */
public final class Rules {
 public static JSONObject validate(JSONObject p)throws JSONException{
  int failures=p.optInt("failureLimit",6), latency=p.optInt("latencyMs",700),streak=p.optInt("latencyStreak",3);
  if(failures<1||failures>100||latency<50||latency>120000||streak<1||streak>100)throw new IllegalArgumentException("Invalid alert thresholds");
  return Parser.j("failureLimit",failures,"latencyEnabled",p.optBoolean("latencyEnabled",false),"latencyMs",latency,"latencyStreak",streak);
 }
 static JSONObject jGlobal(int limit){return Parser.j("failureLimit",limit);}
 public static boolean suppressed(JSONObject n,long now){return n.optLong("snoozeUntil")>now||n.optLong("maintenanceUntil")>now;}
 public static void acknowledge(JSONObject n)throws JSONException{
  n.put("ack",true).put("failures",0).put("slowStreak",0).put("incident",false).put("incidentReason","").put("incidentStartedAt",0).put("alerted",false);
  n.remove("resumePending");
 }
 /** A new monitoring/foreground session must not inherit an old acknowledgement. */
 public static boolean rearm(JSONObject n)throws JSONException{
  if(!n.optBoolean("enabled",true))return false;
  if(n.optBoolean("ack"))acknowledge(n);
  n.put("ack",false).put("alerted",false).put("resumePending",true);
  return true;
 }
 public static boolean apply(JSONObject n,boolean ok,long ms,long now)throws JSONException{
  return apply(n,ok,ms,now,6);
 }
 public static boolean apply(JSONObject n,boolean ok,long ms,long now,int globalLimit)throws JSONException{
  n.remove("resumePending");
  // Also migrate acknowledgements saved by older versions before counting this result.
  if(n.optBoolean("ack")){acknowledge(n);n.put("ack",false);}
  JSONObject r=n.optJSONObject("rules");if(r==null)r=validate(jGlobal(globalLimit));
  int fails=ok?0:Math.min(100000,n.optInt("failures")+1);
  int slow=ok&&r.optBoolean("latencyEnabled")&&ms>r.optInt("latencyMs",700)?Math.min(100000,n.optInt("slowStreak")+1):0;
  String reason=fails>=r.optInt("failureLimit",6)?"down":slow>=r.optInt("latencyStreak",3)?"latency":"";
  String previous=n.optString("incidentReason",n.optBoolean("incident")?"down":"");
  boolean changed=!reason.equals(previous);
  n.put("failures",fails).put("slowStreak",slow).put("incident",!reason.isEmpty()).put("incidentReason",reason);
  if(changed)n.put("ack",false).put("alerted",false).put("incidentStartedAt",reason.isEmpty()?0:now);
  boolean alert=!reason.isEmpty()&&!n.optBoolean("ack")&&!n.optBoolean("alerted",!changed&&n.optBoolean("incident"))&&!suppressed(n,now);
  if(alert)n.put("alerted",true);
  return alert;
 }
}
