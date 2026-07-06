#include <jni.h>
#include "RiveDebugUtilsOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return margelo::nitro::rivedebugutils::initialize(vm);
}
