const fs = require('fs');

let content = fs.readFileSync('src/MemShell.js', 'utf8');

// Replace all safeParseArgs with parseArgsWithHelp
content = content.replace(/const parsed = this\.safeParseArgs\(parser, args\);/g, 
  'const parsed = this.parseArgsWithHelp(parser, args);\n        if (typeof parsed === \'string\') return parsed; // Help text');

fs.writeFileSync('src/MemShell.js', content);
console.log('Fixed help support');
