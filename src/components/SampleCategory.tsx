import styles from './SampleCategory.module.css';
import { useState } from 'react';
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
  const [displayDescription, setDisplayDescription] = useState<boolean>(false);
  const { title, pages, sampleNames } = category;
  return (
    <div>
      <div
        className={styles.sampleCategory}
        onMouseEnter={() => {
          setDisplayDescription(true);
        }}
        onMouseLeave={() => {
          setDisplayDescription(false);
        }}
      >
        <h3
          style={{
            cursor: 'pointer',
            width: 'auto',
          }}
        >
          {title}
        </h3>
        <p
          className={styles.sampleCategoryDescription}
          data-active={displayDescription}
        >
          {category.description}
        </p>
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
