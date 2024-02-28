import { NextRouter } from 'next/router';
import styles from '../pages/MainLayout.module.css';
import Link from 'next/link';

type PageType = {
  [key: string]: React.ComponentType & { render: { preload: () => void } };
};

type PageComponentType = {
  [key: string]: React.ComponentType;
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
