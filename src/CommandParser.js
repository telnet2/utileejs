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

            // Handle redirection operators
            if (char === '>') {
                if (current) {
                    tokens.push(current);
                    current = '';
                }
                // Check for >> or >&
                if (i + 1 < commandLine.length) {
                    const nextChar = commandLine[i + 1];
                    if (nextChar === '>') {
                        tokens.push('>>');
                        i++;
                        continue;
                    } else if (nextChar === '&') {
                        tokens.push('>&');
                        i++;
                        continue;
                    }
                }
                tokens.push('>');
                continue;
            }

            if (char === '<') {
                if (current) {
                    tokens.push(current);
                    current = '';
                }
                // Check for <<
                if (i + 1 < commandLine.length && commandLine[i + 1] === '<') {
                    tokens.push('<<');
                    i++;
                    continue;
                }
                tokens.push('<');
                continue;
            }

            // Handle 2> for stderr redirection
            if (char === '2' && i + 1 < commandLine.length && commandLine[i + 1] === '>') {
                if (current) {
                    tokens.push(current);
                    current = '';
                }
                tokens.push('2>');
                i++;
                continue;
            }

            // Handle &> for stdout+stderr redirection
            if (char === '&' && i + 1 < commandLine.length && commandLine[i + 1] === '>') {
                if (current) {
                    tokens.push(current);
                    current = '';
                }
                tokens.push('&>');
                i++;
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
 * Parse redirections from command tokens
 * Returns { command: [...], redirections: [{type, target}] }
 */
function parseRedirections(tokens) {
    const command = [];
    const redirections = [];

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        // Check if this is a redirection operator
        if (token === '>' || token === '>>' || token === '<' ||
            token === '2>' || token === '&>' || token === '>&') {
            // Next token should be the target file
            if (i + 1 < tokens.length) {
                redirections.push({
                    type: token,
                    target: tokens[i + 1]
                });
                i++; // Skip the target token
            }
        } else if (token === '<<') {
            // HEREDOC delimiter
            if (i + 1 < tokens.length) {
                redirections.push({
                    type: '<<',
                    delimiter: tokens[i + 1]
                });
                i++; // Skip the delimiter token
            }
        } else {
            command.push(token);
        }
    }

    return { command, redirections };
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
    // First try: exact format with delimiter on its own line
    const heredocMatch = commandLine.match(/^(.+?)\s*<<\s*(\S+)\s*\n([\s\S]*?)^\2$/m);

    if (heredocMatch) {
        // Remove trailing newline from content (it's before the delimiter line)
        let content = heredocMatch[3];
        if (content.endsWith('\n')) {
            content = content.slice(0, -1);
        }

        // Parse command and redirections before <<
        const beforeHeredoc = heredocMatch[1].trim();
        const tokens = tokenize(beforeHeredoc);
        const { command: cmdTokens, redirections: preRedirects } = parseRedirections(tokens);

        return {
            command: cmdTokens.join(' '),
            content: content,
            redirect: null,
            preRedirects: preRedirects
        };
    }

    // Alternative format - delimiter might have redirections or other content after it
    // Example: cat << EOF > file.txt or cat > file.txt << EOF
    const simpleMatch = commandLine.match(/^(.+?)\s*<<\s*(\S+)(.*)?\n([\s\S]+)$/);
    if (simpleMatch) {
        const beforeHeredoc = simpleMatch[1].trim();
        const delimiter = simpleMatch[2];
        const firstLineRest = simpleMatch[3] ? simpleMatch[3].trim() : '';
        const content = simpleMatch[4];
        const lines = content.split('\n');

        // Parse command and redirections before <<
        const tokens = tokenize(beforeHeredoc);
        const { command: cmdTokens, redirections: preRedirects } = parseRedirections(tokens);

        // Find delimiter - it might have content after it on the same line
        let delimiterIndex = -1;
        let delimiterLineRest = '';
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Check if line starts with delimiter (possibly followed by space and more content)
            if (line === delimiter) {
                delimiterIndex = i;
                break;
            } else if (line.startsWith(delimiter + ' ') || line.startsWith(delimiter + '\t')) {
                delimiterIndex = i;
                // Capture everything after the delimiter
                const delimiterEnd = line.indexOf(delimiter) + delimiter.length;
                delimiterLineRest = line.substring(delimiterEnd).trim();
                break;
            }
        }

        const actualContent = delimiterIndex >= 0
            ? lines.slice(0, delimiterIndex).join('\n')
            : content;

        // Combine redirects from first line and delimiter line
        let finalRedirect = null;
        if (firstLineRest && delimiterLineRest) {
            finalRedirect = firstLineRest + ' ' + delimiterLineRest;
        } else if (firstLineRest) {
            finalRedirect = firstLineRest;
        } else if (delimiterLineRest) {
            finalRedirect = delimiterLineRest;
        }

        return {
            command: cmdTokens.join(' '),
            content: actualContent,
            redirect: finalRedirect,
            preRedirects: preRedirects
        };
    }

    return null;
}

module.exports = {
    tokenize,
    parsePipeline,
    parseRedirections,
    parseHeredoc,
    parseHeredocContent,
    isInlineHeredoc,
    parseInlineHeredoc
};
