import Head from 'next/head';
import { AppProps } from 'next/app';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo, memo, useState } from 'react';

import './styles.css';
import styles from './MainLayout.module.css';

import { pages } from './samples/[slug]';
import { SampleLink } from '../components/SampleLink';

const title = 'WebGPU Samples';

type PageType = {
  [key: string]: React.ComponentType & { render: { preload: () => void } };
};

const MainLayout: React.FunctionComponent<AppProps> = ({
  Component,
  pageProps,
}) => {
  const router = useRouter();
  const samplesNames = Object.keys(pages);
  const [listExpanded, setListExpanded] = useState<boolean>(false);

  const ComponentMemo = useMemo(() => {
    return memo(Component);
  }, [Component]);

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
        <nav
          className={`${styles.panel} ${styles.container}`}
          data-expanded={listExpanded}
        >
          <h1>
            <Link href="/">{title}</Link>
            <div
              className={styles.expand}
              onClick={() => {
                setListExpanded(!listExpanded);
              }}
            ></div>
          </h1>
          <div className={styles.panelContents}>
            <a href={`https://github.com/${process.env.REPOSITORY_NAME}`}>
              Github
            </a>
            <hr />
            <ul className={styles.exampleList}>
              {samplesNames.map((slug) => {
                return (
                  <SampleLink
                    key={`samples/${slug}`}
                    slug={slug}
                    router={router}
                    pages={pages}
                    onClick={() => setListExpanded(false)}
                  />
                );
              })}
            </ul>
            <hr />
            <h3>Other Pages</h3>
            <ul className={styles.exampleList}>
              <li>
                <a
                  rel="noreferrer"
                  target="_blank"
                  href={`${
                    process.env.BASE_PATH || ''
                  }/workload-simulator.html`}
                >
                  Workload Simulator ↗️
                </a>
              </li>
            </ul>
          </div>
        </nav>
        <ComponentMemo {...pageProps} />
      </div>
    </>
  );
};

export default MainLayout;
