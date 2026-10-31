package com.configmonitor.app;
import org.json.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.io.*;
import java.util.*;
/** Strict import. Unsupported input fails visibly; it never becomes a direct probe. */
public final class Parser {
 static JSONObject j(Object... p){JSONObject o=new JSONObject();try{for(int i=0;i<p.length;i+=2)o.put((String)p[i],p[i+1]);}catch(Exception e){throw new IllegalArgumentException(e);}return o;}
 static JSONArray a(Object... p){JSONArray a=new JSONArray();for(Object x:p)a.put(x);return a;}
 static String dec(String s)throws Exception{return URLDecoder.decode(s.replace("+","%2B"),"UTF-8");}
 public static String b64(String s){String chars="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";ByteArrayOutputStream out=new ByteArrayOutputStream();int v=0,bits=0;for(char c:s.trim().replace('-','+').replace('_','/').toCharArray()){if(c=='='||Character.isWhitespace(c))continue;int d=chars.indexOf(c);if(d<0)throw new IllegalArgumentException("Invalid Base64");v=(v<<6)|d;bits+=6;if(bits>=8){bits-=8;out.write((v>>bits)&255);}}return new String(out.toByteArray(),StandardCharsets.UTF_8);}
 static Map<String,String> query(URI u)throws Exception{Map<String,String> m=new HashMap<>();if(u.getRawQuery()!=null)for(String x:u.getRawQuery().split("&")){String[]p=x.split("=",2);m.put(dec(p[0]),p.length==2?dec(p[1]):"");}return m;}
 static String get(Map<String,String> q,String k,String d){String v=q.get(k);return v==null||v.isEmpty()?d:v;}
 static boolean yes(String s){return s.equals("1")||s.equalsIgnoreCase("true");}
 static String host(URI u){String h=u.getHost();if(h==null||h.isEmpty())throw new IllegalArgumentException("Invalid host");return h.replace("[","").replace("]","");}
 static int port(URI u,int d){int p=u.getPort()<0?d:u.getPort();if(p<1||p>65535)throw new IllegalArgumentException("Invalid port");return p;}
 static void uuid(String id){if(!id.matches("[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}"))throw new IllegalArgumentException("Invalid UUID");}
 static String user(URI u)throws Exception {return u.getRawUserInfo()==null?"":dec(u.getRawUserInfo());}
 static JSONObject node(String raw,String name,String p,String h,String net,String engine,JSONObject cfg){return j("raw",raw,"name",name,"p",p,"host",h,"transport",net,"engine",engine,"config",cfg,"type","config","enabled",true,"revision",1,"state","pending","ms",-1,"failures",0,"incident",false,"ack",false);}
 public static JSONObject address(String input,String name,String method)throws Exception{
  String raw=input.trim(),endpoint=raw;boolean explicit=raw.contains("://"),literal=false;
  if(!explicit){String candidate=raw;
   if(candidate.startsWith("[")){int end=candidate.indexOf(']');if(end<0)throw new IllegalArgumentException("Invalid IPv6");candidate=candidate.substring(1,end);}
   else if(candidate.chars().filter(c->c==':').count()==1)candidate=candidate.substring(0,candidate.indexOf(':'));
   if(candidate.matches("[0-9.]+")){String[] parts=candidate.split("\\.",-1);if(parts.length!=4)throw new IllegalArgumentException("Invalid IPv4");for(String part:parts)if(part.isEmpty()||Integer.parseInt(part)>255)throw new IllegalArgumentException("Invalid IPv4");literal=true;}
   else if(candidate.contains(":")){if(!(InetAddress.getByName(candidate) instanceof Inet6Address))throw new IllegalArgumentException("Invalid IPv6");literal=true;if(!raw.startsWith("["))endpoint="["+raw+"]";}
  }
  URI u=new URI(explicit?raw:"https://"+endpoint);String h=host(u);port(u,u.getScheme().equals("https")?443:80);
  if(!Arrays.asList("http","https").contains(u.getScheme())||u.getUserInfo()!=null)throw new IllegalArgumentException("Use HTTP(S) address without credentials");
  if(method.equals("AUTO"))method=!explicit&&literal?(u.getPort()>0?"TCP":"ICMP"):"HTTPS";
  if(!Arrays.asList("HTTPS","TCP","ICMP").contains(method))throw new IllegalArgumentException("Invalid method");
  return node(u.toString(),name.isEmpty()?h:name,method,h,method,"direct",j()).put("type","address").put("method",method);
 }

