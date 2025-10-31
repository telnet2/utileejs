const { MemShell } = require('./MemShell');
const { MemFS } = require('./MemFS');

/**
 * MemTools - LLM Tool Interface for In-Memory File System
 *
 * Provides a single tool interface for LLMs to interact with an in-memory
 * file system using shell commands. Maintains state across multiple calls.
 *
 * Usage with LLM function calling:
 * 1. Create an instance: const tools = new MemTools()
 * 2. Get tool definition: tools.getToolDefinition()
 * 3. Execute commands: tools.exec(command)
 */
class MemTools {
    /**
     * Create a new MemTools instance
     * @param {MemFS} [fs] - Optional existing MemFS instance
     */
    constructor(fs) {
        this.shell = new MemShell(fs);
        this.fs = this.shell.fs;
    }

    /**
     * Execute a shell command in the in-memory file system
     *
     * Supports all shell features:
     * - File operations: ls, cat, mkdir, touch, rm, write
     * - Search: grep, find, sed
     * - Pipes: cmd1 | cmd2 | cmd3
     * - HEREDOC: cat > file.txt << EOF\ncontents\nEOF
     * - Output redirection: echo text > file.txt
     * - JavaScript execution: node script.js
     * - Import/Export: import /path/file.txt, export file.txt /path/output.txt
     *
     * @param {string} command - Shell command to execute (can be multiline)
     * @returns {string} Command output
     * @throws {Error} If command fails
     */
    exec(command) {
        try {
            return this.shell.exec(command);
        } catch (error) {
            throw new Error(`Command failed: ${error.message}`);
        }
    }

    /**
     * Get OpenAI-compatible tool definition
     * @returns {Object} OpenAI function calling schema
     */
    getOpenAIToolDefinition() {
        return {
            type: "function",
            function: {
                name: "memfs_exec",
                description: "Execute shell commands in an in-memory file system. Supports all POSIX-like commands including ls, cat, grep, pipes, HEREDOC, and output redirection. State persists across calls.",
                parameters: {
                    type: "object",
                    properties: {
                        command: {
                            type: "string",
                            description: "Shell command to execute. Can be multiline for HEREDOC (e.g., 'cat > file.txt << EOF\\nline 1\\nline 2\\nEOF'). Examples:\n- List files: 'ls -l'\n- Read file: 'cat file.txt'\n- Create file: 'echo Hello > hello.txt'\n- Search: 'grep error log.txt'\n- Pipe: 'cat file.txt | grep pattern'\n- HEREDOC: 'cat > config.yml << EOF\\nkey: value\\nEOF'\n- Execute JS: 'node script.js'"
                        }
                    },
                    required: ["command"]
                }
            }
        };
    }

    /**
     * Get Anthropic-compatible tool definition
     * @returns {Object} Anthropic tool schema
     */
    getAnthropicToolDefinition() {
        return {
            name: "memfs_exec",
            description: "Execute shell commands in an in-memory file system. Supports all POSIX-like commands including ls, cat, grep, pipes, HEREDOC, and output redirection. State persists across calls, allowing you to create files, directories, and execute JavaScript in the memory filesystem.",
            input_schema: {
                type: "object",
                properties: {
                    command: {
                        type: "string",
                        description: "Shell command to execute. Can be multiline for HEREDOC (e.g., 'cat > file.txt << EOF\\nline 1\\nline 2\\nEOF'). Supports:\n- Navigation: ls, cd, pwd\n- File ops: cat, touch, rm, mkdir, write\n- Search: grep, find, sed\n- Pipes: cmd1 | cmd2\n- Redirection: echo text > file.txt\n- HEREDOC: cat > file << EOF\\ncontent\\nEOF\n- Execute: node script.js\n- Import/Export: import /real/path, export file /real/path"
                    }
                },
                required: ["command"]
            }
        };
    }

    /**
     * Get MCP (Model Context Protocol) compatible tool definition
     * @returns {Object} MCP tool schema
     */
    getMCPToolDefinition() {
        return {
            name: "memfs_exec",
            description: "Execute shell commands in an in-memory file system with full POSIX-like command support",
            inputSchema: {
                type: "object",
                properties: {
                    command: {
                        type: "string",
                        description: "Shell command to execute (supports multiline for HEREDOC)"
                    }
                },
                required: ["command"]
            }
        };
    }

    /**
     * Get generic JSON Schema tool definition
     * @returns {Object} JSON Schema compatible definition
     */
    getToolDefinition() {
        return {
            name: "memfs_exec",
            description: "Execute shell commands in an in-memory file system. Supports POSIX-like commands, pipes, HEREDOC, and output redirection. State persists across calls.",
            parameters: {
                type: "object",
                properties: {
                    command: {
                        type: "string",
                        description: "Shell command to execute. Can be multiline."
                    }
                },
                required: ["command"]
            }
        };
    }

    /**
     * Handle tool call from LLM
     * @param {Object} toolCall - Tool call object from LLM
     * @returns {string} Command output
     */
    handleToolCall(toolCall) {
        // Support various tool call formats
        const command = toolCall.command ||
                       toolCall.parameters?.command ||
                       toolCall.input?.command ||
                       toolCall.arguments?.command;

        if (!command) {
            throw new Error('Missing command parameter');
        }

        return this.exec(command);
    }

    /**
     * Get current working directory
     * @returns {string} Current directory path
     */
    getCwd() {
        return this.fs.getCurrentDirectory();
    }

    /**
     * Reset file system to empty state
     */
    reset() {
        this.fs = new MemFS();
        this.shell = new MemShell(this.fs);
    }

    /**
     * Get file system instance (for advanced usage)
     * @returns {MemFS} The underlying MemFS instance
     */
    getFileSystem() {
        return this.fs;
    }

    /**
     * Export entire file system state as JSON
     * @returns {Object} Serializable file system state
     */
    exportState() {
        const serializeNode = (node) => {
            if (node.isFile()) {
                return {
                    type: 'file',
                    name: node.name,
                    content: node.read(),
                    createdAt: node.createdAt,
                    modifiedAt: node.modifiedAt
                };
            } else {
                return {
                    type: 'directory',
                    name: node.name,
                    children: Array.from(node.children.values()).map(serializeNode),
                    createdAt: node.createdAt,
                    modifiedAt: node.modifiedAt
                };
            }
        };

        return {
            cwd: this.getCwd(),
            root: serializeNode(this.fs.root)
        };
    }

    /**
     * Import file system state from JSON
     * @param {Object} state - File system state from exportState()
     */
    importState(state) {
        this.reset();

        const deserializeNode = (nodeData, parent) => {
            if (nodeData.type === 'file') {
                const path = parent ? `${parent}/${nodeData.name}` : nodeData.name;
                this.fs.createFile(path, nodeData.content);
            } else if (nodeData.type === 'directory' && nodeData.name !== '') {
                const path = parent ? `${parent}/${nodeData.name}` : nodeData.name;
                this.fs.createDirectory(path);
                if (nodeData.children) {
                    for (const child of nodeData.children) {
                        deserializeNode(child, path);
                    }
                }
            } else if (nodeData.type === 'directory' && nodeData.name === '') {
                // Root directory
                if (nodeData.children) {
                    for (const child of nodeData.children) {
                        deserializeNode(child, '');
                    }
                }
            }
        };

        deserializeNode(state.root, null);
        if (state.cwd && state.cwd !== '/') {
            this.fs.changeDirectory(state.cwd);
        }
    }
}

module.exports = { MemTools };
