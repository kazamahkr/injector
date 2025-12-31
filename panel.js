document.addEventListener("DOMContentLoaded", () => {

  const payload   = document.getElementById("payload");
  const codec     = document.getElementById("codec");
  const injectBtn = document.getElementById("injectBtn");
  const encBtn    = document.getElementById("encBtn");
  const decBtn    = document.getElementById("decBtn");
  const bypassBox = document.getElementById("bypass");

  /* ---------- AUTO EXPAND TEXTAREA ---------- */
  function autoGrow(el) {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  [payload, codec].forEach(t =>
  t.addEventListener("input", () => autoGrow(t))
  );

  /* ---------- SMART INJECT (HACKBAR STYLE) ---------- */
  injectBtn.addEventListener("click", () => {
    const p = payload.value.trim();
    if (!p) return;

    chrome.devtools.inspectedWindow.eval(`
    (function () {
      const payload = ${JSON.stringify(p)};
      let url = location.href;

      console.log("[Injector] Payload:", payload);

      // RAW MODE (? or &)
      if (payload.startsWith("?") || payload.startsWith("&")) {
        const q = payload.replace(/^\\?/, "");
        if (url.includes("?")) {
          location.href = url + "&" + q;
        } else {
          location.href = url + "?" + q;
        }
        console.log("[Injector] Injected as raw query");
        return;
      }

      // PARAMETER MODE
      let u = new URL(url);
      let keys = [...u.searchParams.keys()];

      if (keys.length) {
        u.searchParams.set(keys[0], payload);
        console.log("[Injector] Replaced param:", keys[0]);
        location.href = u.toString();
      } else {
        console.warn("[Injector] No parameters found. Use ?param=value");
      }
    })();
    `);
  });


  /* ---------- URL ENCODE ---------- */
  encBtn.addEventListener("click", () => {
    codec.value = encodeURIComponent(codec.value);
    autoGrow(codec);
  });

  /* ---------- URL DECODE ---------- */
  decBtn.addEventListener("click", () => {
    try {
      codec.value = decodeURIComponent(codec.value);
    } catch {
      codec.value = "Invalid URL encoding";
    }
    autoGrow(codec);
  });

  /* ---------- BYPASS CHARACTERS ---------- */
  const bypassChars = [
    "'", "\"", "`", "\\", "/",
    "%2f", "%252f",
    "<", ">", "%3c", "%3e",
    ";", "%00", "%0a", "%0d",
    "|", "&", "&&", "||",
    "()", "${}",
                          "%09", "%20",
                          '/">'
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
