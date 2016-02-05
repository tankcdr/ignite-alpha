/* jshint esnext: true, node: true, asi: true, sub:true */
(function() {
  'use strict'
  const $ = window.$
  const project = require('../../js/project')
  const plugin = require('./plugin')
  const Client = require('cloudfoundry-client')
  const Training = require('./js/training')
  const remote = require('electron').remote
  const dialog = remote.dialog


  module.exports = function() {
    let self = this
    let training = null

    self.setArgs = (args) => {
      self.args = args
      project.getProjectByID(args.id, (err, proj) => {
        $('#projectName').text(proj.name)
        $('#bluemixID').text(proj.bluemix.uid)
        $('#bluemixEndPoint').text(proj.bluemix.apiEndpoint)
        $('#bluemixOrg').text(proj.org.name)
        $('#bluemixSpace').text(proj.space.name)
        $('#nlcServiceName').text(proj.service.nlc.name)
        $('#nlcServiceKeyName').text(proj.service.nlc.key.name)
        $('#nlcServicePlanName').text(proj.service.nlc.plan.name)

        training = new Training(args.id)
      })
    }
  }
})()
