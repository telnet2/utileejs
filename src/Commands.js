const vm = require('vm');

/**
 * POSIX-like command implementations for the in-memory file system
 */
class Commands {
    constructor(memoryFs) {
        this.fs = memoryFs;
    }

    /**
     * cat - concatenate and print files
     * Usage: cat <filename> [filename2 ...]
     */
    cat(args) {
        if (args.length === 0) {
            return 'Usage: cat <filename> [filename2 ...]';
        }

        const outputs = [];
        for (const filename of args) {
            try {
                const content = this.fs.readFile(filename);
                outputs.push(Buffer.isBuffer(content) ? content.toString('utf8') : content);
            } catch (error) {
                outputs.push(`cat: ${filename}: ${error.message}`);
            }
        }

        return outputs.join('\n');
    }

    /**
     * ls - list files
     * Usage: ls [pattern]
     */
    ls(args) {
        const pattern = args[0];
        let files = this.fs.list();

        if (pattern) {
            files = this.fs.find(pattern);
        }

        if (files.length === 0) {
            return pattern ? `ls: no files matching '${pattern}'` : 'No files';
        }

        // Sort alphabetically
        files.sort();

        // Show file sizes
        const output = files.map(filename => {
            try {
                const size = this.fs.getSize(filename);
                return `${size.toString().padStart(8)} ${filename}`;
            } catch (error) {
                return `       ? ${filename}`;
            }
        });

        return output.join('\n');
    }

    /**
     * rm - remove files
     * Usage: rm <filename> [filename2 ...]
     */
    rm(args) {
        if (args.length === 0) {
            return 'Usage: rm <filename> [filename2 ...]';
        }

        const results = [];
        for (const filename of args) {
            try {
                this.fs.deleteFile(filename);
                results.push(`Removed: ${filename}`);
            } catch (error) {
                results.push(`rm: ${filename}: ${error.message}`);
            }
        }

        return results.join('\n');
    }

    /**
     * mv - move/rename file
     * Usage: mv <source> <destination>
     */
    mv(args) {
        if (args.length !== 2) {
            return 'Usage: mv <source> <destination>';
        }

        const [source, dest] = args;
        try {
            this.fs.rename(source, dest);
            return `Renamed: ${source} -> ${dest}`;
        } catch (error) {
            return `mv: ${error.message}`;
        }
    }

    /**
     * grep - search for pattern in files
     * Usage: grep [options] <pattern> [files...]
     * Options: -i (case insensitive), -n (line numbers), -v (invert match)
     */
    grep(args) {
        if (args.length === 0) {
            return 'Usage: grep [options] <pattern> [files...]\nOptions: -i (case insensitive), -n (line numbers), -v (invert match)';
        }

        const options = {
            caseInsensitive: false,
            lineNumbers: false,
            invertMatch: false
        };

        let i = 0;
        // Parse options
        while (i < args.length && args[i].startsWith('-')) {
            const opt = args[i];
            if (opt === '-i') options.caseInsensitive = true;
            if (opt === '-n') options.lineNumbers = true;
            if (opt === '-v') options.invertMatch = true;
            i++;
        }

        if (i >= args.length) {
            return 'grep: missing pattern';
        }

        const pattern = args[i++];
        const files = args.slice(i);

        try {
            const results = this.fs.grep(pattern, files.length > 0 ? files : null, options);

            if (results.length === 0) {
                return '';
            }

            const output = results.map(result => {
                let line = '';
                if (files.length > 1 || files.length === 0) {
                    line += `${result.filename}:`;
                }
                if (options.lineNumbers) {
                    line += `${result.lineNumber}:`;
                }
                line += result.line;
                return line;
            });

            return output.join('\n');
        } catch (error) {
            return `grep: ${error.message}`;
        }
    }

    /**
     * find - find files by name pattern
     * Usage: find <pattern>
     */
    find(args) {
        if (args.length === 0) {
            return 'Usage: find <pattern>';
        }

        const pattern = args[0];
        try {
            const files = this.fs.find(pattern);
            return files.length > 0 ? files.join('\n') : `No files matching: ${pattern}`;
        } catch (error) {
            return `find: ${error.message}`;
        }
    }

