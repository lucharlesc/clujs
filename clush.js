const fs = require("fs");
const cp = require("child_process");

var args = process.argv.slice(2);

if (args[0] == "init") {

    var appHtmlText = 
`<!DOCTYPE html>
<html>
    <head>
    </head>
    <body>
        <script type="module" src="app.js"></script>
    </body>
</html>`;

    var appJsText = 
`window._state = {};

var style = document.createElement("style");
style.innerHTML = 
\`\`;
document.head.append(style);

document.body.prepend(new AppView());`;

    try {
        fs.accessSync("./app.html");
    } catch (err) {
        fs.writeFileSync("./app.html", appHtmlText);
    }
    try {
        fs.accessSync("./app.js");
    } catch (err) {
        fs.writeFileSync("./app.js", appJsText);
    }
    try {
        fs.accessSync("./views");
    } catch (err) {
        fs.mkdirSync("./views");
        cp.spawn("node", ["clu.js", "new", "app-view"]);
    }

} else if (args[0] == "new" && args[1]) {

    var viewName = args[1];
    var viewClass = "";

    for (var token of viewName.split("-")) {
        viewClass += token.charAt(0).toUpperCase() + token.slice(1);
    }
    
    var viewText = 
`export default class ${viewClass} extends HTMLElement {
    _state = {};
    static _isStyled = false;
    constructor(props) {
        super();
        this._setState(props);
        this._setStyle();
        this._setHTML();
        this._setHandlers();
    }
    _setState(props) {
        for (var prop in props) {
            this._state[prop] = props[prop];
        }
    }
    _setStyle() {
        if (!${viewClass}._isStyled) {
            var style = document.createElement("style");
            style.innerHTML = 
\`${viewName} {}\`;
            document.head.append(style);
            ${viewClass}._isStyled = true;
        }
    }
    _setHTML() {
        this.innerHTML = 
\`\`;
    }
    _setHandlers() {}
}`;

    fs.writeFileSync(`./views/${viewName}.js`, viewText);
    
    var importDefineText = 
`import ${viewClass} from "./views/${viewName}.js";
window.customElements.define("${viewName}", ${viewClass});

`;

    var appJsText = fs.readFileSync("./app.js", "utf-8");
    fs.writeFileSync("./app.js", importDefineText + appJsText);
}