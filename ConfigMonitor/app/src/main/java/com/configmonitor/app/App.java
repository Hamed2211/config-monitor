package com.configmonitor.app;
import android.app.Application;
import android.app.Activity;
import android.os.Bundle;
import android.content.*;
import java.io.File;
import org.json.*;
public final class App extends Application {
 public static App app;public static Store db;public static SharedPreferences prefs;public static String coreError="";
 @Override public void onCreate(){super.onCreate();app=this;prefs=getSharedPreferences("settings",MODE_PRIVATE);db=new Store(this);watchForeground();try{go.Seq.setContext(this);File dir=new File(getFilesDir(),"xray");dir.mkdirs();libv2ray.Libv2ray.initCoreEnv(dir.toString(),"");}catch(Throwable e){coreError="engine_unavailable";}Alerts.channels(this);Platform.start();}
 void watchForeground(){ForegroundSession session=new ForegroundSession();registerActivityLifecycleCallbacks(new ActivityLifecycleCallbacks(){
  public void onActivityStarted(Activity activity){boolean entered=session.started(activity);if(entered&&activity instanceof MainActivity&&prefs.getBoolean("running",false))try{MonitorService.command(activity,"reopen",0);}catch(RuntimeException ignored){}}
  public void onActivityStopped(Activity activity){session.stopped(activity);}
  public void onActivityCreated(Activity activity,Bundle state){}public void onActivityResumed(Activity activity){}public void onActivityPaused(Activity activity){}public void onActivitySaveInstanceState(Activity activity,Bundle state){}public void onActivityDestroyed(Activity activity){}
 });}
 public static String version(){try{return app.getPackageManager().getPackageInfo(app.getPackageName(),0).versionName;}catch(Exception e){return "";}}
 public static boolean fa(){return prefs.getString("language","fa").equals("fa");}
 public static String t(String fa,String en){return fa()?fa:en;}
 public static int interval(){return prefs.getInt("interval",20);}
 public static String target(){return prefs.getString("testUrl","https://www.gstatic.com/generate_204");}
 public static JSONArray targets(){try{JSONArray a=new JSONArray(prefs.getString("targets","[]"));if(a.length()>0)return a;}catch(Exception ignored){}return a(target());}
 public static JSONObject j(Object...p){JSONObject o=new JSONObject();try{for(int i=0;i<p.length;i+=2)o.put((String)p[i],p[i+1]);}catch(JSONException e){throw new IllegalArgumentException(e);}return o;}
 public static JSONArray a(Object...p){JSONArray a=new JSONArray();for(Object x:p)a.put(x);return a;}
 public static void update(){MonitorWidget.refresh();app.sendBroadcast(new Intent("com.configmonitor.UPDATE").setPackage(app.getPackageName()));}
}
