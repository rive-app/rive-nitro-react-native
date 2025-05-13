#include <jni.h>
#include "riveOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return margelo::nitro::rive::initialize(vm);
}
