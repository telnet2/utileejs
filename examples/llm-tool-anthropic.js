#!/usr/bin/env node

/**
 * Example: Using MemTools with Anthropic Claude
 *
 * This example demonstrates how to use MemTools as an Anthropic tool
 * to give Claude access to an in-memory file system.
 *
 * Install: npm install @anthropic-ai/sdk
 * Usage: ANTHROPIC_API_KEY=sk-xxx node examples/llm-tool-anthropic.js
 */

const { MemTools } = require('../src/MemTools');

// Mock Anthropic client for demonstration
// Replace with: const Anthropic = require('@anthropic-ai/sdk');
const mockAnthropic = {
    messages: {
        create: async (params) => {
            console.log('=== Mock Anthropic API Call ===');
            console.log('System:', params.system);
            console.log('Messages:', JSON.stringify(params.messages, null, 2));
            console.log('Tools:', JSON.stringify(params.tools, null, 2));

            // Simulate Claude deciding to use the tool
            return {
                id: 'msg_123',
                type: 'message',
                role: 'assistant',
                content: [
                    {
                        type: 'tool_use',
                        id: 'toolu_123',
                        name: 'memfs_exec',
                        input: {
                            command: `cat > package.json << EOF
{
  "name": "llm-project",
  "version": "1.0.0",
  "description": "Created by Claude"
}
EOF`
                        }
                    }
                ],
                stop_reason: 'tool_use'
            };
        }
    }
};

async function main() {
    // Initialize MemTools
    const memtools = new MemTools();

    // Get tool definition for Anthropic
    const tool = memtools.getAnthropicToolDefinition();

    console.log('=== Anthropic Tool Definition ===');
    console.log(JSON.stringify(tool, null, 2));
    console.log('');

    // Create Anthropic client
    // const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const anthropic = mockAnthropic; // Using mock for demo

    // Initial conversation
    const messages = [
        {
            role: 'user',
            content: 'Create a package.json file for a new Node.js project called "llm-project" version 1.0.0.'
        }
    ];

    console.log('=== Step 1: Claude decides to create file ===');
    const response1 = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: 'You are a helpful assistant with access to an in-memory file system. Use the memfs_exec tool to create, read, and manipulate files.',
        messages: messages,
        tools: [tool]
    });

    const toolUse = response1.content.find(c => c.type === 'tool_use');
    console.log('\nClaude wants to use:', toolUse.name);
    console.log('With input:', JSON.stringify(toolUse.input, null, 2));

    // Execute the tool call
    const result1 = memtools.exec(toolUse.input.command);

    console.log('\n=== Tool Execution Result ===');
    console.log('Command:', toolUse.input.command);
    console.log('Output:', result1 || '(success - no output)');

    // Verify file was created
    console.log('\n=== Verify File Creation ===');
    const fileList = memtools.exec('ls -l');
    console.log(fileList);

    console.log('\n=== File Contents ===');
    const content = memtools.exec('cat package.json');
    console.log(content);

    // Example: Complex workflow with multiple commands
    console.log('\n=== Example: Complex Project Setup ===');

    // Create directory structure
    memtools.exec('mkdir -p src tests docs');

    // Create main file
    memtools.exec(`cat > src/index.js << EOF
/**
 * Main application entry point
 * Created by Claude
 */
console.log('Application started');

function greet(name) {
  return \`Hello, \${name}!\`;
}

module.exports = { greet };
EOF`);

    // Create test file
    memtools.exec(`cat > tests/index.test.js << EOF
const { greet } = require('../src/index.js');

console.log('Testing greet function...');
const result = greet('World');
console.log('Result:', result);
console.log('Test passed!');
EOF`);

    // Create README
    memtools.exec(`cat > README.md << EOF
# LLM Project

Created by Claude using MemTools.

## Structure

- src/ - Source code
- tests/ - Test files
- docs/ - Documentation
EOF`);

    // Show project structure
    console.log('\n=== Project Structure ===');
    console.log(memtools.exec('find . --type f'));

    // Run the application
    console.log('\n=== Run Application ===');
    console.log(memtools.exec('node src/index.js'));

    // Run tests
    console.log('\n=== Run Tests ===');
    console.log(memtools.exec('node tests/index.test.js'));

    // Show README
    console.log('\n=== Project README ===');
    console.log(memtools.exec('cat README.md'));

    // Example: Text processing with pipes
    console.log('\n=== Example: Log Analysis ===');

    memtools.exec(`cat > server.log << EOF
2024-01-01 10:00:00 INFO Server started on port 3000
2024-01-01 10:05:23 ERROR Database connection failed
2024-01-01 10:05:24 WARN Retrying database connection
2024-01-01 10:05:25 INFO Database connected
2024-01-01 10:15:42 ERROR Request timeout on /api/users
2024-01-01 10:20:11 INFO Request completed /api/health
2024-01-01 10:25:33 ERROR Authentication failed for user john
EOF`);

    console.log('Extract all errors:');
    const errors = memtools.exec('cat server.log | grep ERROR');
    console.log(errors);

    console.log('\nExtract and count error types:');
    memtools.exec('cat server.log | grep ERROR > errors.log');
    const errorCount = memtools.exec('cat errors.log | grep -c ERROR');
    console.log('Total errors:', errorCount);

    // Export state
    console.log('\n=== File System State ===');
    const state = memtools.exportState();
    console.log('Working directory:', state.cwd);
    console.log('Total files created:', JSON.stringify(state, null, 2).split('"type": "file"').length - 1);

    console.log('\n=== Integration Complete ===');
    console.log('Claude can now:');
    console.log('- Set up complete project structures');
    console.log('- Create and execute code');
    console.log('- Process logs and data with pipes');
    console.log('- Maintain persistent file system state');
}

// Run if executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };
