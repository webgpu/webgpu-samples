if (window.frameElement) {
  const body = document.body;
  const observer = new ResizeObserver(() => {
    window.parent.postMessage({
      cmd: 'resize',
      data: {
        width: body.scrollWidth,
        height: body.scrollHeight,
      },
    });
  });
  observer.observe(body);
}