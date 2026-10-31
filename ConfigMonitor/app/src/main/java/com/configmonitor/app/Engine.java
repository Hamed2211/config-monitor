package com.configmonitor.app;
import android.os.SystemClock;
import org.json.*;
import java.net.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import javax.net.ssl.*;
public final class Engine {
 public static final class Result {public final boolean ok;public final long ms;public final String error;public final JSONArray attempts;public Result(boolean o,long m,String e){this(o,m,e,new JSONArray());}public Result(boolean o,long m,String e,JSONArray a){ok=o;ms=m;error=e;attempts=a;}}
 static final Set<Process> processes=Collections.newSetFromMap(new ConcurrentHashMap<Process,Boolean>());
 public static void stopAll(){for(Process p:processes)p.destroy();processes.clear();}
 static boolean alive(Process p){try{p.exitValue();return false;}catch(IllegalThreadStateException e){return true;}}
 public static Result test(JSONObject node){
  JSONArray targets=targets(node,App.targets());return runTargets(targets,target->probe(node,target));
 }
 static JSONArray targets(JSONObject node,JSONArray defaults){return Arrays.asList("address","server").contains(node.optString("type"))?App.a(node.optString("raw")):defaults;}
 interface Probe {Result run(String target);}
 static Result runTargets(JSONArray targets,Probe probe){JSONArray attempts=new JSONArray();
  Result last=new Result(false,-1,"request_failed");
  for(int i=0;i<targets.length();i++){
   if(Thread.currentThread().isInterrupted())return new Result(false,-1,"cancelled",attempts);
   String target=targets.optString(i);last=probe.run(target);
   attempts.put(App.j("target",target,"ok",last.ok,"ms",last.ms,"error",last.error,"stage",stage(last.error)));
   if(last.ok)return new Result(true,last.ms,"",attempts);
  }
  return new Result(false,-1,last.error,attempts);
 }
 static String stage(String error){switch(error){case "dns_error":return "dns";case "tls_error":return "tls";case "connection_refused":return "connect";case "config_error":case "engine_unavailable":case "core_start_failed":return "engine";case "http_error":case "http_invalid":return "http";default:return "unknown";}}
 static Result probe(JSONObject node,String target){long start=SystemClock.elapsedRealtime();try{
  String engine=node.getString("engine");long ms;
  if(engine.equals("xray")){if(!App.coreError.isEmpty())throw new IOException("engine_unavailable");JSONObject config=App.j("log",App.j("loglevel","none"),"outbounds",App.a(node.getJSONObject("config")));ms=libv2ray.Libv2ray.measureOutboundDelay(config.toString(),target);if(ms<0)throw new IOException("request_failed");}
  else if(engine.equals("singbox")){singbox(node.getJSONObject("config"),target);ms=SystemClock.elapsedRealtime()-start;}
  else {direct(node);ms=SystemClock.elapsedRealtime()-start;}
  return new Result(true,Math.max(1,ms),"");
 }catch(Throwable e){String err=e instanceof SocketTimeoutException?"timeout":e instanceof UnknownHostException?"dns_error":e instanceof SSLException?"tls_error":e instanceof ConnectException?"connection_refused":e instanceof JSONException||e instanceof IllegalArgumentException?"config_error":"request_failed";String message=e.getMessage();if(message!=null&&Arrays.asList("engine_unavailable","core_start_failed","socks_auth","socks_connect","http_error","http_invalid","icmp_failed").contains(message))err=message;return new Result(false,-1,err);}}
 static void direct(JSONObject node)throws Exception {URL url=new URL(node.getString("raw"));int port=url.getPort()>0?url.getPort():url.getDefaultPort();switch(node.optString("method","HTTPS")){
  case "TCP":try(Socket s=new Socket()){s.connect(new InetSocketAddress(url.getHost().replace("[", "").replace("]", ""),port),5000);}break;
  case "ICMP":String ip=InetAddress.getByName(url.getHost().replace("[", "").replace("]", "")).getHostAddress();Process p=new ProcessBuilder(ip.contains(":")?"/system/bin/ping6":"/system/bin/ping","-n","-c","1","-W","5",ip).redirectErrorStream(true).start();processes.add(p);try{long deadline=SystemClock.elapsedRealtime()+6500;while(alive(p)&&SystemClock.elapsedRealtime()<deadline)Thread.sleep(60);if(alive(p)||p.exitValue()!=0)throw new IOException("icmp_failed");}finally{p.destroy();processes.remove(p);}break;
  default:HttpURLConnection c=(HttpURLConnection)url.openConnection(Proxy.NO_PROXY);try{c.setConnectTimeout(5000);c.setReadTimeout(5000);c.setInstanceFollowRedirects(false);c.setUseCaches(false);c.setRequestProperty("Cache-Control","no-cache");int status=c.getResponseCode();if(status<200||status>=400)throw new IOException("http_error");}finally{c.disconnect();}
 }}
 static void singbox(JSONObject outbound,String targetUrl)throws Exception {
  int port;try(ServerSocket reserve=new ServerSocket(0,1,InetAddress.getByName("127.0.0.1"))){port=reserve.getLocalPort();}
  String password=UUID.randomUUID().toString();JSONObject cfg=App.j("log",App.j("disabled",true),"dns",App.j("servers",App.a(App.j("type","local","tag","local"))),"route",App.j("final","probe","default_domain_resolver","local"),"inbounds",App.a(App.j("type","socks","tag","probe-in","listen","127.0.0.1","listen_port",port,"users",App.a(App.j("username","monitor","password",password)))),"outbounds",App.a(outbound));
  File temp=File.createTempFile("probe-",".json",App.app.getCacheDir());Process process=null;
  try{try(FileOutputStream stream=new FileOutputStream(temp)){stream.write(cfg.toString().getBytes(StandardCharsets.UTF_8));}File core=new File(App.app.getApplicationInfo().nativeLibraryDir,"libsingbox.so");process=new ProcessBuilder(core.toString(),"run","-c",temp.toString()).redirectErrorStream(true).start();processes.add(process);final Process drainProcess=process;Thread drain=new Thread(()->{try(InputStream log=drainProcess.getInputStream()){byte[] buf=new byte[2048];while(log.read(buf)!=-1){}}catch(IOException ignored){}},"core-output");drain.setDaemon(true);drain.start();
   long deadline=SystemClock.elapsedRealtime()+4000;boolean ready=false;while(alive(process)&&SystemClock.elapsedRealtime()<deadline){try(Socket s=new Socket()){s.connect(new InetSocketAddress("127.0.0.1",port),100);ready=true;break;}catch(IOException e){Thread.sleep(60);}}if(!ready)throw new IOException("core_start_failed");
   URL target=new URL(targetUrl);int tp=target.getPort()>0?target.getPort():target.getDefaultPort();try(Socket socket=new Socket()){
    socket.connect(new InetSocketAddress("127.0.0.1",port),1000);socket.setSoTimeout(12000);DataInputStream in=new DataInputStream(socket.getInputStream());OutputStream out=socket.getOutputStream();out.write(new byte[]{5,1,2});out.flush();if(in.readUnsignedByte()!=5||in.readUnsignedByte()!=2)throw new IOException("socks_auth");byte[] u="monitor".getBytes(StandardCharsets.UTF_8),pw=password.getBytes(StandardCharsets.UTF_8);out.write(1);out.write(u.length);out.write(u);out.write(pw.length);out.write(pw);out.flush();if(in.readUnsignedByte()!=1||in.readUnsignedByte()!=0)throw new IOException("socks_auth");byte[] h=target.getHost().getBytes(StandardCharsets.UTF_8);if(h.length>255)throw new IOException("host_length");out.write(new byte[]{5,1,0,3,(byte)h.length});out.write(h);out.write((tp>>8)&255);out.write(tp&255);out.flush();if(in.readUnsignedByte()!=5||in.readUnsignedByte()!=0)throw new IOException("socks_connect");in.readByte();int at=in.readUnsignedByte(),n=at==1?4:at==4?16:at==3?in.readUnsignedByte():-1;if(n<0)throw new IOException("socks_address");byte[] skip=new byte[n+2];in.readFully(skip);
    if(target.getProtocol().equals("https")){try(SSLSocket tls=(SSLSocket)((SSLSocketFactory)SSLSocketFactory.getDefault()).createSocket(socket,target.getHost(),tp,true)){SSLParameters params=tls.getSSLParameters();params.setEndpointIdentificationAlgorithm("HTTPS");tls.setSSLParameters(params);tls.setSoTimeout(12000);tls.startHandshake();http(tls,target);}}else http(socket,target);
   }
  }finally{if(process!=null){process.destroy();processes.remove(process);}temp.delete();}
 }
 static void http(Socket socket,URL target)throws Exception{String path=target.getFile();if(path.isEmpty())path="/";String host=target.getHost()+(target.getPort()>0?":"+target.getPort():"");String req="GET "+path+" HTTP/1.1\r\nHost: "+host+"\r\nConnection: close\r\nCache-Control: no-cache\r\nUser-Agent: ConfigMonitor/1\r\n\r\n";socket.getOutputStream().write(req.getBytes(StandardCharsets.UTF_8));socket.getOutputStream().flush();ByteArrayOutputStream line=new ByteArrayOutputStream();InputStream in=socket.getInputStream();for(int i=0;i<4096;i++){int b=in.read();if(b<0)throw new EOFException();if(b=='\n')break;line.write(b);}String[] parts=line.toString("UTF-8").split(" ");if(parts.length<2)throw new IOException("http_invalid");int code=Integer.parseInt(parts[1]);if(code<200||code>=400)throw new IOException("http_error");}
}
