import { BrowserLog, clearStoredLogs, getStoredLogs } from './logServer';

export class ApiClient {
    async getLogs(): Promise<BrowserLog[]> {
        return getStoredLogs();
    }

    async clearLogs(): Promise<boolean> {
        clearStoredLogs();
        return true;
    }
}
