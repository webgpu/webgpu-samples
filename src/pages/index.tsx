import styles from './HomePage.module.css';

const HomePage: React.FunctionComponent = () => {
  return (
    <main className={styles.homePage}>
      <p>
        The WebGPU Samples are a set of samples demonstrating the use of the{' '}
        <a href="//webgpu.dev">WebGPU API</a>. Please see the current
        implementation status at <a href="//webgpu.io">webgpu.io</a>.
      </p>

      <p>
        These samples run in Google Chrome. The goal is that they continue to
        work both in Chrome Stable, and in the latest Chrome Canary. If
        something isn&apos;t working, please file an issue{' '}
        <a href="https://github.com/austinEng/webgpu-samples/issues">here</a>.
      </p>

      <p id="not-supported" style={{ display: 'none' }}>
        WebGPU is not supported on this platform yet!
      </p>
    </main>
  );
};

export default HomePage;
