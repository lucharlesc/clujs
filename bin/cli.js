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
`class App {
    nextPropsId = 0;
    props = {};
    view(viewName, viewClass) {
        window.customElements.define(viewName, viewClass);
    }
    start(rootName, id) {
        window.cluApp = this;
        window.addEventListener("popstate", (event) => {
            var cluRoutes = document.getElementsByTagName("clu-route");
            for (var cluRoute of cluRoutes) {
                cluRoute.reRender();
            }
        });
        this.view("clu-route", CluRoute);
        this.view("clu-link", CluLink);
        var rootElement = document.createElement(rootName);
        if (id) {
            rootElement.id = id;
        }
        document.body.prepend(rootElement);
    }
}
class View extends HTMLElement {
    setState(state) {
        for (var key in state) {
            this.state[key] = state[key];
        }
        this.reRender();
    }
    setProps(props) {
        var propsId = window.cluApp.nextPropsId++;
        for (var prop in props) {
            if (typeof props[prop] == "function") {
                props[prop] = props[prop].bind(this);
            }
        }
        window.cluApp.props[propsId] = props;
        return propsId;
    }
    reRender() {
        this.innerHTML = this.render();
        var elements = this.getElementsByTagName("*");
        for (var element of elements) {
            for (var i = 0; i < element.attributes.length; i++) {
                var attribute = element.attributes[i];
                if (attribute.name.slice(0, 6) == "event-") {
                    let eventHandler = attribute.value;
                    element.addEventListener(attribute.name.slice(6), (event) => {
                        this[eventHandler](event);
                    });
                }
            }
        }
    }
    connectedCallback() {
        if (!Object.getPrototypeOf(this).isStyled) {
            var styleElement = document.createElement("style");
            styleElement.innerHTML = this.styles;
            document.head.append(styleElement);
            Object.getPrototypeOf(this).isStyled = true;
        }
        var propsId = this.dataset.props;
        var props = window.cluApp.props[propsId];
        for (var prop in props) {
            this.state[prop] = props[prop];
        }
        delete window.cluApp.props[propsId];
        this.removeAttribute("data-props");
        for (var event in this.events) {
            this.addEventListener(event, (e) => {
                this.events[event](e);
            });
        }
        this.reRender();
    }
    async fetchData(url, data) {
        try {
            var res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });
            return res.json();
        } catch (err) {
            return false;
        }
    }
}
class CluRoute extends View {
    styles = \`\`;
    state = {
        html: this.innerHTML
    };
    events = {};
    render() {
        if (this.dataset.path == window.location.pathname.slice(0, this.dataset.path.length)) {
            this.removeAttribute("hidden");
            return \`\${this.state.html}\`;
        } else {
            this.setAttribute("hidden", "");
            return \`\`;
        }
    }
}
class CluLink extends View {
    styles = \`\`;
    state = {};
    events = {
        click: (event) => {
            event.preventDefault();
            window.history.pushState({}, "", this.dataset.path);
            var cluRoutes = document.getElementsByTagName("clu-route");
            for (var cluRoute of cluRoutes) {
                cluRoute.reRender();
            }
        }
    };
    render() {
        return \`\${this.innerHTML}\`;
    }
}
export { App, View };`;
    fs.writeFileSync("./app/clu.js", cluJsText);

    var appHtmlText = 
`<!DOCTYPE html>
<html>
    <head>
        <title>Clu App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="/app.css">
    </head>
    <body>
        <script type="module" src="/app.js"></script>
    </body>
</html>`;
    fs.writeFileSync("./app/app.html", appHtmlText);

    var appCssText = 
`body {
    margin: 0;
}`;
    fs.writeFileSync("./app/app.css", appCssText);

    var appJsText = 
