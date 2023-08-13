const getScript = (local, online, asyncMode) => {
  const myURL = "";
  if (online === undefined) {
    online = myURL + local;
  }
  if (asyncMode === undefined) {
    asyncMode = true;
  }
  let scriptEle = document.createElement("script");
  if (window.location.host) {
    scriptEle.setAttribute("src", online);
  } else {
    scriptEle.setAttribute("src", local);
  }
  scriptEle.setAttribute("async", asyncMode ? "true" : "false");
  document.body.appendChild(scriptEle);
};

getScript("script/4.8.0.js", "https://docs.opencv.org/4.8.0/opencv.js");

getScript("config.js");
getScript("script/DRF.js");
getScript("script/gridGraphic.js");
getScript("script/sixPoints.js");
getScript("script/sevenPoints.js");
getScript("script/ccw.js");
getScript("script/realTime.js");
getScript("script/pointClass.js");
getScript("script/crossPoint.js");
getScript("script/pillar.js");
getScript("script/distance.js");
getScript("script/reversePoint.js");
getScript("script/refcheck.js");
getScript("script/u2net.js");

let itv = setInterval(function () {
  if (typeof cv != "undefined" && typeof start != "undefined") {
    clearInterval(itv);
    start();
  }
}, 33);

let currentD, currentR, currentTheta;
document.querySelector("button").onclick = () => {
  if (DRF_measure) return;
  DRF_measure = true;
  document.querySelector("button").disabled = true;
  let sumR = 0;
  let sumD = 0;
  let sumTheta = 0;
  let num = 0;
  currentD = 0;
  setTimeout(() => {
    let itv = setInterval(() => {
      if (!currentD) return;
      sumR += currentR;
      sumD += currentD;
      sumTheta += currentTheta;
      if (++num == 5) {
        clearInterval(itv);
        document.querySelector("button").disabled = false;
        DRF_measure = false;
        D = sumD / num;
        R = sumR / num;
        theta = sumTheta / num;
        DRF();
        document.querySelector("textarea").value = `D: ${Math.round(D)} \nR: ${
          Math.round(R * 100) / 100
        } \nF: ${Math.round(F)} \ntheta: ${Math.round(theta * 100) / 100}`;
      } else {
        currentD = 0;
      }
    }, 300);
  }, 500);
};

document.querySelectorAll("button")[1].onclick = () => {
  BOX_measure = 1;
};
document.querySelectorAll("button")[2].onclick = () => {
  BOX_measure = 0;
};

const u2net = () => {
  if (typeof ort === "undefined") {
    setTimeout(u2net, 100);
    return;
  }
  if (typeof u2net_trigger === "undefined") {
    setTimeout(u2net, 100);
    return;
  }
  u2net_trigger();
};
