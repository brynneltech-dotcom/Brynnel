/* Public site settings. Leave social URLs empty until the accounts exist. */
window.BRYNNEL_SETTINGS = {
  venueName: "Lighter",
  chainName: "Robinhood Chain",
  collateral: "USDG",
  rest: "https://api.rh.lighter.xyz",
  stream: "wss://api.rh.lighter.xyz/stream",
  signChainId: 466324,
  evmChainId: 4663,
  evmName: "Robinhood Chain",
  rpc: "https://rpc.mainnet.chain.robinhood.com",
  explorer: "https://robinhoodchain.blockscout.com",
  nativeSymbol: "ETH",
  lighterContract: "0x94bAB9693Ba2f6358507eFfcbd372b0660AFfF9d",
  usdg: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
  usdgAssetIndex: 3,
  usdgDecimals: 6,
  minCredit: 1,
  apiKeySlot: 21,
  quoter: "0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7",
  swapRouter: "0xcaf681a66d020601342297493863e78c959e5cb2",
  tokens: {
    USDG: {
      key: "USDG",
      symbol: "USDG",
      name: "Global Dollar",
      address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
      decimals: 6
    },
    ETH: {
      key: "ETH",
      symbol: "ETH",
      name: "WETH",
      address: "0x0bd7d308f8e1639fab988df18a8011f41eacad73",
      decimals: 18,
      poolFee: 100,
      lighterMarketId: 0,
      note: "This is the WETH token on Robinhood Chain, not native ETH."
    },
    BTC: {
      key: "BTC",
      symbol: "BTC",
      name: "cbBTC",
      address: "0xcec185eb182c47d1ba1efc84e6959e18cd620be4",
      decimals: 8,
      poolFee: 500,
      lighterMarketId: 1,
      note: "This is Coinbase Wrapped BTC (cbBTC) on Robinhood Chain."
    }
  },
  x: "https://x.com/brynnelapp_",
  github: "",
  tokenCa: "0x5db25eab04dd04123729bd76444016f238cefa5b"
};
