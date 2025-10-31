const { expect } = require('chai');
const { MemShell } = require('../src/MemShell');
const { MemFS } = require('../src/MemFS');

describe('MemShell - Shell Commands', () => {
    let shell;

    beforeEach(() => {
        shell = new MemShell();
    });

    describe('ls command', () => {
        it('should list files in current directory', () => {
            shell.fs.createFile('file1.txt', '');
            shell.fs.createFile('file2.txt', '');
            shell.fs.createDirectory('dir1');

            const output = shell.exec('ls');
            expect(output).to.include('file1.txt');
            expect(output).to.include('file2.txt');
            expect(output).to.include('dir1');
        });

        it('should list with long format (-l flag)', () => {
            shell.fs.createFile('file.txt', 'content');
            const output = shell.exec('ls -l');
            expect(output).to.match(/-rwxr-xr-x/);
            expect(output).to.include('file.txt');
        });

        it('should list specific directory', () => {
            shell.fs.createDirectory('testdir');
            shell.fs.changeDirectory('testdir');
            shell.fs.createFile('inner.txt', '');
            shell.fs.changeDirectory('/');

            const output = shell.exec('ls testdir');
            expect(output).to.include('inner.txt');
        });
    });

    describe('cat command', () => {
        it('should display file contents', () => {
            shell.fs.createFile('test.txt', 'Hello World');
            const output = shell.exec('cat test.txt');
            expect(output).to.equal('Hello World');
        });

        it('should concatenate multiple files', () => {
            shell.fs.createFile('file1.txt', 'Hello');
            shell.fs.createFile('file2.txt', 'World');
            const output = shell.exec('cat file1.txt file2.txt');
            expect(output).to.equal('HelloWorld');
        });

        it('should throw error for non-existent file', () => {
            expect(() => shell.exec('cat nonexistent.txt')).to.throw();
        });

        it('should throw error for directory', () => {
            shell.fs.createDirectory('dir');
            expect(() => shell.exec('cat dir')).to.throw(/Is a directory/);
        });
    });

    describe('pwd command', () => {
        it('should print working directory', () => {
            const output = shell.exec('pwd');
            expect(output).to.equal('/');
        });

        it('should show current directory after cd', () => {
            shell.fs.createDirectory('test');
            shell.exec('cd test');
            const output = shell.exec('pwd');
            expect(output).to.equal('/test');
        });
    });

    describe('cd command', () => {
        it('should change directory', () => {
            shell.fs.createDirectory('test');
            shell.exec('cd test');
            expect(shell.fs.getCurrentDirectory()).to.equal('/test');
        });

        it('should go to root with no arguments', () => {
            shell.fs.createDirectory('test');
            shell.exec('cd test');
            shell.exec('cd');
            expect(shell.fs.getCurrentDirectory()).to.equal('/');
        });

        it('should throw error for non-existent directory', () => {
            expect(() => shell.exec('cd nonexistent')).to.throw();
        });
    });

    describe('mkdir command', () => {
        it('should create directory', () => {
            shell.exec('mkdir testdir');
            const node = shell.fs.resolvePath('testdir');
            expect(node).to.not.be.null;
            expect(node.isDirectory()).to.be.true;
        });

        it('should create nested directories with -p flag', () => {
            shell.exec('mkdir -p a/b/c');
            const node = shell.fs.resolvePath('a/b/c');
            expect(node).to.not.be.null;
            expect(node.isDirectory()).to.be.true;
        });

        it('should create multiple directories', () => {
            shell.exec('mkdir dir1 dir2 dir3');
            expect(shell.fs.resolvePath('dir1')).to.not.be.null;
            expect(shell.fs.resolvePath('dir2')).to.not.be.null;
            expect(shell.fs.resolvePath('dir3')).to.not.be.null;
        });
    });

    describe('touch command', () => {
        it('should create empty file', () => {
            shell.exec('touch newfile.txt');
            const node = shell.fs.resolvePath('newfile.txt');
            expect(node).to.not.be.null;
            expect(node.isFile()).to.be.true;
            expect(node.read()).to.equal('');
        });

        it('should update timestamp of existing file', (done) => {
            shell.fs.createFile('existing.txt', 'content');
            const node = shell.fs.resolvePath('existing.txt');
            const oldTime = node.modifiedAt;

            setTimeout(() => {
                shell.exec('touch existing.txt');
                expect(node.modifiedAt.getTime()).to.be.greaterThan(oldTime.getTime());
                done();
            }, 10);
        });
    });

    describe('rm command', () => {
        it('should remove file', () => {
            shell.fs.createFile('test.txt', '');
            shell.exec('rm test.txt');
            expect(shell.fs.resolvePath('test.txt')).to.be.null;
        });

        it('should remove directory with -r flag', () => {
            shell.fs.createDirectory('dir');
            shell.fs.createFile('dir/file.txt', '');
            shell.exec('rm -r dir');
            expect(shell.fs.resolvePath('dir')).to.be.null;
        });

        it('should throw error removing non-empty directory without -r', () => {
            shell.fs.createDirectory('dir');
            shell.fs.createFile('dir/file.txt', '');
            expect(() => shell.exec('rm dir')).to.throw();
        });
    });

    describe('echo command', () => {
        it('should display text', () => {
            const output = shell.exec('echo Hello World');
            expect(output).to.equal('Hello World');
        });
    });

    describe('grep command', () => {
        beforeEach(() => {
            shell.fs.createFile('test.txt', 'Hello World\nFoo Bar\nHello Again');
        });

        it('should find matching lines', () => {
            const output = shell.exec('grep Hello test.txt');
            expect(output).to.include('Hello World');
            expect(output).to.include('Hello Again');
            expect(output).to.not.include('Foo Bar');
        });

        it('should search case-insensitive with -i flag', () => {
            const output = shell.exec('grep -i hello test.txt');
            expect(output).to.include('Hello World');
        });

        it('should show line numbers with -n flag', () => {
            const output = shell.exec('grep -n Hello test.txt');
            expect(output).to.match(/1:Hello World/);
            expect(output).to.match(/3:Hello Again/);
        });
    });

    describe('find command', () => {
        beforeEach(() => {
            shell.fs.createDirectories('a/b');
            shell.fs.createFile('a/file1.txt', '');
            shell.fs.createFile('a/b/file2.js', '');
            shell.fs.createFile('a/b/test.txt', '');
        });

        it('should find all files and directories', () => {
            const output = shell.exec('find a');
            expect(output).to.include('/a');
            expect(output).to.include('/a/file1.txt');
            expect(output).to.include('/a/b');
            expect(output).to.include('/a/b/file2.js');
        });

        it('should filter by name pattern', () => {
            const output = shell.exec('find a --name *.txt');
            expect(output).to.include('file1.txt');
            expect(output).to.include('test.txt');
            expect(output).to.not.include('file2.js');
        });

        it('should filter by type (files only)', () => {
            const output = shell.exec('find a --type f');
            expect(output).to.include('file1.txt');
            expect(output).to.include('file2.js');
            expect(output).to.not.include('/a/b\n'); // directory
        });

        it('should filter by type (directories only)', () => {
            const output = shell.exec('find a --type d');
            expect(output).to.include('/a');
            expect(output).to.include('/a/b');
            expect(output).to.not.include('file1.txt');
        });
    });

    describe('sed command', () => {
        it('should substitute text in file', () => {
            shell.fs.createFile('test.txt', 'Hello World');
            const output = shell.exec('sed s/World/Universe/g test.txt');
            expect(output).to.equal('Hello Universe');
        });

        it('should modify file in-place by default', () => {
            shell.fs.createFile('test.txt', 'foo bar foo');
            shell.exec('sed s/foo/baz/g test.txt');
            const content = shell.fs.resolvePath('test.txt').read();
            expect(content).to.equal('baz bar baz');
        });

        it('should handle regex patterns', () => {
            shell.fs.createFile('test.txt', 'test123 test456');
            const output = shell.exec('sed s/test[0-9]+/NUM/g test.txt');
            expect(output).to.include('NUM');
        });
    });

    describe('write command', () => {
        it('should write content to new file', () => {
            shell.exec('write test.txt Hello World');
            const node = shell.fs.resolvePath('test.txt');
            expect(node.read()).to.equal('Hello World');
        });

        it('should overwrite existing file', () => {
            shell.fs.createFile('test.txt', 'old content');
            shell.exec('write test.txt new content');
            const node = shell.fs.resolvePath('test.txt');
            expect(node.read()).to.equal('new content');
        });
    });

    describe('node command', () => {
        it('should execute JavaScript file', () => {
            shell.fs.createFile('script.js', "console.log('Hello from script');");
            const output = shell.exec('node script.js');
            expect(output).to.equal('Hello from script');
        });

        it('should handle console methods', () => {
            shell.fs.createFile('script.js', `
                console.log('log message');
                console.error('error message');
                console.warn('warn message');
            `);
            const output = shell.exec('node script.js');
            expect(output).to.include('log message');
            expect(output).to.include('ERROR: error message');
            expect(output).to.include('WARN: warn message');
        });

        it('should provide process.argv', () => {
            shell.fs.createFile('args.js', `
                console.log(process.argv.join(' '));
            `);
            const output = shell.exec('node args.js arg1 arg2');
            expect(output).to.include('arg1 arg2');
        });

        it('should support require for memory filesystem modules', () => {
            shell.fs.createFile('module.js', 'module.exports = { value: 42 };');
            shell.fs.createFile('main.js', `
                const mod = require('./module.js');
                console.log(mod.value);
            `);
            const output = shell.exec('node main.js');
            expect(output).to.equal('42');
        });
    });

    describe('Command parsing', () => {
        it('should parse flags correctly', () => {
            const { flags, positional } = shell.parseArgs(['-l', '-a', 'test']);
            expect(flags.l).to.be.true;
            expect(flags.a).to.be.true;
            expect(positional[0]).to.equal('test');
        });

        it('should parse long flags', () => {
            const { flags } = shell.parseArgs(['--name', 'test.txt']);
            expect(flags.name).to.equal('test.txt');
        });

        it('should parse combined short flags', () => {
            const { flags } = shell.parseArgs(['-la']);
            expect(flags.l).to.be.true;
            expect(flags.a).to.be.true;
        });
    });

    describe('Error handling', () => {
        it('should throw error for unknown command', () => {
            expect(() => shell.exec('unknowncommand')).to.throw(/command not found/);
        });

        it('should handle empty command gracefully', () => {
            const output = shell.exec('');
            expect(output).to.equal('');
        });

        it('should handle whitespace-only command', () => {
            const output = shell.exec('   ');
            expect(output).to.equal('');
        });
    });
});
