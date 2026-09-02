package com.rive;

import android.content.Context;
import android.view.TextureView;

import app.rive.RiveTextureView;
import app.rive.semantics.SemanticActionType;
import app.rive.semantics.SemanticTreeModel;

import kotlin.Unit;

/**
 * Bridges to {@code app.rive.RiveTextureView}, the SDK's TalkBack host for a semantic tree.
 * It is Kotlin-internal in rive-android 11.10 (only the Compose entry point uses it), which
 * Java is not bound by; drop this shim once the SDK exposes it publicly.
 */
final class RiveSemanticsTextureView {
  interface Listener {
    void onSemanticAction(int nodeId, SemanticActionType action);

    void onSemanticFocusRequested(int nodeId);

    void onSemanticFocusCleared();
  }

  private RiveSemanticsTextureView() {}

  static TextureView create(Context context) {
    return new RiveTextureView(context);
  }

  static void install(TextureView view, SemanticTreeModel tree, Listener listener) {
    ((RiveTextureView) view).installSemantics(
        tree,
        (nodeId, action) -> {
          listener.onSemanticAction(nodeId, action);
          return Unit.INSTANCE;
        },
        transition -> Unit.INSTANCE,
        nodeId -> {
          listener.onSemanticFocusRequested(nodeId);
          return Unit.INSTANCE;
        },
        () -> {
          listener.onSemanticFocusCleared();
          return Unit.INSTANCE;
        });
  }

  static boolean synchronize(TextureView view) {
    return ((RiveTextureView) view).synchronizeSemantics();
  }

  static void clear(TextureView view) {
    ((RiveTextureView) view).clearSemantics();
  }
}
