package com.configmonitor.app;

import android.app.Activity;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.*;
import android.view.*;
import android.widget.*;
import androidx.core.view.*;
import java.util.*;
import org.json.JSONObject;

/** Lock-screen alert with lifecycle-bound waves and persistent incident rows. */
public final class AlarmActivity extends Activity {
 private AdView alarmAd;
 private static final int BG=0xff15090b,PANEL=0xff211115,BORDER=0xff412027,TEXT=0xfff7e9ec,MUTED=0xffc5a4ac,QUIET=0xff997981,RED=0xffff586b;
 private final Handler handler=new Handler(Looper.getMainLooper());
 private final Map<Long,IncidentRow> rows=new LinkedHashMap<>();
 private Typeface font,latin;
 private TextView title,subtitle,explanation;
 private LinearLayout cards;
 private AlarmWaveView wave;
 private final Runnable watch=new Runnable(){public void run(){
  if(!Alerts.isActive()){finish();return;}
  refresh();handler.postDelayed(this,1000);
 }};
 @Override public void onCreate(Bundle saved){
  super.onCreate(saved);
  getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON|WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED|WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
  if(Build.VERSION.SDK_INT>=27){setShowWhenLocked(true);setTurnScreenOn(true);}
  WindowCompat.setDecorFitsSystemWindows(getWindow(),false);
  getWindow().setStatusBarColor(BG);getWindow().setNavigationBarColor(BG);
  font=Typeface.createFromAsset(getAssets(),App.fa()?"fonts/Vazirmatn.ttf":"fonts/Inter.ttf");
  latin=Typeface.createFromAsset(getAssets(),"fonts/Inter.ttf");
  LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(BG);
  root.setLayoutDirection(App.fa()?View.LAYOUT_DIRECTION_RTL:View.LAYOUT_DIRECTION_LTR);
  root.setPadding(dp(24),dp(12),dp(24),dp(12));
  ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);scroll.setClipToPadding(false);
  LinearLayout content=new LinearLayout(this);content.setOrientation(LinearLayout.VERTICAL);content.setGravity(Gravity.CENTER_HORIZONTAL);content.setPadding(0,dp(12),0,dp(20));
  wave=new AlarmWaveView(this);
  content.addView(wave,new LinearLayout.LayoutParams(-1,dp(getResources().getConfiguration().screenHeightDp<640?220:300)));
  title=text("",28,TEXT);title.setTypeface(font,Typeface.BOLD);ViewCompat.setAccessibilityHeading(title,true);content.addView(title,spaced(-1,-2,10,0));
  subtitle=text("",14,MUTED);content.addView(subtitle,spaced(-1,-2,12,0));
  cards=new LinearLayout(this);cards.setOrientation(LinearLayout.VERTICAL);content.addView(cards,spaced(-1,-2,24,0));
  explanation=text("",13,MUTED);explanation.setLineSpacing(dp(4),1);content.addView(explanation,spaced(-1,-2,14,0));
  scroll.addView(content,new ScrollView.LayoutParams(-1,-1));root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
  alarmAd=new AdView(this,"alarm",null);root.addView(alarmAd,new LinearLayout.LayoutParams(-1,dp(100)));
  TextView hint=text(App.t("زنگ فعلی قطع می‌شود؛ اگر قطعی ادامه داشته باشد، پس از رسیدن دوباره به آستانه هشدار می‌دهد","Silence this alarm. An ongoing outage alerts again after reaching the threshold anew."),12,QUIET);hint.setPadding(0,dp(8),0,dp(14));root.addView(hint,new LinearLayout.LayoutParams(-1,-2));
  Button ack=button(App.t("متوجه شدم","Got it"),TEXT,BG,22);ack.setOnClickListener(v->{Alerts.acknowledge();finish();});root.addView(ack,new LinearLayout.LayoutParams(-1,dp(66)));
  // Preserve the existing snooze action as a quiet secondary control.
  Button snooze=button(App.t("یادآوری ۱۵ دقیقه بعد","Remind me in 15 minutes"),BG,QUIET,12);snooze.setOnClickListener(v->{Alerts.snooze();finish();});root.addView(snooze,spaced(-1,dp(44),4,0));
  setContentView(root);
  WindowInsetsControllerCompat bars=WindowCompat.getInsetsController(getWindow(),root);bars.setAppearanceLightStatusBars(false);bars.setAppearanceLightNavigationBars(false);
  ViewCompat.setOnApplyWindowInsetsListener(root,(v,insets)->{androidx.core.graphics.Insets safe=insets.getInsets(WindowInsetsCompat.Type.systemBars()|WindowInsetsCompat.Type.displayCutout());v.setPadding(dp(24)+safe.left,dp(12)+safe.top,dp(24)+safe.right,dp(12)+safe.bottom);return WindowInsetsCompat.CONSUMED;});ViewCompat.requestApplyInsets(root);
  refresh();
 }
 private void refresh(){
  List<Long> active;synchronized(Alerts.ids){active=new ArrayList<>(Alerts.ids);}
  List<AlarmPresentation.Item> items=new ArrayList<>();Set<Long> visible=new HashSet<>();long now=System.currentTimeMillis();
  for(long id:active){
   JSONObject node=id>0?App.db.get(id):null;if(id>0&&node==null)continue;
   AlarmPresentation.Item item=AlarmPresentation.item(id,node,now,App.fa());items.add(item);visible.add(id);
   IncidentRow row=rows.get(id);if(row==null){row=new IncidentRow();rows.put(id,row);cards.addView(row.root,spaced(-1,-2,0,8));}row.update(item);
  }
  for(long id:new ArrayList<>(rows.keySet()))if(!visible.contains(id))cards.removeView(rows.remove(id).root);
  AlarmPresentation.Summary summary=AlarmPresentation.summary(items,App.fa());setText(title,summary.title);setText(subtitle,summary.subtitle);setText(explanation,summary.explanation);explanation.setVisibility(summary.explanation.isEmpty()?View.GONE:View.VISIBLE);
 }
 private final class IncidentRow {
  final LinearLayout root=new LinearLayout(AlarmActivity.this);
  final TextView name=text("",16,TEXT),host=text("",11,QUIET),elapsed=text("",12,RED);
  IncidentRow(){
   root.setGravity(Gravity.CENTER_VERTICAL);root.setPadding(dp(16),dp(14),dp(16),dp(14));root.setMinimumHeight(dp(72));root.setBackground(surface(PANEL,BORDER,18));
   View dot=new View(AlarmActivity.this);dot.setBackground(surface(RED,RED,5));dot.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
   LinearLayout.LayoutParams dotParams=new LinearLayout.LayoutParams(dp(9),dp(9));dotParams.setMarginEnd(dp(12));root.addView(dot,dotParams);
   LinearLayout labels=new LinearLayout(AlarmActivity.this);labels.setOrientation(LinearLayout.VERTICAL);
   name.setTypeface(font,Typeface.BOLD);name.setGravity(Gravity.START);name.setTextDirection(View.TEXT_DIRECTION_FIRST_STRONG);name.setMaxLines(2);name.setEllipsize(android.text.TextUtils.TruncateAt.END);
   host.setTypeface(latin);host.setGravity(App.fa()?Gravity.RIGHT:Gravity.LEFT);host.setTextDirection(View.TEXT_DIRECTION_LTR);host.setSingleLine(true);host.setEllipsize(android.text.TextUtils.TruncateAt.MIDDLE);
   labels.addView(name,new LinearLayout.LayoutParams(-1,-2));labels.addView(host,spaced(-1,-2,3,0));root.addView(labels,new LinearLayout.LayoutParams(0,-2,1));
   LinearLayout.LayoutParams timeParams=new LinearLayout.LayoutParams(dp(74),-2);timeParams.setMarginStart(dp(12));elapsed.setGravity(Gravity.END);root.addView(elapsed,timeParams);
  }
  void update(AlarmPresentation.Item item){setText(name,item.name);setText(host,item.host);setText(elapsed,item.elapsed);host.setVisibility(item.host.isEmpty()?View.GONE:View.VISIBLE);elapsed.setVisibility(item.elapsed.isEmpty()?View.GONE:View.VISIBLE);}
 }
 private void setText(TextView v,String value){if(!v.getText().toString().equals(value))v.setText(value);}
 private TextView text(String value,int size,int color){TextView v=new TextView(this);v.setText(value);v.setTextSize(size);v.setTextColor(color);v.setTypeface(font);v.setGravity(Gravity.CENTER);return v;}
 private GradientDrawable surface(int color,int border,int radius){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(radius));if(color!=border)d.setStroke(dp(1),border);return d;}
 private Button button(String label,int bg,int fg,int size){Button v=new Button(this);v.setText(label);v.setAllCaps(false);v.setTextSize(size);v.setTextColor(fg);v.setTypeface(font,Typeface.BOLD);v.setBackground(surface(bg,bg,20));return v;}
 private LinearLayout.LayoutParams spaced(int width,int height,int top,int bottom){LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(width,height);p.setMargins(0,dp(top),0,dp(bottom));return p;}
 private int dp(float value){return Math.round(value*getResources().getDisplayMetrics().density);}
 @Override protected void onStart(){super.onStart();alarmAd.start();wave.start();handler.removeCallbacks(watch);handler.post(watch);}
 @Override protected void onStop(){alarmAd.stop();handler.removeCallbacks(watch);wave.stop();super.onStop();}
 @Override protected void onDestroy(){alarmAd.destroy();handler.removeCallbacksAndMessages(null);wave.stop();super.onDestroy();}
}
