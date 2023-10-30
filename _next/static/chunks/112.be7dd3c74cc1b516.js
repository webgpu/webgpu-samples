(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[112],{5671:function(e,n,t){"use strict";t.d(n,{Tl:function(){return c},hu:function(){return p}});var r=t(5893),i=t(9008),o=t.n(i),a=t(1163),s=t(7294),l=t(9147),u=t.n(l);t(7319);let d=e=>{let n=(0,s.useRef)(null),i=(0,s.useMemo)(()=>e.sources.map(e=>{let{name:n,contents:i}=e;return{name:n,...function(e){let n;let i=null;{i=document.createElement("div");let o=t(4631);n=o(i,{lineNumbers:!0,lineWrapping:!0,theme:"monokai",readOnly:!0})}return{Container:function(t){return(0,r.jsx)("div",{...t,children:(0,r.jsx)("div",{ref(t){i&&t&&(t.appendChild(i),n.setOption("value",e))}})})}}}(i)}}),e.sources),l=(0,s.useRef)(null),d=(0,s.useMemo)(()=>{if(e.gui){let n=t(4376);return new n.GUI({autoPlace:!1})}},[]),c=(0,s.useRef)(null),p=(0,s.useMemo)(()=>{if(e.stats){let n=t(2792);return new n}},[]),m=(0,a.useRouter)(),h=m.asPath.match(/#([a-zA-Z0-9\.\/]+)/),[f,g]=(0,s.useState)(null),[E,v]=(0,s.useState)(null);return(0,s.useEffect)(()=>{if(h?v(h[1]):v(i[0].name),d&&l.current)for(l.current.appendChild(d.domElement);d.__controllers.length>0;)d.__controllers[0].remove();p&&c.current&&(p.dom.style.position="absolute",p.showPanel(1),c.current.appendChild(p.dom));let t={active:!0},r=()=>{t.active=!1};try{let o=n.current;if(!o)throw Error("The canvas is not available");let a=e.init({canvas:o,pageState:t,gui:d,stats:p});a instanceof Promise&&a.catch(e=>{console.error(e),g(e)})}catch(s){console.error(s),g(s)}return r},[]),(0,r.jsxs)("main",{children:[(0,r.jsxs)(o(),{children:[(0,r.jsx)("style",{dangerouslySetInnerHTML:{__html:"\n            .CodeMirror {\n              height: auto !important;\n              margin: 1em 0;\n            }\n\n            .CodeMirror-scroll {\n              height: auto !important;\n              overflow: visible !important;\n            }\n          "}}),(0,r.jsx)("title",{children:"".concat(e.name," - WebGPU Samples")}),(0,r.jsx)("meta",{name:"description",content:e.description}),(0,r.jsx)("meta",{httpEquiv:"origin-trial",content:e.originTrial})]}),(0,r.jsxs)("div",{children:[(0,r.jsx)("h1",{children:e.name}),(0,r.jsx)("a",{target:"_blank",rel:"noreferrer",href:"https://github.com/".concat("webgpu/webgpu-samples","/tree/main/").concat(e.filename),children:"See it on Github!"}),(0,r.jsx)("p",{children:e.description}),f?(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)("p",{children:"Something went wrong. Do your browser and device support WebGPU?"}),(0,r.jsx)("p",{children:"".concat(f)})]}):null]}),(0,r.jsxs)("div",{className:u().canvasContainer,children:[(0,r.jsx)("div",{style:{position:"absolute",left:10},ref:c}),(0,r.jsx)("div",{style:{position:"absolute",right:10},ref:l}),(0,r.jsx)("canvas",{ref:n})]}),(0,r.jsxs)("div",{children:[(0,r.jsx)("nav",{className:u().sourceFileNav,children:(0,r.jsx)("ul",{children:i.map((e,n)=>(0,r.jsx)("li",{children:(0,r.jsx)("a",{href:"#".concat(e.name),"data-active":E==e.name,onClick(){v(e.name)},children:e.name})},n))})}),i.map((e,n)=>(0,r.jsx)(e.Container,{className:u().sourceFileContainer,"data-active":E==e.name},n))]})]})},c=e=>(0,r.jsx)(d,{...e});function p(e,n){if(!e)throw Error(n)}},8112:function(e,n,t){"use strict";let r;t.r(n),t.d(n,{default:function(){return g}});var i,o,a=t(5671),s=t(134);let l=(e,n,t,r,i,o,a)=>{let s=[];for(let l=0;l<e.length;l++)s.push({binding:e[l],visibility:n[l%n.length],[t[l]]:r[l]});let u=a.createBindGroupLayout({label:"".concat(o,".bindGroupLayout"),entries:s}),d=[];for(let c=0;c<i.length;c++){let p=[];for(let m=0;m<i[0].length;m++)p.push({binding:m,resource:i[c][m]});let h=a.createBindGroup({label:"".concat(o,".bindGroup").concat(c),layout:u,entries:p});d.push(h)}return{bindGroups:d,bindGroupLayout:u}},u=async e=>{let n=async n=>{let{canvas:t,pageState:r,gui:i,stats:o}=n,a=await navigator.gpu.requestAdapter(),s=await a.requestDevice();if(!r.active)return;let l=t.getContext("webgpu"),u=window.devicePixelRatio;t.width=t.clientWidth*u,t.height=t.clientHeight*u;let d=navigator.gpu.getPreferredCanvasFormat();l.configure({device:s,format:d,alphaMode:"premultiplied"}),e({canvas:t,pageState:r,gui:i,device:s,context:l,presentationFormat:d,stats:o})};return n};class d{executeRun(e,n,t,r){let i=e.beginRenderPass(n);i.setPipeline(t);for(let o=0;o<r.length;o++)i.setBindGroup(o,r[o]);i.draw(6,1,0,0),i.end()}setUniformArguments(e,n,t,r){for(let i=0;i<r.length;i++)e.queue.writeBuffer(n,4*i,new Float32Array([t[r[i]]]))}create2DRenderPipeline(e,n,t,r,i){return e.createRenderPipeline({label:"".concat(n,".pipeline"),layout:e.createPipelineLayout({bindGroupLayouts:t}),vertex:{module:e.createShaderModule({code:s.Z}),entryPoint:"vert_main"},fragment:{module:e.createShaderModule({code:r}),entryPoint:"frag_main",targets:[{format:i}]},primitive:{topology:"triangle-list",cullMode:"none"}})}}var c="struct Uniforms {\n  width: f32,\n  height: f32,\n}\n\nstruct VertexOutput {\n  @builtin(position) Position: vec4<f32>,\n  @location(0) fragUV: vec2<f32>\n}\n\n@group(0) @binding(0) var<uniform> uniforms: Uniforms;\n@group(1) @binding(0) var<storage, read> data: array<u32>;\n\n@fragment\nfn frag_main(input: VertexOutput) -> @location(0) vec4<f32> {\n  var uv: vec2<f32> = vec2<f32>(\n    input.fragUV.x * uniforms.width,\n    input.fragUV.y * uniforms.height\n  );\n\n  var pixel: vec2<u32> = vec2<u32>(\n    u32(floor(uv.x)),\n    u32(floor(uv.y)),\n  );\n  \n  var elementIndex = u32(uniforms.width) * pixel.y + pixel.x;\n  var colorChanger = data[elementIndex];\n\n  var subtracter = f32(colorChanger) / (uniforms.width * uniforms.height);\n\n  var color: vec3<f32> = vec3f(\n    1.0 - subtracter\n  );\n\n  return vec4<f32>(color.rgb, 1.0);\n}\n";class p extends d{startRun(e,n){this.setArguments(n),super.executeRun(e,this.renderPassDescriptor,this.pipeline,[this.currentBindGroup,this.computeBGDescript.bindGroups[0]])}constructor(e,n,t,r,i,o){super(),this.renderPassDescriptor=t,this.computeBGDescript=i;let a=e.createBuffer({size:2*Float32Array.BYTES_PER_ELEMENT,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),s=l([0],[GPUShaderStage.FRAGMENT],["buffer"],[{type:"uniform"}],[[{buffer:a}]],o,e);this.currentBindGroup=s.bindGroups[0],this.currentBindGroupName=r[0],this.bindGroupMap={},s.bindGroups.forEach((e,n)=>{this.bindGroupMap[r[n]]=e}),this.pipeline=super.create2DRenderPipeline(e,o,[s.bindGroupLayout,this.computeBGDescript.bindGroupLayout],c,n),this.switchBindGroup=e=>{this.currentBindGroup=this.bindGroupMap[e],this.currentBindGroupName=e},this.setArguments=n=>{super.setUniformArguments(e,a,n,["width","height"])}}}p.sourceInfo={name:"src/sample/bitonicSort/bitonicDisplay.ts".substring(23),contents:"import {\n  BindGroupsObjectsAndLayout,\n  createBindGroupDescriptor,\n  Base2DRendererClass,\n} from './utils';\n\nimport bitonicDisplay from './bitonicDisplay.frag.wgsl';\n\ninterface BitonicDisplayRenderArgs {\n  width: number;\n  height: number;\n}\n\nexport default class BitonicDisplayRenderer extends Base2DRendererClass {\n  static sourceInfo = {\n    name: __filename.substring(__dirname.length + 1),\n    contents: __SOURCE__,\n  };\n\n  switchBindGroup: (name: string) => void;\n  setArguments: (args: BitonicDisplayRenderArgs) => void;\n  computeBGDescript: BindGroupsObjectsAndLayout;\n\n  constructor(\n    device: GPUDevice,\n    presentationFormat: GPUTextureFormat,\n    renderPassDescriptor: GPURenderPassDescriptor,\n    bindGroupNames: string[],\n    computeBGDescript: BindGroupsObjectsAndLayout,\n    label: string\n  ) {\n    super();\n    this.renderPassDescriptor = renderPassDescriptor;\n    this.computeBGDescript = computeBGDescript;\n\n    const uniformBuffer = device.createBuffer({\n      size: Float32Array.BYTES_PER_ELEMENT * 2,\n      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,\n    });\n\n    const bgDescript = createBindGroupDescriptor(\n      [0],\n      [GPUShaderStage.FRAGMENT],\n      ['buffer'],\n      [{ type: 'uniform' }],\n      [[{ buffer: uniformBuffer }]],\n      label,\n      device\n    );\n\n    this.currentBindGroup = bgDescript.bindGroups[0];\n    this.currentBindGroupName = bindGroupNames[0];\n\n    this.bindGroupMap = {};\n\n    bgDescript.bindGroups.forEach((bg, idx) => {\n      this.bindGroupMap[bindGroupNames[idx]] = bg;\n    });\n\n    this.pipeline = super.create2DRenderPipeline(\n      device,\n      label,\n      [bgDescript.bindGroupLayout, this.computeBGDescript.bindGroupLayout],\n      bitonicDisplay,\n      presentationFormat\n    );\n\n    this.switchBindGroup = (name: string) => {\n      this.currentBindGroup = this.bindGroupMap[name];\n      this.currentBindGroupName = name;\n    };\n\n    this.setArguments = (args: BitonicDisplayRenderArgs) => {\n      super.setUniformArguments(device, uniformBuffer, args, [\n        'width',\n        'height',\n      ]);\n    };\n  }\n\n  startRun(commandEncoder: GPUCommandEncoder, args: BitonicDisplayRenderArgs) {\n    this.setArguments(args);\n    super.executeRun(commandEncoder, this.renderPassDescriptor, this.pipeline, [\n      this.currentBindGroup,\n      this.computeBGDescript.bindGroups[0],\n    ]);\n  }\n}\n"};let m=e=>((e%2!=0||e>256)&&(e=256),"\n\nstruct Uniforms {\n  width: f32,\n  height: f32,\n  algo: u32,\n  blockHeight: u32,\n}\n\n// Create local workgroup data that can contain all elements\n\nvar<workgroup> local_data: array<u32, ".concat(2*e,">;\n\n//Compare and swap values in local_data\nfn compare_and_swap(idx_before: u32, idx_after: u32) {\n  //idx_before should always be < idx_after\n  if (local_data[idx_after] < local_data[idx_before]) {\n    var temp: u32 = local_data[idx_before];\n    local_data[idx_before] = local_data[idx_after];\n    local_data[idx_after] = temp;\n  }\n  return;\n}\n\n// thread_id goes from 0 to threadsPerWorkgroup\nfn prepare_flip(thread_id: u32, block_height: u32) {\n  let q: u32 = ((2 * thread_id) / block_height) * block_height;\n  let half_height = block_height / 2;\n  var idx: vec2<u32> = vec2<u32>(\n    thread_id % half_height, block_height - (thread_id % half_height) - 1,\n  );\n  idx.x += q;\n  idx.y += q;\n  compare_and_swap(idx.x, idx.y);\n}\n\nfn prepare_disperse(thread_id: u32, block_height: u32) {\n  var q: u32 = ((2 * thread_id) / block_height) * block_height;\n  let half_height = block_height / 2;\n	var idx: vec2<u32> = vec2<u32>(\n    thread_id % half_height, (thread_id % half_height) + half_height\n  );\n  idx.x += q;\n  idx.y += q;\n	compare_and_swap(idx.x, idx.y);\n}\n\n@group(0) @binding(0) var<storage, read> input_data: array<u32>;\n@group(0) @binding(1) var<storage, read_write> output_data: array<u32>;\n@group(0) @binding(2) var<uniform> uniforms: Uniforms;\n\n// Our compute shader will execute specified # of threads or elements / 2 threads\n@compute @workgroup_size(").concat(e,", 1, 1)\nfn computeMain(\n  @builtin(global_invocation_id) global_id: vec3<u32>,\n  @builtin(local_invocation_id) local_id: vec3<u32>,\n) {\n  //Each thread will populate the workgroup data... (1 thread for every 2 elements)\n  local_data[local_id.x * 2] = input_data[local_id.x * 2];\n  local_data[local_id.x * 2 + 1] = input_data[local_id.x * 2 + 1];\n\n  //...and wait for each other to finish their own bit of data population.\n  workgroupBarrier();\n\n  var num_elements = uniforms.width * uniforms.height;\n\n  switch uniforms.algo {\n    case 1: { //Local Flip\n      prepare_flip(local_id.x, uniforms.blockHeight);\n    }\n    case 2: { //Local Disperse\n      prepare_disperse(local_id.x, uniforms.blockHeight);\n    }\n    default: { \n      \n    }\n  }\n\n  //Ensure that all threads have swapped their own regions of data\n  workgroupBarrier();\n\n  //Repopulate global data with local data\n  output_data[local_id.x * 2] = local_data[local_id.x * 2];\n  output_data[local_id.x * 2 + 1] = local_data[local_id.x * 2 + 1];\n\n}"));var h="src/sample/bitonicSort/main.ts";(i=o||(o={}))[i.NONE=0]="NONE",i[i.FLIP_LOCAL=1]="FLIP_LOCAL",i[i.DISPERSE_LOCAL=2]="DISPERSE_LOCAL",i[i.FLIP_DISPERSE_LOCAL=3]="FLIP_DISPERSE_LOCAL",u(async e=>{let{pageState:n,device:t,gui:r,presentationFormat:i,context:a,canvas:s}=e,u=t.limits.maxComputeWorkgroupSizeX,d=[];for(let c=2*u;c>=4;c/=2)d.push(c);let h={"Total Elements":16,"Grid Width":4,"Grid Height":4,"Total Threads":8,hoveredElement:0,swappedElement:1,"Prev Step":"NONE","Next Step":"FLIP_LOCAL","Prev Swap Span":0,"Next Swap Span":2,workLoads:1,executeStep:!1,"Randomize Values"(){},"Execute Sort Step"(){},"Log Elements"(){},"Complete Sort"(){},sortSpeed:200},f=new Uint32Array(Array.from({length:h["Total Elements"]},(e,n)=>n)),g=512*Float32Array.BYTES_PER_ELEMENT,E=t.createBuffer({size:g,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),v=t.createBuffer({size:g,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),S=t.createBuffer({size:g,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST}),x=t.createBuffer({size:4*Float32Array.BYTES_PER_ELEMENT,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),b=l([0,1,2],[GPUShaderStage.COMPUTE|GPUShaderStage.FRAGMENT,GPUShaderStage.COMPUTE,GPUShaderStage.COMPUTE],["buffer","buffer","buffer"],[{type:"read-only-storage"},{type:"storage"},{type:"uniform"}],[[{buffer:E},{buffer:v},{buffer:x}]],"NaiveBitonicSort",t),y=t.createComputePipeline({layout:t.createPipelineLayout({bindGroupLayouts:[b.bindGroupLayout]}),compute:{module:t.createShaderModule({code:m(h["Total Threads"])}),entryPoint:"computeMain"}}),_={colorAttachments:[{view:void 0,clearValue:{r:.1,g:.4,b:.5,a:1},loadOp:"clear",storeOp:"store"}]},w=new p(t,i,_,["default"],b,"BitonicDisplay"),P=()=>{U.setValue(h["Total Elements"]/2);let e=Math.sqrt(h["Total Elements"])%2==0?Math.floor(Math.sqrt(h["Total Elements"])):Math.floor(Math.sqrt(h["Total Elements"]/2)),n=h["Total Elements"]/e;V.setValue(e),z.setValue(n),F.setValue("NONE"),k.setValue("FLIP_LOCAL"),M.setValue(0),H.setValue(2),q=2},B=()=>{let e=f.length;for(;0!==e;){let n=Math.floor(Math.random()*e);e-=1,[f[e],f[n]]=[f[n],f[e]]}},G=()=>{f=new Uint32Array(Array.from({length:h["Total Elements"]},(e,n)=>n)),P(),y=t.createComputePipeline({layout:t.createPipelineLayout({bindGroupLayouts:[b.bindGroupLayout]}),compute:{module:t.createShaderModule({code:m(h["Total Elements"]/2)}),entryPoint:"computeMain"}}),B(),q=2};B();let C=()=>{let e;switch(h["Next Step"]){case"FLIP_LOCAL":{let n=h["Next Swap Span"],t=Math.floor(h.hoveredElement/n)+1,r=h.hoveredElement%n;e=n*t-r-1,R.setValue(e)}break;case"DISPERSE_LOCAL":{let i=h["Next Swap Span"],o=i/2;e=h.hoveredElement%i<o?h.hoveredElement+o:h.hoveredElement-o,R.setValue(e)}break;case"NONE":e=h.hoveredElement,R.setValue(e);default:e=h.hoveredElement,R.setValue(e)}},I=null,L=()=>{null!==I&&(clearInterval(I),I=null)},T=()=>{I=setInterval(()=>{"NONE"===h["Next Step"]&&(clearInterval(I),I=null),h.executeStep=!0,C()},h.sortSpeed)};r.add(h,"Total Elements",d).onChange(()=>{L(),G()});let U=r.add(h,"Total Threads"),D=r.addFolder("Sort Controls");D.add(h,"Execute Sort Step").onChange(()=>{L(),h.executeStep=!0}),D.add(h,"Randomize Values").onChange(()=>{L(),B(),P()}),D.add(h,"Log Elements").onChange(()=>console.log(f)),D.add(h,"Complete Sort").onChange(T),D.open();let A=r.addFolder("Hover Information"),N=A.add(h,"hoveredElement").onChange(C),R=A.add(h,"swappedElement"),O=r.addFolder("Execution Information"),F=O.add(h,"Prev Step"),k=O.add(h,"Next Step"),M=O.add(h,"Prev Swap Span"),H=O.add(h,"Next Swap Span"),V=O.add(h,"Grid Width"),z=O.add(h,"Grid Height"),W=document.getElementsByClassName("cr function");for(let j=0;j<W.length;j++)W[j].children[0].style.display="flex",W[j].children[0].style.justifyContent="center",W[j].children[0].children[1].style.position="absolute";s.addEventListener("mousemove",e=>{let n=s.getBoundingClientRect().width,t=s.getBoundingClientRect().height,r=[n/h["Grid Width"],t/h["Grid Height"]],i=Math.floor(e.offsetX/r[0]),o=h["Grid Height"]-1-Math.floor(e.offsetY/r[1]);N.setValue(o*h["Grid Width"]+i),h.hoveredElement=o*h["Grid Width"]+i}),F.domElement.style.pointerEvents="none",M.domElement.style.pointerEvents="none",k.domElement.style.pointerEvents="none",H.domElement.style.pointerEvents="none",U.domElement.style.pointerEvents="none",V.domElement.style.pointerEvents="none",z.domElement.style.pointerEvents="none";let q=2;async function Y(){if(!n.active)return;t.queue.writeBuffer(E,0,f.buffer,f.byteOffset,f.byteLength);let e=new Float32Array([h["Grid Width"],h["Grid Height"]]),r=new Uint32Array([o[h["Next Step"]],h["Next Swap Span"]]);t.queue.writeBuffer(x,0,e.buffer,e.byteOffset,e.byteLength),t.queue.writeBuffer(x,8,r),_.colorAttachments[0].view=a.getCurrentTexture().createView();let i=t.createCommandEncoder();if(w.startRun(i,{width:h["Grid Width"],height:h["Grid Height"]}),h.executeStep&&q!==2*h["Total Elements"]){let s=i.beginComputePass();s.setPipeline(y),s.setBindGroup(0,b.bindGroups[0]),s.dispatchWorkgroups(1),s.end(),F.setValue(h["Next Step"]),M.setValue(h["Next Swap Span"]),H.setValue(h["Next Swap Span"]/2),1===h["Next Swap Span"]?(q*=2,k.setValue(q===2*h["Total Elements"]?"NONE":"FLIP_LOCAL"),H.setValue(q===2*h["Total Elements"]?0:q)):k.setValue("DISPERSE_LOCAL"),i.copyBufferToBuffer(v,0,S,0,g)}if(t.queue.submit([i.finish()]),h.executeStep){await S.mapAsync(GPUMapMode.READ,0,g);let l=S.getMappedRange(0,g),u=l.slice(0,Uint32Array.BYTES_PER_ELEMENT*h["Total Elements"]),d=new Uint32Array(u);S.unmap(),f=d,C()}h.executeStep=!1,requestAnimationFrame(Y)}requestAnimationFrame(Y)}).then(e=>r=e);let f=()=>(0,a.Tl)({name:"Bitonic Sort",description:"A naive bitonic sort algorithm executed on the GPU, based on tgfrerer's implementation at poniesandlight.co.uk/reflect/bitonic_merge_sort/. Each invocation of the bitonic sort shader dispatches a workgroup containing elements/2 threads. The GUI's Execution Information folder contains information about the sort's current state. The visualizer displays the sort's results as colored cells sorted from brightest to darkest.",init:r,gui:!0,sources:[{name:h.substring(23),contents:"import { makeSample, SampleInit } from '../../components/SampleLayout';\nimport { SampleInitFactoryWebGPU } from './utils';\nimport { createBindGroupDescriptor } from './utils';\nimport BitonicDisplayRenderer from './bitonicDisplay';\nimport bitonicDisplay from './bitonicDisplay.frag.wgsl';\nimport { NaiveBitonicCompute } from './computeShader';\nimport fullscreenTexturedQuad from '../../shaders/fullscreenTexturedQuad.wgsl';\n\n// Type of step that will be executed in our shader\nenum StepEnum {\n  NONE = 0,\n  FLIP_LOCAL = 1,\n  DISPERSE_LOCAL = 2,\n  FLIP_DISPERSE_LOCAL = 3,\n}\n\n// String access to StepEnum\ntype StepType =\n  | 'NONE'\n  | 'FLIP_LOCAL'\n  | 'DISPERSE_LOCAL'\n  | 'FLIP_DISPERSE_LOCAL';\n\n// Gui settings object\ninterface SettingsInterface {\n  'Total Elements': number;\n  'Grid Width': number;\n  'Grid Height': number;\n  'Total Threads': number;\n  hoveredElement: number;\n  swappedElement: number;\n  'Prev Step': StepType;\n  'Next Step': StepType;\n  'Prev Swap Span': number;\n  'Next Swap Span': number;\n  workLoads: number;\n  executeStep: boolean;\n  'Randomize Values': () => void;\n  'Execute Sort Step': () => void;\n  'Log Elements': () => void;\n  'Complete Sort': () => void;\n  sortSpeed: number;\n}\n\nlet init: SampleInit;\nSampleInitFactoryWebGPU(\n  async ({ pageState, device, gui, presentationFormat, context, canvas }) => {\n    const maxWorkgroupsX = device.limits.maxComputeWorkgroupSizeX;\n\n    const totalElementLengths = [];\n    for (let i = maxWorkgroupsX * 2; i >= 4; i /= 2) {\n      totalElementLengths.push(i);\n    }\n\n    const settings: SettingsInterface = {\n      // number of cellElements. Must equal gridWidth * gridHeight and 'Total Threads' * 2\n      'Total Elements': 16,\n      // width of screen in cells.\n      'Grid Width': 4,\n      // height of screen in cells\n      'Grid Height': 4,\n      // number of threads to execute in a workgroup ('Total Threads', 1, 1)\n      'Total Threads': 16 / 2,\n      // currently highlighted element\n      hoveredElement: 0,\n      // element the hoveredElement just swapped with,\n      swappedElement: 1,\n      // Previously executed step\n      'Prev Step': 'NONE',\n      // Next step to execute\n      'Next Step': 'FLIP_LOCAL',\n      // Max thread span of previous block\n      'Prev Swap Span': 0,\n      // Max thread span of next block\n      'Next Swap Span': 2,\n      // workloads to dispatch per frame,\n      workLoads: 1,\n      // Whether we will dispatch a workload this frame\n      executeStep: false,\n      'Randomize Values': () => {\n        return;\n      },\n      'Execute Sort Step': () => {\n        return;\n      },\n      'Log Elements': () => {\n        return;\n      },\n      'Complete Sort': () => {\n        return;\n      },\n      sortSpeed: 200,\n    };\n\n    // Initialize initial elements array\n    let elements = new Uint32Array(\n      Array.from({ length: settings['Total Elements'] }, (_, i) => i)\n    );\n\n    // Initialize elementsBuffer and elementsStagingBuffer\n    const elementsBufferSize = Float32Array.BYTES_PER_ELEMENT * 512;\n    // Initialize input, output, staging buffers\n    const elementsInputBuffer = device.createBuffer({\n      size: elementsBufferSize,\n      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,\n    });\n    const elementsOutputBuffer = device.createBuffer({\n      size: elementsBufferSize,\n      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,\n    });\n    const elementsStagingBuffer = device.createBuffer({\n      size: elementsBufferSize,\n      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,\n    });\n\n    // Create uniform buffer for compute shader\n    const computeUniformsBuffer = device.createBuffer({\n      // width, height, blockHeight, algo\n      size: Float32Array.BYTES_PER_ELEMENT * 4,\n      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,\n    });\n\n    const computeBGDescript = createBindGroupDescriptor(\n      [0, 1, 2],\n      [\n        GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,\n        GPUShaderStage.COMPUTE,\n        GPUShaderStage.COMPUTE,\n      ],\n      ['buffer', 'buffer', 'buffer'],\n      [{ type: 'read-only-storage' }, { type: 'storage' }, { type: 'uniform' }],\n      [\n        [\n          { buffer: elementsInputBuffer },\n          { buffer: elementsOutputBuffer },\n          { buffer: computeUniformsBuffer },\n        ],\n      ],\n      'NaiveBitonicSort',\n      device\n    );\n\n    let computePipeline = device.createComputePipeline({\n      layout: device.createPipelineLayout({\n        bindGroupLayouts: [computeBGDescript.bindGroupLayout],\n      }),\n      compute: {\n        module: device.createShaderModule({\n          code: NaiveBitonicCompute(settings['Total Threads']),\n        }),\n        entryPoint: 'computeMain',\n      },\n    });\n\n    // Create bitonic debug renderer\n    const renderPassDescriptor: GPURenderPassDescriptor = {\n      colorAttachments: [\n        {\n          view: undefined, // Assigned later\n\n          clearValue: { r: 0.1, g: 0.4, b: 0.5, a: 1.0 },\n          loadOp: 'clear',\n          storeOp: 'store',\n        },\n      ],\n    };\n\n    const bitonicDisplayRenderer = new BitonicDisplayRenderer(\n      device,\n      presentationFormat,\n      renderPassDescriptor,\n      ['default'],\n      computeBGDescript,\n      'BitonicDisplay'\n    );\n\n    const resetExecutionInformation = () => {\n      totalThreadsCell.setValue(settings['Total Elements'] / 2);\n\n      // Get new width and height of screen display in cells\n      const newCellWidth =\n        Math.sqrt(settings['Total Elements']) % 2 === 0\n          ? Math.floor(Math.sqrt(settings['Total Elements']))\n          : Math.floor(Math.sqrt(settings['Total Elements'] / 2));\n      const newCellHeight = settings['Total Elements'] / newCellWidth;\n      gridWidthCell.setValue(newCellWidth);\n      gridHeightCell.setValue(newCellHeight);\n\n      // Set prevStep to None (restart) and next step to FLIP\n      prevStepCell.setValue('NONE');\n      nextStepCell.setValue('FLIP_LOCAL');\n\n      // Reset block heights\n      prevBlockHeightCell.setValue(0);\n      nextBlockHeightCell.setValue(2);\n      highestBlockHeight = 2;\n    };\n\n    const randomizeElementArray = () => {\n      let currentIndex = elements.length;\n      // While there are elements to shuffle\n      while (currentIndex !== 0) {\n        // Pick a remaining element\n        const randomIndex = Math.floor(Math.random() * currentIndex);\n        currentIndex -= 1;\n        [elements[currentIndex], elements[randomIndex]] = [\n          elements[randomIndex],\n          elements[currentIndex],\n        ];\n      }\n    };\n\n    const resizeElementArray = () => {\n      // Recreate elements array with new length\n      elements = new Uint32Array(\n        Array.from({ length: settings['Total Elements'] }, (_, i) => i)\n      );\n\n      resetExecutionInformation();\n\n      // Create new shader invocation with workgroupSize that reflects number of threads\n      computePipeline = device.createComputePipeline({\n        layout: device.createPipelineLayout({\n          bindGroupLayouts: [computeBGDescript.bindGroupLayout],\n        }),\n        compute: {\n          module: device.createShaderModule({\n            code: NaiveBitonicCompute(settings['Total Elements'] / 2),\n          }),\n          entryPoint: 'computeMain',\n        },\n      });\n      // Randomize array elements\n      randomizeElementArray();\n      highestBlockHeight = 2;\n    };\n\n    randomizeElementArray();\n\n    const setSwappedElement = () => {\n      let swappedIndex: number;\n      switch (settings['Next Step']) {\n        case 'FLIP_LOCAL':\n          {\n            const blockHeight = settings['Next Swap Span'];\n            const p2 = Math.floor(settings.hoveredElement / blockHeight) + 1;\n            const p3 = settings.hoveredElement % blockHeight;\n            swappedIndex = blockHeight * p2 - p3 - 1;\n            swappedElementCell.setValue(swappedIndex);\n          }\n          break;\n        case 'DISPERSE_LOCAL':\n          {\n            const blockHeight = settings['Next Swap Span'];\n            const halfHeight = blockHeight / 2;\n            swappedIndex =\n              settings.hoveredElement % blockHeight < halfHeight\n                ? settings.hoveredElement + halfHeight\n                : settings.hoveredElement - halfHeight;\n            swappedElementCell.setValue(swappedIndex);\n          }\n          break;\n        case 'NONE': {\n          swappedIndex = settings.hoveredElement;\n          swappedElementCell.setValue(swappedIndex);\n        }\n        default:\n          {\n            swappedIndex = settings.hoveredElement;\n            swappedElementCell.setValue(swappedIndex);\n          }\n          break;\n      }\n    };\n\n    let completeSortIntervalID: ReturnType<typeof setInterval> | null = null;\n    const endSortInterval = () => {\n      if (completeSortIntervalID !== null) {\n        clearInterval(completeSortIntervalID);\n        completeSortIntervalID = null;\n      }\n    };\n    const startSortInterval = () => {\n      completeSortIntervalID = setInterval(() => {\n        if (settings['Next Step'] === 'NONE') {\n          clearInterval(completeSortIntervalID);\n          completeSortIntervalID = null;\n        }\n        settings.executeStep = true;\n        setSwappedElement();\n      }, settings.sortSpeed);\n    };\n\n    // At top level, basic information about the number of elements sorted and the number of threads\n    // deployed per workgroup.\n    gui.add(settings, 'Total Elements', totalElementLengths).onChange(() => {\n      endSortInterval();\n      resizeElementArray();\n    });\n    const totalThreadsCell = gui.add(settings, 'Total Threads');\n\n    // Folder with functions that control the execution of the sort\n    const controlFolder = gui.addFolder('Sort Controls');\n    controlFolder.add(settings, 'Execute Sort Step').onChange(() => {\n      endSortInterval();\n      settings.executeStep = true;\n    });\n    controlFolder.add(settings, 'Randomize Values').onChange(() => {\n      endSortInterval();\n      randomizeElementArray();\n      resetExecutionInformation();\n    });\n    controlFolder\n      .add(settings, 'Log Elements')\n      .onChange(() => console.log(elements));\n    controlFolder.add(settings, 'Complete Sort').onChange(startSortInterval);\n    controlFolder.open();\n\n    // Folder with indexes of the hovered element\n    const hoverFolder = gui.addFolder('Hover Information');\n    const hoveredElementCell = hoverFolder\n      .add(settings, 'hoveredElement')\n      .onChange(setSwappedElement);\n    const swappedElementCell = hoverFolder.add(settings, 'swappedElement');\n\n    // Additional Information about the execution state of the sort\n    const executionInformationFolder = gui.addFolder('Execution Information');\n    const prevStepCell = executionInformationFolder.add(settings, 'Prev Step');\n    const nextStepCell = executionInformationFolder.add(settings, 'Next Step');\n    const prevBlockHeightCell = executionInformationFolder.add(\n      settings,\n      'Prev Swap Span'\n    );\n    const nextBlockHeightCell = executionInformationFolder.add(\n      settings,\n      'Next Swap Span'\n    );\n    const gridWidthCell = executionInformationFolder.add(\n      settings,\n      'Grid Width'\n    );\n    const gridHeightCell = executionInformationFolder.add(\n      settings,\n      'Grid Height'\n    );\n\n    // Adjust styles of Function List Elements within GUI\n    const liFunctionElements = document.getElementsByClassName('cr function');\n    for (let i = 0; i < liFunctionElements.length; i++) {\n      (liFunctionElements[i].children[0] as HTMLElement).style.display = 'flex';\n      (liFunctionElements[i].children[0] as HTMLElement).style.justifyContent =\n        'center';\n      (\n        liFunctionElements[i].children[0].children[1] as HTMLElement\n      ).style.position = 'absolute';\n    }\n\n    canvas.addEventListener('mousemove', (event) => {\n      const currWidth = canvas.getBoundingClientRect().width;\n      const currHeight = canvas.getBoundingClientRect().height;\n      const cellSize: [number, number] = [\n        currWidth / settings['Grid Width'],\n        currHeight / settings['Grid Height'],\n      ];\n      const xIndex = Math.floor(event.offsetX / cellSize[0]);\n      const yIndex =\n        settings['Grid Height'] - 1 - Math.floor(event.offsetY / cellSize[1]);\n      hoveredElementCell.setValue(yIndex * settings['Grid Width'] + xIndex);\n      settings.hoveredElement = yIndex * settings['Grid Width'] + xIndex;\n    });\n\n    // Deactivate interaction with select GUI elements\n    prevStepCell.domElement.style.pointerEvents = 'none';\n    prevBlockHeightCell.domElement.style.pointerEvents = 'none';\n    nextStepCell.domElement.style.pointerEvents = 'none';\n    nextBlockHeightCell.domElement.style.pointerEvents = 'none';\n    totalThreadsCell.domElement.style.pointerEvents = 'none';\n    gridWidthCell.domElement.style.pointerEvents = 'none';\n    gridHeightCell.domElement.style.pointerEvents = 'none';\n\n    let highestBlockHeight = 2;\n\n    async function frame() {\n      if (!pageState.active) return;\n\n      // Write elements buffer\n      device.queue.writeBuffer(\n        elementsInputBuffer,\n        0,\n        elements.buffer,\n        elements.byteOffset,\n        elements.byteLength\n      );\n\n      const dims = new Float32Array([\n        settings['Grid Width'],\n        settings['Grid Height'],\n      ]);\n      const stepDetails = new Uint32Array([\n        StepEnum[settings['Next Step']],\n        settings['Next Swap Span'],\n      ]);\n      device.queue.writeBuffer(\n        computeUniformsBuffer,\n        0,\n        dims.buffer,\n        dims.byteOffset,\n        dims.byteLength\n      );\n\n      device.queue.writeBuffer(computeUniformsBuffer, 8, stepDetails);\n\n      renderPassDescriptor.colorAttachments[0].view = context\n        .getCurrentTexture()\n        .createView();\n\n      const commandEncoder = device.createCommandEncoder();\n      bitonicDisplayRenderer.startRun(commandEncoder, {\n        width: settings['Grid Width'],\n        height: settings['Grid Height'],\n      });\n      if (\n        settings.executeStep &&\n        highestBlockHeight !== settings['Total Elements'] * 2\n      ) {\n        const computePassEncoder = commandEncoder.beginComputePass();\n        computePassEncoder.setPipeline(computePipeline);\n        computePassEncoder.setBindGroup(0, computeBGDescript.bindGroups[0]);\n        computePassEncoder.dispatchWorkgroups(1);\n        computePassEncoder.end();\n\n        prevStepCell.setValue(settings['Next Step']);\n        prevBlockHeightCell.setValue(settings['Next Swap Span']);\n        nextBlockHeightCell.setValue(settings['Next Swap Span'] / 2);\n        if (settings['Next Swap Span'] === 1) {\n          highestBlockHeight *= 2;\n          nextStepCell.setValue(\n            highestBlockHeight === settings['Total Elements'] * 2\n              ? 'NONE'\n              : 'FLIP_LOCAL'\n          );\n          nextBlockHeightCell.setValue(\n            highestBlockHeight === settings['Total Elements'] * 2\n              ? 0\n              : highestBlockHeight\n          );\n        } else {\n          nextStepCell.setValue('DISPERSE_LOCAL');\n        }\n        commandEncoder.copyBufferToBuffer(\n          elementsOutputBuffer,\n          0,\n          elementsStagingBuffer,\n          0,\n          elementsBufferSize\n        );\n      }\n      device.queue.submit([commandEncoder.finish()]);\n\n      if (settings.executeStep) {\n        // Copy GPU element data to CPU\n        await elementsStagingBuffer.mapAsync(\n          GPUMapMode.READ,\n          0,\n          elementsBufferSize\n        );\n        const copyElementsBuffer = elementsStagingBuffer.getMappedRange(\n          0,\n          elementsBufferSize\n        );\n        // Get correct range of data from CPU copy of GPU Data\n        const elementsData = copyElementsBuffer.slice(\n          0,\n          Uint32Array.BYTES_PER_ELEMENT * settings['Total Elements']\n        );\n        // Extract data\n        const elementsOutput = new Uint32Array(elementsData);\n        elementsStagingBuffer.unmap();\n        elements = elementsOutput;\n        setSwappedElement();\n      }\n      settings.executeStep = false;\n      requestAnimationFrame(frame);\n    }\n    requestAnimationFrame(frame);\n  }\n).then((resultInit) => (init = resultInit));\n\nconst bitonicSortExample: () => JSX.Element = () =>\n  makeSample({\n    name: 'Bitonic Sort',\n    description:\n      \"A naive bitonic sort algorithm executed on the GPU, based on tgfrerer's implementation at poniesandlight.co.uk/reflect/bitonic_merge_sort/. Each invocation of the bitonic sort shader dispatches a workgroup containing elements/2 threads. The GUI's Execution Information folder contains information about the sort's current state. The visualizer displays the sort's results as colored cells sorted from brightest to darkest.\",\n    init,\n    gui: true,\n    sources: [\n      {\n        name: __filename.substring(__dirname.length + 1),\n        contents: __SOURCE__,\n      },\n      BitonicDisplayRenderer.sourceInfo,\n      {\n        name: '../../../shaders/fullscreenTexturedQuad.vert.wgsl',\n        contents: fullscreenTexturedQuad,\n      },\n      {\n        name: './bitonicDisplay.frag.wgsl',\n        contents: bitonicDisplay,\n      },\n      {\n        name: './bitonicCompute.frag.wgsl',\n        contents: NaiveBitonicCompute(16),\n      },\n    ],\n    filename: __filename,\n  });\n\nexport default bitonicSortExample;\n"},p.sourceInfo,{name:"../../../shaders/fullscreenTexturedQuad.vert.wgsl",contents:s.Z},{name:"./bitonicDisplay.frag.wgsl",contents:c},{name:"./bitonicCompute.frag.wgsl",contents:m(16)}],filename:h});var g=f},9147:function(e){e.exports={canvasContainer:"SampleLayout_canvasContainer__zRR_l",sourceFileNav:"SampleLayout_sourceFileNav__ml48P",sourceFileContainer:"SampleLayout_sourceFileContainer__3s84x"}},134:function(e,n){"use strict";n.Z="@group(0) @binding(0) var mySampler : sampler;\n@group(0) @binding(1) var myTexture : texture_2d<f32>;\n\nstruct VertexOutput {\n  @builtin(position) Position : vec4<f32>,\n  @location(0) fragUV : vec2<f32>,\n}\n\n@vertex\nfn vert_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {\n  const pos = array(\n    vec2( 1.0,  1.0),\n    vec2( 1.0, -1.0),\n    vec2(-1.0, -1.0),\n    vec2( 1.0,  1.0),\n    vec2(-1.0, -1.0),\n    vec2(-1.0,  1.0),\n  );\n\n  const uv = array(\n    vec2(1.0, 0.0),\n    vec2(1.0, 1.0),\n    vec2(0.0, 1.0),\n    vec2(1.0, 0.0),\n    vec2(0.0, 1.0),\n    vec2(0.0, 0.0),\n  );\n\n  var output : VertexOutput;\n  output.Position = vec4(pos[VertexIndex], 0.0, 1.0);\n  output.fragUV = uv[VertexIndex];\n  return output;\n}\n\n@fragment\nfn frag_main(@location(0) fragUV : vec2<f32>) -> @location(0) vec4<f32> {\n  return textureSample(myTexture, mySampler, fragUV);\n}\n"}}]);