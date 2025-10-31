const assert = require('assert');
const MemoryFileSystem = require('../src/MemoryFileSystem');

describe('MemoryFileSystem', function() {
    let fs;

    beforeEach(function() {
        fs = new MemoryFileSystem();
    });

    describe('Basic Operations', function() {
        it('should write and read a file', function() {
            fs.writeFile('test.txt', 'Hello World');
            const content = fs.readFile('test.txt');
            assert.strictEqual(content, 'Hello World');
        });

        it('should check if file exists', function() {
            fs.writeFile('test.txt', 'content');
            assert.strictEqual(fs.exists('test.txt'), true);
            assert.strictEqual(fs.exists('nonexistent.txt'), false);
        });

        it('should delete a file', function() {
            fs.writeFile('test.txt', 'content');
            fs.deleteFile('test.txt');
            assert.strictEqual(fs.exists('test.txt'), false);
        });

        it('should rename a file', function() {
            fs.writeFile('old.txt', 'content');
            fs.rename('old.txt', 'new.txt');
            assert.strictEqual(fs.exists('old.txt'), false);
            assert.strictEqual(fs.exists('new.txt'), true);
            assert.strictEqual(fs.readFile('new.txt'), 'content');
        });

        it('should list all files', function() {
            fs.writeFile('file1.txt', 'content1');
            fs.writeFile('file2.txt', 'content2');
            fs.writeFile('file3.js', 'content3');
            const files = fs.list();
            assert.strictEqual(files.length, 3);
            assert(files.includes('file1.txt'));
            assert(files.includes('file2.txt'));
            assert(files.includes('file3.js'));
        });

        it('should get file size', function() {
            fs.writeFile('test.txt', 'Hello');
            assert.strictEqual(fs.getSize('test.txt'), 5);
        });
    });

    describe('grep', function() {
        beforeEach(function() {
            fs.writeFile('file1.txt', 'Hello World\nGoodbye World\nHello Again');
            fs.writeFile('file2.txt', 'Test hello test\nAnother line');
        });

        it('should search for pattern in files', function() {
            const results = fs.grep('Hello');
            assert.strictEqual(results.length, 2);
            assert.strictEqual(results[0].filename, 'file1.txt');
            assert.strictEqual(results[0].lineNumber, 1);
        });

        it('should support case insensitive search', function() {
            const results = fs.grep('hello', null, { caseInsensitive: true });
            assert.strictEqual(results.length, 3);
        });
    });

    describe('find', function() {
        beforeEach(function() {
            fs.writeFile('test.txt', 'content');
            fs.writeFile('test.js', 'content');
            fs.writeFile('example.txt', 'content');
        });

        it('should find files by pattern', function() {
            const files = fs.find('test.*');
            assert.strictEqual(files.length, 2);
            assert(files.includes('test.txt'));
            assert(files.includes('test.js'));
        });

        it('should find files by extension', function() {
            const files = fs.find('*.txt');
            assert.strictEqual(files.length, 2);
            assert(files.includes('test.txt'));
            assert(files.includes('example.txt'));
        });
    });

    describe('sed', function() {
        it('should replace text in file', function() {
            fs.writeFile('test.txt', 'Hello World\nHello Again');
            fs.sed('Hello', 'Hi', 'test.txt', { global: true });
            const content = fs.readFile('test.txt');
            assert.strictEqual(content, 'Hi World\nHi Again');
        });

        it('should replace only first occurrence without global flag', function() {
            fs.writeFile('test.txt', 'Hello World Hello Again');
            fs.sed('Hello', 'Hi', 'test.txt', { global: false });
            const content = fs.readFile('test.txt');
            assert.strictEqual(content, 'Hi World Hello Again');
        });
    });

    describe('stat', function() {
        it('should return file statistics', function() {
            fs.writeFile('test.txt', 'Hello');
            const stats = fs.stat('test.txt');
            assert.strictEqual(stats.name, 'test.txt');
            assert.strictEqual(stats.size, 5);
            assert.strictEqual(stats.isFile, true);
            assert.strictEqual(stats.isDirectory, false);
        });
    });
});
