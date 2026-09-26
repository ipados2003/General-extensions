// content.js
const STORAGE_KEY = "savedSites";

async function checkAndRun() {
  
  // Récupération des sites sauvegardés
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  const savedSites = Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
  
  const currentHost = window.location.hostname;

  if (savedSites.includes(currentHost)) {
    console.log(`Le site "${currentHost}" est autorisé ! Lancement du script...`);
    addbordure();
  } else {
    console.log(`Le site "${currentHost}" n'est pas dans la liste. Extension inactive.`);
    dellbordure();
  }
}

function addbordure() {
  document.body.style.border = "5px solid green"; 
}

function dellbordure() {
  document.body.style.border = "none"; 
}

// Ajoutez ceci à la fin de votre content.js
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "RELOAD_CONTENT") {
    checkAndRun(); // Relance la vérification de la liste
  }
});

checkAndRun();