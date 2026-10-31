package com.configmonitor.app;
import org.json.JSONObject;
/** Durable incident state is authoritative; the optimistic `alerted` flag is not delivery proof. */
final class AlarmRecovery {
 static boolean missing(JSONObject node,boolean delivered,long now){
  return !delivered&&canDeliver(node,now);
 }
 static boolean canDeliver(JSONObject node,long now){
  if(node==null||!node.optBoolean("enabled",true)||!node.optBoolean("incident")||node.optBoolean("ack")||node.optBoolean("resumePending")||Rules.suppressed(node,now))return false;
  long suppressedUntil=Math.max(node.optLong("snoozeUntil"),node.optLong("maintenanceUntil"));
  // An expired snooze requires a fresh observation, not a stale pre-snooze incident.
  return suppressedUntil<=0||node.optLong("lastCheck")>=suppressedUntil;
 }
 static boolean retryAudio(boolean active,boolean playing,long now,long lastAttempt){return active&&!playing&&now-lastAttempt>=5000;}
}
