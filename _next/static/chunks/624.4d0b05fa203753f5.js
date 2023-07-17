(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[624],{5671:function(e,n,t){"use strict";t.d(n,{T:function(){return u}});var a=t(5893),r=t(9008),i=t.n(r),o=t(1163),s=t(7294),l=t(9147),d=t.n(l);t(7319);let c=e=>{let n=(0,s.useRef)(null),r=(0,s.useMemo)(()=>e.sources.map(e=>{let{name:n,contents:r}=e;return{name:n,...function(e){let n;let r=null;{r=document.createElement("div");let i=t(4631);n=i(r,{lineNumbers:!0,lineWrapping:!0,theme:"monokai",readOnly:!0})}return{Container:function(t){return(0,a.jsx)("div",{...t,children:(0,a.jsx)("div",{ref(t){r&&t&&(t.appendChild(r),n.setOption("value",e))}})})}}}(r)}}),e.sources),l=(0,s.useRef)(null),c=(0,s.useMemo)(()=>{if(e.gui){let n=t(4376);return new n.GUI({autoPlace:!1})}},[]),u=(0,s.useRef)(null),p=(0,s.useMemo)(()=>{if(e.stats){let n=t(2792);return new n}},[]),m=(0,o.useRouter)(),g=m.asPath.match(/#([a-zA-Z0-9\.\/]+)/),[f,v]=(0,s.useState)(null),[h,x]=(0,s.useState)(null);return(0,s.useEffect)(()=>{g?x(g[1]):x(r[0].name),c&&l.current&&l.current.appendChild(c.domElement),p&&u.current&&(p.dom.style.position="absolute",p.showPanel(1),u.current.appendChild(p.dom));let t={active:!0},a=()=>{t.active=!1};try{let i=n.current,o=e.init({canvas:i,pageState:t,gui:c,stats:p});o instanceof Promise&&o.catch(e=>{console.error(e),v(e)})}catch(s){console.error(s),v(s)}return a},[]),(0,a.jsxs)("main",{children:[(0,a.jsxs)(i(),{children:[(0,a.jsx)("style",{dangerouslySetInnerHTML:{__html:"\n            .CodeMirror {\n              height: auto !important;\n              margin: 1em 0;\n            }\n\n            .CodeMirror-scroll {\n              height: auto !important;\n              overflow: visible !important;\n            }\n          "}}),(0,a.jsx)("title",{children:"".concat(e.name," - WebGPU Samples")}),(0,a.jsx)("meta",{name:"description",content:e.description}),(0,a.jsx)("meta",{httpEquiv:"origin-trial",content:e.originTrial})]}),(0,a.jsxs)("div",{children:[(0,a.jsx)("h1",{children:e.name}),(0,a.jsx)("a",{target:"_blank",rel:"noreferrer",href:"https://github.com/".concat("webgpu/webgpu-samples","/tree/main/").concat(e.filename),children:"See it on Github!"}),(0,a.jsx)("p",{children:e.description}),f?(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)("p",{children:"Is WebGPU Enabled?"}),(0,a.jsx)("p",{children:"".concat(f)})]}):null]}),(0,a.jsxs)("div",{className:d().canvasContainer,children:[(0,a.jsx)("div",{style:{position:"absolute",left:10},ref:u}),(0,a.jsx)("div",{style:{position:"absolute",right:10},ref:l}),(0,a.jsx)("canvas",{ref:n})]}),(0,a.jsxs)("div",{children:[(0,a.jsx)("nav",{className:d().sourceFileNav,children:(0,a.jsx)("ul",{children:r.map((e,n)=>(0,a.jsx)("li",{children:(0,a.jsx)("a",{href:"#".concat(e.name),"data-active":h==e.name,onClick(){x(e.name)},children:e.name})},n))})}),r.map((e,n)=>(0,a.jsx)(e.Container,{className:d().sourceFileContainer,"data-active":h==e.name},n))]})]})},u=e=>(0,a.jsx)(c,{...e})},8624:function(e,n,t){"use strict";t.r(n),t.d(n,{default:function(){return c}});var a=t(3560),r=t(5671),i="struct Config {\n  viewProj: mat4x4f,\n  animationOffset: vec2f,\n  flangeSize: f32,\n  highlightFlange: f32,\n};\n@group(0) @binding(0) var<uniform> config: Config;\n@group(0) @binding(1) var<storage, read> matrices: array<mat4x4f>;\n@group(0) @binding(2) var samp: sampler;\n@group(0) @binding(3) var tex: texture_2d<f32>;\n\nstruct Varying {\n  @builtin(position) pos: vec4f,\n  @location(0) uv: vec2f,\n}\n\noverride kTextureBaseSize: f32;\noverride kViewportSize: f32;\n\n@vertex\nfn vmain(\n  @builtin(instance_index) instance_index: u32,\n  @builtin(vertex_index) vertex_index: u32,\n) -> Varying {\n  let flange = config.flangeSize;\n  var uvs = array(\n    vec2(-flange, -flange), vec2(-flange, 1 + flange), vec2(1 + flange, -flange),\n    vec2(1 + flange, -flange), vec2(-flange, 1 + flange), vec2(1 + flange, 1 + flange),\n  );\n  // Default size (if matrix is the identity) makes 1 texel = 1 pixel.\n  let radius = (1 + 2 * flange) * kTextureBaseSize / kViewportSize;\n  var positions = array(\n    vec2(-radius, -radius), vec2(-radius, radius), vec2(radius, -radius),\n    vec2(radius, -radius), vec2(-radius, radius), vec2(radius, radius),\n  );\n\n  let modelMatrix = matrices[instance_index];\n  let pos = config.viewProj * modelMatrix * vec4f(positions[vertex_index] + config.animationOffset, 0, 1);\n  return Varying(pos, uvs[vertex_index]);\n}\n\n@fragment\nfn fmain(vary: Varying) -> @location(0) vec4f {\n  let uv = vary.uv;\n  var color = textureSample(tex, samp, uv);\n\n  let outOfBounds = uv.x < 0 || uv.x > 1 || uv.y < 0 || uv.y > 1;\n  if config.highlightFlange > 0 && outOfBounds {\n    color += vec4(0.7, 0, 0, 0);\n  }\n\n  return color;\n}\n\n",o="@group(0) @binding(0) var tex: texture_2d<f32>;\n\nstruct Varying {\n  @builtin(position) pos: vec4f,\n  @location(0) texelCoord: vec2f,\n  @location(1) mipLevel: f32,\n}\n\nconst kMipLevels = 4;\nconst baseMipSize: u32 = 16;\n\n@vertex\nfn vmain(\n  @builtin(instance_index) instance_index: u32, // used as mipLevel\n  @builtin(vertex_index) vertex_index: u32,\n) -> Varying {\n  var square = array(\n    vec2f(0, 0), vec2f(0, 1), vec2f(1, 0),\n    vec2f(1, 0), vec2f(0, 1), vec2f(1, 1),\n  );\n  let uv = square[vertex_index];\n  let pos = vec4(uv * 2 - vec2(1, 1), 0.0, 1.0);\n\n  let mipLevel = instance_index;\n  let mipSize = f32(1 << (kMipLevels - mipLevel));\n  let texelCoord = uv * mipSize;\n  return Varying(pos, texelCoord, f32(mipLevel));\n}\n\n@fragment\nfn fmain(vary: Varying) -> @location(0) vec4f {\n  return textureLoad(tex, vec2u(vary.texelCoord), u32(vary.mipLevel));\n}\n",s="src/sample/samplerParameters/main.ts";let l=new Float32Array([...a._E.scale(a._E.rotationZ(Math.PI/16),[2,2,1]),...a._E.scale(a._E.identity(),[2,2,1]),...a._E.scale(a._E.rotationX(-(.3*Math.PI)),[2,2,1]),...a._E.scale(a._E.rotationX(-(.42*Math.PI)),[2,2,1]),...a._E.rotationZ(Math.PI/16),...a._E.identity(),...a._E.rotationX(-(.3*Math.PI)),...a._E.rotationX(-(.42*Math.PI)),...a._E.scale(a._E.rotationZ(Math.PI/16),[.9,.9,1]),...a._E.scale(a._E.identity(),[.9,.9,1]),...a._E.scale(a._E.rotationX(-(.3*Math.PI)),[.9,.9,1]),...a._E.scale(a._E.rotationX(-(.42*Math.PI)),[.9,.9,1]),...a._E.scale(a._E.rotationZ(Math.PI/16),[.3,.3,1]),...a._E.scale(a._E.identity(),[.3,.3,1]),...a._E.scale(a._E.rotationX(-(.3*Math.PI)),[.3,.3,1])]),d=async e=>{let{canvas:n,pageState:t,gui:r}=e,s=await navigator.gpu.requestAdapter(),d=await s.requestDevice();if(!t.active)return;let c={flangeLogSize:1,highlightFlange:!1,animation:.1},u={...c},p=()=>{let e=performance.now()/1e3*.5,n=new Float32Array([Math.cos(e)*u.animation,Math.sin(e)*u.animation,(2**u.flangeLogSize-1)/2,Number(u.highlightFlange)]);d.queue.writeBuffer(X,64,n)},m={addressModeU:"clamp-to-edge",addressModeV:"clamp-to-edge",magFilter:"linear",minFilter:"linear",mipmapFilter:"linear",lodMinClamp:0,lodMaxClamp:4,maxAnisotropy:1},g={...m};{let f={initial(){Object.assign(u,c),Object.assign(g,m),r.updateDisplay()},checkerboard(){Object.assign(u,{flangeLogSize:10}),Object.assign(g,{addressModeU:"repeat",addressModeV:"repeat"}),r.updateDisplay()},smooth(){Object.assign(g,{magFilter:"linear",minFilter:"linear",mipmapFilter:"linear"}),r.updateDisplay()},crunchy(){Object.assign(g,{magFilter:"nearest",minFilter:"nearest",mipmapFilter:"nearest"}),r.updateDisplay()}},v=r.addFolder("Presets");v.open(),v.add(f,"initial").name("reset to initial"),v.add(f,"checkerboard").name("checkered floor"),v.add(f,"smooth").name("smooth (linear)"),v.add(f,"crunchy").name("crunchy (nearest)");let h=r.addFolder("Plane settings");h.open(),h.add(u,"flangeLogSize",0,10,.1).name("size = 2**"),h.add(u,"highlightFlange"),h.add(u,"animation",0,.5),r.width=280;{let x=r.addFolder("GPUSamplerDescriptor");x.open();let w=["clamp-to-edge","repeat","mirror-repeat"];x.add(g,"addressModeU",w),x.add(g,"addressModeV",w);let y=["nearest","linear"];x.add(g,"magFilter",y),x.add(g,"minFilter",y),x.add(g,"mipmapFilter",["nearest","linear"]);let S=x.add(g,"lodMinClamp",0,4,.1),b=x.add(g,"lodMaxClamp",0,4,.1);S.onChange(e=>{g.lodMaxClamp<e&&b.setValue(e)}),b.onChange(e=>{g.lodMinClamp>e&&S.setValue(e)});{let M=x.addFolder('maxAnisotropy (set only if all "linear")');M.open(),M.add(g,"maxAnisotropy",1,16,1)}}}let k=Math.floor(50),P=k-2,C=600*devicePixelRatio,F=200*Math.floor(C/200),_=F/devicePixelRatio;console.log(F,_),n.style.imageRendering="pixelated",n.width=n.height=200,n.style.minWidth=n.style.maxWidth=_+"px";let z=navigator.gpu.getPreferredCanvasFormat(),V=n.getContext("webgpu");V.configure({device:d,format:z,alphaMode:"premultiplied"});let L=d.createTexture({format:"rgba8unorm",usage:GPUTextureUsage.COPY_DST|GPUTextureUsage.TEXTURE_BINDING,size:[16,16],mipLevelCount:4}),G=L.createView(),D=[[255,255,255,255],[30,136,229,255],[255,193,7,255],[216,27,96,255]];for(let T=0;T<4;++T){let E=2**(4-T),j=new Uint8Array(E*E*4);for(let B=0;B<E;++B)for(let U=0;U<E;++U)j.set((U+B)%2?D[T]:[0,0,0,255],(B*E+U)*4);d.queue.writeTexture({texture:L,mipLevel:T},j,{bytesPerRow:4*E},[E,E])}let I=d.createShaderModule({code:o}),A=d.createRenderPipeline({layout:"auto",vertex:{module:I,entryPoint:"vmain"},fragment:{module:I,entryPoint:"fmain",targets:[{format:z}]},primitive:{topology:"triangle-list"}}),R=d.createBindGroup({layout:A.getBindGroupLayout(0),entries:[{binding:0,resource:G}]}),q=d.createShaderModule({code:i}),O=d.createRenderPipeline({layout:"auto",vertex:{module:q,entryPoint:"vmain",constants:{kTextureBaseSize:16,kViewportSize:P}},fragment:{module:q,entryPoint:"fmain",targets:[{format:z}]},primitive:{topology:"triangle-list"}}),N=O.getBindGroupLayout(0),X=d.createBuffer({usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.UNIFORM,size:128}),W=a._E.translate(a._E.perspective(2*Math.atan(.3333333333333333),1,.1,100),[0,0,-3]);d.queue.writeBuffer(X,0,W);let Z=d.createBuffer({usage:GPUBufferUsage.STORAGE,size:l.byteLength,mappedAtCreation:!0});new Float32Array(Z.getMappedRange()).set(l),Z.unmap(),requestAnimationFrame(function e(){if(!t.active)return;p();let n=d.createSampler({...g,maxAnisotropy:"linear"===g.minFilter&&"linear"===g.magFilter&&"linear"===g.mipmapFilter?g.maxAnisotropy:1}),a=d.createBindGroup({layout:N,entries:[{binding:0,resource:{buffer:X}},{binding:1,resource:{buffer:Z}},{binding:2,resource:n},{binding:3,resource:G}]}),r=V.getCurrentTexture().createView(),i=d.createCommandEncoder(),o=i.beginRenderPass({colorAttachments:[{view:r,clearValue:{r:.2,g:.2,b:.2,a:1},loadOp:"clear",storeOp:"store"}]});o.setPipeline(O),o.setBindGroup(0,a);for(let s=0;s<15;++s){let l=k*(s%4)+1,c=k*Math.floor(s/4)+1;o.setViewport(l,c,P,P,0,1),o.draw(6,1,0,s)}o.setPipeline(A),o.setBindGroup(0,R);let u=3*k+1;o.setViewport(u,u,32,32,0,1),o.draw(6,1,0,0),o.setViewport(u+32,u,16,16,0,1),o.draw(6,1,0,1),o.setViewport(u+32,u+16,8,8,0,1),o.draw(6,1,0,2),o.setViewport(u+32,u+24,4,4,0,1),o.draw(6,1,0,3),o.end(),d.queue.submit([i.finish()]),requestAnimationFrame(e)})};var c=()=>(0,r.T)({name:"Sampler Parameters",description:"Visualizes what all the sampler parameters do. Shows a textured plane at various scales (rotated, head-on, in perspective, and in vanishing perspective). The bottom-right view shows the raw contents of the 4 mipmap levels of the test texture (16x16, 8x8, 4x4, and 2x2).",gui:!0,init:d,sources:[{name:s.substring(29),contents:"import { mat4 } from 'wgpu-matrix';\nimport { makeSample, SampleInit } from '../../components/SampleLayout';\n\nimport texturedSquareWGSL from './texturedSquare.wgsl';\nimport showTextureWGSL from './showTexture.wgsl';\n\nconst kMatrices: Readonly<Float32Array> = new Float32Array([\n  // Row 1: Scale by 2\n  ...mat4.scale(mat4.rotationZ(Math.PI / 16), [2, 2, 1]),\n  ...mat4.scale(mat4.identity(), [2, 2, 1]),\n  ...mat4.scale(mat4.rotationX(-Math.PI * 0.3), [2, 2, 1]),\n  ...mat4.scale(mat4.rotationX(-Math.PI * 0.42), [2, 2, 1]),\n  // Row 2: Scale by 1\n  ...mat4.rotationZ(Math.PI / 16),\n  ...mat4.identity(),\n  ...mat4.rotationX(-Math.PI * 0.3),\n  ...mat4.rotationX(-Math.PI * 0.42),\n  // Row 3: Scale by 0.9\n  ...mat4.scale(mat4.rotationZ(Math.PI / 16), [0.9, 0.9, 1]),\n  ...mat4.scale(mat4.identity(), [0.9, 0.9, 1]),\n  ...mat4.scale(mat4.rotationX(-Math.PI * 0.3), [0.9, 0.9, 1]),\n  ...mat4.scale(mat4.rotationX(-Math.PI * 0.42), [0.9, 0.9, 1]),\n  // Row 4: Scale by 0.3\n  ...mat4.scale(mat4.rotationZ(Math.PI / 16), [0.3, 0.3, 1]),\n  ...mat4.scale(mat4.identity(), [0.3, 0.3, 1]),\n  ...mat4.scale(mat4.rotationX(-Math.PI * 0.3), [0.3, 0.3, 1]),\n]);\n\nconst init: SampleInit = async ({ canvas, pageState, gui }) => {\n  const adapter = await navigator.gpu.requestAdapter();\n  const device = await adapter.requestDevice();\n\n  if (!pageState.active) return;\n\n  //\n  // GUI controls\n  //\n\n  const kInitConfig = {\n    flangeLogSize: 1.0,\n    highlightFlange: false,\n    animation: 0.1,\n  } as const;\n  const config = { ...kInitConfig };\n  const updateConfigBuffer = () => {\n    const t = (performance.now() / 1000) * 0.5;\n    const data = new Float32Array([\n      Math.cos(t) * config.animation,\n      Math.sin(t) * config.animation,\n      (2 ** config.flangeLogSize - 1) / 2,\n      Number(config.highlightFlange),\n    ]);\n    device.queue.writeBuffer(bufConfig, 64, data);\n  };\n\n  const kInitSamplerDescriptor = {\n    addressModeU: 'clamp-to-edge',\n    addressModeV: 'clamp-to-edge',\n    magFilter: 'linear',\n    minFilter: 'linear',\n    mipmapFilter: 'linear',\n    lodMinClamp: 0,\n    lodMaxClamp: 4,\n    maxAnisotropy: 1,\n  } as const;\n  const samplerDescriptor: GPUSamplerDescriptor = { ...kInitSamplerDescriptor };\n\n  {\n    const buttons = {\n      initial() {\n        Object.assign(config, kInitConfig);\n        Object.assign(samplerDescriptor, kInitSamplerDescriptor);\n        gui.updateDisplay();\n      },\n      checkerboard() {\n        Object.assign(config, { flangeLogSize: 10 });\n        Object.assign(samplerDescriptor, {\n          addressModeU: 'repeat',\n          addressModeV: 'repeat',\n        });\n        gui.updateDisplay();\n      },\n      smooth() {\n        Object.assign(samplerDescriptor, {\n          magFilter: 'linear',\n          minFilter: 'linear',\n          mipmapFilter: 'linear',\n        });\n        gui.updateDisplay();\n      },\n      crunchy() {\n        Object.assign(samplerDescriptor, {\n          magFilter: 'nearest',\n          minFilter: 'nearest',\n          mipmapFilter: 'nearest',\n        });\n        gui.updateDisplay();\n      },\n    };\n    const presets = gui.addFolder('Presets');\n    presets.open();\n    presets.add(buttons, 'initial').name('reset to initial');\n    presets.add(buttons, 'checkerboard').name('checkered floor');\n    presets.add(buttons, 'smooth').name('smooth (linear)');\n    presets.add(buttons, 'crunchy').name('crunchy (nearest)');\n\n    const flangeFold = gui.addFolder('Plane settings');\n    flangeFold.open();\n    flangeFold.add(config, 'flangeLogSize', 0, 10.0, 0.1).name('size = 2**');\n    flangeFold.add(config, 'highlightFlange');\n    flangeFold.add(config, 'animation', 0, 0.5);\n\n    gui.width = 280;\n    {\n      const folder = gui.addFolder('GPUSamplerDescriptor');\n      folder.open();\n\n      const kAddressModes = ['clamp-to-edge', 'repeat', 'mirror-repeat'];\n      folder.add(samplerDescriptor, 'addressModeU', kAddressModes);\n      folder.add(samplerDescriptor, 'addressModeV', kAddressModes);\n\n      const kFilterModes = ['nearest', 'linear'];\n      folder.add(samplerDescriptor, 'magFilter', kFilterModes);\n      folder.add(samplerDescriptor, 'minFilter', kFilterModes);\n      const kMipmapFilterModes = ['nearest', 'linear'] as const;\n      folder.add(samplerDescriptor, 'mipmapFilter', kMipmapFilterModes);\n\n      const ctlMin = folder.add(samplerDescriptor, 'lodMinClamp', 0, 4, 0.1);\n      const ctlMax = folder.add(samplerDescriptor, 'lodMaxClamp', 0, 4, 0.1);\n      ctlMin.onChange((value: number) => {\n        if (samplerDescriptor.lodMaxClamp < value) ctlMax.setValue(value);\n      });\n      ctlMax.onChange((value: number) => {\n        if (samplerDescriptor.lodMinClamp > value) ctlMin.setValue(value);\n      });\n\n      {\n        const folder2 = folder.addFolder(\n          'maxAnisotropy (set only if all \"linear\")'\n        );\n        folder2.open();\n        const kMaxAnisotropy = 16;\n        folder2.add(samplerDescriptor, 'maxAnisotropy', 1, kMaxAnisotropy, 1);\n      }\n    }\n  }\n\n  //\n  // Canvas setup\n  //\n\n  // Low-res, pixelated render target so it's easier to see fine details.\n  const kCanvasSize = 200;\n  const kViewportGridSize = 4;\n  const kViewportGridStride = Math.floor(kCanvasSize / kViewportGridSize);\n  const kViewportSize = kViewportGridStride - 2;\n\n  // The canvas buffer size is 200x200.\n  // Compute a canvas CSS size such that there's an integer number of device\n  // pixels per canvas pixel (\"integer\" or \"pixel-perfect\" scaling).\n  // Note the result may be 1 pixel off since ResizeObserver is not used.\n  const kCanvasLayoutCSSSize = 600; // set by template styles\n  const kCanvasLayoutDevicePixels = kCanvasLayoutCSSSize * devicePixelRatio;\n  const kScaleFactor = Math.floor(kCanvasLayoutDevicePixels / kCanvasSize);\n  const kCanvasDevicePixels = kScaleFactor * kCanvasSize;\n  const kCanvasCSSSize = kCanvasDevicePixels / devicePixelRatio;\n  console.log(kCanvasDevicePixels, kCanvasCSSSize);\n  canvas.style.imageRendering = 'pixelated';\n  canvas.width = canvas.height = kCanvasSize;\n  canvas.style.minWidth = canvas.style.maxWidth = kCanvasCSSSize + 'px';\n  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();\n\n  const context = canvas.getContext('webgpu') as GPUCanvasContext;\n  context.configure({\n    device,\n    format: presentationFormat,\n    alphaMode: 'premultiplied',\n  });\n\n  //\n  // Initialize test texture\n  //\n\n  // Set up a texture with 4 mip levels, each containing a differently-colored\n  // checkerboard with 1x1 pixels (so when rendered the checkerboards are\n  // different sizes). This is different from a normal mipmap where each level\n  // would look like a lower-resolution version of the previous one.\n  // Level 0 is 16x16 white/black\n  // Level 1 is 8x8 blue/black\n  // Level 2 is 4x4 yellow/black\n  // Level 3 is 2x2 pink/black\n  const kTextureMipLevels = 4;\n  const kTextureBaseSize = 16;\n  const checkerboard = device.createTexture({\n    format: 'rgba8unorm',\n    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING,\n    size: [kTextureBaseSize, kTextureBaseSize],\n    mipLevelCount: 4,\n  });\n  const checkerboardView = checkerboard.createView();\n\n  const kColorForLevel = [\n    [255, 255, 255, 255],\n    [30, 136, 229, 255], // blue\n    [255, 193, 7, 255], // yellow\n    [216, 27, 96, 255], // pink\n  ];\n  for (let mipLevel = 0; mipLevel < kTextureMipLevels; ++mipLevel) {\n    const size = 2 ** (kTextureMipLevels - mipLevel); // 16, 8, 4, 2\n    const data = new Uint8Array(size * size * 4);\n    for (let y = 0; y < size; ++y) {\n      for (let x = 0; x < size; ++x) {\n        data.set(\n          (x + y) % 2 ? kColorForLevel[mipLevel] : [0, 0, 0, 255],\n          (y * size + x) * 4\n        );\n      }\n    }\n    device.queue.writeTexture(\n      { texture: checkerboard, mipLevel },\n      data,\n      { bytesPerRow: size * 4 },\n      [size, size]\n    );\n  }\n\n  //\n  // \"Debug\" view of the actual texture contents\n  //\n\n  const showTextureModule = device.createShaderModule({\n    code: showTextureWGSL,\n  });\n  const showTexturePipeline = device.createRenderPipeline({\n    layout: 'auto',\n    vertex: { module: showTextureModule, entryPoint: 'vmain' },\n    fragment: {\n      module: showTextureModule,\n      entryPoint: 'fmain',\n      targets: [{ format: presentationFormat }],\n    },\n    primitive: { topology: 'triangle-list' },\n  });\n\n  const showTextureBG = device.createBindGroup({\n    layout: showTexturePipeline.getBindGroupLayout(0),\n    entries: [{ binding: 0, resource: checkerboardView }],\n  });\n\n  //\n  // Pipeline for drawing the test squares\n  //\n\n  const texturedSquareModule = device.createShaderModule({\n    code: texturedSquareWGSL,\n  });\n\n  const texturedSquarePipeline = device.createRenderPipeline({\n    layout: 'auto',\n    vertex: {\n      module: texturedSquareModule,\n      entryPoint: 'vmain',\n      constants: { kTextureBaseSize, kViewportSize },\n    },\n    fragment: {\n      module: texturedSquareModule,\n      entryPoint: 'fmain',\n      targets: [{ format: presentationFormat }],\n    },\n    primitive: { topology: 'triangle-list' },\n  });\n  const texturedSquareBGL = texturedSquarePipeline.getBindGroupLayout(0);\n\n  const bufConfig = device.createBuffer({\n    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,\n    size: 128,\n  });\n  // View-projection matrix set up so it doesn't transform anything at z=0.\n  const kCameraDist = 3;\n  const viewProj = mat4.translate(\n    mat4.perspective(2 * Math.atan(1 / kCameraDist), 1, 0.1, 100),\n    [0, 0, -kCameraDist]\n  );\n  device.queue.writeBuffer(bufConfig, 0, viewProj);\n\n  const bufMatrices = device.createBuffer({\n    usage: GPUBufferUsage.STORAGE,\n    size: kMatrices.byteLength,\n    mappedAtCreation: true,\n  });\n  new Float32Array(bufMatrices.getMappedRange()).set(kMatrices);\n  bufMatrices.unmap();\n\n  function frame() {\n    // Sample is no longer the active page.\n    if (!pageState.active) return;\n\n    updateConfigBuffer();\n\n    const sampler = device.createSampler({\n      ...samplerDescriptor,\n      maxAnisotropy:\n        samplerDescriptor.minFilter === 'linear' &&\n        samplerDescriptor.magFilter === 'linear' &&\n        samplerDescriptor.mipmapFilter === 'linear'\n          ? samplerDescriptor.maxAnisotropy\n          : 1,\n    });\n\n    const bindGroup = device.createBindGroup({\n      layout: texturedSquareBGL,\n      entries: [\n        { binding: 0, resource: { buffer: bufConfig } },\n        { binding: 1, resource: { buffer: bufMatrices } },\n        { binding: 2, resource: sampler },\n        { binding: 3, resource: checkerboardView },\n      ],\n    });\n\n    const textureView = context.getCurrentTexture().createView();\n\n    const commandEncoder = device.createCommandEncoder();\n\n    const renderPassDescriptor: GPURenderPassDescriptor = {\n      colorAttachments: [\n        {\n          view: textureView,\n          clearValue: { r: 0.2, g: 0.2, b: 0.2, a: 1.0 },\n          loadOp: 'clear',\n          storeOp: 'store',\n        },\n      ],\n    };\n\n    const pass = commandEncoder.beginRenderPass(renderPassDescriptor);\n    // Draw test squares\n    pass.setPipeline(texturedSquarePipeline);\n    pass.setBindGroup(0, bindGroup);\n    for (let i = 0; i < kViewportGridSize ** 2 - 1; ++i) {\n      const vpX = kViewportGridStride * (i % kViewportGridSize) + 1;\n      const vpY = kViewportGridStride * Math.floor(i / kViewportGridSize) + 1;\n      pass.setViewport(vpX, vpY, kViewportSize, kViewportSize, 0, 1);\n      pass.draw(6, 1, 0, i);\n    }\n    // Show texture contents\n    pass.setPipeline(showTexturePipeline);\n    pass.setBindGroup(0, showTextureBG);\n    const kLastViewport = (kViewportGridSize - 1) * kViewportGridStride + 1;\n    pass.setViewport(kLastViewport, kLastViewport, 32, 32, 0, 1);\n    pass.draw(6, 1, 0, 0);\n    pass.setViewport(kLastViewport + 32, kLastViewport, 16, 16, 0, 1);\n    pass.draw(6, 1, 0, 1);\n    pass.setViewport(kLastViewport + 32, kLastViewport + 16, 8, 8, 0, 1);\n    pass.draw(6, 1, 0, 2);\n    pass.setViewport(kLastViewport + 32, kLastViewport + 24, 4, 4, 0, 1);\n    pass.draw(6, 1, 0, 3);\n    pass.end();\n\n    device.queue.submit([commandEncoder.finish()]);\n    requestAnimationFrame(frame);\n  }\n\n  requestAnimationFrame(frame);\n};\n\nexport default () =>\n  makeSample({\n    name: 'Sampler Parameters',\n    description:\n      'Visualizes what all the sampler parameters do. Shows a textured plane at various scales (rotated, head-on, in perspective, and in vanishing perspective). The bottom-right view shows the raw contents of the 4 mipmap levels of the test texture (16x16, 8x8, 4x4, and 2x2).',\n    gui: true,\n    init,\n    sources: [\n      {\n        name: __filename.substring(__dirname.length + 1),\n        contents: __SOURCE__,\n      },\n      {\n        name: './texturedSquare.wgsl',\n        contents: texturedSquareWGSL,\n        editable: true,\n      },\n      {\n        name: './showTexture.wgsl',\n        contents: showTextureWGSL,\n        editable: true,\n      },\n    ],\n    filename: __filename,\n  });\n"},{name:"./texturedSquare.wgsl",contents:i,editable:!0},{name:"./showTexture.wgsl",contents:o,editable:!0}],filename:s})},9147:function(e){e.exports={canvasContainer:"SampleLayout_canvasContainer__zRR_l",sourceFileNav:"SampleLayout_sourceFileNav__ml48P",sourceFileContainer:"SampleLayout_sourceFileContainer__3s84x"}}}]);