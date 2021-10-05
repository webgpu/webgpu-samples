import Head from 'next/head';
import { AppProps } from 'next/app';
import Link from 'next/link';
import { useRouter } from 'next/router';

import './styles.css';
import styles from './MainLayout.module.css';

const title = 'WebGPU Samples';

const MainLayout: React.FunctionComponent<AppProps> = ({
  Component,
  pageProps,
}) => {
  const router = useRouter();
  const samplesNames = [
    'helloTriangle',
    'helloTriangleMSAA',
    'resizeCanvas',
    'rotatingCube',
    'twoCubes',
    'texturedCube',
    'instancedCube',
    'fractalCube',
    'computeBoids',
    'animometer',
    'videoUploading',
    'imageBlur',
    'shadowMapping',
    'reversedZ',
    'deferredRendering',
    'particles',
  ];

  const oldPathSyntaxMatch = router.asPath.match(/(\?wgsl=[01])#(\S+)/);
  if (oldPathSyntaxMatch) {
    const slug = oldPathSyntaxMatch[2];
    router.replace(`/samples/${slug}`);
    return <></>;
  }

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta
          name="description"
          content="The WebGPU Samples are a set of WGSL and SPIR-V compatible samples demonstrating the use of the WebGPU API"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <link
          href="https://fonts.googleapis.com/css?family=Inconsolata&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.48.4/codemirror.min.css"
          rel="stylesheet"
        />
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.48.4/theme/monokai.min.css"
          rel="stylesheet"
        />
        <meta
          httpEquiv="origin-trial"
          content="AitBSTXH6T6yCRN0yjxirWV9fihPdy8/dLn/1QU4ACdIq0papXRJsBX//gjTjjN58AzWqA5NCUaTUqhbsGkxlwgAAABOeyJvcmlnaW4iOiJodHRwczovL2F1c3Rpbi1lbmcuY29tOjQ0MyIsImZlYXR1cmUiOiJXZWJHUFUiLCJleHBpcnkiOjE2NDMxNTUxOTl9"
        />
      </Head>
      <div className={styles.wrapper}>
        <nav className={`${styles.panel} ${styles.container}`}>
          <h1>
            <Link href="/">{title}</Link>
          </h1>
          <a href="https://github.com/austinEng/webgpu-samples">Github</a>
          <hr />
          <ul className={styles.exampleList}>
            {samplesNames.map((slug) => {
              const className =
                router.pathname === `/samples/${slug}`
                  ? styles.selected
                  : undefined;
              return (
                <li key={slug} className={className}>
                  <Link href={`/samples/${slug}`}>{slug}</Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <Component {...pageProps} />
      </div>
    </>
  );
};

export default MainLayout;
