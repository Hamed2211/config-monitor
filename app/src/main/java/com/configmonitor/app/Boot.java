package com.configmonitor.app;
import android.content.*;
public final class Boot extends BroadcastReceiver {public void onReceive(Context c,Intent i){if(Intent.ACTION_BOOT_COMPLETED.equals(i.getAction())&&App.prefs.getBoolean("resumeBoot",false)&&App.prefs.getBoolean("running",false))try{MonitorService.command(c,"start",0);}catch(Exception ignored){}}}
