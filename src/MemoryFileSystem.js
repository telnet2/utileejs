const fs = require('fs');
const path = require('path');

/**
 * In-memory file system with no directory support
 * All files are stored in a flat namespace
 */
class MemoryFileSystem {
    constructor() {
        this.files = new Map();
    }

    /**
     * Write content to a file
     * @param {string} filename - Name of the file
     * @param {string|Buffer} content - Content to write
     */
    writeFile(filename, content) {
        if (!filename) {
            throw new Error('Filename is required');
        }
        this.files.set(filename, content);
    }

    /**
     * Read content from a file
     * @param {string} filename - Name of the file
     * @returns {string|Buffer} File content
     */
    readFile(filename) {
        if (!this.files.has(filename)) {
            throw new Error(`File not found: ${filename}`);
        }
        return this.files.get(filename);
    }

    /**
     * Delete a file
     * @param {string} filename - Name of the file
     */
    deleteFile(filename) {
        if (!this.files.has(filename)) {
            throw new Error(`File not found: ${filename}`);
        }
        this.files.delete(filename);
    }

    /**
     * Check if a file exists
     * @param {string} filename - Name of the file
     * @returns {boolean} True if file exists
     */
    exists(filename) {
        return this.files.has(filename);
    }

    /**
     * List all files
     * @returns {Array<string>} Array of filenames
     */
    list() {
        return Array.from(this.files.keys());
    }

    /**
     * Rename/move a file
     * @param {string} oldName - Current filename
     * @param {string} newName - New filename
     */
    rename(oldName, newName) {
        if (!this.files.has(oldName)) {
            throw new Error(`File not found: ${oldName}`);
        }
        if (this.files.has(newName)) {
            throw new Error(`File already exists: ${newName}`);
        }
        const content = this.files.get(oldName);
        this.files.delete(oldName);
        this.files.set(newName, content);
    }

    /**
     * Get file size in bytes
     * @param {string} filename - Name of the file
     * @returns {number} File size
     */
    getSize(filename) {
        if (!this.files.has(filename)) {
            throw new Error(`File not found: ${filename}`);
        }
        const content = this.files.get(filename);
        if (Buffer.isBuffer(content)) {
            return content.length;
        }
        return Buffer.byteLength(content, 'utf8');
    }

    /**
     * Clear all files
     */
    clear() {
        this.files.clear();
    }

    /**
     * Import a file from the real filesystem
     * @param {string} realPath - Path to file in real filesystem
     * @param {string} memoryName - Name to use in memory filesystem (optional, defaults to basename)
     */
    importFile(realPath, memoryName = null) {
        if (!fs.existsSync(realPath)) {
            throw new Error(`File not found in real filesystem: ${realPath}`);
        }
        const content = fs.readFileSync(realPath, 'utf8');
        const filename = memoryName || path.basename(realPath);
        this.writeFile(filename, content);
        return filename;
    }

    /**
     * Export a file to the real filesystem
     * @param {string} filename - Name of file in memory filesystem
     * @param {string} realPath - Path where to save in real filesystem
     */
    exportFile(filename, realPath) {
        const content = this.readFile(filename);
        fs.writeFileSync(realPath, content);
    }

    /**
     * Search for pattern in files (grep)
     * @param {string|RegExp} pattern - Pattern to search for
     * @param {Array<string>} filenames - Files to search (optional, defaults to all)
     * @param {Object} options - Options (caseInsensitive, lineNumbers, invertMatch)
     * @returns {Array<Object>} Array of matches {filename, line, lineNumber, match}
     */
    grep(pattern, filenames = null, options = {}) {
        const files = filenames || this.list();
        const results = [];

        let regex;
        if (pattern instanceof RegExp) {
            regex = pattern;
        } else {
            const flags = options.caseInsensitive ? 'gi' : 'g';
            regex = new RegExp(pattern, flags);
        }

        for (const filename of files) {
            if (!this.exists(filename)) continue;

            const content = this.readFile(filename);
            const contentStr = Buffer.isBuffer(content) ? content.toString('utf8') : content;
            const lines = contentStr.split('\n');

            lines.forEach((line, index) => {
                const matches = regex.test(line);
                if (options.invertMatch ? !matches : matches) {
                    results.push({
                        filename,
                        line,
                        lineNumber: index + 1,
                        match: matches
                    });
                }
                // Reset regex for next iteration
                regex.lastIndex = 0;
            });
        }

        return results;
    }

    /**
     * Find files by name pattern
     * @param {string|RegExp} pattern - Pattern to match filenames
     * @returns {Array<string>} Array of matching filenames
     */
    find(pattern) {
        const files = this.list();
        let regex;

        if (pattern instanceof RegExp) {
            regex = pattern;
        } else {
            // Convert glob-like pattern to regex
            const regexPattern = pattern
                .replace(/\./g, '\\.')
                .replace(/\*/g, '.*')
                .replace(/\?/g, '.');
            regex = new RegExp(`^${regexPattern}$`);
        }

        return files.filter(filename => regex.test(filename));
    }

    /**
     * Stream editor - replace text in file(s)
     * @param {string|RegExp} pattern - Pattern to search for
     * @param {string} replacement - Replacement text
     * @param {string} filename - File to edit
     * @param {Object} options - Options (global: replace all occurrences)
     */
    sed(pattern, replacement, filename, options = {}) {
        const content = this.readFile(filename);
        const contentStr = Buffer.isBuffer(content) ? content.toString('utf8') : content;

        let regex;
        if (pattern instanceof RegExp) {
            regex = pattern;
        } else {
            const flags = options.global ? 'g' : '';
            regex = new RegExp(pattern, flags);
        }

        const newContent = contentStr.replace(regex, replacement);
        this.writeFile(filename, newContent);

        return newContent;
    }

    /**
     * Get file statistics
     * @param {string} filename - Name of the file
     * @returns {Object} Stats object
     */
    stat(filename) {
        if (!this.exists(filename)) {
            throw new Error(`File not found: ${filename}`);
        }

        return {
            name: filename,
            size: this.getSize(filename),
            isFile: true,
            isDirectory: false
        };
    }
}

module.exports = MemoryFileSystem;
