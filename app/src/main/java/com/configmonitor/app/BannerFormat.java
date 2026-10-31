package com.configmonitor.app;
/** Inspect GIF dimensions before handing untrusted bytes to a native decoder. */
final class BannerFormat {
 static boolean gif(byte[] b){return b.length>=6&&b[0]=='G'&&b[1]=='I'&&b[2]=='F'&&b[3]=='8'&&(b[4]=='7'||b[4]=='9')&&b[5]=='a';}
 static boolean safeGif(byte[] b){if(!gif(b)||b.length<13||b.length>2097152)return false;int w=(b[6]&255)|((b[7]&255)<<8),h=(b[8]&255)|((b[9]&255)<<8);return w>0&&h>0&&(long)w*h<=2000000;}
}
