(function (root) {
  "use strict";

  var JOURNAL_KEY = "brynnel.device-journal.v1";
  var MIN_VOLUME = 50000;
  var FUNDING_ABS = 0.00012; // 0.012% per hour
  var Z_ABS = 2;
  var BOOK_TILT = 0.68;
  var DRIFT_RET = 0.035;
  var DRIFT_HOURS = 8;

  var RULES = [
    { id: "F01", name: "Funding harvest", short: "Collect the hourly funding payment when it is large enough." },
    { id: "F02", name: "Stretch fade", short: "Fade a close that is two standard deviations from the last 36 hourly closes." },
    { id: "F03", name: "Book tilt", short: "Follow a one-sided top of book when one side holds at least 68% of visible size." },
    { id: "F04", name: "Hourly drift", short: "Follow an eight-hour move of at least 3.5% with six or more steps in that direction." }
  ];

  function mean(xs) {
    var s = 0;
    for (var i = 0; i < xs.length; i++) s += xs[i];
    return s / xs.length;
  }

  function stdev(xs) {
    if (xs.length < 2) return 0;
    var m = mean(xs);
    var v = 0;
    for (var i = 0; i < xs.length; i++) v += (xs[i] - m) * (xs[i] - m);
    return Math.sqrt(v / (xs.length - 1));
  }

  function zScore(value, series) {
    var sd = stdev(series);
    if (!sd) return null;
    return (value - mean(series)) / sd;
  }

  function levelSize(row) {
    var n = Number(row.remaining_base_amount != null ? row.remaining_base_amount : row.initial_base_amount);
    return Number.isFinite(n) ? n : 0;
  }

  function sideName(side) {
    return side === "short" ? "short" : "long";
  }

  function loadJournal() {
    try {
      var raw = root.localStorage.getItem(JOURNAL_KEY);
      if (!raw) return [];
      var list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function saveJournal(list) {
    root.localStorage.setItem(JOURNAL_KEY, JSON.stringify(list));
  }

  function appendEntry(entry) {
    var list = loadJournal();
    list.unshift(entry);
    if (list.length > 400) list = list.slice(0, 400);
    saveJournal(list);
    return entry;
  }

  function uid() {
    return "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function alreadyOpen(list, ruleId, marketId, windowMs) {
    var cut = Date.now() - (windowMs || 2 * 3600 * 1000);
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.kind !== "proposal") continue;
      if (e.ruleId !== ruleId || Number(e.marketId) !== Number(marketId)) continue;
      if (e.status === "dismissed") continue;
      if (new Date(e.at).getTime() >= cut) return true;
    }
    return false;
  }

  function proposal(rule, market, side, reason, evidence) {
    return {
      id: uid(),
      kind: "proposal",
      status: "open",
      at: new Date().toISOString(),
      ruleId: rule.id,
      ruleName: rule.name,
      symbol: market.symbol,
      marketId: market.marketId,
      side: sideName(side),
      mark: market.mark,
      minQuote: market.minQuote,
      maxLeverage: market.maxLeverage,
      priceDecimals: market.priceDecimals,
      sizeDecimals: market.sizeDecimals,
      reason: reason,
      evidence: evidence || {},
      source: "Lighter mainnet · computed in this browser"
    };
  }

  function volumeOk(market) {
    return (market.volumeQuote || 0) >= MIN_VOLUME && market.mark > 0;
  }

  function runFunding(markets) {
    var out = [];
    var rule = RULES[0];
    markets.forEach(function (m) {
      if (!volumeOk(m) || m.fundingHourly == null) return;
      if (Math.abs(m.fundingHourly) < FUNDING_ABS) return;
      var side = m.fundingHourly > 0 ? "short" : "long";
      var yearly = (m.fundingYearly * 100).toFixed(1);
      var hourly = (m.fundingHourly * 100).toFixed(4);
      out.push(proposal(rule, m, side,
        "Lighter hourly funding is " + hourly + "% (about " + yearly + "% annualized). " +
        (side === "short" ? "Longs pay shorts. The rule proposes short." : "Shorts pay longs. The rule proposes long."),
        { fundingHourly: m.fundingHourly, fundingYearly: m.fundingYearly, volumeQuote: m.volumeQuote }
      ));
    });
    return out;
  }

  function runStretch(markets, candleMap) {
    var out = [];
    var rule = RULES[1];
    markets.forEach(function (m) {
      if (!volumeOk(m)) return;
      var bars = candleMap[m.marketId] || [];
      if (bars.length < 38) return;
      var closes = bars.map(function (b) { return b.close; }).filter(function (x) { return x != null; });
      if (closes.length < 38) return;
      var last = closes[closes.length - 1];
      var prior = closes.slice(-37, -1);
      var z = zScore(last, prior);
      if (z == null || Math.abs(z) < Z_ABS) return;
      var side = z > 0 ? "short" : "long";
      out.push(proposal(rule, m, side,
        "The last hourly close is " + last + " with a z-score of " + z.toFixed(2) +
        " against the previous 36 hourly closes. The rule fades the stretch and proposes " + side + ".",
        { z: z, last: last, hours: prior.length, volumeQuote: m.volumeQuote }
      ));
    });
    return out;
  }

  function runBook(markets, bookMap) {
    var out = [];
    var rule = RULES[2];
    markets.forEach(function (m) {
      var book = bookMap[m.marketId];
      if (!book) return;
      var bid = 0, ask = 0;
      (book.bids || []).forEach(function (row) { bid += levelSize(row); });
      (book.asks || []).forEach(function (row) { ask += levelSize(row); });
      var tot = bid + ask;
      if (tot <= 0) return;
      var share = bid / tot;
      var side = null;
      if (share >= BOOK_TILT) side = "long";
      else if (share <= 1 - BOOK_TILT) side = "short";
      if (!side) return;
      out.push(proposal(rule, m, side,
        "Visible size on the top of the book is " + (share * 100).toFixed(1) +
        "% bids, " + ((1 - share) * 100).toFixed(1) + "% asks. The rule follows the heavier side and proposes " + side + ".",
        { bidSize: bid, askSize: ask, bidShare: share }
      ));
    });
    return out;
  }

  function runDrift(markets, candleMap) {
    var out = [];
    var rule = RULES[3];
    markets.forEach(function (m) {
      if (!volumeOk(m)) return;
      var bars = candleMap[m.marketId] || [];
      if (bars.length < DRIFT_HOURS + 1) return;
      var closes = bars.map(function (b) { return b.close; }).filter(function (x) { return x != null; });
      var slice = closes.slice(-(DRIFT_HOURS + 1));
      if (slice.length < DRIFT_HOURS + 1 || slice[0] <= 0) return;
      var ret = (slice[slice.length - 1] - slice[0]) / slice[0];
      var up = 0, down = 0;
      for (var i = 1; i < slice.length; i++) {
        if (slice[i] >= slice[i - 1]) up++;
        if (slice[i] <= slice[i - 1]) down++;
      }
      var side = null;
      if (ret >= DRIFT_RET && up >= 6) side = "long";
      if (ret <= -DRIFT_RET && down >= 6) side = "short";
      if (!side) return;
      out.push(proposal(rule, m, side,
        "The last " + DRIFT_HOURS + " hours moved " + (ret * 100).toFixed(2) +
        "% with " + (side === "long" ? up : down) + " steps in that direction. The rule proposes " + side + ".",
        { ret: ret, upSteps: up, downSteps: down }
      ));
    });
    return out;
  }

  async function scan() {
    var feed = root.BrynnelFeed;
    var books = await feed.loadBooks();
    var markets = books.rows;
    var liquid = markets.filter(volumeOk);
    var topForBook = liquid.slice(0, 10);
    var candleMarkets = liquid.slice(0, 15);
    var ids = candleMarkets.map(function (m) { return m.marketId; });

    var candleMap = {};
    var bookMap = {};
    var i;
    /* Sequential batches of 4 to stay well under public rate limits. */
    for (i = 0; i < ids.length; i += 4) {
      var chunk = ids.slice(i, i + 4);
      var bars = await Promise.all(chunk.map(function (id) {
        return feed.loadCandles(id, 48).then(function (c) { return [id, c]; });
      }));
      bars.forEach(function (pair) { candleMap[pair[0]] = pair[1]; });
    }
    var bookPairs = await Promise.all(topForBook.map(function (m) {
      return feed.loadBook(m.marketId, 12).then(function (b) { return [m.marketId, b]; });
    }));
    bookPairs.forEach(function (pair) { bookMap[pair[0]] = pair[1]; });

    var filings = []
      .concat(runFunding(markets))
      .concat(runStretch(candleMarkets, candleMap))
      .concat(runBook(topForBook, bookMap))
      .concat(runDrift(candleMarkets, candleMap));

    var journal = loadJournal();
    var fresh = [];
    filings.forEach(function (p) {
      if (alreadyOpen(journal, p.ruleId, p.marketId, 2 * 3600 * 1000)) return;
      appendEntry(p);
      journal = loadJournal();
      fresh.push(p);
    });

    var scanEntry = {
      id: uid(),
      kind: "scan",
      status: "recorded",
      at: new Date().toISOString(),
      reason:
        "Scan closed. " + markets.length + " active perpetual books were read from Lighter mainnet. " +
        ids.length + " markets had hourly candles pulled. " + topForBook.length +
        " books were inspected for tilt. " + filings.length + " rule(s) fired. " +
        fresh.length + " new filing(s) were opened on this device. " +
        "A filing already open on the same rule and market within two hours is not duplicated.",
      evidence: {
        markets: markets.length,
        fired: filings.length,
        opened: fresh.length,
        source: books.source,
        asOf: books.at
      }
    };
    appendEntry(scanEntry);

    return {
      at: books.at,
      markets: markets,
      filings: filings,
      opened: fresh,
      scan: scanEntry,
      journal: loadJournal()
    };
  }

  function openFilings() {
    return loadJournal().filter(function (e) { return e.kind === "proposal" && e.status === "open"; });
  }

  function markFiling(id, status, extra) {
    var list = loadJournal();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        list[i].status = status;
        list[i].resolvedAt = new Date().toISOString();
        if (extra) {
          Object.keys(extra).forEach(function (k) { list[i][k] = extra[k]; });
        }
      }
    }
    saveJournal(list);
    return list;
  }

  root.BrynnelFilings = {
    RULES: RULES,
    MIN_VOLUME: MIN_VOLUME,
    FUNDING_ABS: FUNDING_ABS,
    Z_ABS: Z_ABS,
    BOOK_TILT: BOOK_TILT,
    DRIFT_RET: DRIFT_RET,
    DRIFT_HOURS: DRIFT_HOURS,
    scan: scan,
    loadJournal: loadJournal,
    saveJournal: saveJournal,
    appendEntry: appendEntry,
    openFilings: openFilings,
    markFiling: markFiling,
    JOURNAL_KEY: JOURNAL_KEY
  };
})(window);
