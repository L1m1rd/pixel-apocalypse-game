(function () {
  if (window.desktop) return;

  const SAVE_KEY = 'pixel-apocalypse:world-v1';

  function readSave() {
    try {
      const value = localStorage.getItem(SAVE_KEY);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  function writeSave(value) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(value));
      return true;
    } catch (error) {
      throw new Error('Браузер не смог сохранить мир. Освободите место в хранилище сайта.');
    }
  }

  window.desktop = {
    load: async () => readSave(),
    save: async value => writeSave(value),
    saveSync: value => {
      try { return writeSave(value); } catch { return false; }
    },
    quit: async () => location.reload()
  };

  document.documentElement.dataset.platform = 'web';
  const quit = document.getElementById('quit');
  if (quit) quit.textContent = 'Перезапустить';
})();
