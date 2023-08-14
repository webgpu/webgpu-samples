import styles from './HomePage.module.css';

const HomePage: React.FunctionComponent = () => {
  return (
    <main className={styles.homePage}>
      <p>
        The WebGPU Samples are a set of samples and demos demonstrating the use
        of the <a href="//webgpu.dev">WebGPU API</a>. Please see the current
        implementation status and how to run WebGPU in your browser at{' '}
        <a href="//webgpu.io">webgpu.io</a>.
      </p>
    </main>
  );
};

export default HomePage;
