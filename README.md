# utileejs

Useful JavaScript utilities including an in-memory file system and shell.

## Features

### In-Memory File System (MemFS)
A complete in-memory file system implementation with:
- File and directory operations
- Path resolution (relative and absolute)
- Import/export to real filesystem
- Full POSIX-like API

### Shell Command REPL (MemShell)
An interactive shell with POSIX-like commands:
- **Navigation**: `ls`, `cd`, `pwd`
- **File Operations**: `cat`, `touch`, `rm`, `mkdir`, `write`
- **Search & Manipulation**: `grep`, `find`, `sed`
- **Import/Export**: `import`, `export`
- **Execution**: `node` (run JavaScript in the memory filesystem)
- **Advanced**: Pipes (`|`) and HEREDOC (`<<`) support

### Interactive Shell (MemREPL)
A full-featured REPL interface for interactive file system manipulation.

## Installation

```bash
npm install @autox/utileejs
```

For global CLI access:
```bash
npm install -g @autox/utileejs
```

## Quick Start

### Interactive Shell

Start the interactive shell:
```bash
memsh
```

Or using npx:
```bash
npx @autox/utileejs
```

### Programmatic API

```javascript
const { MemFS, MemShell } = require('@autox/utileejs');

// Create file system
const fs = new MemFS();
fs.createDirectory('mydir');
fs.createFile('mydir/hello.txt', 'Hello World');

// Use shell commands
const shell = new MemShell(fs);
console.log(shell.exec('ls mydir'));
console.log(shell.exec('cat mydir/hello.txt'));
```

## Command Reference

### File System Navigation

#### `ls [options] [path]`
List directory contents
- `-l`: Long format with details
- `-a`: Show all entries including `.` and `..`

```bash
$ ls
$ ls -l
$ ls -la /projects
```

#### `cd [path]`
Change directory
```bash
$ cd /projects/myapp
$ cd ..
$ cd
```

#### `pwd`
Print working directory
```bash
$ pwd
```

### File Operations

#### `cat <file...>`
Display file contents
```bash
$ cat file.txt
$ cat file1.txt file2.txt
```

#### `touch <file...>`
Create empty file or update timestamp
```bash
$ touch newfile.txt
$ touch file1.txt file2.txt
```

#### `mkdir [options] <dir...>`
Create directory
- `-p`: Create parent directories as needed

```bash
$ mkdir mydir
$ mkdir -p projects/myapp/src
```

#### `rm [options] <path...>`
Remove files or directories
- `-r`, `-R`: Recursive removal

```bash
$ rm file.txt
$ rm -r mydir
```

#### `write <file> <content>`
Write content to file
```bash
$ write hello.txt "Hello World"
$ write script.js "console.log('test');"
```

### Search and Manipulation

#### `grep [options] <pattern> <file...>`
Search for patterns in files
- `-i`: Case insensitive
- `-n`: Show line numbers

```bash
$ grep "TODO" file.txt
$ grep -n "function" script.js
$ grep -i "error" *.log
```

#### `find [options] [path]`
Find files in directory hierarchy
- `--name <pattern>`: Match name pattern
- `--type <f|d>`: Filter by type (file or directory)

```bash
$ find .
$ find . --name "*.js"
$ find /projects --type d
```

#### `sed <s/pattern/replacement/flags> <file>`
Stream editor for text transformation
```bash
$ sed s/old/new/g file.txt
$ sed s/foo/bar/ test.txt
```

### Import/Export

#### `import [options] <real-path> [mem-path]`
Import from real filesystem
- `-r`, `-R`: Recursive (for directories)

```bash
$ import /path/to/file.txt
$ import -r /path/to/directory mydir
```

#### `export <mem-path> <real-path>`
Export to real filesystem
```bash
$ export myfile.txt /tmp/myfile.txt
$ export mydir /tmp/exported
```

### Execution

#### `node <script.js> [args...]`
Execute JavaScript file in memory filesystem
```bash
$ node script.js
$ node main.js arg1 arg2
```

Features:
- Full console support (log, error, warn)
- `require()` for memory filesystem modules
- `process.argv` access
- Built-in Node.js module support

### Utility

#### `echo <text...>`
Display text
```bash
$ echo Hello World
```

#### `help`
Show help message
```bash
$ help
```

#### `exit`, `quit`
Exit the shell
```bash
$ exit
```

### Advanced Features

#### Pipes (`|`)
Chain commands together, passing output from one command as input to the next.

**Syntax:** `command1 | command2 | command3`

**Examples:**
```bash
# Filter file contents
$ cat file.txt | grep error

# Chain multiple filters
$ cat log.txt | grep ERROR | sed s/ERROR/CRITICAL/g

# Count matching lines
$ cat data.txt | grep pattern | wc -l

# Find and filter
$ ls | grep ".js"

# Process with line numbers
$ cat file.txt | grep -n important
```

**Supported Commands:**
- `cat` - Can receive stdin when no files specified or with `-`
- `grep` - Can search stdin when no files specified
- `sed` - Can transform stdin when no file specified
- Any command can be piped to these commands

#### HEREDOC (`<<`)
Multi-line input delimiter for creating documents inline.

