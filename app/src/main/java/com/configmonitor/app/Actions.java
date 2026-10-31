package com.configmonitor.app;
import android.content.*;
public final class Actions extends BroadcastReceiver {public void onReceive(Context c,Intent i){if("snooze".equals(i.getAction()))Alerts.snooze();else if("ack".equals(i.getAction()))Alerts.acknowledge();else if("stop".equals(i.getAction())){App.prefs.edit().putBoolean("running",false).apply();Alerts.stop();c.stopService(new Intent(c,MonitorService.class));App.update();}}}
