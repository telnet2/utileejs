import { MemFS, MemNode, MemFile, MemDirectory } from './MemFS';
import { JSEngine } from './JSEngine';
import { parsePipeline, parseRedirections, isInlineHeredoc, parseInlineHeredoc, PipelineSegment, Redirection } from './CommandParser';
import { ArgumentParser } from 'argparse';
import * as Diff from 'diff';
import micromatch = require('micromatch');
import { runKiana, DEFAULT_SYSTEM_PROMPT } from './KianaAgent';
import { StdoutWriter, BufferWriter } from './Writer';
import { MemTools } from './MemTools';

/**
 * Parsed arguments result
 */
interface ParsedArgs {
    flags: Record<string, any>;
    positional: string[];
}

/**
 * Help result from argument parser
 */
interface HelpResult {
    __help__: boolean;
    __message__: string;
}

/**
 * Shell-like command interface for MemFS
 */
export class MemShell {
    public fs: MemFS;
    public stdin: string | null;
    public jsEngine: JSEngine;

    constructor(memfs: MemFS | null = null) {
        this.fs = memfs || new MemFS();
        this.stdin = null;
        this.jsEngine = new JSEngine(this.fs);
    }

    /**
     * Safely parse arguments with ArgumentParser without exiting process
     * Returns help text for -h/--help, throws error for invalid args
     */
    safeParseArgs(parser: ArgumentParser, args: string[]): any {
        // Save original process.exit and stream writes
        const originalExit = process.exit as any;
        const originalStdoutWrite = process.stdout.write;
        const originalStderrWrite = process.stderr.write;

        let exitCalled = false;
        let exitCode = 0;
        let capturedOutput = '';

        // Override process.exit to capture exit attempts
        (process as any).exit = (code: number) => {
            exitCalled = true;
            exitCode = code;
            throw new Error('__EXIT__');
        };

        // Override stdout.write to capture output
        (process.stdout as any).write = function(chunk: any): boolean {
            capturedOutput += chunk.toString();
            return true;
        };

        // Override stderr.write to capture errors
        (process.stderr as any).write = function(chunk: any): boolean {
            capturedOutput += chunk.toString();
            return true;
        };

        try {
            const result = parser.parse_args(args);
            return result;
        } catch (err: any) {
            if (err.message === '__EXIT__' && exitCalled) {
                // Check if this was a help request (exit code 0) or contains help text
                if ((exitCode === 0 || capturedOutput.includes('usage:')) && capturedOutput) {
                    // Return special object indicating help was requested
                    return { __help__: true, __message__: capturedOutput.trim() };
                }
                // This was an error
                throw new Error(capturedOutput.trim());
            }
            throw err;
        } finally {
            // Restore original functions
            process.exit = originalExit;
            process.stdout.write = originalStdoutWrite;
            process.stderr.write = originalStderrWrite;
        }
    }

    /**
     * Parse arguments and handle help requests
     * Returns parsed args or help text
     */
    parseArgsWithHelp(parser: ArgumentParser, args: string[]): any {
        const parsed = this.safeParseArgs(parser, args);
        if (parsed && parsed.__help__) {
            return parsed.__message__;
        }
        return parsed;
    }

    /**
     * Expand wildcard patterns in arguments to matching file paths
     * Supports patterns like *.txt, test.*, etc.
     */
    expandWildcards(args: string[], cwd: string = '/'): string[] {
        const expanded: string[] = [];

        // Flags that expect pattern arguments (should not expand wildcards for these)
        const patternFlags = ['-name', '-iname', '-path', '-ipath', '-regex', '-iregex'];
        let skipNext = false;

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];

            // If previous arg was a pattern flag, don't expand this arg
            if (skipNext) {
                expanded.push(arg);
                skipNext = false;
                continue;
            }

            // Check if this arg is a pattern flag
            if (patternFlags.includes(arg)) {
                expanded.push(arg);
                skipNext = true;
                continue;
            }

