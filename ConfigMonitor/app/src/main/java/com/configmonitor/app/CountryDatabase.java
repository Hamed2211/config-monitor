package com.configmonitor.app;
import java.io.*;
import java.nio.charset.StandardCharsets;
/** Compact, sorted, non-overlapping IP ranges derived from DB-IP (CC BY 4.0). */
public final class CountryDatabase {
 private final byte[] ipv4,ipv6;
 public CountryDatabase(InputStream source)throws IOException{
  DataInputStream in=new DataInputStream(source);
  if(in.readInt()!=0x434d4331)throw new IOException("Invalid country database");
  int v4=in.readInt(),v6=in.readInt();
  if(v4<1||v6<1||v4>2000000||v6>2000000)throw new IOException("Invalid range count");
  ipv4=new byte[v4*10];ipv6=new byte[v6*34];in.readFully(ipv4);in.readFully(ipv6);
  if(in.read()!=-1)throw new IOException("Unexpected trailing data");
 }
 private static int compare(byte[] ip,byte[] table,int offset){for(int i=0;i<ip.length;i++){int delta=(ip[i]&255)-(table[offset+i]&255);if(delta!=0)return delta;}return 0;}
 public String country(byte[] ip){
  if(ip.length!=4&&ip.length!=16)return "";
  byte[] table=ip.length==4?ipv4:ipv6;int step=ip.length*2+2,lo=0,hi=table.length/step-1;
  while(lo<=hi){int mid=(lo+hi)>>>1,at=mid*step;
   if(compare(ip,table,at)<0)hi=mid-1;
   else if(compare(ip,table,at+ip.length)>0)lo=mid+1;
   else return new String(table,at+2*ip.length,2,StandardCharsets.US_ASCII);
  }
  return "";
 }
}
