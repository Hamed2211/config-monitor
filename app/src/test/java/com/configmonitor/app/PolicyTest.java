package com.configmonitor.app;
import org.junit.Test;import static org.junit.Assert.*;
public class PolicyTest {
 @Test public void alertsOnSixthOnly(){Policy p=new Policy(0,false,false);for(int i=0;i<5;i++)assertFalse(p.apply(false));assertTrue(p.apply(false));assertEquals(6,p.failures);for(int i=0;i<8;i++)assertFalse(p.apply(false));}
 @Test public void acknowledgementRestartsSixFailures(){Policy p=new Policy(6,true,true);for(int i=0;i<5;i++)assertFalse(p.apply(false));assertTrue(p.apply(false));assertFalse(p.apply(true));assertFalse(p.ack);assertFalse(p.incident);assertEquals(0,p.failures);for(int i=0;i<5;i++)assertFalse(p.apply(false));assertTrue(p.apply(false));}
 @Test public void successBreaksStreak(){Policy p=new Policy(5,false,false);p.apply(true);assertFalse(p.apply(false));assertEquals(1,p.failures);}
}
