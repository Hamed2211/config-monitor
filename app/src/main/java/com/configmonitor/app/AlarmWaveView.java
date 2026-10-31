package com.configmonitor.app;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.os.Build;
import android.provider.Settings;
import android.view.View;
import android.view.animation.LinearInterpolator;

/** Three expanding, fading rings, without layout changes or flashing backgrounds. */
public final class AlarmWaveView extends View {
 private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
 private final Path triangle=new Path();
 private ValueAnimator animator;
 private float phase;
 public AlarmWaveView(Context context){super(context);setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);}
 public void start(){
  if(animator!=null)return;
  boolean enabled=Build.VERSION.SDK_INT>=26?ValueAnimator.areAnimatorsEnabled():Settings.Global.getFloat(getContext().getContentResolver(),Settings.Global.ANIMATOR_DURATION_SCALE,1f)>0;
  if(!enabled){phase=0.18f;invalidate();return;}
  animator=ValueAnimator.ofFloat(0f,1f);animator.setDuration(2700);animator.setRepeatCount(ValueAnimator.INFINITE);animator.setInterpolator(new LinearInterpolator());
  animator.addUpdateListener(value->{phase=(float)value.getAnimatedValue();invalidate();});animator.start();
 }
 public void stop(){if(animator!=null){animator.cancel();animator.removeAllUpdateListeners();animator=null;}}
 @Override protected void onDetachedFromWindow(){stop();super.onDetachedFromWindow();}
 @Override protected void onDraw(Canvas canvas){
  super.onDraw(canvas);
  float size=Math.min(getWidth(),getHeight()),cx=getWidth()/2f,cy=getHeight()/2f,core=size*.145f,outer=size*.485f;
  paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(getResources().getDisplayMetrics().density);
  for(int i=0;i<3;i++){float progress=(phase+i/3f)%1f;paint.setColor(0xffff586b);paint.setAlpha(Math.round(115*(1-progress)));canvas.drawCircle(cx,cy,core+(outer-core)*progress,paint);}
  paint.setStyle(Paint.Style.FILL);paint.setColor(0xffff586b);paint.setAlpha(255);canvas.drawCircle(cx,cy,core,paint);
  paint.setColor(0xff15090b);paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(core*.075f);paint.setStrokeJoin(Paint.Join.ROUND);paint.setStrokeCap(Paint.Cap.ROUND);
  triangle.reset();triangle.moveTo(cx,cy-core*.35f);triangle.lineTo(cx+core*.36f,cy+core*.30f);triangle.lineTo(cx-core*.36f,cy+core*.30f);triangle.close();
  canvas.drawPath(triangle,paint);canvas.drawLine(cx,cy-core*.10f,cx,cy+core*.08f,paint);paint.setStyle(Paint.Style.FILL);canvas.drawCircle(cx,cy+core*.20f,core*.04f,paint);
 }
}
