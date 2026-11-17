(function (root) {
  "use strict";

  var S = root.BRYNNEL_SETTINGS;
  var WASM_SRC = "/vendor/lighter-signer.wasm";
  var SEAL_KEY = "brynnel.sealed-key.v1";
  var boot = null;
  var runtime = null;

  function must(name) {
    var fn = root[name];
    if (typeof fn !== "function") throw new Error("The official signer is missing " + name + ".");
    return fn;
  }

  function unwrap(res) {
    if (res && res.error) throw new Error(res.error);
    return res;
  }

  async function bootSigner() {
    if (boot) return boot;
    boot = (async function () {
      if (typeof root.Go !== "function") throw new Error("The Go WASM runtime did not load.");
      runtime = new root.Go();
      var res = await fetch(WASM_SRC);
      if (!res.ok) throw new Error("The official Lighter signer could not be fetched (" + res.status + ").");
      var kind = res.headers.get("content-type") || "";
      var instance;
      if (WebAssembly.instantiateStreaming && kind.indexOf("application/wasm") !== -1) {
        instance = (await WebAssembly.instantiateStreaming(res, runtime.importObject)).instance;
      } else {
        var buf = await res.arrayBuffer();
        instance = (await WebAssembly.instantiate(buf, runtime.importObject)).instance;
      }
      runtime.run(instance);
      await new Promise(function (r) { setTimeout(r, 0); });
      must("GenerateAPIKey");
      return true;
    })();
    try {
      return await boot;
    } catch (err) {
      boot = null;
      throw err;
    }
  }

  function mintKeypair() { return unwrap(must("GenerateAPIKey")()); }

  function bindClient(secret, apiSlot, accountIndex) {
    return unwrap(must("CreateClient")("", secret, Number(S.signChainId), Number(apiSlot), Number(accountIndex)));
  }

  function authToken(hours, apiSlot, accountIndex) {
    var until = Math.floor(Date.now() / 1000) + Math.round((hours || 6) * 3600);
    return unwrap(must("CreateAuthToken")(until, Number(apiSlot), Number(accountIndex)));
  }

  function signPubKey(publicKey, nonce, apiSlot, accountIndex) {
    return unwrap(must("SignChangePubKey")(publicKey, 0, Number(nonce), Number(apiSlot), Number(accountIndex)));
  }

  function signOrder() {
    return unwrap(must("SignCreateOrder").apply(null, arguments));
  }

  function signLeverage() {
    return unwrap(must("SignUpdateLeverage").apply(null, arguments));
  }

  /* --- EIP-1193 --- */
  function provider() {
    var eth = root.ethereum;
    if (!eth) return null;
    if (Array.isArray(eth.providers) && eth.providers.length) {
      return eth.providers.find(function (p) { return p.isMetaMask; }) || eth.providers[0];
    }
    return eth;
  }

  async function rpc(method, params) {
    var p = provider();
    if (!p) throw new Error("No EIP-1193 wallet was found in this browser.");
    return p.request({ method: method, params: params });
  }

  async function connectWallet() {
    var list = await rpc("eth_requestAccounts");
    if (!list || !list[0]) throw new Error("The wallet returned no address.");
    return list[0];
  }

  async function currentAccounts() {
    try { return await rpc("eth_accounts"); } catch (e) { return []; }
  }

  function padHex(hex, bytes) {
    var h = String(hex).replace(/^0x/, "");
    if (h.length % 2) h = "0" + h;
    return h.padStart(bytes * 2, "0");
  }

  function encAddr(addr) { return padHex(addr.toLowerCase(), 32); }

  function encUint(n, bytes) {
    var v = typeof n === "bigint" ? n : BigInt(n);
    return padHex(v.toString(16), bytes);
  }

  async function personalSign(address, message) {
    return rpc("personal_sign", [message, address]);
  }

  async function evmId() { return parseInt(await rpc("eth_chainId"), 16); }

  async function onRobinhood() {
    var want = Number(S.evmChainId);
    var have = await evmId();
    if (have === want) return;
    var hex = "0x" + want.toString(16);
    try {
      await rpc("wallet_switchEthereumChain", [{ chainId: hex }]);
    } catch (err) {
      var code = err && (err.code || (err.data && err.data.originalError && err.data.originalError.code));
      if (code === 4902 || /unrecognized|not added/i.test(String(err && err.message))) {
        await rpc("wallet_addEthereumChain", [{
          chainId: hex,
          chainName: S.evmName,
          nativeCurrency: { name: S.nativeSymbol, symbol: S.nativeSymbol, decimals: 18 },
          rpcUrls: [S.rpc],
          blockExplorerUrls: S.explorer ? [S.explorer] : undefined
        }]);
        await rpc("wallet_switchEthereumChain", [{ chainId: hex }]);
      } else {
        throw err;
      }
    }
    if (await evmId() !== want) throw new Error("The wallet is not on Robinhood Chain yet.");
  }

  async function ethCall(to, data) {
    return rpc("eth_call", [{ to: to, data: data }, "latest"]);
  }

  async function ethSend(from, to, data) {
    return rpc("eth_sendTransaction", [{ from: from, to: to, data: data }]);
  }

  function asUint(hex) {
    if (!hex || hex === "0x") return 0n;
    return BigInt(hex);
  }

  async function usdgBalance(owner) {
    return asUint(await ethCall(S.usdg, "0x70a08231" + encAddr(owner)));
  }

  async function usdgAllowance(owner) {
    return asUint(await ethCall(S.usdg, "0xdd62ed3e" + encAddr(owner) + encAddr(S.lighterContract)));
  }

  async function approveUsdg(from, amount) {
    return ethSend(from, S.usdg, "0x095ea7b3" + encAddr(S.lighterContract) + encUint(amount, 32));
  }

  async function creditAccount(from, amount) {
    /* deposit(address,uint16,uint8,uint256) selector 0x8a857083 */
    var data = "0x8a857083" + encAddr(from) + encUint(S.usdgAssetIndex, 32) + encUint(0, 32) + encUint(amount, 32);
    return ethSend(from, S.lighterContract, data);
  }

  /* --- sealed key on this device --- */
  function wrapText(address) {
    return "Brynnel seals a Lighter API key for " + address.toLowerCase() +
      " at slot " + S.apiKeySlot + " on Robinhood Chain mainnet. The signature stays in this browser.";
  }

  function bytesOf(hex) {
    var h = hex.replace(/^0x/, "");
    if (h.length % 2) h = "0" + h;
    var out = new Uint8Array(h.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
    return out;
  }

  async function keyFromSig(sig) {
    var hash = await crypto.subtle.digest("SHA-256", bytesOf(sig));
    return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
  }

  async function sealRecord(record, sig) {
    var key = await keyFromSig(sig);
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var plain = new TextEncoder().encode(JSON.stringify(record));
    var cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, plain);
    return {
      v: 1,
      address: record.address,
      slot: record.apiSlot,
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(cipher))
    };
  }

  async function unsealRecord(stored, sig) {
    var key = await keyFromSig(sig);
    var iv = new Uint8Array(stored.iv);
    var data = new Uint8Array(stored.data);
    var plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, data);
    return JSON.parse(new TextDecoder().decode(plain));
  }

  function readSealed(address) {
    try {
      var all = JSON.parse(localStorage.getItem(SEAL_KEY) || "{}");
      return all[address.toLowerCase()] || null;
    } catch (e) { return null; }
  }

  function writeSealed(address, stored) {
    var all = {};
    try { all = JSON.parse(localStorage.getItem(SEAL_KEY) || "{}"); } catch (e) { all = {}; }
    all[address.toLowerCase()] = stored;
    localStorage.setItem(SEAL_KEY, JSON.stringify(all));
  }

  function dropSealed(address) {
    var all = {};
    try { all = JSON.parse(localStorage.getItem(SEAL_KEY) || "{}"); } catch (e) { all = {}; }
    delete all[address.toLowerCase()];
    localStorage.setItem(SEAL_KEY, JSON.stringify(all));
  }

  function toInt(value, decimals) {
    var n = Number(value) * Math.pow(10, Number(decimals) || 0);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n);
  }

  function clientOrderId() {
    return (Date.now() % Math.pow(2, 35)) * 1000 + Math.floor(Math.random() * 1000);
  }

  async function waitUntilListed(accountIndex, publicKey) {
    var want = String(publicKey).replace(/^0x/, "").toLowerCase();
    var stop = Date.now() + 30000;
    while (Date.now() < stop) {
      var body = await root.BrynnelFeed.listedKeys(accountIndex, S.apiKeySlot);
      var got = body.api_keys && body.api_keys[0] && body.api_keys[0].public_key;
      if (got && String(got).replace(/^0x/, "").toLowerCase() === want) return;
      await new Promise(function (r) { setTimeout(r, 1000); });
    }
    throw new Error("The key was sent, but Lighter has not listed it yet. Wait a moment and read the account again.");
  }

  async function registerKey(address, accountIndex) {
    await bootSigner();
    var pair = mintKeypair();
    bindClient(pair.privateKey, S.apiKeySlot, accountIndex);
    var nonce = await root.BrynnelFeed.nextNonce(accountIndex, S.apiKeySlot);
    var tx = signPubKey(pair.publicKey, nonce, S.apiKeySlot, accountIndex);
    if (!tx.messageToSign) throw new Error("The signer did not return a message for the wallet.");
    var l1 = await personalSign(address, tx.messageToSign);
    var info = JSON.parse(tx.txInfo);
    info.L1Sig = l1;
    var sent = await root.BrynnelFeed.sendSigned({ txType: tx.txType, txInfo: JSON.stringify(info) });
    await waitUntilListed(accountIndex, pair.publicKey);
    var rec = {
      address: address.toLowerCase(),
      secret: pair.privateKey,
      publicKey: pair.publicKey,
      apiSlot: S.apiKeySlot,
      accountIndex: accountIndex
    };
    var wrap = await personalSign(address, wrapText(address));
    writeSealed(address, await sealRecord(rec, wrap));
    return { record: rec, sent: sent };
  }

  async function unlockKey(address, accountIndex) {
    var stored = readSealed(address);
    if (!stored) throw new Error("No sealed key for this address is stored in this browser.");
    var wrap = await personalSign(address, wrapText(address));
    var rec = await unsealRecord(stored, wrap);
    rec.accountIndex = accountIndex;
    rec.apiSlot = rec.apiSlot || S.apiKeySlot;
    await bootSigner();
    bindClient(rec.secret, rec.apiSlot, rec.accountIndex);
    return rec;
  }

  async function fileOrder(rec, market, side, usd, leverage, slipPct) {
    if (!rec) throw new Error("Unlock or register a key before a filing can be sent.");
    if (!market) throw new Error("The market is missing.");
    var px = Number(market.mark);
    if (!Number.isFinite(px) || px <= 0) throw new Error("No mark price is available from Lighter.");
    if (!Number.isFinite(usd) || usd <= 0) throw new Error("Enter a size in USDG.");
    if (market.minQuote && usd < market.minQuote) {
      throw new Error("The venue minimum on this market is " + market.minQuote + " USDG.");
    }
    var base = usd / px;
    if (market.minBase && base < market.minBase) {
      throw new Error("That size is below the base minimum of " + market.minBase + " " + market.symbol + ".");
    }
    var baseAmount = toInt(base, market.sizeDecimals);
    if (baseAmount <= 0) throw new Error("The size rounds to zero at this market's size decimals.");
    var slip = Number.isFinite(slipPct) && slipPct >= 0 ? slipPct : 0.01;
    var isAsk = side === "short" ? 1 : 0;
    var worst = side === "short" ? px * (1 - slip) : px * (1 + slip);
    var price = toInt(worst, market.priceDecimals);
    if (price <= 0) throw new Error("Slippage would make the limit price zero.");
    var lev = Number(leverage) || 1;
    var cap = market.maxLeverage || 1;
    if (lev < 1 || lev > cap) throw new Error("Leverage must be between 1× and the venue cap of " + cap + "×.");
    var fraction = Math.round(10000 / lev);

    await bootSigner();
    bindClient(rec.secret, rec.apiSlot, rec.accountIndex);
    var nonceLev = await root.BrynnelFeed.nextNonce(rec.accountIndex, rec.apiSlot);
    var levTx = signLeverage(market.marketId, fraction, 0, 0, nonceLev, rec.apiSlot, rec.accountIndex);
    await root.BrynnelFeed.sendSigned(levTx);

    var nonceOrd = await root.BrynnelFeed.nextNonce(rec.accountIndex, rec.apiSlot);
    var orderTx = signOrder(
      market.marketId, clientOrderId(), baseAmount, price, isAsk,
      1, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      nonceOrd, rec.apiSlot, rec.accountIndex
    );
    return root.BrynnelFeed.sendSigned(orderTx);
  }

  async function tokenBalance(token, owner) {
    return asUint(await ethCall(token, "0x70a08231" + encAddr(owner)));
  }

  async function tokenAllowance(token, owner, spender) {
    return asUint(await ethCall(token, "0xdd62ed3e" + encAddr(owner) + encAddr(spender)));
  }

  async function approveToken(from, token, spender, amount) {
    return ethSend(from, token, "0x095ea7b3" + encAddr(spender) + encUint(amount, 32));
  }

  async function txReceipt(hash) {
    for (var i = 0; i < 60; i++) {
      var rec = await rpc("eth_getTransactionReceipt", [hash]);
      if (rec) return rec;
      await new Promise(function (r) { setTimeout(r, 1500); });
    }
    throw new Error("The transaction was sent, but a receipt was not found in time. Check the explorer.");
  }

  root.BrynnelInk = {
    bootSigner: bootSigner,
    connectWallet: connectWallet,
    currentAccounts: currentAccounts,
    personalSign: personalSign,
    onRobinhood: onRobinhood,
    usdgBalance: usdgBalance,
    usdgAllowance: usdgAllowance,
    approveUsdg: approveUsdg,
    creditAccount: creditAccount,
    registerKey: registerKey,
    unlockKey: unlockKey,
    fileOrder: fileOrder,
    readSealed: readSealed,
    dropSealed: dropSealed,
    wrapText: wrapText,
    provider: provider,
    slot: S.apiKeySlot,
    toInt: toInt,
    rpc: rpc,
    ethCall: ethCall,
    ethSend: ethSend,
    encAddr: encAddr,
    encUint: encUint,
    asUint: asUint,
    tokenBalance: tokenBalance,
    tokenAllowance: tokenAllowance,
    approveToken: approveToken,
    txReceipt: txReceipt
  };
})(window);
