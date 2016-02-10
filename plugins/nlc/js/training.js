/* jshint esnext: true, node: true, asi: true, sub:true */
(function() {
  'use strict'
  const fs = require('fs')
  const path = require('path')
  const remote = require('electron').remote
  const dialog = remote.dialog
  const parse = require('csv-parse')
  const stringify = require('csv-stringify');
  const $ = window.$
  const project = require('../../../js/project')
  const WORKSPACE = 0
  const WORKSPACE_STRING = 'Workspace'

  const addTableRow = (tableID, text, labels) => {
    let table = document.getElementById(tableID)
    let tr = table.insertRow(-1)
    tr.insertCell().innerHTML = tr.rowIndex
    tr.insertCell().innerHTML = text
    tr.insertCell().innerHTML = labels
  }

  const loadVersionIntoTable = (projectID, dbID, version) => {
    project.fetchFromProjectDB(projectID, dbID, {
      version: version
    }, (err, record) => {
      if (record.length > 0) {
        $('#empty-row').remove()

        for (let i = 0; i < record[0].data.length; i++) {
          addTableRow("trainingTable",
            record[0].data[i].text,
            record[0].data[i].labels)
        }
        displayCurrentState(version, 'Yes')
      }
    })
  }

  const displayCurrentState = (version, state) => {
    let vstring = (version===WORKSPACE) ? WORKSPACE_STRING : version
    $('#workspaceSavedIndicator').text(state)
    $('#versionLoadedIndicator').text(vstring)
  }


  module.exports = function(projectID) {
    let self = this
    self.projectID = projectID

    $('#trainingModal').on('shown.bs.modal', () => {
      $('#textToClassify').focus()
    })

    $('#trainingModal').on('hide.bs.modal', () => {
      $('#textToClassify').val('')
      $('#trainingLabels').val('')
    })

    $('#loadVersionModal').on('show.bs.modal', () => {
      //load the available versions
      project.selectAndSortFromProjectDB(self.projectID, "training", {
        version: -1
      }, (err, records) => {
        records.forEach((entry) => {
          if(entry.version != WORKSPACE) {
            $('#versionList').append($("<option></option>")
                             .attr("value",entry._id)
                             .text(entry.version));

            $('#versionList').focus()
          }
        })
      })
    })

    $('#loadVersionModal').on('hide.bs.modal', () => {
      //empty list when modal is closed
      $('#versionList').empty()
    })

    /*************************************************************
     * Load version into table
     *************************************************************/
    $('#selectVersionButton').click(() => {
      $('#trainingTable').find('tr:gt(0)').remove()
      loadVersionIntoTable(self.projectID, "training", parseInt($('#versionList option:selected').text()))
      $('#versionList').empty()
      $('#loadVersionModal').modal('toggle')
    })

    /*************************************************************
     * Add row to the workspace
     *************************************************************/
    $('#trainingSubmitButton').click(() => {
      let trainingForm = $('#trainingForm')
      trainingForm.validate({
        rules: {
          textToClassify: {
            required: true,
            minlength: 1,
            maxlength: 1024
          },
          trainingLabels: "required"
        },
        highlight: function(element) {
          $(element).closest('.form-group').addClass('has-error');
        },
        unhighlight: function(element) {
          $(element).closest('.form-group').removeClass('has-error');
        }
      })
      if (trainingForm.valid()) {
        $('#empty-row').remove()

        addTableRow("trainingTable",
          $('#textToClassify').val(),
          $('#trainingLabels').val())

        $('#trainingModal').modal('toggle')
      }
      displayCurrentState(WORKPLACE, 'No')
    })

    /*************************************************************
     * Import a CSV into the workspace
     *************************************************************/
    $('#importCSVButton').click(() => {
      dialog.showOpenDialog({
        filters: [{
          name: 'CSV',
          extensions: ['csv']
        }]
      }, (files) => {
        if (files) {
          files.forEach((file) => {
            let parser = parse(function(err, data) {
              if (err) {
                dialog.showErrorBox("Error", err.message)
              } else {
                $('#empty-row').remove()
                data.forEach((entry) => {
                  addTableRow("trainingTable", entry[0], entry[1])
                })
              }
            })
            fs.createReadStream(file).pipe(parser);
            displayCurrentState(WORKSPACE,'No')
          })
        }
      })
    })

    /*************************************************************
     * Export workspace to CSV
     *************************************************************/
    $('#exportCSVButton').click(() => {
        dialog.showSaveDialog((location) => {
          let target = fs.createWriteStream(location)
          let stringifier = stringify({
            delimiter: ',',
            quotedString: true
          })

          stringifier.on('readable', function() {
            let row = null
            while (row = stringifier.read()) {
              target.write(row)
            }

          })

          stringifier.on('error', function(err) {
            console.log(err.message);
          })
          stringifier.on('finish', function() {
            target.end()
          })

          let rows = document.getElementById("trainingTable").rows
          for (let index = 1; index < rows.length; index++) {
            let row = rows[index]
            stringifier.write([row.cells[1].innerText, row.cells[2].innerText])
          }
          stringifier.end()
        })
      })
      /*************************************************************
       * Save the workspace
       *************************************************************/
    $('#saveButton').click(() => {
      project.fetchFromProjectDB(self.projectID, "training", {
        version: WORKSPACE
      }, (err, records) => {
        let record = null
        if (!records || records.length <= 0) {
          record = {
            version: WORKSPACE,
            data: []
          }
        } else {
          record = records[0]
          record.data.length = 0
        }

        let rows = document.getElementById("trainingTable").rows
        for (let index = 1; index < rows.length; index++) {
          let row = rows[index]
          record.data.push({
            text: row.cells[1].innerText,
            labels: row.cells[2].innerText
          })
        }

        let filter = {
          version: WORKSPACE
        }
        if (record._id) {
          filter = {
            _id: record._id
          }
        }

        project.updateProjectDB(self.projectID, "training", filter, record, (err, update) => {
          if (err) {
            dialog.showErrorBox("Error Saving Workspace", err.message)
          } else {
            displayCurrentState(WORKPLACE,'Yes')
          }
        })
      })
    })

    /*************************************************************
     * Version button
     *************************************************************/
    $('#versionButton').click(() => {
      project.selectAndSortFromProjectDB(self.projectID, "training", {
        version: -1
      }, (err, records) => {

        let record = records[0]
        ++record.version

        record.data.length = 0;
        delete record._id

        let rows = document.getElementById("trainingTable").rows
        for (let index = 1; index < rows.length; index++) {
          let row = rows[index]
          record.data.push({
            text: row.cells[1].innerText,
            labels: row.cells[2].innerText
          })
        }

        project.insertProjectDB(self.projectID, "training", record, (err, update) => {
          if (err) {
            dialog.showErrorBox("Error Saving Workspace", err.message)
          } else {
            displayCurrentState(record.version, 'Yes')
          }
        })
      })
    })

    /*************************************************************
     * Load the workspace into the training table
     *************************************************************/
     project.ensureIndex(self.projectID, "training", {
       fieldName: 'version',
       unique:true
     })
    loadVersionIntoTable(self.projectID, "training", WORKSPACE)
  }
})()
