const ipc = require('electron').ipcRenderer
const path = require('path')

const select = {
  upload: document.getElementById('select'),
  directory: document.getElementById('select-directory'),
  file: document.getElementById('select-file'),
  list: document.getElementById('select-list'),
  analyze: document.getElementById('select-analyze'),
  bar: {
    analyze: document.getElementById('select-bar-analyze'),
    download: document.getElementById('select-bar-download'),
  },
  spinner: document.getElementById('select-spinner'),
}


select.upload.addEventListener('drop', function (e) {
  e.preventDefault();
  e.stopPropagation();
  
  for (let f of e.dataTransfer.files) {
    console.log('File(s) you dragged here: ', f.path)
    ipc.send("select-upload", f.path)
  }
})

select.directory.addEventListener('click', (event) => {
  ipc.send("select-file-dialog","directory")
})

select.file.addEventListener('click', (event) => {
  ipc.send("select-file-dialog","file")
})

select.analyze.addEventListener('click', (event) => {
  select.bar.analyze.value = 0
  select.bar.analyze.max = 1
  select.bar.download.value = 0
  select.bar.download.max = 1
  select.spinner.setAttribute("uk-spinner", "")
  ipc.send("select-analyze")
})

select.list.addEventListener('click', (event) => {
  console.log(event.target.parentNode)
  if (event.target.parentNode.className === 'uk-notification-close close-dir uk-close uk-icon') {
    var dir = event.target.parentNode.parentNode
    ipc.send('select-remove', dir.id)
    dir.parentNode.removeChild(dir)
    if (!select.list.firstChild) {
      select.analyze.setAttribute("disabled", "")
      select.analyze.classList.add('uk-animation-shake')
    }
  }
})

document.addEventListener('dragover', function (e) {
  e.preventDefault();
  e.stopPropagation();
})
document.addEventListener('drop', function (e) {
  e.preventDefault();
  e.stopPropagation();
})

ipc.on("select-callback", (event, dir, length) => {
  console.log(dir,length)
  select.analyze.removeAttribute('disabled')
  select.analyze.classList.remove('uk-animation-shake')
  if (length === 1){
    select.list.innerHTML += `<p class="uk-notification-message uk-notification-message-default uk-animation-slide-left" id="${dir}">
                                <a href="#" class="uk-notification-close close-dir" uk-close></a>
                                <span class="uk-margin-small-right" uk-icon="icon: copy"></span>
                                ${dir}
                              </p>`
  }
  else {
    select.list.innerHTML += `<p class="uk-notification-message uk-notification-message-primary uk-animation-slide-left" id="${dir}">
                                <a href="#" class="uk-notification-close close-dir" uk-close></a>
                                <span class="uk-margin-small-right" uk-icon="icon: folder"></span>
                                ${dir}
                                <span class="uk-badge">${length}</span>
                              </p>`
  }
})

ipc.on("select-progress-analyze", (event, value, max) =>{
  select.bar.analyze.value = value
  select.bar.analyze.max = max
})

ipc.on("select-progress-download", (event, value, max) =>{
  select.bar.download.value = value
  select.bar.download.max = max
})

ipc.on("select-done", (event) => {
  select.bar.analyze.value = 0
  select.bar.analyze.max = 1
  select.bar.download.value = 0
  select.bar.download.max = 1
  select.spinner.removeAttribute("uk-spinner")
  ipc.send("switch-section", "preview")
})

ipc.send("ipc-select")

function log (args, level){
  ipc.send('log', __filename, args, level)
}

log(`${path.basename(__filename)} importé avec succès.`)
