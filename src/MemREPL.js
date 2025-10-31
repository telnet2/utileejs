const readline = require('readline');
const { MemFS } = require('./MemFS');
const { MemShell } = require('./MemShell');

/**
 * REPL (Read-Eval-Print Loop) interface for MemShell
 */
class MemREPL {
    constructor(memfs = null) {
        this.shell = new MemShell(memfs);
        this.rl = null;
        this.running = false;
        this.history = [];
    }

    /**
     * Get the prompt string
     */
    getPrompt() {
        const cwd = this.shell.fs.getCurrentDirectory();
        return `memsh:${cwd}$ `;
    }

    /**
     * Display help information
     */
    showHelp() {
        const help = `
MemShell - In-Memory File System Shell

Available Commands:
  File System Navigation:
    ls [options] [path]        - List directory contents
                                 -l: long format, -a: show all (including . and ..)
    cd [path]                  - Change directory
    pwd                        - Print working directory

  File Operations:
    cat <file...>              - Display file contents
    touch <file...>            - Create empty file or update timestamp
    mkdir [options] <dir...>   - Create directory
                                 -p: create parent directories as needed
    rm [options] <path...>     - Remove files or directories
                                 -r, -R: recursive removal
    write <file> <content>     - Write content to file

  Search and Manipulation:
    grep [options] <pattern> <file...>  - Search for pattern in files
                                         -i: case insensitive, -n: show line numbers
    find [options] [path]               - Find files in directory hierarchy
                                         --name <pattern>: match name pattern
                                         --type <f|d>: filter by type (file or directory)
    sed <s/pattern/replacement/flags> <file>  - Stream editor (substitute)

  Import/Export:
    import [options] <real-path> [mem-path]  - Import from real filesystem
                                              -r, -R: recursive (for directories)
    export <mem-path> <real-path>           - Export to real filesystem

  Execution:
    node <script.js> [args...]  - Execute JavaScript file in memory filesystem

  Utility:
    echo <text...>             - Display text
    help                       - Show this help message
    exit, quit                 - Exit the shell

Examples:
  $ mkdir -p projects/myapp
  $ cd projects/myapp
  $ write hello.js "console.log('Hello, World!');"
  $ node hello.js
  $ grep -n "Hello" hello.js
  $ find . --name "*.js"
  $ import -r /path/to/real/dir mydir
  $ export mydir /path/to/export
`;
        console.log(help);
    }

    /**
     * Handle a command
     */
    handleCommand(line) {
        const trimmed = line.trim();

        if (!trimmed) {
            return;
        }

        // Add to history
        this.history.push(trimmed);

        // Handle special commands
        if (trimmed === 'help') {
            this.showHelp();
            return;
        }

        if (trimmed === 'exit' || trimmed === 'quit') {
            this.stop();
            return;
        }

        if (trimmed === 'clear') {
            console.clear();
            return;
        }

        if (trimmed === 'history') {
            this.history.forEach((cmd, i) => {
                console.log(`${i + 1}  ${cmd}`);
            });
            return;
        }

        // Execute command through shell
        try {
            const result = this.shell.exec(trimmed);
            if (result) {
                console.log(result);
            }
        } catch (err) {
            console.error(err.message);
        }
    }

    /**
     * Start the REPL
     */
    start() {
        this.running = true;

        console.log('MemShell - In-Memory File System Shell');
        console.log('Type "help" for available commands, "exit" to quit\n');

        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: this.getPrompt(),
        });

        this.rl.on('line', (line) => {
            this.handleCommand(line);
            if (this.running) {
                this.rl.setPrompt(this.getPrompt());
                this.rl.prompt();
            }
        });

        this.rl.on('close', () => {
            this.stop();
        });

        this.rl.prompt();
    }

    /**
     * Stop the REPL
     */
    stop() {
        this.running = false;
        if (this.rl) {
            this.rl.close();
        }
        console.log('\nGoodbye!');
        process.exit(0);
    }

    /**
     * Execute a single command (non-interactive mode)
     */
    execCommand(commandLine) {
        try {
            const result = this.shell.exec(commandLine);
            if (result) {
                console.log(result);
            }
            return 0;
        } catch (err) {
            console.error(err.message);
            return 1;
        }
    }

    /**
     * Execute multiple commands from a script
     */
    execScript(commands) {
        for (const command of commands) {
            const trimmed = command.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                try {
                    const result = this.shell.exec(trimmed);
                    if (result) {
                        console.log(result);
                    }
                } catch (err) {
                    console.error(`Error executing '${trimmed}': ${err.message}`);
                    return 1;
                }
            }
        }
        return 0;
    }
}

module.exports = { MemREPL };
