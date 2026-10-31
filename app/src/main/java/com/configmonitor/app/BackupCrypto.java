package com.configmonitor.app;
import java.nio.*;import java.util.*;import java.security.*;import javax.crypto.*;import javax.crypto.spec.*;
import org.bouncycastle.crypto.PBEParametersGenerator;import org.bouncycastle.crypto.generators.PKCS5S2ParametersGenerator;import org.bouncycastle.crypto.digests.SHA256Digest;import org.bouncycastle.crypto.params.KeyParameter;
/** Versioned authenticated envelope. Header is authenticated with the ciphertext. */
public final class BackupCrypto {
 public static final int MAX_BYTES=32*1024*1024,ITERATIONS=600000,HEADER=37;
 private static final byte[] MAGIC={'C','M','B','K',1};
 static byte[] derive(char[] password,byte[] salt,int iterations){byte[] utf8=PBEParametersGenerator.PKCS5PasswordToUTF8Bytes(password);try{PKCS5S2ParametersGenerator g=new PKCS5S2ParametersGenerator(new SHA256Digest());g.init(utf8,salt,iterations);return ((KeyParameter)g.generateDerivedParameters(256)).getKey();}finally{Arrays.fill(utf8,(byte)0);}}
 public static byte[] encrypt(byte[] plain,char[] password)throws GeneralSecurityException{
  if(plain.length>MAX_BYTES-HEADER-16)throw new GeneralSecurityException("Backup too large");
  if(password.length<10||password.length>1024)throw new GeneralSecurityException("Use a password of 10–1024 characters");
  byte[] salt=new byte[16],nonce=new byte[12];SecureRandom r=new SecureRandom();r.nextBytes(salt);r.nextBytes(nonce);
  byte[] header=ByteBuffer.allocate(HEADER).put(MAGIC).putInt(ITERATIONS).put(salt).put(nonce).array();byte[] cipher=crypt(Cipher.ENCRYPT_MODE,plain,password,salt,nonce,header);return ByteBuffer.allocate(HEADER+cipher.length).put(header).put(cipher).array();
 }
 public static byte[] decrypt(byte[] file,char[] password)throws GeneralSecurityException{
  if(file.length<HEADER+16||file.length>MAX_BYTES)throw new GeneralSecurityException("Invalid backup");
  ByteBuffer b=ByteBuffer.wrap(file);byte[] magic=new byte[5];b.get(magic);int rounds=b.getInt();if(!Arrays.equals(magic,MAGIC)||rounds!=ITERATIONS)throw new GeneralSecurityException("Unsupported backup format");
  byte[] salt=new byte[16],nonce=new byte[12];b.get(salt);b.get(nonce);return crypt(Cipher.DECRYPT_MODE,Arrays.copyOfRange(file,HEADER,file.length),password,salt,nonce,Arrays.copyOf(file,HEADER));
 }
 private static byte[] crypt(int mode,byte[] input,char[] password,byte[] salt,byte[] nonce,byte[] aad)throws GeneralSecurityException{byte[] key=derive(password,salt,ITERATIONS);try{Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(mode,new SecretKeySpec(key,"AES"),new GCMParameterSpec(128,nonce));c.updateAAD(aad);return c.doFinal(input);}finally{Arrays.fill(key,(byte)0);}}
}
