import { utilitas, network } from 'utilitas';
import * as account from './account.mjs';
import * as crypto from './crypto.mjs';
import * as etc from './etc.mjs';
import * as rumsc from './rumsc.mjs';
import config from './config.mjs';
import fs from 'fs';
import hdWalletProvider from '@truffle/hdwallet-provider';
import web3 from 'web3';

let runningInBrowser = false;
try { runningInBrowser = !!window; } catch (e) { }

let solc = null;
if (!runningInBrowser) {
    solc = (await import('solc')).default;
    const uncRjc = 'unhandledRejection';
    const listeners = process.listeners(uncRjc);
    process.removeListener(uncRjc, listeners[listeners.length - 1]);
}

const direcyCall = new Set(['eth.net.getNetworkType']);
const [modName, defaultSol] = ['quorum', 'default.sol'];
const [actCall, actSend] = ['call', 'send'];
const acts = new Set([actCall, actSend]);
const vF = async () => { };
const getEthClient = async (pk, o) => { return (await getClient(pk, o)).eth; };
const log = (content) => { return utilitas.modLog(content, modName); };
const clients = {};

const infoValues = [
    'defaultAccount',
    'transactionBlockTimeout',
    'transactionConfirmationBlocks',
];

const infoToFetch = [
    'eth.getAccounts',
    'eth.getBlockNumber',
    'eth.getChainId',
    'eth.getGasPrice',
    'eth.getHashrate',
    'eth.getNodeInfo',
    'eth.isMining',
    'eth.isSyncing',
    'eth.net.getNetworkType',
    'eth.net.getPeerCount',
    'eth.net.isListening',
    // 'eth.getCoinbase',
    // 'eth.getProtocolVersion',
];  // https://github.com/ethereum/go-ethereum/issues/19194

let rpc = null;

const assertString = (str, error, code = 400) => {
    return utilitas.assert(utilitas.isString(str) && str.length, error, code);
};

const assertObject = (object, error, code = 400) => {
    return utilitas.assert(utilitas.isObject(object), error, code);
};

const getRpcUrl = async (options) => {
    options = options || {};
    const c = await config();
    if (!options.rpcapi && !rpc) {
        if (c.speedTest) {
            if (c.debug) { log('Evaluating RPC API nodes...'); }
            rpc = await network.pickFastestHttpServer(
                c.rpcApi, { debug: c.debug }
            );
        } else { rpc = utilitas.getConfigFromStringOrArray(c.rpcApi); }
    }
    const resp = options.rpcapi || rpc;
    utilitas.assert(resp, 'RPC api root has not been configured', 500);
    return resp;
};

const buildClient = async (privateKey, opts) => {
    utilitas.assert(opts?.noKey || privateKey, 'Private key is required.', 400);
    let provider = (
        opts?.ignoreGivenProvider ? null : web3.givenProvider
    ) || new web3.providers.HttpProvider(await getRpcUrl(opts));
    // https://github.com/ChainSafe/web3.js/issues/1451
    // https://github.com/MetaMask/web3-provider-engine/issues/309
    provider.sendAsync = provider.send;
    // https://stackoverflow.com/questions/67736753/using-local-private-key-with-web3-js/67736754
    privateKey && (provider = new hdWalletProvider({
        privateKeys: [privateKey],
        providerOrUrl: provider,
    }));
    utilitas.assert(provider, 'Error configurating signature provider.', 500);
    const client = new web3(provider);
    utilitas.assert(client, 'Error configurating api client.', 500);
    return client;
};

const buildDefaultClient = async () => {
    return await buildClient(null, { noKey: true });
};

const getClient = async (privateKey, options) => {
    options = options || {};
    const key = privateKey ? crypto.privateKeyToAddress(privateKey) : '_';
    if (key && clients[key]) { return clients[key]; }
    const client = privateKey
        ? await buildClient(privateKey, options)
        : await buildDefaultClient();
    if (key) { clients[key] = client; }
    return client;
};

const objectify = (args) => {
    const o = {}; (args || []).map(x => { o[x.name] = x.value; }); return o;
};

const postProcess = async (contractNameOrHash, data, options) => {
    const contractName = web3.utils.isAddress(contractNameOrHash)
        ? await etc.getContractNameByAddress(contractNameOrHash)
        : contractNameOrHash;
    switch (contractName) {
        case 'RumSC': return await rumsc.unpackTransaction(data, options);
        case 'RumAccount': return await account.unpackTransaction(data, options);
    }
    return data;
};

