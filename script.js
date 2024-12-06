let networks;
let devices;

async function fetchData() {
  try {
    const response = await fetch("/jsons/networks.json");
    networks = await response.json();
  } catch (error) {
    console.error("Error:", error);
  }

  try {
    const response = await fetch("/jsons/devices.json");
    devices = await response.json();
  } catch (error) {
    console.error("Error:", error);
  }

  networks = Object.keys(networks)
    .sort()
    .reduce((obj, key) => {
      obj[key] = networks[key];
      return obj;
    }, {});

  for (let network in networks) {
    var name = network;
    var passwords = networks[network]["passwords"];
    var discovered = networks[network]["discovered"];
    var checked = networks[network]["checked"];
    if (
      !(passwords.length == 1 && passwords.includes("not found on the system"))
    ) {
      var details = document.createElement("div");
      var networkName = document.createElement("h2");
      networkName.textContent = name;
      if (checked["status"] == true) {
        var networkPassword = document.createElement("p");
        networkPassword.className = "correct";
        networkPassword.textContent = checked["current_password"].slice(1, -1);
        networkPassword.innerHTML += ` <span>✅ as of ${checked["date"]}</span>`;
        details.appendChild(networkName);
        details.appendChild(networkPassword);
      } else {
        details.appendChild(networkName);
      }

      for (let i = 0; i < passwords.length; i++) {
        var networkPassword = document.createElement("p");
        networkPassword.textContent = passwords[i].slice(1, -1);
        if (checked["status"] == false) {
          networkPassword.classList.add("incorrect");
          networkPassword.innerHTML += ` <span>❌ as of ${checked["date"]}</span>`;
        }
        details.appendChild(networkPassword);
      }

      document.getElementById("networks").appendChild(details);
    }
  }

  document.getElementById("networks-title").textContent = `Networks (${
    document.getElementById("networks").childElementCount
  }):`;

  for (let device in devices) {
    var details = document.createElement("div");

    var operationName = document.createElement("h2");
    operationName.textContent = device;
    details.appendChild(operationName);

    var deviceModel = document.createElement("p");
    deviceModel.textContent =
      devices[device]["manufacturer"] + " " + devices[device]["model"];
    details.appendChild(deviceModel);

    var deviceOS = document.createElement("p");
    deviceOS.textContent = devices[device]["os"];
    details.appendChild(deviceOS);

    var deviceHost = document.createElement("p");
    deviceHost.textContent = devices[device]["host"];
    details.appendChild(deviceHost);

    var deviceDiscovered = document.createElement("p");
    deviceDiscovered.innerHTML =
      "Discovered <b>" + devices[device]["discovered"] + "</b> networks";
    details.appendChild(deviceDiscovered);

    document.getElementById("devices").appendChild(details);
  }

  document.getElementById("devices-title").textContent = `Devices (${
    document.getElementById("devices").childElementCount
  }):`;
}

fetchData();

document.addEventListener("click", (event) => {
  if (event.target.matches("pre")) {
    const pre = event.target;
    const code = pre.textContent;
    navigator.clipboard
      .writeText(code)
      .then(() => alert("Code copied to clipboard!"))
      .catch((err) => alert("Failed to copy code: " + err));
  }
});
