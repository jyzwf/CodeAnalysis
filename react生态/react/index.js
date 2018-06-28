var _createClass = function () {
    function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
             var descriptor = props[i]; 
             descriptor.enumerable = descriptor.enumerable || false; 
             descriptor.configurable = true; 
             if ("value" in descriptor) descriptor.writable = true; 
             Object.defineProperty(target, descriptor.key, descriptor); 
        }
    } 
    
    return function (Constructor, protoProps, staticProps) { 
        if (protoProps) defineProperties(Constructor.prototype, protoProps); 
        if (staticProps) defineProperties(Constructor, staticProps); 
        return Constructor; 
    };
}();


function _SADInitAfterInjectStateAndAction(target){
    let componentDidMount = target.prototype.componentDidMount || noop,
        render = target.prototype.render || noop

    target.prototype.componentDidMount = function(){
        const componentDidMountWithThis = componentDidMount.bind(this)
        this.initStateAndAction.then(()=>componentDidMountWithThis())
    }

    target.prototype.render = function(){
        if (!this.stateAlready) {
            return null;
        }
        return render.bind(this)()
    }

    return target
}