const getTransactionByHash = async (hash, options) => {
    const [trx, receipt] = await Promise.all([
        (await getEthClient(null, options)).getTransaction(hash, options),
        options?.noReceipt ? vF : getTransactionReceiptByHash(hash, options),
    ]);
    return await packTransaction(trx, receipt, options);
};

const getBlockIdByTransactionHash = async (hash, options) => {
    const { blockHash, blockNumber } = await getTransactionByHash(hash, {
        ...options || {}, noReceipt: true, raw: true
    });
    return { blockHash, blockNumber };
};

const packBlock = async (block, options) => {
    if (block && !options?.raw) {
        block.timestamp = new Date(Number(block.timestamp) * 1000);
    }
    return block;
};

const packTransaction = async (trx, receipt, options) => {
    if (!receipt && !options?.noReceipt) {
        receipt = await getTransactionReceiptByHash(trx.hash, options);
    }
    const contract = await etc.getContractNameByAddress(trx.to, options);
    const input = await decodeMethod(trx.input);
    input.params = await postProcess(contract, input.params);
    for (let logs of receipt?.logs || []) {
        logs.events = await postProcess(contract, logs.events);
    }
    return {
        ...trx,
        ...options?.raw ? {} : { contract, ...input },
        ...receipt ? { receipt } : {},
    };
};

const decodeMethod = async (method, options) => {
    const decoder = await etc.getAbiDecoder(options);
    let resp = {};
    try { resp = decoder.decodeMethod(method) || {}; } catch (e) { }
    if (options?.raw) { return resp; }
    return { ...resp, params: objectify(resp.params) };
};

const decodeLogs = async (logs, options) => {
    const decoder = await etc.getAbiDecoder(options);
    let resp = [];
    try { resp = decoder.decodeLogs(logs) || []; } catch (e) { }
    if (options?.raw) { return resp; }
    for (let i in logs || []) {
        logs[i] = {
            ...logs[i], ...resp[i],
            events: objectify(resp[i]?.events || []),
            contract: await etc.getContractNameByAddress(logs[i].address, options),
        }
    }
    return logs;
};

const getTransactionReceiptByHash = async (hash, opt) => {
    const r = await (await getEthClient(null, opt)).getTransactionReceipt(hash);
    utilitas.assert(r, `Transaction not found: ${hash}.`, 404);
    await decodeLogs(r.logs);
    return r;
};

const getBlockByNumberOrHash = async (numOrHash, options) => {
    let blk = await (await getEthClient(null, options)).getBlock(numOrHash, 1);
    utilitas.assert(blk, `Block not found: ${numOrHash}.`, 404);
    blk = await packBlock(blk, options);
    blk.transactions = await Promise.all((blk?.transactions || []).map(x => {
        return packTransaction(x, null, options);
    }));
    return blk;
};

const initContract = async (abi, address, options) => {
    return new (
        await getEthClient(options?.privateKey, options)
    ).Contract(abi, address);
};

const initPreparedContract = async (name, option) => {
    const { abi, address } = await etc.getAbiByNameOrAddress(name, option);
    return await initContract(abi, option?.contractAddress || address, option);
};

const getPreparedAccount = async (account) => {
    const conf = await config();
    const result = conf?.accounts?.[account] && {
        account: account, privateKey: conf.accounts[account],
        address: crypto.privateKeyToAddress(conf.accounts[account]),
    };
    utilitas.assert(
        result && result.account && result.address && result.privateKey,
        'Account has not been configured.', 501
    );
    return result;
};

const executePreparedContractMethod = async (abi, method, act, arg, opts) => {
    opts?.privateKey && assertString(opts?.privateKey, 'Invalid privateKey.');
    const from = opts?.privateKey ? {
        from: crypto.privateKeyToAddress(opts?.privateKey),
    } : {};
    const ins = await initPreparedContract(abi, opts);
    utilitas.assert(ins.methods?.[method], `Invalid method: '${method}'.`, 400);
    utilitas.assert(acts.has(act), `Invalid action: '${act}'.`, 400);
    let resp = await ins.methods[method].apply(null, arg ?? [])[act](from);
    if (!opts?.raw && resp?.blockHash) {
        resp = await getBlockByNumberOrHash(resp?.blockHash);
    }
    return resp
};

const callPreparedContractMethod = async (abi, method, arg, opts) => {
    return await executePreparedContractMethod(abi, method, actCall, arg, opts);
};

const sendToPreparedContractMethod = async (abi, method, arg, opts) => {
    return await executePreparedContractMethod(abi, method, actSend, arg, opts);
};

