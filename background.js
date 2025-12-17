// Função centralizada para criar o menu com tratamento de erro
function setupContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "defineIcon",
      title: "Define this Icon Meaning",
      contexts: ["all"]
    }, () => {
      if (chrome.runtime.lastError) {
        console.log("Context menu already exists or error: ", chrome.runtime.lastError.message);
      }
    });
  });
}

// 1. Executa na instalação ou atualização
chrome.runtime.onInstalled.addListener(() => {
  setupContextMenu();
});

// 2. Executa quando o Chrome é iniciado
chrome.runtime.onStartup.addListener(() => {
  setupContextMenu();
});

// 3. Listener de mensagens para evitar que o worker morra sem responder
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  return true; // Mantém o canal de comunicação aberto se necessário
});

// 4. Listener do clique no menu
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "defineIcon" && tab.id) {
    // Verifica se a tab é válida e não é uma página protegida do sistema
    if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://')) {
      chrome.tabs.sendMessage(tab.id, { action: "openDefinitionPrompt" }, (response) => {
        // Silencia erros se a aba for fechada antes da resposta
        if (chrome.runtime.lastError) {
          console.warn("Could not send message: ", chrome.runtime.lastError.message);
        }
      });
    }
  }
});