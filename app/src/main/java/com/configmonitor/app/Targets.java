package com.configmonitor.app;
import org.json.*;import java.net.*;
public final class Targets {
 public static JSONArray validate(JSONArray in)throws Exception{if(in.length()<1||in.length()>5)throw new IllegalArgumentException("Choose 1–5 probe targets");JSONArray out=new JSONArray();for(int i=0;i<in.length();i++){String s=in.getString(i).trim();if(s.contains("://")&&!s.startsWith("https://")&&!s.startsWith("http://"))throw new IllegalArgumentException("HTTP(S) targets only");if(!s.startsWith("https://")&&!s.startsWith("http://"))s="https://"+s;URL u=new URL(s);URI uri=u.toURI();if((!u.getProtocol().equals("https")&&!u.getProtocol().equals("http"))||u.getHost().isEmpty()||u.getUserInfo()!=null||u.getRef()!=null||s.length()>2048||s.contains("\r")||s.contains("\n"))throw new IllegalArgumentException("Use an HTTP(S) URL without credentials or fragment");if(u.getPort()>65535||u.getPort()==0)throw new IllegalArgumentException("Invalid port");out.put(uri.toASCIIString());}return out;}
}
