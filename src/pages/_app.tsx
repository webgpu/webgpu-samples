import Head from 'next/head';
import { AppProps } from 'next/app';
import Link from 'next/link';
import { useRouter } from 'next/router';

import './styles.css';
import styles from './MainLayout.module.css';

import { pages } from './samples/[slug]';

const title = 'WebGPU Samples';

const MainLayout: React.FunctionComponent<AppProps> = ({
  Component,
  pageProps,
}) => {
  const router = useRouter();
  const samplesNames = Object.keys(pages);

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
          content="The WebGPU Samples are a set of samples demonstrating the use of the WebGPU API."
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
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
                router.pathname === `/samples/[slug]` &&
                router.query['slug'] === slug
                  ? styles.selected
                  : undefined;
              return (
                <li
                  key={slug}
                  className={className}
                  onMouseOver={() => {
                    pages[slug].render.preload();
                  }}
                >
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
