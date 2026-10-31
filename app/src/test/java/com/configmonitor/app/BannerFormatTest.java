package com.configmonitor.app;
import org.junit.Test;import static org.junit.Assert.*;
public class BannerFormatTest {
 byte[] gif(int width,int height){byte[] b=new byte[13];byte[] header="GIF89a".getBytes(java.nio.charset.StandardCharsets.US_ASCII);System.arraycopy(header,0,b,0,6);b[6]=(byte)width;b[7]=(byte)(width>>8);b[8]=(byte)height;b[9]=(byte)(height>>8);return b;}
 @Test public void recognizesBothGifVersions(){byte[] b=gif(600,150);assertTrue(BannerFormat.gif(b));assertTrue(BannerFormat.safeGif(b));b[4]='7';assertTrue(BannerFormat.safeGif(b));}
 @Test public void rejectsOversizedAndZeroDimensions(){assertFalse(BannerFormat.safeGif(gif(65535,65535)));assertFalse(BannerFormat.safeGif(gif(0,150)));assertFalse(BannerFormat.safeGif(gif(2001,1000)));assertTrue(BannerFormat.safeGif(gif(2000,1000)));}
 @Test public void rejectsShortWrongOrOversizedPayload(){assertFalse(BannerFormat.gif(new byte[0]));assertFalse(BannerFormat.safeGif("GIF89a".getBytes()));assertFalse(BannerFormat.gif("PNGxxx".getBytes()));byte[] b=new byte[2097153];System.arraycopy(gif(100,100),0,b,0,13);assertFalse(BannerFormat.safeGif(b));}
}
