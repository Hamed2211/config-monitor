package com.configmonitor.app;
import java.util.*;
/** Bounded observed-state durations, split at hourly boundaries. Never fills monitoring gaps. */
public final class Observation {
 public static List<long[]> slices(long last,long now,int intervalSeconds){List<long[]> out=new ArrayList<>();if(last<=0||now<=last||intervalSeconds<=0)return out;long end=Math.min(now,last+2L*intervalSeconds*1000);for(long at=last;at<end;){long bucket=at/3600000L*3600000L,next=Math.min(end,bucket+3600000L);out.add(new long[]{bucket,next-at});at=next;}return out;}
}
