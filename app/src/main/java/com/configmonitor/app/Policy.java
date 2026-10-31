package com.configmonitor.app;
/** Legacy six-failure policy; acknowledgement restarts the threshold. */
public final class Policy {
 public int failures;public boolean incident,ack;
 public Policy(int f,boolean i,boolean a){failures=f;incident=i;ack=a;}
 public boolean apply(boolean success){if(ack){failures=0;incident=false;ack=false;}if(success){failures=0;incident=false;ack=false;return false;}failures++;if(failures>=6&&(!incident||ack)){incident=true;ack=false;return true;}return false;}
}
