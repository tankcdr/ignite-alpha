/* jshint esnext: true, node: true, asi: true, sub:true */
//const $ = window.$// require('../../js/jquery-2.1.4.min.js')


(function() {
  'use strict'
  const project = require('../../js/project')
  const ipc = require('electron').ipcRenderer

  const listProjects = () => {
    project.getProjects((err,projects)=>{
      if(err) {
        console.log(err)
      } else {
        $('#projectList').empty()
        console.log(projects)
        projects.forEach((project)=>{
          let li = document.createElement('li')
          let a = document.createElement('a')
          li.appendChild(a)
          a.appendChild(document.createTextNode(project.name))
          a.href = '#'+project.config.projectView+"?id="+project._id
          $('#projectList').append(li)
        })
      }
    })
  }

  document.onreadystatechange = () => {
    if (document.readyState == 'complete') {
      const sauna = require('../../js/sauna')
      let ttool = sauna(document.getElementById('anchor'))

      $('a', 'ul.sidebar-nav').each(function(index) {
        let href = $(this).attr('href')
        $(this).click(function() {
          ttool.n.navigate(href)
        })
      })

      ttool.n.navigate('windows/main/mainView')
    }

    ipc.on('project-update',()=>{
      listProjects()
    })


    listProjects()
  }
})()
