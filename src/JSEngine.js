/**
 * JSEngine provides a sandboxed JavaScript execution environment that runs code
 * stored inside the MemFS virtual filesystem. It injects a constrained `process`
 * object so scripts cannot reach the host Node.js process while still exposing
 * argv/env values supplied by the caller.
 */
class JSEngine {
    constructor(memfs) {
        this.fs = memfs;
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

        const code = scriptNode.read();
        const scriptFullPath = scriptNode.getPath();
        const scriptDir = this.#dirname(scriptFullPath);
        const argv = this.#buildArgv(scriptPath, positionalArgs, flagArgs);
        const sandboxEnv = Object.freeze({ ...env });

        const output = [];
        const consoleProxy = {
            log: (...args) => output.push(args.map((a) => String(a)).join(' ')),
            error: (...args) => output.push('ERROR: ' + args.map((a) => String(a)).join(' ')),
            warn: (...args) => output.push('WARN: ' + args.map((a) => String(a)).join(' ')),
        };

        const sandboxProcess = Object.freeze({
            argv,
            env: sandboxEnv,
            cwd: () => this.fs.getCurrentDirectory(),
            exit: (code = 0) => {
                throw new Error(`process.exit is disabled (attempted exit with code ${code})`);
            },
        });

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
            const scriptFunc = new Function(...Object.keys(context), `${code}\n//# sourceURL=${scriptPath}`);
            scriptFunc(...Object.values(context));
        } catch (error) {
            throw new Error(error.message);
        }

        return {
            output: output.join('\n'),
        };
    }

    #buildArgv(scriptPath, positionalArgs, flagArgs) {
        const args = ['node', scriptPath, ...positionalArgs];

        if (flagArgs && typeof flagArgs === 'object') {
            for (const [key, value] of Object.entries(flagArgs)) {
                if (key === undefined || key === null || key === '') {
                    continue;
                }
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
        const targetPath = this.#resolveToAbsolutePath(moduleName, baseDir);
        const node = this.fs.resolvePath(targetPath);

        if (!node || !node.isFile()) {
            throw new Error(`Cannot find module '${moduleName}'`);
        }

        const moduleCode = node.read();
        const module = { exports: {} };
        const moduleDir = this.#dirname(node.getPath());
        const localRequire = (name) => this.#loadModule(name, moduleDir);
        const moduleFunc = new Function('module', 'exports', 'require', moduleCode);
        moduleFunc(module, module.exports, localRequire);
        return module.exports;
    }

    #resolveToAbsolutePath(request, baseDir) {
        if (!request || request === '.') {
            return baseDir;
        }

        if (request.startsWith('/')) {
            return request;
        }

        if (request.startsWith('./') || request.startsWith('../')) {
            const parts = baseDir === '/' ? [] : baseDir.split('/').filter(Boolean);
            const segments = request.split('/').filter((part) => part && part !== '.');

            for (const segment of segments) {
                if (segment === '..') {
                    parts.pop();
                } else {
                    parts.push(segment);
                }
            }

            return '/' + parts.join('/');
        }

        return `/${request}`;
    }

    #dirname(fullPath) {
        if (!fullPath || fullPath === '/') {
            return '/';
        }
        const parts = fullPath.split('/').filter(Boolean);
        parts.pop();
        if (parts.length === 0) {
            return '/';
        }
        return '/' + parts.join('/');
    }
}

module.exports = { JSEngine };
