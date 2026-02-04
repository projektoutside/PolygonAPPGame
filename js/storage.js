(() => {
    const memoryStore = new Map();

    const isStorageAvailable = () => {
        try {
            const testKey = '__polygon_storage_test__';
            window.localStorage.setItem(testKey, '1');
            window.localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    };

    const storageAvailable = isStorageAvailable();

    const getItem = (key) => {
        if (storageAvailable) {
            try {
                return window.localStorage.getItem(key);
            } catch (error) {
                // Fall through to memory store
            }
        }
        return memoryStore.has(key) ? memoryStore.get(key) : null;
    };

    const setItem = (key, value) => {
        const stringValue = value === undefined || value === null ? '' : String(value);
        if (storageAvailable) {
            try {
                window.localStorage.setItem(key, stringValue);
                return;
            } catch (error) {
                // Fall through to memory store
            }
        }
        memoryStore.set(key, stringValue);
    };

    const removeItem = (key) => {
        if (storageAvailable) {
            try {
                window.localStorage.removeItem(key);
                return;
            } catch (error) {
                // Fall through to memory store
            }
        }
        memoryStore.delete(key);
    };

    window.SafeStorage = {
        getItem,
        setItem,
        removeItem,
        available: storageAvailable
    };
})();