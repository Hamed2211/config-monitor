package com.configmonitor.app;
import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import javax.net.ssl.*;
/** An authenticated loopback proxy with ONLY the selected outbound. No direct fallback. */
final class EgressProbe implements AutoCloseable {
 final int port;final String password=UUID.randomUUID().toString();Process process;File temp;libv2ray.CoreController core;
 EgressProbe()throws Exception{try(ServerSocket reserve=new ServerSocket(0,1,InetAddress.getByName("127.0.0.1"))){port=reserve.getLocalPort();}}
 static JSONObject config(JSONObject node,int port,String password)throws Exception{
  JSONObject outbound=new JSONObject(node.getJSONObject("config").toString()).put("tag","egress");
  if(node.optString("engine").equals("xray"))return Parser.j("log",Parser.j("loglevel","none"),"inbounds",Parser.a(Parser.j("listen","127.0.0.1","port",port,"protocol","socks","settings",Parser.j("auth","password","accounts",Parser.a(Parser.j("user","monitor","pass",password)),"udp",false))),"outbounds",Parser.a(outbound));
  if(!node.optString("engine").equals("singbox"))throw new IllegalArgumentException("Unsupported config engine");
  return Parser.j("log",Parser.j("disabled",true),"dns",Parser.j("servers",Parser.a(Parser.j("type","local","tag","local"))),"route",Parser.j("final","egress","default_domain_resolver","local"),"inbounds",Parser.a(Parser.j("type","socks","listen","127.0.0.1","listen_port",port,"users",Parser.a(Parser.j("username","monitor","password",password)))),"outbounds",Parser.a(outbound));
 }
 void start(JSONObject node)throws Exception{
  JSONObject config=config(node,port,password);
  if(node.optString("engine").equals("xray")){
   if(!App.coreError.isEmpty())throw new IOException("Core unavailable");
   core=libv2ray.Libv2ray.newCoreController(new libv2ray.CoreCallbackHandler(){public long startup(){return 0;}public long shutdown(){return 0;}public long onEmitStatus(long code,String message){return 0;}});
   core.startLoop(config.toString(),0);
  }else{
   temp=File.createTempFile("egress-",".json",App.app.getCacheDir());try(OutputStream out=new FileOutputStream(temp)){out.write(config.toString().getBytes(StandardCharsets.UTF_8));}
   process=new ProcessBuilder(new File(App.app.getApplicationInfo().nativeLibraryDir,"libsingbox.so").toString(),"run","-c",temp.toString()).redirectErrorStream(true).start();
   final Process running=process;Thread drain=new Thread(()->{try(InputStream in=running.getInputStream()){byte[] b=new byte[2048];while(in.read(b)!=-1){}}catch(IOException ignored){}},"egress-core-output");drain.setDaemon(true);drain.start();
  }
  long deadline=System.nanoTime()+4000000000L;
  while(System.nanoTime()<deadline){if(Thread.currentThread().isInterrupted())throw new InterruptedException();if(process!=null&&!Engine.alive(process))throw new IOException("Core stopped");try(Socket s=new Socket()){s.connect(new InetSocketAddress("127.0.0.1",port),150);return;}catch(IOException e){Thread.sleep(50);}}
  throw new IOException("Core not ready");
 }
 static void connectSocks(Socket socket,String password,String host,int port)throws Exception{
  socket.setSoTimeout(7000);DataInputStream in=new DataInputStream(socket.getInputStream());OutputStream out=socket.getOutputStream();out.write(new byte[]{5,1,2});out.flush();if(in.readUnsignedByte()!=5||in.readUnsignedByte()!=2)throw new IOException("SOCKS authentication required");
  byte[] user="monitor".getBytes(StandardCharsets.US_ASCII),secret=password.getBytes(StandardCharsets.US_ASCII);out.write(1);out.write(user.length);out.write(user);out.write(secret.length);out.write(secret);out.flush();if(in.readUnsignedByte()!=1||in.readUnsignedByte()!=0)throw new IOException("SOCKS auth failed");
  byte[] name=host.getBytes(StandardCharsets.US_ASCII);out.write(new byte[]{5,1,0,3,(byte)name.length});out.write(name);out.write((port>>>8)&255);out.write(port&255);out.flush();if(in.readUnsignedByte()!=5||in.readUnsignedByte()!=0||in.readUnsignedByte()!=0)throw new IOException("SOCKS connect failed");int kind=in.readUnsignedByte(),length=kind==1?4:kind==4?16:kind==3?in.readUnsignedByte():-1;if(length<0)throw new IOException("Invalid SOCKS address");byte[] ignored=new byte[length+2];in.readFully(ignored);
 }
 String request(String host)throws Exception{
  try(Socket socket=new Socket()){
   socket.connect(new InetSocketAddress("127.0.0.1",port),1000);connectSocks(socket,password,host,443);
   try(SSLSocket tls=(SSLSocket)((SSLSocketFactory)SSLSocketFactory.getDefault()).createSocket(socket,host,443,true)){
    SSLParameters params=tls.getSSLParameters();params.setEndpointIdentificationAlgorithm("HTTPS");tls.setSSLParameters(params);tls.setSoTimeout(7000);tls.startHandshake();
    tls.getOutputStream().write(("GET / HTTP/1.1\r\nHost: "+host+"\r\nConnection: close\r\nAccept-Encoding: identity\r\nUser-Agent: ConfigMonitor/2.2\r\n\r\n").getBytes(StandardCharsets.US_ASCII));tls.getOutputStream().flush();return EgressResponse.read(tls.getInputStream());
   }
  }
 }
 static String lookup(JSONObject node)throws Exception{try(EgressProbe probe=new EgressProbe()){probe.start(node);try{return probe.request("api64.ipify.org");}catch(IOException e){return probe.request("api.ipify.org");}}}
 public void close(){if(core!=null)try{core.stopLoop();}catch(Exception ignored){}if(process!=null)process.destroy();if(temp!=null)temp.delete();}
}
