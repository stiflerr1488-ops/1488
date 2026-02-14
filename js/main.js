// NP.Maps — legacy entry (v37)
// main.js kept for backward-compatibility. Prefer core.js + page bundles.
(function(){
  try {
    var s=document.createElement('script');
    s.defer=true; s.src='js/core.js';
    document.head.appendChild(s);
  } catch(_){}
})();
