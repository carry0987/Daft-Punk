const fs = require('fs')
const path = require('path')
const glob = require('glob')
const LastFM = require('last-fm')
const dialog = require('electron').dialog
const ipc = require('electron').ipcMain
const logging = require('./logging.js')
const assets = require('./assets.js')
var ffmetadata

const lastfm = new LastFM('e01234609d70b34055b389734707ac0a')

var musics = {
  index: {
    list: {},
    error: [],
    missingData: []
  },

  received: {
    list: {},
    export: []
  },

  progress:{
    analyze: {
      value: 0,
      max: 1
    },
    download: {
      value: 0,
      max: 1
    }
  },

  services: {
    internet: "up",
    lastFm: "up"
  },

  ipcValue:{
    select: null,
    preview: null,
    index: null
  },

  coversTemp: path.join(assets.temp,"covers"),

  ini: () => {
    let ffmetadataPath = path.resolve(__dirname,"../node_modules/ffmetadata/index.js")
    log(`Initialisation: adresse ffmetadata: ${ffmetadataPath}`)
    fs.readFile(ffmetadataPath, 'utf-8', function(err, data){
      if (err) throw err;
      var newData = data.replace('ffmpeg = spawn.bind(null, process.env.FFMPEG_PATH || "ffmpeg"),', `ffmpeg = spawn.bind(null, "./resources/ffmpeg"),`);
      fs.writeFile(ffmetadataPath, newData, 'utf-8', function (err) {
        if (err) throw err;
        log("Ecriture ffmetadata complète.")
        ffmetadata = require('ffmetadata')
      })
    })
    assets.createFolder(musics.coversTemp)
    log("Fin de l'initialisation.")
  },

  analyze: {
    directory: (dir) => {
      musics.received.list[dir] = glob.sync(path.join(dir,'/**/@(*.mp3)'))
      log(`Analyse de ${dir}`)
      log(`Les musiques trouvées sont: ${musics.received.list[dir].join('\n')}`)

    },
    musics: (list) => {
      musics.progress.download.value = 0
      musics.progress.download.max = 0
      musics.progress.analyze.value = 0
      musics.progress.analyze.max = list.length
      log(`Analyse de ${list.length} musiques: ${list.join('\n')}`)
      musics.index.list = {}
      musics.index.error = []
      musics.index.missingData = []
      list.forEach((file)=>{
        ffmetadata.read(file, (err, data) => {
          if (err) {
            log(`Impossible de lire les données de ${file}: ${err}`, 2)
            musics.index.error.push(file)
            musics.progress.analyze.value++
          }
          else if(data.album===undefined||data.track===undefined||data.title===undefined||(data.album_artist===undefined&&data.artist===undefined)){
            log(`Manque de données pour ${file}`, 1)
            musics.index.missingData.push(file)
            musics.progress.analyze.value++
          }
          else {
            let currentArtist
            if(data.album_artist!==undefined){
              currentArtist = data.album_artist
            }
            else {
              currentArtist = data.artist
            }
            log(`Musique analysée: ${currentArtist}/ ${data.album}/ ${data.title} // ${file}`)
            if (!Object.keys(musics.index.list).includes(currentArtist)) {
              musics.index.list[currentArtist] = {}
              musics.index.list[currentArtist].albums = {}
              musics.request.artist.main(currentArtist)
            }
            if (!Object.keys(musics.index.list[currentArtist].albums).includes(data.album)) {
              musics.index.list[currentArtist].albums[data.album] = {}
              let coverPath = path.join(musics.coversTemp, currentArtist)
              assets.createFolder(coverPath)
              ffmetadata.read(file, {coverPath: [path.join(coverPath,`${data.album}.jpg`)]}, (err) => {
                if (err) {
                  log(`Pochette (${data.album}): ${err}`, 1)
                  musics.request.album.main(currentArtist, data.album)
                } 
                else log(`Pochette ajoutée: ${data.album}`)
              })
              
            }
            musics.index.list[currentArtist].albums[data.album][data.track] = {}
            musics.index.list[currentArtist].albums[data.album][data.track].title = data.title
            musics.index.list[currentArtist].albums[data.album][data.track].path = file
            musics.progress.analyze.value++
            log(`Avancée de l'analyse: ${musics.progress.analyze.value}/${list.length} : ${currentArtist}/ ${data.album}/ ${data.title} // ${file}`)
            musics.ipcValue.select.sender.send("select-progress-analyze", musics.progress.analyze.value, musics.progress.analyze.max)
            if(musics.progress.download.value === musics.progress.download.max && musics.progress.analyze.value === musics.progress.analyze.max){
              musics.done()
            }
          }
        })
      })
    }
  },

  request: {
    artist: {
      main: (artist) => {
        musics.progress.download.max++
        if (musics.services.internet === "up"){
          musics.request.artist.lastFm(artist)
        }
        else {
          musics.request.artist.default(artist)
        }
      },
      lastFm: (artist) => {
        lastfm.artistInfo({ name: artist }, (err, data) => {
          if (err) {
            log(`Lastfm: ${err}`, 2)
            if (musics.services.lastFm === "up"){
              musics.services.lastFm = "down"
              musics.ipcValue.index.sender.send("notification", "<span uk-icon=\'icon: warning\'></span> Serveur LastFm inaccessible.", "error")
              log("Erreur LastFm, requête par défaut.",3)
              musics.request.artist.default(artist)
            }
            else if (musics.services.lastFm === "down"){
              musics.request.artist.default(artist)
            }
          } 
          else {
            log(`Requête LastFm: ${artist}`)
            musics.index.list[artist].summary = data.summary
            musics.index.list[artist].similar = []
            for (similarArtist in data.similar){
              musics.index.list[artist].similar.push(data.similar[similarArtist].name)
            }
            musics.index.list[artist].tags = data.tags
            assets.download(data.images[data.images.length - 1], path.join(musics.coversTemp,`${artist}.jpg`), () =>{
              musics.progress.download.value++
              log(`Téléchargement ${musics.progress.download.value}/${musics.progress.download.max}`)
              musics.ipcValue.select.sender.send("select-progress-download", musics.progress.download.value, musics.progress.download.max)
              if(musics.progress.download.value === musics.progress.download.max && musics.progress.analyze.value === musics.progress.analyze.max){
                musics.done()
              }
            })
          }
        })
      },
      default: (artist) => {
        let rand = assets.getRandomInt(1, 3)
        log(`Requête par défaut: ${artist}`)
        musics.index.list[artist].summary = "Pas de biographie disponible."
        musics.index.list[artist].similar = ["Pas d'artistes similaires disponibles."]
        musics.index.list[artist].tags = ["Pas de genres disponibles."]
        assets.copy(path.resolve(__dirname,`../assets/images/default-artist${rand}.jpg`), path.join(musics.coversTemp,`${artist}.jpg`))
        musics.progress.download.value++
        log(`Téléchargement ${musics.progress.download.value}/${musics.progress.download.max}`)
        musics.ipcValue.select.sender.send("select-progress-download", musics.progress.download.value, musics.progress.download.max)
        if(musics.progress.download.value === musics.progress.download.max && musics.progress.analyze.value === musics.progress.analyze.max){
          musics.done()
        }
      }
    },
    album: {
      main: (artist, album) => {
        musics.progress.download.max++
        if (musics.services.internet === "up"){
          musics.request.album.lastFm(artist, album)
        }
        else {
          musics.request.album.default(artist, album)
        }
      },
      lastFm: (artist, album) => {
        lastfm.albumInfo({name: album, artistName: artist}, (err, data) => {
          if (err) {
            if (musics.services.lastFm === "up"){
              log(`Lastfm: ${err}`, 2)
              musics.services.lastFm = "down"
              musics.ipcValue.index.sender.send("notification", "<span uk-icon=\'icon: warning\'></span> Serveur LastFm inaccessible.", "error")
              log("Erreur LastFm, requête par défaut.",3)
              musics.request.album.default(artist, album)
            }
            else if (musics.services.lastFm === "down"){
              musics.request.album.default(artist, album)
            }
          }
          else {
            log(`Requête: ${album} / ${artist}`)
            assets.download(data.images[data.images.length - 1], path.join(musics.coversTemp,artist,`${album}.jpg`), () => {
              musics.progress.download.value++
              log(`Téléchargement ${musics.progress.download.value}/${musics.progress.download.max}`)
              musics.ipcValue.select.sender.send("select-progress-download", musics.progress.download.value, musics.progress.download.max)
              if(musics.progress.download.value === musics.progress.download.max && musics.progress.analyze.value === musics.progress.analyze.max){
                musics.done()
              }
            })
          }
        })
      },
      default: (artist, album) => {
        let rand = assets.getRandomInt(1, 5)
        log(`Requête par défaut: ${artist}/${album}`)
        assets.copy(path.resolve(__dirname,`../assets/images/default-album${rand}.jpg`), path.join(musics.coversTemp,artist,`${album}.jpg`))
        musics.progress.download.value++
        log(`Téléchargement ${musics.progress.download.value}/${musics.progress.download.max}`)
        musics.ipcValue.select.sender.send("select-progress-download", musics.progress.download.value, musics.progress.download.max)
        if(musics.progress.download.value === musics.progress.download.max && musics.progress.analyze.value === musics.progress.analyze.max){
          musics.done()
        }
      }
    }
  },

  done: () => {
    musics.ipcValue.select.sender.send("select-done")
    musics.ipcValue.preview.sender.send("preview-display", musics.index, assets.temp)
  },

  save: (dir) => {
    log(`Exportation des musiques.`)
    log(`Dossier de sortie: ${dir}`)

    for (var i=1; i<100; i++){
      let delFolders = glob.sync(path.join(dir, assets.digits(i) ,'/**'))
      delFolders.forEach((file)=>{
        if (fs.statSync(file).isDirectory()){
          log(`Tentative de suppression de: ${file}`,2)
        }
        else {
          fs.unlink(file, (err) => {
            if (err) log(`Tentative de suppression de: ${file} ${err}`,2)
          })
        }
      })
      fs.rmdir(path.join(dir, assets.digits(i)), (err) => {
        log(`Supression, pas de dossier: ${path.join(dir, assets.digits(i))}`)
      })
    }

    fs.unlink(path.join(dir,`index.txt`), (err) => {
      if (err) log(`Impossible de réinitialiser index.txt: ${err}`,2)
      var id = {
        artist: 0,
        album: 0,
        track: 0
      }
      var folder = {
        artist,
        track
      }
      var stream = fs.createWriteStream(path.join(dir,`index.txt`), {flags: 'a', autoClose: true})
      for (var artist in musics.index.list) {
        id.artist++
        id.track = 0
        id.album = 0
        folder.artist = assets.digits(id.artist)
        assets.createFolder(path.join(dir,folder.artist))
        stream.write(`${artist}\n`)
        stream.write(`\\${id.artist}\n`)
        for (var album in musics.index.list[artist].albums) {
          id.album++
          stream.write(`\t${album}\n`)
          for (var track in musics.index.list[artist].albums[album]) {
            id.track++
            folder.track = assets.digits100(id.track)
            assets.copy(musics.index.list[artist].albums[album][track].path, path.join(dir, folder.artist, `${folder.track}.mp3`))
            stream.write(`\t\t${musics.index.list[artist].albums[album][track].title}\n`)
            stream.write(`\t\t\\${folder.track}\n`)
            if (id.artist === Object.keys(musics.index.list).length && id.album === Object.keys(musics.index.list[artist].albums).length && id.track === Object.keys(musics.index.list[artist].albums[album]).length){
              stream.end('\4')//End of transmission
            }
          }
        }
      }
    })
  }
}

