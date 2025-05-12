#include <jni.h>
#include "ReactNativeRiveOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return margelo::nitro::reactnativerive::initialize(vm);
}
