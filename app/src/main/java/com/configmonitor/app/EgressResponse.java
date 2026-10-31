package com.configmonitor.app;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
/** Bounded HTTP response decoder and literal-only public IP validation. */
final class EgressResponse {
 static String line(InputStream in,int limit)throws IOException{ByteArrayOutputStream out=new ByteArrayOutputStream();for(int i=0;i<limit;i++){int b=in.read();if(b<0)throw new EOFException();if(b=='\n')return out.toString("US-ASCII").replace("\r","");out.write(b);}throw new IOException("Header too long");}
 static String read(InputStream in)throws Exception{
  String status=line(in,1024);if(!status.matches("HTTP/1\\.[01] 200(?: .*|)"))throw new IOException("IP service unavailable");
  Map<String,String> headers=new HashMap<>();int size=status.length();
  while(true){String row=line(in,4096);size+=row.length()+2;if(size>16384)throw new IOException("Headers too large");if(row.isEmpty())break;int colon=row.indexOf(':');if(colon<1)throw new IOException("Invalid header");headers.put(row.substring(0,colon).toLowerCase(Locale.ROOT),row.substring(colon+1).trim());}
  if(!headers.getOrDefault("content-encoding","identity").equalsIgnoreCase("identity"))throw new IOException("Unsupported encoding");
  ByteArrayOutputStream out=new ByteArrayOutputStream();String transfer=headers.get("transfer-encoding");
  if(transfer!=null){if(!transfer.equalsIgnoreCase("chunked"))throw new IOException("Unsupported transfer");while(true){String chunk=line(in,64).split(";",2)[0];int n=Integer.parseInt(chunk,16);if(n<0||out.size()+n>128)throw new IOException("Body too large");if(n==0)break;copy(in,out,n);if(!line(in,2).isEmpty())throw new IOException("Invalid chunk");}}
  else if(headers.containsKey("content-length")){int n=Integer.parseInt(headers.get("content-length"));if(n<1||n>128)throw new IOException("Invalid length");copy(in,out,n);}
  else{for(int b;(b=in.read())!=-1;){if(out.size()>=128)throw new IOException("Body too large");out.write(b);}}
  return literal(out.toString("US-ASCII").trim());
 }
 static void copy(InputStream in,OutputStream out,int n)throws IOException{for(int i=0;i<n;i++){int b=in.read();if(b<0)throw new EOFException();out.write(b);}}
 static String literal(String value)throws Exception{
  if(value.length()>45||value.isEmpty())throw new IOException("Invalid IP");
  if(value.contains(":")){if(!value.matches("[0-9a-fA-F:.]+"))throw new IOException("Invalid IPv6");}
  else{if(!value.matches("(?:[0-9]{1,3}\\.){3}[0-9]{1,3}"))throw new IOException("Invalid IPv4");for(String part:value.split("\\."))if(Integer.parseInt(part)>255)throw new IOException("Invalid IPv4");}
  InetAddress ip=InetAddress.getByName(value);if(!CountryLookup.publicAddress(ip))throw new IOException("Non-public IP");return ip.getHostAddress();
 }
}
