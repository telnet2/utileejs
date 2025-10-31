#!/usr/bin/env node

/**
 * MCP Server for MemTools
 *
 * This implements a Model Context Protocol (MCP) server that exposes
 * MemTools as a tool that can be used by Claude Desktop and other
 * MCP-compatible clients.
 *
 * Install: npm install @modelcontextprotocol/sdk
 *
 * Configuration for Claude Desktop (~/.config/claude/claude_desktop_config.json):
 * {
 *   "mcpServers": {
 *     "memfs": {
 *       "command": "node",
 *       "args": ["/path/to/utileejs/examples/mcp-server.js"]
 *     }
 *   }
 * }
 *
 * Usage:
 * - Start server: node examples/mcp-server.js
 * - Or let Claude Desktop start it automatically
 */

const { MemTools } = require('../src/MemTools');

// Mock MCP Server for demonstration
// Replace with: const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
// Replace with: const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

class MCPServer {
    constructor() {
        this.memtools = new MemTools();
        this.tools = [this.memtools.getMCPToolDefinition()];
    }

    async handleToolCall(toolName, args) {
        if (toolName === 'memfs_exec') {
            try {
                const output = this.memtools.exec(args.command);
                return {
                    content: [{
                        type: 'text',
                        text: output || '(success - no output)'
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: 'text',
                        text: `Error: ${error.message}`
                    }],
                    isError: true
                };
            }
        }
        throw new Error(`Unknown tool: ${toolName}`);
    }

    async handleResourceRequest(uri) {
        // Allow reading files from the memory filesystem
        if (uri.startsWith('memfs://')) {
            const path = uri.replace('memfs://', '');
            try {
                const content = this.memtools.exec(`cat ${path}`);
                return {
                    contents: [{
                        uri: uri,
                        mimeType: 'text/plain',
                        text: content
                    }]
                };
            } catch (error) {
                throw new Error(`File not found: ${path}`);
            }
        }
        throw new Error(`Unsupported URI: ${uri}`);
    }

    getServerInfo() {
        return {
            name: 'memfs-server',
            version: '1.0.0',
            capabilities: {
                tools: {},
                resources: {}
            }
        };
    }

    start() {
        console.error('MCP Server Started');
        console.error('Server Info:', JSON.stringify(this.getServerInfo(), null, 2));
        console.error('Available Tools:', JSON.stringify(this.tools, null, 2));
        console.error('');
        console.error('Waiting for requests from MCP client...');
        console.error('Press Ctrl+C to stop');
    }
}

