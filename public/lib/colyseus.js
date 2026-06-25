// Colyseus Client Library Loader
// This file loads the Colyseus library from a privacy-respecting CDN

(function(window) {
  const script = document.createElement('script');
  script.src = 'https://cdn.skypack.dev/colyseus@0.17.10';
  script.onload = function() {
    // Skypack loads as an ES module, so we need to handle it differently
    // The library should now be available on window
  };
  script.onerror = function() {
    console.error('Failed to load Colyseus from Skypack CDN');
  };
  document.head.appendChild(script);
})(window);
