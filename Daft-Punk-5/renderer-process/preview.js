const ipc = require('electron').ipcRenderer
const path = require('path')

const preview = {
  slideshow: document.getElementById('preview-slideshow'),
  slideshowItem: document.getElementById('preview-slideshow-item'),
  album: document.getElementById('preview-album'),
  artist: document.getElementById('preview-artist'),
  tracks: document.getElementById('preview-tracks'),
  tags: document.getElementById('preview-tags'),
  similar: document.getElementById('preview-similar'),
  summary: document.getElementById('preview-summary'),

  missingData: document.getElementById('preview-missingData'),
  error: document.getElementById('preview-error'),
  missingDataNb: document.getElementById('preview-missingData-nb'),
  errorNb: document.getElementById('preview-error-nb'),
  list: document.getElementById('preview-list'),

  save: document.getElementById('preview-save'),
  saveFolder: document.getElementById('preview-save-folder')
}
var temp
var index

ipc.on("preview-display", (event, indexArg, tempArg) => {
  temp = tempArg
  index = indexArg
  preview.slideshow.innerHTML = ""
  preview.slideshowItem.innerHTML = ""
  var albumNumber = -1
  for (artist in index.list){
    for (album in index.list[artist].albums){
      albumNumber++
      preview.slideshow.innerHTML += `<li>
                                        <img src="${temp}\\covers\\${artist}\\${album}.jpg" alt="" uk-cover>
                                        <div class="uk-position-center uk-position-small uk-text-center">
                                          <h2 uk-slideshow-parallax="x: 100,-100"><a class="preview-show-details" data-album="${album}" data-artist="${artist}">${album}</a></h2>
                                          <p uk-slideshow-parallax="x: 200,-200">${artist}</p>
                                        </div>
                                      </li>`
      preview.slideshowItem.innerHTML += `<li uk-slideshow-item="${albumNumber}"><a href="#">Item ${albumNumber}</a></li>`
    }
  }
  var previewShow = document.querySelectorAll(".preview-show-details")
  previewShow[0].click()

  if(index.missingData.length === 0){
    preview.missingData.innerHTML = "Aucune musique."
  }
  else{
    preview.missingData.innerHTML = index.missingData.join("\n")
  }
  preview.missingDataNb.innerHTML = index.missingData.length

  console.log(index.error)
  if(index.error.length === 0){
    preview.error.innerHTML = "Aucune musique."
  }
  else{
    preview.error.innerHTML = index.error.join("\n")
  }
  preview.errorNb.innerHTML = index.error.length

  preview.list.innerHTML = ""
  for (artist in index.list){
    var artistImage = `${temp}\\covers\\${artist}.jpg`.replace(/\\/g, '\/')
    preview.list.innerHTML +=`<li>
                        <span class="uk-icon uk-icon-image uk-margin-small-right" style="background-image: url('${artistImage}');"></span>
                        <b>${artist}</b></li>`
    for (album in index.list[artist].albums){
        var albumImage = `${temp}\\covers\\${artist}\\${album}.jpg`.replace(/\\/g, '\/')
        preview.list.innerHTML +=`<ul><li>
                                <span class="uk-icon uk-icon-image uk-margin-small-right" style="background-image: url('${albumImage}');"></span>
                                <mark>${album}</mark></li></ul>`
        for (track in index.list[artist].albums[album]){
            preview.list.innerHTML +=`<ul><li><ul><li>${index.list[artist].albums[album][track].title}</li></ul></li></ul>`
        }
    }
  }
  preview.save.removeAttribute('disabled')
  preview.save.classList.remove('uk-animation-shake')
})

preview.slideshow.addEventListener('click', (event) => {
  if (event.target.className === "preview-show-details"){
    let artist = event.target.dataset.artist
    let album = event.target.dataset.album
    preview.album.innerHTML = `<div class="uk-card-media-top uk-text-center">
                                <img src="${temp}\\covers\\${artist}\\${album}.jpg" alt="">
                              </div>
                              <div class="uk-card-body">
                                <h3 class="uk-card-title">${album}</h3>
                                <p>${artist}</p>
                              </div>`
    preview.tracks.innerHTML = ""
    for (track in index.list[artist].albums[album]){
      preview.tracks.innerHTML += `<li>${track} - ${index.list[artist].albums[album][track].title}</li>`
    }
    preview.artist.innerHTML = `<div class="uk-card-media-top uk-text-center">
                                <img src="${temp}\\covers\\${artist}.jpg" alt="">
                              </div>
                              <div class="uk-card-body">
                                <h3 class="uk-card-title">${artist}</h3>
                              </div>`
    preview.tags.innerHTML = index.list[artist].tags.join(" - ")
    preview.similar.innerHTML = index.list[artist].similar.join(" - ")
    preview.summary.innerHTML = index.list[artist].summary.replace(/\n/g, '</br>')
  }
})

preview.save.addEventListener('click', (event) => {
  ipc.send('preview-save')
})

ipc.on("preview-save", (event, dir) =>{
  preview.saveFolder.innerHTML = `Exportation vers <code>${dir}</code>`
})

ipc.send("ipc-preview")

function log (args, level){
  ipc.send('log', __filename, args, level)
}

log(`${path.basename(__filename)} importé avec succès.`)
