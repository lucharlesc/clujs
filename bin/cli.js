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

    var appHtmlText = 
`<!DOCTYPE html>
<html>
    <head>
    </head>
    <body>
        <script type="module" src="app.js"></script>
    </body>
</html>`;
    fs.writeFileSync("./app/app.html", appHtmlText);

    var appJsText = 
`// @beginViewImports
// @endViewImports

// @beginViewDefines
// @endViewDefines

var style = document.createElement("style");
style.innerHTML = 
\`\`;
document.head.append(style);`;
    fs.writeFileSync("./app/app.js", appJsText);

    cp.spawn("clu", ["nv", "app-view"]);
    var prependAppViewText = 
`

document.body.prepend(new AppView());`;
    fs.appendFileSync("./app/app.js", prependAppViewText);

    var serverJsText = 
`const Clu = require("clujs");

// @beginRouteRequires
// @endRouteRequires

var clu = new Clu();

// @beginRouteDeclarations
// @endRouteDeclarations

clu.serve(3000);`;
    fs.writeFileSync("./server/server.js", serverJsText);

    var child = cp.spawn("clu", ["nr", "/", "root"]);
    child.on("exit", (code) => {
        var rootRouteText = 
`async function root(req, res, clu) {
    clu.serveFile("/app.html", res);
}
module.exports = root;`;
        fs.writeFileSync("./server/routes/root.js", rootRouteText);
    });

} else if (args[0] == "nv" && args[1]) {

    var viewName = args[1];
    var viewClass = "";

    for (var token of viewName.split("-")) {
        viewClass += token.charAt(0).toUpperCase() + token.slice(1);
    }

    var viewText = 
`export default class ${viewClass} extends HTMLElement {
    state = {};
    static isStyled = false;
    constructor(props) {
        super();
        this.setState(props);
        this.setStyle();
        this.setHTML();
        this.setHandlers();
    }
    setState(props) {
        for (var prop in props) {
            this.state[prop] = props[prop];
        }
    }
    setStyle() {
        if (!${viewClass}.isStyled) {
            var style = document.createElement("style");
            style.innerHTML = 
\`${viewName} {}\`;
            document.head.append(style);
            ${viewClass}.isStyled = true;
        }
    }
    setHTML() {
        this.innerHTML = 
\`\`;
    }
    setHandlers() {}
}`;
    fs.writeFileSync(`./app/views/${viewName}.js`, viewText);

    var viewImportText = 
`import ${viewClass} from "./views/${viewName}.js";
`;
    var appJsText = fs.readFileSync("./app/app.js", "utf-8");
    var endViewImportsIndex = appJsText.indexOf("// @endViewImports");
    appJsText = appJsText.slice(0, endViewImportsIndex) + viewImportText + appJsText.slice(endViewImportsIndex);
    var viewDefineText = 
`
window.customElements.define("${viewName}", ${viewClass});`;
    var beginViewDefinesIndex = appJsText.indexOf("// @beginViewDefines");
    appJsText = appJsText.slice(0, beginViewDefinesIndex + 20) + viewDefineText + appJsText.slice(beginViewDefinesIndex + 20);
    fs.writeFileSync("./app/app.js", appJsText);

} else if (args[0] == "nr" && args[1] && args[2]) {

    var routePath = args[1]
    var routeName = args[2];
    var routeFunc = "";

    var tokenIndex = 0;
    for (var token of routeName.split("-")) {
        routeFunc += (tokenIndex == 0 ? token : token.charAt(0).toUpperCase() + token.slice(1));
        tokenIndex++;
    }

    var routeText = 
`async function ${routeFunc}(req, res, clu) {}
module.exports = ${routeFunc}`;
    fs.writeFileSync(`./server/routes/${routeName}.js`, routeText);

    var routeRequireText = 
`const ${routeFunc} = require("./routes/${routeName}.js");
`;
    var serverJsText = fs.readFileSync("./server/server.js", "utf-8");
    var endRouteRequiresIndex = serverJsText.indexOf("// @endRouteRequires");
    serverJsText = serverJsText.slice(0, endRouteRequiresIndex) + routeRequireText + serverJsText.slice(endRouteRequiresIndex);
    var routeDeclarationText = 
`clu.route("${routePath}", ${routeFunc});
`;
    var endRouteDeclarationsIndex = serverJsText.indexOf("// @endRouteDeclarations");
    serverJsText = serverJsText.slice(0, endRouteDeclarationsIndex) + routeDeclarationText + serverJsText.slice(endRouteDeclarationsIndex);
    fs.writeFileSync("./server/server.js", serverJsText);
}