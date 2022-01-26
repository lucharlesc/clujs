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
`var style = document.createElement("style");
style.innerHTML = 
\`\`;
document.head.append(style);

document.body.prepend(new AppView());`;
    fs.writeFileSync("./app/app.js", appJsText);

    cp.spawn("clu", ["nv", "app-view"]);

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
    
    var importDefineText = 
`import ${viewClass} from "./views/${viewName}.js";
window.customElements.define("${viewName}", ${viewClass});

`;

    var appJsText = fs.readFileSync("./app/app.js", "utf-8");
    fs.writeFileSync("./app/app.js", importDefineText + appJsText);
}