const deployContract = async (sol, args, opts) => {
    if (utilitas.isObject(sol)) { } else if (sol) {
        sol = quorum.compile(sol, { single: true, ...options || {} });
    } else { utilitas.throwError('Invalid contract source code.', 400); }
    opts?.privateKey && assertString(opts?.privateKey, 'Invalid privateKey.');
    const from = opts?.privateKey ? {
        from: crypto.privateKeyToAddress(opts?.privateKey),
    } : {};
    const contract = (await initContract(sol.abi, null, opts)).deploy(
        { data: `0x${sol.evm.bytecode.object}`, arguments: args || [], }
    );
    return await contract.send({
        ...from, gas: utilitas.ensureInt(await contract.estimateGas()) + 1,
    });
};

const deployPreparedContract = async (contractName, args, options) => {
    const sol = await etc.getSolByName(contractName, {});
    return await deployContract(sol, args, options);
};

const batchRequest = async (actions, options) => {
    const client = await getClient(options?.privateKey, options);
    const batch = new client.BatchRequest();
    const pms = actions.map(a => {
        a = Array.isArray(a) ? a : [a];
        let act = a.pop();
        const isDirect = direcyCall.has(act);
        if (utilitas.isString(act)) {
            let nAct = client;
            act.split('.').map(x => { nAct = nAct[x]; });
            act = nAct;
        }
        return isDirect ? act(...a) : new Promise((rslv, rjct) => {
            batch.add(act.request(...a, (e, d) => { e ? rjct(e) : rslv(d); }));
        });
    })
    batch.execute();
    return await Promise.all(pms);
};

const getInfo = async (options) => {
    const [client, resp] = [await getEthClient(null, options), {}];
    infoValues.map(x => { resp[x] = client[x]; });
    (await batchRequest(infoToFetch)).map((x, i) => {
        const key = infoToFetch[i].split('.').pop().replace(/^get/i, '');
        resp[key.charAt(0).toLowerCase() + key.slice(1)] = x;
    });
    const [nodes, hostname] = [
        (await config()).nodes, new URL(client._provider.host).hostname
    ];
    for (let i in nodes) {
        if (utilitas.insensitiveCompare(nodes[i].ip, hostname)) {
            Object.assign(resp, { enodeId: nodes[i].id, enodeUri: nodes[i].uri });
        }
    }
    return resp;
};

const getLastIrreversibleBlockNumber = async (options) => {
    return await (await getEthClient(null, options)).getBlockNumber();
};

const compile = (content, options) => {
    utilitas.assert(content, 'Contract source code is required.', 400);
    // https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/
    // master/contracts/token/ERC20/ERC20.sol
    const im = options?.import || ((pth) => {
        let abs, contents;
        if ((abs = pth && pth.replace(/^(@openzeppelin)/, 'node_modules/$1'))) {
            try {
                utilitas.assert(!options?.refresh, "Wolf's Coming!", 200);
                contents = etc.getFileByName(pth);
            } catch (e) {
                contents = fs.readFileSync(abs, 'utf8');
                log(`Import contract source: ${abs}.`);
            }
            dependencies[pth] = contents;
        }
        return { contents };
    });
    const [code, dependencies] = [{
        language: 'Solidity',
        sources: { [defaultSol]: { content } },
        settings: { outputSelection: { '*': { '*': ['*'] } } }
    }, {}];
    const resp = JSON.parse(solc.compile(JSON.stringify(code), { import: im }));
    const [contracts, e] = [resp?.contracts?.[defaultSol], resp?.errors?.['0']];
    const defaultKy = Object.keys(contracts || {})[0];
    utilitas.assert(
        !e && defaultKy,
        e?.message || 'Error compiling contract source code.', 400
    );
    for (let i in contracts || {}) { contracts[i].dependencies = dependencies; }
    if (options?.raw) { return resp; }
    else if (options?.single) { return contracts?.[defaultKy]; }
    return contracts;
};

export {
    assertObject,
    assertString,
    buildClient,
    buildDefaultClient,
    callPreparedContractMethod,
    compile,
    decodeLogs,
    decodeMethod,
    deployContract,
    deployPreparedContract,
    executePreparedContractMethod,
    getBlockByNumberOrHash,
    getBlockIdByTransactionHash,
    getClient,
    getEthClient,
    getInfo,
    getLastIrreversibleBlockNumber,
    getPreparedAccount,
    getRpcUrl,
    getTransactionByHash,
    getTransactionReceiptByHash,
    initContract,
    initPreparedContract,
    sendToPreparedContractMethod,
};