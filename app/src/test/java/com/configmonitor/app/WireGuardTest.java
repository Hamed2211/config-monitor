package com.configmonitor.app;
import org.junit.Test;
import static org.junit.Assert.*;
import org.json.*;
import java.net.URLEncoder;
public class WireGuardTest {
 static final String KEY="AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=";
 static final String CONF="# sample\n[Interface]\nPrivateKey = "+KEY+"\nAddress = 10.1.2.3/32, fd00::2/128\nDNS = 1.1.1.1\nMTU = 1280\n[Peer]\nPublicKey = "+KEY+"\nPresharedKey = "+KEY+"\nEndpoint = [2001:db8::1]:51820\nAllowedIPs = 10.0.0.0/8, fd00::/8\nPersistentKeepalive = 25";
 @Test public void importsRealTunnelWithoutBroadeningRoutes()throws Exception{
  JSONObject n=Parser.parse(CONF),s=n.getJSONObject("config").getJSONObject("settings"),p=s.getJSONArray("peers").getJSONObject(0);
  assertEquals("xray",n.getString("engine"));assertEquals("WireGuard",n.getString("p"));assertEquals("wireguard",n.getJSONObject("config").getString("protocol"));assertTrue(s.getBoolean("noKernelTun"));assertEquals(2,s.getJSONArray("address").length());assertEquals("10.0.0.0/8",p.getJSONArray("allowedIPs").getString(0));assertEquals(25,p.getInt("keepAlive"));assertEquals(KEY,p.getString("preSharedKey"));assertEquals("1.1.1.1",n.getJSONArray("wireguardDns").getString(0));
 }
 @Test public void supportsPeersAndComments()throws Exception{JSONObject n=Parser.parse(CONF+"\n[Peer]\nPublicKey = "+KEY+"\nEndpoint = example.com:443 # comment\nAllowedIPs = 192.168.0.0/16");assertEquals(2,n.getJSONObject("config").getJSONObject("settings").getJSONArray("peers").length());}
 @Test public void linkKeysAndReserved()throws Exception {String link="wireguard://"+URLEncoder.encode(KEY,"UTF-8")+"@example.com:51820?publickey="+URLEncoder.encode(KEY,"UTF-8")+"&address=10.0.0.2%2F32&reserved=0,1,255#Home";JSONObject n=Parser.parse(link);assertEquals("Home",n.getString("name"));assertEquals(255,n.getJSONObject("config").getJSONObject("settings").getJSONArray("reserved").getInt(2));}
 void rejects(String raw)throws Exception{try{Parser.parse(raw);fail("Should reject");}catch(IllegalArgumentException e){assertFalse(e.getMessage().contains(KEY));}}
 @Test public void rejectsMissingAndMalformedKeys()throws Exception{rejects(CONF.replace("PrivateKey = "+KEY,"PrivateKey = invalid"));rejects(CONF.replace("PublicKey = "+KEY,"PublicKey = AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="));rejects(CONF.replace("PrivateKey = "+KEY+"\n",""));}
 @Test public void rejectsUnsafeOrUnsupportedOptions()throws Exception{rejects(CONF.replace("MTU = 1280","PostUp = echo secret"));rejects(CONF.replace("MTU = 1280","Table = off"));rejects(CONF.replace("MTU = 1280","DNS = 8.8.8.8"));}
 @Test public void rejectsBadEndpointCIDRAndRanges()throws Exception{rejects(CONF.replace("[2001:db8::1]:51820","example.com"));rejects(CONF.replace("[2001:db8::1]:51820","host:99999"));rejects(CONF.replace("10.0.0.0/8","10.0.0.0/33"));rejects(CONF.replace("10.1.2.3/32","999.1.2.3/32"));rejects(CONF.replace("1280","10"));rejects(CONF.replace("PersistentKeepalive = 25","PersistentKeepalive = -1"));}
 @Test public void rejectsPartialConfigAndDuplicateInterface()throws Exception{rejects(CONF.split("\\[Peer\\]")[0]);rejects(CONF+"\n[Interface]\nPrivateKey="+KEY);}
 @Test public void jsonUsesUserspaceAndEndpointLabel()throws Exception{JSONObject original=Parser.parse(CONF);JSONObject cfg=original.getJSONObject("config");cfg.getJSONObject("settings").put("noKernelTun",false);JSONObject n=Parser.parse(cfg.toString());assertEquals("WireGuard",n.getString("p"));assertEquals("[2001:db8::1]:51820",n.getString("host"));assertTrue(n.getJSONObject("config").getJSONObject("settings").getBoolean("noKernelTun"));}
 @Test public void digitsPreserveOtherText(){assertEquals("۱۲۳ ms / v۲",Digits.fa("123 ms / v2"));assertEquals("۱۲۳",Digits.fa("۱۲۳"));}
}
