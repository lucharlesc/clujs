#!/usr/bin/env node

const fs = require("fs");
const cp = require("child_process");

var args = process.argv.slice(2);

if (args[0] == "init") {

    fs.mkdirSync("./app");
    fs.mkdirSync("./app/images");
    fs.mkdirSync("./app/views");
    fs.mkdirSync("./server");
    fs.mkdirSync("./server/routes");

    var cluJsText = 
`class CluView extends HTMLElement {
    connectedCallback() {
        if (!Object.getPrototypeOf(this).isStyled) {
            var styleElement = document.createElement("style");
            styleElement.innerHTML = this.styles;
            document.head.append(styleElement);
            Object.getPrototypeOf(this).isStyled = true;
        }
        for (var data in this.dataset) {
            if (this.dataset[data].slice(0, 9) == "@data-obj") {
                this.state[data] = JSON.parse(this.dataset[data].slice(10));
            } else if (this.dataset[data].slice(0, 9) == "@data-num") {
                this.state[data] = Number(this.dataset[data].slice(10));
            } else if (this.dataset[data].slice(0, 9) == "@data-boo") {
                if (this.dataset[data].slice(10) == "true") {
                    this.state[data] = true;
                } else if (this.dataset[data].slice(10) == "false") {
                    this.state[data] = false;
                }
            } else {
                this.state[data] = this.dataset[data];
            }
        }
        this.innerHTML = this.render();
    }
}
class Clu {
    encodeData(data) {
        if (typeof data == "object") {
            return "@data-obj:" + JSON.stringify(data);
        } else if (typeof data == "number") {
            return "@data-num:" + data.toString();
        } else if (typeof data == "boolean") {
            return "@data-boo:" + data.toString();
        } else {
            return data;
        }
    }
}
window.CluView = CluView;
window.clu = new Clu();`;
    fs.writeFileSync("./app/clu.js", cluJsText);

    var appHtmlText = 
`<!DOCTYPE html>
<html>
    <head>
        <title>Clu App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="app.css">
    </head>
    <body>
        <app-view></app-view>
        <script type="module" src="app.js"></script>
    </body>
</html>`;
    fs.writeFileSync("./app/app.html", appHtmlText);

    var appCssText = 
`body {
    margin: 0;
}`;
    fs.writeFileSync("./app/app.css", appCssText);

    var appJsText = 
`import "../clu.js";

// @beginViewImports
// @endViewImports`;
    fs.writeFileSync("./app/app.js", appJsText);

    cp.spawn("clu", ["nv", "app-view", `
        app-view {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: Helvetica, sans-serif;
            font-size: 32px;
            font-weight: bold;
            color: #0066FF;
            background-color: #F2F2F2;
        }`, "<p>Clu App</p>"]);

    var serverJsText = 
`require("clujs");

// @beginRouteRequires
// @endRouteRequires

// @beginRouteDeclarations
// @endRouteDeclarations

clu.serve(3000);`;
    fs.writeFileSync("./server/server.js", serverJsText);

    var child = cp.spawn("clu", ["nr", "root", "/"]);
    child.on("exit", (code) => {
        var rootRouteText = 
`async function root(req, res) {
    clu.serveFile("/app.html", res);
}
module.exports = root;`;
        fs.writeFileSync("./server/routes/root.js", rootRouteText);
    });

} else if (args[0] == "nv" && args[1]) {

    var viewName = args[1];
    var viewStyles = args[2];
    var viewHtml = args[3];
    var viewClass = "";

    for (var token of viewName.split("-")) {
        viewClass += token.charAt(0).toUpperCase() + token.slice(1);
    }

    var viewText = 
`export default class ${viewClass} extends CluView {
    styles = \`${viewStyles ? viewStyles : ""}\`;
    state = {};
    render() {
        return \`${viewHtml ? viewHtml : ""}\`;
    }
}
customElements.define("${viewName}", ${viewClass});`;
    fs.writeFileSync(`./app/views/${viewName}.js`, viewText);

    var viewImportText = 
`import ${viewClass} from "./views/${viewName}.js";
`;
    var appJsText = fs.readFileSync("./app/app.js", "utf-8");
    var endViewImportsIndex = appJsText.indexOf("// @endViewImports");
    appJsText = appJsText.slice(0, endViewImportsIndex) + viewImportText + appJsText.slice(endViewImportsIndex);
    fs.writeFileSync("./app/app.js", appJsText);

} else if (args[0] == "nr" && args[1]) {

    var routeName = args[1];
    var routePath = args[2];
    var routeFunc = "";

    var tokenIndex = 0;
    for (var token of routeName.split("-")) {
        routeFunc += (tokenIndex == 0 ? token : token.charAt(0).toUpperCase() + token.slice(1));
        tokenIndex++;
    }

    var routeText = 
`async function ${routeFunc}(req, res) {}
module.exports = ${routeFunc}`;
    fs.writeFileSync(`./server/routes/${routeName}.js`, routeText);

    var routeRequireText = 
`const ${routeFunc} = require("./routes/${routeName}.js");
`;
    var serverJsText = fs.readFileSync("./server/server.js", "utf-8");
    var endRouteRequiresIndex = serverJsText.indexOf("// @endRouteRequires");
    serverJsText = serverJsText.slice(0, endRouteRequiresIndex) + routeRequireText + serverJsText.slice(endRouteRequiresIndex);
    var routeDeclarationText = 
`clu.route("${routePath ? routePath : "/" + routeName}", ${routeFunc});
`;
    var endRouteDeclarationsIndex = serverJsText.indexOf("// @endRouteDeclarations");
    serverJsText = serverJsText.slice(0, endRouteDeclarationsIndex) + routeDeclarationText + serverJsText.slice(endRouteDeclarationsIndex);
    fs.writeFileSync("./server/server.js", serverJsText);
}