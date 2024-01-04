import Head from 'next/head';
import { AppProps } from 'next/app';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useRef, useEffect} from 'react';

import './styles.css';
import styles from './MainLayout.module.css';

import { pages } from './samples/[slug]';

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

  const panelContentsRef = useRef<HTMLDivElement>(null);
  const prevWindowWidth = useRef<number>(0);

  useEffect(() => {
    const resizeListener = () => {
      if (window.innerWidth > 768) {
        prevWindowWidth.current = window.innerWidth;
        panelContentsRef.current.style.maxHeight =
          panelContentsRef.current.scrollHeight + 'px';
      }
      if (window.innerWidth <= 768 && prevWindowWidth.current > 768) {
        panelContentsRef.current.style.maxHeight = '0px';
      }
    };
    window.addEventListener('resize', resizeListener);
    prevWindowWidth.current = window.innerWidth;
    return () => {
      window.removeEventListener('resize', resizeListener);
    };
  }, []);

  const toggelPanelContents = () => {
    if (panelContentsRef.current) {
      if (panelContentsRef.current.style.maxHeight === '0px') {
        panelContentsRef.current.style.maxHeight =
          panelContentsRef.current.scrollHeight + 16 + 'px';
        panelContentsRef.current.style.overflow = 'none';
      } else {
        panelContentsRef.current.style.maxHeight = '0px';
        panelContentsRef.current.style.overflow = 'hidden';
      }
      console.log(panelContentsRef.current.style.maxHeight);
    }
  };

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
            <div
              className={styles.expand}
              onClick={() => {
                //setListExpanded(!listExpanded);
                toggelPanelContents();
              }}
            ></div>
          </h1>
          <div className={styles.panelContents} ref={panelContentsRef}>
            <a href={`https://github.com/${process.env.REPOSITORY_NAME}`}>
              Github
            </a>
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
                      (pages as PageType)[slug].render.preload();
                    }}
                  >
                    <Link
                      href={`/samples/${slug}`}
                      onClick={() => {
                        toggelPanelContents();
                      }}
                    >
                      {slug}
                    </Link>
                  </li>
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
        <Component {...pageProps} />
      </div>
    </>
  );
};

export default MainLayout;
