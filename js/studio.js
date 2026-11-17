(function (root) {
  "use strict";

  var AGENT_KEY = "brynnel.agents.v1";
  var START = 10000;
  var F = root.BrynnelFilings;

  function loadAgents() {
    try {
      var list = JSON.parse(localStorage.getItem(AGENT_KEY) || "[]");
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }

  function saveAgents(list) {
    localStorage.setItem(AGENT_KEY, JSON.stringify(list));
  }

  function uid() {
    return "ag-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function parsePrompt(text) {
    var t = String(text || "").toLowerCase();
    if (/fund|carry|harvest|collect (the )?funding/.test(t)) return "F01";
    if (/stretch|z-score|mean ?rev|fade (the )?spike|overextended/.test(t)) return "F02";
    if (/drift|eight[-\s]?hour|8h|follow (the )?(trend|move|run)/.test(t)) return "F04";
    return null;
  }

  function ruleMeta(id) {
    return ((F && F.RULES) || []).find(function (r) { return r.id === id; }) || null;
  }

  function alignedRate(fundings, t) {
    var best = null, bestDt = Infinity;
    for (var i = 0; i < fundings.length; i++) {
      var dt = Math.abs(fundings[i].t - t);
      if (dt < bestDt) { bestDt = dt; best = fundings[i]; }
    }
    if (!best || bestDt > 90 * 60 * 1000) return 0;
    return best.rate || 0;
  }

  function mean(xs) {
    if (!xs.length) return 0;
    var s = 0;
    for (var i = 0; i < xs.length; i++) s += xs[i];
    return s / xs.length;
  }

  function stdev(xs) {
    if (xs.length < 2) return 0;
    var m = mean(xs);
    var s = 0;
    for (var i = 0; i < xs.length; i++) { var d = xs[i] - m; s += d * d; }
    return Math.sqrt(s / (xs.length - 1));
  }

  function backtestOne(ruleId, bars, fundings) {
    var closes = bars.map(function (b) { return { t: b.t, px: b.close }; }).filter(function (b) { return b.px > 0; });
    var pos = 0; /* +1 long, -1 short, 0 flat, as fraction of equity at entry — we use unit notional = current equity */
    var equity = START;
    var cash = START;
    var entry = 0;
    var units = 0;
    var trades = 0;
    var path = [];
    var holdPath = [];
    var holdUnits = closes.length ? START / closes[0].px : 0;
    var fundingAbs = (F && F.FUNDING_ABS) || 0.00012;
    var zAbs = (F && F.Z_ABS) || 2;
    var driftRet = (F && F.DRIFT_RET) || 0.035;
    var driftHours = (F && F.DRIFT_HOURS) || 8;

    function markTo(px) {
      if (units === 0) return cash;
      return cash + units * px;
    }

    function flatten(px) {
      if (units === 0) return;
      cash += units * px;
      units = 0;
      pos = 0;
      entry = 0;
    }

    function go(side, px) {
      flatten(px);
      var eq = cash;
      if (eq <= 0 || px <= 0) return;
      units = (side === "long" ? 1 : -1) * (eq / px);
      cash = 0;
      pos = side === "long" ? 1 : -1;
      entry = px;
      trades += 1;
    }

    for (var i = 0; i < closes.length; i++) {
      var px = closes[i].px;
      var t = closes[i].t;
      /* accrue funding on the open perpetual-style position for this hour */
      if (units !== 0 && fundings && fundings.length) {
        var rate = alignedRate(fundings, t);
        /* longs pay when rate > 0; position notional is |units|*px */
        var notional = Math.abs(units) * px;
        var pay = notional * rate; /* positive rate: longs pay */
        cash -= (units > 0 ? pay : -pay);
      }
      var side = null;
      if (ruleId === "F01") {
        var r = alignedRate(fundings || [], t);
        if (Math.abs(r) >= fundingAbs) side = r > 0 ? "short" : "long";
        else if (pos) flatten(px);
      } else if (ruleId === "F02") {
        if (i >= 37) {
          var prior = closes.slice(i - 36, i).map(function (c) { return c.px; });
          var sd = stdev(prior);
          var z = sd ? (px - mean(prior)) / sd : 0;
          if (Math.abs(z) >= zAbs) side = z > 0 ? "short" : "long";
          else if (Math.abs(z) < 0.5 && pos) flatten(px);
        }
      } else if (ruleId === "F04") {
        if (i >= driftHours) {
          var start = closes[i - driftHours].px;
          var ret = (px - start) / start;
          var up = 0, down = 0;
          for (var k = i - driftHours + 1; k <= i; k++) {
            if (closes[k].px >= closes[k - 1].px) up++;
            if (closes[k].px <= closes[k - 1].px) down++;
          }
          if (ret >= driftRet && up >= 6) side = "long";
          else if (ret <= -driftRet && down >= 6) side = "short";
        }
      }
      if (side) {
        if ((side === "long" && pos !== 1) || (side === "short" && pos !== -1)) go(side, px);
      }
      equity = markTo(px);
      path.push({ t: t, y: equity });
      holdPath.push({ t: t, y: holdUnits * px });
    }
    flatten(closes.length ? closes[closes.length - 1].px : 0);
    equity = cash;
    return {
      start: START,
      endEquity: equity,
      returnPct: (equity - START) / START,
      holdEnd: holdPath.length ? holdPath[holdPath.length - 1].y : START,
      holdReturnPct: holdPath.length ? (holdPath[holdPath.length - 1].y - START) / START : 0,
      trades: trades,
      path: path,
      holdPath: holdPath,
      bars: closes.length,
      from: closes[0] && closes[0].t,
      to: closes[closes.length - 1] && closes[closes.length - 1].t
    };
  }

  async function runBacktest(marketRows, ruleId) {
    var parts = [];
    var notes = [];
    for (var i = 0; i < marketRows.length; i++) {
      var m = marketRows[i];
      var bars = await root.BrynnelFeed.loadCandles(m.marketId, 24 * 30);
      var funds = [];
      if (ruleId === "F01") {
        try { funds = await root.BrynnelFeed.loadFundings(m.marketId, 24 * 30); }
        catch (e) { notes.push(m.symbol + ": fundings could not be loaded (" + (e.message || e) + ")."); }
      }
      if (bars.length < 40) {
        notes.push(m.symbol + ": Lighter returned only " + bars.length + " hourly closes, which is too short for this rule.");
        continue;
      }
      var one = backtestOne(ruleId, bars, funds);
      one.symbol = m.symbol;
      one.marketId = m.marketId;
      parts.push(one);
    }
    if (!parts.length) {
      throw new Error("No selected market returned enough hourly closes to backtest. " + notes.join(" "));
    }
    /* equal-weight the selected markets */
    var n = parts.length;
    var path = parts[0].path.map(function (p, idx) {
      var y = 0;
      for (var j = 0; j < n; j++) {
        var row = parts[j].path[Math.min(idx, parts[j].path.length - 1)];
        y += (row ? row.y : START) / n;
      }
      return { t: p.t, y: y };
    });
    var holdPath = parts[0].holdPath.map(function (p, idx) {
      var y = 0;
      for (var j = 0; j < n; j++) {
        var row = parts[j].holdPath[Math.min(idx, parts[j].holdPath.length - 1)];
        y += (row ? row.y : START) / n;
      }
      return { t: p.t, y: y };
    });
    var endEquity = path[path.length - 1].y;
    var holdEnd = holdPath[holdPath.length - 1].y;
    var minBars = Math.min.apply(null, parts.map(function (p) { return p.bars; }));
    var from = Math.min.apply(null, parts.map(function (p) { return p.from; }));
    var to = Math.max.apply(null, parts.map(function (p) { return p.to; }));
    notes.unshift(
      "Lighter returned " + minBars + " hourly closes for the shortest selected market, covering " +
      root.BrynnelShell.when(from) + " to " + root.BrynnelShell.when(to) +
      ". A 30-day window is 720 hours; the path uses every hourly close the public API actually returned."
    );
    notes.push("Starting virtual balance is $10,000, split equally across the selected markets. Fees are not deducted — Lighter does not publish a single public taker fee on this endpoint. Treat this as a signal path, not a net-of-fees return.");
    return {
      ruleId: ruleId,
      start: START,
      endEquity: endEquity,
      returnPct: (endEquity - START) / START,
      holdEnd: holdEnd,
      holdReturnPct: (holdEnd - START) / START,
      trades: parts.reduce(function (s, p) { return s + p.trades; }, 0),
      path: path,
      holdPath: holdPath,
      parts: parts.map(function (p) {
        return { symbol: p.symbol, marketId: p.marketId, bars: p.bars, returnPct: p.returnPct, holdReturnPct: p.holdReturnPct, trades: p.trades, from: p.from, to: p.to };
      }),
      notes: notes,
      from: from,
      to: to,
      bars: minBars
    };
  }

  function render(pageEl) {
    var sh = root.BrynnelShell;
    var state = { markets: [], picked: [], rule: "F01", prompt: "", result: null, busy: false, books: [] };

    function shell() {
      var rules = ((F && F.RULES) || []).filter(function (r) { return r.id !== "F03"; });
      var chips = (state.books || []).slice(0, 24).map(function (m) {
        var on = state.picked.indexOf(m.marketId) >= 0 ? " is-on" : "";
        return '<button type="button" class="chip' + on + '" data-m="' + m.marketId + '">' + sh.escapeHtml(m.symbol) + "</button>";
      }).join("");
      var resultHtml = "";
      if (state.result) {
        var r = state.result;
        resultHtml =
          '<div class="card" id="bt-card">' +
            "<h3>Backtest</h3>" +
            '<div class="row">' +
              '<span class="pill">Signal ' + sh.pct(r.returnPct) + "</span>" +
              '<span class="pill">Hold ' + sh.pct(r.holdReturnPct) + "</span>" +
              '<span class="pill">' + r.trades + " turns</span>" +
              '<span class="pill">' + r.bars + " hourly closes</span>" +
            "</div>" +
            '<div class="eq-chart chart-wrap" id="eq-chart"></div>' +
            r.notes.map(function (n) { return '<p class="note">' + sh.escapeHtml(n) + "</p>"; }).join("") +
            '<div class="row" style="margin-top:14px">' +
              '<button type="button" class="btn btn-coral" data-run>Run on this device</button>' +
            "</div>" +
            '<p class="status">Run stores the agent in this browser only. Sending an order on Lighter still requires a signature from your wallet on the Dashboard.</p>' +
          "</div>";
      }
      pageEl.innerHTML =
        "<h1>Studio</h1>" +
        '<p class="lede">Pick one to three Lighter perpetual markets, choose a written rule or describe it in plain language, and backtest against the hourly closes the venue actually returns.</p>' +
        '<div class="card stack" style="margin-bottom:16px">' +
          "<h3>Markets</h3>" +
          '<div class="chip-list" id="chips">' + (chips || '<p class="muted">Loading active books from Lighter mainnet…</p>') + "</div>" +
          '<p class="status">' + (state.picked.length ? state.picked.length + " selected." : "Select 1–3 markets.") + "</p>" +
          "<h3>Rule</h3>" +
          '<div class="stack">' + rules.map(function (r) {
            return '<label style="display:flex;gap:10px;align-items:flex-start;font-weight:500;color:var(--ink)">' +
              '<input type="radio" name="rule" value="' + r.id + '"' + (state.rule === r.id ? " checked" : "") + ">" +
              "<span><strong>" + sh.escapeHtml(r.name) + "</strong> · " + sh.escapeHtml(r.short) + "</span></label>";
          }).join("") + "</div>" +
          '<label class="field">Or describe the rule in plain language' +
            '<textarea class="input" id="prompt" placeholder="Harvest funding when it is large, fade a two-sigma stretch, follow an eight-hour drift…">' + sh.escapeHtml(state.prompt) + "</textarea>" +
          "</label>" +
          '<p class="note">The prompt is mapped with a fixed keyword list to F01, F02, or F04. There is no model behind this box. Book tilt (F03) needs a live top of book and is not backtested here.</p>' +
          '<button type="button" class="btn btn-coral" data-backtest' + (state.busy ? " disabled" : "") + ">" +
            (state.busy ? "Reading Lighter…" : "Backtest on mainnet candles") + "</button>" +
          '<p class="err" id="studio-err"></p>' +
        "</div>" + resultHtml;
      bind();
      if (state.result) {
        var el = document.getElementById("eq-chart");
        if (el) sh.areaChart(el, state.result.path);
      }
    }

    function bind() {
      document.querySelectorAll("[data-m]").forEach(function (b) {
        b.addEventListener("click", function () {
          var id = Number(b.getAttribute("data-m"));
          var i = state.picked.indexOf(id);
          if (i >= 0) state.picked.splice(i, 1);
          else if (state.picked.length < 3) state.picked.push(id);
          shell();
        });
      });
      document.querySelectorAll('input[name="rule"]').forEach(function (r) {
        r.addEventListener("change", function () { state.rule = r.value; });
      });
      var prompt = document.getElementById("prompt");
      if (prompt) prompt.addEventListener("input", function (e) { state.prompt = e.target.value; });
      var bt = document.querySelector("[data-backtest]");
      if (bt) bt.addEventListener("click", onBacktest);
      var run = document.querySelector("[data-run]");
      if (run) run.addEventListener("click", onRun);
    }

    async function onBacktest() {
      var err = document.getElementById("studio-err");
      try {
        if (state.picked.length < 1 || state.picked.length > 3) throw new Error("Pick one, two, or three markets.");
        var rule = state.rule;
        if (state.prompt && state.prompt.trim()) {
          var mapped = parsePrompt(state.prompt);
          if (!mapped) throw new Error("The prompt did not map to a written rule. Mention funding, stretch, or drift — or pick a rule above.");
          rule = mapped;
          state.rule = mapped;
        }
        state.busy = true; shell();
        var rows = state.books.filter(function (m) { return state.picked.indexOf(m.marketId) >= 0; });
        state.result = await runBacktest(rows, rule);
        state.result.ruleId = rule;
        state.busy = false; shell();
      } catch (e) {
        state.busy = false; shell();
        var box = document.getElementById("studio-err");
        if (box) box.textContent = e.message || String(e);
      }
    }

    function onRun() {
      if (!state.result) return;
      var rows = state.books.filter(function (m) { return state.picked.indexOf(m.marketId) >= 0; });
      var agent = {
        id: uid(),
        name: (ruleMeta(state.result.ruleId) || {}).name + " · " + rows.map(function (m) { return m.symbol; }).join(", "),
        createdAt: new Date().toISOString(),
        markets: rows.map(function (m) { return { marketId: m.marketId, symbol: m.symbol }; }),
        ruleId: state.result.ruleId,
        prompt: state.prompt || "",
        backtest: {
          from: state.result.from,
          to: state.result.to,
          bars: state.result.bars,
          returnPct: state.result.returnPct,
          holdReturnPct: state.result.holdReturnPct,
          trades: state.result.trades,
          endEquity: state.result.endEquity,
          notes: state.result.notes,
          parts: state.result.parts
        },
        status: "armed"
      };
      var list = loadAgents();
      list.unshift(agent);
      saveAgents(list);
      location.href = "/agents";
    }

    shell();
    root.BrynnelFeed.loadBooks().then(function (books) {
      state.books = books.rows || [];
      shell();
    }).catch(function (e) {
      pageEl.insertAdjacentHTML("beforeend", '<p class="err">' + sh.escapeHtml(e.message || String(e)) + "</p>");
    });
  }

  root.BrynnelStudio = {
    render: render,
    loadAgents: loadAgents,
    saveAgents: saveAgents,
    parsePrompt: parsePrompt,
    runBacktest: runBacktest,
    AGENT_KEY: AGENT_KEY
  };
})(window);
