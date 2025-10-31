const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { Readable } = require('stream');

/**
 * In-memory File System Node (base class)
 */
class MemNode {
    constructor(name, parent = null) {
        this.name = name;
        this.parent = parent;
        this.createdAt = new Date();
        this.modifiedAt = new Date();
    }

    getPath() {
        if (!this.parent) return '/';
        const parentPath = this.parent.getPath();
        return parentPath === '/' ? `/${this.name}` : `${parentPath}/${this.name}`;
    }

    isFile() {
        return this instanceof MemFile;
    }

    isDirectory() {
        return this instanceof MemDirectory;
    }
}

/**
 * In-memory File
 */
class MemFile extends MemNode {
    constructor(name, content = '', parent = null) {
        super(name, parent);
        this.content = content;
    }

    write(content) {
        this.content = content;
        this.modifiedAt = new Date();
    }

    append(content) {
        this.content += content;
        this.modifiedAt = new Date();
    }

    read() {
        return this.content;
    }

    size() {
        return Buffer.byteLength(this.content, 'utf8');
    }
}

/**
 * In-memory Directory
 */
class MemDirectory extends MemNode {
    constructor(name, parent = null) {
        super(name, parent);
        this.children = new Map();
    }

    addChild(node) {
        this.children.set(node.name, node);
        node.parent = this;
        this.modifiedAt = new Date();
    }

    removeChild(name) {
        const removed = this.children.delete(name);
        if (removed) {
            this.modifiedAt = new Date();
        }
        return removed;
    }

    getChild(name) {
        return this.children.get(name);
    }

    hasChild(name) {
        return this.children.has(name);
    }

    listChildren() {
        return Array.from(this.children.values());
    }
}

/**
 * In-memory File System
 */
class MemFS {
    constructor() {
        this.root = new MemDirectory('');
        this.cwd = this.root;
    }

    /**
     * Normalize and resolve path
     */
    resolvePath(pathStr) {
        if (!pathStr || pathStr === '/') {
            return this.root;
        }

        const isAbsolute = pathStr.startsWith('/');
        const parts = pathStr.split('/').filter(p => p && p !== '.');
        let current = isAbsolute ? this.root : this.cwd;

        for (const part of parts) {
            if (part === '..') {
                current = current.parent || current;
            } else {
                const child = current.getChild(part);
                if (!child) {
                    return null;
                }
                current = child;
            }
        }

        return current;
    }

    /**
     * Get parent directory and filename from path
     */
    parsePath(pathStr) {
        if (!pathStr || pathStr === '/') {
            return { dir: this.root, name: '' };
        }

        const isAbsolute = pathStr.startsWith('/');
        const parts = pathStr.split('/').filter(p => p && p !== '.');
        const name = parts.pop();

        let current = isAbsolute ? this.root : this.cwd;
        for (const part of parts) {
            if (part === '..') {
                current = current.parent || current;
            } else {
                const child = current.getChild(part);
                if (!child || !child.isDirectory()) {
                    return null;
                }
                current = child;
            }
        }

        return { dir: current, name };
    }

    /**
     * Create a file
     */
    createFile(pathStr, content = '') {
        const parsed = this.parsePath(pathStr);
        if (!parsed) {
            throw new Error(`Cannot create file: invalid path ${pathStr}`);
        }

        const { dir, name } = parsed;
        if (!name) {
            throw new Error('Cannot create file: invalid filename');
        }

        if (dir.hasChild(name)) {
            throw new Error(`File or directory already exists: ${name}`);
        }

        const file = new MemFile(name, content, dir);
        dir.addChild(file);
        return file;
    }

    /**
     * Create a directory
     */
    createDirectory(pathStr) {
        const parsed = this.parsePath(pathStr);
        if (!parsed) {
            throw new Error(`Cannot create directory: invalid path ${pathStr}`);
        }

        const { dir, name } = parsed;
        if (!name) {
            throw new Error('Cannot create directory: invalid name');
        }

        if (dir.hasChild(name)) {
            throw new Error(`File or directory already exists: ${name}`);
        }

        const newDir = new MemDirectory(name, dir);
        dir.addChild(newDir);
        return newDir;
    }

