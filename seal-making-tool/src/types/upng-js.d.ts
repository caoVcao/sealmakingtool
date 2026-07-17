declare module 'upng-js' {
  interface UPNGStatic {
    encode(
      imgs: ArrayBuffer[],
      w: number,
      h: number,
      cnum?: number,
      dels?: number[]
    ): ArrayBuffer
    decode(buffer: ArrayBuffer): unknown
    toRGBA8(img: unknown): ArrayBuffer[]
  }

  const UPNG: UPNGStatic
  export default UPNG
}
