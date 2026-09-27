async function getCurrentSiteHost() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const url = tab?.url || "";

  if (!url) return "";

  try {
    const parsed = new URL(url);
    // Retourne le hostname (ex: google.com) ou les alternatives si vide
    return parsed.hostname || parsed.origin || parsed.protocol;
  } catch {
    return url;
  }
}

const STORAGE_KEY = "savedSites";

function setError(message) {
  const el = document.getElementById("error");
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
}

function setNameButton(name) {
  const btn = document.getElementById("saveBtn");
  if (!btn) return;
  btn.textContent = name;
}

function setStatus(message) {
  const el = document.getElementById("status");
  if (!el) return;
  el.textContent = message;
}

function setTabsVisible(visible) {
  const tabs = document.getElementById("siteTabs");
  if (tabs) tabs.hidden = !visible;
}

function selectTab(tabName) {
  const mainTab = document.getElementById("mainTab");
  const imageScrollTab = document.getElementById("imageScrollTab");
  const videoTab = document.getElementById("videoTab");
  const mainPanel = document.getElementById("mainPanel");
  const imageScrollPanel = document.getElementById("imageScrollPanel");
  const videoPanel = document.getElementById("videoPanel");
  const showMain = tabName === "main";
  const showImageScroll = tabName === "imageScroll";

  mainTab?.classList.toggle("isActive", showMain);
  mainTab?.setAttribute("aria-selected", String(showMain));
  imageScrollTab?.classList.toggle("isActive", showImageScroll);
  imageScrollTab?.setAttribute("aria-selected", String(showImageScroll));
  videoTab?.classList.toggle("isActive", !showMain && !showImageScroll);
  videoTab?.setAttribute("aria-selected", String(!showMain && !showImageScroll));
  if (mainPanel) mainPanel.hidden = !showMain;
  if (imageScrollPanel) imageScrollPanel.hidden = !showImageScroll;
  if (videoPanel) videoPanel.hidden = showMain || showImageScroll;
}

async function loadSavedSites() {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  const sites = Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
  return sites;
}

async function saveSites(siteName, sites) {
  if (sites.includes(siteName)) return sites;
  const next = [siteName, ...sites];
  await chrome.storage.sync.set({ [STORAGE_KEY]: next });
  setNameButton("Supprimer Site");
  return next;
}

async function deleteSavedSite(siteName, sites) {
  const next = sites.filter((s) => s !== siteName);
  await chrome.storage.sync.set({ [STORAGE_KEY]: next });
  setNameButton("Enregistrer Site");
  return next;
}


(async () => {
  try {
    const site = await getCurrentSiteHost();

    if (!site) {
      setError("Site indisponible: impossible de récupérer l’URL de la page.");
      return;
    }
    const urlEl = document.getElementById("pageUrl");
    if (urlEl) {
      urlEl.textContent = site || "(site indisponible)";
    }

    const sites = await loadSavedSites();
    setTabsVisible(sites.includes(site));

    document.getElementById("mainTab")?.addEventListener("click", () => selectTab("main"));
    document.getElementById("imageScrollTab")?.addEventListener("click", () => selectTab("imageScroll"));
    document.getElementById("videoTab")?.addEventListener("click", () => selectTab("video"));

    const saveBtn = document.getElementById("saveBtn");
    if (saveBtn) {
      if (sites.includes(site)) {
        setNameButton("Supprimer Site");
      } else {
        setNameButton("Enregistrer Site");
      }
      saveBtn.addEventListener("click", async () => {
        try {
          const savedSites = await loadSavedSites();
          setStatus("");
          if (!site) {
            setError("Site indisponible: impossible d’enregistrer cette page.");
            return;
          }

          let statusMessage;
          if (savedSites.includes(site)) {
            await deleteSavedSite(site, savedSites);
            statusMessage = "Site supprimé";
            setTabsVisible(false);
            selectTab("main");
          } else {
            await saveSites(site, savedSites);
            statusMessage = "Site enregistré";
            setTabsVisible(true);
            selectTab("main");
          }
          setStatus(statusMessage);
          const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
          if (tab?.id) {
            try {
              await chrome.tabs.sendMessage(tab.id, { action: "RELOAD_CONTENT" });
            } catch {
              setStatus(statusMessage + " (Veuillez actualiser la page)");
            }
          }
        } catch (e) {
          setError("Erreur: " + (e && e.message ? e.message : String(e)));
        }
      });
    }
  } catch (e) {
    setError("Erreur: " + (e && e.message ? e.message : String(e)));
  }
})();
