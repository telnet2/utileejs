const fs = require('fs');

const content = fs.readFileSync('src/MemShell.js', 'utf8');

// Find the start of diff method
const diffStart = content.indexOf('    diff(args) {');
// Find the end - where grep method starts
const grepStart = content.indexOf('    grep(args, stdin = null) {');

// Check if we found both markers
if (diffStart === -1 || grepStart === -1) {
    console.error('Could not find diff or grep methods');
    process.exit(1);
}

// Find the start of the diff method comment
const diffCommentStart = content.lastIndexOf('    /**', diffStart);

console.log(`Found diff at ${diffStart}, grep at ${grepStart}`);
console.log(`Diff comment starts at ${diffCommentStart}`);

// New implementation
const newDiffImplementation = `    /**
     * diff - compare files line by line (POSIX-compliant)
     * Supports: -u (unified), -c (context), -q (brief), -i, -w, -b, -B
     * Uses the 'diff' npm package for reliable diff logic
     */
    diff(args) {
        const parser = new ArgumentParser({
            prog: 'diff',
            description: 'Compare files line by line',
            add_help: true
        });

        parser.add_argument('-u', '--unified', {
            action: 'store_const',
            const: 3,
            dest: 'unified_context',
            help: 'Output 3 lines of unified context'
        });
        parser.add_argument('-U', {
            type: 'int',
            dest: 'unified_context',
            metavar: 'NUM',
            help: 'Output NUM lines of unified context'
        });
        parser.add_argument('-c', '--context', {
            action: 'store_const',
            const: 3,
            dest: 'context_format',
            help: 'Output 3 lines of copied context'
        });
        parser.add_argument('-C', {
            type: 'int',
            dest: 'context_format',
            metavar: 'NUM',
            help: 'Output NUM lines of copied context'
        });
        parser.add_argument('-q', '--brief', {
            action: 'store_true',
            help: 'Report only when files differ'
        });
        parser.add_argument('-i', '--ignore-case', {
            action: 'store_true',
            help: 'Ignore case differences'
        });
        parser.add_argument('-w', '--ignore-all-space', {
            action: 'store_true',
            help: 'Ignore all white space'
        });
        parser.add_argument('-b', '--ignore-space-change', {
            action: 'store_true',
            help: 'Ignore changes in the amount of white space'
        });
        parser.add_argument('-B', '--ignore-blank-lines', {
            action: 'store_true',
            help: 'Ignore changes whose lines are all blank'
        });
        parser.add_argument('file1', {
            help: 'First file to compare'
        });
        parser.add_argument('file2', {
            help: 'Second file to compare'
        });

        const parsed = this.parseArgsWithHelp(parser, args);
        if (typeof parsed === 'string') return parsed; // Help text

        // Read files
        const node1 = this.fs.resolvePath(parsed.file1);
        const node2 = this.fs.resolvePath(parsed.file2);

        if (!node1) {
            throw new Error(\`diff: \${parsed.file1}: No such file or directory\`);
        }
        if (!node2) {
            throw new Error(\`diff: \${parsed.file2}: No such file or directory\`);
        }
        if (!node1.isFile()) {
            throw new Error(\`diff: \${parsed.file1}: Is a directory\`);
        }
        if (!node2.isFile()) {
            throw new Error(\`diff: \${parsed.file2}: Is a directory\`);
        }

        let content1 = node1.read();
        let content2 = node2.read();

        // Build options for diff package
        const options = {};

        if (parsed.ignore_case) {
            options.ignoreCase = true;
        }
        if (parsed.ignore_all_space) {
            options.ignoreWhitespace = true;
        }

        // Check if files are identical (considering options)
        let compare1 = content1;
        let compare2 = content2;

        if (parsed.ignore_case) {
            compare1 = compare1.toLowerCase();
            compare2 = compare2.toLowerCase();
        }
        if (parsed.ignore_all_space) {
            compare1 = compare1.replace(/\\s+/g, '');
            compare2 = compare2.replace(/\\s+/g, '');
        } else if (parsed.ignore_space_change) {
            compare1 = compare1.replace(/\\s+/g, ' ');
            compare2 = compare2.replace(/\\s+/g, ' ');
        }
        if (parsed.ignore_blank_lines) {
            compare1 = compare1.split('\\n').filter(l => l.trim() !== '').join('\\n');
            compare2 = compare2.split('\\n').filter(l => l.trim() !== '').join('\\n');
        }

        if (compare1 === compare2) {
            return ''; // Files are identical
        }

        // Brief mode - just report if different
        if (parsed.brief) {
            return \`Files \${parsed.file1} and \${parsed.file2} differ\`;
        }

        // Determine format and context
        let context = 3;
        let format = 'normal';

        if (parsed.unified_context !== undefined && parsed.unified_context !== null) {
            format = 'unified';
            context = parsed.unified_context;
        } else if (parsed.context_format !== undefined && parsed.context_format !== null) {
            format = 'context';
            context = parsed.context_format;
        }

        // Generate diff using diff package
        if (format === 'unified') {
            const patch = Diff.createTwoFilesPatch(
                parsed.file1,
                parsed.file2,
                content1,
                content2,
                '',
                '',
                { context, ...options }
            );
            // Remove the header separator line
            const lines = patch.split('\\n');
            return lines.slice(1).join('\\n'); // Skip first line (===)
        } else if (format === 'context') {
            // Use structuredPatch to get the diff structure, then format as context
            const patch = Diff.structuredPatch(
                parsed.file1,
                parsed.file2,
                content1,
                content2,
                '',
                '',
                { context, ...options }
            );
            return this.formatContextDiff(patch);
        } else {
            // Normal format - use diffLines and format manually
            const changes = Diff.diffLines(content1, content2, options);
            return this.formatNormalDiff(parsed.file1, parsed.file2, changes);
        }
    }

    /**
     * Format diff changes as normal diff format
     */
    formatNormalDiff(file1, file2, changes) {
        const output = [];
        let oldLine = 0;
        let newLine = 0;

        for (let i = 0; i < changes.length; i++) {
            const change = changes[i];
            const lines = change.value.split('\\n');
            // Remove last empty line if present
            if (lines[lines.length - 1] === '') {
                lines.pop();
            }

            if (change.added || change.removed) {
                const nextChange = i + 1 < changes.length ? changes[i + 1] : null;
                const hasNext = nextChange && (nextChange.added || nextChange.removed);

                let oldStart = oldLine + 1;
                let oldEnd = oldLine + (change.removed ? lines.length : 0);
                let newStart = newLine + 1;
                let newEnd = newLine + (change.added ? lines.length : 0);

                if (change.removed && hasNext && nextChange.added) {
                    // Change operation
                    const addedLines = nextChange.value.split('\\n');
                    if (addedLines[addedLines.length - 1] === '') addedLines.pop();

                    newEnd = newLine + addedLines.length;
                    const oldRange = oldStart === oldEnd ? \`\${oldStart}\` : \`\${oldStart},\${oldEnd}\`;
                    const newRange = newStart === newEnd ? \`\${newStart}\` : \`\${newStart},\${newEnd}\`;

                    output.push(\`\${oldRange}c\${newRange}\`);
                    lines.forEach(line => output.push(\`< \${line}\`));
                    output.push('---');
                    addedLines.forEach(line => output.push(\`> \${line}\`));

                    oldLine = oldEnd;
                    newLine = newEnd;
                    i++; // Skip next change
                } else if (change.removed) {
                    // Delete operation
                    const oldRange = oldStart === oldEnd ? \`\${oldStart}\` : \`\${oldStart},\${oldEnd}\`;
                    output.push(\`\${oldRange}d\${newLine}\`);
                    lines.forEach(line => output.push(\`< \${line}\`));
                    oldLine = oldEnd;
                } else if (change.added) {
                    // Add operation
                    const newRange = newStart === newEnd ? \`\${newStart}\` : \`\${newStart},\${newEnd}\`;
                    output.push(\`\${oldLine}a\${newRange}\`);
                    lines.forEach(line => output.push(\`> \${line}\`));
                    newLine = newEnd;
                }
            } else {
                // Common lines
                oldLine += lines.length;
                newLine += lines.length;
            }
        }

        return output.join('\\n');
    }

    /**
     * Format structured patch as context diff format
     */
    formatContextDiff(patch) {
        const output = [];
        output.push(\`*** \${patch.oldFileName}\`);
        output.push(\`--- \${patch.newFileName}\`);

        for (const hunk of patch.hunks) {
            output.push(\`***************\`);
            output.push(\`*** \${hunk.oldStart},\${hunk.oldStart + hunk.oldLines - 1} ****\`);

            // Output old file lines
            hunk.lines.forEach(line => {
                if (line[0] === ' ') {
                    output.push(\` \${line.substring(1)}\`);
                } else if (line[0] === '-') {
                    output.push(\`- \${line.substring(1)}\`);
                }
            });

            output.push(\`--- \${hunk.newStart},\${hunk.newStart + hunk.newLines - 1} ----\`);

            // Output new file lines
            hunk.lines.forEach(line => {
                if (line[0] === ' ') {
                    output.push(\` \${line.substring(1)}\`);
                } else if (line[0] === '+') {
                    output.push(\`+ \${line.substring(1)}\`);
                }
            });
        }

        return output.join('\\n');
    }

`;

// Replace the section
const before = content.substring(0, diffCommentStart);
const after = content.substring(grepStart - 5); // Include some whitespace before grep

const newContent = before + newDiffImplementation + after;

fs.writeFileSync('src/MemShell.js', newContent);
console.log('Updated diff implementation successfully!');
