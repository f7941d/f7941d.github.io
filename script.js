let messages;
let extra;

function timePassed(date) {
  const givenDate = new Date(date);
  const now = new Date();

  const differenceInMs = now - givenDate;

  const msInSecond = 1000;
  const msInMinute = msInSecond * 60;
  const msInHour = msInMinute * 60;
  const msInDay = msInHour * 24;
  const msInWeek = msInDay * 7;
  const msInMonth = msInDay * 30.435;
  const msInYear = msInDay * 365.22;

  const seconds = Math.floor(differenceInMs / msInSecond);
  const minutes = Math.floor(differenceInMs / msInMinute);
  const hours = Math.floor(differenceInMs / msInHour);
  const days = Math.floor(differenceInMs / msInDay);
  const weeks = Math.floor(differenceInMs / msInWeek);
  const months = Math.floor(differenceInMs / msInMonth);
  const years = differenceInMs / msInYear;

  const formattedYears =
    (years - 0.05).toFixed(1) == parseInt((years - 0.05).toFixed(1))
      ? `${Math.floor(years)}`
      : `${(years - 0.05).toFixed(1)}`;
  var toReturn;
  if (years >= 1) {
    toReturn = `${formattedYears} year${Math.floor(years) > 1 ? "s" : ""} ago`;
  } else if (months >= 1) {
    toReturn = `${months} month${months > 1 ? "s" : ""} ago`;
  } else if (weeks >= 1) {
    toReturn = `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  } else if (days >= 1) {
    toReturn = `${days} day${days > 1 ? "s" : ""} ago`;
  } else if (hours >= 1) {
    toReturn = `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else if (minutes >= 1) {
    toReturn = `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  } else if (seconds >= 1) {
    toReturn = `${seconds} second${seconds > 1 ? "s" : ""} ago`;
  } else {
    toReturn = `Now`;
  }

  return toReturn;
}

let showUnverified = document.getElementById("show-unverified");
let showUnknown = document.getElementById("show-unknown");
let showNotTested = document.getElementById("show-not-tested");
let showVerified = document.getElementById("show-verified");

async function fetchData() {
  try {
    const response = await fetch("/jsons/messages.json");
    messages = await response.json();
    messages.reverse();
  } catch (error) {
    console.error("Error:", error);
  }

  try {
    const response = await fetch("/jsons/extra.json");
    extra = await response.json();
  } catch (error) {
    console.error("Error:", error);
  }

  [showUnverified, showUnknown, showNotTested, showVerified].forEach(
    (element) => {
      element.addEventListener("change", () => {
        update();
      });
    }
  );

  update();
}

function update() {
  document.getElementById("networks").innerHTML = "";
  document.getElementById("devices").innerHTML = "";
  document.getElementById("messages").innerHTML = "";

  let networks = {};
  let devices = {};

  for (let message in messages) {
    var messageContent = messages[message]["content"];
    var operationCode = messageContent["host"].split("-")[1];

    var messageDiv = document.createElement("div");
    messageDiv.classList = "message";

    var messageTitleDiv = document.createElement("h2");
    messageTitleDiv.textContent = operationCode;

    messageDiv.appendChild(messageTitleDiv);

    var messageContentDiv = document.createElement("p");
    messageContentDiv.classList = "message-content";
    messageContentDiv.textContent = "";

    for (let network in messageContent["networks"]) {
      var password = messageContent["networks"][network];
      if (password !== false) {
        messageContentDiv.textContent +=
          '"' + network + '": "' + password + '"\n';
      } else {
        messageContentDiv.textContent += '"' + network + '": Unknown\n';
      }
      if (network in networks) {
        if (!networks[network]["passwords"].includes(password)) {
          networks[network]["passwords"].push(password);
        }
        if (!networks[network]["discovered"].includes(operationCode)) {
          networks[network]["discovered"].push(operationCode);
        }
      } else {
        networks[network] = {
          passwords: [password],
          discovered: [operationCode],
        };
      }
    }

    devices[operationCode] = {
      manufacturer: messageContent["manufacturer"],
      model: messageContent["model"],
      os: messageContent["os"],
      host: messageContent["host"],
      discovered: Object.keys(messageContent["networks"]).length,
    };

    messageContentDiv.textContent += "\n";
    messageContentDiv.textContent +=
      "System Manufacturer" + ": " + messageContent["manufacturer"] + "\n";
    messageContentDiv.textContent +=
      "System Model" + ": " + messageContent["model"] + "\n";
    messageContentDiv.textContent +=
      "OS Name" + ": " + messageContent["os"] + "\n";
    messageContentDiv.textContent +=
      "Host Name" + ": " + messageContent["host"];

    messageDiv.appendChild(messageContentDiv);

    var messageTimeDiv = document.createElement("p");
    var time = new Date(messages[message]["time"].replace(/-/g, " "));
    messageTimeDiv.className = "message-time";
    messageTimeDiv.textContent = timePassed(
      messages[message]["time"].replace(/-/g, " ")
    );
    messageTimeDiv.title = time.toLocaleString();

    messageDiv.appendChild(messageTimeDiv);

    document.getElementById("messages").appendChild(messageDiv);
  }

  document.getElementById("messages-title").textContent = `Latest Messages (${
    document.getElementById("messages").childElementCount
  }):`;

  for (let verifiedNetwork in extra["verified"]) {
    if (networks[verifiedNetwork] === undefined) {
      networks[verifiedNetwork] = {
          passwords: [extra["verified"][verifiedNetwork]],
          discovered: ["OTHER"],
      }
    }
  }

  networks = Object.keys(networks)
    .sort()
    .reduce((obj, key) => {
      obj[key] = networks[key];
      return obj;
    }, {});

  for (let network in networks) {
    var networkDiv = document.createElement("div");
    var networkName = document.createElement("h2");
    networkName.classList = "copy";
    networkName.textContent = network;

    var networkStatus = "not-tested";

    if (
      networks[network]["passwords"].length === 1 &&
      networks[network]["passwords"][0] == false
    ) {
      networkName.textContent = "⚠️ " + networkName.textContent;
      networkName.classList = "";
      networkName.title = "Password Unknown";
      networkStatus = "unknown";
    } else if (extra["verified"][network] !== undefined) {
      networkName.innerHTML =
        '✅ <span class="copy">' + networkName.textContent + "</span>";
      networkName.classList = "";
      networkName.title = "Password Verified";
      networkStatus = "verified";
    } else if (extra["unverified"][network] !== undefined) {
      networkName.textContent = "❌ " + networkName.textContent;
      networkName.classList = "";
      networkName.title = "Password Unverified";
      networkStatus = "unverified";
    }

    networkDiv.appendChild(networkName);

    if (extra["verified"][network] !== undefined) {
      var networkPassword = document.createElement("p");
      networkPassword.classList = "password correct copy";
      networkPassword.textContent = extra["verified"][network];
      networkDiv.appendChild(networkPassword);
    }

    for (let password in networks[network]["passwords"]) {
      if (
        networks[network]["passwords"][password] !== extra["verified"][network]
      ) {
        var networkPassword = document.createElement("p");
        if (networks[network]["passwords"][password] !== false) {
          if (extra["verified"][network] !== undefined) {
            networkPassword.className = "password incorrect";
          } else if (extra["unverified"][network] !== undefined) {
            networkPassword.className = "password incorrect";
          } else {
            networkPassword.className = "password copy";
          }
          networkPassword.textContent =
            networks[network]["passwords"][password];
        } else {
          networkPassword.classList = "password";
          networkPassword.textContent = "Unknown";
        }
        networkDiv.appendChild(networkPassword);
      }
    }
    if (
      (showNotTested.checked && networkStatus === "not-tested") ||
      (showUnknown.checked && networkStatus === "unknown") ||
      (showVerified.checked && networkStatus === "verified") ||
      (showUnverified.checked && networkStatus === "unverified")
    ) {
      document.getElementById("networks").appendChild(networkDiv);
    }
  }

  document.getElementById("networks-title").textContent = `Networks (${
    document.getElementById("networks").childElementCount
  }):`;

  for (let device in devices) {
    var deviceDiv = document.createElement("div");
    var deviceName = document.createElement("h2");
    deviceName.classList = "copy";
    deviceName.textContent = device;
    deviceDiv.appendChild(deviceName);

    var deviceInfo = document.createElement("p");
    deviceInfo.textContent =
      devices[device]["manufacturer"] + " " + devices[device]["model"];
    deviceDiv.appendChild(deviceInfo);

    var deviceInfo = document.createElement("p");
    deviceInfo.textContent = devices[device]["os"];
    deviceDiv.appendChild(deviceInfo);

    var deviceInfo = document.createElement("p");
    deviceInfo.textContent = devices[device]["host"];
    deviceDiv.appendChild(deviceInfo);

    var deviceInfo = document.createElement("p");
    deviceInfo.innerHTML =
      "Discovered <b>" + devices[device]["discovered"] + "</b> networks";
    deviceDiv.appendChild(deviceInfo);

    document.getElementById("devices").appendChild(deviceDiv);
  }

  document.getElementById("devices-title").textContent = `Devices (${
    document.getElementById("devices").childElementCount
  }):`;
}

fetchData();

document.addEventListener("click", (event) => {
  if (event.target.matches(".copy")) {
    const pre = event.target;
    const code = pre.textContent;
    navigator.clipboard
      .writeText(code)
      .then(() => {
        const copyBanner = document.getElementById("copy-banner");
        copyBanner.style.animation = "none";
        void copyBanner.offsetWidth;
        copyBanner.style.animation = "copyBanner 2s ease-in-out";
      })
      .catch((err) => {
        console.log(err);
      });
  }
});
