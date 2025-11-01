import { EventEmitter } from 'eventemitter3';
import { camelCaseString } from './util';

export class EventRouter extends EventEmitter {
    /**
     * Register events with dynamic method creation
     * @param events - Array of event names to register
     */
    registerEvents(events: string[]): void {
        if (events && events.forEach) {
            events.forEach((e: string, i: number) => {
                const camelCase = camelCaseString(e.toLowerCase());

                // Store event index
                (this as any)[e] = i;

                // Create camelCase event emitter method
                if (camelCase) {
                    (this as any)[camelCase] = function (this: EventRouter, ...args: any[]) {
                        this.emit(i as any, ...args);
                    };

                    const postfix = camelCase.slice(0, 1).toUpperCase() + camelCase.slice(1);

                    // Create enable method
                    (this as any)[`enable${postfix}`] = function (this: EventRouter, callback: (...args: any[]) => void) {
                        this.on(i as any, callback);
                    };

                    // Create disable method
                    (this as any)[`disable${postfix}`] = function (this: EventRouter, callback: (...args: any[]) => void) {
                        this.off(i as any, callback);
                    };
                }
            });
        }
    }
}

export default EventRouter;