 /** A server is an IP literal, never a proxy configuration or DNS hostname. */
 public static JSONObject server(String input,String name,String method)throws Exception {
  if(!Arrays.asList("ICMP","TCP").contains(method))throw new IllegalArgumentException("Choose ICMP or TCP");
  JSONObject n=address(input,name,method);URI u=new URI(n.getString("raw"));String h=n.getString("host");
  if(u.getRawQuery()!=null||u.getRawFragment()!=null||(u.getPath()!=null&&!u.getPath().isEmpty()))throw new IllegalArgumentException("Enter only the server IP and optional port");
  if(h.contains(":")) {
   if(!h.matches("[0-9a-fA-F:]+(?:\\.[0-9.]+)?"))throw new IllegalArgumentException("Invalid server IPv6");
   InetAddress.getByName(h); // Colon plus the character whitelist rules out DNS lookup.
  } else {
   String[] parts=h.split("\\.",-1);if(parts.length!=4)throw new IllegalArgumentException("Enter a valid IPv4 or IPv6 address");
   for(String part:parts)if(!part.matches("0|[1-9][0-9]{0,2}")||Integer.parseInt(part)>255)throw new IllegalArgumentException("Invalid server IPv4");
  }
  if(method.equals("TCP")&&u.getPort()<1)throw new IllegalArgumentException("TCP requires a port from 1 to 65535");
  return n.put("type","server");
 }

