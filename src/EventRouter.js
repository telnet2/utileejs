const EventEmitter = require('eventemitter3');
const { camelCaseString } = require('./util');

class EventRouter extends EventEmitter {
    /**
     * 
     * @param {string[]} events 
     */
    registerEvents(events) {
        if (events && events.forEach) {
            events.forEach((e, i) => {
                const camelCase = camelCaseString(e.toLowerCase());
                this[e] = i;
                this[camelCase] = function (...args) {
                    this.emit(i, ...args);
                }
                if (camelCase) {
                    const postfix = camelCase.slice(0, 1).toUpperCase() + camelCase.slice(1);
                    this[`enable${postfix}`] = function (callback) {
                        this.on(i, callback);
                    }
                    this[`disable${postfix}`] = function (callback) {
                        this.off(i, callback);
                    }
                }
            });
        }
    }
}

module.exports = exports = EventRouter;