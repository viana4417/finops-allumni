document.addEventListener('DOMContentLoaded', async () => {
    if (typeof initDB === 'function') {
        await initDB();
        await initDefaultData();
    }

    verificarLogin();
});
