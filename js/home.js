(function (root) {
  "use strict";

  function sh() { return root.BrynnelShell; }
  function feed() { return root.BrynnelFeed; }

  function icoClock() {
    return '<svg class="ico" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="16" stroke="#ff6a3d" stroke-width="2.2"/><path d="M24 16v9l6 4" stroke="#ff6a3d" stroke-width="2.2" stroke-linecap="round"/></svg>';
  }
  function icoPen() {
    return '<svg class="ico" viewBox="0 0 48 48" fill="none"><path d="M14 34l16-16 4 4-16 16H14v-4zM28 16l4-4 4 4-4 4-4-4z" stroke="#ff6a3d" stroke-width="2.2" stroke-linejoin="round"/></svg>';
  }
  function icoCup() {
    return '<svg class="ico" viewBox="0 0 48 48" fill="none"><path d="M16 18h16v6a8 8 0 01-16 0v-6zM16 18H13a3 3 0 000 6h3M32 18h3a3 3 0 010 6h-3M20 34h8" stroke="#ff6a3d" stroke-width="2.2" stroke-linecap="round"/></svg>';
  }
  function icoWallet() {
    return '<svg class="ico" viewBox="0 0 48 48" fill="none"><rect x="12" y="16" width="24" height="18" rx="3" stroke="#ff6a3d" stroke-width="2.2"/><circle cx="30" cy="25" r="1.6" fill="#ff6a3d"/></svg>';
  }
  function icoRocket() {
    return '<svg class="ico" viewBox="0 0 48 48" fill="none"><path d="M24 10c6 6 8 14 8 14s-8 2-14 8c0 0-2-8 6-16z" stroke="#ff6a3d" stroke-width="2.2"/><circle cx="26" cy="18" r="2" stroke="#ff6a3d" stroke-width="2"/><path d="M16 28l-4 8 8-4" stroke="#ff6a3d" stroke-width="2.2" stroke-linecap="round"/></svg>';
  }
  function icoWave() {
    return '<svg class="ico" viewBox="0 0 48 48" fill="none"><path d="M12 30c4-10 6-10 10 0s6 10 10 0 6-10 10 0" stroke="#ff6a3d" stroke-width="2.2" stroke-linecap="round"/></svg>';
  }

  function sparkSvg(bars, up) {
    if (!bars || bars.length < 2) return "";
    var w = 140, h = 36, d = "";
    var ys = bars.map(function (b) { return b.close; });
    var min = Math.min.apply(null, ys), max = Math.max.apply(null, ys);
    if (min === max) { min -= 1; max += 1; }
    bars.forEach(function (b, i) {
      var x = (i / (bars.length - 1)) * w;
      var y = 2 + (1 - (b.close - min) / (max - min)) * (h - 4);
      d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    });
    var color = up ? "#188a4d" : "#c03a32";
    return '<svg viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none"><path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="1.7" stroke-linejoin="round"/></svg>';
  }

  function clock() {
    return new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false });
  }

  function markup() {
    var S = root.BRYNNEL_SETTINGS || {};
    var socials = [];
    if (S.x) socials.push('<a href="' + S.x + '" target="_blank" rel="noopener noreferrer">X</a>');
    if (S.github) socials.push('<a href="' + S.github + '" target="_blank" rel="noopener noreferrer">GitHub</a>');

    return (
      sh().mount && "" , // placeholder, we build full page ourselves
      ""
    );
  }

  /* header is rendered via shell.marketHeader through a local copy: we inject after */
  function pageHtml() {
    var S = root.BRYNNEL_SETTINGS || {};
    var socials = [];
    if (S.x) socials.push('<a href="' + S.x + '" target="_blank" rel="noopener noreferrer">X</a>');
    if (S.github) socials.push('<a href="' + S.github + '" target="_blank" rel="noopener noreferrer">GitHub</a>');
    var header = (function () {
      /* reuse shell by temporarily mounting a stub? simpler: duplicate the header markup via a hidden mount is messy.
         We'll compose using the same structure as shell after mount? Easier to put header in the HTML and call bind(). */
      return "";
    })();

    return (
      '<div class="m-wrap landing" id="landing">' +
        '<div id="landing-header"></div>' +

        '<section class="hero-center">' +
          '<div class="eyebrow-pill"><img src="/assets/mark.png" alt=""> Rule-based agents on Lighter, Robinhood Chain mainnet</div>' +
          '<h1>Write the rules.<span class="accent">Sign the order.</span></h1>' +
          '<p class="lede">Brynnel is a workshop for rule-based agents on Lighter perpetuals. An agent can propose a move. Only your wallet can send it.</p>' +
          '<div class="hero-ctas">' +
            '<a class="btn" href="/studio">Build an agent</a>' +
            '<a class="btn btn-ghost" href="/markets">See live markets</a>' +
          "</div>" +
          '<div class="hero-note">Mainnet only · no token has been launched</div>' +
          '<div class="hero-phones">' +
            '<div class="iphone iphone-l"><div class="screen">' +
              '<div class="island"></div><div class="sb"><span data-clock></span><span>LTE</span></div>' +
              '<div class="ph-title">Studio</div>' +
              '<div class="chip-row"><span class="chip-mini on">Funding harvest</span><span class="chip-mini">Stretch fade</span><span class="chip-mini">Hourly drift</span></div>' +
              '<p class="muted" style="font-size:11px;margin:0 0 8px">Pick one to three books, then replay the hourly closes Lighter actually returns.</p>' +
              '<div class="ph-stat" id="ph-studio-stat"><div class="muted" style="font-size:11px">Backtest vs holding</div><div class="muted" style="font-size:12px">Reading Lighter…</div></div>' +
            "</div></div>" +
            '<div class="iphone iphone-c"><div class="screen">' +
              '<div class="island"></div><div class="sb"><span data-clock></span><span>LTE</span></div>' +
              '<div style="display:flex;justify-content:space-between;align-items:center"><div class="ph-title" style="margin:0" id="ph-center-name">ETH · Hourly drift</div><span class="tag tag-info">Backtest</span></div>' +
              '<p class="muted" style="font-size:11px;text-align:center;margin:8px 0 0">Last window of hourly closes</p>' +
              '<div style="text-align:center;margin:8px 0" id="ph-center-ret"><div class="muted">Reading Lighter…</div></div>' +
              '<div class="spark" id="ph-center-spark" style="height:64px"></div>' +
              '<div class="ph-stat" id="ph-center-note" style="font-size:11px;color:#6d6a73">A signal path against simply holding the same book. Fees are not deducted.</div>' +
            "</div></div>" +
            '<div class="iphone iphone-r"><div class="screen">' +
              '<div class="island"></div><div class="sb"><span data-clock></span><span>LTE</span></div>' +
              '<div class="ph-title">Live book</div>' +
              '<div class="ph-log" id="ph-live-log"><p class="muted" style="font-size:11px">Reading Lighter…</p></div>' +
            "</div></div>" +
          "</div>" +
        "</section>" +

        '<section class="stats-row">' +
          '<div><div class="sl">Markets</div><div class="sn" id="st-markets">—</div></div>' +
          '<div><div class="sl">Agents on this device</div><div class="sn" id="st-agents">—</div></div>' +
          '<div><div class="sl">Filings on this device</div><div class="sn" id="st-filings">—</div></div>' +
          '<div><div class="sl">24h quoted volume</div><div class="sn" id="st-vol">—</div></div>' +
        "</section>" +

        '<section class="desk">' +
          '<div class="desk-brand">' + sh().brandMark() + " Brynnel Studio</div>" +
          '<h2>A <span class="accent">signing</span> desk</h2>' +
          '<p class="lede">Shape an agent, replay its last window of Lighter hourly closes, then run it on this device. Sending an order still takes a signature from your wallet.</p>' +
          '<div class="hero-ctas">' +
            '<a class="btn btn-light" href="/studio">Open the Studio</a>' +
            '<a class="btn btn-ghost-dark" href="/markets">See live markets</a>' +
          "</div>" +
          '<div class="window">' +
            '<div class="win-top"><div class="win-dots"><i></i><i></i><i></i></div><div class="win-url">brynnel / markets</div></div>' +
            '<aside class="win-side">' +
              '<div class="brand">' + sh().brandMark() + " Brynnel</div>" +
              "<div class=\"muted\" style=\"font-size:10px;letter-spacing:.08em;text-transform:uppercase;margin:8px 0 4px\">Explore</div>" +
              '<a>Dashboard</a><a>Studio</a><a class="on">Markets</a><a>Swap</a><a>Leaderboard</a>' +
            "</aside>" +
            '<div class="win-main">' +
              "<h3>Markets</h3>" +
              '<div class="sub">Active Lighter perpetual books on mainnet, by quoted volume.</div>' +
              '<table class="win-table"><thead><tr><th>Market</th><th>Mark</th><th>24h volume</th><th>Hourly funding</th></tr></thead>' +
              '<tbody id="win-rows"><tr><td colspan="4">Reading Lighter…</td></tr></tbody></table>' +
            "</div>" +
          "</div>" +
          '<div class="desk-strategies">' +
            '<div class="sec-kicker">Rules</div>' +
            '<h2>A rule for every<br><span class="accent">market mood.</span></h2>' +
            '<p class="lede">Harvest funding, fade a stretch, or follow an eight-hour drift. Every path is measured against simply holding the same books.</p>' +
            '<div class="strat-grid">' +
              '<div class="strat-card">' + icoRocket() +
                '<div class="k">Collect the payment</div><h3>Funding harvest</h3>' +
                '<p>When Lighter hourly funding is at least 0.012% in absolute value, propose short if longs pay, long if shorts pay.</p>' +
                '<div class="foot"><div>Written rule<div><strong>F01</strong></div></div><div>Backtest it<div><strong><a href="/studio" style="color:#fff">Open Studio</a></strong></div></div></div>' +
              "</div>" +
              '<div class="strat-card">' + icoWave() +
                '<div class="k">Fade the stretch</div><h3>Stretch fade</h3>' +
                '<p>When the last hourly close is at least two standard deviations from the previous 36 closes, fade the move.</p>' +
                '<div class="foot"><div>Written rule<div><strong>F02</strong></div></div><div>Backtest it<div><strong><a href="/studio" style="color:#fff">Open Studio</a></strong></div></div></div>' +
              "</div>" +
              '<div class="strat-card">' + icoClock() +
                '<div class="k">Follow the run</div><h3>Hourly drift</h3>' +
                '<p>When the last eight hours moved at least 3.5% with six or more steps in that direction, follow the move.</p>' +
                '<div class="foot"><div>Written rule<div><strong>F04</strong></div></div><div>Featured below<div><strong id="strat-f04">Reading…</strong></div></div></div>' +
              "</div>" +
            "</div>" +
          "</div>" +
        "</section>" +

        '<section class="sec" id="markets-sec">' +
          '<div class="sec-kicker">Markets</div>' +
          '<h2 class="sec-h">Every book,<br><span class="accent">on Lighter mainnet.</span></h2>' +
          '<p class="sec-lede">Lighter perpetual markets, collateral in USDG, on Robinhood Chain. Figures and sparklines come from the public mainnet API, not a simulated book.</p>' +
          '<div class="mkt-grid" id="mkt-grid"><p class="muted">Reading Lighter…</p></div>' +
          '<div class="perp-label">Perps on Lighter · long or short · mainnet</div>' +
          '<div class="mkt-grid" id="perp-grid"></div>' +
        "</section>" +

        '<section class="how-band"><div class="sec">' +
          '<div class="sec-kicker">How it works</div>' +
          '<h2 class="sec-h">From idea to <span class="accent">a signed order.</span></h2>' +
          '<p class="sec-lede">Write a rule, replay real hourly closes, store the agent on this device, and sign from your own wallet. Brynnel never holds the funds.</p>' +
          '<div class="step-grid">' +
            '<div class="step-card">' + icoClock() + '<div class="k">Step 1</div><h3>Replay the last window</h3><p>Pick one to three Lighter books and a written rule. Studio asks the public API for up to 30 days of hourly closes and reports the window that actually comes back.</p></div>' +
            '<div class="step-card">' + icoPen() + '<div class="k">Step 2</div><h3>Store the agent here</h3><p>A run lives in this browser only. There is no Brynnel server of agents. You can scan and open filings on this device whenever you come back.</p></div>' +
            '<div class="step-card">' + icoCup() + '<div class="k">Step 3</div><h3>Measure against holding</h3><p>Every backtest is shown next to an equal-weight hold of the same books, starting at $10,000 virtual. Fees are not deducted, because Lighter does not publish a single public fee on this API.</p></div>' +
            '<div class="step-card">' + icoWallet() + '<div class="k">Step 4</div><h3>Sign every order</h3><p>A filing is a proposal. Sending it on Lighter takes a key you register in slot 21 and a signature from your wallet on Robinhood Chain.</p></div>' +
          "</div>" +
        "</div></section>" +

        '<section class="sec">' +
          '<div class="sec-kicker">Every hour</div>' +
          '<h2 class="sec-h">The rule proposes. <span class="accent">You sign the order.</span></h2>' +
          '<p class="sec-lede">The path is the same every time: read the book, apply a written rule, record a filing, and wait for you. Nothing is sent without your wallet.</p>' +
          '<div class="loop-line">' +
            '<div class="loop-step"><div class="num">01</div><h3>Read the book</h3><p class="muted">Marks, hourly funding, and closes come from Lighter mainnet.</p></div>' +
            '<div class="loop-step"><div class="num">02</div><h3>Run the rule</h3><p class="muted">F01, F02, or F04 fires only when its written threshold is met.</p></div>' +
            '<div class="loop-step"><div class="num">03</div><h3>Open a filing</h3><p class="muted">The proposal is stored in this browser, with the reason written out.</p></div>' +
            '<div class="loop-step"><div class="num">04</div><h3>You sign</h3><p class="muted">From the Dashboard, a filing becomes a Lighter order only after you sign.</p></div>' +
            '<div class="loop-step"><div class="num">05</div><h3>Keep the record</h3><p class="muted">Activity on this device stays on this device, unless you export it.</p></div>' +
          "</div>" +
        "</section>" +

        '<section class="sec">' +
          '<div class="explain">' +
            "<div>" +
              '<div class="sec-kicker">Filings</div>' +
              '<h2 class="sec-h">Every filing,<br><span class="accent">written down.</span></h2>' +
              '<p class="sec-lede">A rule does not act in silence. When it fires, the reason is stored with the book, the side, and the threshold that was met.</p>' +
              '<ul class="checks">' +
                "<li>The exact threshold: funding, z-score, or eight-hour drift</li>" +
                "<li>A filing stays open on this device until you sign or dismiss it</li>" +
                "<li>What the rules see on the live book is shown on the right, not a global feed of other people’s agents</li>" +
              "</ul>" +
            "</div>" +
            '<div class="log-stack" id="live-log"><p class="muted">Reading Lighter…</p></div>' +
          "</div>" +
        "</section>" +

        '<section class="quote-band">' +
          '<p class="display">Most rules look sharp on a slide. A window of real Lighter hourly closes shows whether they beat simply holding.</p>' +
          '<div class="fact-grid">' +
            '<div class="fact"><div class="big">1 hour</div><p>The candle resolution Studio and the Swap chart read from Lighter.</p></div>' +
            '<div class="fact"><div class="big">30 days</div><p>The window Studio asks for. The page reports how many hourly closes the API actually returned.</p></div>' +
            '<div class="fact"><div class="big">$10,000</div><p>Virtual starting balance for a backtest, split equally across the books you picked.</p></div>' +
            '<div class="fact"><div class="big">You sign</div><p>No Lighter order is sent without a signature from your own wallet.</p></div>' +
          "</div>" +
        "</section>" +

        '<section class="sec">' +
          '<div class="sec-kicker">Track record</div>' +
          '<h2 class="sec-h">Every path next to <span class="accent">just holding.</span></h2>' +
          '<p class="sec-lede">A $10,000 virtual path of Hourly drift on ETH-PERP, compared with holding that book and with cash. Computed in this page from Lighter hourly closes. Fees are not deducted.</p>' +
          '<div class="track-card">' +
            "<div>" +
              '<div class="track-leg"><span><span class="leg-dot" style="background:#ff6a3d"></span>Hourly drift · ETH</span><strong class="num" id="tr-agent">—</strong></div>' +
              '<div class="track-leg"><span><span class="leg-dot" style="background:#9a969f"></span>Holding ETH</span><strong class="num" id="tr-hold">—</strong></div>' +
              '<div class="track-leg"><span><span class="leg-dot" style="background:#d5d1d8"></span>Cash</span><strong class="num">$10,000.00</strong></div>' +
              '<a class="btn btn-ghost" href="/studio" style="margin-top:12px">Try it in the Studio →</a>' +
            "</div>" +
            '<div class="track-chart" id="track-chart"><p class="muted">Reading Lighter…</p></div>' +
          "</div>" +
        "</section>" +

        '<section class="sec">' +
          '<div class="lb-head"><div>' +
            '<div class="sec-kicker">Leaderboard</div>' +
            '<h2 class="sec-h">Agents on <span class="accent">this device.</span></h2>' +
          '</div><a class="btn btn-ghost" href="/leaderboard">Full leaderboard →</a></div>' +
          '<p class="sec-lede">There is no Brynnel-wide ranking. This list is only the agents you have run in this browser, ordered by their Studio backtest.</p>' +
          '<div class="lb-card" id="lb-home"></div>' +
        "</section>" +

        '<section class="next-band">' +
          '<div class="sec-kicker">What is live</div>' +
          '<h2>What is <span class="accent">live today.</span></h2>' +
          '<p class="lede">Only work that is actually in this build is listed. No token, no public agent network, and no GitHub or domain have been published yet.</p>' +
          '<div class="next-grid">' +
            '<div class="next-card"><span class="live">Live</span><h3>Studio, Dashboard, Swap</h3><p>Backtests run on Lighter hourly closes. A Lighter key can be registered in slot 21 and filings can be signed from your wallet. USDG, WETH, and cbBTC swap through verified Uniswap v3 pools on Robinhood Chain.</p></div>' +
            '<div class="next-card"><span class="soon">Not built</span><h3>No token, no public board</h3><p>A Brynnel token has not been launched, and there is no contract address to publish. Agent results are not collected on a server, so a global leaderboard does not exist yet.</p></div>' +
          "</div>" +
        "</section>" +

        '<section class="sec">' +
          '<div class="sec-kicker" style="text-align:center">FAQ</div>' +
          '<h2 class="sec-h" style="text-align:center">Before you <span class="accent">build.</span></h2>' +
          '<div class="faq" style="margin-top:32px">' +
            faq("Does Brynnel hold my funds?", "No. You connect a wallet on Robinhood Chain. Brynnel does not custody USDG, WETH, cbBTC, or a Lighter account. A live order is a transaction you sign.") +
            faq("Is this mainnet?", "Yes. The site talks to Lighter mainnet and to Robinhood Chain mainnet.") +
            faq("How do backtests work?", "Studio reads hourly closes — and, for funding harvest, hourly fundings — from the public Lighter API. It asks for a 30-day window and tells you how many bars actually came back. The path starts at $10,000 virtual and is shown next to a hold of the same books. Fees are not deducted.") +
            faq("Can I swap?", "Yes, for USDG, WETH, and cbBTC, through verified Uniswap v3 pools on Robinhood Chain. ETH in the Swap panel is the WETH token, not native ETH. BTC is cbBTC. You sign the swap from your wallet. The price chart uses Lighter hourly closes, which can differ from the pool.") +
            faq("Is there a token?", "No. No Brynnel token has been launched, and no contract address is published.") +
            faq("Where is an agent stored?", "In this browser, on this device. Losing that storage means losing the stored agent and any sealed key, unless you have exported them yourself.") +
            faq("What is a filing?", "A proposal from a written rule after a scan. It is not an order until you sign it from the Dashboard.") +
            faq("Who can use this?", "Anyone who can connect a wallet on Robinhood Chain. Perpetual futures are risky. You can lose the funds in your wallet and in your Lighter account. Nothing on this site is investment advice.") +
          "</div>" +
        "</section>" +

        '<section class="cta-band"><div class="cta-box">' +
          "<div>" +
            '<div class="sec-kicker">Get started</div>' +
            '<h2>Write a rule.<br><span class="accent">Sign the order.</span></h2>' +
            '<p class="sec-lede">Backtests start at $10,000 virtual in the Studio. Live orders and swaps are signed by you on mainnet. No deposit is paid to Brynnel, because Brynnel never holds the funds.</p>' +
            '<div class="hero-ctas" style="justify-content:flex-start">' +
              '<a class="btn" href="/dashboard">Go to app →</a>' +
              '<a class="btn btn-ghost" href="/studio">Try the Studio</a>' +
            "</div>" +
            '<div class="cta-ticks"><span>✓ Mainnet</span><span>✓ You sign</span><span>✓ No custody</span></div>' +
          "</div>" +
          '<div class="cta-float" id="cta-float"></div>' +
        "</div></section>" +

        '<section class="stay">' +
          "<div><h3>Stay updated</h3><p class=\"muted\" style=\"margin:0\">No mailing list is running yet. When one exists, it will be wired here — this box will not pretend to collect addresses.</p></div>" +
          '<div class="stay-form"><input type="email" placeholder="your@email.com" disabled aria-disabled="true"><button class="btn" type="button" disabled>Notify me</button></div>' +
        "</section>" +

        '<footer>' +
          '<div class="foot-pro">' +
            "<div>" + sh().brandMark() + ' <strong>Brynnel</strong>' +
              '<p class="muted">A workshop for rule-based agents on Lighter perpetuals, Robinhood Chain mainnet.</p></div>' +
            "<div><h4>Product</h4><a href=\"/dashboard\">Dashboard</a><a href=\"/markets\">Markets</a><a href=\"/studio\">Studio</a><a href=\"/swap\">Swap</a><a href=\"/leaderboard\">Leaderboard</a><a href=\"/activity\">Activity</a></div>" +
            "<div><h4>Rules</h4><a href=\"/studio\">Funding harvest</a><a href=\"/studio\">Stretch fade</a><a href=\"/studio\">Hourly drift</a><a href=\"/docs\">Docs</a><a href=\"/devlog\">Dev log</a></div>" +
            "<div><h4>Legal</h4><a href=\"/terms\">Terms</a><a href=\"/token\">Token</a></div>" +
          "</div>" +
          '<div class="foot-legal"><span>© 2026 Brynnel. Trading can lose money. Nothing here is investment advice.</span>' +
            '<div class="foot-socials' + (socials.length ? "" : " hidden") + '">' + socials.join("") + "</div></div>" +
          '<div class="wordmark">Brynnel</div>' +
        "</footer>" +
      "</div>"
    );
  }

  function faq(q, a) {
    return '<div class="faq-item"><button type="button" data-faq><span>' + sh().escapeHtml(q) + '</span><span class="plus">+</span></button><div class="ans">' + sh().escapeHtml(a) + "</div></div>";
  }

  function fmtVol(n) {
    if (n == null || !Number.isFinite(n)) return "—";
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    return sh().money(n, 0);
  }

  function mktCard(m, spark) {
    var chg = m.changePct;
    /* Lighter daily_price_change may already be a percent or a fraction. If abs>1 treat as percent points. */
    var frac = chg == null ? null : chg / 100;
    var up = frac == null ? true : frac >= 0;
    return (
      '<div class="mkt-card">' +
        '<div class="mh"><div class="dot">' + sh().escapeHtml((m.symbol || "?").slice(0, 2)) + "</div>" +
        "<div><div class=\"sym\">" + sh().escapeHtml(m.symbol) + '</div><div class="nm">Lighter perp</div></div></div>' +
        '<div class="spark">' + (spark || "") + "</div>" +
        '<div class="pr"><span class="num">' + sh().usd(m.mark, m.mark >= 100 ? 2 : 3) + '</span><span class="chg ' + (up ? "up" : "down") + '">' +
          (frac == null ? "—" : sh().pct(frac, 1)) + "</span></div>" +
      "</div>"
    );
  }

  function perpCard(m, spark) {
    var fund = m.fundingYearly;
    var chg = m.changePct;
    var frac = chg == null ? null : chg / 100;
    var up = frac == null ? true : frac >= 0;
    return (
      '<div class="mkt-card">' +
        '<div class="mh"><div class="dot">' + sh().escapeHtml((m.symbol || "?").slice(0, 2)) + "</div>" +
        "<div><div class=\"sym\">" + sh().escapeHtml(m.symbol) + '</div><div class="nm">Funding ' +
          (fund == null ? "—" : sh().pct(fund, 1) + "/yr") + "</div></div></div>" +
        '<div class="spark">' + (spark || "") + "</div>" +
        '<div class="pr"><span class="num">' + sh().usd(m.mark, m.mark >= 100 ? 2 : 3) + '</span><span class="chg ' + (up ? "up" : "down") + '">' +
          (frac == null ? "—" : sh().pct(frac, 1)) + "</span></div>" +
      "</div>"
    );
  }

  function f01Preview(rows) {
    var out = [];
    (rows || []).forEach(function (m) {
      if (m.fundingHourly == null || Math.abs(m.fundingHourly) < 0.00012) return;
      out.push({
        symbol: m.symbol,
        side: m.fundingHourly > 0 ? "short" : "long",
        reason: "Hourly funding is " + (m.fundingHourly * 100).toFixed(4) + "%. " +
          (m.fundingHourly > 0 ? "Longs pay shorts." : "Shorts pay longs."),
        mark: m.mark
      });
    });
    out.sort(function (a, b) { return Math.abs((b.reason && 0) || 0); });
    /* sort by abs funding encoded in reason is weak; recompute */
    return out;
  }

  function f01Sorted(rows) {
    var out = [];
    (rows || []).forEach(function (m) {
      if (m.fundingHourly == null || Math.abs(m.fundingHourly) < 0.00012) return;
      out.push(m);
    });
    out.sort(function (a, b) { return Math.abs(b.fundingHourly) - Math.abs(a.fundingHourly); });
    return out;
  }


  function drawTrack(el, agent, hold) {
    var w = el.clientWidth || 640;
    var h = el.clientHeight || 180;
    var pad = { l: 8, r: 8, t: 12, b: 8 };
    var series = (agent || []).concat(hold || []);
    if (series.length < 2) {
      el.innerHTML = '<p class="empty">Not enough hourly closes to draw this path.</p>';
      return;
    }
    var ys = series.map(function (p) { return p.y; }).concat([10000]);
    var min = Math.min.apply(null, ys), max = Math.max.apply(null, ys);
    if (min === max) { min *= 0.99; max *= 1.01; }
    function x(i, n) { return pad.l + (i / Math.max(1, n - 1)) * (w - pad.l - pad.r); }
    function y(v) { return pad.t + (1 - (v - min) / (max - min)) * (h - pad.t - pad.b); }
    function path(rows, color, width) {
      if (!rows || rows.length < 2) return "";
      var d = rows.map(function (p, i) { return (i ? "L" : "M") + x(i, rows.length).toFixed(1) + " " + y(p.y).toFixed(1); }).join(" ");
      return '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + width + '" stroke-linejoin="round"></path>';
    }
    var cashY = y(10000);
    el.innerHTML = '<svg viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none">' +
      '<line x1="' + pad.l + '" y1="' + cashY.toFixed(1) + '" x2="' + (w - pad.r) + '" y2="' + cashY.toFixed(1) + '" stroke="#d5d1d8" stroke-width="1" stroke-dasharray="4 4"></line>' +
      path(hold, "#9a969f", 1.6) +
      path(agent, "#ff6a3d", 2.2) +
      "</svg>";
  }

  async function hydrate(books) {
    var rows = (books && books.rows) || [];
    var agents = (root.BrynnelStudio && root.BrynnelStudio.loadAgents()) || [];
    var journal = (root.BrynnelFilings && root.BrynnelFilings.loadJournal()) || [];
    var vol = rows.reduce(function (s, m) { return s + (m.volumeQuote || 0); }, 0);

    var el;
    el = document.getElementById("st-markets"); if (el) el.textContent = String(rows.length);
    el = document.getElementById("st-agents"); if (el) el.textContent = String(agents.length).padStart(2, "0");
    el = document.getElementById("st-filings"); if (el) el.textContent = String(journal.filter(function (e) { return e.kind === "proposal"; }).length).padStart(2, "0");
    el = document.getElementById("st-vol"); if (el) el.textContent = fmtVol(vol);

    var win = document.getElementById("win-rows");
    if (win) {
      win.innerHTML = rows.slice(0, 7).map(function (m) {
        var fc = m.fundingHourly == null ? "" : (m.fundingHourly >= 0 ? "up" : "down");
        return "<tr><td><strong>" + sh().escapeHtml(m.symbol) + "</strong></td><td class=\"num\">" + sh().usd(m.mark, 2) +
          "</td><td class=\"num\">" + sh().money(m.volumeQuote, 0) + "</td><td class=\"num " + fc + "\">" +
          (m.fundingHourly == null ? "—" : sh().pct(m.fundingHourly, 4)) + "</td></tr>";
      }).join("") || '<tr><td colspan="4">No active books were returned.</td></tr>';
    }

    var live = f01Sorted(rows).slice(0, 5);
    var phLog = document.getElementById("ph-live-log");
    var log = document.getElementById("live-log");
    if (phLog) {
      phLog.innerHTML = live.length ? live.slice(0, 4).map(function (m) {
        var side = m.fundingHourly > 0 ? "SHORT" : "LONG";
        var tag = m.fundingHourly > 0 ? "tag-sell" : "tag-buy";
        return '<div class="item"><span class="tag ' + tag + '">' + side + "</span><strong>" + sh().escapeHtml(m.symbol) +
          "</strong> " + sh().pct(m.fundingHourly, 4) + " hourly. F01 would propose " + side.toLowerCase() + ".</div>";
      }).join("") : '<p class="muted" style="font-size:11px">No book currently clears the F01 funding threshold of 0.012% per hour.</p>';
    }
    if (log) {
      log.innerHTML = live.length ? live.map(function (m) {
        var side = m.fundingHourly > 0 ? "SHORT" : "LONG";
        var tag = m.fundingHourly > 0 ? "tag-sell" : "tag-buy";
        return '<div class="log-card"><div class="meta"><span>F01 · Funding harvest</span><span>Live book</span></div>' +
          '<span class="tag ' + tag + '">' + side + "</span><strong>" + sh().escapeHtml(m.symbol) + "</strong> " +
          "Hourly funding is " + sh().pct(m.fundingHourly, 4) + ". The rule would propose " + side.toLowerCase() +
          " at mark " + sh().usd(m.mark, 2) + ".</div>";
      }).join("") : '<div class="log-card">No live book currently clears the F01 threshold. A scan from the Dashboard will store filings on this device when a rule fires.</div>';
    }

    /* market cards + sparklines for top names */
    var top = rows.slice(0, 15);
    var perps = rows.filter(function (m) {
      return /BTC|ETH|SOL|HYPE|LIT|NEAR|XRP|ZEC|DOGE|BNB/i.test(m.symbol);
    }).slice(0, 10);
    if (!perps.length) perps = rows.slice(0, 8);

    async function withSparks(list, mountId, kind) {
      var box = document.getElementById(mountId);
      if (!box) return;
      box.innerHTML = list.map(function (m) { return kind === "perp" ? perpCard(m, "") : mktCard(m, ""); }).join("");
      var sparks = [];
      for (var i = 0; i < list.length; i += 4) {
        var chunk = list.slice(i, i + 4);
        var part = await Promise.all(chunk.map(function (m) {
          return feed().loadCandles(m.marketId, 48).then(function (c) { return [m.marketId, c]; }).catch(function () { return [m.marketId, []]; });
        }));
        sparks = sparks.concat(part);
      }
      var map = {};
      sparks.forEach(function (p) { map[p[0]] = p[1]; });
      box.innerHTML = list.map(function (m) {
        var bars = map[m.marketId] || [];
        var up = bars.length > 1 ? bars[bars.length - 1].close >= bars[0].close : true;
        var svg = sparkSvg(bars, up);
        return kind === "perp" ? perpCard(m, svg) : mktCard(m, svg);
      }).join("");
    }

    await withSparks(top, "mkt-grid", "spot");
    await withSparks(perps, "perp-grid", "perp");

    /* featured backtest: F04 on ETH if present */
    var eth = rows.find(function (m) { return m.marketId === 0 || m.symbol === "ETH" || m.symbol === "ETH-PERP"; }) || rows[0];
    if (eth && root.BrynnelStudio && root.BrynnelStudio.runBacktest) {
      try {
        var bt = await root.BrynnelStudio.runBacktest([eth], "F04");
        var retEl = document.getElementById("ph-center-ret");
        var nameEl = document.getElementById("ph-center-name");
        var sparkEl = document.getElementById("ph-center-spark");
        var noteEl = document.getElementById("ph-center-note");
        var studioEl = document.getElementById("ph-studio-stat");
        var f04el = document.getElementById("strat-f04");
        if (nameEl) nameEl.textContent = eth.symbol + " · Hourly drift";
        if (retEl) {
          var cls = bt.returnPct >= 0 ? "up" : "down";
          retEl.innerHTML = '<div class="big ' + cls + '" style="font-size:36px;font-weight:800">' + sh().pct(bt.returnPct, 1) + "</div>" +
            '<div class="muted" style="font-size:11px">vs hold ' + sh().pct(bt.holdReturnPct, 1) + " · " + bt.bars + " hourly closes</div>";
        }
        if (sparkEl && bt.path) sh().areaChart(sparkEl, bt.path);
        if (noteEl) noteEl.textContent = (bt.notes && bt.notes[0]) || "";
        if (studioEl) {
          var beat = bt.returnPct - bt.holdReturnPct;
          studioEl.innerHTML = '<div class="muted" style="font-size:11px">Hourly drift on ' + sh().escapeHtml(eth.symbol) + ", vs holding</div>" +
            '<div class="big ' + (beat >= 0 ? "up" : "down") + '">' + (beat >= 0 ? "+" : "") + (beat * 100).toFixed(1) + " pts</div>" +
            '<div class="muted" style="font-size:11px">Signal ' + sh().pct(bt.returnPct, 1) + " · hold " + sh().pct(bt.holdReturnPct, 1) + "</div>";
        }
        if (f04el) f04el.textContent = sh().pct(bt.returnPct, 1) + " vs hold";
        var trA = document.getElementById("tr-agent");
        var trH = document.getElementById("tr-hold");
        if (trA) trA.textContent = sh().usd(bt.endEquity, 2);
        if (trH) trH.textContent = sh().usd(bt.holdEnd, 2);
        var tc = document.getElementById("track-chart");
        if (tc && bt.path) drawTrack(tc, bt.path, bt.holdPath || []);
        var cta = document.getElementById("cta-float");
        if (cta) {
          cta.innerHTML =
            '<div class="cta-mini"><div class="muted" style="font-size:11px">Hourly drift · ' + sh().escapeHtml(eth.symbol) + "</div>" +
              '<div class="big ' + (bt.returnPct >= 0 ? "up" : "down") + '">' + sh().pct(bt.returnPct, 1) + "</div></div>" +
            '<div class="cta-mini"><div class="muted" style="font-size:11px">Versus holding</div>' +
              '<div class="big ' + ((bt.returnPct - bt.holdReturnPct) >= 0 ? "up" : "down") + '">' +
              ((bt.returnPct - bt.holdReturnPct) >= 0 ? "+" : "") + ((bt.returnPct - bt.holdReturnPct) * 100).toFixed(1) + " pts</div></div>";
        }
      } catch (err) {
        var tc2 = document.getElementById("track-chart");
        if (tc2) tc2.innerHTML = '<p class="empty">' + sh().escapeHtml(err.message || String(err)) + "</p>";
      }
    }

    var lb = document.getElementById("lb-home");
    if (lb) {
      if (!agents.length) {
        lb.innerHTML = '<p class="empty" style="padding:28px">No agents have been run on this device, so there is nothing to rank. Backtest and run an agent in Studio to see it here.</p>';
      } else {
        var list = agents.slice().sort(function (a, b) {
          return ((b.backtest && b.backtest.returnPct) || -Infinity) - ((a.backtest && a.backtest.returnPct) || -Infinity);
        }).slice(0, 5);
        lb.innerHTML = '<table><thead><tr><th>#</th><th>Agent</th><th>Rule</th><th>Signal</th><th>vs hold</th></tr></thead><tbody>' +
          list.map(function (a, i) {
            var bt = a.backtest || {};
            return "<tr><td class=\"num\">" + (i + 1) + "</td><td>" + sh().escapeHtml(a.name) + "</td><td>" +
              sh().escapeHtml(a.ruleId || "") + '</td><td class="num">' + sh().pct(bt.returnPct) +
              '</td><td class="num">' + sh().pct((bt.returnPct || 0) - (bt.holdReturnPct || 0)) + "</td></tr>";
          }).join("") + "</tbody></table>";
      }
    }
  }

  function render() {
    var rootEl = document.getElementById("app") || document.body;
    /* header via a temporary mount then extract? We'll inject header HTML by calling shell's private header.
       Simpler: mount market shell with empty body, then replace the footer and inject landing sections.
       Even simpler: write header ourselves with BrynnelShell.bind after. */
    rootEl.innerHTML = pageHtml();
    /* inject marketing header at the top */
    var slot = document.getElementById("landing-header");
    if (slot) {
      /* Use shell to generate the same header: mount into a scratch? We'll recreate using bind after inserting markup. */
      var scratch = document.createElement("div");
      sh().mount({ page: "home", kind: "market", html: "<div></div>" });
      /* mount just overwrote app! Need a different approach. */
    }
  }

  function renderSafe() {
    var app = document.getElementById("app") || document.body;
    /* Build header by briefly using shell internals through a hidden template.
       Patch: add BrynnelShell.marketHeader if we export it. For now, include header markup in pageHtml after exporting. */
    app.innerHTML = pageHtml();
    /* prepend header */
    var wrap = document.getElementById("landing");
    if (wrap && !document.querySelector(".landing .m-nav")) {
      var headerHtml = document.getElementById("landing-header");
      /* filled below if export exists */
      if (root.BrynnelShell.marketHeader && headerHtml) {
        headerHtml.outerHTML = sh().marketHeader("home");
      }
    }
    document.querySelectorAll("[data-clock]").forEach(function (n) { n.textContent = clock(); });
    sh().bind();
    document.querySelectorAll("[data-faq]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var item = btn.closest(".faq-item");
        var open = item.classList.contains("is-open");
        document.querySelectorAll(".faq-item").forEach(function (x) { x.classList.remove("is-open"); });
        if (!open) item.classList.add("is-open");
      });
    });
    feed().loadBooks().then(hydrate).catch(function (err) {
      var g = document.getElementById("mkt-grid");
      if (g) g.innerHTML = '<p class="err">' + sh().escapeHtml(err.message || String(err)) + "</p>";
    });
  }

  root.BrynnelHome = { render: renderSafe };
})(window);
