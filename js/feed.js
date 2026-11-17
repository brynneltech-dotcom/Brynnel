(function (root) {
  "use strict";
  var S = root.BRYNNEL_SETTINGS;
  var BASE = S.rest.replace(/\/$/, "");

  function toNum(v) {
    if (v == null || v === "") return null;
    var n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function withTimeout(ms) {
    var c = new AbortController();
    var t = setTimeout(function () { c.abort(); }, ms || 18000);
    return { signal: c.signal, done: function () { clearTimeout(t); } };
  }

  async function readJson(path, headers) {
    var box = withTimeout(18000);
    try {
      var res = await fetch(BASE + path, {
        signal: box.signal,
        headers: Object.assign({ accept: "application/json" }, headers || {})
      });
      var body = await res.json().catch(function () { return {}; });
      if (!res.ok && body.code == null) {
        throw new Error("Lighter responded with HTTP " + res.status);
      }
      return body;
    } catch (err) {
      if (err && err.name === "AbortError") throw new Error("The request to Lighter timed out.");
      throw err;
    } finally {
      box.done();
    }
  }

  async function postForm(path, fields) {
    var res = await fetch(BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields)
    });
    var body = await res.json().catch(function () { return {}; });
    if (!res.ok && body.code == null) throw new Error("Lighter responded with HTTP " + res.status);
    return body;
  }

  function annualizeHourly(rate) {
    if (rate == null) return null;
    return rate * 24 * 365;
  }

  function venueCap(minImf) {
    var imf = toNum(minImf);
    if (!imf || imf <= 0) return null;
    return Math.round(10000 / imf);
  }

  async function loadBooks() {
    var pack = await Promise.all([
      readJson("/api/v1/orderBookDetails?filter=perp"),
      readJson("/api/v1/funding-rates")
    ]);
    var books = pack[0];
    var funds = pack[1];
    var byMarket = {};
    ((funds && funds.funding_rates) || []).forEach(function (row) {
      if (row.exchange && String(row.exchange).toLowerCase() !== "lighter") return;
      if (row.market_id == null) return;
      byMarket[row.market_id] = toNum(row.rate != null ? row.rate : row.funding_rate);
    });
    var rows = (books.order_book_details || []).filter(function (m) {
      return m.status === "active" && String(m.market_type || "perp") !== "spot";
    });
    var list = rows.map(function (m) {
      var hourly = byMarket[m.market_id];
      return {
        symbol: m.symbol,
        marketId: m.market_id,
        status: m.status,
        mark: toNum(m.mark_price),
        index: toNum(m.index_price),
        last: toNum(m.last_trade_price),
        changePct: toNum(m.daily_price_change),
        high: toNum(m.daily_price_high),
        low: toNum(m.daily_price_low),
        volumeQuote: toNum(m.daily_quote_token_volume),
        trades: toNum(m.daily_trades_count),
        openInterest: toNum(m.open_interest),
        minQuote: toNum(m.min_quote_amount),
        minBase: toNum(m.min_base_amount),
        priceDecimals: m.supported_price_decimals != null ? m.supported_price_decimals : m.price_decimals,
        sizeDecimals: m.supported_size_decimals != null ? m.supported_size_decimals : m.size_decimals,
        minImf: toNum(m.min_initial_margin_fraction),
        maxLeverage: venueCap(m.min_initial_margin_fraction),
        fundingHourly: hourly,
        fundingYearly: annualizeHourly(hourly),
        takerFee: toNum(m.taker_fee),
        frozen: !!m.is_frozen
      };
    });
    list.sort(function (a, b) { return (b.volumeQuote || 0) - (a.volumeQuote || 0); });
    return { at: new Date().toISOString(), source: BASE, rows: list };
  }

  function asMs(t) {
    var n = Number(t);
    if (!Number.isFinite(n)) return n;
    return n < 1e12 ? n * 1000 : n;
  }

  function mapCandles(body) {
    return (body.c || body.candles || []).map(function (bar) {
      return {
        t: asMs(bar.t),
        open: toNum(bar.o),
        high: toNum(bar.h),
        low: toNum(bar.l),
        close: toNum(bar.c),
        baseVol: toNum(bar.v),
        quoteVol: toNum(bar.V)
      };
    });
  }

  async function loadCandles(marketId, hours) {
    var n = hours || 48;
    var end = Date.now();
    var start = end - n * 3600 * 1000;
    var all = [];
    var cursor = end;
    var safety = 0;
    var seen = {};
    while (cursor > start && safety < 8) {
      safety += 1;
      var count = Math.min(500, Math.max(2, Math.ceil((cursor - start) / 3600000) + 1));
      var body = await readJson(
        "/api/v1/candles?market_id=" + encodeURIComponent(marketId) +
        "&resolution=1h&start_timestamp=" + start + "&end_timestamp=" + cursor + "&count_back=" + count
      );
      var bars = mapCandles(body).sort(function (a, b) { return a.t - b.t; });
      if (!bars.length) break;
      var added = 0;
      bars.forEach(function (bar) {
        if (seen[bar.t]) return;
        seen[bar.t] = true;
        all.push(bar);
        added += 1;
      });
      var first = bars[0].t;
      if (!added || first >= cursor) break;
      cursor = first - 1;
    }
    return all.filter(function (b) { return b.t >= start && b.t <= end; }).sort(function (a, b) { return a.t - b.t; });
  }

  async function loadFundings(marketId, hours) {
    var n = hours || 720;
    var end = Date.now();
    var start = end - n * 3600 * 1000;
    var body = await readJson(
      "/api/v1/fundings?market_id=" + encodeURIComponent(marketId) +
      "&resolution=1h&start_timestamp=" + start + "&end_timestamp=" + end + "&count_back=" + n
    );
    var rows = body.fundings || body.f || body.data || [];
    if (!Array.isArray(rows)) rows = [];
    return rows.map(function (row) {
      var rate = toNum(row.rate != null ? row.rate : row.value);
      var dir = String(row.direction || row.side || "").toLowerCase();
      /* If the venue only sends a signless rate, direction "long" means longs pay. */
      if (rate != null && rate >= 0 && dir === "short") rate = -Math.abs(rate);
      if (rate != null && rate >= 0 && dir === "long") rate = Math.abs(rate);
      return {
        t: asMs(row.timestamp != null ? row.timestamp : row.t),
        rate: rate,
        value: toNum(row.value),
        direction: dir
      };
    }).filter(function (r) { return r.t && r.rate != null; }).sort(function (a, b) { return a.t - b.t; });
  }

  async function loadBook(marketId, depth) {
    var body = await readJson(
      "/api/v1/orderBookOrders?market_id=" + encodeURIComponent(marketId) +
      "&limit=" + (depth || 12)
    );
    return {
      bids: body.bids || [],
      asks: body.asks || [],
      bidCount: body.total_bids,
      askCount: body.total_asks
    };
  }

  async function accountsFor(address) {
    return readJson("/api/v1/accountsByL1Address?l1_address=" + encodeURIComponent(address));
  }

  async function accountByIndex(index) {
    return readJson("/api/v1/account?by=index&value=" + encodeURIComponent(index));
  }

  async function nextNonce(accountIndex, apiKeyIndex) {
    var body = await readJson(
      "/api/v1/nextNonce?account_index=" + accountIndex + "&api_key_index=" + apiKeyIndex
    );
    if (body.nonce == null && body.code && body.code !== 200) {
      throw new Error(body.message || "nextNonce was rejected");
    }
    return body.nonce;
  }

  async function listedKeys(accountIndex, apiKeyIndex) {
    return readJson("/api/v1/apikeys?account_index=" + accountIndex + "&api_key_index=" + apiKeyIndex);
  }

  async function sendSigned(tx) {
    var body = await postForm("/api/v1/sendTx", {
      tx_type: String(tx.txType),
      tx_info: typeof tx.txInfo === "string" ? tx.txInfo : JSON.stringify(tx.txInfo)
    });
    if (body.code !== 200) {
      throw new Error("sendTx " + (body.code || "") + ": " + (body.message || "rejected"));
    }
    return body;
  }

  async function openOrders(accountIndex, marketId, auth) {
    var mid = marketId == null ? 255 : marketId;
    var headers = auth ? { Authorization: auth } : {};
    return readJson("/api/v1/accountActiveOrders?account_index=" + accountIndex + "&market_id=" + mid, headers);
  }

  root.BrynnelFeed = {
    toNum: toNum,
    readJson: readJson,
    postForm: postForm,
    annualizeHourly: annualizeHourly,
    loadBooks: loadBooks,
    loadCandles: loadCandles,
    loadFundings: loadFundings,
    asMs: asMs,
    loadBook: loadBook,
    accountsFor: accountsFor,
    accountByIndex: accountByIndex,
    nextNonce: nextNonce,
    listedKeys: listedKeys,
    sendSigned: sendSigned,
    openOrders: openOrders,
    base: BASE
  };
})(window);
