package com.configmonitor.app;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Movie;
import android.os.SystemClock;
import android.view.View;
/** GIF playback for all supported Android versions (API 24+), without script execution. */
final class GifBannerView extends View {
 private final Movie movie;private boolean playing;private long started,elapsed;
 GifBannerView(Context c,Movie image){super(c);movie=image;setLayerType(View.LAYER_TYPE_SOFTWARE,null);}
 void playing(boolean value){if(playing==value)return;if(value)started=SystemClock.uptimeMillis();else elapsed+=SystemClock.uptimeMillis()-started;playing=value;if(value)invalidate();}
 @Override protected void onDraw(Canvas canvas){super.onDraw(canvas);if(movie.width()<1||movie.height()<1)return;int duration=movie.duration();long time=elapsed+(playing?SystemClock.uptimeMillis()-started:0);movie.setTime(duration>0?(int)(time%duration):0);float scale=Math.min(getWidth()/(float)movie.width(),getHeight()/(float)movie.height());int saved=canvas.save();canvas.translate((getWidth()-movie.width()*scale)/2,(getHeight()-movie.height()*scale)/2);canvas.scale(scale,scale);movie.draw(canvas,0,0);canvas.restoreToCount(saved);if(playing&&duration>0&&isShown()&&getWindowVisibility()==VISIBLE)postInvalidateDelayed(32);}
 @Override public void onVisibilityAggregated(boolean visible){super.onVisibilityAggregated(visible);if(visible&&playing)invalidate();}
 @Override protected void onDetachedFromWindow(){playing(false);super.onDetachedFromWindow();}
}