    /**
     * Create directories recursively
     */
    createDirectories(pathStr) {
        const isAbsolute = pathStr.startsWith('/');
        const parts = pathStr.split('/').filter(p => p && p !== '.');
        let current = isAbsolute ? this.root : this.cwd;

        for (const part of parts) {
            if (part === '..') {
                current = current.parent || current;
            } else {
                let child = current.getChild(part);
                if (!child) {
                    child = new MemDirectory(part, current);
                    current.addChild(child);
                } else if (!child.isDirectory()) {
                    throw new Error(`Not a directory: ${part}`);
                }
                current = child;
            }
        }

        return current;
    }

    /**
     * Remove a file or directory
     */
    remove(pathStr, recursive = false) {
        const node = this.resolvePath(pathStr);
        if (!node) {
            throw new Error(`No such file or directory: ${pathStr}`);
        }

        if (node === this.root) {
            throw new Error('Cannot remove root directory');
        }

        if (node.isDirectory() && node.children.size > 0 && !recursive) {
            throw new Error(`Directory not empty: ${pathStr}`);
        }

        if (!node.parent) {
            throw new Error('Cannot remove node without parent');
        }

        return node.parent.removeChild(node.name);
    }

    /**
     * Change current working directory
     */
    changeDirectory(pathStr) {
        if (!pathStr) {
            this.cwd = this.root;
            return;
        }

        const node = this.resolvePath(pathStr);
        if (!node) {
            throw new Error(`No such directory: ${pathStr}`);
        }

        if (!node.isDirectory()) {
            throw new Error(`Not a directory: ${pathStr}`);
        }

        this.cwd = node;
    }

    /**
     * Get current working directory path
     */
    getCurrentDirectory() {
        return this.cwd.getPath();
    }

    /**
     * Import file from real filesystem
     */
    importFile(realPath, memPath = null) {
        const content = fs.readFileSync(realPath, 'utf8');
        const fileName = memPath || path.basename(realPath);
        return this.createFile(fileName, content);
    }

    /**
     * Export file to real filesystem
     */
    exportFile(memPath, realPath) {
        const node = this.resolvePath(memPath);
        if (!node) {
            throw new Error(`No such file: ${memPath}`);
        }

        if (!node.isFile()) {
            throw new Error(`Not a file: ${memPath}`);
        }

        fs.writeFileSync(realPath, node.read(), 'utf8');
    }

    /**
     * Import directory recursively from real filesystem
     */
    importDirectory(realPath, memPath = null) {
        const stats = fs.statSync(realPath);
        if (!stats.isDirectory()) {
            throw new Error(`Not a directory: ${realPath}`);
        }

        const dirName = memPath || path.basename(realPath);
        const memDir = this.createDirectory(dirName);
        const oldCwd = this.cwd;
        this.cwd = memDir;

        const entries = fs.readdirSync(realPath, { withFileTypes: true });
        for (const entry of entries) {
            const entryRealPath = path.join(realPath, entry.name);
            if (entry.isFile()) {
                this.importFile(entryRealPath, entry.name);
            } else if (entry.isDirectory()) {
                this.importDirectory(entryRealPath, entry.name);
            }
        }

        this.cwd = oldCwd;
        return memDir;
    }

    /**
     * Export directory recursively to real filesystem
     */
    exportDirectory(memPath, realPath) {
        const node = this.resolvePath(memPath);
        if (!node) {
            throw new Error(`No such directory: ${memPath}`);
        }

        if (!node.isDirectory()) {
            throw new Error(`Not a directory: ${memPath}`);
        }

        if (!fs.existsSync(realPath)) {
            fs.mkdirSync(realPath, { recursive: true });
        }

        for (const child of node.listChildren()) {
            const childRealPath = path.join(realPath, child.name);
            if (child.isFile()) {
                fs.writeFileSync(childRealPath, child.read(), 'utf8');
            } else if (child.isDirectory()) {
                this.exportDirectory(child.getPath(), childRealPath);
            }
        }
    }

    /**
     * Clone the entire file system to a real filesystem directory
     */
    clone(realPath) {
        if (!realPath) {
            throw new Error('Target path is required');
        }

        // Create target directory if it doesn't exist
        if (!fs.existsSync(realPath)) {
            fs.mkdirSync(realPath, { recursive: true });
        }

        // Export all children of root to the target directory
        for (const child of this.root.listChildren()) {
            const childRealPath = path.join(realPath, child.name);
            if (child.isFile()) {
                fs.writeFileSync(childRealPath, child.read(), 'utf8');
            } else if (child.isDirectory()) {
                this.exportDirectory(child.getPath(), childRealPath);
            }
        }
    }

