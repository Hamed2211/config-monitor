package com.configmonitor.app;
import android.app.job.*;
/** Periodic fallback for devices with or without Google services. */
public final class PlatformJob extends JobService {
 private int generation;
 @Override public boolean onStartJob(JobParameters params){final int current=++generation;Platform.IO.execute(()->{boolean retry=false;try{Platform.syncNow();}catch(Exception e){retry=true;}final boolean again=retry;Platform.MAIN.post(()->{if(current==generation)jobFinished(params,again);});});return true;}
 @Override public boolean onStopJob(JobParameters params){generation++;return true;}
}
