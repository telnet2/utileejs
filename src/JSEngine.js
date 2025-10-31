const path = require('path').posix;
const { MemFSAdapter } = require('./MemFSAdapter');

class JSEngine {
    constructor(memfs) {
        this.fs = memfs;
        this.fsAdapter = new MemFSAdapter(memfs);
        this.moduleCache = new Map();
    }

    runScript(scriptPath, options = {}) {
        const {
            positionalArgs = [],
            flagArgs = {},
            env = {},
        } = options;

        const scriptNode = this.fs.resolvePath(scriptPath);
        if (!scriptNode) {
            throw new Error(`cannot find module '${scriptPath}'`);
        }
        if (!scriptNode.isFile()) {
            throw new Error(`'${scriptPath}' is a directory`);
        }

        this.moduleCache.clear();

        const code = scriptNode.read();
        const scriptFullPath = scriptNode.getPath();
        const scriptDir = this.#dirname(scriptFullPath);
        const argv = this.#buildArgv(scriptFullPath, positionalArgs, flagArgs);
        const sandboxEnv = Object.freeze({ ...env });

        const output = [];
        const consoleProxy = {
            log: (...args) => output.push(args.map((a) => String(a)).join(' ')),
            error: (...args) => output.push('ERROR: ' + args.map((a) => String(a)).join(' ')),
            warn: (...args) => output.push('WARN: ' + args.map((a) => String(a)).join(' ')),
        };

        const memfs = this.fs;
        const sandboxProcess = {
            argv,
            env: sandboxEnv,
            cwd: () => memfs.getCurrentDirectory(),
            chdir: (dir) => {
                memfs.changeDirectory(dir);
            },
            exit: (code = 0) => {
                throw new Error(`process.exit is disabled (attempted exit with code ${code})`);
            },
        };
        Object.freeze(sandboxProcess);

        const requireFn = (moduleName) => this.#loadModule(moduleName, scriptDir);

        const context = {
            console: consoleProxy,
            process: sandboxProcess,
            require: requireFn,
            __dirname: scriptDir,
            __filename: scriptFullPath,
            module: { exports: {} },
            exports: {},
        };

        try {
            const scriptFunc = new Function(...Object.keys(context), `${code}\n//# sourceURL=${scriptFullPath}`);
            scriptFunc(...Object.values(context));
        } catch (error) {
            throw new Error(error.message);
        }

        return {
            output: output.join('\n'),
        };
    }

    #buildArgv(scriptFullPath, positionalArgs, flagArgs) {
        const args = ['node', scriptFullPath, ...positionalArgs];

        if (flagArgs && typeof flagArgs === 'object') {
            for (const [key, value] of Object.entries(flagArgs)) {
                if (!key) continue;
                const prefix = key.length === 1 ? '-' : '--';
                if (value === true) {
                    args.push(`${prefix}${key}`);
                } else {
                    args.push(`${prefix}${key}`, value);
                }
            }
        }

        return Object.freeze(args);
    }

    #loadModule(moduleName, baseDir) {
        if (!moduleName) {
            throw new Error('Cannot require empty module name');
        }

        if (moduleName === 'fs' || moduleName === 'node:fs') {
            return this.fsAdapter;
        }
        if (moduleName === 'fs/promises' || moduleName === 'node:fs/promises') {
            return this.fsAdapter.promises;
        }
        if (moduleName === 'path' || moduleName === 'node:path') {
            return require('path');
        }
        if (moduleName === 'buffer' || moduleName === 'node:buffer') {
            return require('buffer');
        }

        const targetPath = this.#resolveToAbsolutePath(moduleName, baseDir);
        const candidatePaths = [
            targetPath,
            `${targetPath}.js`,
            path.join(targetPath, 'index.js'),
        ];

        for (const candidate of candidatePaths) {
            if (this.moduleCache.has(candidate)) {
                return this.moduleCache.get(candidate);
            }
        }

        let resolvedPath = null;
        let node = null;

        for (const candidate of candidatePaths) {
            const candidateNode = this.fs.resolvePath(candidate);
            if (candidateNode && candidateNode.isFile()) {
                resolvedPath = candidate;
                node = candidateNode;
                break;
            }
        }

        if (!node) {
            throw new Error(`Cannot find module '${moduleName}'`);
        }

        const moduleCode = node.read();
        const module = { exports: {} };
        const moduleDir = this.#dirname(node.getPath());
        const localRequire = (name) => this.#loadModule(name, moduleDir);

        this.moduleCache.set(resolvedPath, module.exports);

        const moduleFunc = new Function('module', 'exports', 'require', `${moduleCode}\n//# sourceURL=${resolvedPath}`);
        moduleFunc(module, module.exports, localRequire);

        this.moduleCache.set(resolvedPath, module.exports);
        return module.exports;
    }

    #resolveToAbsolutePath(request, baseDir) {
        if (request.startsWith('/')) {
            return path.normalize(request);
        }

        if (request.startsWith('./') || request.startsWith('../')) {
            return path.normalize(path.join(baseDir, request));
        }

        if (request === '.' || request === '') {
            return baseDir;
        }

        return path.normalize(path.join('/', request));
    }

    #dirname(fullPath) {
        if (!fullPath || fullPath === '/') {
            return '/';
        }
        return path.dirname(fullPath);
    }
}

module.exports = { JSEngine };
