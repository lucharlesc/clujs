const http = require("http");
const fs = require("fs/promises");

class Server {
    routes = {
        base: new Route
    };
    route(routePath, routeClass) {
        this.routes[routePath] = new routeClass;
    }
    serve(port) {
        var server = http.createServer(async (req, res) => {
            try {
                if (req.url in this.routes) {
                    await this.routes[req.url].connectedCallback(req, res);
                } else if (req.url.includes(".")) {
                    await this.routes.base.serveFile(req.url, res);
                } else {
                    await this.routes["/*"].connectedCallback(req, res);
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (!res.writableEnded) {
                    this.routes.base.notFound(res);
                }
            }
        });
        server.listen(port, () => {
            console.log("server running");
        });
    }
}
class Route {
    async serveFile(url, res) {
        res.statusCode = 200;
        var re = /(?:\.([^.]+))?$/;
        var fileExt = re.exec(url)[1];
        var fileExtToType = {
            html: "text/html",
            css: "text/css",
            js: "application/javascript",
            png: "image/png"
        };
        var fileExtToEncoding = {
            html: "utf-8",
            css: "utf-8",
            js: "utf-8",
            png: "base64"
        }
        if (fileExt) {
            res.setHeader("Content-Type", fileExtToType[fileExt]);
            var fileText = await fs.readFile("./app" + url, fileExtToEncoding[fileExt]);
            res.end(fileText, fileExtToEncoding[fileExt]);
        }
    }
    async receiveData(req) {
        var buffers = [];
        for await (var chunk of req) {
            buffers.push(chunk);
        }
        return JSON.parse(Buffer.concat(buffers).toString());
    }
    sendData(res, data) {
        res.end(JSON.stringify(data));
    }
    notFound(res) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/html");
        res.end("404");
    }
    async connectedCallback(req, res) {
        await this.respond(req, res);
    }
}
exports.Server = Server;
exports.Route = Route;