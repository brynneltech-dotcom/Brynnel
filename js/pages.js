(function (root) {
  "use strict";

  function sh() { return root.BrynnelShell; }
  function feed() { return root.BrynnelFeed; }
  function ink() { return root.BrynnelInk; }
  function S() { return root.BRYNNEL_SETTINGS; }

  function mountApp(page, html) {
    return sh().mount({ page: page, kind: "app", html: html || "" });
  }

  function home() {
    if (root.BrynnelHome) return root.BrynnelHome.render();
    throw new Error("The landing module did not load.");
  }

  function markets() {
    var el = mountApp("markets",
      "<h1>Markets</h1>" +
      '<p class="lede">Active Lighter perpetual books on mainnet, sorted by quoted volume. Figures are read live from the public API.</p>' +
      '<div class="card" id="mkt-box"><p class="muted">Reading Lighter…</p></div>'
    );
    feed().loadBooks().then(function (books) {
      var rows = books.rows || [];
      var box = document.getElementById("mkt-box");
      if (!rows.length) {
        box.innerHTML = '<p class="empty">The public API returned no active perpetual books.</p>';
        return;
      }
      box.innerHTML =
        '<p class="muted" style="margin-top:0">' + rows.length + " active books · as of " + sh().when(books.at) + "</p>" +
        '<div style="overflow:auto"><table class="table"><thead><tr>' +
        "<th>Market</th><th>Mark</th><th>24h volume</th><th>Hourly funding</th><th>Cap</th>" +
        "</tr></thead><tbody>" +
        rows.map(function (m) {
          var fc = m.fundingHourly == null ? "" : (m.fundingHourly >= 0 ? "up" : "down");
          return '<tr><td><span class="sym">' + sh().escapeHtml(m.symbol) + "</span></td>" +
            '<td class="num">' + sh().usd(m.mark, 2) + "</td>" +
            '<td class="num">' + sh().money(m.volumeQuote, 0) + "</td>" +
            '<td class="num ' + fc + '">' + (m.fundingHourly == null ? "—" : sh().pct(m.fundingHourly, 4)) + "</td>" +
            '<td class="num">' + (m.maxLeverage ? m.maxLeverage + "×" : "—") + "</td></tr>";
        }).join("") +
        "</tbody></table></div>";
    }).catch(function (err) {
      document.getElementById("mkt-box").innerHTML = '<p class="err">' + sh().escapeHtml(err.message || String(err)) + "</p>";
    });
    return el;
  }

  function agents() {
    var el = mountApp("agents", "");
    var list = (root.BrynnelStudio && root.BrynnelStudio.loadAgents()) || [];
    var open = (root.BrynnelFilings && root.BrynnelFilings.openFilings()) || [];
    var body;
    if (!list.length) {
      body = '<div class="card"><p class="empty">No agents are stored in this browser yet. Build one in Studio and run it on this device. Results are not shared with a Brynnel server.</p><p><a class="btn btn-coral" href="/studio">Open Studio</a></p></div>';
    } else {
      body = '<div class="stack">' + list.map(function (a) {
        var bt = a.backtest || {};
        return '<div class="card"><div class="row" style="justify-content:space-between">' +
          '<div><h3 style="margin:0">' + sh().escapeHtml(a.name) + "</h3>" +
          '<div class="muted">' + sh().escapeHtml(a.status) + " · stored " + sh().when(a.createdAt) + "</div></div>" +
          '<span class="pill ' + (bt.returnPct >= 0 ? "up" : "down") + '">Backtest ' + sh().pct(bt.returnPct) + "</span></div>" +
          '<p class="muted" style="margin:10px 0 0">Hold over the same closes: ' + sh().pct(bt.holdReturnPct) +
          " · " + (bt.bars || "—") + " hourly closes · " + (bt.trades || 0) + " turns. This figure is not live PnL.</p></div>";
      }).join("") + "</div>";
    }
    var filings = open.length
      ? '<div class="card" style="margin-top:16px"><h3>Open filings on this device</h3>' +
        open.map(function (p) {
          return '<div class="tx-row"><div><strong>' + sh().escapeHtml(p.ruleName || p.ruleId) + " · " + sh().escapeHtml(p.symbol || "") +
            "</strong><div class=\"muted\">" + sh().escapeHtml(p.reason || "") + "</div></div>" +
            '<span class="pill">' + sh().escapeHtml(p.side || "") + "</span></div>";
        }).join("") +
        '<p class="status">Send a filing from the Dashboard after you unlock a key. Brynnel will not place it on its own.</p></div>'
      : "";
    sh().fill(
      "<h1>Agents</h1>" +
      '<p class="lede">Agents stored in this browser, plus any open filings from the last scan. Nothing here is a shared leaderboard or a custodial account.</p>' +
      body + filings
    );
    return el;
  }

  function studio() {
    var el = mountApp("studio", "");
    root.BrynnelStudio.render(document.querySelector(".main-narrow"));
    return el;
  }

  function swap() {
    var el = mountApp("swap", "");
    root.BrynnelSwap.render(document.querySelector(".main-narrow"));
    return el;
  }

  function leaderboard() {
    var el = mountApp("leaderboard",
      "<h1>Leaderboard</h1>" +
      '<p class="lede">Ranked by the backtest you ran in Studio on this device. There is no Brynnel-wide ranking — this site has no server of agent results.</p>' +
      '<div class="card" id="lb"></div>'
    );
    var list = ((root.BrynnelStudio && root.BrynnelStudio.loadAgents()) || []).slice().sort(function (a, b) {
      return ((b.backtest && b.backtest.returnPct) || -Infinity) - ((a.backtest && a.backtest.returnPct) || -Infinity);
    });
    var box = document.getElementById("lb");
    if (!list.length) {
      box.innerHTML = '<p class="empty">No agents have been run on this device, so there is nothing to rank. Backtest and run an agent in Studio to see it here.</p>';
      return el;
    }
    box.innerHTML = '<table class="table"><thead><tr><th>#</th><th>Agent</th><th>Signal</th><th>Hold</th><th>Closes</th></tr></thead><tbody>' +
      list.map(function (a, i) {
        var bt = a.backtest || {};
        return '<tr><td class="num">' + (i + 1) + "</td><td>" + sh().escapeHtml(a.name) +
          '<span class="sub">' + sh().when(a.createdAt) + "</span></td>" +
          '<td class="num">' + sh().pct(bt.returnPct) + "</td>" +
          '<td class="num">' + sh().pct(bt.holdReturnPct) + "</td>" +
          '<td class="num">' + (bt.bars || "—") + "</td></tr>";
      }).join("") + "</tbody></table>";
    return el;
  }

  function activity() {
    var el = mountApp("activity",
      "<h1>Activity</h1>" +
      '<p class="lede">Scans, filings, and agent events recorded in this browser. This is not a global feed.</p>' +
      '<div class="card" id="act"></div>'
    );
    var journal = (root.BrynnelFilings && root.BrynnelFilings.loadJournal()) || [];
    var agents = (root.BrynnelStudio && root.BrynnelStudio.loadAgents()) || [];
    var events = journal.slice().map(function (e) {
      return { at: e.at, title: (e.kind || "event") + (e.ruleId ? " · " + e.ruleId : ""), body: e.reason || e.symbol || "", status: e.status };
    });
    agents.forEach(function (a) {
      events.push({ at: a.createdAt, title: "Agent stored", body: a.name, status: a.status });
    });
    events.sort(function (a, b) { return new Date(b.at) - new Date(a.at); });
    var box = document.getElementById("act");
    if (!events.length) {
      box.innerHTML = '<p class="empty">No activity has been recorded on this device yet. A scan from the Dashboard or a Studio run will show up here.</p>';
    } else {
      box.innerHTML = events.slice(0, 40).map(function (e) {
        return '<div class="tx-row"><div><strong>' + sh().escapeHtml(e.title) + "</strong>" +
          '<div class="muted">' + sh().escapeHtml(e.body || "") + "</div></div>" +
          '<div class="muted">' + sh().when(e.at) + (e.status ? " · " + sh().escapeHtml(e.status) : "") + "</div></div>";
      }).join("");
    }
    return el;
  }

  function stats() {
    var el = mountApp("stats",
      "<h1>Stats</h1>" +
      '<p class="lede">Counts from the public Lighter API and from what this browser has stored. Brynnel has no server-side database.</p>' +
      '<div class="grid-3" id="st"><div class="card">Reading Lighter…</div></div>'
    );
    Promise.all([
      feed().loadBooks(),
      Promise.resolve((root.BrynnelFilings && root.BrynnelFilings.loadJournal()) || []),
      Promise.resolve((root.BrynnelStudio && root.BrynnelStudio.loadAgents()) || [])
    ]).then(function (pair) {
      var books = pair[0];
      var journal = pair[1];
      var agents = pair[2];
      var rows = books.rows || [];
      var vol = rows.reduce(function (s, m) { return s + (m.volumeQuote || 0); }, 0);
      document.getElementById("st").innerHTML =
        '<div class="card"><div class="faint">Active books</div><div class="px-lg num">' + rows.length + '</div><p class="muted">From Lighter mainnet, as of ' + sh().when(books.at) + ".</p></div>" +
        '<div class="card"><div class="faint">Quoted 24h volume</div><div class="px-lg num">' + sh().money(vol, 0) + '</div><p class="muted">USDG, summed across the books returned in this request.</p></div>' +
        '<div class="card"><div class="faint">On this device</div><div class="px-lg num">' + agents.length + '</div><p class="muted">Stored agents. Journal entries: ' + journal.length + ".</p></div>";
    }).catch(function (err) {
      document.getElementById("st").innerHTML = '<div class="card"><p class="err">' + sh().escapeHtml(err.message || String(err)) + "</p></div>";
    });
    return el;
  }

  function dashboard() {
    var el = mountApp("dashboard",
      "<h1>Dashboard</h1>" +
      '<p class="lede">Connect a wallet on Robinhood Chain, register or unlock a Lighter API key in slot ' + ink().slot + ", then scan and sign. Brynnel never holds the funds.</p>" +
      '<div class="grid-2"><div class="stack" id="dash-left"></div><div class="stack" id="dash-right"></div></div>'
    );
    var state = { address: sh().currentWallet(), account: null, rec: null, busy: false, scan: null, credit: "10" };

    function left() {
      var addr = state.address;
      document.getElementById("dash-left").innerHTML =
        '<div class="card">' +
          "<h3>Wallet</h3>" +
          (addr ? '<p class="mono">' + sh().escapeHtml(addr) + "</p>" : '<p class="muted">No wallet is connected in this session.</p>') +
          '<div class="row">' +
            '<button type="button" class="btn btn-coral" data-login>' + (addr ? "Disconnect" : "Log in") + "</button>" +
          "</div>" +
          '<p class="status" id="dash-wstat"></p>' +
        "</div>" +
        '<div class="card">' +
          "<h3>Lighter key · slot " + ink().slot + "</h3>" +
          '<p class="muted">The secret stays sealed in this browser. Registering it asks your wallet for a personal sign on Robinhood Chain.</p>' +
          '<div class="row">' +
            '<button type="button" class="btn" data-reg>Register key</button>' +
            '<button type="button" class="btn btn-ghost" data-unlock>Unlock key</button>' +
          "</div>" +
          '<p class="status" id="dash-kstat">' + (state.rec ? "A key is unlocked for account " + state.rec.accountIndex + "." : "No key is unlocked.") + "</p>" +
        "</div>" +
        '<div class="card">' +
          "<h3>Credit USDG</h3>" +
          '<p class="muted">This calls the official Lighter deposit contract. You approve USDG and sign the deposit from your wallet.</p>' +
          '<label class="field">Amount in USDG<input class="input" id="credit-amt" value="' + sh().escapeHtml(state.credit) + '"></label>' +
          '<button type="button" class="btn btn-coral" data-credit>Deposit</button>' +
          '<p class="status" id="dash-cstat"></p>' +
        "</div>";
      bindDash();
    }

    function right() {
      var filings = (root.BrynnelFilings && root.BrynnelFilings.openFilings()) || [];
      document.getElementById("dash-right").innerHTML =
        '<div class="card">' +
          "<h3>Scan</h3>" +
          '<p class="muted">Read live books, hourly closes, and top-of-book tilt. Filings that fire are stored on this device only.</p>' +
          '<button type="button" class="btn btn-coral" data-scan>Scan now</button>' +
          '<p class="status" id="dash-sstat"></p>' +
        "</div>" +
        '<div class="card"><h3>Open filings</h3>' +
        (filings.length ? filings.map(function (p) {
          return '<div class="tx-row"><div><strong>' + sh().escapeHtml((p.ruleId || "") + " · " + (p.symbol || "")) +
            "</strong><div class=\"muted\">" + sh().escapeHtml(p.reason || "") + "</div></div>" +
            '<button type="button" class="btn btn-soft" data-send="' + sh().escapeHtml(p.id) + '">Sign ' + sh().escapeHtml(p.side || "") + "</button></div>";
        }).join("") : '<p class="empty">No open filings on this device. Run a scan.</p>') +
        "</div>";
      bindDash();
    }

    function bindDash() {
      var login = document.querySelector("[data-login]");
      if (login) login.onclick = function () {
        sh().login().then(function () { state.address = sh().currentWallet(); refreshAccount(); left(); }).catch(showErr);
      };
      var reg = document.querySelector("[data-reg]");
      if (reg) reg.onclick = onRegister;
      var un = document.querySelector("[data-unlock]");
      if (un) un.onclick = onUnlock;
      var cr = document.querySelector("[data-credit]");
      if (cr) cr.onclick = onCredit;
      var sc = document.querySelector("[data-scan]");
      if (sc) sc.onclick = onScan;
      document.querySelectorAll("[data-send]").forEach(function (b) {
        b.onclick = function () { onSend(b.getAttribute("data-send")); };
      });
      var c = document.getElementById("credit-amt");
      if (c) c.oninput = function (e) { state.credit = e.target.value; };
    }

    function showErr(err) {
      var el = document.getElementById("dash-wstat") || document.getElementById("dash-sstat");
      if (el) el.textContent = err.message || String(err);
      else alert(err.message || String(err));
    }

    async function refreshAccount() {
      if (!state.address) return;
      try {
        var acc = await feed().accountsFor(state.address);
        state.account = acc;
        var box = document.getElementById("dash-wstat");
        if (box) box.textContent = "Lighter account lookup returned for this address.";
      } catch (e) {
        var box2 = document.getElementById("dash-wstat");
        if (box2) box2.textContent = e.message || String(e);
      }
    }

    async function needAddr() {
      if (!state.address) {
        await sh().login();
        state.address = sh().currentWallet();
      }
      if (!state.address) throw new Error("Log in first.");
      return state.address;
    }

    async function accountIndex() {
      var acc = await feed().accountsFor(state.address);
      var list = acc.sub_accounts || acc.accounts || acc.l1_accounts || [];
      if (Array.isArray(acc.accounts) && acc.accounts.length) list = acc.accounts;
      if (typeof acc.account_index === "number") return acc.account_index;
      if (list && list[0] && list[0].account_index != null) return list[0].account_index;
      if (list && list[0] && list[0].index != null) return list[0].index;
      throw new Error("No Lighter account index was returned for this address. Create or credit an account first.");
    }

    async function onRegister() {
      var st = document.getElementById("dash-kstat");
      try {
        var addr = await needAddr();
        await ink().onRobinhood();
        var idx = await accountIndex();
        state.rec = await ink().registerKey(addr, idx);
        if (st) st.textContent = "Key registered and unlocked for account " + idx + ".";
      } catch (e) { if (st) st.textContent = e.message || String(e); }
    }

    async function onUnlock() {
      var st = document.getElementById("dash-kstat");
      try {
        var addr = await needAddr();
        var idx = await accountIndex();
        state.rec = await ink().unlockKey(addr, idx);
        if (st) st.textContent = "Key unlocked for account " + idx + ".";
      } catch (e) { if (st) st.textContent = e.message || String(e); }
    }

    async function onCredit() {
      var st = document.getElementById("dash-cstat");
      try {
        var addr = await needAddr();
        await ink().onRobinhood();
        var amt = Number(state.credit);
        if (!Number.isFinite(amt) || amt < (S().minCredit || 1)) throw new Error("Enter at least " + (S().minCredit || 1) + " USDG.");
        var units = ink().toInt(amt, S().usdgDecimals);
        var allow = await ink().usdgAllowance(addr);
        if (allow < units) {
          if (st) st.textContent = "Approve USDG in your wallet…";
          var h1 = await ink().approveUsdg(addr, units);
          await ink().txReceipt(h1);
        }
        if (st) st.textContent = "Confirm the deposit in your wallet…";
        var h2 = await ink().creditAccount(addr, units);
        await ink().txReceipt(h2);
        if (st) st.innerHTML = 'Deposit sent. <a href="' + S().explorer + "/tx/" + h2 + '" target="_blank" rel="noopener noreferrer">Open on the explorer</a>.';
      } catch (e) { if (st) st.textContent = e.message || String(e); }
    }

    async function onScan() {
      var st = document.getElementById("dash-sstat");
      try {
        if (st) st.textContent = "Reading Lighter mainnet…";
        state.scan = await root.BrynnelFilings.scan();
        if (st) st.textContent = state.scan.scan.reason;
        right();
      } catch (e) { if (st) st.textContent = e.message || String(e); }
    }

    async function onSend(id) {
      try {
        if (!state.rec) throw new Error("Unlock or register a key first.");
        var list = root.BrynnelFilings.loadJournal();
        var p = list.find(function (x) { return x.id === id; });
        if (!p) throw new Error("That filing is no longer in the journal.");
        var books = await feed().loadBooks();
        var market = (books.rows || []).find(function (m) { return m.marketId === p.marketId; });
        if (!market) throw new Error("The market is no longer in the live book list.");
        var usd = 10;
        await ink().fileOrder(state.rec, market, p.side, usd, 1, 0.01);
        root.BrynnelFilings.markFiling(id, "sent", { sentAt: new Date().toISOString(), sizeUsdg: usd });
        right();
      } catch (e) { alert(e.message || String(e)); }
    }

    left();
    right();
    if (state.address) refreshAccount();
    root.addEventListener("brynnel:wallet", function () {
      state.address = sh().currentWallet();
      left();
      if (state.address) refreshAccount();
    });
    return el;
  }

  function settings() {
    var s = S();
    function row(k, v) {
      return '<tr><td style="width:200px" class="muted">' + sh().escapeHtml(k) + '</td><td class="mono" style="word-break:break-all">' + sh().escapeHtml(v) + "</td></tr>";
    }
    mountApp("settings",
      "<h1>Settings</h1>" +
      '<p class="lede">Public venue parameters used by this site. Social accounts stay hidden until the URLs are set.</p>' +
      '<div class="card"><table class="table"><tbody>' +
        row("Venue", s.venueName + " · mainnet") +
        row("Execution chain", s.evmName + " · chain ID " + s.evmChainId) +
        row("Signing chain ID", String(s.signChainId)) +
        row("REST", s.rest) +
        row("Collateral", s.collateral + " · " + s.usdg) +
        row("Deposit contract", s.lighterContract) +
        row("API key slot", String(s.apiKeySlot)) +
        row("Uniswap quoter", s.quoter) +
        row("Uniswap router", s.swapRouter) +
        row("X", s.x || "Not set — the sidebar link stays hidden.") +
        row("GitHub", s.github || "Not set — the footer link stays hidden.") +
        row("Theme", "Light is the default. Use the sun/moon control in the sidebar to switch. The choice is stored in this browser.") +
      "</tbody></table></div>"
    );
  }

  function docs() {
    mountApp("docs",
      "<h1>Docs</h1>" +
      '<div class="stack">' +
        '<div class="card"><h3>What Brynnel is</h3><p class="muted">A workshop for rule-based agents on Lighter perpetuals, on Robinhood Chain mainnet. An agent can propose. You approve and sign from your own wallet. There is no custodial account in this product.</p></div>' +
        '<div class="card"><h3>Written rules</h3><p class="muted"><strong>F01 Funding harvest</strong> — when the hourly funding rate’s absolute value is at least 0.012%, propose short if longs pay, long if shorts pay.</p><p class="muted"><strong>F02 Stretch fade</strong> — when the last hourly close is at least two standard deviations from the previous 36 closes, fade the stretch.</p><p class="muted"><strong>F03 Book tilt</strong> — when one side of the visible top of book holds at least 68% of size, follow that side. This needs a live book and is not backtested in Studio.</p><p class="muted"><strong>F04 Hourly drift</strong> — when the last eight hours moved at least 3.5% with six or more steps in that direction, follow the move.</p></div>' +
        '<div class="card"><h3>Studio backtests</h3><p class="muted">Studio reads hourly closes (and, for F01, hourly fundings) from the public Lighter API. A 30-day request may return fewer than 720 bars; the page reports the window that actually came back. The path starts at $10,000 virtual and does not deduct a taker fee, because this API does not publish a single public fee schedule.</p></div>' +
        '<div class="card"><h3>Swap</h3><p class="muted">Quotes and swaps use Uniswap v3 on Robinhood Chain: USDG/WETH at fee 0.01%, and USDG/cbBTC at fee 0.05%. ETH in the panel is the WETH token, not native ETH. BTC is cbBTC. Perpetual marks on the chart come from Lighter and can differ from the pool.</p></div>' +
        '<div class="card"><h3>Keys</h3><p class="muted">A Lighter API key is generated in the browser, registered to slot 21, and sealed to a personal sign from your wallet. Losing the browser storage means registering a new key. Brynnel cannot recover it.</p></div>' +
      "</div>"
    );
  }

  function devlog() {
    mountApp("devlog",
      "<h1>Dev log</h1>" +
      '<p class="lede">Only work that is actually live in this build is listed. No future dates, no invented shipping history.</p>' +
      '<div class="card">' +
        "<h3>17 Nov 2026</h3>" +
        '<p class="muted">The app shell, Studio backtests on Lighter mainnet hourly closes, and a Swap page that quotes and can execute through verified Uniswap v3 USDG pools on Robinhood Chain are in this build. Dashboard can register a key, credit USDG, scan, and sign a filing. Nothing has been published to GitHub or a public domain yet. Social links stay hidden until those accounts exist.</p>' +
      "</div>"
    );
  }

  function terms() {
    mountApp("terms",
      "<h1>Terms</h1>" +
      '<div class="card stack">' +
        '<p class="muted">Brynnel is software that helps you read public Lighter data, backtest written rules, and sign your own transactions. It is not a broker, an exchange, a custodian, or investment advice.</p>' +
        '<p class="muted">Perpetual futures are risky. You can lose the funds in your wallet and in your Lighter account. You are responsible for every transaction you sign.</p>' +
        '<p class="muted">Agents, journals, and sealed keys live in this browser unless you export them yourself. Brynnel does not run a server that stores your positions or keys.</p>' +
        '<p class="muted">This site talks to Lighter mainnet and to Robinhood Chain mainnet.</p>' +
        '<p class="muted">The contract address is on the Token page.</p>' +
      "</div>"
    );
  }

  function token() {
    var ca = (S() && S().tokenCa) || "";
    function link(href, label) {
      return '<a href="' + sh().escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">' + sh().escapeHtml(label) + "</a>";
    }
    mountApp("token",
      "<h1>Token</h1>" +
      '<div class="card stack">' +
        '<table class="table"><tbody>' +
          '<tr><td class="muted" style="width:160px">Chain</td><td>Robinhood Chain mainnet</td></tr>' +
          '<tr><td class="muted">Symbol</td><td>$BRYNNEL</td></tr>' +
        "</tbody></table>" +
        '<div><p class="muted" style="margin:0">Contract address</p>' + sh().caBox() + "</div>" +
        '<div class="token-links">' +
          link("https://robinhoodchain.blockscout.com/token/" + ca, "Explorer") +
          link("https://ponsfamily.com/launchpad/" + ca, "Pons") +
          link("https://www.geckoterminal.com/robinhood/pools/0x71984b9683495ddd791ea50ede92a2492aa37254", "GeckoTerminal") +
        "</div>" +
        '<p class="token-burn muted">Burn: 10,285,956.66 BRYNNEL sent to 0x...dEaD (1.0286% of 1,000,000,000 supply). ' +
          link("https://robinhoodchain.blockscout.com/tx/0xef545aad81a787589c8b3b2eeeb89b8ffd10e3fa6023dfe0927b81c15f14dc1e", "Transaction") +
        "</p>" +
      "</div>"
    );
  }

  root.BrynnelPages = {
    home: home,
    markets: markets,
    agents: agents,
    studio: studio,
    swap: swap,
    leaderboard: leaderboard,
    activity: activity,
    stats: stats,
    dashboard: dashboard,
    settings: settings,
    docs: docs,
    devlog: devlog,
    terms: terms,
    token: token
  };
})(window);
