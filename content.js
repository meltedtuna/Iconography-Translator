let userDictionary = {};

// 1. Carregar Dicionário do Usuário
chrome.storage.sync.get(['customIcons'], (result) => {
    userDictionary = result.customIcons || { global: {} };
});

// 2. Lógica do Detetive (Identifica ícones)
function identifyIcon(el) {
    if (!el) return null;
    const container = el.closest('a, button, [role="button"]') || el;

    const labels = [
        el.getAttribute('alt'),
        container.getAttribute('alt'),
        container.getAttribute('aria-label'),
        el.getAttribute('aria-label'),
        container.getAttribute('title')
    ];

    const blacklist = ['icon', 'button', 'icon-only', 'medium', 'small', 'btn', 'visual', 'appheader-button'];
    
    for (let label of labels) {
        if (label && label.length < 50) {
            const cleanLabel = label.toLowerCase().trim();
            if (!blacklist.includes(cleanLabel)) return label;
        }
    }

    const styles = window.getComputedStyle(el);
    const bg = styles.getPropertyValue('background-image');
    const mask = styles.getPropertyValue('mask-image') || styles.getPropertyValue('-webkit-mask-image');
    const imgSource = bg !== 'none' ? bg : (mask !== 'none' ? mask : null);

    if (imgSource && imgSource.includes('url')) {
        const cleanName = imgSource.split('/').pop().split(/[?#.]/)[0].replace(/[^a-z0-9]/gi, '-').toLowerCase();
        if (cleanName.length > 2 && !blacklist.includes(cleanName)) return `icon-${cleanName}`;
    }

    const classList = [...Array.from(el.classList), ...Array.from(container.classList)];
    for (let cls of classList) {
        if (typeof cls === 'string') {
            const cleanCls = cls.toLowerCase();
            if ((cleanCls.includes('icon') || cleanCls.includes('fa-') || cleanCls.includes('octicon')) 
                && !blacklist.some(word => cleanCls === word || cleanCls.includes(`--${word}`))) {
                
                if (cleanCls.includes('octicon-')) return cleanCls.split('octicon-')[1];
                if (cleanCls.includes('fa-')) return cleanCls.split('fa-')[1];
                return cleanCls;
            }
        }
    }
    return null;
}

// 3. Sistema de Tooltip
const tooltip = document.createElement('div');
Object.assign(tooltip.style, {
    position: 'fixed', padding: '10px 15px', background: 'rgba(26, 26, 26, 0.95)', color: '#fff',
    borderRadius: '8px', fontSize: '13px', pointerEvents: 'none', display: 'none',
    zIndex: '2147483647', border: '1px solid #444', boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
    backdropFilter: 'blur(6px)', 
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', 
    lineHeight: '1.4'
});
document.body.appendChild(tooltip);

document.addEventListener('mouseover', (e) => {
    const icon = e.target.closest('i, span, svg, img, a, button');
    const id = identifyIcon(icon);
    if (id) {
        const lang = document.documentElement.lang.split('-')[0] || 'en';
        const entry = (userDictionary[lang] && userDictionary[lang][id]) || (userDictionary['global'] && userDictionary['global'][id]);
        
        tooltip.innerHTML = `
            <div style="font-weight:bold">${entry ? entry.name : id}</div>
            ${entry?.hint ? `<div style="font-size:11px;color:#bbb;margin-top:3px;font-style:italic">${entry.hint}</div>` : ''}
        `;
        tooltip.style.display = 'block';
        icon.style.outline = "2px solid #007bff";
    }
});

document.addEventListener('mousemove', (e) => {
    if (tooltip.style.display === 'block') {
        tooltip.style.left = (e.clientX + 15) + 'px';
        tooltip.style.top = (e.clientY + 15) + 'px';
    }
});

document.addEventListener('mouseout', (e) => {
    tooltip.style.display = 'none';
    if (e.target.style) e.target.style.outline = "";
});

// 4. Modal de Definição
function showDefinitionModal(rawId) {
    const modal = document.createElement('div');
    Object.assign(modal.style, {
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: 'white', padding: '20px', borderRadius: '12px', zIndex: '2147483647',
        boxShadow: '0 0 100px rgba(0,0,0,0.5)', border: '1px solid #ccc', width: '300px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', 
        color: '#333'
    });

    modal.innerHTML = `
        <h3 style="margin:0 0 10px 0; font-size: 16px;">Define Icon Meaning</h3>
        <p style="font-size:11px; color:#999; margin-bottom: 15px;">Target: ${rawId}</p>
        <input id="iconName" type="text" placeholder="Meaning (e.g. Home)" style="width:100%;margin-bottom:10px;padding:10px;box-sizing:border-box;border:1px solid #ddd;border-radius:4px;">
        <input id="iconHint" type="text" placeholder="Hint/Context (Optional)" style="width:100%;margin-bottom:15px;padding:10px;box-sizing:border-box;border:1px solid #ddd;border-radius:4px;">
        <div style="display:flex;gap:10px">
            <button id="saveGlobal" style="flex:1;padding:10px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Save</button>
            <button id="saveCancel" style="flex:1;padding:10px;background:#eee;border:1px solid #ccc;border-radius:4px;cursor:pointer;color:#333">Cancel</button>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#saveCancel').onclick = () => modal.remove();
    modal.querySelector('#saveGlobal').onclick = () => {
        const name = modal.querySelector('#iconName').value;
        const hint = modal.querySelector('#iconHint').value;
        if (name) {
            if (!userDictionary['global']) userDictionary['global'] = {};
            userDictionary['global'][rawId] = { name, hint: hint || "" };
            chrome.storage.sync.set({ 'customIcons': userDictionary }, () => modal.remove());
        }
    };
}

let lastTarget = null;
document.addEventListener('contextmenu', (e) => {
    lastTarget = e.target.closest('i, span, svg, img, a, button');
});

// 5. Listener de Mensagens
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openDefinitionPrompt" && lastTarget) {
        const id = identifyIcon(lastTarget);
        if (id) {
            showDefinitionModal(id);
        } else {
            alert("Could not identify this icon. Try another element!");
        }
    }
    return true; 
});