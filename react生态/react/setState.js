ReactComponent.prototype.setState = function (partialState, callback) {
    this.updater.enqueueSetState(this, partialState)
}