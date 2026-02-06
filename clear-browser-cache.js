/**
 * Script de Limpeza de Cache e Storage
 * Execute este script no console do navegador (F12) para limpar todos os dados armazenados
 */

console.log('🧹 Iniciando limpeza de cache e storage...');

// 1. Limpar localStorage
try {
    localStorage.clear();
    console.log('✅ localStorage limpo');
} catch (e) {
    console.error('❌ Erro ao limpar localStorage:', e);
}

// 2. Limpar sessionStorage
try {
    sessionStorage.clear();
    console.log('✅ sessionStorage limpo');
} catch (e) {
    console.error('❌ Erro ao limpar sessionStorage:', e);
}

// 3. Limpar cookies
try {
    document.cookie.split(";").forEach(function (c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    console.log('✅ Cookies limpos');
} catch (e) {
    console.error('❌ Erro ao limpar cookies:', e);
}

// 4. Limpar IndexedDB (usado pelo Supabase)
try {
    if (window.indexedDB) {
        indexedDB.databases().then(databases => {
            databases.forEach(db => {
                if (db.name) {
                    indexedDB.deleteDatabase(db.name);
                    console.log(`✅ IndexedDB "${db.name}" removido`);
                }
            });
        });
    }
} catch (e) {
    console.error('❌ Erro ao limpar IndexedDB:', e);
}

// 5. Limpar Service Workers
try {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => {
                registration.unregister();
                console.log('✅ Service Worker removido');
            });
        });
    }
} catch (e) {
    console.error('❌ Erro ao limpar Service Workers:', e);
}

// 6. Limpar Cache API
try {
    if ('caches' in window) {
        caches.keys().then(names => {
            names.forEach(name => {
                caches.delete(name);
                console.log(`✅ Cache "${name}" removido`);
            });
        });
    }
} catch (e) {
    console.error('❌ Erro ao limpar Cache API:', e);
}

console.log('🎉 Limpeza concluída! Recarregue a página (Ctrl+Shift+R ou Cmd+Shift+R)');
console.log('💡 Dica: Para uma limpeza completa, use Ctrl+Shift+Delete no navegador');
