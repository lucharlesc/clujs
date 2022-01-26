const http = require("http");
const fs = require("fs");

class Clu {
    routes = {};
    route(route, handler) {
        this.routes[route] = handler;
    }
    async serveFile(req, res) {
        res.statusCode = 200;
        var re = /(?:\.([^.]+))?$/;
        var fileExt = re.exec(req.url)[1];
        var fileExtToType = {
            "html": "html",
            "js": "javascript"
        };
        if (fileExt) {
            res.setHeader("Content-Type", "text/" + fileExtToType[fileExt]);
            var fileText = fs.readFileSync("./app" + req.url, "utf-8");
            res.end(fileText);
        }
    }
    async notFound(req, res) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/html");
        res.end("404");
    }
    start(port) {
        var server = http.createServer(async (req, res) => {
            try {
                if (req.url in this.routes) {
                    await this.routes[req.url](req, res);
                } else {
                    await this.serveFile(req, res);
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (!res.writableEnded) {
                    this.notFound(req, res);
                }
            }
        });
        server.listen(port, () => {
            console.log("server running");
        });
    }
}
module.exports = Clu;