const axios = require('axios');
const setting = require('./setting.json');

class Telegram {
  api = setting.telegram_api;
  botToken = setting.telegram_bot_token;
  chatIdTarget = setting.chat_id_target;

  constructor (api = '', bot_token = '', chat_id_target = '') {
    if (api && api != '') this.api = api;
    if (bot_token && bot_token != '') this.botToken = bot_token;
    if (chat_id_target && chat_id_target != '') this.chatIdTarget = chat_id_target;
  }

  async postToTelegram (text = '') {
    try {
      await axios.post(
        `${this.api}bot${this.botToken}/sendMessage`,
        {
          chat_id: this.chatIdTarget,
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
          text
        }
      );

      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  }

  parseDataToMessage (data) {
    try {
let message = `
*${data.pair.pair_name} NEW PAIR ON ${data.from}*
============================

PAIR INFO
=================
NAME: ${data.pair.pair_name}
ADDRESS: \`\`\`${data.pair.address}\`\`\`
TOKEN 1 LIQUIDITY: ${data.pair.token0_balance}
TOKEN 2 LIQUIDITY: ${data.pair.token1_balance}
=================
[🔎EXPLORE](${setting.fuse_explorer}/address/${data.pair.address}/contracts) | [📈TRADE](${data.from == 'Fuse Fi' ? setting.fuse_fi_swap : setting.elk_swap}?outputCurrency=${data.token1.address})

TOKEN 1 INFO
=================
NAME: ${data.token0.detail.name}
ADDRESS: \`\`\`${data.token0.address}\`\`\`
SYMBOL: ${data.token0.detail.symbol}
DECIMAL: ${data.token0.detail.decimals}
TOTAL SUPPLY: ${data.token0.detail.total_supply}
OWNER: ${data.token0.detail.owner}
=================
[🔎EXPLORE](${setting.fuse_explorer}/address/${data.token0.address}/contracts)

TOKEN 2 INFO
=================
NAME: ${data.token1.detail.name}
ADDRESS: \`\`\`${data.token1.address}\`\`\`
SYMBOL: ${data.token1.detail.symbol}
DECIMAL: ${data.token1.detail.decimals}
TOTAL SUPPLY: ${data.token1.detail.total_supply}
OWNER: ${data.token1.detail.owner}
=================
[🔎EXPLORE](${setting.fuse_explorer}/address/${data.token1.address}/contracts)

=============================
===DO WITH YOUR OWN RISK===`;

      return message;
    } catch (err) {
      return '';
    }
  }

  parseToMarkDownV2 (message) {
    message = message
      .replace(/\=/g, '\\=')
      .replace(/\./g, '\\.')
      .replace(/\_/g, '\\_')
      .replace(/\*/g, '\\*')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\!/g, '\\!')
      .replace(/\~/g, '\\~')
      .replace(/\+/g, '\\+')
      .replace(/\#/g, '\\#')
      .replace(/\-/g, '\\-')
      .replace(/\|/g, '\\|')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\>/g, '\\>');
  }
}

module.exports = Telegram;
