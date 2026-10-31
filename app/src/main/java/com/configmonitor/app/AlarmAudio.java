package com.configmonitor.app;
import android.content.Context;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import java.io.*;
import java.util.Arrays;

/** Shared by previews and real alarms; works with compressed APK assets as well. */
final class AlarmAudio {
 static MediaPlayer create(Context context,String tone,boolean loop,float volume)throws IOException {
  MediaPlayer player=new MediaPlayer();
  try {
   player.setWakeMode(context,android.os.PowerManager.PARTIAL_WAKE_LOCK);
   player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
   if(tone.startsWith("builtin:")) {
    String name=tone.substring(8);
    if(!Arrays.asList("gentle","pulse","bell","urgent").contains(name))throw new IOException("Unknown alarm sound");
    File temp=File.createTempFile("alarm-tone-",".wav",context.getCacheDir());
    try {
     try(InputStream in=context.getAssets().open("tones/"+name+".wav");OutputStream out=new FileOutputStream(temp)){byte[] buffer=new byte[8192];int size;while((size=in.read(buffer))!=-1)out.write(buffer,0,size);}
     try(FileInputStream in=new FileInputStream(temp)){player.setDataSource(in.getFD());}
    } finally {temp.delete();}
   } else player.setDataSource(context,Uri.parse(tone));
   player.setLooping(loop);float level=Math.max(0,Math.min(1,volume));player.setVolume(level,level);player.prepare();return player;
  } catch(IOException|RuntimeException e){player.release();throw e;}
 }
}
