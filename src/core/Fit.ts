export enum Fit {
  /**
   * Rive content will fill the available view. If the aspect ratios differ,
   * then the Rive content will be stretched.
   */
  Fill,

  /**
   * Rive content will be contained within the view, preserving the aspect
   * ratio. If the ratios differ, then a portion of the view will be unused
   */
  Contain,

  /**
   * Rive will cover the view, preserving the aspect ratio. If the Rive
   * content has a different ratio to the view, then the Rive content will be
   * clipped.
   */
  Cover,

  /**
   * Rive content will fill to the width of the view. This may result in
   * clipping or unfilled view space.
   */
  FitWidth,

  /**
   * Rive content will fill to the height of the view. This may result in
   * clipping or unfilled view space.
   */
  FitHeight,

  /**
   * Rive content will render to the size of its artboard, which may result
   * in clipping or unfilled view space.
   */
  None,

  /**
   * Rive content is scaled down to the size of the view, preserving the
   * aspect ratio. This is equivalent to Contain when the content is larger
   * than the canvas. If the canvas is larger, then ScaleDown will not scale
   * up.
   */
  ScaleDown,

  /**
   * Rive content will be resized automatically based on layout constraints of
   * the artboard to match the underlying widget size.
   *
   * @see [Responsive Layout](https://rive.app/community/doc/layout/docBl81zd1GB#responsive-layout)
   */
  Layout,
}
