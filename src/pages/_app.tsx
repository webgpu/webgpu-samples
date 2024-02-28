import Head from 'next/head';
import { AppProps } from 'next/app';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo, memo, useState } from 'react';

import './styles.css';
import styles from './MainLayout.module.css';

import { pageCategories } from './samples/[slug]';
import { SampleLink } from '../components/SampleLink';

const title = 'WebGPU Samples';

const MainLayout: React.FunctionComponent<AppProps> = ({
  Component,
  pageProps,
}) => {
  const router = useRouter();
  //const samplesNames = Object.keys(pages);
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
            {pageCategories.map((category) => {
              return (
                <ul
                  className={styles.exampleList}
                  key={`/categories/${category.title}`}
                >
                  <h3
                    style={{
                      marginTop: '5px',
                      marginBottom: '5px',
                      color: 'rgb(43, 126, 171)',
                    }}
                  >
                    {category.title}
                  </h3>
                  {category.sampleNames.map((slug) => {
                    return (
                      <SampleLink
                        key={`samples/${slug}`}
                        slug={slug}
                        router={router}
                        pages={category.pages}
                        onClick={() => setListExpanded(false)}
                      />
                    );
                  })}
                </ul>
              );
            })}
            <hr />
            <h3 style={{ marginBottom: '5px' }}>Other Pages</h3>
            <ul
              style={{ margin: '0px', paddingBottom: '20px' }}
              className={styles.exampleList}
            >
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
