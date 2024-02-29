import dynamic from 'next/dynamic';
import { GetStaticPaths, GetStaticProps } from 'next';

type PathParams = {
  slug: string;
};

type Props = {
  slug: string;
};

type PageComponentType = {
  [key: string]: React.ComponentType;
};

// Samples that implement basic rendering functionality using the WebGPU API.
const graphicsBasicsPages: PageComponentType = {
  helloTriangle: dynamic(() => import('../../sample/helloTriangle/main')),
  helloTriangleMSAA: dynamic(
    () => import('../../sample/helloTriangleMSAA/main')
  ),
  rotatingCube: dynamic(() => import('../../sample/rotatingCube/main')),
  twoCubes: dynamic(() => import('../../sample/twoCubes/main')),
  texturedCube: dynamic(() => import('../../sample/texturedCube/main')),
  instancedCube: dynamic(() => import('../../sample/instancedCube/main')),
  fractalCube: dynamic(() => import('../../sample/fractalCube/main')),
  cubemap: dynamic(() => import('../../sample/cubemap/main')),
};

// Samples that demonstrate functionality specific to WebGPU, or demonstrate the particularities
// of how WebGPU implements a particular feature within its api. For instance, while many of the
// sampler parameters in the 'samplerParameters' sample have direct analogues in other graphics api,
// the primary purpose of 'sampleParameters' is to demonstrate their specific nomenclature and
// functionality within the context of the WebGPU API.
const webGPUFeaturesPages: PageComponentType = {
  samplerParameters: dynamic(
    () => import('../../sample/samplerParameters/main')
  ),
  reversedZ: dynamic(() => import('../../sample/reversedZ/main')),
  renderBundles: dynamic(() => import('../../sample/renderBundles/main')),
};

// A selection of samples demonstrating various graphics techniques, utilizing various features
// of the WebGPU API, and often executing render and compute pipelines in tandem to achieve their
// visual results. The techniques demonstrated may even be independent of WebGPU (e.g. 'cameras')
const graphicsDemoPages: PageComponentType = {
  cameras: dynamic(() => import('../../sample/cameras/main')),
  normalMap: dynamic(() => import('../../sample/normalMap/main')),
  shadowMapping: dynamic(() => import('../../sample/shadowMapping/main')),
  deferredRendering: dynamic(
    () => import('../../sample/deferredRendering/main')
  ),
  particles: dynamic(() => import('../../sample/particles/main')),
  imageBlur: dynamic(() => import('../../sample/imageBlur/main')),
  cornell: dynamic(() => import('../../sample/cornell/main')),
  'A-buffer': dynamic(() => import('../../sample/a-buffer/main')),
  skinnedMesh: dynamic(() => import('../../sample/skinnedMesh/main')),
};

// Samples that demonstrate the GPGPU functionality of WebGPU. These samples generally provide some
// user-facing representation (e.g. image, text, or audio) of the result of compute operations.
// Any rendering code is primarily for visualization, not key to the unique part of the sample;
// rendering could also be done using canvas2D without detracting from the sample's usefulness.
const gpuComputeDemoPages: PageComponentType = {
  computeBoids: dynamic(() => import('../../sample/computeBoids/main')),
  gameOfLife: dynamic(() => import('../../sample/gameOfLife/main')),
  bitonicSort: dynamic(() => import('../../sample/bitonicSort/main')),
};

// Samples that demonstrate how to integrate WebGPU and/or WebGPU render operations with other
// functionalities provided by the web platform.
const webPlatformPages: PageComponentType = {
  resizeCanvas: dynamic(() => import('../../sample/resizeCanvas/main')),
  videoUploading: dynamic(() => import('../../sample/videoUploading/main')),
  videoUploadingWebCodecs: dynamic(
    () => import('../../sample/videoUploadingWebCodecs/main')
  ),
  worker: dynamic(() => import('../../sample/worker/main')),
};

// Samples whose primary purpose is to benchmark WebGPU performance.
const benchmarkPages: PageComponentType = {
  animometer: dynamic(() => import('../../sample/animometer/main')),
};

const pages: PageComponentType = {
  ...graphicsBasicsPages,
  ...webGPUFeaturesPages,
  ...graphicsDemoPages,
  ...gpuComputeDemoPages,
  ...webPlatformPages,
  ...benchmarkPages,
};

export interface PageCategory {
  title: string;
  description?: string;
  pages: PageComponentType;
  sampleNames: string[];
}

const createPageCategory = (
  title: string,
  pages: PageComponentType,
  description?: string
): PageCategory => {
  return {
    title,
    description,
    pages,
    sampleNames: Object.keys(pages),
  };
};

export const pageCategories: PageCategory[] = [
  createPageCategory(
    'Basic Graphics',
    graphicsBasicsPages,
    'Basic rendering functionality implemented with the WebGPU API.'
  ),
  createPageCategory(
    'WebGPU Features',
    webGPUFeaturesPages,
    'Demos of WebGPU-specific features or WebGPU-specific implementations of features.'
  ),
  createPageCategory(
    'GPGPU Demos',
    gpuComputeDemoPages,
    'Visualizations of parallel GPU compute operations.'
  ),
  createPageCategory(
    'Graphics Techniques',
    graphicsDemoPages,
    'A collection of graphics techniques implemented with WebGPU.'
  ),
  createPageCategory(
    'Web Platform Integration',
    webPlatformPages,
    'Demos integrating WebGPU with other functionalities of the web platform.'
  ),
  createPageCategory(
    'Benchmarks',
    benchmarkPages,
    'WebGPU Performance Benchmarks'
  ),
];

function Page({ slug }: Props): JSX.Element {
  const PageComponent = pages[slug];
  return <PageComponent />;
}

export const getStaticPaths: GetStaticPaths<PathParams> = async () => {
  const paths = Object.keys(pages).map((p) => ({
    params: { slug: p },
  }));
  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<Props, PathParams> = async ({
  params,
}) => {
  if (!params) {
    return { notFound: true };
  }

  return {
    props: {
      slug: params.slug,
    },
  };
};

export default Page;