    /**
     * Seed the file system from a real filesystem directory or tar/tar.gz file
     * Imports contents into the root directory
     */
    seed(sourcePath) {
        if (!sourcePath) {
            throw new Error('Source path is required');
        }

        if (!fs.existsSync(sourcePath)) {
            throw new Error(`Source does not exist: ${sourcePath}`);
        }

        const stats = fs.statSync(sourcePath);

        if (stats.isDirectory()) {
            // Import directory contents into root
            this._seedFromDirectory(sourcePath);
        } else if (stats.isFile()) {
            // Check file extension for tar/tar.gz
            const ext = path.extname(sourcePath).toLowerCase();
            const basename = path.basename(sourcePath, ext);
            const secondExt = path.extname(basename).toLowerCase();

            if (ext === '.tar' || (secondExt === '.tar' && ext === '.gz')) {
                this._seedFromTar(sourcePath, ext === '.gz');
            } else {
                throw new Error('Unsupported file type. Only .tar and .tar.gz files are supported.');
            }
        } else {
            throw new Error('Source must be a directory or a tar/tar.gz file');
        }
    }

    /**
     * Seed from a directory
     * @private
     */
    _seedFromDirectory(dirPath) {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const entryPath = path.join(dirPath, entry.name);

            if (entry.isFile()) {
                const content = fs.readFileSync(entryPath, 'utf8');
                const file = new MemFile(entry.name, content, this.root);
                this.root.addChild(file);
            } else if (entry.isDirectory()) {
                this._seedDirectoryRecursive(entryPath, this.root, entry.name);
            }
        }
    }

    /**
     * Recursively seed a directory
     * @private
     */
    _seedDirectoryRecursive(dirPath, parentNode, name) {
        const dir = new MemDirectory(name, parentNode);
        parentNode.addChild(dir);

        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const entryPath = path.join(dirPath, entry.name);

            if (entry.isFile()) {
                const content = fs.readFileSync(entryPath, 'utf8');
                const file = new MemFile(entry.name, content, dir);
                dir.addChild(file);
            } else if (entry.isDirectory()) {
                this._seedDirectoryRecursive(entryPath, dir, entry.name);
            }
        }
    }

    /**
     * Seed from a tar or tar.gz file
     * @private
     */
    _seedFromTar(tarPath, isGzipped) {
        let tar;
        try {
            tar = require('tar');
        } catch (e) {
            throw new Error('tar package is required for tar/tar.gz support. Install it with: npm install tar');
        }

        const entries = [];
        const fileContents = new Map();

        // Parse tar file and collect entries
        tar.t({
            file: tarPath,
            sync: true,
            onentry: (entry) => {
                entries.push({
                    path: entry.path,
                    type: entry.type,
                    size: entry.size
                });
            }
        });

        // Extract file contents
        tar.x({
            file: tarPath,
            sync: true,
            cwd: '/tmp',
            onentry: (entry) => {
                if (entry.type === 'File') {
                    const chunks = [];
                    entry.on('data', chunk => chunks.push(chunk));
                    entry.on('end', () => {
                        fileContents.set(entry.path, Buffer.concat(chunks).toString('utf8'));
                    });
                }
            }
        });

        // Build file system structure
        for (const entry of entries) {
            const entryPath = entry.path;
            const parts = entryPath.split('/').filter(p => p);

            if (entry.type === 'Directory') {
                // Create directory structure
                let current = this.root;
                for (const part of parts) {
                    let child = current.getChild(part);
                    if (!child) {
                        child = new MemDirectory(part, current);
                        current.addChild(child);
                    }
                    current = child;
                }
            } else if (entry.type === 'File') {
                // Create file
                const fileName = parts.pop();
                let current = this.root;

                // Ensure parent directories exist
                for (const part of parts) {
                    let child = current.getChild(part);
                    if (!child) {
                        child = new MemDirectory(part, current);
                        current.addChild(child);
                    }
                    current = child;
                }

                // Create file
                const content = fileContents.get(entryPath) || '';
                const file = new MemFile(fileName, content, current);
                current.addChild(file);
            }
        }
    }
}

module.exports = { MemFS, MemFile, MemDirectory, MemNode };
