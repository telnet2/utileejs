#!/usr/bin/env node

/**
 * Example demonstrating pipes and HEREDOC features in MemShell
 */

const { MemShell } = require('../index');

console.log('===== Pipes and HEREDOC Examples =====\n');

const shell = new MemShell();

// Example 1: Simple pipe
console.log('Example 1: Simple Pipe');
console.log('----------------------');
shell.fs.createFile('data.txt', 'apple\nbanana\ncherry\napricot\nblueberry');
console.log('$ cat data.txt | grep a');
console.log(shell.exec('cat data.txt | grep a'));
console.log('');

// Example 2: Chained pipes
console.log('Example 2: Chained Pipes');
console.log('------------------------');
shell.fs.createFile('log.txt', 'INFO: Starting application\nERROR: Connection failed\nWARN: Retrying connection\nERROR: Authentication failed\nINFO: Shutting down');
console.log('$ cat log.txt | grep ERROR | sed s/ERROR/CRITICAL/g');
console.log(shell.exec('cat log.txt | grep ERROR | sed s/ERROR/CRITICAL/g'));
console.log('');

// Example 3: Pipe with line numbers
console.log('Example 3: Pipe with Line Numbers');
console.log('----------------------------------');
console.log('$ cat data.txt | grep -n berry');
console.log(shell.exec('cat data.txt | grep -n berry'));
console.log('');

// Example 4: HEREDOC with cat
console.log('Example 4: HEREDOC with cat');
console.log('---------------------------');
const heredocCat = `cat << EOF
This is a multi-line document
created using HEREDOC syntax.
It's very useful for creating
files with multiple lines!
EOF`;
console.log('$ cat << EOF');
console.log('> This is a multi-line document');
console.log('> created using HEREDOC syntax.');
console.log('> It\'s very useful for creating');
console.log('> files with multiple lines!');
console.log('> EOF');
console.log(shell.exec(heredocCat));
console.log('');

// Example 5: HEREDOC to create a file
console.log('Example 5: HEREDOC to Create a File');
console.log('------------------------------------');
const heredocWrite = `write config.txt << END
server:
  host: localhost
  port: 8080
database:
  connection: postgresql
  pool: 10
END`;
console.log('$ write config.txt << END');
console.log('> server:');
console.log('>   host: localhost');
console.log('>   port: 8080');
console.log('> database:');
console.log('>   connection: postgresql');
console.log('>   pool: 10');
console.log('> END');
shell.exec(heredocWrite);
console.log('File created! Contents:');
console.log(shell.exec('cat config.txt'));
console.log('');

// Example 6: HEREDOC with grep
console.log('Example 6: HEREDOC with grep');
console.log('----------------------------');
const heredocGrep = `grep -n server << EOF
client settings
server configuration
database server
client application
EOF`;
console.log('$ grep -n server << EOF');
console.log('> client settings');
console.log('> server configuration');
console.log('> database server');
console.log('> client application');
console.log('> EOF');
console.log(shell.exec(heredocGrep));
console.log('');

// Example 7: Pipe HEREDOC output
console.log('Example 7: Pipe HEREDOC Output');
console.log('-------------------------------');
const heredocPipe = `cat << DATA
error line 1
normal line
error line 2
another normal line
DATA | grep error`;
console.log('$ cat << DATA');
console.log('> error line 1');
console.log('> normal line');
console.log('> error line 2');
console.log('> another normal line');
console.log('> DATA | grep error');
console.log(shell.exec(heredocPipe));
console.log('');

// Example 8: Complex pipeline with HEREDOC
console.log('Example 8: Complex Pipeline with HEREDOC');
console.log('-----------------------------------------');
const complexPipe = `cat << CONTENT
Hello World
Test Line
Hello Universe
Another Test
CONTENT | grep Hello | sed s/Hello/Hi/g`;
console.log('$ cat << CONTENT');
console.log('> Hello World');
console.log('> Test Line');
console.log('> Hello Universe');
console.log('> Another Test');
console.log('> CONTENT | grep Hello | sed s/Hello/Hi/g');
console.log(shell.exec(complexPipe));
console.log('');

// Example 9: HEREDOC with sed
console.log('Example 9: HEREDOC with sed');
console.log('---------------------------');
const heredocSed = `sed s/old/new/g << TEXT
This is old text
More old content here
Yet another old value
TEXT`;
console.log('$ sed s/old/new/g << TEXT');
console.log('> This is old text');
console.log('> More old content here');
console.log('> Yet another old value');
console.log('> TEXT');
console.log(shell.exec(heredocSed));
console.log('');

// Example 10: Practical use case - generate and process script
console.log('Example 10: Generate and Execute Script');
console.log('----------------------------------------');
const scriptContent = `write script.js << CODE
const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((a, b) => a + b, 0);
console.log('Sum:', sum);
console.log('Average:', sum / numbers.length);
CODE`;
shell.exec(scriptContent);
console.log('Created script.js with HEREDOC, now executing:');
console.log('$ node script.js');
console.log(shell.exec('node script.js'));
console.log('');

console.log('===== Examples Complete =====');
console.log('\nPipes and HEREDOC make the shell much more powerful!');
console.log('Try them out in the interactive shell: ./bin/memsh');
