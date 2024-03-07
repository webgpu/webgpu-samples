// TODO: connect this to HTML's definition
type EventListener = (e: PointerEvent) => void;

interface Attributes {
  [key: string]: string | Attributes | EventListener;
}

/**
 * Creates an HTMLElement with optional attributes and children
 *
 * Examples:
 *
 * ```js
 *   br = createElem('br');
 *   p = createElem('p', 'hello world');
 *   a = createElem('a', {href: 'https://google.com', textContent: 'Google'});
 *   ul = createElement('ul', {}, [
 *     createElem('li', 'apple'),
 *     createElem('li', 'banana'),
 *   ]);
 *   h1 = createElem('h1', { style: { color: 'red' }, textContent: 'Title'})
 * ```
 */
export function createElem(
  tag: string,
  attrs: Attributes | string = {},
  children: HTMLElement[] = []
) {
  const elem = document.createElement(tag) as HTMLElement;
  if (typeof attrs === 'string') {
    elem.textContent = attrs;
  } else {
    const elemAsAttribs = elem as unknown as Attributes;
    for (const [key, value] of Object.entries(attrs)) {
      if (typeof value === 'function' && key.startsWith('on')) {
        const eventName = key.substring(2).toLowerCase();
        // TODO: make type safe or at least more type safe.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        elem.addEventListener(eventName as any, value as EventListener, {
          passive: false,
        });
      } else if (typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) {
          (elemAsAttribs[key] as Attributes)[k] = v;
        }
      } else if (elemAsAttribs[key] === undefined) {
        elem.setAttribute(key, value as string);
      } else {
        elemAsAttribs[key] = value;
      }
    }
  }
  for (const child of children) {
    elem.appendChild(child);
  }
  return elem;
}
