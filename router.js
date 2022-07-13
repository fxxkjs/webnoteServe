// 创建路由对象
const express = require('express')
const res = require('express/lib/response')
const router = express.Router()
const fs = require("fs")
const mdPath = "./md"
const tmpMdPath = "./md_tmp"
const reg = /^\d{6,12}$/
const navReg = /^[a-z0-9A-Z\u4e00-\u9fa5._/-]{2,16}$/
const multer = require('multer')
// Tools
function getIp(req) {
    var ipAddress;
    var forwardedIpsStr = req.header('x-forwarded-for');
    if (forwardedIpsStr) {
        var forwardedIps = forwardedIpsStr.split(',');
        return forwardedIps[0];
    }
    if (!ipAddress) {
        return req.connection.remoteAddress;
    }
}

// 获取顶部目录
router.get('/topNav', (req, res) => {
    let path
    if (req.signedCookies.webnote === undefined) {
        path = mdPath
    } else {
        path = `${tmpMdPath}/${req.signedCookies.webnote}`
    }

    fs.readdir(path, function (err, files) {
        res.send(files)
    })

})

// 获取导航栏目录
router.get('/leftNav', (req, res) => {
    let tmpArr = []
    let tmpObj = {}
    let path
    if (req.signedCookies.webnote === undefined) {
        path = mdPath
    } else {
        path = `${tmpMdPath}/${req.signedCookies.webnote}`
    }
    function getLeftNav(path) {
        fs.readdir(path, function (err, data) {
            if (err) {
                res.send([])
            } else {
                for (const ite of data) {
                    tmpObj.title = ite
                    tmpObj.value = fs.readdirSync(path + "/" + ite).map(function (value) {
                        return value.substring(0, value.lastIndexOf('.'))
                    })
                    tmpArr.push(tmpObj)
                    tmpObj = {}
                }

                res.send(tmpArr)
            }
        })
    }

    getLeftNav(`${path}/${req.query.topnav}`);
})

// 参数路由获取文档内容
router.get('/cont/:topnav/:leftnav/:title', function (req, res) {
    let path
    if (req.signedCookies.webnote === undefined) {
        path = mdPath
    } else {
        path = `${tmpMdPath}/${req.signedCookies.webnote}`
    }

    let paths = path + "/" + req.params.topnav + "/" + req.params.leftnav + "/" + req.params.title + ".md"

    fs.readFile(paths, 'utf-8', function (err, data) {
        if (err) {
            res.send(`> ERROR: 意料之外的错误
            可能会解决问题的方法：
            1.清除cookie
            2.重启浏览器
            3.重启电脑
            4.重装系统
            5.重购电脑
            6.VX：webnote_fun`)
        }
        else {
            res.send(data)
        }
    });

    // 记录访问者IP地址
    function getClientIp(req) {
        let data = `${new Date().toLocaleString()}  ${getIp(req)}  ${paths} \n`
        fs.writeFile(`./log/${req.signedCookies.webnote === undefined ? 'log' : req.signedCookies.webnote}.txt`, data, { flag: "a" }, function (err) {
            if (err) {
                console.log(err);
                return
            }
        })

    }
    getClientIp(req)


})

// 注册
router.post('/register', function (req, res) {
    // 验证格式
    if (!reg.test(req.body.username) || !reg.test(req.body.password)) {
        res.send({
            code: 0,
            msg: "请检查格式"
        })
        return
    }
    // 为用户创建个人目录
    fs.mkdir(`${tmpMdPath}/${req.body.username}`, (err) => {
        if (err) {
            // 判断账号是否注册
            res.send({
                code: 0,
                msg: "此账号已注册。"
            })
        } else {
            // 创建基础文件
            fs.cp(mdPath, tmpMdPath + `/${req.body.username}`, { recursive: true }, function (err) {
                if (err) {
                    res.send({
                        code: 0,
                        msg: "非法操作"
                    })
                    return
                }
            })
            // 设置cookie
            res.cookie("webnote", `${req.body.username}`, {
                maxAge: 3600000 * 24,//过期时间，单位毫秒
                httpOnly: true,  //只能服务器改变cookie
                signed: true,  //使用签名模式
                domain: 'webnote.fun',  //域名
                path: '/' //路径
            });
            // userinfo.req.body.username=req.body.password

            fs.writeFile('./log/userip.txt', `注册时间： ${new Date().toLocaleString()}; username: ${req.body.username}; password: ${req.body.password}; ip: ${getIp(req)},\n`, { flag: "a" }, function (err) {
                if (err) {
                    console.log(err);
                    return
                }
            })
            res.send({
                code: 1,
                msg: "注册成功，返回主页即可进行编辑和上传个人内容。"
            })
        }
    });


})

// cookieType
router.post('/cookieType', function (req, res) {

    if (req.signedCookies.webnote === undefined) {
        res.send({
            code: 0,
            msg: "未注册"
        })
    } else {
        if (fs.statSync(`${tmpMdPath}/${req.signedCookies.webnote}`, { throwIfNoEntry: false }) === undefined) {
            res.send({
                code: 0,
                msg: "非法操作"
            })
        } else {
            res.send({
                code: 1,
                msg: "注册用户"

            })
        }

    }


})

