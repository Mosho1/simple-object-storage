interface Store<T> {
    cache: T | null;
    name: string;
    select<R>(selector: (obj: T) => R): R;
    save(): Promise<void>;
    saveSync(): void;
    update(updater: (obj: T) => T): T;
    set(key: string, value: any): T;
    get(key: string): any;
    delete(key: string): T;
    has(key: string): boolean;
}

interface DB {
    name: string;
    getFilename(name: string): string;
    getAsync(name: string): Promise<Object>
    getSync(name: string): Object;
    setAsync(name: string, data: Object): Promise<void>;
    setSync(name: string, data: Object): void;
    getStore<T>(name: string): Store<T>;
    init(name: string): Object;
}

declare function getDb(dbName: string): DB;
declare function getStore<T>(storeName: string, db: DB): Store<T>;

export default getDb;
export {getDb};
export {getStore};