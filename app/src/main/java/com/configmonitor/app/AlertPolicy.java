package com.configmonitor.app;
import android.content.SharedPreferences;
import java.util.TimeZone;
import org.json.*;
/** Persistent global controls, independent of monitor state and threshold counting. */
final class AlertPolicy {
 static final String[] KEYS={"alertsEnabled","alertScheduleEnabled","alertDays","alertStart","alertEnd"};
 static boolean touches(JSONObject p){for(String k:KEYS)if(p.has(k))return true;return false;}
 static AlertSchedule.Window window(long now){SharedPreferences p=App.prefs;return AlertSchedule.window(p.getBoolean("alertsEnabled",true),p.getBoolean("alertScheduleEnabled",false),p.getInt("alertDays",127),p.getInt("alertStart",480),p.getInt("alertEnd",1380),p.getLong("alertsChangedAt",0),now,TimeZone.getDefault());}
 static void edit(JSONObject patch,SharedPreferences.Editor edit)throws JSONException{
  if(!touches(patch))return;SharedPreferences p=App.prefs;
  boolean enabled=patch.has("alertsEnabled")?patch.getBoolean("alertsEnabled"):p.getBoolean("alertsEnabled",true),scheduled=patch.has("alertScheduleEnabled")?patch.getBoolean("alertScheduleEnabled"):p.getBoolean("alertScheduleEnabled",false);
  int days=patch.has("alertDays")?patch.getInt("alertDays"):p.getInt("alertDays",127),start=patch.has("alertStart")?patch.getInt("alertStart"):p.getInt("alertStart",480),end=patch.has("alertEnd")?patch.getInt("alertEnd"):p.getInt("alertEnd",1380);
  AlertSchedule.validate(scheduled,days,start,end);
  edit.putBoolean("alertsEnabled",enabled).putBoolean("alertScheduleEnabled",scheduled).putInt("alertDays",days).putInt("alertStart",start).putInt("alertEnd",end).putLong("alertsChangedAt",System.currentTimeMillis());
 }
 static JSONObject addSnapshot(JSONObject p)throws JSONException{p.put("alertsEnabled",App.prefs.getBoolean("alertsEnabled",true)).put("alertScheduleEnabled",App.prefs.getBoolean("alertScheduleEnabled",false)).put("alertDays",App.prefs.getInt("alertDays",127)).put("alertStart",App.prefs.getInt("alertStart",480)).put("alertEnd",App.prefs.getInt("alertEnd",1380));return p;}
}
