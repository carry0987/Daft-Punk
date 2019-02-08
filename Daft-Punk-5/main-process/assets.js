const fs = require('fs')
const path = require('path')
const os = require('os')
const https = require('https')
const electron = require('electron')
const ipc = require('electron').ipcMain
const logging = require('./logging.js')

var ipcImport

var assets = {

	temp: path.join(os.tmpdir(),`${electron.app.getName()}-${electron.app.getVersion()}`),

	checkInternet: (result) => {
		require('dns').lookup('google.com',function(err) {
			if (err && err.code == "ENOTFOUND") {
				console.log(err)
				log('Pas de connexion internet.',1)
				result(false);
			} else {
				log('Connexion internet.')
				result(true);
			}
		})
	},

	download: (url, dest, callback) => {
		var file = fs.createWriteStream(dest)
		log(`Téléchargement: ${url} vers ${dest}`)
		https.get(url, (response) => {
			response.pipe(file)
			file.on('finish', () => {
				file.close()
				log(`Fin du téléchargement de: ${url}}`)
				callback()
			})
		})
	},

	createFolder: (dir) => {
		try {
			fs.mkdirSync(dir)
			log(`Dossier créé: ${dir}`)
		} catch (err) {
			if (err.code === 'EEXIST') log(`Le dossier existe déja: ${dir}`, 1)
			else throw err
		}
	},

	copy: (source, destination) => {
		var file = fs.createWriteStream(destination)
		log(`Copie de ${source} vers ${destination}`)
		fs.createReadStream(source, {autoClose: true}).pipe(file)
		file.on('finish', () => {
			log(`Fin de la copie de ${source}`)
		})
	},
	
	getRandomInt: (min, max) => {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	},

	digits: (n) => {
		return (n < 10 ? '0' : '') + n
	},
	
	digits100: (n) => {
		return (n < 10 ? '00' : n < 100 ? '0' : '') + n
	}
}

log(`Dossier temporaire système: ${assets.temp}`, 3)
assets.createFolder(assets.temp)

ipc.on('ipc-import', (event) => {
	ipcImport = event
})

ipc.on("switch-section", (event, section) => {
	ipcImport.sender.send("switch-section", section)
})

function log (args, level) {
	logging.write(__filename, args, level)
}

module.exports = assets
