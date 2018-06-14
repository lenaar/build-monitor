'use strict'
require('dotenv').config()
const server = require('kth-node-server')
const prefix = '/app/build-monitor'
const express = require('express')
const path = require('path')
const rp = require('request-promise')

/// const log = require('./server/log')
const PORT = process.env.PORT || 8080

/* ****************************
 * ******* SERVER START *******
 * ****************************
 */

server.start({
  useSsl: false,
  port: PORT
  /// logger: log
})
server.use(prefix + '/bootstrap', express.static(path.join(__dirname, '/node_modules/bootstrap/dist')))
server.use(prefix + '/kth-style', express.static(path.join(__dirname, '/node_modules/kth-style/dist')))

async function jenkinsApi (url) {
  try {
    const data = await rp({
      url,
      resolveWithFullResponse: false,
      method: 'GET',
      json: true
    })
    return data.jobs
  } catch (e) {
    console.log(`Smth went wrong while getting data from ${url.split('@')[1]}: `, e)
    return []
  }
}

async function getStatusFromJenkins (req, res) {
  const socialNames = [
    'social-develop',
    'social-master',
    'social-features'
  ]
  const jenkinsKTH = await jenkinsApi(`https://${process.env.JENKINS_USER}:${process.env.JENKINS_TOKEN}@jenkins.sys.kth.se/api/json`)
  const socialBuilds = jenkinsKTH.filter(j => socialNames.includes(j.name))

  const lmsNames = [
    'lms-export-results',
    'lms-sync-users',
    'lms-sync-courses',
    'lms-api'
  ]
  const buildKTH = await jenkinsApi(`https://${process.env.JENKINS_USER}:${process.env.BUILD_TOKEN}@build.sys.kth.se/api/json`)
  const lmsBuilds = buildKTH.filter(j => lmsNames.includes(j.name))

  const filteredJobs = [...socialBuilds, ...lmsBuilds]

  const statusLib = {
    blue: 'alert-success',
    red: 'alert-danger',
    yellow: 'alert-info',
    blue_anime: 'alert-primary',
    red_anime: 'alert-primary',
    yellow_anime: 'alert-primary'
  }

  const stringDiv = filteredJobs
    .map(build =>
      `<div
         aria-live="polite"
         role="alert"
         class="alert ${statusLib[build.color]}"
       >
         <p><b>${build.name}</b></p>
       </div>`)
    .join('')

  return res.send(`
            <link rel="stylesheet" href="/app/build-monitor/bootstrap/css/bootstrap.css">
            <link rel="stylesheet" href="/app/build-monitor/kth-style/css/kth-bootstrap.css">
            <h2>LIST BUILDS</h2>
            ${stringDiv}  
  `)
}

server.get(prefix + '/test', getStatusFromJenkins)
