const { expect } = require('chai');
const { MemFS, MemFile, MemDirectory } = require('../src/MemFS');

describe('MemFS - In-Memory File System', () => {
    let fs;

    beforeEach(() => {
        fs = new MemFS();
    });

    describe('File Operations', () => {
        it('should create a file', () => {
            const file = fs.createFile('test.txt', 'Hello World');
            expect(file).to.be.instanceOf(MemFile);
            expect(file.name).to.equal('test.txt');
            expect(file.read()).to.equal('Hello World');
        });

        it('should read a file', () => {
            fs.createFile('test.txt', 'content');
            const node = fs.resolvePath('test.txt');
            expect(node.read()).to.equal('content');
        });

        it('should write to a file', () => {
            const file = fs.createFile('test.txt', 'initial');
            file.write('updated');
            expect(file.read()).to.equal('updated');
        });

        it('should append to a file', () => {
            const file = fs.createFile('test.txt', 'Hello');
            file.append(' World');
            expect(file.read()).to.equal('Hello World');
        });

        it('should get file size', () => {
            const file = fs.createFile('test.txt', 'Hello');
            expect(file.size()).to.equal(5);
        });

        it('should throw error when creating duplicate file', () => {
            fs.createFile('test.txt', 'content');
            expect(() => fs.createFile('test.txt', 'content')).to.throw();
        });
    });

    describe('Directory Operations', () => {
        it('should create a directory', () => {
            const dir = fs.createDirectory('testdir');
            expect(dir).to.be.instanceOf(MemDirectory);
            expect(dir.name).to.equal('testdir');
        });

        it('should create nested directories with -p flag', () => {
            const dir = fs.createDirectories('a/b/c');
            expect(dir.name).to.equal('c');
            const pathC = fs.resolvePath('a/b/c');
            expect(pathC).to.equal(dir);
        });

        it('should list directory children', () => {
            fs.createDirectory('dir1');
            fs.createFile('file1.txt', '');
            const children = fs.root.listChildren();
            expect(children.length).to.equal(2);
        });

        it('should change directory', () => {
            fs.createDirectory('testdir');
            fs.changeDirectory('testdir');
            expect(fs.getCurrentDirectory()).to.equal('/testdir');
        });

        it('should navigate with .. (parent directory)', () => {
            fs.createDirectories('a/b/c');
            fs.changeDirectory('a/b/c');
            fs.changeDirectory('..');
            expect(fs.getCurrentDirectory()).to.equal('/a/b');
        });

        it('should handle absolute paths', () => {
            fs.createDirectories('a/b');
            fs.changeDirectory('a/b');
            const root = fs.resolvePath('/');
            expect(root).to.equal(fs.root);
        });
    });

    describe('Path Resolution', () => {
        it('should resolve relative path', () => {
            fs.createDirectory('dir');
            const node = fs.resolvePath('dir');
            expect(node.name).to.equal('dir');
        });

        it('should resolve absolute path', () => {
            fs.createDirectory('dir');
            const node = fs.resolvePath('/dir');
            expect(node.name).to.equal('dir');
        });

        it('should return null for non-existent path', () => {
            const node = fs.resolvePath('nonexistent');
            expect(node).to.be.null;
        });

        it('should handle complex paths', () => {
            fs.createDirectories('a/b/c');
            fs.createFile('a/b/c/file.txt', 'content');
            const node = fs.resolvePath('a/b/c/file.txt');
            expect(node.name).to.equal('file.txt');
            expect(node.read()).to.equal('content');
        });
    });

    describe('Remove Operations', () => {
        it('should remove a file', () => {
            fs.createFile('test.txt', 'content');
            fs.remove('test.txt');
            const node = fs.resolvePath('test.txt');
            expect(node).to.be.null;
        });

        it('should remove empty directory', () => {
            fs.createDirectory('emptydir');
            fs.remove('emptydir');
            const node = fs.resolvePath('emptydir');
            expect(node).to.be.null;
        });

        it('should not remove non-empty directory without recursive flag', () => {
            fs.createDirectory('dir');
            fs.createFile('dir/file.txt', '');
            expect(() => fs.remove('dir')).to.throw();
        });

        it('should remove non-empty directory with recursive flag', () => {
            fs.createDirectory('dir');
            fs.createFile('dir/file.txt', '');
            fs.remove('dir', true);
            const node = fs.resolvePath('dir');
            expect(node).to.be.null;
        });

        it('should not remove root directory', () => {
            expect(() => fs.remove('/')).to.throw();
        });
    });

    describe('Node Properties', () => {
        it('should track creation time', () => {
            const file = fs.createFile('test.txt', '');
            expect(file.createdAt).to.be.instanceOf(Date);
        });

        it('should track modification time', () => {
            const file = fs.createFile('test.txt', 'initial');
            const initialTime = file.modifiedAt;
            setTimeout(() => {
                file.write('updated');
                expect(file.modifiedAt.getTime()).to.be.greaterThan(initialTime.getTime());
            }, 10);
        });

        it('should get full path of node', () => {
            fs.createDirectories('a/b');
            fs.createFile('a/b/file.txt', '');
            const node = fs.resolvePath('a/b/file.txt');
            expect(node.getPath()).to.equal('/a/b/file.txt');
        });

        it('should identify node types', () => {
            const file = fs.createFile('file.txt', '');
            const dir = fs.createDirectory('dir');
            expect(file.isFile()).to.be.true;
            expect(file.isDirectory()).to.be.false;
            expect(dir.isFile()).to.be.false;
            expect(dir.isDirectory()).to.be.true;
        });
    });
});
