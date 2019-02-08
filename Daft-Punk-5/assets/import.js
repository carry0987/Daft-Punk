const path = require('path')
const ipc = require('electron').ipcRenderer

const links = document.querySelectorAll('link[rel="import"]')


Array.prototype.forEach.call(links, (link) => {
  var sectionName = path.basename(link.href, '.html')
  log(`Importation de la section ${sectionName}`)
  try{
  let template = link.import.querySelector('section')
  let clone = document.importNode(template, true)
  clone.id = sectionName
  document.querySelector('#content').appendChild(clone)
  } catch (err) {log(`Impossible d'importer ${sectionName}.html: ${err}`,2)}
  try{
    require(`../renderer-process/${sectionName}`)
  } catch (err) {log(`Impossible d'importer ${sectionName}.js: ${err}`,2)}
})

function showContent(sectionName){
  log(`Affichage de la section ${sectionName}`)
  const embeded = document.querySelector('main section')
  try{
    document.getElementById("content").appendChild(embeded)
  }
  catch (err) {log(`Echec de récupération du contenu de la page: ${err}`,1)}
  try{
  const main = document.querySelector('main')
  const section = document.getElementById(sectionName)
  main.appendChild(section)
  } catch (err) {log(`Impossible d'afficher' ${sectionName}.html: ${err}`,2)}
}

document.addEventListener('click', (event) => {
  if (event.target.dataset.section) {
    showContent(event.target.dataset.section)
  }
})

ipc.send("ipc-import")

ipc.on("switch-section", (event, section) => {
  showContent(section)
})

function log (args, level){
  ipc.send('log', __filename, args, level)
}
