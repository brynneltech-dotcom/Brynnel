(function (root) {
  "use strict";

  function reduced() {
    try { return root.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
  }

  function splitWords(el) {
    if (!el || el.getAttribute("data-hw") === "1") return;
    function walk(node) {
      if (node.nodeType === 3) {
        var parts = node.textContent.split(/(\s+)/);
        var frag = document.createDocumentFragment();
        parts.forEach(function (p) {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
          var span = document.createElement("span");
          span.className = "hw";
          span.textContent = p;
          frag.appendChild(span);
        });
        node.parentNode.replaceChild(frag, node);
      } else if (node.nodeType === 1 && node.tagName !== "BR") {
        Array.prototype.slice.call(node.childNodes).forEach(walk);
      }
    }
    walk(el);
    el.setAttribute("data-hw", "1");
    var words = el.querySelectorAll(".hw");
    words.forEach(function (s, i) { s.style.transitionDelay = (i * 55) + "ms"; });
  }

  function formatCount(raw, kind) {
    var n = Number(raw);
    if (!Number.isFinite(n)) return "—";
    if (kind === "pad2") return String(Math.round(n)).padStart(2, "0");
    if (kind === "vol") {
      if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
      if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
      return Math.round(n).toLocaleString("en-US");
    }
    return Math.round(n).toLocaleString("en-US");
  }

  function count(el) {
    if (!el) return;
    var raw = Number(el.getAttribute("data-raw"));
    var kind = el.getAttribute("data-kind") || "int";
    if (!Number.isFinite(raw)) return;
    if (reduced()) { el.textContent = formatCount(raw, kind); return; }
    var start = performance.now();
    var dur = 1100;
    function frame(now) {
      var t = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = formatCount(raw * eased, kind);
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = formatCount(raw, kind);
    }
    requestAnimationFrame(frame);
  }

  function markPathLength(rootEl) {
    (rootEl || document).querySelectorAll(".spark svg path, .chart-wrap svg path[stroke], .track-chart svg path[stroke], .eq-chart svg path[stroke]").forEach(function (p) {
      if (!p.hasAttribute("pathLength")) p.setAttribute("pathLength", "1");
    });
  }

  var io = null;
  function observe(el) {
    if (!el) return;
    if (reduced()) { el.classList.add("is-in"); return; }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            if (en.target.classList.contains("stats-row") || en.target.querySelector(".sn[data-raw]")) {
              (en.target.querySelectorAll ? en.target.querySelectorAll(".sn[data-raw]") : []).forEach(count);
            }
            io.unobserve(en.target);
          }
        });
      }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
    }
    io.observe(el);
  }

  function cycleSteps() {
    var steps = document.querySelectorAll(".loop-step");
    if (!steps.length || reduced()) return;
    var i = 0;
    if (root.__brynnelRail) return;
    root.__brynnelRail = setInterval(function () {
      steps.forEach(function (s) { s.classList.remove("is-hot"); });
      steps[i % steps.length].classList.add("is-hot");
      i += 1;
    }, 1600);
    steps[0].classList.add("is-hot");
  }

  function buildTicker(rows) {
    var host = document.getElementById("market-ticker");
    if (!host || !rows || !rows.length) return;
    var sh = root.BrynnelShell;
    function item(m) {
      var chg = m.changePct;
      var frac = chg == null ? null : chg / 100;
      var up = frac == null ? true : frac >= 0;
      return '<span class="ticker-item"><span class="sym">' + sh.escapeHtml(m.symbol) +
        '</span><span class="px">' + sh.usd(m.mark, m.mark >= 100 ? 2 : 3) +
        '</span><span class="' + (up ? "up" : "down") + '">' + (frac == null ? "" : sh.pct(frac, 2)) + "</span></span>";
    }
    var html = rows.slice(0, 24).map(item).join("");
    host.innerHTML = '<div class="ticker-track">' + html + html + "</div>";
    host.hidden = false;
  }

  function enhance(scope) {
    var rootEl = scope || document;
    if (reduced()) document.documentElement.setAttribute("data-reduced-motion", "1");

    var title = rootEl.querySelector(".hero-words") || rootEl.querySelector(".hero-center h1");
    if (title) {
      title.classList.add("hero-words");
      splitWords(title);
    }
    var hero = rootEl.querySelector(".hero-center");
    if (hero) {
      if (!hero.querySelector(".hero-glow")) {
        var g = document.createElement("div");
        g.className = "hero-glow";
        g.setAttribute("aria-hidden", "true");
        hero.insertBefore(g, hero.firstChild);
      }
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          setTimeout(function () {
            hero.classList.add("is-in");
            if (title) title.classList.add("is-in");
            var phones = hero.querySelector(".hero-phones");
            if (phones) {
              phones.classList.add("is-in");
              if (!reduced()) setTimeout(function () { phones.classList.add("is-bob"); }, 1500);
            }
          }, 80);
        });
      });
    }

    rootEl.querySelectorAll(".sec-kicker").forEach(function (k) { k.classList.add("kicker-shine"); });
    rootEl.querySelectorAll(".ph-log .item").forEach(function (el, i) { el.style.setProperty("--i", String(i)); });
    var pop = rootEl.querySelector("#ph-center-ret .big, #ph-center-ret");
    if (pop) pop.classList.add("ph-pop");

    ["#markets-sec", ".desk", ".desk-strategies", ".how-band", ".explain", ".quote-band", ".track-card", ".lb-card", ".next-band", ".faq", ".cta-box", ".stay", ".foot-pro", ".stats-row", ".strat-card", ".step-card", ".loop-step", ".fact", ".mkt-card", ".sec"].forEach(function (sel) {
      rootEl.querySelectorAll(sel).forEach(function (el, i) {
        el.classList.add("rise");
        if (i && i < 5 && (sel === ".strat-card" || sel === ".step-card" || sel === ".fact" || sel === ".mkt-card" || sel === ".loop-step")) {
          el.classList.add("rise-d" + Math.min(i, 4));
        }
        observe(el);
      });
    });
    var stats = rootEl.querySelector(".stats-row");
    if (stats) observe(stats);

    markPathLength(rootEl);
    cycleSteps();
  }

  function setCount(id, raw, kind) {
    var el = typeof id === "string" ? document.getElementById(id) : id;
    if (!el) return;
    el.setAttribute("data-raw", String(raw));
    el.setAttribute("data-kind", kind || "int");
    if (reduced() || el.closest(".is-in") || (el.closest(".stats-row") && document.querySelector(".stats-row.is-in"))) {
      count(el);
    } else {
      el.textContent = kind === "vol" ? "—" : (kind === "pad2" ? "00" : "0");
      var row = el.closest(".stats-row");
      if (row) observe(row);
    }
  }

  root.BrynnelMotion = {
    enhance: enhance,
    count: count,
    setCount: setCount,
    buildTicker: buildTicker,
    markPathLength: markPathLength,
    reduced: reduced
  };
})(window);
