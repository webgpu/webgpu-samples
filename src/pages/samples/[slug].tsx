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

const webGPUFeaturesPages: PageComponentType = {
  samplerParameters: dynamic(
    () => import('../../sample/samplerParameters/main')
  ),
  reversedZ: dynamic(() => import('../../sample/reversedZ/main')),
  renderBundles: dynamic(() => import('../../sample/renderBundles/main')),
};

const graphicsDemoPages: PageComponentType = {
  cameras: dynamic(() => import('../../sample/cameras/main')),
  normalMap: dynamic(() => import('../../sample/normalMap/main')),
  shadowMapping: dynamic(() => import('../../sample/shadowMapping/main')),
  deferredRendering: dynamic(
    () => import('../../sample/deferredRendering/main')
  ),
  cornell: dynamic(() => import('../../sample/cornell/main')),
  'A-buffer': dynamic(() => import('../../sample/a-buffer/main')),
  skinnedMesh: dynamic(() => import('../../sample/skinnedMesh/main')),
};

const gpuComputeDemoPages: PageComponentType = {
  imageBlur: dynamic(() => import('../../sample/imageBlur/main')),
  computeBoids: dynamic(() => import('../../sample/computeBoids/main')),
  particles: dynamic(() => import('../../sample/particles/main')),
  gameOfLife: dynamic(() => import('../../sample/gameOfLife/main')),
  bitonicSort: dynamic(() => import('../../sample/bitonicSort/main')),
};

const webPlatformPages: PageComponentType = {
  resizeCanvas: dynamic(() => import('../../sample/resizeCanvas/main')),
  videoUploading: dynamic(() => import('../../sample/videoUploading/main')),
  videoUploadingWebCodecs: dynamic(
    () => import('../../sample/videoUploadingWebCodecs/main')
  ),
  worker: dynamic(() => import('../../sample/worker/main')),
};

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
  createPageCategory('Graphics Demos', graphicsDemoPages),
  createPageCategory('Compute Demos', gpuComputeDemoPages),
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
