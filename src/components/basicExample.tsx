import Head from 'next/head';
import React, { useMemo, useState } from 'react';

import type { GUI } from 'dat.gui';

import styles from './BasicExample.module.css';

export const kDefaultCanvasWidth = 600;
export const kDefaultCanvasHeight = 600;

if (process.browser) {
  require('codemirror/mode/javascript/javascript');
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const CodeMirror = process.browser && require('codemirror');
const setShaderRegisteredCallback =
  process.browser &&
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('webgpu-live-shader-module').setShaderRegisteredCallback;

type BasicExampleInitFn = (
  canvas: HTMLCanvasElement,
  gui?: GUI
) => Promise<(timestamp: DOMHighResTimeStamp) => void>;

class CanvasRAFWhileMounted extends React.Component<
  JSX.IntrinsicElements['canvas'] & {
    init: BasicExampleInitFn;
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

    let shaderKey = 0;
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
          key={source + shaderKey++}
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
    this.props.init(this.canvasRef.current, gui).then((frame) => {
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
    const { gui, init, addShaderEditor, ...rest } = this.props;
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
}) {
  return function BasicExample(): JSX.Element {
    const [supported, setSupported] = useState(
      !process.browser || // Assume there's support for static site generation.
        (typeof navigator !== 'undefined' && !!navigator.gpu)
    );

    // Wrap init the catch errors. If there's an error it probably means the example
    // is out of date, uses features unimplemented in the browser, or WebGPU isn't enabled.
    const initFn: BasicExampleInitFn = async (canvas, gui) => {
      try {
        return await props.init(canvas, gui);
      } catch (err) {
        console.error(err);
        setSupported(false);
      }
    };

    const [shaderEditors, setShaderEditors] = useState<JSX.Element[]>([]);

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
        </div>
        <div className={styles.canvasContainer}>
          {supported ? (
            <CanvasRAFWhileMounted
              init={initFn}
              gui={props.gui}
              addShaderEditor={(shaderEditor: JSX.Element) =>
                setShaderEditors([...shaderEditors, shaderEditor])
              }
              width={kDefaultCanvasWidth}
              height={kDefaultCanvasHeight}
            />
          ) : (
            // Placeholder
            <canvas width={kDefaultCanvasWidth} height={kDefaultCanvasHeight} />
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
