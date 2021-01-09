export interface Glslang {
  compileGLSL(
    glsl: string,
    type: 'vertex' | 'fragment' | 'compute'
  ): Uint32Array;
}

let glslang: Glslang | undefined = undefined;
export default async function getGlslang(): Promise<Glslang> {
  if (glslang !== undefined) return glslang;
  const glslangModule = await import(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    /* webpackIgnore: true */ 'https://unpkg.com/@webgpu/glslang@0.0.15/dist/web-devel/glslang.js'
  );
  glslang = await glslangModule.default();
  return glslang;
}
