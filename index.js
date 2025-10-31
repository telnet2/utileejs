const EventRouter = require('./lib/EventRouter');
const MemoryFileSystem = require('./src/MemoryFileSystem');
const Repl = require('./src/Repl');

module.exports = {
    EventRouter: EventRouter,
    MemoryFileSystem: MemoryFileSystem,
    Repl: Repl,
}