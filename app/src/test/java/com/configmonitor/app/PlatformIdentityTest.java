package com.configmonitor.app;
import android.content.SharedPreferences;
import java.lang.reflect.Proxy;
import java.util.*;
import org.junit.Test;
import static org.junit.Assert.*;
public class PlatformIdentityTest {
 static final String ORIGIN="https://panel.configmonitor.top";
 static SharedPreferences prefs(Map<String,Object> values){
  final Object[] editor=new Object[1];
  editor[0]=Proxy.newProxyInstance(SharedPreferences.Editor.class.getClassLoader(),new Class[]{SharedPreferences.Editor.class},(proxy,method,args)->{
   String name=method.getName();if(name.equals("clear"))values.clear();else if(name.equals("remove"))values.remove(args[0]);else if(name.startsWith("put"))values.put((String)args[0],args[1]);else if(name.equals("commit"))return true;else if(name.equals("apply"))return null;else throw new AssertionError(name);return editor[0];
  });
  return (SharedPreferences)Proxy.newProxyInstance(SharedPreferences.class.getClassLoader(),new Class[]{SharedPreferences.class},(proxy,method,args)->{
   if(method.getName().equals("edit"))return editor[0];if(method.getName().equals("getString"))return values.getOrDefault(args[0],args[1]);throw new AssertionError(method.getName());
  });
 }
 @Test public void freshInstallCreatesStableCredentials(){Map<String,Object> data=new HashMap<>();SharedPreferences p=prefs(data);PlatformIdentity.prepare(p,ORIGIN);assertEquals(ORIGIN,data.get("origin"));UUID.fromString((String)data.get("id"));assertTrue(((String)data.get("secret")).matches("[0-9a-f]{64}"));Map<String,Object> saved=new HashMap<>(data);PlatformIdentity.prepare(p,ORIGIN);assertEquals(saved,data);}
 @Test public void existingIdentityAndReceiptQueueSurviveUpgrade(){Map<String,Object> data=new HashMap<>();data.put("origin",ORIGIN);data.put("id","existing-id");data.put("secret","existing-secret");data.put("registered",true);data.put("receipts","queued");data.put("consent",false);data.put("prompted",true);PlatformIdentity.prepare(prefs(data),ORIGIN);assertEquals("existing-id",data.get("id"));assertEquals("existing-secret",data.get("secret"));assertEquals(true,data.get("registered"));assertEquals("queued",data.get("receipts"));assertFalse(data.containsKey("consent"));assertFalse(data.containsKey("prompted"));}
 @Test public void disconnectedInstallBootstrapsWithoutManualEnable(){Map<String,Object> data=new HashMap<>();data.put("prompted",true);data.put("consent",false);PlatformIdentity.prepare(prefs(data),ORIGIN);assertEquals(ORIGIN,data.get("origin"));assertNotNull(data.get("secret"));assertFalse(data.containsKey("prompted"));}
 @Test public void foreignEndpointCredentialsAndEventsAreNotReused(){Map<String,Object> data=new HashMap<>();data.put("origin","https://old.example.com");data.put("id","old-id");data.put("secret","old-secret");data.put("registered",true);data.put("receipts","old-event");data.put("creativeOrigin","https://ads.example.com");PlatformIdentity.prepare(prefs(data),ORIGIN);assertEquals(ORIGIN,data.get("origin"));assertNotEquals("old-id",data.get("id"));assertNotEquals("old-secret",data.get("secret"));assertFalse(data.containsKey("registered"));assertFalse(data.containsKey("receipts"));assertFalse(data.containsKey("creativeOrigin"));}
 @Test public void incompleteCredentialsAreReplaced(){Map<String,Object> data=new HashMap<>();data.put("origin",ORIGIN);data.put("id","incomplete");data.put("registered",true);PlatformIdentity.prepare(prefs(data),ORIGIN);assertNotEquals("incomplete",data.get("id"));assertNotNull(data.get("secret"));assertFalse(data.containsKey("registered"));}
 @Test public void emptyPresetDoesNotCreateInvalidIdentity(){Map<String,Object> data=new HashMap<>();PlatformIdentity.prepare(prefs(data),"");assertTrue(data.isEmpty());}
}
