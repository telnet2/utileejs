import { MemShell } from './MemShell';

/**
 * AST Node structure (from sh-syntax)
 */
export interface ASTNode {
    Pos?: number;
    End?: number;
}

export interface ASTWord {
    Lit: string;
}

export interface ASTRedirection {
    Op: string;
    Word?: ASTWord;
    Hdoc?: ASTWord;
}

export interface ASTStatement {
    Cmd?: ASTNode;
    Redirs?: ASTRedirection[];
}

export interface ASTFile {
    Stmts: ASTStatement[];
}

export interface Redirection {
    type: string;
    target: string | null;
    hdoc: string | null;
}

export interface CommandInfo {
    command: string;
    args: string[];
}

/**
 * AST Interpreter for MemShell
 * Walks the sh-syntax AST and executes commands against MemFS
 */
export class ASTInterpreter {
    private shell: MemShell;

    constructor(memShell: MemShell) {
        this.shell = memShell;
    }

    /**
     * Execute a parsed AST File
     */
    async executeFile(astFile: ASTFile, stdin: string | null = null): Promise<string> {
        let lastOutput = '';

        for (const stmt of astFile.Stmts) {
            lastOutput = await this.executeStatement(stmt, stdin);
        }

        return lastOutput;
    }

    /**
     * Execute a single statement
     */
    async executeStatement(stmt: ASTStatement, stdin: string | null = null): Promise<string> {
        if (!stmt.Cmd) {
            return '';
        }

        // Check for redirections
        const redirects = this.parseRedirections(stmt.Redirs || []);

        // Execute the command based on its type
        // Note: stmt.Cmd is a Node with Pos/End, actual command info is in the original AST
        // For now, we'll need to examine the statement structure

        // This is a simplified version - you'll need to walk the actual command structure
        // from the AST to extract command name and arguments

        return '';
    }

    /**
     * Parse redirections from AST
     */
    parseRedirections(redirs: ASTRedirection[]): Redirection[] {
        return redirs.map(redir => ({
            type: redir.Op,
            target: redir.Word ? redir.Word.Lit : null,
            hdoc: redir.Hdoc ? redir.Hdoc.Lit : null
        }));
    }

    /**
     * Execute a pipeline (commands connected by |)
     */
    async executePipeline(commands: any[], stdin: string | null = null): Promise<string> {
        let output: string | null = stdin;

        for (const cmd of commands) {
            output = await this.executeCommand(cmd, output);
        }

        return output || '';
    }

    /**
     * Execute a single command
     */
    async executeCommand(cmdNode: any, stdin: string | null = null): Promise<string> {
        // Extract command name and arguments from AST node
        // This depends on the actual AST structure
        const { command, args } = this.extractCommandInfo(cmdNode);

        // Use existing MemShell command execution
        return this.shell.execSingle([command, ...args], stdin);
    }

    /**
     * Extract command name and arguments from AST node
     * This is where we bridge AST → MemShell format
     */
    extractCommandInfo(cmdNode: any): CommandInfo {
        // TODO: Implement based on actual AST structure
        // For now, return empty
        return { command: '', args: [] };
    }
}
