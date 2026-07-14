(() => {
  const DESIGN_WIDTH = 1920;
  const DESIGN_HEIGHT = 1200;
  const RESIZE_DEBOUNCE = 120;

  let resizeTimer = null;

  const getScaleRatio = () => {
    const screen = document.querySelector('.screen-active');
    const viewport = window.visualViewport;
    const rect = screen ? screen.getBoundingClientRect() : null;
    const viewportWidth = rect?.width || viewport?.width || document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = rect?.height || viewport?.height || document.documentElement.clientHeight || window.innerHeight;
    const widthRatio = viewportWidth / DESIGN_WIDTH;
    const heightRatio = viewportHeight / DESIGN_HEIGHT;

    return Math.min(widthRatio, heightRatio);
  };

  const updateScaleRatio = () => {
    const ratio = getScaleRatio();
    document.documentElement.style.setProperty('--scale-ratio', ratio.toFixed(4));

    return ratio;
  };

  const handleResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(updateScaleRatio, RESIZE_DEBOUNCE);
  };

  const initScaleRatio = () => {
    updateScaleRatio();
    window.addEventListener('resize', handleResize);
    window.addEventListener('load', handleResize);
    window.addEventListener('orientationchange', handleResize);
    document.addEventListener('fullscreenchange', handleResize);
    document.addEventListener('webkitfullscreenchange', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScaleRatio, { once: true });
  } else {
    initScaleRatio();
  }
})();
