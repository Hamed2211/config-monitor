package com.configmonitor.app;

import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;
import org.json.JSONObject;

/** Presentation-only mapping; a failed probe does not prove reference-server health. */
public final class AlarmPresentation {
 public static final class Item {
  final String kind,name,host,elapsed;String type="config";final int failures;
  Item(String kind,String name,String host,String elapsed,int failures){this.kind=kind;this.name=name;this.host=host;this.elapsed=elapsed;this.failures=failures;}
 }
 public static final class Summary {
  final String title,subtitle,explanation;
  Summary(String title,String subtitle,String explanation){this.title=title;this.subtitle=subtitle;this.explanation=explanation;}
 }
 private static String t(boolean fa,String persian,String english){return fa?persian:english;}
 private static String number(long n,boolean fa){String value=NumberFormat.getIntegerInstance(fa?new Locale("fa","IR"):Locale.US).format(n);return fa?Digits.fa(value):value;}
 static String elapsed(long started,long now,boolean fa){
  if(started<=0||started>now)return "";
  long minutes=(now-started)/60000;if(minutes==0)return t(fa,"همین حالا","Just now");
  if(minutes<60)return number(minutes,fa)+t(fa," دقیقه\nاز هشدار"," min\nsince alert");
  return number(minutes/60,fa)+t(fa," ساعت\nاز هشدار"," h\nsince alert");
 }
 public static Item item(long id,JSONObject node,long now,boolean fa){
  if(id<0)return new Item("test",t(fa,"آزمایش هشدار","Alarm test"),"","",0);
  if(id==0)return new Item("network",t(fa,"اتصال اینترنت گوشی","Device internet connection"),"","",0);
  String reason=node.optString("incidentReason");
  String kind=reason.equals("latency")?"latency":node.optBoolean("incident")?"down":"recovered";
  Item item=new Item(kind,node.optString("name",t(fa,"مانیتور","Monitor")),node.optString("host"),elapsed(node.optLong("incidentStartedAt"),now,fa),Math.max(0,node.optInt("failures")));item.type=node.optString("type","config");return item;
 }
 public static Summary summary(List<Item> items,boolean fa){
  if(items.isEmpty())return new Summary(t(fa,"هشدار پایش","Monitor alert"),"","");
  if(items.size()>1)return new Summary(t(fa,"چند هشدار فعال است","Multiple active alerts"),number(items.size(),fa)+t(fa," مورد نیاز به بررسی دارد"," items need attention"),t(fa,"جزئیات هر مانیتور در گزارش‌های برنامه موجود است.","Details for each monitor are available in reports."));
  Item item=items.get(0);
  if(item.kind.equals("test"))return new Summary(t(fa,"آزمایش هشدار","Alarm test"),t(fa,"این یک هشدار آزمایشی است","This is a test alert"),t(fa,"قطع اتصال واقعی گزارش نشده است.","No real outage is reported by this test."));
  if(item.kind.equals("network"))return new Summary(t(fa,"اینترنت در دسترس نیست","Internet unavailable"),t(fa,"اتصال اینترنت گوشی را بررسی کنید","Check your device's internet connection"),t(fa,"تا بازگشت اینترنت، وضعیت کانفیگ‌ها مشخص نیست.","Configuration status is unknown until connectivity returns."));
  if(item.kind.equals("latency"))return new Summary(t(fa,"تأخیر اتصال بالاست","High connection latency"),t(fa,"زمان پاسخ از آستانهٔ تعیین‌شده بیشتر شده","Response time exceeded the configured threshold"),t(fa,"جزئیات زمان پاسخ را در گزارش مانیتور بررسی کنید.","Review response times in the monitor report."));
  if(item.kind.equals("recovered"))return new Summary(t(fa,"وضعیت هشدار تغییر کرد","Alert status changed"),t(fa,"آخرین نتیجه دیگر در وضعیت هشدار نیست","The latest result is no longer in an alert state"),t(fa,"برای قطع صدای هشدار قبلی، «متوجه شدم» را لمس کنید.","Tap Got it to silence the earlier alert."));
  return new Summary(item.type.equals("server")?t(fa,"سرور پاسخ نمی‌دهد","Server is not responding"):item.type.equals("address")?t(fa,"آدرس پاسخ نمی‌دهد","Address is not responding"):t(fa,"کانفیگ قطع شد","Configuration is not responding"),item.failures>0?number(item.failures,fa)+t(fa," بار پشت‌سرهم پاسخی دریافت نشد"," consecutive checks received no response"):t(fa,"پاسخی دریافت نشد","No response received"),t(fa,"از مسیر این مانیتور پاسخی دریافت نشد؛ اتصال اینترنت و مقصد را بررسی کنید.","No response was received through this monitor. Check internet connectivity and the destination."));
 }
}
