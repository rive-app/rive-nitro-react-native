package com.rive;

import android.content.Context;
import android.view.TextureView;

import app.rive.RiveTextureView;
import app.rive.semantics.SemanticActionType;
import app.rive.semantics.SemanticTreeModel;

import kotlin.Unit;
import kotlin.jvm.functions.Function0;
import kotlin.jvm.functions.Function1;
import kotlin.jvm.functions.Function2;

/**
 * Reaches {@code app.rive.RiveTextureView}, the SDK's TalkBack host, which is Kotlin-internal
 * in rive-android 11.10 (only its Compose entry point uses it); Java is not bound by that.
 */
final class RiveSemanticsTextureView {
  private RiveSemanticsTextureView() {}

  static TextureView create(Context context) {
    return new RiveTextureView(context);
  }

  static void install(
      TextureView view,
      SemanticTreeModel tree,
      Function2<Integer, SemanticActionType, Unit> onSemanticAction,
      Function1<Integer, Unit> onSemanticFocusRequested,
      Function0<Unit> onSemanticFocusCleared) {
    ((RiveTextureView) view)
        .installSemantics(
            tree,
            onSemanticAction,
            transition -> Unit.INSTANCE,
            onSemanticFocusRequested,
            onSemanticFocusCleared);
  }

  static boolean synchronize(TextureView view) {
    return ((RiveTextureView) view).synchronizeSemantics();
  }

  static void clear(TextureView view) {
    ((RiveTextureView) view).clearSemantics();
  }
}