            // Check if argument contains wildcard characters
            if (arg.includes('*') || arg.includes('?') || arg.includes('[')) {
                // Determine the base directory for the pattern
                let baseDir = cwd;
                let pattern = arg;

                // If pattern starts with /, it's absolute
                if (arg.startsWith('/')) {
                    pattern = arg.substring(1);
                    baseDir = '/';
                } else if (arg.includes('/')) {
                    // Pattern has directory components
                    const lastSlash = arg.lastIndexOf('/');
                    const dirPart = arg.substring(0, lastSlash);
                    pattern = arg.substring(lastSlash + 1);

                    // Resolve the directory part
                    const resolvedBase = this.fs.resolvePath(baseDir);
                    if (resolvedBase) {
                        const targetDir = this.fs.resolvePath(dirPart, resolvedBase);
                        if (targetDir && targetDir.isDirectory()) {
                            baseDir = targetDir.getPath();
                        }
                    }
                }

                // Get all files from the base directory
                const allFiles = this.getAllFilesRecursive(baseDir);

                // Match against the pattern
                const matches = micromatch(allFiles, pattern);

                if (matches.length > 0) {
                    // Add matched files with proper path prefix
                    matches.forEach((match: string) => {
                        if (baseDir === '/') {
                            expanded.push('/' + match);
                        } else {
                            expanded.push(baseDir + '/' + match);
                        }
                    });
                } else {
                    // No matches - keep the original pattern
                    expanded.push(arg);
                }
            } else {
                // Not a wildcard, keep as-is
                expanded.push(arg);
            }
        }

        return expanded;
    }

    /**
     * Get all files recursively from a directory
     * Returns relative paths from the given directory
     */
    getAllFilesRecursive(dirPath: string): string[] {
        const files: string[] = [];
        const node = this.fs.resolvePath(dirPath);

        if (!node || !node.isDirectory()) {
            return files;
        }

        const traverse = (dir: MemDirectory, relativePath: string = ''): void => {
            // children is a Map, not a plain object
            for (const [name, child] of Array.from(dir.children.entries())) {
                const childPath = relativePath ? `${relativePath}/${name}` : name;

                if (child.isFile()) {
                    files.push(childPath);
                } else if (child.isDirectory()) {
                    // Add directory itself
                    files.push(childPath);
                    // Traverse children
                    traverse(child, childPath);
                }
            }
        };

        traverse(node);
        return files;
    }

    /**
     * Legacy parseArgs for commands not yet migrated to argparse
     * @deprecated Use command-specific ArgumentParser instead
     */
    parseArgs(args: string[]): ParsedArgs {
        const flags: Record<string, any> = {};
        const positional: string[] = [];

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg.startsWith('--')) {
                const key = arg.slice(2);
                const nextArg = args[i + 1];
                if (nextArg && !nextArg.startsWith('-')) {
                    flags[key] = nextArg;
                    i++;
                } else {
                    flags[key] = true;
                }
            } else if (arg.startsWith('-') && arg.length > 1 && !arg.match(/^-\d/)) {
                for (let j = 1; j < arg.length; j++) {
                    flags[arg[j]] = true;
                }
            } else {
                positional.push(arg);
            }
        }

        return { flags, positional };
    }

    /**
     * ls - list directory contents
     */
    ls(args: string[]): string {
        const parser = new ArgumentParser({
            prog: 'ls',
            description: 'List directory contents',
            add_help: true
        });

        parser.add_argument('-l', {
            action: 'store_true',
            help: 'Use long listing format'
        });
        parser.add_argument('-a', '--all', {
            action: 'store_true',
            help: 'Show hidden files (. and ..)'
        });
        parser.add_argument('paths', {
            nargs: '*',
            default: ['.'],
            help: 'Directories or files to list'
        });

        const parsed = this.parseArgsWithHelp(parser, args);
        if (typeof parsed === 'string') return parsed; // Help text

        const paths = parsed.paths.length > 0 ? parsed.paths : ['.'];
        const results: string[] = [];

        // Check if we have multiple directories (not just multiple files)
        const dirCount = paths.filter((p: string) => {
            const n = this.fs.resolvePath(p);
            return n && n.isDirectory();
        }).length;

        for (let i = 0; i < paths.length; i++) {
            const pathStr = paths[i];
            const node = this.fs.resolvePath(pathStr);

            if (!node) {
                throw new Error(`ls: cannot access '${pathStr}': No such file or directory`);
            }

            // Show filename header if multiple directories
            if (dirCount > 1 && node.isDirectory()) {
                results.push(`${pathStr}:`);
            }

            if (node.isFile()) {
                results.push(parsed.l ? this.formatLong([node]) : node.name);
            } else if (node.isDirectory()) {
                const children = Array.from(node.children.values());

                if (parsed.l) {
                    results.push(this.formatLong(children));
                } else if (parsed.all) {
                    results.push(['.', '..', ...children.map((c: MemNode) => c.name)].join('\n'));
                } else {
                    results.push(children.map((c: MemNode) => c.name).join('\n'));
                }

                // Add blank line after directory listing if there are more items
                if (dirCount > 1 && i < paths.length - 1) {
                    results.push('');
                }
            }
        }

        return results.join('\n').trim();
    }

    formatLong(nodes: MemNode[]): string {
        const lines = nodes.map(node => {
            const type = node.isDirectory() ? 'd' : '-';
            const size = node.isFile() ? node.size().toString().padStart(8) : '0'.padStart(8);
            const date = node.modifiedAt.toISOString().slice(0, 16).replace('T', ' ');
            return `${type}rwxr-xr-x  ${size}  ${date}  ${node.name}`;
        });
        return lines.join('\n');
    }

    /**
     * cat - concatenate and display file contents
     * If stdin is provided and no files, use stdin
     */
    cat(args: string[], stdin: string | null = null): string {
        const parser = new ArgumentParser({
            prog: 'cat',
            description: 'Concatenate and display files',
            add_help: true
        });

        parser.add_argument('-n', '--number', {
            action: 'store_true',
            help: 'Number all output lines'
        });
        parser.add_argument('files', {
            nargs: '*',
            help: 'Files to concatenate (use - for stdin)'
        });

        const parsed = this.parseArgsWithHelp(parser, args);
        if (typeof parsed === 'string') return parsed; // Help text

        // If no files specified and stdin is available, use stdin
        if (parsed.files.length === 0) {
            if (stdin !== null && stdin !== undefined) {
                return this.numberLines(stdin, parsed.number);
            }
            throw new Error('cat: missing file operand');
        }

        const outputs: string[] = [];
        for (const pathStr of parsed.files) {
            // Support "-" to read from stdin
            if (pathStr === '-' && stdin !== null && stdin !== undefined) {
                outputs.push(stdin);
                continue;
            }

            const node = this.fs.resolvePath(pathStr);
            if (!node) {
                throw new Error(`cat: ${pathStr}: No such file or directory`);
            }
            if (!node.isFile()) {
                throw new Error(`cat: ${pathStr}: Is a directory`);
            }
            outputs.push(node.read());
        }

        const result = outputs.join('');
        return this.numberLines(result, parsed.number);
    }

    /**
     * Helper to number lines for cat -n
     */
    numberLines(content: string, shouldNumber: boolean): string {
        if (!shouldNumber) return content;
        const lines = content.split('\n');
        return lines.map((line, i) => `${(i + 1).toString().padStart(6)}  ${line}`).join('\n');
    }

    /**
     * pwd - print working directory
     */
    pwd(args: string[]): string {
        return this.fs.getCurrentDirectory();
    }

    /**
     * cd - change directory
     */
    cd(args: string[]): string {
        const parser = new ArgumentParser({
            prog: 'cd',
            description: 'Change directory',
            add_help: true
        });

        parser.add_argument('path', {
            nargs: '?',
            default: '/',
            help: 'Directory to change to'
        });

        const parsed = this.parseArgsWithHelp(parser, args);
        if (typeof parsed === 'string') return parsed; // Help text
        this.fs.changeDirectory(parsed.path);
        return '';
    }

    /**
     * mkdir - make directories
     */
    mkdir(args: string[]): string {
        const parser = new ArgumentParser({
            prog: 'mkdir',
            description: 'Create directories',
            add_help: true
        });

        parser.add_argument('-p', '--parents', {
            action: 'store_true',
            help: 'Create parent directories as needed'
        });
        parser.add_argument('directories', {
            nargs: '+',
            help: 'Directories to create'
        });

        const parsed = this.parseArgsWithHelp(parser, args);
        if (typeof parsed === 'string') return parsed; // Help text

        for (const pathStr of parsed.directories) {
            if (parsed.parents) {
                this.fs.createDirectories(pathStr);
            } else {
                this.fs.createDirectory(pathStr);
            }
        }

        return '';
    }

    /**
     * touch - create empty file or update timestamp
     */
    touch(args: string[]): string {
        const parser = new ArgumentParser({
            prog: 'touch',
            description: 'Create empty file or update timestamp',
            add_help: true
        });

        parser.add_argument('files', {
            nargs: '+',
            help: 'Files to touch'
        });

        const parsed = this.parseArgsWithHelp(parser, args);
        if (typeof parsed === 'string') return parsed; // Help text

        for (const pathStr of parsed.files) {
            const node = this.fs.resolvePath(pathStr);
            if (node) {
                node.modifiedAt = new Date();
            } else {
                this.fs.createFile(pathStr, '');
            }
        }

        return '';
    }

    /**
     * rm - remove files or directories
     */
    rm(args: string[]): string {
        const parser = new ArgumentParser({
            prog: 'rm',
            description: 'Remove files or directories',
            add_help: true
        });

        parser.add_argument('-r', {
            dest: 'recursive',
            action: 'store_true',
            help: 'Remove directories recursively'
        });
        parser.add_argument('-R', '--recursive', {
            action: 'store_true',
            help: 'Remove directories recursively'
        });
        parser.add_argument('-f', '--force', {
            action: 'store_true',
            help: 'Ignore nonexistent files, never prompt'
        });
        parser.add_argument('paths', {
            nargs: '+',
            help: 'Files or directories to remove'
        });

        const parsed = this.parseArgsWithHelp(parser, args);
        if (typeof parsed === 'string') return parsed; // Help text

        for (const pathStr of parsed.paths) {
            this.fs.remove(pathStr, parsed.recursive);
        }

        return '';
    }

    /**
     * echo - display a line of text
     */
    echo(args: string[]): string {
        return args.join(' ');
    }

    /**
     * diff - compare files line by line (POSIX-compliant)
     * Supports: -u (unified), -c (context), -q (brief), -i, -w, -b, -B
     */
    diff(args: string[]): string {
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
            throw new Error(`diff: ${parsed.file1}: No such file or directory`);
        }
        if (!node2) {
            throw new Error(`diff: ${parsed.file2}: No such file or directory`);
        }
        if (!node1.isFile()) {
            throw new Error(`diff: ${parsed.file1}: Is a directory`);
        }
        if (!node2.isFile()) {
            throw new Error(`diff: ${parsed.file2}: Is a directory`);
        }

        let lines1 = node1.read().split('\n');
        let lines2 = node2.read().split('\n');

        // Apply ignore options
        const normalizeLine = (line: string): string => {
            let normalized = line;
            if (parsed.ignore_case) {
                normalized = normalized.toLowerCase();
            }
            if (parsed.ignore_all_space) {
                normalized = normalized.replace(/\s+/g, '');
            } else if (parsed.ignore_space_change) {
                normalized = normalized.replace(/\s+/g, ' ').trim();
            }
            return normalized;
        };

        // Normalize lines for comparison
        const normalized1 = lines1.map(normalizeLine);
        const normalized2 = lines2.map(normalizeLine);

        // Filter blank lines if requested
        let compareLines1 = lines1;
        let compareLines2 = lines2;
        let compareNorm1 = normalized1;
        let compareNorm2 = normalized2;

        if (parsed.ignore_blank_lines) {
            const filterBlanks = (lines: string[], norms: string[]) => {
                const result: { lines: string[]; norms: string[]; map: number[] } = { lines: [], norms: [], map: [] };
                lines.forEach((line, i) => {
                    if (line.trim() !== '') {
                        result.lines.push(line);
                        result.norms.push(norms[i]);
                        result.map.push(i);
                    }
                });
                return result;
            };

            const filtered1 = filterBlanks(lines1, normalized1);
            const filtered2 = filterBlanks(lines2, normalized2);
            compareLines1 = filtered1.lines;
            compareLines2 = filtered2.lines;
            compareNorm1 = filtered1.norms;
            compareNorm2 = filtered2.norms;
        }

        // Quick check if files are identical
        if (compareNorm1.length === compareNorm2.length &&
            compareNorm1.every((line, i) => line === compareNorm2[i])) {
            return ''; // Files are identical
        }

        // Brief mode - just report if different
        if (parsed.brief) {
            return `Files ${parsed.file1} and ${parsed.file2} differ`;
        }

        // Compute diff using Myers algorithm (simplified LCS-based approach)
        const diff = this.computeDiff(compareNorm1, compareNorm2);

        // Format output based on mode
        if (parsed.unified_context !== undefined && parsed.unified_context !== null) {
            return this.formatUnifiedDiff(parsed.file1, parsed.file2, lines1, lines2, diff, parsed.unified_context);
        } else if (parsed.context_format !== undefined && parsed.context_format !== null) {
            return this.formatContextDiff(parsed.file1, parsed.file2, lines1, lines2, diff, parsed.context_format);
        } else {
            return this.formatNormalDiff(parsed.file1, parsed.file2, lines1, lines2, diff);
        }
    }

    /**
     * Compute diff using simple LCS-based algorithm
     */
    computeDiff(lines1: string[], lines2: string[]): any[] {
        const m = lines1.length;
        const n = lines2.length;

        // Build LCS table
        const lcs: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (lines1[i - 1] === lines2[j - 1]) {
                    lcs[i][j] = lcs[i - 1][j - 1] + 1;
                } else {
                    lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
                }
            }
        }

        // Backtrack to find diff
        const diff: any[] = [];
        let i = m, j = n;

        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && lines1[i - 1] === lines2[j - 1]) {
                diff.unshift({ type: 'common', line1: i - 1, line2: j - 1 });
                i--;
                j--;
            } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
                diff.unshift({ type: 'add', line2: j - 1 });
                j--;
            } else if (i > 0) {
                diff.unshift({ type: 'delete', line1: i - 1 });
                i--;
            }
        }

        return diff;
    }

    /**
     * Format diff in normal format
     */
    formatNormalDiff(file1: string, file2: string, lines1: string[], lines2: string[], diff: any[]): string {
        const output: string[] = [];
        let i = 0;

        while (i < diff.length) {
            // Find continuous block of changes
            if (diff[i].type === 'common') {
                i++;
                continue;
            }

            let start1 = diff[i].line1 !== undefined ? diff[i].line1 : -1;
            let start2 = diff[i].line2 !== undefined ? diff[i].line2 : -1;
            let deletes: number[] = [];
            let adds: number[] = [];

            while (i < diff.length && diff[i].type !== 'common') {
                if (diff[i].type === 'delete') {
                    deletes.push(diff[i].line1);
                } else if (diff[i].type === 'add') {
                    adds.push(diff[i].line2);
                }
                i++;
            }

            if (deletes.length > 0 && adds.length > 0) {
                // Change
                const range1 = deletes.length === 1 ? `${deletes[0] + 1}` : `${deletes[0] + 1},${deletes[deletes.length - 1] + 1}`;
                const range2 = adds.length === 1 ? `${adds[0] + 1}` : `${adds[0] + 1},${adds[adds.length - 1] + 1}`;
                output.push(`${range1}c${range2}`);
                deletes.forEach(idx => output.push(`< ${lines1[idx]}`));
                output.push('---');
                adds.forEach(idx => output.push(`> ${lines2[idx]}`));
            } else if (deletes.length > 0) {
                // Delete
                const range1 = deletes.length === 1 ? `${deletes[0] + 1}` : `${deletes[0] + 1},${deletes[deletes.length - 1] + 1}`;
                const pos2 = adds.length > 0 ? adds[0] + 1 : (deletes[0] + 1);
                output.push(`${range1}d${pos2}`);
                deletes.forEach(idx => output.push(`< ${lines1[idx]}`));
            } else if (adds.length > 0) {
                // Add
                const pos1 = deletes.length > 0 ? deletes[0] + 1 : (adds[0]);
                const range2 = adds.length === 1 ? `${adds[0] + 1}` : `${adds[0] + 1},${adds[adds.length - 1] + 1}`;
                output.push(`${pos1}a${range2}`);
                adds.forEach(idx => output.push(`> ${lines2[idx]}`));
            }
        }

        return output.join('\n');
    }

    /**
     * Format diff in unified format
     */
    formatUnifiedDiff(file1: string, file2: string, lines1: string[], lines2: string[], diff: any[], context: number): string {
        const output: string[] = [];
        output.push(`--- ${file1}`);
        output.push(`+++ ${file2}`);

        let i = 0;
        while (i < diff.length) {
            // Skip common lines until we find a change
            while (i < diff.length && diff[i].type === 'common') {
                i++;
            }

            if (i >= diff.length) break;

            // Start of a hunk - go back for context
            const hunkStart = Math.max(0, i - context);
            let j = i;

            // Find end of changes + context
            while (j < diff.length && (diff[j].type !== 'common' ||
                   (j < diff.length - 1 && j - i < context * 2))) {
                j++;
            }

            const hunkEnd = Math.min(diff.length, j + context);

            // Calculate line ranges
            let line1Start = diff[hunkStart].line1 !== undefined ? diff[hunkStart].line1 + 1 : 1;
            let line2Start = diff[hunkStart].line2 !== undefined ? diff[hunkStart].line2 + 1 : 1;
            let count1 = 0, count2 = 0;

            for (let k = hunkStart; k < hunkEnd; k++) {
                if (diff[k].type === 'common' || diff[k].type === 'delete') count1++;
                if (diff[k].type === 'common' || diff[k].type === 'add') count2++;
            }

            output.push(`@@ -${line1Start},${count1} +${line2Start},${count2} @@`);

            // Output hunk
            for (let k = hunkStart; k < hunkEnd; k++) {
                if (diff[k].type === 'common') {
                    output.push(` ${lines1[diff[k].line1]}`);
                } else if (diff[k].type === 'delete') {
                    output.push(`-${lines1[diff[k].line1]}`);
                } else if (diff[k].type === 'add') {
                    output.push(`+${lines2[diff[k].line2]}`);
                }
            }

            i = hunkEnd;
        }

        return output.join('\n');
    }

    /**
     * Format diff in context format
     */
    formatContextDiff(file1: string, file2: string, lines1: string[], lines2: string[], diff: any[], context: number): string {
        const output: string[] = [];
        output.push(`*** ${file1}`);
        output.push(`--- ${file2}`);

        let i = 0;
        while (i < diff.length) {
            // Skip common lines
            while (i < diff.length && diff[i].type === 'common') {
                i++;
            }

            if (i >= diff.length) break;

            const hunkStart = Math.max(0, i - context);
            let j = i;

            while (j < diff.length && (diff[j].type !== 'common' || j - i < context * 2)) {
                j++;
            }

            const hunkEnd = Math.min(diff.length, j + context);

            // Output context hunk header
            let line1Start = diff[hunkStart].line1 !== undefined ? diff[hunkStart].line1 + 1 : 1;
            let line1End = line1Start;
            let line2Start = diff[hunkStart].line2 !== undefined ? diff[hunkStart].line2 + 1 : 1;
            let line2End = line2Start;

            for (let k = hunkStart; k < hunkEnd; k++) {
                if (diff[k].line1 !== undefined) line1End = diff[k].line1 + 1;
                if (diff[k].line2 !== undefined) line2End = diff[k].line2 + 1;
            }

            output.push(`***************`);
            output.push(`*** ${line1Start},${line1End} ****`);

            // Output old file context
            for (let k = hunkStart; k < hunkEnd; k++) {
                if (diff[k].type === 'common') {
                    output.push(`  ${lines1[diff[k].line1]}`);
                } else if (diff[k].type === 'delete') {
                    output.push(`- ${lines1[diff[k].line1]}`);
                }
            }

            output.push(`--- ${line2Start},${line2End} ----`);

            // Output new file context
            for (let k = hunkStart; k < hunkEnd; k++) {
                if (diff[k].type === 'common') {
                    output.push(`  ${lines2[diff[k].line2]}`);
                } else if (diff[k].type === 'add') {
                    output.push(`+ ${lines2[diff[k].line2]}`);
                }
            }

            i = hunkEnd;
        }

        return output.join('\n');
    }

    /**
     * grep - search for patterns in files (POSIX-compliant)
     * If stdin is provided and no files, use stdin
     * Supports: -i, -n, -v, -e, -A, -B, -C, -h
     */
    grep(args: string[], stdin: string | null = null): string {
        // Create argument parser for grep
        // Note: add_help is false because grep uses -h for --no-filename
        const parser = new ArgumentParser({
            prog: 'grep',
            description: 'Search for patterns in files',
            add_help: false
        });

        // Manually add --help (without -h short form since grep uses -h for --no-filename)
        parser.add_argument('--help', {
            action: 'help',
            help: 'Show this help message and exit'
        });

        // Add arguments
        parser.add_argument('-e', '--regexp', {
            action: 'append',
            dest: 'patterns',
            metavar: 'PATTERN',
            help: 'Pattern to search for (can be used multiple times)'
        });
        parser.add_argument('-i', '--ignore-case', {
            action: 'store_true',
            help: 'Ignore case distinctions'
        });
        parser.add_argument('-n', '--line-number', {
            action: 'store_true',
            help: 'Prefix each line with line number'
        });
        parser.add_argument('-v', '--invert-match', {
            action: 'store_true',
            help: 'Select non-matching lines'
        });
        parser.add_argument('-h', '--no-filename', {
            action: 'store_true',
            help: 'Suppress file name prefix'
        });
        parser.add_argument('-A', '--after-context', {
            type: 'int',
            default: 0,
            metavar: 'NUM',
            help: 'Print NUM lines of trailing context'
        });
        parser.add_argument('-B', '--before-context', {
            type: 'int',
            default: 0,
            metavar: 'NUM',
            help: 'Print NUM lines of leading context'
        });
        parser.add_argument('-C', '--context', {
            type: 'int',
            default: 0,
            metavar: 'NUM',
            help: 'Print NUM lines of context'
        });
        parser.add_argument('rest', {
            nargs: '*',
            help: 'PATTERN and FILES (if -e not used)'
        });

        // Parse arguments
        const parsed = this.parseArgsWithHelp(parser, args);
        if (typeof parsed === 'string') return parsed; // Help text

        // Extract pattern and files
        let patterns: string[] = parsed.patterns || [];
        let files: string[] = [];

        if (patterns.length === 0) {
            // No -e flag, first positional is pattern
            if (parsed.rest.length === 0) {
                throw new Error('grep: missing pattern');
            }
            patterns = [parsed.rest[0]];
            files = parsed.rest.slice(1);
        } else {
            // -e flag used, all positionals are files
            files = parsed.rest;
        }

        // Handle context flags (-C overrides -A and -B if set)
        const afterContext = parsed.context || parsed.after_context;
        const beforeContext = parsed.context || parsed.before_context;
        const suppressFilename = parsed.no_filename;

        // Helper function to search lines and return matches with context
        const searchLines = (lines: string[], filename: string | null = null): string[] => {
            const results: string[] = [];
            const matchedIndices = new Set<number>();
            const regexFlags = parsed.ignore_case ? 'i' : '';

            // Build regex patterns
            const regexes = patterns.map(p => new RegExp(p, regexFlags));

            // Find all matching lines
            lines.forEach((line, index) => {
                const matches = regexes.some(regex => {
                    const result = regex.test(line);
                    regex.lastIndex = 0; // Reset for global flag
                    return result;
                });

                if (matches) {
                    matchedIndices.add(index);
                }
            });

            // Expand to include context lines
            const outputIndices = new Set<number>();
            matchedIndices.forEach(index => {
                // Add before context
                for (let i = Math.max(0, index - beforeContext); i < index; i++) {
                    outputIndices.add(i);
                }
                // Add match line
                outputIndices.add(index);
                // Add after context
                for (let i = index + 1; i <= Math.min(lines.length - 1, index + afterContext); i++) {
                    outputIndices.add(i);
                }
            });

            // Sort indices and build output
            const sortedIndices = Array.from(outputIndices).sort((a, b) => a - b);
            let lastIndex = -2;

            sortedIndices.forEach(index => {
                // Add separator for non-contiguous lines
                if (lastIndex >= 0 && index > lastIndex + 1) {
                    results.push('--');
                }

                const line = lines[index];
                const isMatch = matchedIndices.has(index);
                const lineNumPrefix = parsed.line_number ? `${index + 1}${isMatch ? ':' : '-'}` : '';
                const filePrefix = (filename && !suppressFilename) ? `${filename}${isMatch ? ':' : '-'}` : '';

                results.push(`${filePrefix}${lineNumPrefix}${line}`);
                lastIndex = index;
            });

            return results;
        };

        // If no files and stdin is available, use stdin
        if (files.length === 0 && stdin !== null && stdin !== undefined) {
            const content = stdin;
            const lines = content.split('\n');
            const results = searchLines(lines, null);
            return results.join('\n');
        }

        if (files.length === 0) {
            throw new Error('grep: missing file operand');
        }

        const allResults: string[] = [];

        for (const pathStr of files) {
            const node = this.fs.resolvePath(pathStr);
            if (!node) {
                allResults.push(`grep: ${pathStr}: No such file or directory`);
                continue;
            }
            if (!node.isFile()) {
                allResults.push(`grep: ${pathStr}: Is a directory`);
                continue;
            }

            const content = node.read();
            const lines = content.split('\n');

            // Determine if we should show filename (multiple files, unless -h)
            const showFilename = files.length > 1 && !suppressFilename;
            const filename = showFilename ? pathStr : null;

            const results = searchLines(lines, filename);

            if (results.length > 0) {
                allResults.push(results.join('\n'));
            }
        }

        return allResults.join('\n');
    }

    /**
     * find - search for files in a directory hierarchy
     */
    find(args: string[]): string {
        const parser = new ArgumentParser({
            prog: 'find',
            description: 'Search for files in directory hierarchy',
            add_help: true
        });

        parser.add_argument('path', {
            nargs: '?',
            default: '.',
            help: 'Starting directory'
        });
        parser.add_argument('-name', {
            help: 'Base of file name (can use wildcards)'
        });
        parser.add_argument('-type', {
            choices: ['f', 'd', 'l'],
            help: 'File type: f (file), d (directory), l (link)'
        });
        parser.add_argument('-maxdepth', {
            type: 'int',
            help: 'Maximum directory depth'
        });

        const parsed = this.parseArgsWithHelp(parser, args);
        if (typeof parsed === 'string') return parsed; // Help text
        const node = this.fs.resolvePath(parsed.path);

        if (!node) {
            throw new Error(`find: '${parsed.path}': No such file or directory`);
        }

        const results: string[] = [];
        const namePattern = parsed.name ? new RegExp(parsed.name.replace(/\*/g, '.*').replace(/\?/g, '.')) : null;
        const typeFilter = parsed.type;
        const maxDepth = parsed.maxdepth;

        const traverse = (current: MemNode, basePath: string | null, depth: number = 0): void => {
            const currentPath = basePath || current.getPath();

            // Apply filters
            let shouldInclude = true;
            if (namePattern && !namePattern.test(current.name)) {
                shouldInclude = false;
            }
            if (typeFilter === 'f' && !current.isFile()) {
                shouldInclude = false;
            }
            if (typeFilter === 'd' && !current.isDirectory()) {
                shouldInclude = false;
            }

            if (shouldInclude) {
                results.push(currentPath);
            }

            // Check depth limit
            if (maxDepth !== null && maxDepth !== undefined && depth >= maxDepth) {
                return;
            }

            if (current.isDirectory()) {
                for (const child of current.listChildren()) {
                    const childPath = currentPath === '/' ? `/${child.name}` : `${currentPath}/${child.name}`;
                    traverse(child, childPath, depth + 1);
                }
            }
        };

        traverse(node, null);
        return results.join('\n');
    }

    /**
     * sed - stream editor for filtering and transforming text
     * If stdin is provided and no file, use stdin
     */
    sed(args: string[], stdin: string | null = null): string {
        const parser = new ArgumentParser({
            prog: 'sed',
            description: 'Stream editor for filtering and transforming text',
            add_help: true
        });

        parser.add_argument('-e', '--expression', {
            action: 'append',
            dest: 'scripts',
            help: 'Add the script to the commands to be executed'
        });
        parser.add_argument('-i', '--in-place', {
            action: 'store_true',
            help: 'Edit files in place'
        });
        parser.add_argument('-n', '--quiet', {
            dest: 'quiet',
            action: 'store_true',
            help: 'Suppress automatic printing of pattern space'
        });
        parser.add_argument('--silent', {
            dest: 'quiet',
            action: 'store_true',
            help: 'Suppress automatic printing of pattern space'
        });
        parser.add_argument('rest', {
            nargs: '*',
            help: 'Script and file (if -e not used)'
        });

        const parsed = this.parseArgsWithHelp(parser, args);
        if (typeof parsed === 'string') return parsed; // Help text

        // Get scripts
        let scripts: string[] = parsed.scripts || [];
        let filePath: string | null = null;

        if (scripts.length === 0) {
            if (parsed.rest.length === 0) {
                throw new Error('sed: missing script');
            }
            scripts = [parsed.rest[0]];
            filePath = parsed.rest[1];
        } else {
            filePath = parsed.rest[0];
        }

        // Process each script
        const transformations: Array<{ regex: RegExp; replacement: string; print: boolean }> = [];
        for (const script of scripts) {
            // Parse sed command (support basic s/pattern/replacement/flags)
            const sedMatch = script.match(/^s\/(.+?)\/(.*)\/([gip]*)$/);
            if (!sedMatch) {
                throw new Error(`sed: unsupported command: ${script}`);
            }

            const [, pattern, replacement, flagsStr] = sedMatch;
            const flags = flagsStr.includes('i') ? 'gi' : 'g';
            const regex = new RegExp(pattern, flags);
            transformations.push({ regex, replacement, print: flagsStr.includes('p') });
        }

        // Get content
        let content: string;
        if (!filePath && stdin !== null && stdin !== undefined) {
            content = stdin;
        } else if (!filePath) {
            throw new Error('sed: missing file operand');
        } else {
            const node = this.fs.resolvePath(filePath);
            if (!node) {
                throw new Error(`sed: can't read ${filePath}: No such file or directory`);
            }
            if (!node.isFile()) {
                throw new Error(`sed: ${filePath}: Is a directory`);
            }
            content = node.read();
        }

        // Apply transformations
        for (const { regex, replacement } of transformations) {
            content = content.replace(regex, replacement);
        }

        // Write back if in-place and file specified
        if (parsed.in_place && filePath) {
            const node = this.fs.resolvePath(filePath);
            if (node && node.isFile()) {
                node.write(content);
            }
        }

        return content;
    }

    /**
     * patch - apply a diff file to an original
     * Supports unified, context, and normal diff formats
     */
    patch(args: string[], stdin: string | null = null): string {
        const parser = new ArgumentParser({
            prog: 'patch',
            description: 'Apply a diff file to an original',
            add_help: true
        });

        parser.add_argument('-p', '--strip', {
            type: 'int',
            default: 0,
            metavar: 'NUM',
            dest: 'strip',
            help: 'Strip NUM leading path components from filenames'
        });
        parser.add_argument('-R', '--reverse', {
            action: 'store_true',
            help: 'Apply patch in reverse'
        });
        parser.add_argument('-o', '--output', {
            metavar: 'FILE',
            help: 'Output to FILE instead of patching in-place'
        });
        parser.add_argument('-i', '--input', {
            metavar: 'PATCHFILE',
            help: 'Read patch from PATCHFILE instead of stdin'
        });
        parser.add_argument('file', {
            nargs: '?',
            help: 'File to patch (can be determined from patch)'
        });

        const parsed = this.parseArgsWithHelp(parser, args);
        if (typeof parsed === 'string') return parsed; // Help text

        // Get patch content
        let patchContent: string;
        if (parsed.input) {
            const patchNode = this.fs.resolvePath(parsed.input);
            if (!patchNode) {
                throw new Error(`patch: ${parsed.input}: No such file or directory`);
            }
            if (!patchNode.isFile()) {
                throw new Error(`patch: ${parsed.input}: Is a directory`);
            }
            patchContent = patchNode.read();
        } else if (stdin !== null && stdin !== undefined) {
            patchContent = stdin;
        } else {
            throw new Error('patch: missing patch input (use -i or stdin)');
        }

        // Parse the patch
        const patchInfo = this.parsePatch(patchContent);

        // Determine target file
        let targetFile = parsed.file;
        if (!targetFile && patchInfo.targetFile) {
            // Extract from patch headers with path stripping
            targetFile = this.stripPathComponents(patchInfo.targetFile, parsed.strip);
        }

        if (!targetFile) {
            throw new Error('patch: cannot determine file to patch');
        }

        // Read original file
        const targetNode = this.fs.resolvePath(targetFile);
        if (!targetNode) {
            throw new Error(`patch: ${targetFile}: No such file or directory`);
        }
        if (!targetNode.isFile()) {
            throw new Error(`patch: ${targetFile}: Is a directory`);
        }

        const originalContent = targetNode.read();
        const originalLines = originalContent.split('\n');

        // Apply patch
        const patchedLines = this.applyPatch(originalLines, patchInfo.hunks, parsed.reverse);
        const patchedContent = patchedLines.join('\n');

        // Write result
        if (parsed.output) {
            const outputNode = this.fs.resolvePath(parsed.output);
            if (outputNode && outputNode.isFile()) {
                outputNode.write(patchedContent);
            } else {
                // Create new file
                this.fs.createFile(parsed.output, patchedContent);
            }
            return `patched to ${parsed.output}`;
        } else {
            targetNode.write(patchedContent);
            return `patched ${targetFile}`;
        }
    }

    /**
     * Parse patch file and extract hunks
     * Supports unified, context, and normal diff formats
     */
    parsePatch(patchContent: string): { targetFile: string | null; sourceFile: string | null; hunks: any[] } {
        const lines = patchContent.split('\n');
        const hunks: any[] = [];
        let targetFile: string | null = null;
        let sourceFile: string | null = null;
        let i = 0;

        // Detect format and parse
        while (i < lines.length) {
            const line = lines[i];

            // Parse unified diff format (--- and +++)
            if (line.startsWith('---')) {
                sourceFile = this.extractFilename(line);
                i++;
                if (i < lines.length && lines[i].startsWith('+++')) {
                    targetFile = this.extractFilename(lines[i]);
                    i++;
                }
                continue;
            }

            // Parse unified diff hunk (@@ -start,count +start,count @@)
            if (line.startsWith('@@')) {
                const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
                if (match) {
                    const oldStart = parseInt(match[1]) - 1; // Convert to 0-based
                    const oldCount = match[2] ? parseInt(match[2]) : 1;
                    const newStart = parseInt(match[3]) - 1;
                    const newCount = match[4] ? parseInt(match[4]) : 1;

                    const hunk: any = {
                        type: 'unified',
                        oldStart,
                        oldCount,
                        newStart,
                        newCount,
                        lines: []
                    };

                    i++;
                    // Read hunk content
                    while (i < lines.length && !lines[i].startsWith('@@') && !lines[i].startsWith('---')) {
                        const hunkLine = lines[i];
                        if (hunkLine.startsWith(' ') || hunkLine.startsWith('+') || hunkLine.startsWith('-')) {
                            hunk.lines.push({
                                type: hunkLine[0] === '+' ? 'add' : hunkLine[0] === '-' ? 'delete' : 'context',
                                content: hunkLine.substring(1)
                            });
                        } else if (hunkLine === '') {
                            hunk.lines.push({ type: 'context', content: '' });
                        }
                        i++;
                    }

                    hunks.push(hunk);
                    continue;
                }
            }

            // Parse normal diff format (1,2c3,4 or 1d2 or 1a2,3)
            const normalMatch = line.match(/^(\d+)(?:,(\d+))?([adc])(\d+)(?:,(\d+))?$/);
            if (normalMatch) {
                const oldStart = parseInt(normalMatch[1]) - 1;
                const oldEnd = normalMatch[2] ? parseInt(normalMatch[2]) - 1 : oldStart;
                const operation = normalMatch[3];
                const newStart = parseInt(normalMatch[4]) - 1;
                const newEnd = normalMatch[5] ? parseInt(normalMatch[5]) - 1 : newStart;

                const hunk: any = {
                    type: 'normal',
                    operation,
                    oldStart,
                    oldEnd,
                    newStart,
                    newEnd,
                    oldLines: [],
                    newLines: []
                };

                i++;

                // Read old lines (< prefix)
                if (operation === 'c' || operation === 'd') {
                    while (i < lines.length && lines[i].startsWith('<')) {
                        hunk.oldLines.push(lines[i].substring(2));
                        i++;
                    }
                }

                // Skip separator (---)
                if (i < lines.length && lines[i] === '---') {
                    i++;
                }

                // Read new lines (> prefix)
                if (operation === 'c' || operation === 'a') {
                    while (i < lines.length && lines[i].startsWith('>')) {
                        hunk.newLines.push(lines[i].substring(2));
                        i++;
                    }
                }

                hunks.push(hunk);
                continue;
            }

            i++;
        }

        return { targetFile, sourceFile, hunks };
    }

    /**
     * Extract filename from diff header line
     */
    extractFilename(line: string): string {
        // Remove prefix (---, +++, etc.)
        let filename = line.replace(/^[-+]{3}\s+/, '');

        // Remove timestamp if present
        filename = filename.replace(/\t.*$/, '');

        // Remove quotes if present
        filename = filename.replace(/^["']|["']$/g, '');

        return filename;
    }

    /**
     * Strip leading path components from filename
     */
    stripPathComponents(filename: string, count: number): string {
        if (count === 0) return filename;

        const parts = filename.split('/');
        if (count >= parts.length) {
            return parts[parts.length - 1];
        }

        return parts.slice(count).join('/');
    }

    /**
     * Apply parsed hunks to original lines
     */
    applyPatch(originalLines: string[], hunks: any[], reverse: boolean = false): string[] {
        let result = [...originalLines];

        // Apply hunks in reverse order to maintain line indices
        const sortedHunks = [...hunks].sort((a, b) => {
            const aStart = a.type === 'unified' ? a.oldStart : a.oldStart;
            const bStart = b.type === 'unified' ? b.oldStart : b.oldStart;
            return bStart - aStart;
        });

        for (const hunk of sortedHunks) {
            if (hunk.type === 'unified') {
                result = this.applyUnifiedHunk(result, hunk, reverse);
            } else if (hunk.type === 'normal') {
                result = this.applyNormalHunk(result, hunk, reverse);
            }
        }

        return result;
    }

    /**
     * Apply unified diff hunk
     */
    applyUnifiedHunk(lines: string[], hunk: any, reverse: boolean): string[] {
        const result = [...lines];
        const { oldStart, oldCount, newStart, newCount } = hunk;

        if (reverse) {
            // Reverse: apply the patch backwards (undo changes)
            // Start from newStart (where the new file would be)
            let currentLine = newStart;
            let resultIndex = newStart;

            for (const line of hunk.lines) {
                if (line.type === 'add') {
                    // In reverse, 'add' becomes 'delete' - remove this line
                    result.splice(resultIndex, 1);
                    // Don't increment resultIndex since we removed a line
                } else if (line.type === 'delete') {
                    // In reverse, 'delete' becomes 'add' - insert this line
                    result.splice(resultIndex, 0, line.content);
                    resultIndex++;
                } else {
                    // context line - just move forward
                    resultIndex++;
                }
            }
        } else {
            // Forward: normal application
            // Start from oldStart (current file position)
            let resultIndex = oldStart;

            for (const line of hunk.lines) {
                if (line.type === 'delete') {
                    // Remove line from original
                    result.splice(resultIndex, 1);
                    // Don't increment resultIndex since we removed a line
                } else if (line.type === 'add') {
                    // Insert new line
                    result.splice(resultIndex, 0, line.content);
                    resultIndex++;
                } else {
                    // context line - just move forward
                    resultIndex++;
                }
            }
        }

        return result;
    }

    /**
     * Apply normal diff hunk
     */
    applyNormalHunk(lines: string[], hunk: any, reverse: boolean): string[] {
        const result = [...lines];
        const { operation, oldStart, oldEnd, newStart, newEnd, oldLines, newLines } = hunk;

        if (reverse) {
            // Reverse the operation
            if (operation === 'a') {
                // Add becomes delete
                result.splice(newStart, newEnd - newStart + 1);
            } else if (operation === 'd') {
                // Delete becomes add
                result.splice(oldStart, 0, ...newLines);
            } else if (operation === 'c') {
                // Change is reversed
                result.splice(newStart, newEnd - newStart + 1, ...oldLines);
            }
        } else {
            // Forward application
            if (operation === 'a') {
                // Add lines
                result.splice(oldStart + 1, 0, ...newLines);
            } else if (operation === 'd') {
                // Delete lines
                result.splice(oldStart, oldEnd - oldStart + 1);
            } else if (operation === 'c') {
                // Change lines
                result.splice(oldStart, oldEnd - oldStart + 1, ...newLines);
            }
        }

        return result;
    }

    /**
     * import - import file or directory from real filesystem
     */
    import(args: string[]): string {
        const parser = new ArgumentParser({
            prog: 'import',
            description: 'Import file or directory from real filesystem',
            add_help: true
        });

        parser.add_argument('-r', {
            dest: 'recursive',
            action: 'store_true',
            help: 'Import directories recursively'
        });
        parser.add_argument('-R', '--recursive', {
            action: 'store_true',
            help: 'Import directories recursively'
        });
        parser.add_argument('source', {
            help: 'Real filesystem path to import'
        });
        parser.add_argument('destination', {
            nargs: '?',
            help: 'Memory filesystem destination path'
        });

        const parsed = this.parseArgsWithHelp(parser, args);
        if (typeof parsed === 'string') return parsed; // Help text

        try {
            const fs = require('fs');
            const stats = fs.statSync(parsed.source);

            if (stats.isDirectory()) {
                if (!parsed.recursive) {
                    throw new Error('import: omitting directory (use -r or -R for recursive)');
                }
                this.fs.importDirectory(parsed.source, parsed.destination);
            } else {
                this.fs.importFile(parsed.source, parsed.destination);
            }

            return `Imported: ${parsed.source}`;
        } catch (err: any) {
            throw new Error(`import: ${err.message}`);
        }
    }

    /**
     * export - export file or directory to real filesystem
     */
    export(args: string[]): string {
        const parser = new ArgumentParser({
            prog: 'export',
            description: 'Export file or directory to real filesystem',
            add_help: true
        });

        parser.add_argument('source', {
            help: 'Memory filesystem path to export'
        });
        parser.add_argument('destination', {
            help: 'Real filesystem destination path'
        });

        const parsed = this.parseArgsWithHelp(parser, args);
        if (typeof parsed === 'string') return parsed; // Help text

        try {
            const node = this.fs.resolvePath(parsed.source);
            if (!node) {
                throw new Error(`No such file or directory: ${parsed.source}`);
            }

            if (node.isDirectory()) {
                this.fs.exportDirectory(parsed.source, parsed.destination);
            } else {
                this.fs.exportFile(parsed.source, parsed.destination);
            }

            return `Exported: ${parsed.source} -> ${parsed.destination}`;
        } catch (err: any) {
            throw new Error(`export: ${err.message}`);
        }
    }

    /**
     * node - execute JavaScript file in the memory filesystem
     */
    node(args: string[]): string {
        const parser = new ArgumentParser({
            prog: 'node',
            description: 'Execute JavaScript file',
            add_help: true
        });

        parser.add_argument('--timeout', {
            type: 'int',
            metavar: 'MS',
            help: 'Set execution timeout in milliseconds'
        });
        parser.add_argument('--allow-eval', {
            action: 'store_true',
            help: 'Allow eval() in scripts (default: false)'
        });
        parser.add_argument('--allow-wasm', {
            action: 'store_true',
            help: 'Allow WebAssembly in scripts (default: false)'
        });
        parser.add_argument('-e', '--env', {
            action: 'append',
            dest: 'env_vars',
            metavar: 'KEY=VALUE',
            help: 'Set environment variable (can be used multiple times)'
        });
        parser.add_argument('script', {
            help: 'JavaScript file to execute'
        });
        parser.add_argument('args', {
            nargs: '*',
            help: 'Arguments to pass to script'
        });

        const parsed = this.parseArgsWithHelp(parser, args);
        if (typeof parsed === 'string') return parsed; // Help text

        // Parse environment variables
        const env: Record<string, string> = {};
        if (parsed.env_vars) {
            for (const envVar of parsed.env_vars) {
                const [key, ...valueParts] = envVar.split('=');
                if (key) {
                    env[key] = valueParts.join('=') || '';
                }
            }
        }

        // Build VM options
        const vmOptions: any = {};
        if (parsed.timeout !== undefined && parsed.timeout !== null) {
            vmOptions.timeout = parsed.timeout;
        }
        if (parsed.allow_eval) {
            vmOptions.eval = true;
        }
        if (parsed.allow_wasm) {
            vmOptions.wasm = true;
        }

        try {
            const result = this.jsEngine.runScript(parsed.script, {
                positionalArgs: parsed.args,
                flagArgs: {},
                env,
                vmOptions,
            });
            return result.output;
        } catch (err: any) {
            throw new Error(`node: execution error: ${err.message}`);
        }
    }

    /**
     * write - write text to a file
     */
    write(args: string[]): string {
        const parser = new ArgumentParser({
            prog: 'write',
            description: 'Write text to a file',
            add_help: true
        });

        parser.add_argument('file', {
            help: 'File to write to'
        });
        parser.add_argument('content', {
            nargs: '+',
            help: 'Content to write'
        });

        const parsed = this.parseArgsWithHelp(parser, args);
        if (typeof parsed === 'string') return parsed; // Help text
        const content = parsed.content.join(' ');

        const node = this.fs.resolvePath(parsed.file);
        if (node) {
            if (!node.isFile()) {
                throw new Error(`write: ${parsed.file}: Is a directory`);
            }
            node.write(content);
        } else {
            this.fs.createFile(parsed.file, content);
        }

        return '';
    }

    /**
     * kiana - LLM agent with memshell access
     */
    kiana(args: string[]): string {
        const parser = new ArgumentParser({
            prog: 'kiana',
            description: 'LLM agent with memshell access',
            add_help: true
        });

        parser.add_argument('instruction', {
            nargs: '?',
            help: 'Task instruction (text or file path in MemFS)'
        });
        parser.add_argument('--instruction', {
            dest: 'instruction_flag',
            help: 'Task instruction (text or file path in MemFS)'
        });
        parser.add_argument('--system-prompt', {
            dest: 'system_prompt',
            help: 'System prompt file path in MemFS'
        });
        parser.add_argument('--model', {
            default: 'gpt-4o-mini',
            help: 'OpenAI model to use (default: gpt-4o-mini)'
        });
        parser.add_argument('--max-rounds', {
            type: 'int',
            default: 20,
            dest: 'max_rounds',
            help: 'Maximum tool-call rounds (default: 20)'
        });
        parser.add_argument('--verbose', {
            action: 'store_true',
            help: 'Enable verbose logging'
        });

        const parsed = this.parseArgsWithHelp(parser, args);
        if (typeof parsed === 'string') return parsed; // Help text

        // Determine instruction
        let instruction = parsed.instruction_flag || parsed.instruction;
        if (!instruction) {
            throw new Error('kiana: instruction required (positional or --instruction)');
        }

        // Try to read instruction from MemFS if it looks like a file
        const instructionNode = this.fs.resolvePath(instruction);
        if (instructionNode && instructionNode.isFile()) {
            instruction = instructionNode.read();
        }

        // Read system prompt from MemFS if provided
        let systemPrompt: string | undefined = undefined;
        if (parsed.system_prompt) {
            const promptNode = this.fs.resolvePath(parsed.system_prompt);
            if (!promptNode) {
                throw new Error(`kiana: ${parsed.system_prompt}: No such file or directory`);
            }
            if (!promptNode.isFile()) {
                throw new Error(`kiana: ${parsed.system_prompt}: Is a directory`);
            }
            systemPrompt = promptNode.read();
        }

        // Create MemTools instance with the same filesystem
        const memtools = new MemTools(this.fs);

        // Create stdout writer
        const writer = new StdoutWriter();

        // Run Kiana agent (this is async, but we need to handle it synchronously)
        // We'll use a synchronous wrapper via a promise
        let result = '';
        let error: Error | null = null;

        (async () => {
            try {
                result = await runKiana(
                    {
                        instruction,
                        systemPrompt,
                        model: parsed.model,
                        maxRounds: parsed.max_rounds,
                        verbose: parsed.verbose,
                    },
                    memtools,
                    writer
                );
            } catch (err: any) {
                error = err;
            }
        })().then(() => {
            // Promise resolved
        }).catch((err) => {
            error = err;
        });

        // Wait for the async operation to complete
        // This is a hack, but necessary since exec() is synchronous
        const deasync = require('deasync');
        while (result === '' && error === null) {
            deasync.runLoopOnce();
        }

        if (error) {
            throw error;
        }

        return result;
    }

    /**
     * Execute a single command with optional stdin
     */
    execSingle(commandTokens: string[], stdin: string | null = null): string {
        if (!commandTokens || commandTokens.length === 0) {
            return '';
        }

        const command = commandTokens[0];
        let args = commandTokens.slice(1);

        // Expand wildcards in arguments (use current working directory from fs)
        const cwd = this.fs.getCurrentDirectory();
        args = this.expandWildcards(args, cwd);

        const commands: Record<string, (args: string[], stdin?: string | null) => string> = {
            ls: this.ls.bind(this),
            cat: this.cat.bind(this),
            pwd: this.pwd.bind(this),
            cd: this.cd.bind(this),
            mkdir: this.mkdir.bind(this),
            touch: this.touch.bind(this),
            rm: this.rm.bind(this),
            echo: this.echo.bind(this),
            diff: this.diff.bind(this),
            grep: this.grep.bind(this),
            find: this.find.bind(this),
            sed: this.sed.bind(this),
            patch: this.patch.bind(this),
            import: this.import.bind(this),
            export: this.export.bind(this),
            node: this.node.bind(this),
            write: this.write.bind(this),
            kiana: this.kiana.bind(this),
        };

        if (!commands[command]) {
            throw new Error(`${command}: command not found`);
        }

        // Check if command supports stdin
        const stdinCommands = ['cat', 'grep', 'sed', 'patch'];
        if (stdinCommands.includes(command) && stdin !== null) {
            return commands[command](args, stdin);
        }

        return commands[command](args);
    }

    /**
     * Execute a pipeline of commands
     */
    execPipeline(pipeline: string[][], initialStdin: string | null = null): string {
        if (pipeline.length === 0) {
            return '';
        }

        let output: string | null = initialStdin;

        for (let i = 0; i < pipeline.length; i++) {
            const commandTokens = pipeline[i];

            // Parse redirections from command tokens
            const { command, redirections } = parseRedirections(commandTokens);

            // Execute command
            if (redirections.length > 0) {
                output = this.execWithRedirections(command, output, redirections);
            } else {
                output = this.execSingle(command, output);
            }
        }

        return output || '';
    }

    /**
     * Execute a command with HEREDOC support
     */
    execWithHeredoc(command: string, content: string): string {
        // Parse the command
        const tokens = command.trim().split(/\s+/);
        const cmd = tokens[0];
        const args = tokens.slice(1);

        const commands: Record<string, (args: string[], content?: string) => string> = {
            cat: this.cat.bind(this),
            grep: this.grep.bind(this),
            sed: this.sed.bind(this),
            patch: this.patch.bind(this),
            write: (args: string[]) => {
                const filePath = args[0];
                if (!filePath) {
                    throw new Error('write: missing file operand');
                }
                const node = this.fs.resolvePath(filePath);
                if (node) {
                    if (!node.isFile()) {
                        throw new Error(`write: ${filePath}: Is a directory`);
                    }
                    node.write(content);
                } else {
                    this.fs.createFile(filePath, content);
                }
                return '';
            },
        };

        if (!commands[cmd]) {
            throw new Error(`${cmd}: command not found or does not support HEREDOC`);
        }

        // For cat, grep, sed, patch - pass content as stdin
        if (['cat', 'grep', 'sed', 'patch'].includes(cmd)) {
            return commands[cmd](args, content);
        }

        // For write and others, execute with args
        return commands[cmd](args);
    }

    /**
     * Execute a command with redirections
     */
    execWithRedirections(commandTokens: string[], stdin: string | null = null, redirections: Redirection[] = []): string {
        // Find HEREDOC redirection
        const heredocRedirect = redirections.find(r => r.type === '<<');
        let actualStdin = stdin;

        // If there's a HEREDOC, it becomes the stdin
        if (heredocRedirect && 'delimiter' in heredocRedirect) {
            // For HEREDOC in interactive mode, content will be provided separately
            // This is just marking that we expect HEREDOC input
            actualStdin = stdin;
        }

        // Execute the command
        let output = this.execSingle(commandTokens, actualStdin);

        // Handle output redirections
        for (const redir of redirections) {
            if (redir.type === '>') {
                // Redirect stdout to file (overwrite)
                const node = this.fs.resolvePath(redir.target);
                if (node && !node.isFile()) {
                    throw new Error(`${redir.target}: Is a directory`);
                }
                if (node && node.isFile()) {
                    node.write(output);
                } else {
                    this.fs.createFile(redir.target, output);
                }
                output = ''; // Don't return output, it went to file
            } else if (redir.type === '>>') {
                // Redirect stdout to file (append)
                const node = this.fs.resolvePath(redir.target);
                if (node && !node.isFile()) {
                    throw new Error(`${redir.target}: Is a directory`);
                }
                if (node && node.isFile()) {
                    // Add newline before appending if file has content
                    const existingContent = node.read();
                    if (existingContent && existingContent.length > 0) {
                        node.append('\n' + output);
                    } else {
                        node.append(output);
                    }
                } else {
                    this.fs.createFile(redir.target, output);
                }
                output = ''; // Don't return output, it went to file
            }
        }

        return output;
    }

    /**
     * Execute a command
     */
    exec(commandLine: string): string {
        if (!commandLine || !commandLine.trim()) {
            return '';
        }

        // Check for inline HEREDOC first (before tokenization)
        if (isInlineHeredoc(commandLine)) {
            const heredocInfo = parseInlineHeredoc(commandLine);
            if (heredocInfo) {
                // Execute HEREDOC command with its content
                const heredocOutput = this.execWithHeredoc(heredocInfo.command, heredocInfo.content);

                // Collect all redirections (both pre and post)
                const allRedirections = heredocInfo.preRedirects || [];

                // Check if there's a redirection on the same line as the HEREDOC delimiter
                if (heredocInfo.redirect) {
                    // Check if it's a pipe first
                    if (heredocInfo.redirect.trim().startsWith('|')) {
                        const remainingPipeline = heredocInfo.redirect.substring(heredocInfo.redirect.indexOf('|') + 1).trim();
                        if (remainingPipeline) {
                            const pipeline = parsePipeline(remainingPipeline);
                            // Convert to old format for execPipeline (array of token arrays)
                            const pipelineCommands = pipeline.map(cmd => cmd.command);
                            let output = this.execPipeline(pipelineCommands, heredocOutput);
                            // Apply pre-redirections after pipeline
                            for (const redir of allRedirections) {
                                if (redir.type === '>') {
                                    const node = this.fs.resolvePath(redir.target);
                                    if (node && !node.isFile()) {
                                        throw new Error(`${redir.target}: Is a directory`);
                                    }
                                    if (node && node.isFile()) {
                                        node.write(output);
                                    } else {
                                        this.fs.createFile(redir.target, output);
                                    }
                                    output = '';
                                } else if (redir.type === '>>') {
                                    const node = this.fs.resolvePath(redir.target);
                                    if (node && !node.isFile()) {
                                        throw new Error(`${redir.target}: Is a directory`);
                                    }
                                    if (node && node.isFile()) {
                                        // Add newline before appending if file has content
                                        const existingContent = node.read();
                                        if (existingContent && existingContent.length > 0) {
                                            node.append('\n' + output);
                                        } else {
                                            node.append(output);
                                        }
                                    } else {
                                        this.fs.createFile(redir.target, output);
                                    }
                                    output = '';
                                }
                            }
                            return output;
                        }
                    }

                    // Parse the redirection
                    const parsed = parsePipeline(heredocInfo.redirect);
                    const tokens = parsed.length > 0 ? parsed[0].command : [];
                    const { redirections } = parseRedirections(tokens);
                    allRedirections.push(...redirections);
                }

                // Apply all redirections to output
                let finalOutput = heredocOutput;
                for (const redir of allRedirections) {
                    if (redir.type === '>') {
                        const node = this.fs.resolvePath(redir.target);
                        if (node && !node.isFile()) {
                            throw new Error(`${redir.target}: Is a directory`);
                        }
                        if (node && node.isFile()) {
                            node.write(finalOutput);
                        } else {
                            this.fs.createFile(redir.target, finalOutput);
                        }
                        finalOutput = '';
                    } else if (redir.type === '>>') {
                        const node = this.fs.resolvePath(redir.target);
                        if (node && !node.isFile()) {
                            throw new Error(`${redir.target}: Is a directory`);
                        }
                        if (node && node.isFile()) {
                            // Add newline before appending if file has content
                            const existingContent = node.read();
                            if (existingContent && existingContent.length > 0) {
                                node.append('\n' + finalOutput);
                            } else {
                                node.append(finalOutput);
                            }
                        } else {
                            this.fs.createFile(redir.target, finalOutput);
                        }
                        finalOutput = '';
                    }
                }
                return finalOutput;
            }
        }

        // Parse command line with all operators
        const commands = parsePipeline(commandLine);

        // Handle multiple commands with operators
        if (commands.length > 1 || (commands.length === 1 && commands[0].type !== 'end')) {
            return this.execCommandSequence(commands);
        }

        // Single command without operators
        const { command, redirections } = parseRedirections(commands[0].command);

        // Check if there's a HEREDOC redirection
        const heredocRedirect = redirections.find(r => r.type === '<<');
        if (heredocRedirect) {
            // This shouldn't happen with inline HEREDOC, but handle it anyway
            throw new Error('HEREDOC requires multi-line input in interactive mode');
        }

        // Execute command with redirections
        if (redirections.length > 0) {
            return this.execWithRedirections(command, null, redirections);
        }

        // Execute single command without redirections
        return this.execSingle(command);
    }

    /**
     * Execute a sequence of commands with operators (&&, ||, ;, |)
     */
    execCommandSequence(commands: PipelineSegment[]): string {
        if (commands.length === 0) {
            return '';
        }

        let output: string | null = null;
        let lastExitCode = 0;

        for (let i = 0; i < commands.length; i++) {
            const { type, command: commandTokens } = commands[i];

            // Determine if we should execute this command
            let shouldExecute = true;

            if (i > 0) {
                const prevType = commands[i - 1].type;
                if (prevType === 'and') {
                    // && - execute only if previous succeeded (exit code 0)
                    shouldExecute = (lastExitCode === 0);
                } else if (prevType === 'or') {
                    // || - execute only if previous failed (exit code non-zero)
                    shouldExecute = (lastExitCode !== 0);
                }
                // For 'seq' (;) and 'pipe' (|), always execute
            }

            if (!shouldExecute) {
                // Skip this command but continue to next
                continue;
            }

            // Parse redirections from command tokens
            const { command, redirections } = parseRedirections(commandTokens);

            try {
                // Execute command based on type
                if (type === 'pipe' || (i > 0 && commands[i - 1].type === 'pipe')) {
                    // Pipe - pass output from previous command as stdin
                    if (redirections.length > 0) {
                        output = this.execWithRedirections(command, output, redirections);
                    } else {
                        output = this.execSingle(command, output);
                    }
                    lastExitCode = 0;
                } else {
                    // Non-pipe operators - execute independently
                    if (redirections.length > 0) {
                        output = this.execWithRedirections(command, null, redirections);
                    } else {
                        output = this.execSingle(command);
                    }
                    lastExitCode = 0;
                }
            } catch (error: any) {
                // Command failed
                lastExitCode = 1;

                // For seq (;), continue to next command
                if (type === 'seq' || type === 'end') {
                    output = error.message;
                } else if (type === 'or') {
                    // || - continue to next command on failure
                    output = error.message;
                } else if (type === 'and') {
                    // && - stop on failure
                    throw error;
                } else if (type === 'pipe') {
                    // | - stop on failure
                    throw error;
                } else {
                    throw error;
                }
            }
        }

        return output || '';
    }
}
