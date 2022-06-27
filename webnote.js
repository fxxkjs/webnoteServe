const express = require('express');
// 路由
const router = require("./router")
// post Body
const bodyParser = require('body-parser');
// cookie
const cookieParser = require('cookie-parser')
// 跨域
const cors = require('cors')
// gzip
const compression = require('compression')

// 基于express创建服务器
const app = express();
app.use(compression())
app.use(cookieParser("key"))
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())
app.use(cors())
app.use(router)
app.use(express.static('../../Vue/webNote/dist'))
// app.use(express.static('./dist'))

// 启动，监听指定端口
app.listen(65535, function () {
    console.log('启动成功');
});