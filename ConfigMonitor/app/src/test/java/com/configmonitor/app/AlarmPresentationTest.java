package com.configmonitor.app;
import org.junit.Test;
import org.json.JSONObject;
import java.util.*;
import static org.junit.Assert.*;

public class AlarmPresentationTest {
 @Test public void incidentTimeStartsAtThresholdAndDoesNotReset()throws Exception{
  JSONObject n=new JSONObject();assertFalse(Rules.apply(n,false,-1,1000,2));assertEquals(0,n.optLong("incidentStartedAt"));
  assertTrue(Rules.apply(n,false,-1,2000,2));assertEquals(2000,n.getLong("incidentStartedAt"));
  assertFalse(Rules.apply(n,false,-1,3000,2));assertEquals(2000,n.getLong("incidentStartedAt"));
  Rules.apply(n,true,80,4000,2);assertEquals(0,n.getLong("incidentStartedAt"));
  Rules.apply(n,false,-1,5000,2);assertTrue(Rules.apply(n,false,-1,6000,2));assertEquals(6000,n.getLong("incidentStartedAt"));
 }
 @Test public void realFailureCountAndDuration()throws Exception{
  JSONObject n=new JSONObject().put("name","Turkey-04").put("host","tr1.example.com:443").put("incident",true).put("incidentReason","down").put("failures",9).put("incidentStartedAt",1000);
  AlarmPresentation.Item item=AlarmPresentation.item(4,n,121000,false);
  assertEquals("Turkey-04",item.name);assertEquals("tr1.example.com:443",item.host);assertEquals("2 min\nsince alert",item.elapsed);
  AlarmPresentation.Summary s=AlarmPresentation.summary(Collections.singletonList(item),false);
  assertTrue(s.subtitle.startsWith("9 "));assertFalse(s.explanation.contains("google"));assertFalse(s.explanation.contains("healthy"));
 }
 @Test public void unknownLegacyAndFutureTimesRemainUnknown(){assertEquals("",AlarmPresentation.elapsed(0,100000,false));assertEquals("",AlarmPresentation.elapsed(200000,100000,false));assertEquals("Just now",AlarmPresentation.elapsed(1000,2000,false));}
 @Test public void persianIsLocalized()throws Exception{
  AlarmPresentation.Item item=AlarmPresentation.item(1,new JSONObject().put("incident",true).put("failures",6),10000,true);
  assertTrue(AlarmPresentation.summary(Collections.singletonList(item),true).subtitle.startsWith("۶"));
 }
 @Test public void alarmTestDoesNotClaimOutage(){AlarmPresentation.Summary s=AlarmPresentation.summary(Collections.singletonList(AlarmPresentation.item(-1,null,0,false)),false);assertEquals("Alarm test",s.title);assertTrue(s.explanation.contains("No real outage"));}
 @Test public void networkLossAndLatencyAreDistinct()throws Exception{
  assertEquals("Internet unavailable",AlarmPresentation.summary(Collections.singletonList(AlarmPresentation.item(0,null,0,false)),false).title);
  JSONObject n=new JSONObject().put("incident",true).put("incidentReason","latency");assertEquals("High connection latency",AlarmPresentation.summary(Collections.singletonList(AlarmPresentation.item(1,n,0,false)),false).title);
 }
 @Test public void recoveredIncidentDoesNotKeepSayingDisconnected()throws Exception{
  JSONObject n=new JSONObject().put("incident",false).put("incidentReason","");assertEquals("Alert status changed",AlarmPresentation.summary(Collections.singletonList(AlarmPresentation.item(1,n,0,false)),false).title);
 }
 @Test public void multipleIncidentsAndEmptySnapshot(){
  List<AlarmPresentation.Item> items=Arrays.asList(AlarmPresentation.item(0,null,0,false),AlarmPresentation.item(-1,null,0,false));
  assertEquals("Multiple active alerts",AlarmPresentation.summary(items,false).title);assertTrue(AlarmPresentation.summary(items,false).subtitle.startsWith("2 "));assertEquals("Monitor alert",AlarmPresentation.summary(Collections.emptyList(),false).title);
 }
}
