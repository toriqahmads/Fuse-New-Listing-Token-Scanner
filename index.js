const ethers = require('ethers');
const abi = require('./abi.json');
const Telegram = require('./Telegram');
const setting = require('./setting.json');

const telegram = new Telegram();
const wsProvider = new ethers.providers.WebSocketProvider(setting.ws_rpc_node);
const httpProvider = new ethers.providers.JsonRpcProvider(setting.http_rpc_node);

const erc20 = new ethers.utils.Interface(abi.erc20);
const fusefi_factory = new ethers.Contract(setting.fuse_fi_factory_address, abi.factory, wsProvider);
const elk_factory = new ethers.Contract(setting.elk_factory_address, abi.factory, wsProvider);

const EXPECTED_PONG_BACK = 15000;
const KEEP_ALIVE_CHECK_INTERVAL = 7500;
let pingTimeout = null;
let keepAliveInterval = null;

const getTokenName = async (_tokenAddress) => {
  try {
    const calldata = erc20.encodeFunctionData('name');

    const call = await httpProvider.call({
      to: _tokenAddress,
      from: setting.factory_address,
      data: calldata
    });

    const token_name = erc20.decodeFunctionResult('name', call);

    return Promise.resolve(token_name[0]);
  } catch (err) {
    return Promise.reject(err);
  }
}

const getTokenOwner = async (_tokenAddress) => {
  try {
    let owner;
    try {
      const calldata = erc20.encodeFunctionData('owner');

      const call = await httpProvider.call({
        to: _tokenAddress,
        from: setting.factory_address,
        data: calldata
      });

      owner = erc20.decodeFunctionResult('owner', call);
    } catch (e) {
      try {
        const calldata = erc20.encodeFunctionData('getOwner');

        const call = await httpProvider.call({
          to: _tokenAddress,
          from: setting.factory_address,
          data: calldata
        });

        owner = erc20.decodeFunctionResult('getOwner', call);
      } catch (e2) {
        throw e2;
      }
    }

    return Promise.resolve(owner[0]);
  } catch (err) {
    return Promise.reject(err);
  }
}

const getTokenSymbol = async (_tokenAddress) => {
  try {
    const calldata = erc20.encodeFunctionData('symbol');

    const call = await httpProvider.call({
      to: _tokenAddress,
      from: setting.factory_address,
      data: calldata
    });

    const token_symbol = erc20.decodeFunctionResult('symbol', call);

    return Promise.resolve(token_symbol[0]);
  } catch (err) {
    return Promise.reject(err);
  }
}

const getTokenDecimals = async (_tokenAddress) => {
  try {
    const calldata = erc20.encodeFunctionData('decimals');

    const call = await httpProvider.call({
      to: _tokenAddress,
      from: setting.factory_address,
      data: calldata
    });

    const token_decimals = erc20.decodeFunctionResult('decimals', call);

    return Promise.resolve(token_decimals[0]);
  } catch (err) {
    return Promise.reject(err);
  }
}

const getTokenTotalSupply = async (_tokenAddress) => {
  try {
    const calldata = erc20.encodeFunctionData('totalSupply');

    const call = await httpProvider.call({
      to: _tokenAddress,
      from: setting.factory_address,
      data: calldata
    });

    const token_total_supply = erc20.decodeFunctionResult('totalSupply', call);

    return Promise.resolve(token_total_supply[0]);
  } catch (err) {
    return Promise.reject(err);
  }
}

const checkIsRenounced = (_owner) => {
  try {
    return _owner.toLowerCase() == setting.burn_address.toLowerCase() || _owner.toLowerCase() == setting.zero_address.toLowerCase();
  } catch (err) {
    return err;
  }
}

const getTokenDetails = async (_tokenAddress) => {
  try {
    let owner;
    try {
      owner = await getTokenOwner(_tokenAddress);
    } catch (err) {
      owner = 'Undected'
    }

    const name = await getTokenName(_tokenAddress);
    const symbol = await getTokenSymbol(_tokenAddress);
    const decimals = await getTokenDecimals(_tokenAddress);
    const total_supply = await getTokenTotalSupply(_tokenAddress);

    return Promise.resolve({
      owner,
      name,
      symbol,
      decimals,
      total_supply: parseFloat(ethers.utils.formatUnits(total_supply, decimals)).toLocaleString('en-US', { maximumFractionDigits: 8 }),
      is_renounced: checkIsRenounced(owner)
    });
  } catch (err) {
    return Promise.reject(err);
  }
}

const getTokenBalance = async (_tokenAddress, _tokenOwner) => {
  try {
    const calldata = erc20.encodeFunctionData('balanceOf', [_tokenOwner]);

    const call = await httpProvider.call({
      to: _tokenAddress,
      from: setting.factory_address,
      data: calldata
    });

    const balance = erc20.decodeFunctionResult('balanceOf', call);

    return Promise.resolve(balance[0]);
  } catch (err) {
    return Promise.reject(err);
  }
}

const processPair = async (from, token0, token1, pair) => {
  try {
    const token0_detail = await getTokenDetails(token0);
    const token1_detail = await getTokenDetails(token1);
    const balance_liquidity_token0 = ethers.utils.formatUnits(await getTokenBalance(token0, pair), token0_detail.decimals);
    const balance_liquidity_token1 = ethers.utils.formatUnits(await getTokenBalance(token1, pair), token0_detail.decimals);

    const result =  {
      from,
      token0: {
        address: token0,
        detail: token0_detail
      },
      token1: {
        address: token1,
        detail: token1_detail
      },
      pair: {
        pair_name: `${token0_detail.symbol}/${token1_detail.symbol}`,
        address: pair,
        token0_balance: parseFloat(balance_liquidity_token0).toLocaleString('en-US', { maximumFractionDigits: 8 }),
        token1_balace: parseFloat(balance_liquidity_token1).toLocaleString('en-US', { maximumFractionDigits: 8 })
      }
    }

    const message = telegram.parseDataToMessage(result);
    console.log('message', message)
    if (message && message != '') {
      await telegram.postToTelegram(message);
    }
  } catch (err) {
    console.log('err', err);
  }
}

const startConnection = () => {
  wsProvider._websocket.on('open', async () => {
    console.log("Listening Websocket...");

    keepAliveInterval = setInterval(() => {
      wsProvider._websocket.ping();
      pingTimeout = setTimeout(() => {
        wsProvider._websocket.terminate();
      }, EXPECTED_PONG_BACK);
    }, KEEP_ALIVE_CHECK_INTERVAL);

    wsProvider._websocket.on('close', () => {
      console.log("WebSocket Closed... Reconnecting...");
      clearInterval(keepAliveInterval);
      clearTimeout(pingTimeout);
      startConnection();
    });

    wsProvider._websocket.on('error', () => {
      console.log("Error. Attempting to Reconnect...");
      clearInterval(keepAliveInterval);
      clearTimeout(pingTimeout);
      startConnection();
    });

    wsProvider._websocket.on('pong', () => {
      console.log(new Date().toLocaleTimeString(), 'ping');
      clearInterval(pingTimeout);
    });

    fusefi_factory.on('PairCreated', async (token0, token1, pair) => {
      try {
        await processPair('Fuse Fi', token0, token1, pair);
      } catch (err) {
        console.log('err from fuse fi', err);
      }
    });

    elk_factory.on('PairCreated', async (token0, token1, pair) => {
      try {
        await processPair('Elk Finance', token0, token1, pair);
      } catch (err) {
        console.log('err from elk', err);
      }
    });
  });
}

startConnection();
