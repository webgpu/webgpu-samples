!function(){"use strict";var e,t,r,n,a,o,i,f,u,c,d={},l={};function s(e){var t=l[e];if(void 0!==t)return t.exports;var r=l[e]={exports:{}},n=!0;try{d[e].call(r.exports,r,r.exports,s),n=!1}finally{n&&delete l[e]}return r.exports}s.m=d,e=[],s.O=function(t,r,n,a){if(r){a=a||0;for(var o=e.length;o>0&&e[o-1][2]>a;o--)e[o]=e[o-1];e[o]=[r,n,a];return}for(var i=1/0,o=0;o<e.length;o++){for(var r=e[o][0],n=e[o][1],a=e[o][2],f=!0,u=0;u<r.length;u++)i>=a&&Object.keys(s.O).every(function(e){return s.O[e](r[u])})?r.splice(u--,1):(f=!1,a<i&&(i=a));if(f){e.splice(o--,1);var c=n();void 0!==c&&(t=c)}}return t},s.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return s.d(t,{a:t}),t},s.d=function(e,t){for(var r in t)s.o(t,r)&&!s.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},s.f={},s.e=function(e){return Promise.all(Object.keys(s.f).reduce(function(t,r){return s.f[r](e,t),t},[]))},s.u=function(e){return"static/chunks/"+(({126:"f65a48b9",667:"a9a291b3"})[e]||e)+"."+({15:"7cede865422c57e4",103:"5b23e36981b831f5",126:"cb726e3375d78743",167:"a98ba21767bb4b14",198:"9d4b1ecd9e805411",220:"a82b8f1ff962e950",279:"6b68eca887987236",305:"d03291bd58903885",342:"18becbdb1414da2e",391:"6c65b377fb269c4a",432:"41aa18034ddd5718",565:"c5dc1483e16fa1bb",588:"a3790a6471b6b501",607:"116962209f42c5f0",613:"a1ead5532e3809ee",621:"21f11e379dbd3a8b",667:"f7df926320f0d5b0",710:"817f5721fbf13db1",752:"4ef92b105c2983a1",770:"ed8ec55f39dc92fb",841:"f64de689f6501294",951:"a2d9aaf6d092520a"})[e]+".js"},s.miniCssF=function(e){return"static/css/"+({15:"dd2e6def0b19e984",103:"dd2e6def0b19e984",167:"dd2e6def0b19e984",198:"dd2e6def0b19e984",220:"dd2e6def0b19e984",305:"dd2e6def0b19e984",342:"dd2e6def0b19e984",391:"dd2e6def0b19e984",405:"c90c6796236b02d5",432:"dd2e6def0b19e984",565:"90729286db9f40c1",588:"dd2e6def0b19e984",607:"dd2e6def0b19e984",613:"dd2e6def0b19e984",621:"dd2e6def0b19e984",710:"dd2e6def0b19e984",752:"dd2e6def0b19e984",770:"dd2e6def0b19e984",841:"dd2e6def0b19e984",888:"3544aa14212c3a30"})[e]+".css"},s.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||Function("return this")()}catch(e){if("object"==typeof window)return window}}(),s.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},t={},r="_N_E:",s.l=function(e,n,a,o){if(t[e]){t[e].push(n);return}if(void 0!==a)for(var i,f,u=document.getElementsByTagName("script"),c=0;c<u.length;c++){var d=u[c];if(d.getAttribute("src")==e||d.getAttribute("data-webpack")==r+a){i=d;break}}i||(f=!0,(i=document.createElement("script")).charset="utf-8",i.timeout=120,s.nc&&i.setAttribute("nonce",s.nc),i.setAttribute("data-webpack",r+a),i.src=s.tu(e)),t[e]=[n];var l=function(r,n){i.onerror=i.onload=null,clearTimeout(b);var a=t[e];if(delete t[e],i.parentNode&&i.parentNode.removeChild(i),a&&a.forEach(function(e){return e(n)}),r)return r(n)},b=setTimeout(l.bind(null,void 0,{type:"timeout",target:i}),12e4);i.onerror=l.bind(null,i.onerror),i.onload=l.bind(null,i.onload),f&&document.head.appendChild(i)},s.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},s.U=function(e){var t=new URL(e,"x:/"),r={};for(var n in t)r[n]=t[n];for(var n in r.href=e,r.pathname=e.replace(/[?#].*/,""),r.origin=r.protocol="",r.toString=r.toJSON=function(){return e},r)Object.defineProperty(this,n,{enumerable:!0,configurable:!0,value:r[n]})},s.U.prototype=URL.prototype,s.tt=function(){return void 0===n&&(n={createScriptURL:function(e){return e}},"undefined"!=typeof trustedTypes&&trustedTypes.createPolicy&&(n=trustedTypes.createPolicy("nextjs#bundler",n))),n},s.tu=function(e){return s.tt().createScriptURL(e)},s.p="/webgpu-samples/_next/",a=function(e,t,r,n){var a=document.createElement("link");a.rel="stylesheet",a.type="text/css";var o=function(o){if(a.onerror=a.onload=null,"load"===o.type)r();else{var i=o&&("load"===o.type?"missing":o.type),f=o&&o.target&&o.target.href||t,u=Error("Loading CSS chunk "+e+" failed.\n("+f+")");u.code="CSS_CHUNK_LOAD_FAILED",u.type=i,u.request=f,a.parentNode.removeChild(a),n(u)}};return a.onerror=a.onload=o,a.href=t,document.head.appendChild(a),a},o=function(e,t){for(var r=document.getElementsByTagName("link"),n=0;n<r.length;n++){var a=r[n],o=a.getAttribute("data-href")||a.getAttribute("href");if("stylesheet"===a.rel&&(o===e||o===t))return a}for(var i=document.getElementsByTagName("style"),n=0;n<i.length;n++){var a=i[n],o=a.getAttribute("data-href");if(o===e||o===t)return a}},i={272:0},s.f.miniCss=function(e,t){i[e]?t.push(i[e]):0!==i[e]&&({15:1,103:1,167:1,198:1,220:1,305:1,342:1,391:1,432:1,565:1,588:1,607:1,613:1,621:1,710:1,752:1,770:1,841:1})[e]&&t.push(i[e]=new Promise(function(t,r){var n=s.miniCssF(e),i=s.p+n;if(o(n,i))return t();a(e,i,t,r)}).then(function(){i[e]=0},function(t){throw delete i[e],t}))},f={272:0},s.f.j=function(e,t){var r=s.o(f,e)?f[e]:void 0;if(0!==r){if(r)t.push(r[2]);else if(272!=e){var n=new Promise(function(t,n){r=f[e]=[t,n]});t.push(r[2]=n);var a=s.p+s.u(e),o=Error(),i=function(t){if(s.o(f,e)&&(0!==(r=f[e])&&(f[e]=void 0),r)){var n=t&&("load"===t.type?"missing":t.type),a=t&&t.target&&t.target.src;o.message="Loading chunk "+e+" failed.\n("+n+": "+a+")",o.name="ChunkLoadError",o.type=n,o.request=a,r[1](o)}};s.l(a,i,"chunk-"+e,e)}else f[e]=0}},s.O.j=function(e){return 0===f[e]},u=function(e,t){var r,n,a=t[0],o=t[1],i=t[2],u=0;if(a.some(function(e){return 0!==f[e]})){for(r in o)s.o(o,r)&&(s.m[r]=o[r]);if(i)var c=i(s)}for(e&&e(t);u<a.length;u++)n=a[u],s.o(f,n)&&f[n]&&f[n][0](),f[n]=0;return s.O(c)},(c=self.webpackChunk_N_E=self.webpackChunk_N_E||[]).forEach(u.bind(null,0)),c.push=u.bind(null,c.push.bind(c))}();