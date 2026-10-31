package com.configmonitor.app;
import java.util.*;
import org.json.*;
/** Local wall-clock weekly window. Day bits: Sunday=0 ... Saturday=6. End is exclusive. */
final class AlertSchedule {
 static final class Window {final boolean active;final long since;Window(boolean a,long s){active=a;since=s;}}
 static void validate(boolean scheduled,int days,int start,int end){
  if(days<0||days>127||start<0||start>=1440||end<0||end>=1440||(scheduled&&(days==0||start==end)))throw new IllegalArgumentException("Invalid alert schedule");
 }
 static Window window(boolean enabled,boolean scheduled,int days,int start,int end,long changedAt,long now,TimeZone zone){
  if(!enabled)return new Window(false,0);
  if(!scheduled)return new Window(true,changedAt);
  try{validate(true,days,start,end);}catch(IllegalArgumentException e){return new Window(false,0);}
  Calendar date=Calendar.getInstance(zone);date.setTimeInMillis(now);int day=date.get(Calendar.DAY_OF_WEEK)-1,minute=date.get(Calendar.HOUR_OF_DAY)*60+date.get(Calendar.MINUTE),offset=0;
  boolean active;
  if(start<end)active=(days&(1<<day))!=0&&minute>=start&&minute<end;
  else if(minute>=start)active=(days&(1<<day))!=0;
  else{offset=-1;active=minute<end&&(days&(1<<((day+6)%7)))!=0;}
  if(!active)return new Window(false,0);
  date.add(Calendar.DAY_OF_MONTH,offset);date.set(Calendar.HOUR_OF_DAY,start/60);date.set(Calendar.MINUTE,start%60);date.set(Calendar.SECOND,0);date.set(Calendar.MILLISECOND,0);
  long since=Math.max(changedAt,date.getTimeInMillis());return new Window(since<=now,since);
 }
 static boolean deliver(JSONObject node,Window w,long now){return w.active&&node!=null&&node.optLong("lastCheck")>=w.since&&AlarmRecovery.canDeliver(node,now);}
}
