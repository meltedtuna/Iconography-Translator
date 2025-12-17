document.addEventListener('DOMContentLoaded', () => {
    const stats = document.getElementById('stats');

    chrome.storage.sync.get(['customIcons'], (data) => {
        const count = data.customIcons?.global ? Object.keys(data.customIcons.global).length : 0;
        stats.textContent = `You have ${count} custom definitions in your global library.`;
    });

    document.getElementById('exportBtn').onclick = () => {
        chrome.storage.sync.get(['customIcons'], (data) => {
            const blob = new Blob([JSON.stringify(data.customIcons || {}, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'icon-translations.json';
            a.click();
        });
    };

    document.getElementById('importFile').onchange = (e) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                chrome.storage.sync.get(['customIcons'], (current) => {
                    const merged = { ...current.customIcons, ...imported };
                    chrome.storage.sync.set({ 'customIcons': merged }, () => {
                        alert("Dictionary updated!");
                        window.close();
                    });
                });
            } catch (err) { alert("Invalid file."); }
        };
        reader.readAsText(e.target.files[0]);
    };
});