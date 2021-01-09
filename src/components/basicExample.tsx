import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useEffect, useMemo, useState } from 'react';

import type { GUI } from 'dat.gui';

import styles from './BasicExample.module.css';

if (process.browser) {
  require('codemirror/mode/javascript/javascript');
  require('webgpu-shader-module-transform');
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const CodeMirror = process.browser && require('codemirror');
const setShaderRegisteredCallback =
  process.browser &&
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('webgpu-live-shader-module').setShaderRegisteredCallback;

type BasicExampleInitFn = (
  canvas: HTMLCanvasElement,
  useWGSL: boolean,
  gui?: GUI
) => Promise<(timestamp: DOMHighResTimeStamp) => void>;

class CanvasRAFWhileMounted extends React.Component<
  JSX.IntrinsicElements['canvas'] & {
    init: BasicExampleInitFn;
    useWGSL: boolean;
    gui: boolean;
    addShaderEditor: (shaderEditor: JSX.Element) => void;
  }
> {
  private stopRunning = false;
  private canvasRef = React.createRef<HTMLCanvasElement>();

  componentDidMount() {
    let gui: GUI | undefined = undefined;
    if (this.props.gui && process.browser) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const dat = require('dat.gui');
      gui = new dat.GUI({ autoPlace: false });
      this.canvasRef.current.parentNode.appendChild(gui.domElement);
      gui.domElement.style.position = 'absolute';
      gui.domElement.style.top = '10px';
      gui.domElement.style.right = '10px';
    }
    interface ShaderEditor extends CodeMirror.Editor {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updatedSource: (source: any) => void;
    }

    setShaderRegisteredCallback(async (source, updatedSource) => {
      const configuration: CodeMirror.EditorConfiguration = {
        value: source,
        lineNumbers: true,
        lineWrapping: true,
        theme: 'monokai',
      };
      this.props.addShaderEditor(
        <div
          className={styles.shaderEditor}
          key={source}
          ref={(el) => {
            if (!el) return;

            const editor = CodeMirror(el, configuration) as ShaderEditor;
            editor.updatedSource = updatedSource;

            const codeMirrorContainer = el.firstElementChild;
            const updateButton = document.createElement('button');
            updateButton.className = styles.updateShaderBtn;
            updateButton.innerHTML = 'Update shader';
            updateButton.onclick = () => updatedSource(editor.getValue());
            codeMirrorContainer.prepend(updateButton);
          }}
        />
      );
    });

    if (!this.canvasRef.current) {
      return;
    }
    this.props
      .init(this.canvasRef.current, this.props.useWGSL, gui)
      .then((frame) => {
        const doFrame = (timestamp: DOMHighResTimeStamp) => {
          if (this.stopRunning) return;

          frame(timestamp);
          requestAnimationFrame(doFrame);
        };
        requestAnimationFrame(doFrame);
      });
  }

  componentWillUnmount() {
    this.stopRunning = true;
  }

  render() {
    const { gui, init, useWGSL, addShaderEditor, ...rest } = this.props;
    return <canvas {...rest} ref={this.canvasRef} />;
  }
}

export function makeBasicExample(props: {
  name: string;
  description: string;
  slug: string;
  init: BasicExampleInitFn;
  source: string;
  gui?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wgslShaders?: { [k: string]: string | ((...args: any[]) => string) };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  glslShaders?: { [k: string]: string | ((...args: any[]) => string) };
}) {
  return function BasicExample(): JSX.Element {
    const router = useRouter();
    const useWGSL = router.query['wgsl'] !== '0';
    const shaders = useWGSL ? props.wgslShaders : props.glslShaders;

    const [supported, setSupported] = useState(
      !process.browser || // Assume there's support for static site generation.
        (typeof navigator !== 'undefined' && !!navigator.gpu)
    );

    const notWritten = shaders ? null : (
      <>
        <br />
        <br />
        Sorry, this example hasn&apos;t been written for{' '}
        {useWGSL ? 'WGSL' : 'GLSL'} yet.
      </>
    );

    // Wrap init the catch errors. If there's an error it probably means the example
    // is out of date, uses features unimplemented in the browser, or WebGPU isn't enabled.
    const initFn: BasicExampleInitFn = async (canvas, useWGSL, gui) => {
      try {
        return await props.init(canvas, useWGSL, gui);
      } catch (err) {
        console.error(err);
        setSupported(false);
      }
    };

    const [shaderEditors, setShaderEditors] = useState<JSX.Element[]>([]);

    // When useWGSL changes, we need to force an unmount by removing
    // the child component, then adding it again.
    const [shouldRender, setShouldRender] = useState(true);
    useEffect(() => {
      setShouldRender(false);
      setShaderEditors([]);
      setTimeout(() => setShouldRender(true), 0);
    }, [useWGSL]);

    // Memoize this since it creates elements outside the React tree.
    const sourceView = useMemo(
      () => (
        <div
          ref={(el) => {
            const configuration: CodeMirror.EditorConfiguration = {
              value: props.source,
              readOnly: true,
              lineNumbers: true,
              lineWrapping: true,
              theme: 'monokai',
              mode: 'text/typescript',
            };
            CodeMirror(el, configuration);
          }}
        />
      ),
      []
    );

    return (
      <main>
        <Head>
          <style
            dangerouslySetInnerHTML={{
              __html: `
            .CodeMirror {
              height: auto !important;
              margin: 1em 0;
            }

            .CodeMirror-scroll {
              height: auto !important;
              overflow: visible !important;
            }
          `,
            }}
          />
          <title>{`${props.name} - WebGPU Samples`}</title>
          <meta name="description" content={props.description} />
        </Head>
        <div>
          <h1>{props.name}</h1>
          <a
            target="_blank"
            rel="noreferrer"
            href={`https://github.com/austinEng/webgpu-samples/tree/main/src/pages/samples/${props.slug}.ts`}
          >
            See it on Github!
          </a>
          <p>{props.description}</p>
          {supported ? null : (
            <>
              <p>Is WebGPU enabled?</p>
              <p>
                WebGPU or this example is not supported! Please visit{' '}
                <a href="//webgpu.io">webgpu.io</a> to see the current
                implementation status.
              </p>
            </>
          )}
          {notWritten}
        </div>
        <div className={styles.canvasContainer}>
          {supported && shouldRender && shaders ? (
            <CanvasRAFWhileMounted
              useWGSL={useWGSL}
              init={initFn}
              gui={props.gui}
              addShaderEditor={(shaderEditor: JSX.Element) =>
                setShaderEditors([...shaderEditors, shaderEditor])
              }
              width={600}
              height={600}
            />
          ) : (
            // Placeholder
            <canvas width={600} height={600} />
          )}
        </div>
        <div>
          {shaderEditors}
          {sourceView}
        </div>
      </main>
    );
  };
}
