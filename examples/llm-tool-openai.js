#!/usr/bin/env node

/**
 * Example: Using MemTools with OpenAI Function Calling
 *
 * This example demonstrates how to use MemTools as an OpenAI function/tool
 * to give the LLM access to an in-memory file system.
 *
 * Install: npm install openai
 * Usage: OPENAI_API_KEY=sk-xxx node examples/llm-tool-openai.js
 */

const { MemTools } = require('../src/MemTools');

// Mock OpenAI client for demonstration
// Replace with: const OpenAI = require('openai');
const mockOpenAI = {
    chat: {
        completions: {
            create: async (params) => {
                console.log('=== Mock OpenAI API Call ===');
                console.log('Messages:', JSON.stringify(params.messages, null, 2));
                console.log('Tools:', JSON.stringify(params.tools, null, 2));

                // Simulate LLM deciding to use the tool
                return {
                    choices: [{
                        message: {
                            role: 'assistant',
                            content: null,
                            tool_calls: [{
                                id: 'call_123',
                                type: 'function',
                                function: {
                                    name: 'memfs_exec',
                                    arguments: JSON.stringify({
                                        command: 'cat > hello.js << EOF\nconsole.log("Hello from LLM!");\nEOF'
                                    })
                                }
                            }]
                        }
                    }]
                };
            }
        }
    }
};

async function main() {
    // Initialize MemTools
    const memtools = new MemTools();

    // Get tool definition for OpenAI
    const tool = memtools.getOpenAIToolDefinition();

    console.log('=== OpenAI Tool Definition ===');
    console.log(JSON.stringify(tool, null, 2));
    console.log('');

    // Create OpenAI client
    // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const openai = mockOpenAI; // Using mock for demo

    // Initial conversation
    const messages = [
        {
            role: 'system',
            content: 'You are a helpful assistant with access to an in-memory file system. Use the memfs_exec tool to create, read, and manipulate files.'
        },
        {
            role: 'user',
            content: 'Create a JavaScript file called hello.js that prints "Hello from LLM!" and then execute it.'
        }
    ];

    console.log('=== Step 1: LLM decides to create file ===');
    const response1 = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: messages,
        tools: [tool],
        tool_choice: 'auto'
    });

    const toolCall = response1.choices[0].message.tool_calls[0];
    console.log('\nLLM wants to call:', toolCall.function.name);
    console.log('With arguments:', toolCall.function.arguments);

    // Execute the tool call
    const args = JSON.parse(toolCall.function.arguments);
    const result1 = memtools.exec(args.command);

    console.log('\n=== Tool Execution Result ===');
    console.log('Command:', args.command);
    console.log('Output:', result1 || '(success - no output)');

    // Second tool call: execute the file
    console.log('\n=== Step 2: Execute the created file ===');
    const result2 = memtools.exec('node hello.js');
    console.log('Command: node hello.js');
    console.log('Output:', result2);

    // Show file system state
    console.log('\n=== Current File System State ===');
    const files = memtools.exec('ls -l');
    console.log(files);

    console.log('\n=== File Contents ===');
    const content = memtools.exec('cat hello.js');
    console.log(content);

    // Example: Complex multi-step task
    console.log('\n=== Example: Multi-step File Processing ===');

    // Create data file
    memtools.exec(`cat > data.txt << EOF
INFO: Application started
ERROR: Connection failed
WARN: Retrying connection
ERROR: Timeout occurred
INFO: Application stopped
EOF`);

    // Filter errors
    memtools.exec('cat data.txt | grep ERROR > errors.txt');

    // Show results
    console.log('Created data.txt and filtered errors:');
    console.log(memtools.exec('cat errors.txt'));

    // Export state for persistence
    console.log('\n=== Export File System State ===');
    const state = memtools.exportState();
    console.log('State exported. Files in root:', state.root.children.map(c => c.name).join(', '));

    console.log('\n=== Integration Complete ===');
    console.log('The LLM can now:');
    console.log('- Create and manipulate files');
    console.log('- Execute JavaScript code');
    console.log('- Use pipes and text processing');
    console.log('- Maintain state across multiple tool calls');
}

// Run if executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };
