import aBuffer from '../sample/a-buffer/meta';
import animometer from '../sample/animometer/meta';
import bitonicSort from '../sample/bitonicSort/meta';
import cameras from '../sample/cameras/meta';
import cornell from '../sample/cornell/meta';
import computeBoids from '../sample/computeBoids/meta';
import cubemap from '../sample/cubemap/meta';
import deferredRendering from '../sample/deferredRendering/meta';
import fractalCube from '../sample/fractalCube/meta';
import gameOfLife from '../sample/gameOfLife/meta';
import helloTriangle from '../sample/helloTriangle/meta';
import helloTriangleMSAA from '../sample/helloTriangleMSAA/meta';
import imageBlur from '../sample/imageBlur/meta';
import instancedCube from '../sample/instancedCube/meta';
import normalMap from '../sample/normalMap/meta';
import particles from '../sample/particles/meta';
import renderBundles from '../sample/renderBundles/meta';
import resizeCanvas from '../sample/resizeCanvas/meta';
import reversedZ from '../sample/reversedZ/meta';
import rotatingCube from '../sample/rotatingCube/meta';
import samplerParameters from '../sample/samplerParameters/meta';
import shadowMapping from '../sample/shadowMapping/meta';
import skinnedMesh from '../sample/skinnedMesh/meta';
import texturedCube from '../sample/texturedCube/meta';
import twoCubes from '../sample/twoCubes/meta';
import videoUploading from '../sample/videoUploading/meta';
import worker from '../sample/worker/meta';

export type SourceInfo = {
  path: string;
};

export type SampleInfo = {
  name: string;
  tocName?: string;
  description: string;
  filename: string;
  sources: SourceInfo[];
};

type PageCategory = {
  title: string;
  description: string;
  samples: { [key: string]: SampleInfo };
};

export const pageCategories: PageCategory[] = [
  // Samples that implement basic rendering functionality using the WebGPU API.
  {
    title: 'Basic Graphics',
    description:
      'Basic rendering functionality implemented with the WebGPU API.',
    samples: {
      helloTriangle,
      helloTriangleMSAA,
      rotatingCube,
      twoCubes,
      texturedCube,
      instancedCube,
      fractalCube,
      cubemap,
    },
  },

  // Samples that demonstrate functionality specific to WebGPU, or demonstrate the particularities
  // of how WebGPU implements a particular feature within its api. For instance, while many of the
  // sampler parameters in the 'samplerParameters' sample have direct analogues in other graphics api,
  // the primary purpose of 'sampleParameters' is to demonstrate their specific nomenclature and
  // functionality within the context of the WebGPU API.
  {
    title: 'WebGPU Features',
    description: 'Highlights of important WebGPU features.',
    samples: {
      samplerParameters,
      reversedZ,
      renderBundles,
    },
  },

  // Samples that demonstrate the GPGPU functionality of WebGPU. These samples generally provide some
  // user-facing representation (e.g. image, text, or audio) of the result of compute operations.
  // Any rendering code is primarily for visualization, not key to the unique part of the sample;
  // rendering could also be done using canvas2D without detracting from the sample's usefulness.
  {
    title: 'GPGPU Demos',
    description: 'Visualizations of parallel GPU compute operations.',
    samples: {
      computeBoids,
      gameOfLife,
      bitonicSort,
    },
  },

  // A selection of samples demonstrating various graphics techniques, utilizing various features
  // of the WebGPU API, and often executing render and compute pipelines in tandem to achieve their
  // visual results. The techniques demonstrated may even be independent of WebGPU (e.g. 'cameras')
  {
    title: 'Graphics Techniques',
    description: 'A collection of graphics techniques implemented with WebGPU.',
    samples: {
      cameras,
      normalMap,
      shadowMapping,
      deferredRendering,
      particles,
      imageBlur,
      cornell,
      'a-buffer': aBuffer,
      skinnedMesh,
    },
  },

  // Samples that demonstrate how to integrate WebGPU and/or WebGPU render operations with other
  // functionalities provided by the web platform.
  {
    title: 'Web Platform Integration',
    description:
      'Demos integrating WebGPU with other functionalities of the web platform.',
    samples: {
      resizeCanvas,
      videoUploading,
      worker,
    },
  },

  // Samples whose primary purpose is to benchmark WebGPU performance.
  {
    title: 'Benchmarks',
    description: 'WebGPU Performance Benchmarks',
    samples: {
      animometer,
    },
  },
];
