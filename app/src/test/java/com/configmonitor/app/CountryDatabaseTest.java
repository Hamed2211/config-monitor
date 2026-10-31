package com.configmonitor.app;
import org.junit.Test;
import static org.junit.Assert.*;
import java.io.*;
import java.net.*;
import java.util.zip.GZIPInputStream;
public class CountryDatabaseTest {
 @Test public void bothAddressFamiliesAndUnknownRanges()throws Exception{
  try(InputStream in=new GZIPInputStream(new FileInputStream("work/ConfigMonitor/app/src/main/assets/country-ranges.bin.gz"))){CountryDatabase db=new CountryDatabase(in);
   assertEquals("AU",db.country(InetAddress.getByName("1.1.1.1").getAddress()));
   assertEquals("US",db.country(InetAddress.getByName("8.8.8.8").getAddress()));
   assertEquals("CA",db.country(InetAddress.getByName("2001:4860:4860::8888").getAddress()));
   assertEquals("",db.country(InetAddress.getByName("192.168.1.1").getAddress()));
   assertEquals("",db.country(new byte[3]));
  }
 }
 @Test public void malformedAndTruncatedFilesAreRejected()throws Exception{
  for(byte[] bytes:new byte[][]{new byte[0],new byte[12],new byte[]{67,77,67,49,0,0,0,1,0,0,0,1}}){try{new CountryDatabase(new ByteArrayInputStream(bytes));fail();}catch(IOException expected){}}
 }
 @Test public void nonPublicAddressesAreNeverAssignedACountry()throws Exception{
  for(String ip:new String[]{"127.0.0.1","192.168.1.1","10.0.0.1","172.16.0.1","100.64.0.1","169.254.1.1","::1","fd00::1","fe80::1"})assertFalse(ip,CountryLookup.publicAddress(InetAddress.getByName(ip)));
 }
}
