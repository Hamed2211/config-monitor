package com.configmonitor.app;
public final class Digits {
 private Digits(){}
 public static String fa(String value){StringBuilder out=new StringBuilder();for(char c:value.toCharArray())out.append(c>='0'&&c<='9'?(char)('\u06F0'+c-'0'):c);return out.toString();}
}
