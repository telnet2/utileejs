const { MemFS } = require('./MemFS');
const { VM } = require('vm');
const { parsePipeline, isInlineHeredoc, parseInlineHeredoc } = require('./CommandParser');

/**
 * Shell-like command interface for MemFS
 */
class MemShell {
    constructor(memfs = null) {
        this.fs = memfs || new MemFS();
        this.stdin = null; // For piped input
    }

    /**
     * Parse command line arguments
     */
    parseArgs(args) {
        const flags = {};
        const positional = [];

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg.startsWith('--')) {
                const key = arg.slice(2);
                const nextArg = args[i + 1];
                if (nextArg && !nextArg.startsWith('-')) {
                    flags[key] = nextArg;
                    i++;
                } else {
                    flags[key] = true;
                }
            } else if (arg.startsWith('-') && arg.length > 1) {
                for (let j = 1; j < arg.length; j++) {
                    flags[arg[j]] = true;
                }
            } else {
                positional.push(arg);
            }
        }

        return { flags, positional };
    }

    /**
     * ls - list directory contents
     */
    ls(args) {
        const { flags, positional } = this.parseArgs(args);
        const pathStr = positional[0] || '.';
        const node = this.fs.resolvePath(pathStr);

        if (!node) {
            throw new Error(`ls: cannot access '${pathStr}': No such file or directory`);
        }

        if (node.isFile()) {
            return flags.l ? this.formatLong([node]) : node.name;
        }

        const children = node.listChildren();

        if (flags.l) {
            return this.formatLong(children);
        }

        if (flags.a) {
            return ['.', '..', ...children.map(c => c.name)].join('\n');
        }

        return children.map(c => c.name).join('\n');
    }

    formatLong(nodes) {
        const lines = nodes.map(node => {
            const type = node.isDirectory() ? 'd' : '-';
            const size = node.isFile() ? node.size().toString().padStart(8) : '0'.padStart(8);
            const date = node.modifiedAt.toISOString().slice(0, 16).replace('T', ' ');
            return `${type}rwxr-xr-x  ${size}  ${date}  ${node.name}`;
        });
        return lines.join('\n');
    }

    /**
     * cat - concatenate and display file contents
     * If stdin is provided and no files, use stdin
     */
    cat(args, stdin = null) {
        const { positional } = this.parseArgs(args);

        // If no files specified and stdin is available, use stdin
        if (positional.length === 0) {
            if (stdin !== null && stdin !== undefined) {
                return stdin;
            }
            throw new Error('cat: missing file operand');
        }

        const outputs = [];
        for (const pathStr of positional) {
            // Support "-" to read from stdin
            if (pathStr === '-' && stdin !== null && stdin !== undefined) {
                outputs.push(stdin);
                continue;
            }

            const node = this.fs.resolvePath(pathStr);
            if (!node) {
                throw new Error(`cat: ${pathStr}: No such file or directory`);
            }
            if (!node.isFile()) {
                throw new Error(`cat: ${pathStr}: Is a directory`);
            }
            outputs.push(node.read());
        }

        return outputs.join('');
    }

    /**
     * pwd - print working directory
     */
    pwd(args) {
        return this.fs.getCurrentDirectory();
    }

    /**
     * cd - change directory
     */
    cd(args) {
        const { positional } = this.parseArgs(args);
        const pathStr = positional[0] || '/';
        this.fs.changeDirectory(pathStr);
        return '';
    }

    /**
     * mkdir - make directories
     */
    mkdir(args) {
        const { flags, positional } = this.parseArgs(args);

        if (positional.length === 0) {
            throw new Error('mkdir: missing operand');
        }

        for (const pathStr of positional) {
            if (flags.p) {
                this.fs.createDirectories(pathStr);
            } else {
                this.fs.createDirectory(pathStr);
            }
        }

        return '';
    }

    /**
     * touch - create empty file or update timestamp
     */
    touch(args) {
        const { positional } = this.parseArgs(args);

        if (positional.length === 0) {
            throw new Error('touch: missing file operand');
        }

        for (const pathStr of positional) {
            const node = this.fs.resolvePath(pathStr);
            if (node) {
                node.modifiedAt = new Date();
            } else {
                this.fs.createFile(pathStr, '');
            }
        }

        return '';
    }

    /**
     * rm - remove files or directories
     */
    rm(args) {
        const { flags, positional } = this.parseArgs(args);

        if (positional.length === 0) {
            throw new Error('rm: missing operand');
        }

        for (const pathStr of positional) {
            this.fs.remove(pathStr, flags.r || flags.R);
        }

        return '';
    }

    /**
     * echo - display a line of text
     */
    echo(args) {
        return args.join(' ');
    }

    /**
     * grep - search for patterns in files
     * If stdin is provided and no files, use stdin
     */
    grep(args, stdin = null) {
        const { flags, positional } = this.parseArgs(args);

        if (positional.length === 0) {
            throw new Error('grep: missing pattern');
        }

        const pattern = positional[0];
        const files = positional.slice(1);

        // If no files and stdin is available, use stdin
        if (files.length === 0 && stdin !== null && stdin !== undefined) {
            const content = stdin;
            const lines = content.split('\n');
            const matchedLines = [];
            const regex = new RegExp(pattern, flags.i ? 'gi' : 'g');

            lines.forEach((line, index) => {
                if (regex.test(line)) {
                    const lineNum = flags.n ? `${index + 1}:` : '';
                    matchedLines.push(`${lineNum}${line}`);
                }
                regex.lastIndex = 0;
            });

            return matchedLines.join('\n');
        }

        if (files.length === 0) {
            throw new Error('grep: missing file operand');
        }

        const regex = new RegExp(pattern, flags.i ? 'gi' : 'g');
        const results = [];

        for (const pathStr of files) {
            const node = this.fs.resolvePath(pathStr);
            if (!node) {
                results.push(`grep: ${pathStr}: No such file or directory`);
                continue;
            }
            if (!node.isFile()) {
                results.push(`grep: ${pathStr}: Is a directory`);
                continue;
            }

            const content = node.read();
            const lines = content.split('\n');
            const matchedLines = [];

            lines.forEach((line, index) => {
                if (regex.test(line)) {
                    const lineNum = flags.n ? `${index + 1}:` : '';
                    const fileName = files.length > 1 ? `${pathStr}:` : '';
                    matchedLines.push(`${fileName}${lineNum}${line}`);
                }
                // Reset regex for global flag
                regex.lastIndex = 0;
            });

            if (matchedLines.length > 0) {
                results.push(matchedLines.join('\n'));
            } else if (flags.v) {
                // Invert match - show non-matching lines
                results.push(lines.join('\n'));
            }
        }

        return results.join('\n');
    }

    /**
     * find - search for files in a directory hierarchy
     */
    find(args) {
        const { flags, positional } = this.parseArgs(args);
        const startPath = positional[0] || '.';
        const node = this.fs.resolvePath(startPath);

        if (!node) {
            throw new Error(`find: '${startPath}': No such file or directory`);
        }

        const results = [];
        const namePattern = flags.name ? new RegExp(flags.name.replace(/\*/g, '.*')) : null;
        const typeFilter = flags.type; // 'f' for file, 'd' for directory

        const traverse = (current, basePath) => {
            const currentPath = basePath || current.getPath();

            // Apply filters
            let shouldInclude = true;
            if (namePattern && !namePattern.test(current.name)) {
                shouldInclude = false;
            }
            if (typeFilter === 'f' && !current.isFile()) {
                shouldInclude = false;
            }
            if (typeFilter === 'd' && !current.isDirectory()) {
                shouldInclude = false;
            }

            if (shouldInclude) {
                results.push(currentPath);
            }

            if (current.isDirectory()) {
                for (const child of current.listChildren()) {
                    const childPath = currentPath === '/' ? `/${child.name}` : `${currentPath}/${child.name}`;
                    traverse(child, childPath);
                }
            }
        };

        traverse(node);
        return results.join('\n');
    }

    /**
     * sed - stream editor for filtering and transforming text
     * If stdin is provided and no file, use stdin
     */
    sed(args, stdin = null) {
        const { positional } = this.parseArgs(args);

        if (positional.length < 1) {
            throw new Error('sed: missing operand');
        }

        const script = positional[0];
        const filePath = positional[1];

        // Parse sed command (support basic s/pattern/replacement/flags)
        const sedMatch = script.match(/^s\/(.+?)\/(.*)\/([gip]*)$/);
        if (!sedMatch) {
            throw new Error(`sed: unsupported command: ${script}`);
        }

        const [, pattern, replacement, flagsStr] = sedMatch;
        const flags = flagsStr.includes('i') ? 'gi' : 'g';
        const regex = new RegExp(pattern, flags);

        // If no file specified and stdin is available, use stdin
        if (!filePath && stdin !== null && stdin !== undefined) {
            return stdin.replace(regex, replacement);
        }

        if (!filePath) {
            throw new Error('sed: missing file operand');
        }

        const node = this.fs.resolvePath(filePath);
        if (!node) {
            throw new Error(`sed: can't read ${filePath}: No such file or directory`);
        }
        if (!node.isFile()) {
            throw new Error(`sed: ${filePath}: Is a directory`);
        }

        let content = node.read();

        if (flagsStr.includes('p')) {
            // Print mode - just return the result
            return content.replace(regex, replacement);
        }

        // Default: modify the file in-place
        content = content.replace(regex, replacement);
        node.write(content);

        return content;
    }

    /**
     * import - import file or directory from real filesystem
     */
    import(args) {
        const { flags, positional } = this.parseArgs(args);

        if (positional.length === 0) {
            throw new Error('import: missing source path');
        }

        const realPath = positional[0];
        const memPath = positional[1] || null;

        try {
            const fs = require('fs');
            const stats = fs.statSync(realPath);

            if (stats.isDirectory()) {
                if (!flags.r && !flags.R) {
                    throw new Error('import: omitting directory (use -r or -R for recursive)');
                }
                this.fs.importDirectory(realPath, memPath);
            } else {
                this.fs.importFile(realPath, memPath);
            }

            return `Imported: ${realPath}`;
        } catch (err) {
            throw new Error(`import: ${err.message}`);
        }
    }

    /**
     * export - export file or directory to real filesystem
     */
    export(args) {
        const { positional } = this.parseArgs(args);

        if (positional.length < 2) {
            throw new Error('export: missing operand (usage: export <mem-path> <real-path>)');
        }

        const memPath = positional[0];
        const realPath = positional[1];

        try {
            const node = this.fs.resolvePath(memPath);
            if (!node) {
                throw new Error(`No such file or directory: ${memPath}`);
            }

            if (node.isDirectory()) {
                this.fs.exportDirectory(memPath, realPath);
            } else {
                this.fs.exportFile(memPath, realPath);
            }

            return `Exported: ${memPath} -> ${realPath}`;
        } catch (err) {
            throw new Error(`export: ${err.message}`);
        }
    }

    /**
     * node - execute JavaScript file in the memory filesystem
     */
    node(args) {
        const { positional } = this.parseArgs(args);

        if (positional.length === 0) {
            throw new Error('node: missing script file');
        }

        const scriptPath = positional[0];
        const scriptArgs = positional.slice(1);

        const node = this.fs.resolvePath(scriptPath);
        if (!node) {
            throw new Error(`node: cannot find module '${scriptPath}'`);
        }
        if (!node.isFile()) {
            throw new Error(`node: '${scriptPath}' is a directory`);
        }

        const code = node.read();

        // Create a context with common globals
        const output = [];
        const context = {
            console: {
                log: (...args) => output.push(args.map(a => String(a)).join(' ')),
                error: (...args) => output.push('ERROR: ' + args.map(a => String(a)).join(' ')),
                warn: (...args) => output.push('WARN: ' + args.map(a => String(a)).join(' ')),
            },
            process: {
                argv: ['node', scriptPath, ...scriptArgs],
                cwd: () => this.fs.getCurrentDirectory(),
                env: {},
            },
            require: (moduleName) => {
                // Try to resolve module from memory filesystem
                const modulePath = moduleName.startsWith('./') || moduleName.startsWith('../')
                    ? moduleName
                    : `./${moduleName}`;
                const moduleNode = this.fs.resolvePath(modulePath);

                if (moduleNode && moduleNode.isFile()) {
                    const moduleCode = moduleNode.read();
                    const module = { exports: {} };
                    const moduleFunc = new Function('module', 'exports', 'require', moduleCode);
                    moduleFunc(module, module.exports, context.require);
                    return module.exports;
                }

                // Fall back to real Node.js require for built-in modules
                try {
                    return require(moduleName);
                } catch (err) {
                    throw new Error(`Cannot find module '${moduleName}'`);
                }
            },
            __dirname: this.fs.getCurrentDirectory(),
            __filename: scriptPath,
            module: { exports: {} },
            exports: {},
        };

        try {
            // Execute the script in the context
            const scriptFunc = new Function(...Object.keys(context), code);
            scriptFunc(...Object.values(context));

            return output.join('\n');
        } catch (err) {
            throw new Error(`node: execution error: ${err.message}`);
        }
    }

    /**
     * write - write text to a file
     */
    write(args) {
        const { positional } = this.parseArgs(args);

        if (positional.length < 2) {
            throw new Error('write: usage: write <file> <content>');
        }

        const filePath = positional[0];
        const content = positional.slice(1).join(' ');

        const node = this.fs.resolvePath(filePath);
        if (node) {
            if (!node.isFile()) {
                throw new Error(`write: ${filePath}: Is a directory`);
            }
            node.write(content);
        } else {
            this.fs.createFile(filePath, content);
        }

        return '';
    }

    /**
     * Execute a single command with optional stdin
     */
    execSingle(commandTokens, stdin = null) {
        if (!commandTokens || commandTokens.length === 0) {
            return '';
        }

        const command = commandTokens[0];
        const args = commandTokens.slice(1);

        const commands = {
            ls: this.ls.bind(this),
            cat: this.cat.bind(this),
            pwd: this.pwd.bind(this),
            cd: this.cd.bind(this),
            mkdir: this.mkdir.bind(this),
            touch: this.touch.bind(this),
            rm: this.rm.bind(this),
            echo: this.echo.bind(this),
            grep: this.grep.bind(this),
            find: this.find.bind(this),
            sed: this.sed.bind(this),
            import: this.import.bind(this),
            export: this.export.bind(this),
            node: this.node.bind(this),
            write: this.write.bind(this),
        };

        if (!commands[command]) {
            throw new Error(`${command}: command not found`);
        }

        // Check if command supports stdin
        const stdinCommands = ['cat', 'grep', 'sed'];
        if (stdinCommands.includes(command) && stdin !== null) {
            return commands[command](args, stdin);
        }

        return commands[command](args);
    }

    /**
     * Execute a pipeline of commands
     */
    execPipeline(pipeline) {
        if (pipeline.length === 0) {
            return '';
        }

        let output = null;

        for (let i = 0; i < pipeline.length; i++) {
            const commandTokens = pipeline[i];
            output = this.execSingle(commandTokens, output);
        }

        return output;
    }

    /**
     * Execute a command with HEREDOC support
     */
    execWithHeredoc(command, content) {
        // Parse the command
        const tokens = command.trim().split(/\s+/);
        const cmd = tokens[0];
        const args = tokens.slice(1);

        const commands = {
            cat: this.cat.bind(this),
            grep: this.grep.bind(this),
            sed: this.sed.bind(this),
            write: (args) => {
                const filePath = args[0];
                if (!filePath) {
                    throw new Error('write: missing file operand');
                }
                const node = this.fs.resolvePath(filePath);
                if (node) {
                    if (!node.isFile()) {
                        throw new Error(`write: ${filePath}: Is a directory`);
                    }
                    node.write(content);
                } else {
                    this.fs.createFile(filePath, content);
                }
                return '';
            },
        };

        if (!commands[cmd]) {
            throw new Error(`${cmd}: command not found or does not support HEREDOC`);
        }

        // For cat, grep, sed - pass content as stdin
        if (['cat', 'grep', 'sed'].includes(cmd)) {
            return commands[cmd](args, content);
        }

        // For write and others, execute with args
        return commands[cmd](args);
    }

    /**
     * Execute a command
     */
    exec(commandLine) {
        if (!commandLine || !commandLine.trim()) {
            return '';
        }

        // Check for inline HEREDOC first (before tokenization)
        if (isInlineHeredoc(commandLine)) {
            const heredocInfo = parseInlineHeredoc(commandLine);
            if (heredocInfo) {
                // Check if there's a pipe after the HEREDOC
                const pipeIndex = commandLine.indexOf('|', commandLine.lastIndexOf(heredocInfo.content));
                if (pipeIndex > 0) {
                    // Extract the pipeline after HEREDOC
                    const remainingPipeline = commandLine.substring(pipeIndex + 1).trim();
                    if (remainingPipeline) {
                        // Execute HEREDOC and pipe to remaining commands
                        const heredocOutput = this.execWithHeredoc(heredocInfo.command, heredocInfo.content);
                        const pipeline = parsePipeline(remainingPipeline);
                        // Create synthetic pipeline starting with heredoc output
                        let output = heredocOutput;
                        for (const commandTokens of pipeline) {
                            output = this.execSingle(commandTokens, output);
                        }
                        return output;
                    }
                }
                // No pipe, just execute HEREDOC
                return this.execWithHeredoc(heredocInfo.command, heredocInfo.content);
            }
        }

        // Check for pipes
        const pipeline = parsePipeline(commandLine);

        if (pipeline.length > 1) {
            // Execute as pipeline
            return this.execPipeline(pipeline);
        }

        // Execute single command
        return this.execSingle(pipeline[0]);
    }
}

module.exports = { MemShell };
