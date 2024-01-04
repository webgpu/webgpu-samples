import Head from 'next/head';
import { AppProps } from 'next/app';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useRef, useEffect } from 'react';

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

  const panelRef = useRef<HTMLDivElement>(null);

  const stylePanelContentsOnExpand = () => {
    if (panelRef.current) {
      console.log(panelRef.current.getAttribute('data-expanded'));
      panelRef.current.getAttribute('data-expanded') === 'true'
        ? panelRef.current.setAttribute('data-expanded', 'false')
        : panelRef.current.setAttribute('data-expanded', 'true');
    }
  };

  //Style .panelContents when clicking on a link.
  const stylePanelContentsOnLink = () => {
    panelRef.current.setAttribute('data-expanded', 'false');
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
        <nav className={`${styles.panel} ${styles.container}`} ref={panelRef}>
          <h1>
            <Link href="/">{title}</Link>
            <div
              className={styles.expand}
              onClick={() => {
                stylePanelContentsOnExpand();
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
                        stylePanelContentsOnLink();
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