// addFolder
router.post('/addFolder', function (req, res) {
    if (req.signedCookies.webnote === undefined || fs.statSync(`${tmpMdPath}/${req.signedCookies.webnote}`, { throwIfNoEntry: false }) === undefined) {
        res.send({
            code: 0,
            msg: "非法操作"
        })
    } else {
        if (!navReg.test(req.body.topNav) || !navReg.test(req.body.leftNav)) {
            res.send({
                code: 0,
                msg: "请检查格式"
            })
            return
        }

        let path
        if (req.body.leftNav === null) {
            path = `${tmpMdPath}/${req.signedCookies.webnote}/${req.body.topNav}`
        } else {
            path = `${tmpMdPath}/${req.signedCookies.webnote}/${req.body.topNav}/${req.body.leftNav}`
        }

        fs.mkdir(path, function (err) {
            if (err) {
                res.send({
                    code: 0,
                    msg: "该分类已存在。"
                })
                return
            } else {
                res.send({
                    code: 1,
                    msg: "添加成功"

                })
            }
        })

    }


})

// delFolder
router.post('/delFolder', function (req, res) {
    if (req.signedCookies.webnote === undefined || fs.statSync(`${tmpMdPath}/${req.signedCookies.webnote}`, { throwIfNoEntry: false }) === undefined) {
        res.send({
            code: 0,
            msg: "非法操作"
        })
    } else {
        let path
        if (req.body.leftNav === null && req.body.items === null) {

            if (fs.statSync(`${tmpMdPath}/${req.signedCookies.webnote}/${req.body.topNav}`, { throwIfNoEntry: false }) === undefined) {
                res.send({
                    code: 0,
                    msg: "非法操作"
                })
            } else {
                path = `${tmpMdPath}/${req.signedCookies.webnote}/${req.body.topNav}`
            }

        } else if (!(req.body.leftNav === null) && req.body.items === null) {

            if (fs.statSync(`${tmpMdPath}/${req.signedCookies.webnote}/${req.body.topNav}/${req.body.leftNav}`, { throwIfNoEntry: false }) === undefined) {
                res.send({
                    code: 0,
                    msg: "非法操作"
                })
            } else {
                path = `${tmpMdPath}/${req.signedCookies.webnote}/${req.body.topNav}/${req.body.leftNav}`
            }

        } else {
            if (fs.statSync(`${tmpMdPath}/${req.signedCookies.webnote}/${req.body.topNav}/${req.body.leftNav}/${req.body.items}.md`, { throwIfNoEntry: false }) === undefined) {
                res.send({
                    code: 0,
                    msg: "非法操作"
                })
            } else {
                path = `${tmpMdPath}/${req.signedCookies.webnote}/${req.body.topNav}/${req.body.leftNav}/${req.body.items}.md`
            }
        }

        fs.rm(path, { recursive: true }, function (err) {
            if (err) {
                res.send({
                    code: 0,
                    msg: "意料之外的错误，请刷新页面重试。"
                })
            } else {
                res.send({
                    code: 1,
                    msg: "删除成功"
                })
            }
        })


    }


})

// upMd
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let webnote = req.signedCookies.webnote
        let { topNavType, leftNavType } = req.body
        if (webnote !== "undefined" && topNavType !== "undefined" && leftNavType !== "undefined") {
            let path = `${tmpMdPath}/${webnote}/${topNavType}/${leftNavType}`
            cb(null, path)
        } else {
            cb(new Error("storage：请求参数不完整"))
        }
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
})
const fileFilter = function (req, file, cb) {
    if (navReg.test(file.originalname.slice(0, -3)) || file.originalname.slice(-3) === ".md") {
        cb(null, true)
    } else {
        cb(null, false)
        cb(new Error(`err:${file.originalname}不是md文件`))
    }
}
const limits = { fileSize: 100 * 1024 }

const upload = multer({ storage, fileFilter, limits }).array('file')

router.post("/upMd", function (req, res) {

    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            console.log("muerr");
            res.statusCode = 412
            res.send({
                code: 0,
                msg: "请求信息不符合要求或不完整！"

            });
            return
        } else if (err) {
            console.log("err");
            res.statusCode = 412
            res.send({
                code: 0,
                msg: "请求信息不完整或不符合要求！"
            });
            return
        }

        res.send({
            code: 1,
            msg: "上传成功！"
        })
    })


})














// 获取post请求传来的数据
// router.post('/postText', function (req, res) {

//     console.log("POST收到数据")
//     console.log(req.body.name);

//     fs.writeFile('文件.txt', req.body.name,'utf-8', (err) => {
//         if (err) throw err;
//         console.log('文件已被保存');
//     });

//     // res.header("Access-Control-Allow-Origin", "*")
//     res.header("Access-Control-Allow-Origin", "*")

//     res.send("POST请求成功")
// });

// router.post('/upPost', function (req, res) {
//     console.log("UPpost收到数据")
//     console.log(req.body);
//     res.send(req.body)
// });

// router.put('/upPost', function (req, res) {
//     console.log("UPpost收到数据")
//     console.log(req.body);
//     res.send(req.body)
// });








// 参数路由，使用req.params获取参数
// router.get('/yyy/:id', function (req, res) {
//     console.log(req.params);
// })

// 导出路由对象
module.exports = router