musics.ini()

ipc.on("select-upload", (event, dir) =>{
  if (fs.statSync(dir).isDirectory()){
    log(`Sélection du dossier: ${dir}`)
    musics.analyze.directory(dir)
    if (musics.received.list[dir].length !== 0){
      event.sender.send('select-callback', dir, musics.received.list[dir].length)
    }
    else {
      musics.ipcValue.index.sender.send("notification", "<span uk-icon=\'icon: warning\'></span> Aucune musique dans la sélection", "warning")
    }
  }
  else if (/\.mp3$/.test(dir)){
    log(`Sélection de la musique: ${dir}`)
    musics.received.list[dir] = dir
    event.sender.send("select-callback", dir, 1)
  }
  else{
    log("La sélection n'est pas valide.")
  }
})

ipc.on("select-file-dialog", (event, args) => {
  if (args === "directory"){
    dialog.showOpenDialog({
      properties: ['openDirectory']
    }, function (files) {
      if (files) {
        let dir = files[0]
        log(`Dialogue: Sélection de dossier: ${dir}`)
        musics.analyze.directory(dir)
        if (musics.received.list[dir].length !== 0){
          event.sender.send('select-callback', dir, musics.received.list[dir].length)
        }
        else {
          musics.ipcValue.index.sender.send("notification", "<span uk-icon=\'icon: warning\'></span> Aucune musique dans la sélection", "warning")
        }
      }
    })
  }
  else if (args === "file"){
    dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        {name: 'Musiques', extensions: ['mp3']}
      ]
    }, function (files) {
      if (files) {
        let dir = files[0]
        log(`Dialogue: Sélection d'une musique': ${dir}`)
        musics.received.list[dir] = dir
        event.sender.send('select-callback', dir, 1)
      }
    })
  }
})

