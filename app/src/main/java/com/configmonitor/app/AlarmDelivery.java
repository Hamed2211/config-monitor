package com.configmonitor.app;
/** Android notification/UI failures must not prevent independent alarm effects. */
final class AlarmDelivery {
 static int run(Runnable... effects){int failed=0;for(int i=0;i<effects.length;i++)try{effects[i].run();}catch(RuntimeException e){failed|=1<<i;}return failed;}
}
