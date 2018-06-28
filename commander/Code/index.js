var EventEmitter = require('events')
var spawn = require('child_process')
var path = require('path')
var dirname = path.dirname
var basename = path.basename
var fs = require('fs')

// 继承EventEmitter原型
require('util').inherits(Command, EventEmitter)


exports = module.exports = new Command()


exports.Command = Command

exports.Option = Option



function Option(flags, description) {
    this.flags = flags
    this.required = flags.indexOf('<') >= 0
    this.optional = flags.indexOf('[') >= 0
    this.bool = flags.indexOf('-no-') === -1
    flags = flags.split(/[ ,|]+/)
    if (flags.length > 1 && !/^[[<]]/.test(flags[1])) this.short = flags.shift()
    this.long = flags.shift()
    this.description = description || ''
}



Option.prototype.name = function () {
    return this.long
        .replace('--', '')
        .replace('no-', '')
}

Option.prototype.attributeName = function () {
    return camelcase(this.name())
}


Option.prototype.is = function (arg) {
    return this.short === arg || this.long === arg
}



function Command(name) {
    this.commands = []
    this.options = []
    this._execs = {}
    this._allowUnknownOption = false
    this._args = []
    this._name = name || ''
}


