(function (root) {
  "use strict";

  var THEME_KEY = "brynnel.theme";
  var WALLET_KEY = "brynnel.session-wallet.v1";

  var ICONS = {
    dashboard: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></svg>',
    settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3V20.5M4.9 6.5l1.6 1.6M17.5 15.9l1.6 1.6M3.5 12h2.2M18.3 12H20.5M4.9 17.5l1.6-1.6M17.5 8.1l1.6-1.6"/></svg>',
    markets: '<svg viewBox="0 0 24 24"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg>',
    agents: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 10h8M8 14h5"/></svg>',
    studio: '<svg viewBox="0 0 24 24"><path d="M5 19l8.5-8.5M14.5 9.5l2-2a2.1 2.1 0 013 3l-2 2M5 19l3.5-.5L5.5 15.5 5 19z"/></svg>',
    swap: '<svg viewBox="0 0 24 24"><path d="M7 8h12l-3-3M17 16H5l3 3"/></svg>',
    leaderboard: '<svg viewBox="0 0 24 24"><path d="M8 20V10h8v10M4 20V13h4M16 20v-4h4v4M4 20h16"/></svg>',
    activity: '<svg viewBox="0 0 24 24"><path d="M4 12h4l2.5-6 3 12 2.5-6H20"/></svg>',
    stats: '<svg viewBox="0 0 24 24"><path d="M4 19h16M6 16v-5M12 16V7M18 16v-8"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M4 11.5L12 4l8 7.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-8.5z"/></svg>',
    docs: '<svg viewBox="0 0 24 24"><path d="M7 4h7l5 5v11a1 1 0 01-1 1H7a1 1 0 01-1-1V5a1 1 0 011-1z"/><path d="M14 4v5h5M9 13h6M9 17h4"/></svg>',
    devlog: '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    terms: '<svg viewBox="0 0 24 24"><path d="M7 4h10a1 1 0 011 1v15l-6-3-6 3V5a1 1 0 011-1z"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19"/></svg>',
    token: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10.5c.4-1 1.4-1.5 2.5-1.5 1.5 0 2.5.8 2.5 2s-1 2-2.5 2h-1c-1.5 0-2.5.8-2.5 2s1 2 2.5 2c1.1 0 2.1-.5 2.5-1.5"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M16 3.2A8.5 8.5 0 1019.8 14 6.5 6.5 0 0116 3.2z"/></svg>'
  };

  var APP_TOP = [
    { id: "dashboard", href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "settings", href: "/settings", label: "Settings", icon: "settings" }
  ];
  var APP_EXPLORE = [
    { id: "markets", href: "/markets", label: "Markets", icon: "markets" },
    { id: "agents", href: "/agents", label: "Agents", icon: "agents" },
    { id: "studio", href: "/studio", label: "Studio", icon: "studio" },
    { id: "swap", href: "/swap", label: "Swap", icon: "swap" },
    { id: "leaderboard", href: "/leaderboard", label: "Leaderboard", icon: "leaderboard" },
    { id: "activity", href: "/activity", label: "Activity", icon: "activity" },
    { id: "stats", href: "/stats", label: "Stats", icon: "stats" }
  ];
  var APP_BRAND = [
    { id: "home", href: "/", label: "Home", icon: "home" },
    { id: "docs", href: "/docs", label: "Docs", icon: "docs" },
    { id: "devlog", href: "/devlog", label: "Dev log", icon: "devlog" },
    { id: "terms", href: "/terms", label: "Terms", icon: "terms" },
    { id: "token", href: "/token", label: "Token", icon: "token" },
    { id: "x", href: "", label: "X", icon: "x", social: "x" }
  ];

  function settings() { return root.BRYNNEL_SETTINGS || {}; }

  function readTheme() {
    try { return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light"; }
    catch (e) { return "light"; }
  }

  function applyTheme(theme) {
    var t = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    var btn = document.querySelector("[data-theme-toggle]");
    if (btn) btn.innerHTML = t === "dark" ? ICONS.sun : ICONS.moon;
  }

  function toggleTheme() {
    applyTheme(readTheme() === "dark" ? "light" : "dark");
  }

  function shortAddr(addr) {
    if (!addr) return "";
    return addr.slice(0, 6) + "…" + addr.slice(-4);
  }

  function rememberWallet(addr) {
    try {
      if (addr) localStorage.setItem(WALLET_KEY, addr);
      else localStorage.removeItem(WALLET_KEY);
    } catch (e) {}
  }

  function rememberedWallet() {
    try { return localStorage.getItem(WALLET_KEY) || ""; } catch (e) { return ""; }
  }

  function currentWallet() {
    return (root.__brynnelWallet) || rememberedWallet() || "";
  }

  function setWallet(addr) {
    root.__brynnelWallet = addr || "";
    rememberWallet(addr || "");
    renderLoginButtons();
    root.dispatchEvent(new CustomEvent("brynnel:wallet", { detail: { address: addr || "" } }));
  }

  function renderLoginButtons() {
    var addr = currentWallet();
    document.querySelectorAll("[data-wallet-btn]").forEach(function (btn) {
      if (addr) {
        btn.classList.add("is-in");
        btn.textContent = shortAddr(addr);
        btn.title = addr;
      } else {
        btn.classList.remove("is-in");
        btn.textContent = "Log in";
        btn.title = "Connect a wallet";
      }
    });
  }

  async function login() {
    var ink = root.BrynnelInk;
    if (!ink) throw new Error("The wallet module is not loaded.");
    if (currentWallet()) {
      if (window.confirm("Disconnect this wallet from the Brynnel session on this browser?")) setWallet("");
      return;
    }
    if (!ink.provider()) {
      alert("No EIP-1193 wallet was found in this browser. Install a wallet that can use Robinhood Chain, then try again.");
      return;
    }
    var addr = await ink.connectWallet();
    await ink.onRobinhood();
    setWallet(addr);
  }

  function linkItem(item, page) {
    if (item.social === "x") {
      var href = settings().x;
      if (!href) return "";
      var on = page === "x" ? " is-active" : "";
      return '<a class="nav-link' + on + '" href="' + href + '" target="_blank" rel="noopener noreferrer">' + ICONS.x + "<span>X</span></a>";
    }
    var on = page === item.id ? " is-active" : "";
    return '<a class="nav-link' + on + '" href="' + item.href + '">' + ICONS[item.icon] + "<span>" + item.label + "</span></a>";
  }

  function brandMark() {
    return '<img class="mark" src="/assets/mark.png" width="32" height="32" alt="">';
  }

  function socialLinks() {
    var s = settings();
    var bits = [];
    if (s.x) bits.push('<a href="' + s.x + '" target="_blank" rel="noopener noreferrer">X</a>');
    if (s.github) bits.push('<a href="' + s.github + '" target="_blank" rel="noopener noreferrer">GitHub</a>');
    return bits.join("");
  }

  function appShell(page, inner) {
    return (
      '<div class="app" id="app-shell">' +
        '<aside class="sidebar">' +
          '<a class="brand" href="/">' + brandMark() + "<span>Brynnel</span></a>" +
          '<div class="nav-block">' + APP_TOP.map(function (i) { return linkItem(i, page); }).join("") + "</div>" +
          '<div class="nav-label">Explore</div>' +
          '<div class="nav-block">' + APP_EXPLORE.map(function (i) { return linkItem(i, page); }).join("") + "</div>" +
          '<div class="nav-label">Brynnel</div>' +
          '<div class="nav-block">' + APP_BRAND.map(function (i) { return linkItem(i, page); }).join("") + "</div>" +
          '<div class="grow"></div>' +
          '<div class="theme-row"><button type="button" class="theme-btn" data-theme-toggle aria-label="Toggle light or dark theme">' +
            (readTheme() === "dark" ? ICONS.sun : ICONS.moon) +
          "</button></div>" +
          '<p class="side-note">Mainnet. You sign from your own wallet. Brynnel never holds the funds.</p>' +
          '<button type="button" class="side-login" data-wallet-btn>Log in</button>' +
        "</aside>" +
        '<div class="scrim" data-scrim hidden></div>' +
        '<div class="app-body">' +
          '<main class="main"><div class="main-narrow">' + (inner || "") + "</div></main>" +
          marketFooter() +
        "</div>" +
      "</div>"
    );
  }

  function marketHeader(active) {
    function navA(id, href, label) {
      return '<a href="' + href + '"' + (active === id ? ' class="is-active"' : "") + ">" + label + "</a>";
    }
    return (
      '<header class="m-nav">' +
        '<a class="brand" href="/">' + brandMark() + "<span>Brynnel</span></a>" +
        "<nav>" +
          navA("markets", "/markets", "Markets") +
          navA("leaderboard", "/leaderboard", "Leaderboard") +
          navA("swap", "/swap", "Swap") +
          navA("docs", "/docs", "Docs") +
          navA("stats", "/stats", "Stats") +
        "</nav>" +
        '<div class="m-actions">' +
          '<button type="button" class="theme-btn" data-theme-toggle aria-label="Toggle light or dark theme">' +
            (readTheme() === "dark" ? ICONS.sun : ICONS.moon) +
          "</button>" +
          '<a class="btn btn-app" href="/dashboard">Go to app →</a>' +
        "</div>" +
      "</header>"
    );
  }

  function marketFooter() {
    var socials = socialLinks();
    return (
      '<footer class="m-footer">' +
        "<span>Brynnel · Lighter perpetuals on Robinhood Chain, mainnet.</span>" +
        '<div class="socials' + (socials ? "" : " hidden") + '">' + socials + "</div>" +
      "</footer>"
    );
  }

  function marketShell(page, inner) {
    return '<div class="m-wrap">' + marketHeader(page) + (inner || "") + marketFooter() + "</div>";
  }

  function bind() {
    applyTheme(readTheme());
    renderLoginButtons();
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.addEventListener("click", toggleTheme);
    });
    document.querySelectorAll("[data-wallet-btn]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        login().catch(function (err) { alert(err.message || String(err)); });
      });
    });
    var ink = root.BrynnelInk;
    if (ink && ink.provider()) {
      ink.currentAccounts().then(function (list) {
        if (list && list[0]) setWallet(list[0]);
      });
      var p = ink.provider();
      if (p && p.on && !root.__brynnelWalletBound) {
        root.__brynnelWalletBound = true;
        p.on("accountsChanged", function (list) { setWallet((list && list[0]) || ""); });
      }
    }
  }

  function mount(opts) {
    opts = opts || {};
    var rootEl = document.getElementById("app") || document.body;
    if (opts.kind === "market") rootEl.innerHTML = marketShell(opts.page, opts.html || "");
    else rootEl.innerHTML = appShell(opts.page, opts.html || "");
    bind();
    return rootEl.querySelector(".main-narrow") || rootEl.querySelector(".m-wrap") || rootEl;
  }

  function fill(html) {
    var box = document.querySelector(".main-narrow");
    if (box) box.innerHTML = html;
    return box;
  }

  function money(n, d) {
    if (n == null || !Number.isFinite(Number(n))) return "—";
    var x = Number(n);
    var digits = d != null ? d : (Math.abs(x) >= 1000 ? 2 : Math.abs(x) >= 1 ? 2 : 4);
    return x.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function usd(n, d) { return "$" + money(n, d == null ? 2 : d); }

  function pct(n, d) {
    if (n == null || !Number.isFinite(Number(n))) return "—";
    var x = Number(n) * 100;
    var sign = x > 0 ? "+" : "";
    return sign + x.toLocaleString("en-US", { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }) + "%";
  }

  function when(ts) {
    if (!ts) return "—";
    var d = typeof ts === "number" ? new Date(ts < 1e12 ? ts * 1000 : ts) : new Date(ts);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-GB", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " WIB";
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function areaChart(el, series, opts) {
    opts = opts || {};
    var w = el.clientWidth || 640;
    var h = el.clientHeight || 240;
    var pad = { l: 8, r: 8, t: 16, b: 8 };
    if (!series || series.length < 2) {
      el.innerHTML = '<p class="empty">No hourly closes were returned for this window.</p>';
      return;
    }
    var ys = series.map(function (p) { return p.y; });
    var min = Math.min.apply(null, ys);
    var max = Math.max.apply(null, ys);
    if (min === max) { min *= 0.999; max *= 1.001; }
    var first = series[0].y;
    var last = series[series.length - 1].y;
    var up = last >= first;
    var stroke = up ? "var(--up)" : "var(--down)";
    var fill = up ? "url(#upFill)" : "url(#downFill)";
    function x(i) { return pad.l + (i / (series.length - 1)) * (w - pad.l - pad.r); }
    function y(v) { return pad.t + (1 - (v - min) / (max - min)) * (h - pad.t - pad.b); }
    var d = series.map(function (p, i) { return (i ? "L" : "M") + x(i).toFixed(2) + " " + y(p.y).toFixed(2); }).join(" ");
    var area = d + " L" + x(series.length - 1).toFixed(2) + " " + (h - pad.b) + " L" + x(0).toFixed(2) + " " + (h - pad.b) + " Z";
    el.innerHTML =
      '<svg viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none" role="img">' +
        "<defs>" +
          '<linearGradient id="upFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#188a4d" stop-opacity=".28"/><stop offset="100%" stop-color="#188a4d" stop-opacity="0"/></linearGradient>' +
          '<linearGradient id="downFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#c03a32" stop-opacity=".28"/><stop offset="100%" stop-color="#c03a32" stop-opacity="0"/></linearGradient>' +
        "</defs>" +
        '<path d="' + area + '" fill="' + fill + '"></path>' +
        '<path pathLength="1" d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="2" stroke-linejoin="round"></path>' +
      "</svg>";
  }

  root.BrynnelShell = {
    mount: mount,
    fill: fill,
    marketHeader: marketHeader,
    bind: bind,
    applyTheme: applyTheme,
    toggleTheme: toggleTheme,
    login: login,
    currentWallet: currentWallet,
    setWallet: setWallet,
    shortAddr: shortAddr,
    money: money,
    usd: usd,
    pct: pct,
    when: when,
    escapeHtml: escapeHtml,
    areaChart: areaChart,
    brandMark: brandMark,
    ICONS: ICONS
  };
})(window);