ipc.on("select-remove", (event, id) => {
  log(`Retrait de ${id}`)
  delete musics.received.list[id]
})

ipc.on("select-analyze", (event) => {
  log("Début de l'analyse totale.")
  musics.received.export = []
  for (var currentDir in musics.received.list){
    musics.received.list[currentDir].forEach((file) => {
      musics.received.export.push(file)
    })
  }
  assets.checkInternet((internet) => {
    if (internet) {
      log("Connexion internet.")
      musics.analyze.musics(musics.received.export)
    } else {
      musics.services.internet = "down"
      musics.ipcValue.index.sender.send("notification", "<span uk-icon=\'icon: warning\'></span> Pas de connexion internet", "warning")
      musics.analyze.musics(musics.received.export)
      log("Pas de connexion internet.")
    }
  })
})

ipc.on("preview-save", (event) =>{
  assets.createFolder(path.resolve(__dirname,"../export"))
  dialog.showOpenDialog({
    title: 'Exporter les musiques',
    properties: ['openDirectory'],
    defaultPath: path.resolve(__dirname,"../export")
  }, function (files) {
    let dir = files[0]
    event.sender.send('preview-save', dir)
    log(`Requête d'export.`)
    musics.save(dir)
  })
})


ipc.on("ipc-preview", (event) => {
  musics.ipcValue.preview = event
})

ipc.on("ipc-index", (event) => {
  musics.ipcValue.index = event
})

ipc.on("ipc-select", (event) => {
  musics.ipcValue.select = event
})

function log (args, level) {
	logging.write(__filename, args, level)
}