    /**
     * sed - stream editor
     * Usage: sed 's/pattern/replacement/[g]' <filename>
     */
    sed(args) {
        if (args.length < 2) {
            return 'Usage: sed \'s/pattern/replacement/[g]\' <filename>';
        }

        const sedExpr = args[0];
        const filename = args[1];

        // Parse sed expression (simplified)
        const match = sedExpr.match(/^s\/(.+?)\/(.+?)\/(g?)$/);
        if (!match) {
            return 'sed: invalid expression (use format: s/pattern/replacement/[g])';
        }

        const pattern = match[1];
        const replacement = match[2];
        const global = match[3] === 'g';

        try {
            const newContent = this.fs.sed(pattern, replacement, filename, { global });
            return `Modified: ${filename}`;
        } catch (error) {
            return `sed: ${error.message}`;
        }
    }

    /**
     * import - import file from real filesystem
     * Usage: import <real_path> [memory_name]
     */
    import(args) {
        if (args.length === 0) {
            return 'Usage: import <real_path> [memory_name]';
        }

        const realPath = args[0];
        const memoryName = args[1] || null;

        try {
            const filename = this.fs.importFile(realPath, memoryName);
            return `Imported: ${realPath} -> ${filename}`;
        } catch (error) {
            return `import: ${error.message}`;
        }
    }

    /**
     * export - export file to real filesystem
     * Usage: export <filename> <real_path>
     */
    export(args) {
        if (args.length < 2) {
            return 'Usage: export <filename> <real_path>';
        }

        const filename = args[0];
        const realPath = args[1];

        try {
            this.fs.exportFile(filename, realPath);
            return `Exported: ${filename} -> ${realPath}`;
        } catch (error) {
            return `export: ${error.message}`;
        }
    }

    /**
     * node - execute JavaScript file
     * Usage: node <filename>
     */
    node(args) {
        if (args.length === 0) {
            return 'Usage: node <filename>';
        }

        const filename = args[0];

        try {
            const code = this.fs.readFile(filename);
            const codeStr = Buffer.isBuffer(code) ? code.toString('utf8') : code;

            // Create a context with access to the file system
            const context = {
                fs: this.fs,
                console: console,
                require: require,
                Buffer: Buffer,
                process: process,
                setTimeout: setTimeout,
                setInterval: setInterval,
                clearTimeout: clearTimeout,
                clearInterval: clearInterval
            };

            vm.createContext(context);

            // Capture output
            let output = '';
            const originalLog = console.log;
            console.log = (...args) => {
                output += args.join(' ') + '\n';
            };

            try {
                vm.runInContext(codeStr, context, {
                    filename: filename,
                    displayErrors: true
                });
            } finally {
                console.log = originalLog;
            }

            return output || '(no output)';
        } catch (error) {
            return `node: ${error.message}\n${error.stack}`;
        }
    }

    /**
     * echo - write text to file or display
     * Usage: echo <text> [> filename]
     */
    echo(args) {
        if (args.length === 0) {
            return '';
        }

        // Check for redirection
        const redirectIndex = args.indexOf('>');

        if (redirectIndex !== -1 && redirectIndex < args.length - 1) {
            const text = args.slice(0, redirectIndex).join(' ');
            const filename = args[redirectIndex + 1];
            try {
                this.fs.writeFile(filename, text + '\n');
                return `Written to: ${filename}`;
            } catch (error) {
                return `echo: ${error.message}`;
            }
        } else {
            return args.join(' ');
        }
    }

    /**
     * help - show available commands
     */
    help() {
        return `Available commands:
  cat <file...>              - Display file contents
  ls [pattern]               - List files (optional pattern)
  rm <file...>               - Remove files
  mv <source> <dest>         - Rename/move file
  grep [opts] <pat> [files]  - Search for pattern (-i: case-insensitive, -n: line numbers, -v: invert)
  find <pattern>             - Find files by name pattern
  sed 's/pat/repl/[g]' <file> - Replace text in file
  import <path> [name]       - Import file from real filesystem
  export <file> <path>       - Export file to real filesystem
  node <file>                - Execute JavaScript file
  echo <text> [> file]       - Display text or write to file
  help                       - Show this help
  exit                       - Exit the REPL`;
    }
}

module.exports = Commands;
