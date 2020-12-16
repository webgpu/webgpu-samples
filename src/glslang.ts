let glslang = undefined;
export default async function() {
  if (glslang !== undefined) return glslang;
  // @ts-ignore
  const glslangModule = await import(/* webpackIgnore: true */ 'https://unpkg.com/@webgpu/glslang@0.0.15/dist/web-devel/glslang.js');
  glslang = await glslangModule.default();
  return glslang;
}
