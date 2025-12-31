document.addEventListener("DOMContentLoaded", () => {

  const payload = document.getElementById("payload");
  const codec = document.getElementById("codec");
  const injectBtn = document.getElementById("injectBtn");
  const encBtn = document.getElementById("encBtn");
  const decBtn = document.getElementById("decBtn");
  const bypassBox = document.getElementById("bypass");

  /* ---------- AUTO EXPAND ---------- */
  function autoGrow(el){
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  [payload, codec].forEach(t =>
    t.addEventListener("input", () => autoGrow(t))
  );

  /* ---------- INJECT ---------- */
  injectBtn.addEventListener("click", () => {
    const p = payload.value;
    if(!p) return;

    const safe = JSON.stringify(p);

    chrome.devtools.inspectedWindow.eval(`
      (function(){
        let u = new URL(location.href);
        let keys = [...u.searchParams.keys()];
        if(keys.length){
          u.searchParams.set(keys[0], ${safe});
        } else {
          u.searchParams.set("test", ${safe});
        }
        location.href = u.toString();
      })();
    `);
  });

  /* ---------- ENCODE ---------- */
  encBtn.addEventListener("click", () => {
    codec.value = encodeURIComponent(codec.value);
    autoGrow(codec);
  });

  /* ---------- DECODE ---------- */
  decBtn.addEventListener("click", () => {
    try {
      codec.value = decodeURIComponent(codec.value);
    } catch {
      codec.value = "Invalid URL encoding";
    }
    autoGrow(codec);
  });

  /* ---------- BYPASS CHARS ---------- */
  const bypassChars = [
    "'", "\"", "`", "\\", "/", "%2f", "%252f",
    "<", ">", "%3c", "%3e",
    ";", "%00", "%0a", "%0d",
    "|", "&", "&&", "||",
    "()", "${}", "%09", "%20",'/">'
  ];

  bypassChars.forEach(c => {
    const s = document.createElement("span");
    s.className = "badge";
    s.textContent = c;

    s.addEventListener("click", () => {
      const tmp = document.createElement("textarea");
      tmp.value = c;
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand("copy");
      document.body.removeChild(tmp);
    });

    bypassBox.appendChild(s);
  });

});
