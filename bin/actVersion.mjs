import { config, storage, system, utilitas } from '../index.mjs';

const [exportSsConfig, packed, failed, merged] = [[
    'debug', 'secret', 'speedTest', 'keosApi', 'rpcApi', 'chainApi'
], 'PACKED', 'FAILED', '[MERGED]'];

const verboseCheck = {
    sushitrain_inited: async (argv, data) => {
        const ssConfig = await config();
        exportSsConfig.map(x => {
            data[x] = Array.isArray(ssConfig[x]) && !argv.json
                ? ssConfig[x].join('\n') : ssConfig[x];
        });
        return merged;
    },
    sushibar: system.chkCpVer,
    latest_released_version: async () => {
        return (await system.chkNwVer()).version;
    },
};

const action = async (argv) => {
    const pkg = storage.relative(import.meta.url, '../package.json');
    let data = await utilitas.which(pkg);
    data = data ? {
        package_name: data.name,
        description: data.description,
        package_version: `v${data.version}`,
        node_version: process.version,
        homepage: data.homepage,
        repository: data.repository ? data.repository.url : null,
        author: data.author,
        license: data.license,
        time: new Date().toISOString(),
    } : {};
    for (let p of ['utilitas']) {
        try {
            data[`${p}_version`] = (await utilitas.which(storage.relative(
                import.meta.url, `../node_modules/${p}/package.json`
            ))).version || packed;
        } catch (e) { data[`${p}_version`] = packed; }
    }
    for (let i in argv.debug ? verboseCheck : {}) {
        try {
            const resp = await verboseCheck[i](argv, data);
            if (resp !== merged) { data[i] = resp || failed; }
        } catch (e) {
            data[i] = `${failed}: ${e.message}`;
        }
    }
    return data;
};

export const { func, name, help, example, render } = {
    func: action,
    name: 'List version info',
    help: [
        '    ┌---------------------------------------------------------------┐',
        '    | 1. Please use option `--debug` to get verbose information.    |',
        '    | 2. Please use option `--json` to get structured data.         |',
        '    └---------------------------------------------------------------┘',
    ],
    example: [
        {
            title: 'getting package version',
        },
        {
            title: 'exporting info as json',
            args: {
                json: null,
            }
        },
    ],
};
