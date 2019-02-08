const ipc = require('electron').ipcRenderer

document.getElementById('welcome-trigger').click()

ipc.on("notification", (event, message, status) => {
  UIkit.notification({message: message, status: status})
})

ipc.send("ipc-index")
