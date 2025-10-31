#!/usr/bin/env node

/**
 * Demonstration script for the in-memory file system
 */

const { MemoryFileSystem } = require('./index');
const Commands = require('./src/Commands');

console.log('=== In-Memory File System Demo ===\n');

// Create file system instance
const fs = new MemoryFileSystem();
const commands = new Commands(fs);

// Demo 1: Create files
console.log('1. Creating files...');
fs.writeFile('hello.txt', 'Hello, World!');
fs.writeFile('greeting.txt', 'Good morning!\nGood afternoon!\nGood evening!');
fs.writeFile('script.js', 'console.log("Hello from JavaScript!");');
console.log(commands.ls([]));
console.log();

// Demo 2: Cat command
console.log('2. Reading file with cat...');
console.log(commands.cat(['hello.txt']));
console.log();

// Demo 3: Grep command
console.log('3. Searching with grep...');
fs.writeFile('data.txt', 'apple\nbanana\napricot\ncherry\navocado');
console.log('Search for lines starting with "a":');
console.log(commands.grep(['-n', '^a', 'data.txt']));
console.log();

// Demo 4: Find command
console.log('4. Finding files with pattern...');
console.log('Find all .txt files:');
console.log(commands.find(['*.txt']));
console.log();

// Demo 5: Sed command
console.log('5. Replacing text with sed...');
console.log('Before:', fs.readFile('hello.txt'));
commands.sed(['s/World/Universe/g', 'hello.txt']);
console.log('After:', fs.readFile('hello.txt'));
console.log();

// Demo 6: Move/rename file
console.log('6. Renaming file with mv...');
console.log(commands.mv(['hello.txt', 'universe.txt']));
console.log('Files after rename:');
console.log(commands.ls([]));
console.log();

// Demo 7: Node command - run JavaScript
console.log('7. Running JavaScript with node command...');
console.log(commands.node(['script.js']));
console.log();

// Demo 8: JavaScript accessing file system
console.log('8. JavaScript accessing file system...');
fs.writeFile('fs-test.js', `
// This script has access to 'fs' - the in-memory file system
console.log('Files in memory:', fs.list().join(', '));

// Create a new file
fs.writeFile('created-by-script.txt', 'This was created by JavaScript!');
console.log('Created new file: created-by-script.txt');

// Read and display
console.log('Content:', fs.readFile('created-by-script.txt'));
`);
console.log(commands.node(['fs-test.js']));
console.log();

// Demo 9: Echo command with redirection
console.log('9. Writing with echo...');
console.log(commands.echo(['This', 'is', 'a', 'test', '>', 'echo-test.txt']));
console.log('Content:', fs.readFile('echo-test.txt'));
console.log();

// Demo 10: Remove files
console.log('10. Removing files...');
console.log(commands.rm(['echo-test.txt', 'data.txt']));
console.log('\nFinal file list:');
console.log(commands.ls([]));
console.log();

console.log('=== Demo Complete ===');
console.log('\nTo start the interactive REPL, run: node bin/memfs-repl.js');
console.log('Or if installed globally: memfs');
