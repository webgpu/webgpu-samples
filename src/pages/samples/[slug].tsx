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
// visual results.
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

// Samples that demonstrate the gpgpu functionality of WebGPU. These samples generally
// provide a two-dimensional visual representation of the result of a compute operation.
// Accordingly, the rendering functionality of these samples exists primarily to demonstrate
// the results of these operations. As a general rule of thumb, if the visual output of the
// sample could just as easily be displayed using the canvas's 2D rendering context, then it
// belongs within this category.
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
  pages: PageComponentType;
  sampleNames: string[];
}

const createPageCategory = (
  title: string,
  pages: PageComponentType
): PageCategory => {
  return {
    title,
    pages,
    sampleNames: Object.keys(pages),
  };
};

export const pageCategories: PageCategory[] = [
  createPageCategory('Basic Graphics', graphicsBasicsPages),
  createPageCategory('WebGPU Features', webGPUFeaturesPages),
  createPageCategory('GPGPU Demos', gpuComputeDemoPages),
  createPageCategory('Graphics Techniques', graphicsDemoPages),
  createPageCategory('Web Platform Demos', webPlatformPages),
  createPageCategory('Benchmarks', benchmarkPages),
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
