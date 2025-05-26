/* eslint-disable no-bitwise */

/**
 * Represents a color in RGBA format for use with Rive color data binding.
 * Each channel (r, g, b, a) is represented as a number between 0-255.
 */
export class RiveColor {
  /**
   * Creates a new RiveColor instance.
   * @param r - Red channel (0-255)
   * @param g - Green channel (0-255)
   * @param b - Blue channel (0-255)
   * @param a - Alpha channel (0-255, where 255 is fully opaque)
   */
  constructor(
    public readonly r: number,
    public readonly g: number,
    public readonly b: number,
    public readonly a: number
  ) {}

  /**
   * Compares this color with another RiveColor instance.
   * @param other - The RiveColor to compare with
   * @returns true if the colors are equal, false otherwise
   */
  equals(other: RiveColor | undefined): boolean {
    if (!other) return false;
    return (
      this.r === other.r &&
      this.g === other.g &&
      this.b === other.b &&
      this.a === other.a
    );
  }

  /**
   * Creates a RiveColor instance from a hex color string.
   * Supports both 6-digit (#RRGGBB) and 8-digit (#RRGGBBAA) formats.
   * @param color - Hex color string (e.g., '#FF0000' or '#FF000080')
   * @returns A new RiveColor instance
   * @throws Will return black (0,0,0,255) with a warning if the hex string is invalid
   */
  static fromHexString(color: string): RiveColor {
    const hex = color.replace(/^#/, '');

    const isValidHex = /^[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(hex);
    if (!isValidHex) {
      console.warn(`Rive invalid hex color: ${color}`);
      return new RiveColor(0, 0, 0, 255);
    }

    let r = parseInt(hex.slice(0, 2), 16),
      g = parseInt(hex.slice(2, 4), 16),
      b = parseInt(hex.slice(4, 6), 16),
      a = 255;

    // Optionally parse alpha channel if present
    if (hex.length === 8) {
      a = parseInt(hex.slice(6, 8), 16);
    }

    return new RiveColor(r, g, b, a);
  }

  /**
   * Creates a RiveColor instance from a 32-bit integer.
   * The integer should be in ARGB format where:
   * - Bits 24-31: Alpha channel
   * - Bits 16-23: Red channel
   * - Bits 8-15: Green channel
   * - Bits 0-7: Blue channel
   * @param colorValue - 32-bit integer representing the color
   * @returns A new RiveColor instance
   */
  static fromInt(colorValue: number): RiveColor {
    const a = (colorValue >> 24) & 0xff;
    const r = (colorValue >> 16) & 0xff;
    const g = (colorValue >> 8) & 0xff;
    const b = colorValue & 0xff;
    return new RiveColor(r, g, b, a);
  }

  /**
   * Converts this color to a 32-bit integer in ARGB format.
   * @returns A 32-bit integer where:
   * - Bits 24-31: Alpha channel
   * - Bits 16-23: Red channel
   * - Bits 8-15: Green channel
   * - Bits 0-7: Blue channel
   */
  toInt(): number {
    return (
      ((this.a & 0xff) << 24) |
      ((this.r & 0xff) << 16) |
      ((this.g & 0xff) << 8) |
      (this.b & 0xff)
    );
  }
}
