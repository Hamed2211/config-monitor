package com.configmonitor.app;
import android.content.SharedPreferences;
import java.security.SecureRandom;
import java.util.UUID;
/** Local bootstrap runs before any background jobs or ad requests can use the identity. */
final class PlatformIdentity {
 static void prepare(SharedPreferences prefs,String endpoint){
  if(endpoint.isEmpty())return;
  boolean reuse=endpoint.equals(prefs.getString("origin",""))&&!prefs.getString("id","").isEmpty()&&!prefs.getString("secret","").isEmpty();
  SharedPreferences.Editor edit=prefs.edit();
  if(!reuse){
   byte[] bytes=new byte[32];new SecureRandom().nextBytes(bytes);StringBuilder secret=new StringBuilder(64);char[] hex="0123456789abcdef".toCharArray();
   for(byte value:bytes){secret.append(hex[(value&255)>>>4]).append(hex[value&15]);}
   edit.clear().putString("origin",endpoint).putString("id",UUID.randomUUID().toString()).putString("secret",secret.toString());
  }
  // These old local switches no longer control the fixed service connection.
  edit.remove("consent").remove("prompted").apply();
 }
}
