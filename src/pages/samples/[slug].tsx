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

export const pages: PageComponentType = {
  helloTriangle: dynamic(() => import('../../sample/helloTriangle/main')),
  helloTriangleMSAA: dynamic(
    () => import('../../sample/helloTriangleMSAA/main')
  ),
  resizeCanvas: dynamic(() => import('../../sample/resizeCanvas/main')),
  rotatingCube: dynamic(() => import('../../sample/rotatingCube/main')),
  twoCubes: dynamic(() => import('../../sample/twoCubes/main')),
  texturedCube: dynamic(() => import('../../sample/texturedCube/main')),
  instancedCube: dynamic(() => import('../../sample/instancedCube/main')),
  fractalCube: dynamic(() => import('../../sample/fractalCube/main')),
  cameras: dynamic(() => import('../../sample/cameras/main')),
  cubemap: dynamic(() => import('../../sample/cubemap/main')),
  computeBoids: dynamic(() => import('../../sample/computeBoids/main')),
  animometer: dynamic(() => import('../../sample/animometer/main')),
  videoUploading: dynamic(() => import('../../sample/videoUploading/main')),
  videoUploadingWebCodecs: dynamic(
    () => import('../../sample/videoUploadingWebCodecs/main')
  ),
  samplerParameters: dynamic(
    () => import('../../sample/samplerParameters/main')
  ),
  imageBlur: dynamic(() => import('../../sample/imageBlur/main')),
  shadowMapping: dynamic(() => import('../../sample/shadowMapping/main')),
  reversedZ: dynamic(() => import('../../sample/reversedZ/main')),
  deferredRendering: dynamic(
    () => import('../../sample/deferredRendering/main')
  ),
  particles: dynamic(() => import('../../sample/particles/main')),
  cornell: dynamic(() => import('../../sample/cornell/main')),
  gameOfLife: dynamic(() => import('../../sample/gameOfLife/main')),
  renderBundles: dynamic(() => import('../../sample/renderBundles/main')),
  worker: dynamic(() => import('../../sample/worker/main')),
  'A-buffer': dynamic(() => import('../../sample/a-buffer/main')),
  bitonicSort: dynamic(() => import('../../sample/bitonicSort/main')),
  normalMap: dynamic(() => import('../../sample/normalMap/main')),
};

function Page({ slug }: Props): JSX.Element {
  const PageComponent = pages[slug];
  return <PageComponent />;
}

export const getStaticPaths: GetStaticPaths<PathParams> = async () => {
  return {
    paths: Object.keys(pages).map((p) => {
      return { params: { slug: p } };
    }),
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
