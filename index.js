const fs = require('fs-extra');
const path = require('path');

const debounce = (func, wait, immediate) => {
    let timeout;
    return function () {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, arguments);
        };

        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, arguments);
    };
};

const promisify = fn => {
    return function () {
        return new Promise((resolve, reject) => {
            const cb = (err, arg) => {
                if (err) return reject(err);
                resolve(arg);
            };
            return fn.call(this, ...arguments, cb);
        });
    }
};

const getStore = (storageName, db) => {

    const store = {
        name: storageName,

        cache: null,

        select(selector) {
            return selector(store.cache);
        },

        save: promisify(debounce((id = storageName, cb) => {
            return db.set(id, store.cache, cb);
        }, 50, true)),

        saveSync: debounce((id = storageName) => {
            return db.setSync(id, store.cache);
        }, 50, true),

        update(updater) {
            store.cache = updater(store.cache);
            store.saveSync();
            return store.cache;
        },

        set(key, value, id = storageName) {
            return store.update(obj =>
                Object.assign(obj || {}, { [key]: value }), id);
        },

        get(key, id = storageName) {
            return store.select(x => x[key], id)
        },

        delete(key, id = storageName) {
            return store.update(obj => {
                delete obj[key];
                return obj;
            });
        },

        has(key, id = storageName) {
            return store.select(x => key in x, id);
        }

    };

    store.cache = db.init(storageName);

    return store;

};

const getDb = (dbName) => {
    const db = {
        name: dbName,
        getFilename(name) {
            return path.join(dbName, name).replace(/(\.json)?$/, '.json');
        },

        get: promisify((name, cb) => {
            return fs.readFile(db.getFilename(name), (err, data) => cb(err, JSON.parse(data)));
        }),

        getSync(name) {
            const data = fs.readFileSync(db.getFilename(name));
            return JSON.parse(data);
        },

        set: promisify((name, data, cb) => {
            fs.outputFile(db.getFilename(name), JSON.stringify(data), cb);
        }),

        setSync(name, data) {
            return fs.outputFileSync(db.getFilename(name), JSON.stringify(data));
        },

        getStore(name) {
            return getStore(name, db);
        },

        init(name) {
            try {
                return db.getSync(name);
            } catch (e) {
                const empty = {};
                db.setSync(name, empty);
                return empty;
            }
        }
    };

    return db;
};

module.exports.default = getDb;
module.exports.getDb = getDb;
module.exports.getStore = getStore;