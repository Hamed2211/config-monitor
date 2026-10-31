package com.configmonitor.app;

import android.app.*;
import android.app.job.*;
import android.content.*;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.*;
import androidx.core.app.NotificationCompat;
import org.json.*;
import java.io.*;
import java.net.*;
import java.util.*;
import java.util.concurrent.*;

/** Automatic fixed-origin management transport; monitor configurations never leave the device. */
public final class Platform {
 public interface Callback {void done(JSONObject result,String error);}
 static final Handler MAIN=new Handler(Looper.getMainLooper());
 static final ExecutorService IO=Executors.newSingleThreadExecutor();
 static volatile JSONObject update=null;static volatile long lastSync=-60000;static volatile boolean syncing=false;
 static SharedPreferences prefs(){return App.app.getSharedPreferences("platform",Context.MODE_PRIVATE);}
 static String endpoint="";
 static boolean enabled(){return !endpoint.isEmpty();}
 static String origin(){return endpoint;}
 public static void start(){endpoint=assetOrigin();if(endpoint.isEmpty())return;
  PlatformIdentity.prepare(prefs(),endpoint);
  try{schedule();}catch(RuntimeException e){prefs().edit().putString("error",message(e)).apply();}
  sync();
 }
 public static String validOrigin(String raw)throws Exception {URI u=new URI(raw.trim());if(!"https".equals(u.getScheme())||u.getHost()==null||u.getUserInfo()!=null||u.getQuery()!=null||u.getFragment()!=null||!(u.getPath().isEmpty()||u.getPath().equals("/"))||(u.getPort()!=-1&&u.getPort()!=443))throw new IllegalArgumentException("HTTPS origin required");return "https://"+u.getHost().toLowerCase(Locale.ROOT);}
 public static boolean webUrl(String raw){try{URI u=new URI(raw);return "https".equals(u.getScheme())&&u.getHost()!=null&&u.getUserInfo()==null;}catch(Exception e){return false;}}
 static String assetOrigin(){try(InputStream in=App.app.getAssets().open("platform.json")){ByteArrayOutputStream b=new ByteArrayOutputStream();byte[] data=new byte[2048];int n;while((n=in.read(data))>0)b.write(data,0,n);String value=new JSONObject(b.toString("UTF-8")).optString("origin");return value.isEmpty()?"":validOrigin(value);}catch(Exception e){return "";}}
 static JSONObject status(){return App.j("connected",enabled(),"origin",origin(),"lastSync",prefs().getLong("lastSync",0),"error",prefs().getString("error",""),"update",update==null?JSONObject.NULL:update);}
 static String message(Exception e){return App.t("ارتباط با سرور برقرار نشد؛ دامنه، اینترنت و نصب سرور را بررسی کن.","Server connection failed; check the domain, network and server installation.");}
 static JSONObject metadata(){try{PackageInfo p=App.app.getPackageManager().getPackageInfo(App.app.getPackageName(),0);return App.j("model",Build.MODEL,"manufacturer",Build.MANUFACTURER,"android",Build.VERSION.RELEASE,"version",p.versionName,"code",p.versionCode,"foreground",MainActivity.visible);}catch(Exception e){return App.j();}}
 static void register()throws Exception {JSONObject p=metadata();// The legacy API field is a registration flag; this release has no local consent switch.
  p.put("id",prefs().getString("id","")).put("secret",prefs().getString("secret","")).put("consent",true);request("/api/device/register","POST",p,false);prefs().edit().putBoolean("registered",true).commit();}
 static JSONObject request(String path,String method,JSONObject payload,boolean auth)throws Exception {
  if(!enabled())throw new IOException("Disconnected");HttpURLConnection c=(HttpURLConnection)new URL(origin()+path).openConnection();c.setInstanceFollowRedirects(false);c.setConnectTimeout(10000);c.setReadTimeout(15000);c.setRequestMethod(method);c.setRequestProperty("Accept","application/json");
  if(auth)c.setRequestProperty("Authorization","Bearer "+prefs().getString("id","")+"."+prefs().getString("secret",""));
  try{if(payload!=null){byte[] bytes=payload.toString().getBytes("UTF-8");c.setDoOutput(true);c.setFixedLengthStreamingMode(bytes.length);c.setRequestProperty("Content-Type","application/json");try(OutputStream out=c.getOutputStream()){out.write(bytes);}}
   int status=c.getResponseCode();if(status==401&&auth)prefs().edit().putBoolean("registered",false).apply();if(status<200||status>=300)throw new ApiError(status);
   try(InputStream in=c.getInputStream()){return new JSONObject(new String(read(in,1048576),"UTF-8"));}
  }finally{c.disconnect();}
 }
 static byte[] read(InputStream in,int limit)throws IOException{ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buf=new byte[8192];int n;while((n=in.read(buf))!=-1){if(out.size()+n>limit)throw new IOException("Response too large");out.write(buf,0,n);}return out.toByteArray();}
 static final class ApiError extends IOException {final int status;ApiError(int status){super("HTTP "+status);this.status=status;}}
 public static void schedule(){if(!enabled())return;JobScheduler jobs=App.app.getSystemService(JobScheduler.class);jobs.schedule(new JobInfo.Builder(19002,new ComponentName(App.app,PlatformJob.class)).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPeriodic(15*60*1000L).setPersisted(true).build());}
 public static synchronized void sync(){if(!enabled()||syncing||SystemClock.elapsedRealtime()-lastSync<60000)return;syncing=true;IO.execute(()->{try{syncNow();}catch(Exception e){prefs().edit().putString("error",message(e)).apply();}finally{syncing=false;lastSync=SystemClock.elapsedRealtime();}});}
 static void syncNow()throws Exception {if(!enabled())return;if(!prefs().getBoolean("registered",false))register();flush();JSONObject result=request("/api/device/sync","POST",metadata(),true);JSONObject candidate=result.optJSONObject("update");update=candidate;String creative=result.optString("creativeOrigin","");if(!creative.isEmpty()){creative=validOrigin(creative);if(creative.equals(origin()))creative="";}prefs().edit().putLong("lastSync",System.currentTimeMillis()).putString("error","").putString("creativeOrigin",creative).apply();JSONArray messages=result.optJSONArray("notifications");if(messages!=null)for(int i=0;i<messages.length();i++){JSONObject n=messages.optJSONObject(i);if(n!=null)notifyUser(n);}flush();App.update();}
 static void ad(String placement,Callback cb){IO.execute(()->{try{if(!enabled()){MAIN.post(()->cb.done(null,null));return;}if(!prefs().getBoolean("registered",false))register();JSONObject result=request("/api/device/ad","POST",App.j("placement",placement),true);MAIN.post(()->cb.done(result.optJSONObject("ad"),null));}catch(Exception e){MAIN.post(()->cb.done(null,message(e)));}});}
 static void event(String id,String kind,Callback cb){IO.execute(()->{try{JSONObject r=request("/api/device/event","POST",App.j("id",id,"kind",kind),true);MAIN.post(()->cb.done(r,null));}catch(Exception e){MAIN.post(()->cb.done(null,message(e)));}});}
 static void receipt(String id,String kind){IO.execute(()->{enqueue(id,kind);try{flush();}catch(Exception ignored){}});}
 static void enqueue(String id,String kind){try{JSONArray items=new JSONArray(prefs().getString("receipts","[]"));for(int i=0;i<items.length();i++){JSONObject item=items.getJSONObject(i);if(id.equals(item.optString("id"))&&kind.equals(item.optString("kind")))return;}if(items.length()>2000)return;items.put(App.j("id",id,"kind",kind));prefs().edit().putString("receipts",items.toString()).commit();}catch(Exception ignored){}}
 static void flush()throws Exception {JSONArray items=new JSONArray(prefs().getString("receipts","[]")),remaining=new JSONArray();for(int i=0;i<items.length();i++){JSONObject item=items.getJSONObject(i);if(i>=50){remaining.put(item);continue;}try{request("/api/device/receipt","POST",item,true);}catch(ApiError e){if(e.status!=404&&e.status!=410)remaining.put(item);}catch(Exception e){remaining.put(item);}}prefs().edit().putString("receipts",remaining.toString()).commit();}
 static void notifyUser(JSONObject n)throws Exception {
  NotificationManager manager=App.app.getSystemService(NotificationManager.class);if(!manager.areNotificationsEnabled())return;
  if(Build.VERSION.SDK_INT>=26){NotificationChannel channel=new NotificationChannel("platform-messages",App.t("پیام‌های مدیر برنامه","App announcements"),NotificationManager.IMPORTANCE_DEFAULT);manager.createNotificationChannel(channel);if(manager.getNotificationChannel("platform-messages").getImportance()==NotificationManager.IMPORTANCE_NONE)return;}
  String id=n.getString("id");Set<String> old=new HashSet<>(prefs().getStringSet("shown",Collections.emptySet()));if(old.contains(id)){enqueue(id,"received");return;}
  Intent intent=new Intent(App.app,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra("platformMessage",id).putExtra("platformDestination",n.optString("destination")).putExtra("platformTarget",n.optString("target"));
  PendingIntent pi=PendingIntent.getActivity(App.app,id.hashCode(),intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  Notification notification=new NotificationCompat.Builder(App.app,"platform-messages").setSmallIcon(R.drawable.ic_notification).setContentTitle(n.getString("title")).setContentText(n.getString("body")).setStyle(new NotificationCompat.BigTextStyle().bigText(n.getString("body"))).setContentIntent(pi).setAutoCancel(true).setPriority(NotificationCompat.PRIORITY_DEFAULT).build();
  manager.notify("platform",id.hashCode(),notification);old.add(id);prefs().edit().putStringSet("shown",old).commit();enqueue(id,"received");
 }
 static void opened(Activity activity,Intent intent){String id=intent.getStringExtra("platformMessage");if(id==null||!enabled())return;intent.removeExtra("platformMessage");receipt(id,"opened");String destination=intent.getStringExtra("platformDestination"),target=intent.getStringExtra("platformTarget");if("url".equals(destination)&&webUrl(target))openWeb(activity,target);else sync();}
 static void openWeb(Activity activity,String url){if(!webUrl(url))return;try{activity.startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(url)).addCategory(Intent.CATEGORY_BROWSABLE));}catch(Exception ignored){}}
}
