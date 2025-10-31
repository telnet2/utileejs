/**
 * Command Parser for MemShell
 * Handles pipes, HEREDOC, quoted strings, and escape sequences
 */

/**
 * Parse a command line into tokens
 * Handles quotes, escapes, and basic shell syntax
 */
function tokenize(commandLine) {
    const tokens = [];
    let current = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let escaped = false;

    for (let i = 0; i < commandLine.length; i++) {
        const char = commandLine[i];

        if (escaped) {
            current += char;
            escaped = false;
            continue;
        }

        if (char === '\\' && !inSingleQuote) {
            escaped = true;
            continue;
        }

        if (char === "'" && !inDoubleQuote) {
            inSingleQuote = !inSingleQuote;
            continue;
        }

        if (char === '"' && !inSingleQuote) {
            inDoubleQuote = !inDoubleQuote;
            continue;
        }

        if (!inSingleQuote && !inDoubleQuote) {
            if (char === '|') {
                if (current) {
                    tokens.push(current);
                    current = '';
                }
                tokens.push('|');
                continue;
            }

            if (char === ' ' || char === '\t') {
                if (current) {
                    tokens.push(current);
                    current = '';
                }
                continue;
            }
        }

        current += char;
    }

    if (current) {
        tokens.push(current);
    }

    return tokens;
}

/**
 * Parse command line into pipeline segments
 * Returns array of command segments separated by pipes
 */
function parsePipeline(commandLine) {
    const tokens = tokenize(commandLine);
    const pipeline = [];
    let currentCommand = [];

    for (const token of tokens) {
        if (token === '|') {
            if (currentCommand.length > 0) {
                pipeline.push(currentCommand);
                currentCommand = [];
            }
        } else {
            currentCommand.push(token);
        }
    }

    if (currentCommand.length > 0) {
        pipeline.push(currentCommand);
    }

    return pipeline;
}

/**
 * Check if command line contains HEREDOC
 * Returns { hasHeredoc, command, delimiter, content } or null
 */
function parseHeredoc(commandLine) {
    // Match pattern: command << DELIMITER
    const heredocMatch = commandLine.match(/^(.+?)\s*<<\s*(\S+)\s*$/m);

    if (!heredocMatch) {
        return null;
    }

    const command = heredocMatch[1].trim();
    const delimiter = heredocMatch[2];

    return {
        hasHeredoc: true,
        command,
        delimiter,
        content: null // Content will be set when parsing multi-line input
    };
}

/**
 * Parse HEREDOC content from lines
 * Returns { command, content, remainingLines }
 */
function parseHeredocContent(lines, startIndex = 0) {
    if (startIndex >= lines.length) {
        return null;
    }

    const firstLine = lines[startIndex];
    const heredocInfo = parseHeredoc(firstLine);

    if (!heredocInfo) {
        return null;
    }

    const content = [];
    let i = startIndex + 1;

    // Collect lines until we find the delimiter
    while (i < lines.length) {
        const line = lines[i];
        if (line.trim() === heredocInfo.delimiter) {
            // Found delimiter
            return {
                command: heredocInfo.command,
                content: content.join('\n'),
                endIndex: i
            };
        }
        content.push(line);
        i++;
    }

    // Delimiter not found - return what we have
    return {
        command: heredocInfo.command,
        content: content.join('\n'),
        endIndex: lines.length - 1
    };
}

/**
 * Check if a command uses HEREDOC inline (single line)
 * Example: cat << EOF\nline1\nline2\nEOF
 */
function isInlineHeredoc(commandLine) {
    return commandLine.includes('<<') && commandLine.includes('\n');
}

/**
 * Parse inline HEREDOC (contains newlines in the command string)
 */
function parseInlineHeredoc(commandLine) {
    const heredocMatch = commandLine.match(/^(.+?)\s*<<\s*(\S+)\s*\n([\s\S]*?)^\2$/m);

    if (heredocMatch) {
        // Remove trailing newline from content (it's before the delimiter line)
        let content = heredocMatch[3];
        if (content.endsWith('\n')) {
            content = content.slice(0, -1);
        }
        return {
            command: heredocMatch[1].trim(),
            content: content
        };
    }

    // Alternative format - find delimiter anywhere in a line
    const simpleMatch = commandLine.match(/^(.+?)\s*<<\s*(\S+)\s*\n([\s\S]+)$/);
    if (simpleMatch) {
        const content = simpleMatch[3];
        const delimiter = simpleMatch[2];
        const lines = content.split('\n');

        // Find delimiter - it might have content after it on the same line
        let delimiterIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Check if line starts with delimiter (possibly followed by space and more content)
            if (line === delimiter || line.startsWith(delimiter + ' ') || line.startsWith(delimiter + '\t')) {
                delimiterIndex = i;
                break;
            }
        }

        const actualContent = delimiterIndex >= 0
            ? lines.slice(0, delimiterIndex).join('\n')
            : content;

        return {
            command: simpleMatch[1].trim(),
            content: actualContent
        };
    }

    return null;
}

module.exports = {
    tokenize,
    parsePipeline,
    parseHeredoc,
    parseHeredocContent,
    isInlineHeredoc,
    parseInlineHeredoc
};
