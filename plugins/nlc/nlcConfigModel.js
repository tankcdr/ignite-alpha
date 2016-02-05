/* jshint esnext: true, node: true, asi: true, sub:true */
(function() {
  'use strict'
  const $ = require('../../js/jquery-2.1.4.min.js')
  const project = require('../../js/project')
  const plugin = require('./plugin')
  const Client = require('cloudfoundry-client')
  const remote = require('electron').remote
  const dialog = remote.dialog

  const createClient = (context) => {
    return new Client({
      protocol: 'https:',
      host: context.project.bluemix.apiEndpoint,
      email: context.project.bluemix.uid,
      password: context.project.bluemix.pwd
    })
  }

  const validateBluemixCredentials = (context, cb) => {
    populateOrganizations(context, (err, orgs) => {
      if (err) {
        cb(err, null);
      } else {
        cb(null, context)
      }
    })
  }

  const populateOrganizations = (context, cb) => {
    context.client.organizations
      .get((err, orgs) => {
        if (err) {
          cb(err, null)
        } else {
          cb(null, orgs)
        }
      })
  }

  const getSpaces = (context, cb) => {
    context.client.spaces
      .get({
        organization_guid: context.project.org.guid
      }, (err, spaces) => {
        if (err) {
          cb(err, null)
        } else {
          cb(null, spaces)
        }
      })
  }

  const getNLC = (context, cb) => {
    context.client.services
      .getByName('natural_language_classifier', (err, services) => {
        if (err) {
          cb(err, null)
        } else {
          cb(null, services)
        }
      })
  }

  const createNLC = (context, cb) => {
    context.client.serviceInstances
      .create({
        name: context.project.service.nlc.name,
        service_plan_guid: context.project.service.nlc.plan.guid,
        space_guid: context.project.space.guid
      }, (err, service) => {
        if (err) {
          cb(err, null)
        } else {
          cb(null, service)
        }
      })
  }

  const createKey = (context, cb) => {
    context.client.serviceKeys
      .create({
        name: context.project.service.nlc.key.name,
        service_instance_guid: context.project.service.nlc.guid
      }, (err, key) => {
        if (err) {
          cb(err, null)
        } else {
          cb(null, key)
        }
      })
  }

  const getKey = (context, cb) => {
    context.client.serviceKeys
      .get({
        service_instance_guid: context.project.service.nlc.guid
      }, (err, key) => {
        if (err) {
          cb(err, null)
        } else {
          cb(null, key)
        }
      })
  }

  module.exports = function() {
    let self = this
    self.context = {}
    self.context.project = {}
    self.context.project.bluemix = {}


    self.validateCredentials = () => {
      self.context.project.bluemix['uid'] = $("#bmemail").val()
      self.context.project.bluemix['pwd'] = $("#bmpwd").val()
      self.context.project.bluemix['apiEndpoint'] = $("#apiEndpoint").val()

      self.context['client'] = createClient(self.context)

      validateBluemixCredentials(self.context, (err, vars) => {
        if (err) {
          dialog.showErrorBox("Bluemix Validation", err.message.description)
        } else {
          self.advanceToTarget()
          populateOrganizations(self.context, (err, orgs) => {
            if (err) {
              dialog.showErrorBox("Organization Loading Error", err.message.description)
            } else {
              $('#bmOrg').empty()
              $('#bmOrg').append($('<option />').text('Select Organization').prop('selected', true))
              orgs.forEach((org) => {
                $('#bmOrg').append($('<option />').val(org.metadata.guid).text(org.entity.name))
              })
            }
          })
        }
      })
    }

    self.validateOrg = () => {
      self.context.project.org = {}
      self.context.project.org['guid'] = $('#bmOrg').find(":selected").val()
      self.context.project.org['name'] = $('#bmOrg').find(":selected").text()

      getSpaces(self.context, (err, spaces) => {
        if (err) {
          dialog.showErrorBox("Space Loading Error", err.message.description)
        } else {
          $('#bmSpace').empty()
          $('#bmSpace').append($('<option />').text('Select Spaces').prop('selected', true))
          spaces.forEach((space) => {
            $('#bmSpace').append($('<option />').val(space.metadata.guid).text(space.entity.name))
          })
        }
      })
    }

    self.validateSpace = () => {
      self.context.project.space = {}
      self.context.project.space['guid'] = $('#bmSpace').find(":selected").val()
      self.context.project.space['name'] = $('#bmSpace').find(":selected").text()

      self.advanceToNLC()

      getNLC(self.context, (err, service) => {
        if (err) {
          dialog.showErrorBox("Service Loading Error", err.message.description)
        } else {
          self.context.nlc = {}
          self.context.nlc['guid'] = service.metadata.guid
          service.servicePlans.get((err, plans) => {
            $('#plans').empty()
            $('#plans').append($('<option />').text('Select Plan').val(false).prop('selected', true))
            plans.forEach((plan) => {
              $('#plans').append($('<option />').val(plan.metadata.guid).text(plan.entity.name))
            })
          })
        }
      })
    }

    self.createNLCService = () => {
      self.context.project.service = {}
      self.context.project.service.nlc = {}
      self.context.project.service.nlc['name'] = $('#nlcName').val()

      self.context.project.service.nlc.plan = {}
      self.context.project.service.nlc.plan['name'] = $('#plans option:selected').text()
      self.context.project.service.nlc.plan['guid'] = $('#plans option:selected').val()

      if (self.context.project.service.nlc.name === '') {
        dialog.showErrorBox("Create Service Validation", "Service Name is not set")
        return
      }
      if (self.context.project.service.nlc.plan.guid === false) {
        dialog.showErrorBox("Create Service Validation", "Select a service plan")
        return
      }

      createNLC(self.context, (err, service) => {
        if (err) {
          dialog.showErrorBox("Create Service Validation", err.message.description)
        } else {
          self.context.project.service.nlc['guid'] = service.metadata.guid

          self.context.project.service.nlc.key = {}
          self.context.project.service.nlc.key['name'] = self.context.project.service.nlc.name + '.IgniteKey'

          createKey(self.context, (err, key) => {
            if (err) {
              dialog.showErrorBox("Create Service Validation", err.message.description)
            } else {
              self.context.project.service.nlc.key['guid'] = key.metadata.guid
              self.context.project.service.nlc.key['username'] = key.entity.credentials.username
              self.context.project.service.nlc.key['password'] = key.entity.credentials.password
              self.advanceToProject()
            }
          })
        }
      })
    }

    self.validateProject = () => {
      self.context.project['name'] = $('#projectName').val()
      self.context.project.config = plugin

      if (!self.validateText(self.context.project.name, "Please enter a valid project name") ||
        !self.validateText(self.context.project.bluemix.uid, "Please validate your Bluemix Credentials") ||
        !self.validateText(self.context.project.bluemix.pwd, "Please validate your Bluemix Credentials") ||
        !self.validateText(self.context.project.bluemix.apiEndpoint, "Please validate your Bluemix Credentials") ||
        !self.validateText(self.context.project.service.nlc.key.username, "Please create an NLC instance") ||
        !self.validateText(self.context.project.service.nlc.key.password, "Please create an NLC instance") ||
        !self.validateText(self.context.project.service.nlc.guid, "Please create an NLC instance")
      ) {
        return
      }

      project.createProject(self.context.project,['data','train','history'],(err,newProject) =>{
        if(err) {
          console.error(err)
          dialog.showErrorBox("Error Creating Project", err)
        }
      })
    }

    self.validateText=(src, message)=>{
      if (src === null || src === '') {
        dialog.showErrorBox("Project Validation", message)
        return false
      }
      return true
    }

    self.advanceToTarget = () => {
      $('#bluemixConfigurationTab').removeClass('in')
      $('#targetConfigurationTab').addClass('in')
    }

    self.advanceToNLC = () => {
      $('#targetConfigurationTab').removeClass('in')
      $('#nlcConfigurationTab').addClass('in')
    }

    self.advanceToProject = () => {
      $('#nlcConfigurationTab').removeClass('in')
      $('#projectConfigurationTab').addClass('in')
    }
  }
})()
