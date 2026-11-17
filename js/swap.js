(function (root) {
  "use strict";

  var S = function () { return root.BRYNNEL_SETTINGS; };
  var TX_KEY = "brynnel.swap-tx.v1";
  var QUOTE_SEL = "0xc6a5026a";
  var SWAP_SEL = "0x04e45aaf";
  var TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  var MAX_UINT = (1n << 256n) - 1n;

  function tokens() { return S().tokens; }

  function token(key) { return tokens()[key]; }

  function pad(addrOrInt) {
    if (typeof addrOrInt === "bigint") return addrOrInt.toString(16).padStart(64, "0");
    if (typeof addrOrInt === "number") return BigInt(addrOrInt).toString(16).padStart(64, "0");
    return String(addrOrInt).toLowerCase().replace(/^0x/, "").padStart(64, "0");
  }

  function feeFor(a, b) {
    if (a.key === "USDG") return b.poolFee;
    if (b.key === "USDG") return a.poolFee;
    return null;
  }

  function canSwapPair(sell, buy) {
    if (!sell || !buy || sell.key === buy.key) return false;
    return !!(feeFor(sell, buy));
  }

  async function publicRpc(method, params) {
    var res = await fetch(S().rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: method, params: params })
    });
    if (!res.ok) throw new Error("Robinhood Chain RPC returned HTTP " + res.status + ".");
    var body = await res.json();
    if (body.error) throw new Error(body.error.message || "RPC error");
    return body.result;
  }

  function toAmount(human, decimals) {
    var s = String(human || "0").trim();
    if (!s || !/^\d+(\.\d+)?$/.test(s)) throw new Error("Enter a valid amount.");
    var parts = s.split(".");
    var whole = parts[0] || "0";
    var frac = (parts[1] || "").slice(0, decimals);
    while (frac.length < decimals) frac += "0";
    return BigInt(whole) * (10n ** BigInt(decimals)) + BigInt(frac || "0");
  }

  function fromAmount(wei, decimals, digits) {
    var n = BigInt(wei);
    var base = 10n ** BigInt(decimals);
    var whole = n / base;
    var frac = (n % base).toString().padStart(decimals, "0");
    var d = digits == null ? Math.min(8, decimals) : digits;
    var cut = frac.slice(0, d).replace(/0+$/, "");
    return cut ? whole.toString() + "." + cut : whole.toString();
  }

  async function quoteExact(tokenIn, tokenOut, amountIn, fee) {
    var data = QUOTE_SEL + pad(tokenIn.address) + pad(tokenOut.address) + pad(amountIn) + pad(fee) + pad(0);
    var raw = await publicRpc("eth_call", [{ to: S().quoter, data: data }, "latest"]);
    if (!raw || raw === "0x") throw new Error("The quoter returned no data for this pool.");
    var hex = raw.replace(/^0x/, "");
    var amountOut = BigInt("0x" + hex.slice(0, 64));
    return { amountOut: amountOut, raw: raw };
  }

  function loadLocalTx(addr) {
    try {
      var all = JSON.parse(localStorage.getItem(TX_KEY) || "[]");
      if (!Array.isArray(all)) return [];
      var want = (addr || "").toLowerCase();
      return all.filter(function (t) { return !want || (t.wallet || "").toLowerCase() === want; });
    } catch (e) { return []; }
  }

  function saveLocalTx(entry) {
    var all = [];
    try { all = JSON.parse(localStorage.getItem(TX_KEY) || "[]"); } catch (e) { all = []; }
    if (!Array.isArray(all)) all = [];
    all.unshift(entry);
    localStorage.setItem(TX_KEY, JSON.stringify(all.slice(0, 50)));
  }

  async function logsForWallet(addr) {
    if (!addr) return [];
    var latestHex = await publicRpc("eth_blockNumber", []);
    var latest = parseInt(latestHex, 16);
    var from = Math.max(0, latest - 4000);
    var padded = "0x" + pad(addr);
    var out = [];
    var list = Object.keys(tokens()).map(function (k) { return tokens()[k]; });
    for (var i = 0; i < list.length; i++) {
      var tok = list[i];
      var fromLogs = await publicRpc("eth_getLogs", [{
        fromBlock: "0x" + from.toString(16),
        toBlock: "latest",
        address: tok.address,
        topics: [TRANSFER_TOPIC, padded]
      }]).catch(function () { return []; });
      var toLogs = await publicRpc("eth_getLogs", [{
        fromBlock: "0x" + from.toString(16),
        toBlock: "latest",
        address: tok.address,
        topics: [TRANSFER_TOPIC, null, padded]
      }]).catch(function () { return []; });
      (fromLogs || []).concat(toLogs || []).forEach(function (log) {
        var topics = log.topics || [];
        var fromA = topics[1] ? ("0x" + topics[1].slice(-40)) : "";
        var toA = topics[2] ? ("0x" + topics[2].slice(-40)) : "";
        out.push({
          hash: log.transactionHash,
          token: tok.symbol,
          from: fromA,
          to: toA,
          amount: fromAmount(BigInt(log.data || "0x0"), tok.decimals, 6),
          block: parseInt(log.blockNumber, 16),
          out: fromA.toLowerCase() === addr.toLowerCase()
        });
      });
    }
    var seen = {};
    return out.filter(function (t) {
      var k = t.hash + t.token + t.out;
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    }).sort(function (a, b) { return (b.block || 0) - (a.block || 0); }).slice(0, 12);
  }

  async function executeSwap(fromAddr, sell, buy, amountIn, minOut, fee) {
    var ink = root.BrynnelInk;
    await ink.onRobinhood();
    var allowance = await ink.tokenAllowance(sell.address, fromAddr, S().swapRouter);
    if (allowance < amountIn) {
      var hashA = await ink.approveToken(fromAddr, sell.address, S().swapRouter, MAX_UINT);
      var recA = await ink.txReceipt(hashA);
      if (recA.status && recA.status !== "0x1") throw new Error("The token approval did not succeed.");
    }
    var data = SWAP_SEL +
      pad(sell.address) +
      pad(buy.address) +
      pad(fee) +
      pad(fromAddr) +
      pad(amountIn) +
      pad(minOut) +
      pad(0);
    var hash = await ink.ethSend(fromAddr, S().swapRouter, "0x" + data.replace(/^0x/, ""));
    var rec = await ink.txReceipt(hash);
    if (rec.status && rec.status !== "0x1") throw new Error("The swap transaction reverted on chain.");
    saveLocalTx({
      hash: hash,
      wallet: fromAddr,
      sell: sell.symbol,
      buy: buy.symbol,
      amountIn: fromAmount(amountIn, sell.decimals, 6),
      at: new Date().toISOString(),
      explorer: S().explorer + "/tx/" + hash
    });
    return hash;
  }

  function icoClass(key) {
    if (key === "BTC") return "asset-ico btc";
    if (key === "USDG") return "asset-ico usdg";
    return "asset-ico";
  }

  function icoLetter(key) {
    if (key === "ETH") return "E";
    if (key === "BTC") return "B";
    return "G";
  }

  function render(pageEl) {
    var sh = root.BrynnelShell;
    var state = { mode: "swap", sell: "USDG", buy: "ETH", amount: "100", slip: "0.5", quote: null, busy: false };

    pageEl.innerHTML =
      '<div class="grid-2" id="swap-grid">' +
        '<div class="stack">' +
          '<div class="card" id="chart-card"></div>' +
          '<div class="card" id="tx-card"></div>' +
        "</div>" +
        '<div class="card swap-panel" id="swap-card"></div>' +
      "</div>";

    function pairOk() { return canSwapPair(token(state.sell), token(state.buy)); }

    function drawChartCard(bars, mid) {
      var t = token(state.buy === "USDG" ? state.sell : state.buy);
      var last = bars && bars.length ? bars[bars.length - 1].close : mid;
      var first = bars && bars.length ? bars[0].close : last;
      var chg = first ? (last - first) / first : 0;
      var cls = chg >= 0 ? "up" : "down";
      document.getElementById("chart-card").innerHTML =
        '<div class="swap-head">' +
          '<div class="swap-asset">' +
            '<div class="' + icoClass(t.key) + '">' + icoLetter(t.key) + "</div>" +
            "<div><div class=\"h3\" style=\"margin:0\">" + sh.escapeHtml(t.symbol) + "</div>" +
            '<div class="px-lg num">' + (last != null ? sh.usd(last, last >= 100 ? 2 : 4) : "—") + "</div></div>" +
          "</div>" +
          '<div class="' + cls + ' num" style="font-weight:700">' + sh.pct(chg) + " · 7d</div>" +
        "</div>" +
        '<div class="chart-wrap" id="price-chart"></div>' +
        '<p class="chart-caption">Hourly closes from Lighter mainnet for ' + sh.escapeHtml(t.symbol) +
          "-PERP, last 7 days. The swap quote on the right comes from the Uniswap v3 " +
          sh.escapeHtml(t.name) + "/USDG pool on Robinhood Chain, which can differ from the perpetual mark.</p>";
      var el = document.getElementById("price-chart");
      if (bars && bars.length >= 2) {
        sh.areaChart(el, bars.map(function (b) { return { t: b.t, y: b.close }; }));
      } else {
        el.innerHTML = '<p class="empty">Lighter did not return enough hourly closes to draw this window.</p>';
      }
    }

    function drawTx(rows, onchain, addr) {
      var box = document.getElementById("tx-card");
      var bits = [];
      (onchain || []).forEach(function (t) {
        bits.push(
          '<div class="tx-row"><div><strong>' + (t.out ? "Sent" : "Received") + " " + sh.escapeHtml(t.token) +
          "</strong><div class=\"faint num\">" + sh.escapeHtml(t.amount) + '</div></div>' +
          '<a class="muted" href="' + S().explorer + "/tx/" + t.hash + '" target="_blank" rel="noopener noreferrer">' +
          sh.shortAddr(t.hash) + "</a></div>"
        );
      });
      (rows || []).forEach(function (t) {
        bits.push(
          '<div class="tx-row"><div><strong>Swap ' + sh.escapeHtml(t.sell) + " → " + sh.escapeHtml(t.buy) +
          "</strong><div class=\"faint\">" + sh.escapeHtml(t.amountIn) + " · " + sh.when(t.at) +
          '</div></div><a class="muted" href="' + sh.escapeHtml(t.explorer) + '" target="_blank" rel="noopener noreferrer">' +
          sh.shortAddr(t.hash) + "</a></div>"
        );
      });
      var empty = !bits.length
        ? (addr
          ? '<p class="empty">No Transfer events for USDG, WETH, or cbBTC were found in the last 4,000 blocks on Robinhood Chain, and this browser has not signed a Brynnel swap yet.</p>'
          : '<p class="empty">Log in to look up recent Transfer events for this wallet on Robinhood Chain. Swaps you sign here are also listed on this device.</p>')
        : bits.join("");
      box.innerHTML = "<h3>Recent transactions</h3>" + empty;
    }

    function tokenMenu(which) {
      return Object.keys(tokens()).map(function (k) {
        return '<button type="button" data-pick="' + which + '" data-token="' + k + '">' + tokens()[k].symbol + "</button>";
      }).join("");
    }

    function drawPanel() {
      var sell = token(state.sell);
      var buy = token(state.buy);
      var addr = sh.currentWallet();
      var q = state.quote;
      var buyVal = "";
      var quoteNote = "";
      if (q && q.ok) {
        buyVal = fromAmount(q.amountOut, buy.decimals, 8);
        quoteNote = "Quote from Uniswap v3 on Robinhood Chain, fee " + (q.fee / 10000).toFixed(2) + "%.";
      } else if (q && q.error) {
        quoteNote = q.error;
      }
      var ready = !!(addr && q && q.ok && !state.busy);
      var cta = !addr ? "Log in to swap" : (state.busy ? "Working…" : (state.mode === "dca" ? "Swap this installment" : "Swap"));
      var dcaNote = state.mode === "dca"
        ? '<p class="note"><strong>No automatic schedule.</strong> Brynnel does not run a keeper. Each installment is a swap you sign now on the Uniswap v3 pool. Come back and sign the next one yourself.</p>'
        : "";
      var execNote = '<p class="note">This is a real on-chain swap through Uniswap v3 on Robinhood Chain mainnet (' +
        sh.escapeHtml(sell.name) + " → " + sh.escapeHtml(buy.name) +
        "). " + sh.escapeHtml(buy.note || sell.note || "") + " Brynnel never holds the tokens.</p>";

      document.getElementById("swap-card").innerHTML =
        '<div class="seg" role="tablist">' +
          '<button type="button" data-mode="swap"' + (state.mode === "swap" ? ' class="is-on"' : "") + ">Swap</button>" +
          '<button type="button" data-mode="dca"' + (state.mode === "dca" ? ' class="is-on"' : "") + ">DCA</button>" +
        "</div>" +
        '<div style="height:14px"></div>' +
        '<div class="pair-box"><div class="lbl">Sell</div><div class="pair-row">' +
          '<input id="sell-amt" inputmode="decimal" value="' + sh.escapeHtml(state.amount) + '">' +
          '<div class="menu"><button type="button" class="token-pick" data-open="sell">' +
            '<span class="' + icoClass(sell.key) + '" style="width:22px;height:22px;font-size:11px">' + icoLetter(sell.key) + "</span> " +
            sell.symbol + " ▾</button><div class=\"menu-pop\" hidden data-menu=\"sell\">" + tokenMenu("sell") + "</div></div>" +
        "</div></div>" +
        '<button type="button" class="flip" data-flip aria-label="Flip tokens">↑↓</button>' +
        '<div class="pair-box"><div class="lbl">Buy</div><div class="pair-row">' +
          '<input id="buy-amt" readonly placeholder="0" value="' + sh.escapeHtml(buyVal) + '">' +
          '<div class="menu"><button type="button" class="token-pick" data-open="buy">' +
            '<span class="' + icoClass(buy.key) + '" style="width:22px;height:22px;font-size:11px">' + icoLetter(buy.key) + "</span> " +
            buy.symbol + " ▾</button><div class=\"menu-pop\" hidden data-menu=\"buy\">" + tokenMenu("buy") + "</div></div>" +
        "</div></div>" +
        '<label class="field" style="margin:12px 0">Slippage %' +
          '<input class="input" id="slip" inputmode="decimal" value="' + sh.escapeHtml(state.slip) + '">' +
        "</label>" +
        (quoteNote ? '<p class="status">' + sh.escapeHtml(quoteNote) + "</p>" : "") +
        '<button type="button" class="btn btn-coral btn-wide" id="swap-cta"' + (ready ? "" : " disabled") + ">" + cta + "</button>" +
        dcaNote + execNote +
        '<p class="status" id="swap-status"></p>';

      bindPanel();
    }

    function bindPanel() {
      document.querySelectorAll("[data-mode]").forEach(function (b) {
        b.addEventListener("click", function () { state.mode = b.getAttribute("data-mode"); drawPanel(); });
      });
      document.getElementById("sell-amt").addEventListener("input", function (e) {
        state.amount = e.target.value;
        debounceQuote();
      });
      document.getElementById("slip").addEventListener("input", function (e) { state.slip = e.target.value; });
      document.querySelectorAll("[data-open]").forEach(function (b) {
        b.addEventListener("click", function (ev) {
          ev.stopPropagation();
          var id = b.getAttribute("data-open");
          document.querySelectorAll("[data-menu]").forEach(function (m) {
            m.hidden = m.getAttribute("data-menu") !== id;
          });
        });
      });
      document.querySelectorAll("[data-pick]").forEach(function (b) {
        b.addEventListener("click", function () {
          var which = b.getAttribute("data-pick");
          var key = b.getAttribute("data-token");
          state[which] = key;
          if (state.sell === state.buy) {
            state[which === "sell" ? "buy" : "sell"] = key === "USDG" ? "ETH" : "USDG";
          }
          refreshChart();
          refreshQuote();
          drawPanel();
        });
      });
      document.querySelector("[data-flip]").addEventListener("click", function () {
        var a = state.sell; state.sell = state.buy; state.buy = a;
        state.amount = document.getElementById("buy-amt").value || state.amount;
        refreshChart();
        refreshQuote();
        drawPanel();
      });
      document.getElementById("swap-cta").addEventListener("click", onSubmit);

    }

    var quoteTimer = null;
    function debounceQuote() {
      clearTimeout(quoteTimer);
      quoteTimer = setTimeout(refreshQuote, 250);
    }

    async function refreshQuote() {
      var sell = token(state.sell);
      var buy = token(state.buy);
      var fee = feeFor(sell, buy);
      if (!fee) {
        state.quote = { error: "Brynnel only quotes the verified Uniswap v3 USDG pools for WETH and cbBTC on Robinhood Chain." };
        drawPanel();
        return;
      }
      try {
        var amt = toAmount(state.amount || "0", sell.decimals);
        if (amt <= 0n) { state.quote = null; drawPanel(); return; }
        var q = await quoteExact(sell, buy, amt, fee);
        state.quote = { ok: true, amountOut: q.amountOut, fee: fee, amountIn: amt };
        drawPanel();
      } catch (err) {
        state.quote = { error: err.message || String(err) };
        drawPanel();
      }
    }

    async function refreshChart() {
      var t = token(state.buy === "USDG" ? state.sell : state.buy);
      var mid = null;
      try {
        var books = await root.BrynnelFeed.loadBooks();
        var row = (books.rows || []).find(function (m) { return m.marketId === t.lighterMarketId; });
        if (row) mid = row.mark;
        var bars = t.lighterMarketId == null ? [] : await root.BrynnelFeed.loadCandles(t.lighterMarketId, 24 * 7);
        drawChartCard(bars, mid);
      } catch (err) {
        drawChartCard([], mid);
        var cap = document.querySelector(".chart-caption");
        if (cap) cap.textContent = err.message || String(err);
      }
    }

    async function refreshTx() {
      var addr = sh.currentWallet();
      var local = loadLocalTx(addr);
      var chain = [];
      if (addr) {
        try { chain = await logsForWallet(addr); } catch (e) { /* keep local list */ }
      }
      drawTx(local, chain, addr);
    }

    async function onSubmit() {
      var status = document.getElementById("swap-status");
      var addr = sh.currentWallet();
      if (!addr) {
        return root.BrynnelShell.login().then(function () { refreshQuote(); refreshTx(); }).catch(function (err) {
          if (status) status.textContent = err.message || String(err);
        });
      }
      var sell = token(state.sell);
      var buy = token(state.buy);
      var fee = feeFor(sell, buy);
      try {
        var amt = toAmount(state.amount, sell.decimals);
        if (amt <= 0n) throw new Error("Enter an amount to sell.");
        var q = await quoteExact(sell, buy, amt, fee);
        var slip = Number(state.slip);
        if (!Number.isFinite(slip) || slip < 0 || slip > 50) throw new Error("Slippage must be between 0 and 50.");
        var minOut = q.amountOut * BigInt(Math.round((10000 - slip * 100))) / 10000n;
        state.busy = true;
        drawPanel();
        var hash = await executeSwap(addr, sell, buy, amt, minOut, fee);
        state.busy = false;
        drawPanel();
        var st = document.getElementById("swap-status");
        if (st) st.innerHTML = 'Swap sent. <a href="' + S().explorer + "/tx/" + hash + '" target="_blank" rel="noopener noreferrer">Open on the explorer</a>.';
        refreshTx();
        refreshQuote();
      } catch (err) {
        state.busy = false;
        drawPanel();
        var st2 = document.getElementById("swap-status");
        if (st2) st2.textContent = err.message || String(err);
      }
    }

    document.getElementById('chart-card').innerHTML = '<p class="muted">Reading Lighter hourly closes…</p>';
    drawTx([], [], sh.currentWallet());
    drawPanel();
    refreshChart();
    refreshQuote();
    refreshTx();
    root.addEventListener("brynnel:wallet", function () {
      refreshQuote();
      refreshTx();
      drawPanel();
    });
    if (!root.__brynnelSwapMenuHide) {
      root.__brynnelSwapMenuHide = true;
      document.addEventListener("click", function () {
        document.querySelectorAll("[data-menu]").forEach(function (m) { m.hidden = true; });
      });
    }
  }

  root.BrynnelSwap = { render: render, quoteExact: quoteExact, canSwapPair: canSwapPair };
})(window);
