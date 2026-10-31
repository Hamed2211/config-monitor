package com.configmonitor.app;
import org.junit.Test;
import static org.junit.Assert.*;
import org.json.*;
public class AlarmSessionTest {
 JSONObject down()throws Exception{JSONObject n=Parser.j("enabled",true,"lastCheck",1000);for(int i=0;i<6;i++)Rules.apply(n,false,-1,1000);return n;}
 boolean result(JSONObject n,boolean ok,long now)throws Exception{boolean raised=Rules.apply(n,ok,ok?80:-1,now);n.put("lastCheck",now);return raised;}
 @Test public void acknowledgedOutageRearmsAcrossSerializedRestart()throws Exception{
  JSONObject n=down().put("ack",true);assertFalse(AlarmRecovery.canDeliver(n,1100));
  n=new JSONObject(n.toString());Rules.rearm(n);assertFalse(AlarmRecovery.canDeliver(n,1200));assertFalse(AlarmRecovery.missing(n,false,1200));
  for(int i=0;i<5;i++)assertFalse(result(n,false,1201+i));assertTrue(result(n,false,1300));assertTrue(AlarmRecovery.canDeliver(n,1300));assertEquals(6,n.getInt("failures"));assertFalse(result(n,false,1400));
 }
 @Test public void previouslyAlertedButUndeliveredOutageRearms()throws Exception{JSONObject n=down();Rules.rearm(n);assertFalse(AlarmRecovery.missing(n,false,1100));assertTrue(result(n,false,1200));assertTrue(AlarmRecovery.missing(n,false,1200));}
 @Test public void deadFromFirstLaunchDoesNotNeedHealthyTransition()throws Exception{JSONObject n=Parser.j("enabled",true);Rules.rearm(n);for(int i=1;i<=5;i++)assertFalse(result(n,false,i));assertTrue(result(n,false,6));assertTrue(AlarmRecovery.canDeliver(n,6));}
 @Test public void partialFailureStreakSurvivesRepeatedReopens()throws Exception{JSONObject n=Parser.j("enabled",true);for(int i=1;i<=6;i++){Rules.rearm(n);assertEquals(i==6,result(n,false,i));}assertEquals(6,n.getInt("failures"));}
 @Test public void firstFreshSuccessClearsOldOutageWithoutFalseAlarm()throws Exception{JSONObject n=down().put("ack",true);Rules.rearm(n);assertFalse(result(n,true,1200));assertFalse(n.getBoolean("incident"));assertFalse(n.has("resumePending"));assertFalse(AlarmRecovery.canDeliver(n,1200));}
 @Test public void acknowledgementWaitsForFreshObservation()throws Exception{JSONObject n=down();Rules.rearm(n);assertTrue(result(n,false,1200));Rules.acknowledge(n);assertFalse(AlarmRecovery.missing(n,false,1250));for(int i=0;i<5;i++)assertFalse(result(n,false,1260+i));assertTrue(result(n,false,1300));assertTrue(AlarmRecovery.missing(n,false,1300));Rules.rearm(n);assertTrue(result(n,false,1400));}
 @Test public void disabledAndExplicitSuppressionRemainRespected()throws Exception{
  JSONObject disabled=down().put("enabled",false).put("ack",true);assertFalse(Rules.rearm(disabled));assertTrue(disabled.getBoolean("ack"));assertFalse(AlarmRecovery.canDeliver(disabled,1200));
  for(String key:new String[]{"snoozeUntil","maintenanceUntil"}){JSONObject n=down().put("ack",true).put(key,2000);Rules.rearm(n);assertEquals(2000,n.getLong(key));for(int i=0;i<5;i++)assertFalse(result(n,false,1500+i));assertFalse(AlarmRecovery.canDeliver(n,2100));assertTrue(result(n,false,2200));assertTrue(AlarmRecovery.canDeliver(n,2200));}
 }
 @Test public void pendingRecheckSurvivesProcessDeathAndPreservesIncidentTime()throws Exception{JSONObject n=down();long began=n.getLong("incidentStartedAt");Rules.rearm(n);n=new JSONObject(n.toString());assertFalse(AlarmRecovery.canDeliver(n,1300));Rules.rearm(n);assertTrue(result(n,false,1400));assertEquals(began,n.getLong("incidentStartedAt"));}
 @Test public void foregroundTransitionDoesNotRearmOnAlarmRoundTrip(){ForegroundSession session=new ForegroundSession();Object main=new Object(),alarm=new Object();assertTrue(session.started(main));assertFalse(session.started(alarm));session.stopped(main);assertFalse(session.started(main));session.stopped(alarm);assertFalse(session.started(main));}
 @Test public void genuineBackgroundReturnIsNewSession(){ForegroundSession session=new ForegroundSession();Object main=new Object();assertTrue(session.started(main));session.stopped(main);assertTrue(session.started(main));}
 @Test public void overlappingActivitiesAndDuplicateStopsDoNotFakeForegroundEntry(){ForegroundSession session=new ForegroundSession();Object a=new Object(),b=new Object();assertTrue(session.started(a));assertFalse(session.started(b));session.stopped(a);session.stopped(a);assertFalse(session.started(a));session.stopped(a);session.stopped(b);assertTrue(session.started(a));}
}