 public static JSONObject parse(String input)throws Exception{
  String raw=input.trim();if(raw.isEmpty()||raw.length()>1048576)throw new IllegalArgumentException("Empty or oversized configuration");
  if(WireGuard.isConfig(raw)||raw.startsWith("wireguard://")||raw.startsWith("wg://"))return WireGuard.parse(raw);
  if(raw.startsWith("{"))return json(raw);
  int split=raw.indexOf("://");if(split<1)throw new IllegalArgumentException("Configuration link required");String p=raw.substring(0,split).toLowerCase(Locale.ROOT);
  if(p.equals("vmess"))return vmess(raw);
  if(p.equals("ss")&&!raw.substring(split+3).split("#",2)[0].contains("@")){String[] parts=raw.substring(split+3).split("#",2);String decoded=b64(parts[0]);int at=decoded.lastIndexOf('@');if(at<0)throw new IllegalArgumentException("Invalid Shadowsocks");String credentials=URLEncoder.encode(decoded.substring(0,at),"UTF-8").replace("+","%20");return parse("ss://"+credentials+decoded.substring(at)+(parts.length==2?"#"+parts[1]:"")).put("raw",raw);}
  URI u=new URI(raw);String h=host(u),auth=user(u);Map<String,String> q=query(u);String name=u.getRawFragment()==null?h:dec(u.getRawFragment());JSONObject out;
  if(Arrays.asList("hysteria","hysteria2","hy2","tuic","anytls").contains(p)){
   String type=p.equals("hy2")?"hysteria2":p;out=j("type",type,"tag","probe","server",h,"server_port",port(u,443));JSONObject tls=j("enabled",true,"server_name",get(q,"sni",get(q,"peer",h)),"insecure",yes(get(q,"insecure",get(q,"allowInsecure","false"))));if(q.containsKey("alpn"))tls.put("alpn",a((Object[])q.get("alpn").split(",")));out.put("tls",tls);
   if(type.equals("tuic")){String[] cred=auth.split(":",2);if(cred.length!=2)throw new IllegalArgumentException("TUIC UUID:password required");uuid(cred[0]);out.put("uuid",cred[0]).put("password",cred[1]).put("congestion_control",get(q,"congestion_control","cubic"));if(q.containsKey("udp_relay_mode"))out.put("udp_relay_mode",q.get("udp_relay_mode"));}
   else if(type.equals("hysteria")){out.put("auth_str",get(q,"auth",auth)).put("up_mbps",Integer.parseInt(get(q,"upmbps","10"))).put("down_mbps",Integer.parseInt(get(q,"downmbps","50")));if(q.containsKey("obfsParam"))out.put("obfs",q.get("obfsParam"));}
   else {if(auth.isEmpty())throw new IllegalArgumentException("Password required");out.put("password",auth);if(q.containsKey("obfs")){if(!q.get("obfs").equals("salamander"))throw new IllegalArgumentException("Unsupported obfuscation");out.put("obfs",j("type","salamander","password",get(q,"obfs-password","")));}if(q.containsKey("mport"))out.put("server_ports",a((Object[])q.get("mport").replace('-',':').split(",")));}
   return node(raw,name,type,h,type.equals("anytls")?"TCP / TLS":"QUIC / TLS","singbox",out);
  }
  int po=port(u,p.equals("socks")||p.equals("socks5")?1080:p.equals("http")?80:443);String net=get(q,"type","tcp");
  switch(p){
   case "vless":uuid(auth);JSONObject usr=j("id",auth,"encryption",get(q,"encryption","none"));if(q.containsKey("flow"))usr.put("flow",q.get("flow"));out=j("protocol","vless","settings",j("vnext",a(j("address",h,"port",po,"users",a(usr)))));break;
   case "trojan":if(auth.isEmpty())throw new IllegalArgumentException("Password required");out=j("protocol","trojan","settings",j("servers",a(j("address",h,"port",po,"password",auth))));if(!q.containsKey("security"))q.put("security","tls");break;
   case "ss":if(q.containsKey("plugin"))throw new IllegalArgumentException("SIP003 plugins: import explicit JSON instead");if(!auth.contains(":"))auth=b64(auth);String[] parts=auth.split(":",2);if(parts.length!=2)throw new IllegalArgumentException("Cipher:password required");out=j("protocol","shadowsocks","settings",j("servers",a(j("address",h,"port",po,"method",parts[0],"password",parts[1]))));break;
   case "socks":case "socks5":case "http":case "https":JSONObject server=j("address",h,"port",po);if(!auth.isEmpty()){String[] cred=auth.split(":",2);server.put("users",a(j("user",cred[0],"pass",cred.length>1?cred[1]:"")));}out=j("protocol",p.startsWith("http")?"http":"socks","settings",j("servers",a(server)));if(p.equals("https"))q.put("security","tls");break;
   default:throw new IllegalArgumentException("Unsupported protocol: "+p);
  }
  out.put("tag","probe").put("streamSettings",stream(q,h));return node(raw,name,p.toUpperCase(Locale.ROOT),h,net,"xray",out);
 }
 static JSONObject vmess(String raw)throws Exception {String body=raw.substring(8).split("#",2)[0];JSONObject v=new JSONObject(b64(body));String h=v.getString("add"),id=v.getString("id");uuid(id);int po=Integer.parseInt(v.get("port").toString());if(h.isEmpty()||po<1||po>65535)throw new IllegalArgumentException("Invalid endpoint");Map<String,String>q=new HashMap<>();for(String k:Arrays.asList("host","path","sni","alpn","fp","allowInsecure"))if(v.has(k))q.put(k,v.optString(k));q.put("headerType",v.optString("type","none"));q.put("type",v.optString("net","tcp"));q.put("security",v.optString("tls","none"));if(q.get("type").equals("grpc"))q.put("serviceName",v.optString("path"));JSONObject out=j("tag","probe","protocol","vmess","settings",j("vnext",a(j("address",h,"port",po,"users",a(j("id",id,"alterId",v.optInt("aid"),"security",v.optString("scy","auto")))))),"streamSettings",stream(q,h));return node(raw,v.optString("ps",h),"VMess",h,q.get("type"),"xray",out);}
 static JSONObject stream(Map<String,String> q,String h)throws Exception{
  String net=get(q,"type","tcp");if(net.equals("raw"))net="tcp";if(net.equals("websocket"))net="ws";if(net.equals("mkcp"))net="kcp";if(net.equals("splithttp"))net="xhttp";JSONObject s=j("network",net);String security=get(q,"security","none");if(Arrays.asList("false","0","plain").contains(security.toLowerCase(Locale.ROOT)))security="none";if(!Arrays.asList("none","tls","reality").contains(security))throw new IllegalArgumentException("Unsupported security");s.put("security",security);
  if(!security.equals("none")){JSONObject tls=j("serverName",get(q,"sni",get(q,"host",h)),"fingerprint",get(q,"fp","chrome"));if(security.equals("tls")){tls.put("allowInsecure",yes(get(q,"allowInsecure",get(q,"insecure","false"))));if(q.containsKey("alpn"))tls.put("alpn",a((Object[])q.get("alpn").split(",")));}else{if(!q.containsKey("pbk"))throw new IllegalArgumentException("REALITY public key required");tls.put("publicKey",q.get("pbk")).put("shortId",get(q,"sid","")).put("spiderX",get(q,"spx","/"));if(q.containsKey("pqv"))tls.put("mldsa65Verify",q.get("pqv"));}s.put(security+"Settings",tls);}
  switch(net){case "tcp":if(get(q,"headerType","none").equals("http"))s.put("tcpSettings",j("header",j("type","http","request",j("path",a((Object[])get(q,"path","/").split(",")),"headers",j("Host",a((Object[])get(q,"host",h).split(",")))))));break;
   case "ws":s.put("wsSettings",j("path",get(q,"path","/"),"headers",j("Host",get(q,"host",h))));break;
   case "grpc":s.put("grpcSettings",j("serviceName",get(q,"serviceName",get(q,"path","")),"multiMode",get(q,"mode","").equals("multi"),"authority",get(q,"authority","")));break;
   case "xhttp":JSONObject x=j("path",get(q,"path","/"),"host",get(q,"host",""),"mode",get(q,"mode","auto"));if(q.containsKey("extra"))x.put("extra",new JSONObject(q.get("extra")));s.put("xhttpSettings",x);break;
   case "httpupgrade":s.put("httpupgradeSettings",j("path",get(q,"path","/"),"host",get(q,"host",h)));break;
   case "kcp":s.put("kcpSettings",j("seed",get(q,"seed",""),"header",j("type",get(q,"headerType","none"))));break;
   default:throw new IllegalArgumentException("Unsupported transport: "+net+"; use JSON");
  }return s;
 }
 static JSONObject json(String raw)throws Exception{JSONObject cfg=new JSONObject(raw),out=cfg;if(cfg.has("outbounds")){JSONArray all=cfg.getJSONArray("outbounds");if(all.length()!=1)throw new IllegalArgumentException("Import one outbound at a time; routing chains are not supported");out=all.getJSONObject(0);}out=new JSONObject(out.toString());String engine,p;if(out.has("protocol")){engine="xray";p=out.getString("protocol");if(!Arrays.asList("vmess","vless","trojan","shadowsocks","socks","http","wireguard").contains(p))throw new IllegalArgumentException("Unsupported outbound");if(out.has("proxySettings"))throw new IllegalArgumentException("Proxy chains are not supported");}else{engine="singbox";p=out.getString("type");if(!Arrays.asList("vmess","vless","trojan","shadowsocks","socks","http","hysteria","hysteria2","tuic","anytls","shadowtls","ssh","snell").contains(p)||out.has("detour"))throw new IllegalArgumentException("Unsupported outbound or chain");}out.put("tag","probe");if(p.equals("wireguard"))return WireGuard.json(raw,cfg,out);String h=out.optString("server",p);return node(raw,cfg.optString("name",p+" JSON"),p,h,"JSON",engine,out);}
}
