// Avisa a la app web de que se está ejecutando como programa de escritorio.
const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('escritorio', { activo: true });
