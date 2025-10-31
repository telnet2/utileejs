# In-Memory File System with REPL

An in-memory file system implementation for Node.js with POSIX-like command support and an interactive REPL shell.

## Features

- **In-memory storage**: All files stored in memory (no directory support)
- **POSIX-like commands**: cat, ls, rm, mv, grep, find, sed, and more
- **Interactive REPL**: Command-line shell interface
- **JavaScript execution**: Run JavaScript files with file system access
- **Import/Export**: Move files between memory and real filesystem
- **Programmatic API**: Use as a JavaScript library

## Installation

```bash
npm install @autox/utileejs
```

## Usage

### Interactive REPL

Start the interactive shell:

```bash
# If installed globally
memfs

# Or run directly
node bin/memfs-repl.js
```

### REPL Commands

#### File Operations

```bash
# Display file contents
cat <filename> [filename2 ...]

# List all files (with sizes)
ls [pattern]

# Remove files
rm <filename> [filename2 ...]

# Rename/move file
mv <source> <destination>

# Write text to file
echo <text> [> filename]
```

#### Search & Find

```bash
# Search for pattern in files
grep [options] <pattern> [files...]
# Options: -i (case insensitive), -n (line numbers), -v (invert match)

# Find files by name pattern
find <pattern>

# Replace text in file
sed 's/pattern/replacement/[g]' <filename>
```

#### Import/Export

```bash
# Import from real filesystem
import <real_path> [memory_name]

# Export to real filesystem
export <filename> <real_path>
```

#### Execute JavaScript

```bash
# Run JavaScript file (has access to 'fs' object)
node <filename>
```

### Example REPL Session

```bash
memfs> echo Hello World > hello.txt
Written to: hello.txt

memfs> echo Goodbye World > goodbye.txt
Written to: goodbye.txt

memfs> ls
      12 goodbye.txt
      12 hello.txt

memfs> cat hello.txt
Hello World

memfs> grep -n World *.txt
goodbye.txt:1:Goodbye World
hello.txt:1:Hello World

memfs> sed 's/World/Universe/g' hello.txt
Modified: hello.txt

memfs> cat hello.txt
Hello Universe

memfs> find *.txt
goodbye.txt
hello.txt

memfs> rm goodbye.txt
Removed: goodbye.txt

memfs> exit
```

### JavaScript API

Use the file system programmatically in your Node.js applications:

```javascript
const { MemoryFileSystem } = require('@autox/utileejs');

// Create file system instance
const fs = new MemoryFileSystem();

// Write files
fs.writeFile('test.txt', 'Hello World');
fs.writeFile('data.json', JSON.stringify({ key: 'value' }));

// Read files
const content = fs.readFile('test.txt');
console.log(content); // 'Hello World'

// Check existence
if (fs.exists('test.txt')) {
    console.log('File exists!');
}

// List files
const files = fs.list();
console.log(files); // ['test.txt', 'data.json']

// Rename
fs.rename('test.txt', 'renamed.txt');

// Delete
fs.deleteFile('renamed.txt');

// Search with grep
const results = fs.grep('Hello', null, { caseInsensitive: true });
console.log(results);

// Find files
const txtFiles = fs.find('*.txt');
console.log(txtFiles);

// Replace text with sed
fs.sed('World', 'Universe', 'test.txt', { global: true });

// Import/Export
fs.importFile('/path/to/real/file.txt', 'memory-name.txt');
fs.exportFile('memory-name.txt', '/path/to/output.txt');

// Get file stats
const stats = fs.stat('test.txt');
console.log(stats); // { name, size, isFile, isDirectory }
```

### JavaScript Files with File System Access

When running JavaScript files using the `node` command in the REPL, the script has access to the file system via the `fs` variable:

Create a file in the REPL:

```bash
memfs> echo console.log('Files:', fs.list()); > script.js
Written to: script.js

memfs> node script.js
Files: [ 'script.js' ]
```

Or create a more complex script:

```javascript
// Create analyzer.js
const files = fs.list();
console.log(`Total files: ${files.length}`);

files.forEach(file => {
    const size = fs.getSize(file);
    console.log(`${file}: ${size} bytes`);
});

// Create a summary file
const summary = `Total files: ${files.length}\n`;
fs.writeFile('summary.txt', summary);
console.log('Summary created!');
```

```bash
memfs> import analyzer.js
memfs> node analyzer.js
Total files: 2
analyzer.js: 245 bytes
summary.txt: 17 bytes
Summary created!
```

## API Reference

### MemoryFileSystem Class

#### Methods

- `writeFile(filename, content)` - Write content to file
- `readFile(filename)` - Read file content
- `deleteFile(filename)` - Delete a file
- `exists(filename)` - Check if file exists
- `list()` - Get array of all filenames
- `rename(oldName, newName)` - Rename/move file
- `getSize(filename)` - Get file size in bytes
- `clear()` - Remove all files
- `importFile(realPath, memoryName)` - Import from real filesystem
- `exportFile(filename, realPath)` - Export to real filesystem
- `grep(pattern, filenames, options)` - Search for pattern
- `find(pattern)` - Find files by name pattern
- `sed(pattern, replacement, filename, options)` - Replace text
- `stat(filename)` - Get file statistics

## Running Tests

```bash
# Run unit tests
npm test

# Run demo script
node test-demo.js
```

## Examples

See `test-demo.js` for comprehensive usage examples.

## License

EPL-2.0

## Author

Joohwi Lee <telnet2@gmail.com>
