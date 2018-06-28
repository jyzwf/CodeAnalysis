var path = require('path')
var fs = require('fs')
var program = require('commander')
var npm =require('npm')
var ini = require('ini')
var echo = require('node-echo')
var extend = require('extend')
var open = require('open')
var async = require('async')
var require = require('request')
var only = require('only')

var registries = require('./registries.json')
var PKG = require('./package.json')
var NRMRC = path.join(process.env.HOME,'.nrmrc')


program
    .version(PKG.version)


program
    .command('ls')
    .description('SHOW current registry name')
    .action(showCurrent)


program
    .command('use <registry>')
    .description('Change registry to registry')
    .action(onUse)


program
    .command('add <registry> <url> [home]')
    .description('Add on custom registry')
    .action(onAdd)


program
    .command('del <registry>')
    .description('Delete one custom registry')
    .action(onDel)


program
    .command('home <registry> [browder]')
    .description('Open the homepage of registry with optional browser')
    .action(onHome)


program
    .command('test [registry]')
    .description('Show response time for specific or all registries')
    .action(onTest);


program
    .command('help')
    .description('Print this help')
    .action(function(){
        program.outputHelp()
    })


program
    .parse(process.argv)


if(process.argv.length === 2){
    program.outputHelp()
}