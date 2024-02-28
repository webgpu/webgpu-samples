import { useState } from 'react';
import styles from './SampleCategory.module.css';

import { NextRouter } from 'next/router';
import Link from 'next/link';
import { PageCategory } from '../pages/samples/[slug]';

type PageType = {
  [key: string]: React.ComponentType & { render: { preload: () => void } };
};

type PageComponentType = {
  [key: string]: React.ComponentType;
};

interface SampleCategoryProps {
  category: PageCategory;
  router: NextRouter;
  onClickPageLink: () => void;
}

export const SampleCategory = ({
  category,
  onClickPageLink,
  router,
}: SampleCategoryProps) => {
  const { title, pages, sampleNames } = category;
  const [open, setOpen] = useState<boolean>(true);
  return (
    <div>
      <div className={styles.sampleCategory} onClick={() => setOpen(!open)}>
        <h3
          style={{
            marginTop: '5px',
          }}
        >
          {title}
        </h3>
        <div className={`${styles.dropdown}`} data-collapsed={open}>
          <svg width="15" height="15" viewBox="0 0 20 20">
            <path d="M0 7 L 20 7 L 10 16" fill="black" />
          </svg>
        </div>
      </div>
      {open
        ? sampleNames.map((slug) => {
            return (
              <SampleLink
                key={`samples/${slug}`}
                slug={slug}
                router={router}
                pages={pages}
                onClick={() => onClickPageLink()}
              />
            );
          })
        : null}
    </div>
  );
};

interface SampleLinkProps {
  router: NextRouter;
  slug: string;
  pages: PageComponentType;
  onClick: () => void;
}

export const SampleLink = ({
  router,
  slug,
  pages,
  onClick,
}: SampleLinkProps) => {
  const className =
    router.pathname === `/samples/[slug]` && router.query['slug'] === slug
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
      <Link href={`/samples/${slug}`} onClick={() => onClick()}>
        {slug}
      </Link>
    </li>
  );
};
