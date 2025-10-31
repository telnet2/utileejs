const readline = require('readline');
const MemoryFileSystem = require('./MemoryFileSystem');
const Commands = require('./Commands');

/**
 * REPL (Read-Eval-Print Loop) shell for the in-memory file system
 */
class Repl {
    constructor() {
        this.fs = new MemoryFileSystem();
        this.commands = new Commands(this.fs);
        this.rl = null;
        this.running = false;
    }

    /**
     * Start the REPL
     */
    start() {
        this.running = true;

        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: 'memfs> '
        });

        console.log('Memory FileSystem REPL');
        console.log('Type "help" for available commands, "exit" to quit\n');

        this.rl.prompt();

        this.rl.on('line', (line) => {
            const trimmed = line.trim();

            if (!trimmed) {
                this.rl.prompt();
                return;
            }

            if (trimmed === 'exit' || trimmed === 'quit') {
                this.stop();
                return;
            }

            try {
                const result = this.executeCommand(trimmed);
                if (result) {
                    console.log(result);
                }
            } catch (error) {
                console.error(`Error: ${error.message}`);
            }

            this.rl.prompt();
        });

        this.rl.on('close', () => {
            this.stop();
        });
    }

    /**
     * Stop the REPL
     */
    stop() {
        if (this.rl) {
            this.rl.close();
        }
        this.running = false;
        console.log('\nGoodbye!');
        process.exit(0);
    }

    /**
     * Execute a command
     * @param {string} line - Command line to execute
     * @returns {string} Command output
     */
    executeCommand(line) {
        // Parse command and arguments
        const parsed = this.parseCommandLine(line);
        const command = parsed.command;
        const args = parsed.args;

        // Check if command exists
        if (typeof this.commands[command] === 'function') {
            return this.commands[command].call(this.commands, args);
        } else {
            return `Command not found: ${command}\nType "help" for available commands`;
        }
    }

    /**
     * Parse command line into command and arguments
     * Handles quoted strings
     * @param {string} line - Command line
     * @returns {Object} {command, args}
     */
    parseCommandLine(line) {
        const parts = [];
        let current = '';
        let inQuote = false;
        let quoteChar = '';

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if ((char === '"' || char === "'") && !inQuote) {
                inQuote = true;
                quoteChar = char;
            } else if (char === quoteChar && inQuote) {
                inQuote = false;
                quoteChar = '';
            } else if (char === ' ' && !inQuote) {
                if (current) {
                    parts.push(current);
                    current = '';
                }
            } else {
                current += char;
            }
        }

        if (current) {
            parts.push(current);
        }

        return {
            command: parts[0] || '',
            args: parts.slice(1)
        };
    }

    /**
     * Get the file system instance
     * @returns {MemoryFileSystem}
     */
    getFileSystem() {
        return this.fs;
    }
}

module.exports = Repl;
