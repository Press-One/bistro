'use strict';

const { utilitas } = require('..');
const path = require('path');
const fs = require('fs');

const func = async (argv) => {
    const acts = {};
    fs.readdirSync(__dirname).filter((file) => {
        return /\.js$/i.test(file) && file.toLowerCase() !== 'prs-atm.js';
    }).forEach((file) => {
        let actName = file.replace(
            /^(.*)\.js$/, '$1'
        ).replace(/^act/i, '').toLowerCase();
        acts[actName] = require(path.join(__dirname, file));
    });
    const info = {};
    argv._ = argv._.map((x) => { return x.toLowerCase(); });
    const find = {};
    for (let i in acts) {
        if (argv._.length) {
            let check = false;
            for (let j of argv._) {
                if (`${i}${acts[i].name.toLowerCase()}`.includes(j)) {
                    check = find[j] = true; break;
                }
            }
            if (!check) { continue; }
        } else if (acts[i].hide) { continue; }
        info[i] = acts[i].name;
    }
    utilitas.assert(Object.keys(info).length, 'Command not found.', 400);
    return info;
};

module.exports = {
    func,
    name: 'List available commands',
    example: [
        {
            title: 'listing all commands',
        },
        {
            title: 'searching commands',
            args: 'ballot info',
        },
    ],
    render: {
        renderAll: true,
        table: {
            KeyValue: true,
            config: { columns: { 0: { width: 14 }, 1: { width: 59 } } },
        },
    },
};