`import * as clu from "./clu.js";

// @beginViewImports
// @endViewImports

var app = new clu.App;

// @beginViewDeclares
// @endViewDeclares

app.start("app-view");`;
    fs.writeFileSync("./app/app.js", appJsText);

    cp.spawn("clu", ["nv", "app-view", `
        app-view {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: Helvetica, sans-serif;
            background-color: #F2F2F2;
            user-select: none;
        }
        app-view p {
            margin: 0 0 16px 0;
            font-size: 32px;
            font-weight: bold;
        }
        app-view div {
            display: flex;
            justify-content: space-between;
            width: 160px;
        }
        app-view a {
            font-size: 16px;
            font-weight: normal;
            color: #808080;
            text-decoration: none;
        }
        app-view a:hover {
            color: #000000;
        }`, `
        titleColor: "#0066FF"
    `, `
        click: () => {
            var randColor = "#" + Math.floor(16777215 * Math.random()).toString(16);
            this.setState({
                titleColor: randColor
            });
        }
    `, `
            <p style="color:\${this.state.titleColor}">Clu App</p>
            <div>
                <a href="https://clujs.org" target="_blank">Clu</a>
                <a href="https://github.com/lucharlesc/clujs" target="_blank">GitHub</a>
                <a href="https://www.npmjs.com/package/clujs" target="_blank">npm</a>
            </div>`]);

    var serverJsText = 
`const clu = require("clujs");

// @beginRouteRequires
// @endRouteRequires

var server = new clu.Server;

// @beginRouteDeclares
// @endRouteDeclares

server.serve(3000);`;
    fs.writeFileSync("./server/server.js", serverJsText);

    cp.spawn("clu", ["nr", "default-route", "/*", `
        await this.serveFile("/app.html", res);
    `]);

} else if (args[0] == "nv" && args[1]) {

    var viewName = args[1];
    var viewStyles = args[2];
    var viewState = args[3];
    var viewEvents = args[4];
    var viewHtml = args[5];
    var viewClass = "";

    for (var token of viewName.split("-")) {
        viewClass += token.charAt(0).toUpperCase() + token.slice(1);
    }

    var viewText = 
`import * as clu from "../clu.js";

export default class ${viewClass} extends clu.View {
    styles = \`${viewStyles ? viewStyles : ""}\`;
    state = {${viewState ? viewState : ""}};
    events = {${viewEvents ? viewEvents : ""}};
    render() {
        return \`${viewHtml ? viewHtml : ""}\`;
    }
}`;
    fs.writeFileSync(`./app/views/${viewName}.js`, viewText);

    var viewImportText = 
`import ${viewClass} from "./views/${viewName}.js";
`;
    var appJsText = fs.readFileSync("./app/app.js", "utf-8");
    var endViewImportsIndex = appJsText.indexOf("// @endViewImports");
    appJsText = appJsText.slice(0, endViewImportsIndex) + viewImportText + appJsText.slice(endViewImportsIndex);
    var viewDeclareText = 
`app.view("${viewName}", ${viewClass});
`;
    var endViewDeclaresIndex = appJsText.indexOf("// @endViewDeclares");
    appJsText = appJsText.slice(0, endViewDeclaresIndex) + viewDeclareText + appJsText.slice(endViewDeclaresIndex);
    fs.writeFileSync("./app/app.js", appJsText);

} else if (args[0] == "nr" && args[1]) {

    var routeName = args[1];
    var routePath = args[2];
    var routeResponse = args[3];
    var routeClass = "";

    for (var token of routeName.split("-")) {
        routeClass += token.charAt(0).toUpperCase() + token.slice(1);
    }

    var routeText = 
`const clu = require("clujs");

class ${routeClass} extends clu.Route {
    async respond(req, res) {${routeResponse ? routeResponse : ""}}
}
module.exports = ${routeClass};`;
    fs.writeFileSync(`./server/routes/${routeName}.js`, routeText);

    var routeRequireText = 
`const ${routeClass} = require("./routes/${routeName}.js");
`;
    var serverJsText = fs.readFileSync("./server/server.js", "utf-8");
    var endRouteRequiresIndex = serverJsText.indexOf("// @endRouteRequires");
    serverJsText = serverJsText.slice(0, endRouteRequiresIndex) + routeRequireText + serverJsText.slice(endRouteRequiresIndex);
    var routeDeclareText = 
`server.route("${routePath ? routePath : "/" + routeName}", ${routeClass});
`;
    var endRouteDeclaresIndex = serverJsText.indexOf("// @endRouteDeclares");
    serverJsText = serverJsText.slice(0, endRouteDeclaresIndex) + routeDeclareText + serverJsText.slice(endRouteDeclaresIndex);
    fs.writeFileSync("./server/server.js", serverJsText);
}