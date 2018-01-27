
// 基础路径
data.base = loaderDir

// 加载目录
data.dir = loader

// 加载的完整目录
data.loader = loaderPath

// 当前工作目录
data.cwd = cwd


// 被加载文件的编码
data.charset = 'utf-8'


seajs.config = function (configData) {
    for (var key in configData) {
        var curr = configData[key]  // 用户配置值
        var prev = data[key]    // 默认的值

        // 例如用在 alias 和 vars
        if (prev && isObject(prev)) {   // 之前的值是一个对象
            for (var k in curr) {
                prev[k] = curr[k]   // 将现在的每个值覆盖之前的值
            }
        } else {
            if (isArray(prev)) {    // map 情况
                curr = prev.concat(curr)
            }

            else if (key === 'base') {  // 确保 data.base 是一个绝对路径
                if (curr.slice(-1) !== '/') {
                    curr += '/'
                }

                curr = addBase(curr)
            }

            data[key] = curr
        }
    }

    emit('config', configData)
    return seajs
}