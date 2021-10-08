'use strict';

const debugPeers = {
    '12D3KooWNvSZnPi3RrhrTwEY4LuuBeB6K6facKUCJcyWG1aoDd2p': {
        privKey: 'CAESYHyCgD+3HtEHm6kzPO6fuwP+BAr/PxfJKlvAOWhc/IqAwrZjCNn0jz93sSl81cP6R6x/g+iVYmR5Wxmn4ZtzJFnCtmMI2fSPP3exKXzVw/pHrH+D6JViZHlbGafhm3MkWQ==',
        pubKey: 'CAESIMK2YwjZ9I8/d7EpfNXD+kesf4PolWJkeVsZp+GbcyRZ',
    },
    '12D3KooWLV3w42LqUb9MWE7oTzG7vwaFjPw9GvDqmsuDif5chTn9': {
        privKey: 'CAESYI44p8HiCHtCBhuUcetU9XdIEtWvon15a5ZLsfyssSj9nn3mt4oZI0t6wXTHOvIA0GSFWrYkdKp1338oFIambdKefea3ihkjS3rBdMc68gDQZIVatiR0qnXffygUhqZt0g==',
        pubKey: 'CAESIJ595reKGSNLesF0xzryANBkhVq2JHSqdd9/KBSGpm3S',
    },
    '12D3KooWDRHe5x3tEQfZi4yirsdhA3zgqhE8awxAjET7zVF23JHB': {
        privKey: 'CAESYP+GrxgDqKnx79W5l4sgpCEYvNF9bBlCSVu3McENPluhNYVEwxo5KboVuOPnYO6ZOeeTmglqc2vcN8pldRF8lq41hUTDGjkpuhW44+dg7pk555OaCWpza9w3ymV1EXyWrg==',
        pubKey: 'CAESIDWFRMMaOSm6Fbjj52DumTnnk5oJanNr3DfKZXURfJau',
    },
    '12D3KooWQJMnsoT7js35ZgkboxzUjXpVhfvG8cMqZnBJTP4XPuhU': {
        privKey: 'CAESYL1Fwm/+layh15V1ITWkK9tEQLuGeJFi16VkNDUU+GFs1y90DFs9vlkRziuJFZ/QtEIlYZWjFTsNRJxFA/etwCvXL3QMWz2+WRHOK4kVn9C0QiVhlaMVOw1EnEUD963AKw==',
        pubKey: 'CAESINcvdAxbPb5ZEc4riRWf0LRCJWGVoxU7DUScRQP3rcAr',
    },
    '12D3KooWFYyvJysHGbbYiruVY8bgjKn7sYN9axgbnMxrWVkGXABF': {
        privKey: 'CAESYCtlyHA9SQ9F0yO6frmkrFFmboLCzGt8syr0ix8QkuTcVTVAp9JiBXb2xI1lzK6Fn2mRJUxtQIuuW+3V2mu3DZZVNUCn0mIFdvbEjWXMroWfaZElTG1Ai65b7dXaa7cNlg==',
        pubKey: 'CAESIFU1QKfSYgV29sSNZcyuhZ9pkSVMbUCLrlvt1dprtw2W',
    },
    '12D3KooWHFKTMzwerBtsVmtz4ZZEQy2heafxzWw6wNn5PPYkBxJ5': {
        privKey: 'CAESYLU/qFxBHsdsQa63w3MrP8VvxJDyAk7rB7gLnIN01CyibmZCtQc7a1gIEDOGb10maUltL8wJxEdmOw3Bpjo7xrpuZkK1BztrWAgQM4ZvXSZpSW0vzAnER2Y7DcGmOjvGug==',
        pubKey: 'CAESIG5mQrUHO2tYCBAzhm9dJmlJbS/MCcRHZjsNwaY6O8a6',
    },
};

const id = '12D3KooWNvSZnPi3RrhrTwEY4LuuBeB6K6facKUCJcyWG1aoDd2p';

global.chainConfig = {
    debug: 1,
    rumWssPort: 7020,
    rumPeerId: { id, ...debugPeers[id] },
    rumBootstrap: [/*'/ip4/167.114.61.179/tcp/10666/p2p/16Uiu2HAmE7TYnrYtC6tAsWvz4EUGQke1wsdrkw2kt8GFv6brfHFw',*/],
};

const lib = require('.');

(async () => {
    // const nid = ~~process.argv.pop();
    // Config testing env before start {
    const topic = '929dad53-856f-487d-8114-b690af96a2ec';
    const goPeer = '/ip4/127.0.0.1/tcp/7000/p2p/16Uiu2HAmDBYB4L1ndst2pdVRQx8H7wt2VW5Zj59xKVE2witWSWt3';
    // }
    const node = await lib.rump2p.getNode();
    await lib.rump2p.subscribeToGroup(topic, console.log);
    // await lib.rump2p.unsubscribeFromGroup(topic);
    try {
        console.log(`[RUMP2P] Testing ping:`);
        const time = await lib.rump2p.ping(goPeer);
        console.log(`[RUMP2P] Ping success within ${time} μs.`);
        console.log(`[RUMP2P] Testing dial:`);
        const connection = await lib.rump2p.dial(goPeer);
        console.log(`[RUMP2P] Dial success:`, JSON.stringify(connection));
    } catch (e) { console.log(e); }

    // webassambly debug
    // global.jsAdd = (a, b) => { return a + b; };
    // global.jsAsync = async (a, b) => { return a + b; };
    // const go = new Go();
    // const wasm = require('fs').readFileSync('./wasm/main.wasm');
    // const result = await WebAssembly.instantiate(wasm, go.importObject);
    // go.run(result.instance);
    // console.log(returnMap());
    // console.log(add(300, 14));
    // console.log(callJs());
    // console.log(await asyncTest());

})();
