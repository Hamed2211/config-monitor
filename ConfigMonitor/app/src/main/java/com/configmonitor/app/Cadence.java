package com.configmonitor.app;
import org.json.*;
/** Immutable snapshot published by the scheduler; monotonic times never use the wall clock. */
public final class Cadence {
 public final boolean running,connected;public final int enabled,active,queued;public final long nextAt,interval;
 public Cadence(boolean r,boolean c,int e,int a,int q,long next,long period){running=r;connected=c;enabled=e;active=a;queued=q;nextAt=next;interval=period;}
 public String phase(long now){if(!running)return "paused";if(enabled==0)return "empty";if(!connected)return "offline";if(active>0)return "checking";if(queued>0||nextAt<=now)return "queued";return "waiting";}
 public JSONObject json(long now){String phase=phase(now);return Parser.j("phase",phase,"remainingMs",running&&connected&&enabled>0?Math.max(0,nextAt-now):0,"intervalMs",Math.max(1000,interval),"active",active,"queued",queued,"enabled",enabled);}
}
