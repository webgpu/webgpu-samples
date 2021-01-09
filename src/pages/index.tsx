import styles from './HomePage.module.css';

const HomePage: React.FunctionComponent = () => {
  return (
    <main className={styles.homePage}>
      <p>
        The WebGPU Samples are a set of WGSL and SPIR-V compatible samples
        demonstrating the use of the <a href="//webgpu.dev">WebGPU API</a>.
        Please see the current implementation status at{' '}
        <a href="//webgpu.io">webgpu.io</a>. SPIR-V compatible samples will be
        removed when WGSL is fully implemented.
      </p>

      <p>
        These samples run in Chrome Canary behind the flag
        &quot;--enable-unsafe-webgpu&quot;. If something isn&apos;t working,
        please file an issue{' '}
        <a href="https://github.com/austinEng/webgpu-samples/issues">here</a>.
      </p>

      <p id="not-supported" style={{ display: 'none' }}>
        WebGPU is not supported on this platform yet!
      </p>
    </main>
  );
};

export default HomePage;
