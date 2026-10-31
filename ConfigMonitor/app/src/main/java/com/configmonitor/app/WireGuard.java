package com.configmonitor.app;

import org.json.*;
import java.net.*;
import java.util.*;
import static com.configmonitor.app.Parser.*;

/** Imports a userspace outbound. No wg-quick hooks or OS routing commands run. */
public final class WireGuard {
 public static boolean isConfig(String raw) {
  return raw.replace("\uFEFF", "").matches("(?s).*\\[Interface\\].*");
 }
 static IllegalArgumentException invalid(String field) {
  // Never echo a supplied value: it may contain a private key.
  return new IllegalArgumentException("WireGuard: invalid or unsupported " + field);
 }
 static String key(String value, String field) {
  String s=value.trim();
  if(!s.matches("[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]="))throw invalid(field+" (32-byte Base64 key required)");
  if(s.equals("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="))throw invalid(field);
  return s;
 }
 static String jsonKey(String value,String field){
  if(value.matches("[0-9a-fA-F]{64}")&&!value.matches("0{64}"))return value;
  return key(value,field);
 }
 static JSONObject json(String raw,JSONObject root,JSONObject out)throws Exception {
  JSONObject settings=out.getJSONObject("settings");
  settings.put("secretKey",jsonKey(settings.getString("secretKey"),"secretKey")).put("noKernelTun",true);
  JSONArray addresses=settings.getJSONArray("address"),peers=settings.getJSONArray("peers");
  if(addresses.length()==0||peers.length()==0||peers.length()>16)throw invalid("address / peers");
  for(int i=0;i<addresses.length();i++)ip(addresses.getString(i),false);
  for(int i=0;i<peers.length();i++){
   JSONObject peer=peers.getJSONObject(i);jsonKey(peer.getString("publicKey"),"publicKey");endpoint(peer.getString("endpoint"));
   if(peer.has("preSharedKey"))jsonKey(peer.getString("preSharedKey"),"preSharedKey");
   if(peer.has("keepAlive"))integer(peer.get("keepAlive").toString(),0,65535,"keepAlive");
   if(peer.has("allowedIPs")){JSONArray allowed=peer.getJSONArray("allowedIPs");if(allowed.length()==0)throw invalid("allowedIPs");for(int j=0;j<allowed.length();j++)ip(allowed.getString(j),true);}
  }
  if(settings.has("mtu"))integer(settings.get("mtu").toString(),576,9000,"MTU");
  if(settings.has("reserved")){JSONArray r=settings.getJSONArray("reserved");if(r.length()!=3)throw invalid("reserved");for(int i=0;i<3;i++)integer(r.get(i).toString(),0,255,"reserved");}
  if(settings.has("remoteDNS"))throw invalid("remoteDNS in the bundled core; system DNS is used");
  String endpoint=peers.getJSONObject(0).getString("endpoint");
  return node(raw,root.optString("name","WireGuard · "+endpoint),"WireGuard",endpoint,"UDP / WireGuard","xray",out);
 }
 static int integer(String value,int low,int high,String field) {
  try {int n=Integer.parseInt(value);if(n>=low&&n<=high)return n;}catch(Exception ignored){}
  throw invalid(field);
 }
 static String ip(String value,boolean prefixRequired) throws Exception {
  String[] pieces=value.trim().split("/",-1);String host=pieces[0];
  if(pieces.length>2||(prefixRequired&&pieces.length!=2))throw invalid("IP / CIDR");
  boolean v6=host.contains(":");
  if(v6){if(!host.matches("[0-9a-fA-F:]+"))throw invalid("IPv6");try{InetAddress.getByName(host);}catch(Exception e){throw invalid("IPv6");}}
  else {String[] octets=host.split("\\.",-1);if(octets.length!=4)throw invalid("IPv4");for(String o:octets){if(!o.matches("0|[1-9][0-9]{0,2}"))throw invalid("IPv4");integer(o,0,255,"IPv4");}}
  if(pieces.length==2)integer(pieces[1],0,v6?128:32,"CIDR prefix");
  return value.trim();
 }
 static JSONArray ips(String value,boolean cidr) throws Exception {
  JSONArray list=new JSONArray();for(String item:value.split(",",-1))list.put(ip(item,cidr));return list;
 }
 static String endpoint(String value) throws Exception {
  try {URI u=new URI("udp://"+value);host(u);if(u.getPort()<1||u.getPort()>65535||u.getRawUserInfo()!=null||u.getRawQuery()!=null||u.getRawFragment()!=null||!u.getRawPath().isEmpty())throw invalid("Endpoint");return value;}catch(Exception e){throw invalid("Endpoint (host:port or [IPv6]:port required)");}
 }
 public static JSONObject parse(String raw) throws Exception {
  if(!isConfig(raw))return link(raw);
  Map<String,String> iface=new LinkedHashMap<>(),section=null;List<Map<String,String>> peers=new ArrayList<>();
  for(String original:raw.replace("\uFEFF", "").split("[\\r\\n]+")){
   String line=original.split("#",2)[0].trim();if(line.isEmpty())continue;
   if(line.equals("[Interface]")){if(section!=null)throw invalid("duplicate Interface");section=iface;continue;}
   if(line.equals("[Peer]")){if(section==null||peers.size()>=16)throw invalid("Peer section");section=new LinkedHashMap<>();peers.add(section);continue;}
   String[] pair=line.split("=",2);if(section==null||pair.length!=2)throw invalid("configuration line");
   String field=pair[0].trim(),value=pair[1].trim();
   List<String> allowed=section==iface?Arrays.asList("PrivateKey","Address","DNS","MTU"):Arrays.asList("PublicKey","PresharedKey","Endpoint","AllowedIPs","PersistentKeepalive");
   if(!allowed.contains(field))throw invalid("configuration option; supported fields: "+allowed.toString());
   if(section.containsKey(field))throw invalid("duplicate "+field);section.put(field,value);
  }
  JSONObject settings=j("secretKey",key(required(iface,"PrivateKey"),"PrivateKey"),"address",ips(required(iface,"Address"),false),"noKernelTun",true,"domainStrategy","ForceIP");
  if(iface.containsKey("MTU"))settings.put("mtu",integer(iface.get("MTU"),576,9000,"MTU"));
  JSONArray all=new JSONArray();for(Map<String,String> p:peers){JSONObject peer=j("publicKey",key(required(p,"PublicKey"),"PublicKey"),"endpoint",endpoint(required(p,"Endpoint")),"allowedIPs",ips(required(p,"AllowedIPs"),true));if(p.containsKey("PresharedKey"))peer.put("preSharedKey",key(p.get("PresharedKey"),"PresharedKey"));if(p.containsKey("PersistentKeepalive"))peer.put("keepAlive",integer(p.get("PersistentKeepalive"),0,65535,"PersistentKeepalive"));all.put(peer);}
  if(all.length()==0)throw invalid("missing Peer");settings.put("peers",all);
  JSONObject node=make(raw,"",settings);
  // The pinned measureOutboundDelay strips custom DNS apps. Declare this explicitly
  // in the import UI rather than pretending the wg-quick DNS setting is applied.
  if(iface.containsKey("DNS"))node.put("wireguardDns",ips(iface.get("DNS"),false));
  return node;
 }
 static String required(Map<String,String> values,String field){String s=values.get(field);if(s==null||s.isEmpty())throw invalid("missing "+field);return s;}
 static JSONObject link(String raw)throws Exception {
  URI u;try{u=new URI(raw);}catch(Exception e){throw invalid("link");}
  Map<String,String> q=query(u);for(String k:q.keySet())if(!Arrays.asList("publickey","address","presharedkey","mtu","reserved","keepalive").contains(k))throw invalid("link parameter");
  String h=host(u);int port=u.getPort();if(port<1||port>65535)throw invalid("port");
  JSONObject peer=j("publicKey",key(required(q,"publickey"),"PublicKey"),"endpoint",endpoint((h.contains(":")?"["+h+"]":h)+":"+port),"allowedIPs",a("0.0.0.0/0","::/0"));
  if(q.containsKey("presharedkey"))peer.put("preSharedKey",key(q.get("presharedkey"),"PresharedKey"));
  if(q.containsKey("keepalive"))peer.put("keepAlive",integer(q.get("keepalive"),0,65535,"keepalive"));
  JSONObject settings=j("secretKey",key(user(u),"PrivateKey"),"address",ips(required(q,"address"),false),"noKernelTun",true,"domainStrategy","ForceIP","peers",a(peer));
  if(q.containsKey("mtu"))settings.put("mtu",integer(q.get("mtu"),576,9000,"MTU"));
  if(q.containsKey("reserved")){String[] parts=q.get("reserved").split(",",-1);if(parts.length!=3)throw invalid("reserved");JSONArray r=new JSONArray();for(String p:parts)r.put(integer(p,0,255,"reserved"));settings.put("reserved",r);}
  return make(raw,u.getRawFragment()==null?"":dec(u.getRawFragment()),settings);
 }
 static JSONObject make(String raw,String name,JSONObject settings)throws Exception{
  String endpoint=settings.getJSONArray("peers").getJSONObject(0).getString("endpoint");
  return node(raw,name.isEmpty()?"WireGuard · "+endpoint:name,"WireGuard",endpoint,"UDP / WireGuard","xray",j("tag","probe","protocol","wireguard","settings",settings));
 }
}