// Example demonstrating the MCP server functionality
async function demonstrateMCPServer() {
    console.log('=== MCP Server Demonstration ===\n');

    const server = new MCPServer();

    console.log('=== Server Info ===');
    console.log(JSON.stringify(server.getServerInfo(), null, 2));
    console.log('');

    console.log('=== Available Tools ===');
    console.log(JSON.stringify(server.tools, null, 2));
    console.log('');

    // Simulate client requests
    console.log('=== Simulating Client Tool Calls ===\n');

    // Example 1: Create a file
    console.log('Client Request 1: Create hello.txt');
    let result = await server.handleToolCall('memfs_exec', {
        command: 'echo "Hello from MCP!" > hello.txt'
    });
    console.log('Server Response:', JSON.stringify(result, null, 2));
    console.log('');

    // Example 2: List files
    console.log('Client Request 2: List files');
    result = await server.handleToolCall('memfs_exec', {
        command: 'ls -l'
    });
    console.log('Server Response:', JSON.stringify(result, null, 2));
    console.log('');

    // Example 3: Create project structure
    console.log('Client Request 3: Create project structure');
    result = await server.handleToolCall('memfs_exec', {
        command: `cat > setup.sh << 'EOF'
mkdir -p src tests
cat > src/main.js << JS
console.log('Application started');
JS
cat > tests/test.js << JS
console.log('Running tests...');
JS
echo "Project setup complete"
EOF`
    });
    console.log('Server Response:', JSON.stringify(result, null, 2));
    console.log('');

    // Example 4: Execute the setup script
    console.log('Client Request 4: Execute setup');
    result = await server.handleToolCall('memfs_exec', {
        command: 'cat setup.sh'
    });
    console.log('Setup script contents:', result.content[0].text);
    console.log('');

    // Actually execute the commands
    server.memtools.exec('mkdir -p src tests');
    server.memtools.exec(`cat > src/main.js << EOF
console.log('Application started');
EOF`);
    server.memtools.exec(`cat > tests/test.js << EOF
console.log('Running tests...');
EOF`);

    // Example 5: Run the application
    console.log('Client Request 5: Run application');
    result = await server.handleToolCall('memfs_exec', {
        command: 'node src/main.js'
    });
    console.log('Server Response:', JSON.stringify(result, null, 2));
    console.log('');

    // Example 6: Find all JavaScript files
    console.log('Client Request 6: Find all JavaScript files');
    result = await server.handleToolCall('memfs_exec', {
        command: 'find . --name "*.js"'
    });
    console.log('Server Response:', JSON.stringify(result, null, 2));
    console.log('');

    // Example 7: Resource request (read file via URI)
    console.log('Client Request 7: Read file via resource URI');
    const resource = await server.handleResourceRequest('memfs://hello.txt');
    console.log('Resource Response:', JSON.stringify(resource, null, 2));
    console.log('');

    // Example 8: Complex text processing
    console.log('Client Request 8: Complex log processing');
    await server.handleToolCall('memfs_exec', {
        command: `cat > access.log << EOF
127.0.0.1 - - [01/Jan/2024:10:00:00] "GET /api/users HTTP/1.1" 200
127.0.0.1 - - [01/Jan/2024:10:05:00] "POST /api/login HTTP/1.1" 401
192.168.1.5 - - [01/Jan/2024:10:10:00] "GET /api/data HTTP/1.1" 500
127.0.0.1 - - [01/Jan/2024:10:15:00] "GET /api/health HTTP/1.1" 200
EOF`
    });

    result = await server.handleToolCall('memfs_exec', {
        command: 'cat access.log | grep -E "(401|500)" > errors.log'
    });
    console.log('Created errors.log');

    result = await server.handleToolCall('memfs_exec', {
        command: 'cat errors.log'
    });
    console.log('Filtered errors:', result.content[0].text);
    console.log('');

    console.log('=== MCP Server Demo Complete ===');
    console.log('\nTo use with Claude Desktop:');
    console.log('1. Install @modelcontextprotocol/sdk');
    console.log('2. Add server config to ~/.config/claude/claude_desktop_config.json');
    console.log('3. Restart Claude Desktop');
    console.log('4. Claude will have access to memfs_exec tool');
}

// Real MCP Server implementation (requires @modelcontextprotocol/sdk)
async function startRealMCPServer() {
    try {
        const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
        const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

        const memtools = new MemTools();
        const server = new Server(
            {
                name: 'memfs-server',
                version: '1.0.0'
            },
            {
                capabilities: {
                    tools: {},
                    resources: {}
                }
            }
        );

        // Register tool
        server.setRequestHandler('tools/list', async () => {
            return {
                tools: [memtools.getMCPToolDefinition()]
            };
        });

        server.setRequestHandler('tools/call', async (request) => {
            if (request.params.name === 'memfs_exec') {
                try {
                    const output = memtools.exec(request.params.arguments.command);
                    return {
                        content: [{
                            type: 'text',
                            text: output || '(success - no output)'
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: 'text',
                            text: `Error: ${error.message}`
                        }],
                        isError: true
                    };
                }
            }
            throw new Error(`Unknown tool: ${request.params.name}`);
        });

        // Register resources (allow reading files via URI)
        server.setRequestHandler('resources/list', async () => {
            const files = memtools.exec('find . --type f').split('\n').filter(f => f);
            return {
                resources: files.map(path => ({
                    uri: `memfs://${path}`,
                    name: path,
                    mimeType: 'text/plain'
                }))
            };
        });

        server.setRequestHandler('resources/read', async (request) => {
            const uri = request.params.uri;
            if (uri.startsWith('memfs://')) {
                const path = uri.replace('memfs://', '');
                try {
                    const content = memtools.exec(`cat ${path}`);
                    return {
                        contents: [{
                            uri: uri,
                            mimeType: 'text/plain',
                            text: content
                        }]
                    };
                } catch (error) {
                    throw new Error(`File not found: ${path}`);
                }
            }
            throw new Error(`Unsupported URI: ${uri}`);
        });

        const transport = new StdioServerTransport();
        await server.connect(transport);

        console.error('MCP Server started and ready');
    } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
            console.error('Error: @modelcontextprotocol/sdk not installed');
            console.error('Install with: npm install @modelcontextprotocol/sdk');
            console.error('\nRunning demonstration mode instead...\n');
            await demonstrateMCPServer();
        } else {
            throw error;
        }
    }
}

// Run server or demonstration
if (require.main === module) {
    if (process.argv.includes('--demo')) {
        demonstrateMCPServer().catch(console.error);
    } else {
        startRealMCPServer().catch(console.error);
    }
}

module.exports = { MCPServer, demonstrateMCPServer };
