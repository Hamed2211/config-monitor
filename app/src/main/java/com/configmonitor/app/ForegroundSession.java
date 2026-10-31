package com.configmonitor.app;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.Set;
/** Track the whole app, so returning from its alarm screen is not a new launch. */
final class ForegroundSession {
 private final Set<Object> started=Collections.newSetFromMap(new IdentityHashMap<>());
 boolean started(Object activity){boolean entered=started.isEmpty();return started.add(activity)&&entered;}
 void stopped(Object activity){started.remove(activity);}
}
