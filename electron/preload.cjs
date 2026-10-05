const { contextBridge, ipcRenderer } = require('electron')

const validCommands = new Set(['open-add-reminder', 'show-today'])

contextBridge.exposeInMainWorld('dailyReminderDesktop', {
  getData: () => ipcRenderer.invoke('desktop:get-data'),
  getSettings: () => ipcRenderer.invoke('desktop:get-settings'),
  getSyncInfo: () => ipcRenderer.invoke('desktop:get-sync-info'),
  isElectron: true,
  migrateLocalStorage: (state) => ipcRenderer.invoke('desktop:migrate-local-storage', state),
  onCommand: (callback) => {
    const handler = (_event, command) => {
      if (validCommands.has(command)) {
        callback(command)
      }
    }

    ipcRenderer.on('desktop:command', handler)
    return () => ipcRenderer.removeListener('desktop:command', handler)
  },
  onSettingsChanged: (callback) => {
    const handler = (_event, settings) => callback(settings)
    ipcRenderer.on('desktop:settings-changed', handler)
    return () => ipcRenderer.removeListener('desktop:settings-changed', handler)
  },
  onStateChanged: (callback) => {
    const handler = (_event, state) => callback(state)
    ipcRenderer.on('desktop:state-changed', handler)
    return () => ipcRenderer.removeListener('desktop:state-changed', handler)
  },
  saveState: (state) => ipcRenderer.invoke('desktop:save-state', state),
  setSetting: (key, value) => ipcRenderer.invoke('desktop:set-setting', { key, value }),
})
