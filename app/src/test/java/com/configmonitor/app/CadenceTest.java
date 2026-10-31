package com.configmonitor.app;
import org.junit.Test;import static org.junit.Assert.*;
public class CadenceTest {
 @Test public void waitingUsesMonotonicDeadline()throws Exception{Cadence c=new Cadence(true,true,2,0,0,30000,20000);assertEquals("waiting",c.phase(10000));assertEquals(20000,c.json(10000).getLong("remainingMs"));assertEquals(5000,c.json(25000).getLong("remainingMs"));}
 @Test public void elapsedDeadlineMeansQueueNotFakeNewCycle()throws Exception{Cadence c=new Cadence(true,true,2,0,0,30000,20000);assertEquals("queued",c.phase(30000));assertEquals("queued",c.phase(99999));assertEquals(0,c.json(99999).getLong("remainingMs"));}
 @Test public void activityAndOfflineOverrideCountdown(){assertEquals("checking",new Cadence(true,true,4,2,1,30000,20000).phase(10000));assertEquals("offline",new Cadence(true,false,4,2,1,30000,20000).phase(10000));}
 @Test public void pauseAndNoEnabledMonitorsHaveNoTimer()throws Exception{assertEquals("paused",new Cadence(false,true,4,0,0,30000,20000).phase(10000));assertEquals(0,new Cadence(false,true,4,0,0,30000,20000).json(10000).getLong("remainingMs"));assertEquals("empty",new Cadence(true,true,0,0,0,0,20000).phase(10000));}
}
