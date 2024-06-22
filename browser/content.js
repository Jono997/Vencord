if (typeof browser === "undefined") {
    var browser = chrome;
}

const style = document.createElement("link");
style.type = "text/css";
style.rel = "stylesheet";
style.href = browser.runtime.getURL("dist/Vencord.css");

document.addEventListener(
    "DOMContentLoaded",
    () => document.documentElement.append(style),
    { once: true }
);
