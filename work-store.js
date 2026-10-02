// Full works live in IndexedDB. A completed transaction is the save boundary.
export function createWorkStore(scope, indexedDB = globalThis.indexedDB) {
    let connection;
    const open = () => connection ||= new Promise((resolve, reject) => {
        if (!indexedDB) return reject(new Error('浏览器无法打开作品库，请先下载作品备份'));
        const request = indexedDB.open('interlude-theatre-works', 1);
        request.onupgradeneeded = () => {
            const store = request.result.createObjectStore('works', { keyPath: ['scope', 'id'] });
            store.createIndex('scope', 'scope');
        };
        request.onerror = () => { connection = null; reject(request.error); };
        request.onblocked = () => { connection = null; reject(new Error('请关闭其他剧场页面后重试保存')); };
        request.onsuccess = () => {
            request.result.onversionchange = () => { request.result.close(); connection = null; };
            resolve(request.result);
        };
    });
    async function run(mode, operation) {
        const db = await open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('works', mode);
            const request = operation(transaction.objectStore('works'));
            transaction.oncomplete = () => resolve(request.result);
            transaction.onabort = transaction.onerror = () => reject(transaction.error || new Error('作品保存失败，请下载备份后重试'));
        });
    }
    return {
        get: id => run('readonly', store => store.get([scope, id])).then(row => row?.value),
        put: value => run('readwrite', store => store.put({ scope, id: value.id, value })),
        list: () => run('readonly', store => store.index('scope').getAll(scope))
            .then(rows => rows.map(row => row.value).filter(value => value.id !== '__session__')),
    };
}
