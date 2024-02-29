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
  return (
    <div>
      <div className={styles.sampleCategory}>
        <h3
          style={{
            marginTop: '5px',
          }}
        >
          {title}
        </h3>
      </div>
      {sampleNames.map((slug) => {
        return (
          <SampleLink
            key={`samples/${slug}`}
            slug={slug}
            router={router}
            pages={pages}
            onClick={() => onClickPageLink()}
          />
        );
      })}
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
