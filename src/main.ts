import { createElem as el } from './utils/elem';
import { SampleInfo, SourceInfo, pageCategories } from './samples';
import { monokai } from '@uiw/codemirror-theme-monokai';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { basicSetup } from 'codemirror';
import { Converter } from 'showdown';

const markdownConverter = new Converter({
  simplifiedAutoLink: true,
});

/**
 * Gets an element unconditionally so TS doesn't complain.
 */
function getElem(
  selector: string,
  parent: HTMLElement | Document = document
): HTMLElement {
  return parent.querySelector(selector)!;
}

const sampleListElem = getElem('#samplelist');
const sampleElem = getElem('#sample');
const introElem = getElem('#intro');
const codeTabsElem = getElem('#codeTabs');
const sourcesElem = getElem('#sources');
const sampleContainerElem = getElem('.sampleContainer', sampleElem);
const titleElem = getElem('#title', sampleElem);
const descriptionElem = getElem('#description', sampleElem);
const menuToggleElem = getElem('#menuToggle') as HTMLInputElement;

// Get the parts of a string past the last `/`
const basename = (name: string) => name.substring(name.lastIndexOf('/') + 1);

// Make a new codemirror editor
const readOnly = EditorState.readOnly.of(true);
async function makeCodeMirrorEditor(parent: HTMLElement, filename: string) {
  const source = await (await fetch(filename)).text();

  new EditorView({
    extensions: [
      basicSetup,
      monokai,
      EditorView.lineWrapping,
      javascript(),
      readOnly,
    ],
    parent,
    doc: source,
  });
}

/**
 * Set the current URL.
 *
 * This exists so we don't have to remember the first 2 parameters to pushState
 * and so we can insert a console.log
 */
function setURL(url: string) {
  history.pushState(null, '', url);
}

// Handle when the URL changes (browser back / forward)
window.addEventListener('popstate', parseURL);

/**
 * Show/hide source tabs
 */
function setSourceTab(sourceInfo: SourceInfo) {
  const name = basename(sourceInfo.path);
  document.querySelectorAll('[data-name]').forEach((e) => {
    const elem = e as HTMLElement;
    elem.dataset.active = (elem.dataset.name === name).toString();
  });
}

/**
 * Respond to the user clicking a source tab link.
 */
function setSourceTabHash(event: PointerEvent, sourceInfo: SourceInfo) {
  event.preventDefault();
  const name = basename(sourceInfo.path);
  const url = new URL(location.toString());
  url.hash = `#${name}`;
  setURL(url.toString());

  setSourceTab(sourceInfo);
}

// Non authoritative test that url is for same domain
function isSameDomain(url: string) {
  return !/^\w+:\/\//.test(url);
}

// That current sample so we don't reload an iframe if the user picks the same sample.
let currentSampleInfo: SampleInfo | undefined;

/**
 * Change the iframe (and source editors) to the given sample or none
 */
function setSampleIFrame(
  sampleInfo: SampleInfo | undefined,
  search: string = ''
) {
  menuToggleElem.checked = false;

  if (sampleInfo === currentSampleInfo) {
    return;
  }
  sampleContainerElem.innerHTML = '';
  descriptionElem.innerHTML = '';

  currentSampleInfo = sampleInfo;
  const { name, description, filename, url, sources } = sampleInfo || {
    name: '',
    description: '',
    filename: '',
    sources: [],
  };

  titleElem.textContent = name;
  descriptionElem.innerHTML = markdownConverter.makeHtml(description);

  // Replace the iframe because changing src adds to the user's history.
  sampleContainerElem.innerHTML = '';
  if (filename) {
    const src = url || `${filename}${search}`;
    sampleContainerElem.appendChild(el('iframe', { src }));
    sampleContainerElem.style.height = sources.length > 0 ? '600px' : '100%';

    // hide intro and show sample
    introElem.style.display = 'none';
    sampleElem.style.display = '';
  } else {
    // hide intro and show sample
    introElem.style.display = '';
    sampleElem.style.display = 'none';
  }

  // create source tabs
  codeTabsElem.innerHTML = '';
  sourcesElem.innerHTML = '';
  sourcesElem.style.display = sources.length > 0 ? '' : 'none';
  sources.forEach((source, i) => {
    const { path } = source;
    const active = (i === 0).toString();
    const name = basename(source.path);
    codeTabsElem.appendChild(
      el('li', {}, [
        el('a', {
          href: `#${path}`,
          textContent: name,
          dataset: {
            active,
            name,
          },
          onClick: (e: PointerEvent) => {
            setSourceTabHash(e, source);
          },
        }),
      ])
    );
    const elem = el('div', {
      className: 'sourceFileContainer',
      dataset: {
        active,
        name,
      },
    });
    sourcesElem.appendChild(elem);
    const url = isSameDomain(path) ? `${filename}/${path}` : source.path;
    makeCodeMirrorEditor(elem, url);
  });
}

/**
 * Respond to the user clicking sample link.
 */
function setSampleIFrameURL(e: PointerEvent, sampleInfo: SampleInfo) {
  e.preventDefault();
  const { filename } = sampleInfo;

  const url = new URL(location.toString());
  url.hash = '';

  url.searchParams.set('sample', basename(filename));
  setURL(url.toString());
  setSampleIFrame(sampleInfo);
}

// Samples are looked up by `?sample=key` so this is a map
// from those keys to each sample.
const samplesByKey = new Map<string, SampleInfo>();

// Generate the list of samples
for (const { title, description, samples } of pageCategories) {
  for (const [key, sampleInfo] of Object.entries(samples)) {
    samplesByKey.set(key, sampleInfo);
  }

  sampleListElem.appendChild(
    el('ul', { className: 'exampleList' }, [
      el('div', {}, [
        el('div', { className: 'sampleCategory' }, [
          el('h3', {
            style: { 'margin-top': '5px' },
            textContent: title,
            dataset: { tooltip: description },
          }),
        ]),
        ...Object.entries(samples).map(([key, sampleInfo]) =>
          el('li', {}, [
            el('a', {
              href: sampleInfo.filename,
              onClick: (e: PointerEvent) => {
                setSampleIFrameURL(e, sampleInfo);
              },
              textContent: sampleInfo.tocName || key,
            }),
          ])
        ),
      ]),
    ])
  );
}

/**
 * Parse the page's current URL and then set the iframe appropriately.
 */
function parseURL() {
  const url = new URL(location.toString());

  const sample = url.searchParams.get('sample') || '';
  const sampleUrl = new URL(sample, location.href);
  const sampleInfo = samplesByKey.get(basename(sampleUrl.pathname));
  setSampleIFrame(sampleInfo, sampleUrl.search);
  if (sampleInfo) {
    const hash = basename(url.hash.substring(1));
    const sourceInfo =
      sampleInfo.sources.find(({ path }) => basename(path) === hash) ||
      sampleInfo.sources[0];
    setSourceTab(sourceInfo);
  }
}

/**
 * Respond to messages from iframes. We have no way of knowing the size
 * of an example so there's a helper in `iframe-helper.js` that lets
 * the iframe tell us the size it needs (and possibly other things).
 * This lets us adjust the size of the iframe.
 */
window.addEventListener('message', (e) => {
  const { cmd, data } = e.data;
  switch (cmd) {
    case 'resize': {
      sampleContainerElem.style.height = `${data.height}px`;
      break;
    }
    default:
      throw new Error(`unknown message cmd: ${cmd}`);
  }
});

// Parse the first URL.
parseURL();
