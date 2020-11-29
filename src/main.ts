import * as examples from '../gen/exampleLoader';
import { checkWebGPUSupport } from './helpers';
import 'webgpu-shader-module-transform';
import { setShaderRegisteredCallback } from "webgpu-live-shader-module";

const mainContainer = document.querySelector('main');
const descriptionContainer = document.getElementById('description-container');
const canvasContainer = document.getElementById('canvas-container');
const shaderEditor = document.getElementById('shader-editor');
const fullSource = document.getElementById('full-source');

import CodeMirror from 'codemirror';
import 'codemirror/mode/javascript/javascript';

function removeClassName(el: HTMLElement, className: string) {
    el.className = (el.className || '').replace(className, '');
}

interface ShaderEditor extends CodeMirror.Editor {
  updatedSource: (source: any) => void,
};

// @ts-ignore
CodeMirror.commands.save = function(editor: ShaderEditor) {
    editor.updatedSource(editor.getValue());
}

if (navigator.gpu) {
    setShaderRegisteredCallback(async (source, updatedSource) => {
        const el = document.createElement('div');
        shaderEditor.appendChild(el);
        el.className = 'shaderEditor';

        const configuration: CodeMirror.EditorConfiguration = {
            value: source,
            lineNumbers: true,
            lineWrapping: true,
            theme: 'monokai',
        };
        const editor = CodeMirror(el, configuration) as ShaderEditor;
        editor.updatedSource = updatedSource;

        const codeMirrorContainer = el.firstElementChild;
        const updateButton = document.createElement('button');
        updateButton.className = "updateShaderBtn";
        updateButton.innerHTML = "Update shader";
        updateButton.onclick = () => updatedSource(editor.getValue());
        codeMirrorContainer.prepend(updateButton);
    });
}

let currentCanvas = undefined;
async function loadExample(hashName: string) {
    if (!checkWebGPUSupport()) {
        mainContainer.className += " no-demo";
        return;
    }

    const name = hashName.substring(1);

    descriptionContainer.innerHTML = "";
    canvasContainer.innerHTML = "";
    shaderEditor.innerHTML = "";
    fullSource.innerHTML = "";
    currentCanvas = undefined;

    const exampleLoader = examples[name];
    if (!exampleLoader) {
        mainContainer.className += " no-demo";
        return;
    }
    removeClassName(mainContainer, 'no-demo');

    const example = await exampleLoader();

    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    canvasContainer.appendChild(canvas);

    const useWGSL =
      new URLSearchParams(window.location.search).get("wgsl") != "0";

    const titleNode = document.createElement('h1');
    titleNode.innerHTML = example.title;
    descriptionContainer.appendChild(titleNode);

    const linkNode = document.createElement('a');
    linkNode.target = "_blank";
    linkNode.href = `https://github.com/austinEng/webgpu-samples/tree/main/src/examples/${name}.ts`;
    linkNode.innerHTML = linkNode.href;
    descriptionContainer.appendChild(linkNode);

    const descriptionNode = document.createElement('p');
    descriptionNode.innerHTML = example.description;
    descriptionContainer.appendChild(descriptionNode);

    const shaders = useWGSL ? example.wgslShaders : example.glslShaders;
    if (!shaders) {
        descriptionContainer.appendChild(document.createElement('br'));
        descriptionContainer.appendChild(document.createElement("br"));
        descriptionContainer.appendChild(
          document.createTextNode(
            "Sorry, this example hasn't been written yet."
          )
        );
        return;
    }

    const frame = await example.init(canvas, useWGSL);
    if (!frame) return;

    fetch(`./src/examples/${name}.ts`).then(async res => {
        const div = document.createElement("div");
        fullSource.appendChild(div);

        const configuration: CodeMirror.EditorConfiguration = {
            value: await res.text(),
            readOnly: "nocursor",
            lineNumbers: true,
            lineWrapping: true,
            theme: "monokai",
            mode: "text/typescript",
        };
        CodeMirror(div, configuration);
    });

    currentCanvas = canvas;

    function doFrame(timestamp) {
        if (currentCanvas !== canvas) return;

        frame(timestamp);
        requestAnimationFrame(doFrame);
    }
    requestAnimationFrame(doFrame);
}

const exampleLinks = document.querySelectorAll('a.nav-link');
let lastSelected = undefined;
exampleLinks.forEach(link => {
    link.addEventListener('click', () => {
        if (lastSelected !== undefined) {
            removeClassName(lastSelected, 'selected');
        }
        link.className += ' selected';
        lastSelected = link;
    });
});

window.addEventListener('popstate', () => {
    loadExample(window.location.hash);
});

loadExample(window.location.hash);
