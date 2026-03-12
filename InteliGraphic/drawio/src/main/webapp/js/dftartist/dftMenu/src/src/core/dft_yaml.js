// core/dft-yaml.js
(function (global) {
    function escScalar(s) {
        if (s == null) return '""';
        s = String(s);
        if (/[:#\-?&*![\]{},>|%@`]|^\s|\s$|\s{2,}|\n/.test(s)) return JSON.stringify(s);
        return s;
    }
    function indent(n) { return '  '.repeat(n); }

    function dumpYAML(value, lvl) {
        lvl = lvl || 0;
        if (value === null || value === undefined) return '""';
        if (typeof value !== 'object') return escScalar(value);

        if (Array.isArray(value)) {
            if (!value.length) return '[]';
            let out = '';
            for (const item of value) {
                if (item && typeof item === 'object') {
                    out += indent(lvl) + '- \n' + dumpYAML(item, lvl + 1);
                } else {
                    out += indent(lvl) + '- ' + dumpYAML(item, 0) + '\n';
                }
            }
            return out.endsWith('\n') ? out : out + '\n';
        } else {
            const keys = Object.keys(value);
            if (!keys.length) return '{}';
            let out = '';
            for (const k of keys) {
                const v = value[k];
                if (v && typeof v === 'object') {
                    const body = dumpYAML(v, lvl + 1);
                    const needNl = (Array.isArray(v) && v.length) || (typeof v === 'object' && Object.keys(v).length);
                    out += indent(lvl) + escScalar(k) + ': ' + (needNl ? '\n' : '') + body;
                } else {
                    out += indent(lvl) + escScalar(k) + ': ' + dumpYAML(v, 0) + '\n';
                }
            }
            return out.endsWith('\n') ? out : out + '\n';
        }
    }

    function withHeader(yaml, header) {
        header = header || '#yaml: dft_db';
        yaml = yaml || '';
        return yaml.trimStart().startsWith('#yaml:') ? yaml : (header + '\n' + yaml);
    }

    global.DFT_YAML = { dumpYAML, withHeader };
})(window);