**Syntax:**
```bash
command << DELIMITER
content line 1
content line 2
...
DELIMITER
```

**Interactive Mode:**
```bash
$ cat << EOF
> This is line 1
> This is line 2
> EOF
This is line 1
This is line 2
```

**Inline Mode (in scripts/programmatic usage):**
```javascript
shell.exec(`cat << EOF
line 1
line 2
EOF`);
```

**Examples:**

Create a file with multi-line content:
```bash
$ write config.yaml << END
> server:
>   host: localhost
>   port: 8080
> database:
>   name: mydb
> END
```

Search through inline content:
```bash
$ grep error << DATA
> normal line
> error occurred here
> another normal line
> DATA
error occurred here
```

Transform inline content:
```bash
$ sed s/old/new/g << TEXT
> old value 1
> old value 2
> TEXT
new value 1
new value 2
```

#### Combining Pipes and HEREDOC

Pipe HEREDOC output to other commands:
```bash
$ cat << EOF | grep pattern | sed s/find/replace/g
> line with pattern and find
> another line
> line with pattern
> EOF
```

Complex pipeline example:
```bash
$ cat << DATA | grep -n error | sed s/error/ERROR/g
> normal operation
> error in system
> processing continues
> error detected
> DATA
2:ERROR in system
4:ERROR detected
```

**Use Cases:**
- **Testing**: Create test data inline without external files
- **Configuration**: Generate config files programmatically
- **Data Processing**: Process multi-line data in pipelines
- **Scripting**: Embed documents in shell scripts
- **Prototyping**: Quickly test text transformations

## API Reference

### MemFS

```javascript
const { MemFS } = require('@autox/utileejs');
const fs = new MemFS();

// File operations
const file = fs.createFile('test.txt', 'content');
file.write('new content');
file.append(' more');
console.log(file.read());

// Directory operations
const dir = fs.createDirectory('mydir');
fs.createDirectories('path/to/nested/dir');

// Navigation
fs.changeDirectory('mydir');
console.log(fs.getCurrentDirectory());

// Path resolution
const node = fs.resolvePath('path/to/file.txt');

// Remove
fs.remove('file.txt');
fs.remove('dir', true); // recursive

// Import/Export
fs.importFile('/real/path/file.txt', 'memory-file.txt');
fs.exportFile('memory-file.txt', '/real/path/output.txt');
fs.importDirectory('/real/dir', 'memory-dir');
fs.exportDirectory('memory-dir', '/real/output');
```

### MemShell

```javascript
const { MemShell } = require('@autox/utileejs');
const shell = new MemShell(); // Uses its own MemFS instance

// Or use existing MemFS
const fs = new MemFS();
const shell = new MemShell(fs);

// Execute commands
const output = shell.exec('ls -l');
console.log(output);

shell.exec('mkdir test');
shell.exec('cd test');
shell.exec('write hello.txt "Hello World"');
console.log(shell.exec('cat hello.txt'));
```

### MemREPL

```javascript
const { MemREPL } = require('@autox/utileejs');
const repl = new MemREPL();

// Start interactive mode
repl.start();

// Execute single command
repl.execCommand('ls -l');

// Execute script
const commands = [
    'mkdir test',
    'cd test',
    'touch file.txt'
];
repl.execScript(commands);
```

## Examples

### Example 1: Create and Execute JavaScript

```bash
$ mkdir projects
$ cd projects
$ write hello.js "console.log('Hello, World!');"
$ node hello.js
Hello, World!
```

### Example 2: Module System

```bash
$ write math.js "module.exports = { add: (a,b) => a+b };"
$ write main.js "const m = require('./math.js'); console.log(m.add(5,3));"
$ node main.js
8
```

### Example 3: Import and Process Files

```bash
$ import /path/to/data.txt
$ grep "error" data.txt
$ sed s/error/warning/g data.txt
$ export data.txt /path/to/output.txt
```

### Example 4: Batch Processing

```javascript
const { MemShell } = require('@autox/utileejs');
const shell = new MemShell();

// Create project structure
shell.exec('mkdir -p src tests docs');
shell.exec('write src/index.js "// Main file"');
shell.exec('write tests/test.js "// Tests"');
shell.exec('write README.md "# My Project"');

// Process files
const files = shell.exec('find . --type f');
console.log('Project files:', files);

// Search across all files
shell.exec('grep -n "TODO" $(find . --name "*.js")');
```

## Running Tests

```bash
npm test
```

## Running Examples

```bash
node examples/memfs-example.js
```

## CLI Usage

### Interactive Mode
```bash
memsh
```

### Execute Single Command
```bash
memsh -c "ls -l"
```

### Execute Script File
```bash
memsh script.sh
```

## Use Cases

1. **Testing**: Create isolated file system environments for tests
2. **Prototyping**: Quickly experiment with file operations
3. **Sandboxing**: Run code in isolated environment
4. **Education**: Learn shell commands safely
5. **Data Processing**: Manipulate files without touching real filesystem
6. **Build Tools**: Create temporary file structures for build processes

## License

EPL-2.0

## Author

Joohwi Lee <telnet2@gmail.com>

## Repository

https://github.com/telnet2/utileejs
