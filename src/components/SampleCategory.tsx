import { useState } from 'react';
import styles from './SampleCategory.module.css';

interface SampleCategoryProps {
  title: string;
}

export const SampleCategory = ({ title }: SampleCategoryProps) => {
  const [open, setOpen] = useState<boolean>(true);
  return (
    <div style={{ display: 'flex' }} onClick={() => setOpen(!open)}>
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
  );
};
