// measure DRF or not
let DRF_measure = false;
let BOX_measure = false;
const numFmax = 30;

// reference size
let circle_radius = 100;
let rect_length = 312;
const max_error_rate = 0.2;
const interval_time = 200; // 5fps

// get DOM object
const vid = document.querySelector("video");
const cvs = document.querySelector("canvas");
const ctx = cvs.getContext("2d");

// Width, Height of Video/Canvas
let W;
let H;

// Distance, Radius, Focus, theta
let D = 2000;
let R = 0.7;
let F = 1000;
let theta = 0;
// if "F" fixed
let fixed_F = 0;
// iphone 13mini => 750
// macbook pro 14' => 1200

// pre calc
let sinR, cosR, tanR, itanR, DsinR, DcosR;

const DRF = () => {
  D = D - 0;
  R = R - 0;
  F = F - 0;
  sinR = Math.sin(R);
  cosR = Math.cos(R);
  tanR = Math.tan(R);
  itanR = 1 / tanR;
  DsinR = D * sinR;
  DcosR = D * cosR;
};

DRF();

let itv = setInterval(function () {
  if (typeof cv != "undefined" && typeof start != "undefined") {
    clearInterval(itv);
    start();
  }
}, 33);

let currentD, currentR, currentTheta;
document.querySelector("button").onclick = () => {
  rect_length = document.querySelectorAll("input")[1].value - 0;
  circle_radius = rect_length / 3.12;
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
        } \nF: ${Math.round(F)} \nTheta: ${Math.round(theta * 100) / 100}`;
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
document.querySelectorAll("button")[3].onclick = () => {
  fixed_F = document.querySelector("input").value - 0;
  numF = numFmax;
  avgF = fixed_F;
  console.log(fixed_F);
};
document.querySelectorAll("button")[4].onclick = () => {
  fixed_F = 0;
  numF = 0;
};

const u2net = () => {
  if (
    typeof ort === "undefined" ||
    typeof u2net_trigger === "undefined" ||
    typeof model === "undefined"
  ) {
    setTimeout(u2net, 100);
    return;
  }
  u2net_trigger();
};

const Point = class {
  constructor(x, y, type) {
    if (type == 2) {
      type = 0;
      x *= W / 320;
      y *= H / 320;
    }
    this.v_type = type === undefined ? 0 : type - 0;
    if (this.v_type) {
      this.v_x = x === undefined ? 0 : x;
      this.v_y = y === undefined ? 0 : y;
    } else {
      this.v_x = x === undefined ? 0 : x - W / 2;
      this.v_y = y === undefined ? 0 : y - H / 2;
    }
  }
  valueOf() {
    return this.v_y * W + this.v_x;
  }
  x(x) {
    if (this.v_type) {
      if (x === undefined) {
        return this.v_x;
      } else {
        this.v_x = x;
      }
    } else {
      if (x === undefined) {
        return this.v_x + W / 2;
      } else {
        this.v_x = x - W / 2;
      }
    }
  }
  y(y) {
    if (this.v_type) {
      if (y === undefined) {
        return this.v_y;
      } else {
        this.v_y = y;
      }
    } else {
      if (y === undefined) {
        return this.v_y + H / 2;
      } else {
        this.v_y = y - H / 2;
      }
    }
  }
  type() {
    return this.v_type;
  }
  copy() {
    if (this.v_type) {
      return new Point(this.v_x, this.v_y, this.v_type);
    } else {
      return new Point(this.v_x + W / 2, this.v_y + H / 2, this.v_type);
    }
  }
  plane() {
    if (this.v_type) return;
    const cosTheta = Math.cos(-theta);
    const sinTheta = Math.sin(-theta);
    const x = cosTheta * this.v_x - sinTheta * this.v_y;
    const y = sinTheta * this.v_x + cosTheta * this.v_y;
    const t = R + Math.atan(y / F);
    const Y = DsinR * (itanR - 1 / Math.tan(t));
    const X = (x * DsinR) / Math.sin(t) / Math.sqrt(y * y + F * F);
    this.v_x = X;
    this.v_y = Y;
    this.v_type = 1;
  }
  screen() {
    if (!this.v_type) return;
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);
    const Y = this.v_y;
    const X = this.v_x;
    const y = F * Math.tan(Math.atan(1 / (itanR - Y / DsinR)) - R);
    let t = R + Math.atan(y / F);
    if (t < 0) t += 2 * Math.PI;
    else if (t > 2 * Math.PI) t -= 2 * Math.PI;
    const x = (X / DsinR) * Math.sin(t) * Math.sqrt(y * y + F * F);
    this.v_x = cosTheta * x - sinTheta * y;
    this.v_y = sinTheta * x + cosTheta * y;
    this.v_type = 0;
  }
};

const distance = (a, b) => {
  let A = a.copy();
  let B = b.copy();
  A.plane();
  B.plane();
  const dX = A.x() - B.x();
  const dY = A.y() - B.y();
  return Math.sqrt(dX * dX + dY * dY);
};

const pillar = (a, b) => {
  let A = a.copy();
  let B = b.copy();
  A.plane();
  B.plane();
  if (A < B) {
    [A, B] = [B, A];
  }
  const dX = A.x() - B.x();
  const dY = A.y() - B.y();
  const dis = Math.sqrt(dX * dX + dY * dY);
  const height =
    (DsinR * dis) /
    (dis + Math.sqrt(A.x() * A.x() + Math.pow(DcosR - A.y(), 2)));
  return height;
};

const plane_H = (a, H) => {
  let A = a.copy();
  const DD = D;
  const RR = R;
  R = Math.atan((DsinR - H) / DcosR);
  D = DcosR / Math.cos(R);
  DRF();
  A.plane();
  D = DD;
  R = RR;
  DRF();
  return A;
};

const screen_H = (a, H) => {
  let A = a.copy();
  const DD = D;
  const RR = R;
  R = Math.atan((DsinR - H) / DcosR);
  D = DcosR / Math.cos(R);
  DRF();
  A.screen();
  D = DD;
  R = RR;
  DRF();
  return A;
};

const distance_H = (a, b, H) => {
  let A = a.copy();
  let B = b.copy();
  const DD = D;
  const RR = R;
  R = Math.atan((DsinR - H) / DcosR);
  D = DcosR / Math.cos(R);
  DRF();
  A.plane();
  B.plane();
  const dX = A.x() - B.x();
  const dY = A.y() - B.y();
  D = DD;
  R = RR;
  DRF();
  return Math.sqrt(dX * dX + dY * dY);
};

const crossPoint = (p1, p2, p3, p4) => {
  let d1;
  if (p1.x() != p2.x()) {
    d1 = (p1.y() - p2.y()) / (p1.x() - p2.x());
  } else {
    d1 = 2e9;
  }
  let d2;
  if (p3.x() != p4.x()) {
    d2 = (p3.y() - p4.y()) / (p3.x() - p4.x());
  } else {
    d2 = 2e9;
  }
  const y1 = p1.y() - d1 * p1.x();
  const y2 = p3.y() - d2 * p3.x();
  const ret = new Point();
  if (d2 != d1) {
    ret.x((y1 - y2) / (d2 - d1));
  } else {
    ret.x(2e9);
  }
  ret.y(d1 * ret.x() + y1);
  return ret;
};

const ccw = (p1, p2, p3) => {
  const v1 = [p2.x() - p1.x(), p2.y() - p1.y()];
  const v2 = [p3.x() - p2.x(), p3.y() - p2.y()];
  const t = v1[0] * v2[1] - v2[0] * v1[1];
  if (t > 0) {
    return 1; //CCW
  } else if (t < 0) {
    return -1; //CW
  }
  return 0; //Parallel
};

const start = () => {
  navigator.mediaDevices
    .getUserMedia({
      audio: false,
      video: {
        frameRate: { min: 24, ideal: 60, max: 60 },
        facingMode: { exact: "environment" },
        width: { ideal: 2496 },
        height: { ideal: 1404 },
      },
    })
    .then((stream) => {
      vid.srcObject = stream;
      vid.onloadedmetadata = () => {
        vid.play();
        W = vid.videoWidth;
        H = vid.videoHeight;
        vid.width = W;
        vid.height = H;
        vid.style.height = (window.innerWidth / W) * H;
        cvs.width = W;
        cvs.height = H;
        cap = new cv.VideoCapture(vid);
        img = new cv.Mat({ width: W, height: H }, cv.CV_8UC4);
        thr = new cv.Mat();
        realTime();
        u2net_trigger();
      };
    });
};

let cap, img, thr;
function realTime() {
  // cv.imshow(cvs, img);
  if ((DRF_measure || numF < numFmax) && !BOX_measure) {
    ctx.clearRect(0, 0, W, H);
    cap.read(img);
    cv.cvtColor(img, thr, cv.COLOR_BGR2GRAY);
    cv.threshold(thr, thr, 0, 255, cv.THRESH_OTSU);
    refCV(img, thr);
  }
  setTimeout(realTime, interval_time);
}

let session;

async function u2net_trigger() {
  session = await ort.InferenceSession.create(model, {
    executionProviders: ["wasm"],
  });
  detect();
}
const cvs_off = document.querySelectorAll("canvas")[1];
const ctx_off = cvs_off.getContext("2d");
const cvs_result = document.querySelectorAll("canvas")[2];
const ctx_result = cvs_result.getContext("2d");

let TW = 320,
  TH = 320;

const detect = async () => {
  if (!BOX_measure) {
    ctx_result.clearRect(0, 0, W, H);
    setTimeout(detect, interval_time);
    return;
  }
  ctx_off.drawImage(vid, 0, 0, 320, 320);

  let input_imageData = ctx_off.getImageData(0, 0, TW, TH); // change this for input
  let floatArr = new Float32Array(TW * TH * 3);
  let floatArr2 = new Float32Array(TW * TH * 3);

  let j = 0;
  for (let i = 1; i < input_imageData.data.length + 1; i++) {
    if (i % 4 != 0) {
      floatArr[j] = input_imageData.data[i - 1].toFixed(2) / 255;
      j = j + 1;
    }
  }
  let k = 0;
  for (let i = 0; i < floatArr.length; i += 3) {
    floatArr2[k] = floatArr[i];
    k = k + 1;
  }
  for (let i = 1; i < floatArr.length; i += 3) {
    floatArr2[k] = floatArr[i];
    k = k + 1;
  }
  for (let i = 2; i < floatArr.length; i += 3) {
    floatArr2[k] = floatArr[i];
    k = k + 1;
  }
  const input = new ort.Tensor("float32", floatArr2, [1, 3, TW, TH]);
  const feeds = { "input.1": input };
  const results = await session.run(feeds).then();
  const pred = Object.values(results)[0];
  let myImageData = ctx_off.createImageData(TW, TH);
  for (let i = 0; i < pred.data.length * 4; i += 4) {
    let pixelIndex = i;
    if (i != 0) {
      t = i / 4;
    } else {
      t = 0;
    }
    const t1 = Math.round(pred.data[t] * 255);
    myImageData.data[pixelIndex] = 255 - t1; // red color
    myImageData.data[pixelIndex + 1] = 255 - t1; // green color
    myImageData.data[pixelIndex + 2] = 255 - t1; // blue color
    myImageData.data[pixelIndex + 3] = 255 - t1;
  }
  // Apply image mask
  cvs_off.width = TW;
  cvs_off.height = TH;
  cvs_result.width = TW;
  cvs_result.height = TH;
  ctx_result.putImageData(myImageData, 0, 0);
  cvs_result.style.width = document.querySelector("video").clientWidth;
  cvs_result.style.height = document.querySelector("video").clientHeight;
  getPoints();
  setTimeout(detect, interval_time);
};

const getPoints = () => {
  let img = cv.matFromImageData(ctx_result.getImageData(0, 0, 320, 320));
  let thr = new cv.Mat();
  cv.cvtColor(img, thr, cv.COLOR_BGR2GRAY);
  cv.threshold(thr, thr, 0, 255, cv.THRESH_OTSU);
  let hierarchy = new cv.Mat();
  let contours = new cv.MatVector();

  cv.findContours(
    thr,
    contours,
    hierarchy,
    cv.RETR_EXTERNAL,
    cv.CHAIN_APPROX_NONE
  );

  let apVolume;
  for (let i = 0; i < contours.size(); i++) {
    let cont = contours.get(i);
    let point_top, point_bottom, point_left, point_right;
    let z = cont.size().height;
    for (let j = 0; j < z; j += 2) {
      let tp = new Point(cont.data32S[j], cont.data32S[j + 1], 2);
      tp.plane();
      if (!point_top || point_top.y() > tp.y()) {
        point_top = tp;
      }
      if (!point_bottom || point_bottom.y() < tp.y()) {
        point_bottom = tp;
      }
      if (!point_left || point_left.x() > tp.x()) {
        point_left = tp;
      }
      if (!point_right || point_right.x() < tp.x()) {
        point_right = tp;
      }
    }
    const boxPoints = [point_top, point_left, point_right, point_bottom];
    let volume = sixPoints(boxPoints);
    if (!apVolume || volume.score > apVolume.score) {
      apVolume = volume;
    }
    cont.delete();
  }
  document.querySelectorAll("textarea")[1].value = `가로: ${Math.round(
    apVolume.width
  )} \n세로: ${Math.round(apVolume.depth)}\n 높이: ${Math.round(
    apVolume.height
  )}`;
  contours.delete();
  hierarchy.delete();
  img.delete();
  thr.delete();
};

const refCV = (img, thr) => {
  let hierarchy = new cv.Mat();
  let contours = new cv.MatVector();

  cv.findContours(thr, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_NONE);

  for (let i = 0; i < contours.size(); i++) {
    let parent_node = hierarchy.data32S[4 * i + 3];
    if (parent_node == -1) continue;

    let grand_node = hierarchy.data32S[4 * parent_node + 3];
    if (grand_node == -1) continue;

    cont = contours.get(i);
    let t = cv.boundingRect(cont);
    if (t.width < 7 || t.height < 7) continue;

    let approx_self = new cv.Mat();
    cv.approxPolyDP(cont, approx_self, cv.arcLength(cont, true) * 0.02, true);
    if (approx_self.size().height < 6) {
      approx_self.delete();
      continue;
    }
    approx_self.delete();

    cont_parent = contours.get(parent_node);
    let approx_parent = new cv.Mat();
    cv.approxPolyDP(
      cont_parent,
      approx_parent,
      cv.arcLength(cont, true) * 0.02,
      true
    );
    if (approx_parent.size().height != 4) {
      approx_parent.delete();
      continue;
    }

    cont_grand = contours.get(grand_node);
    let approx_grand = new cv.Mat();
    cv.approxPolyDP(
      cont_grand,
      approx_grand,
      cv.arcLength(cont, true) * 0.02,
      true
    );
    if (approx_grand.size().height != 4) {
      approx_parent.delete();
      approx_grand.delete();
      continue;
    }

    let area_self = cv.contourArea(cont, false);
    let area_parent = cv.contourArea(cont_parent, false);
    let ans =
      (rect_length * rect_length) / Math.PI / circle_radius / circle_radius;

    if (Math.abs(area_parent / area_self - ans) > max_error_rate) continue;

    refCandidate(cont_parent, approx_parent, approx_grand, cont);

    approx_parent.delete();
    approx_grand.delete();
    break;
  }
  contours.delete();
  hierarchy.delete();
};

function refCandidate(cont_parent, approx_parent, approx_grand, cont) {
  let t = cv.boundingRect(cont_parent);
  ctx.beginPath();
  ctx.lineWidth = "2";
  ctx.strokeStyle = "red";
  ctx.rect(t.x, t.y, t.width, t.height);
  ctx.stroke();

  let ap = approx_parent.data32S;
  let ap_ = approx_grand.data32S;

  let centerPoint = crossPoint(
    new Point(ap[0], ap[1]),
    new Point(ap[4], ap[5]),
    new Point(ap[2], ap[3]),
    new Point(ap[6], ap[7])
  );
  const theta1 = findHorizon(ap);
  const theta2 = findHorizon(ap_);

  if (theta1 < 0 && theta2 > Math.PI) {
    theta = -Math.PI / 2;
  } else if (theta2 < 0 && theta1 > Math.PI) {
    theta = -Math.PI / 2;
  } else {
    theta = (theta1 + theta2) / 2;
  }

  D = 4096;
  R = Math.PI / 2;
  F = 1000;
  DRF();
  centerPoint.plane();
  ref = [];
  ref_LR = [];
  ref[0] = centerPoint.copy();
  ref[1] = centerPoint.copy();
  ref[2] = centerPoint.copy();
  ref_LR[0] = new Point(centerPoint.x(), 2e9, 1);
  ref_LR[1] = new Point(centerPoint.x(), 2e9, 1);
  const v = cont.data32S;
  const z = cont.size().height * 2;
  for (let i = 0; i < z; i += 2) {
    let p = new Point(v[i], v[i + 1]);
    p.plane();
    if (ref[0].y() > p.y()) {
      ref[0].y(p.y());
    } else if (ref[2].y() < p.y()) {
      ref[2].y(p.y());
    }
    if (
      p.x() < ref[1].x() &&
      Math.abs(ref_LR[0].y() - ref[1].y()) > Math.abs(ref[1].y() - p.y())
    ) {
      ref_LR[0].x(p.x());
      ref_LR[0].y(p.y());
    } else if (
      p.x() > ref[1].x() &&
      Math.abs(ref_LR[1].y() - ref[1].y()) > Math.abs(ref[1].y() - p.y())
    ) {
      ref_LR[1].x(p.x());
      ref_LR[1].y(p.y());
    }
  }
  ref_LR[0].y(ref[1].y());
  ref_LR[1].y(ref[1].y());
  ref[0].screen();
  ref[1].screen();
  ref[2].screen();
  ref_LR[0].screen();
  ref_LR[1].screen();

  refCheck(ref, circle_radius, ref_LR);
}

const findHorizon = (ap) => {
  let d1, d2;
  if (ap[2] != ap[0]) {
    d1 = (ap[3] - ap[1]) / (ap[2] - ap[0]);
  } else {
    d1 = 2e9;
  }
  if (ap[6] != ap[4]) {
    d2 = (ap[7] - ap[5]) / (ap[6] - ap[4]);
  } else {
    d2 = 2e9;
  }
  let y1, y2;
  y1 = ap[1] - d1 * ap[0];
  y2 = ap[5] - d2 * ap[4];

  let p1x;
  if (d2 != d1) {
    p1x = (y1 - y2) / (d2 - d1);
  } else {
    p1x = 2e9;
  }
  let p1y = d1 * p1x + y1;

  // 점근선 1 구하기 완료

  if (ap[4] != ap[2]) {
    d1 = (ap[5] - ap[3]) / (ap[4] - ap[2]);
  } else {
    d1 = 2e9;
  }
  if (ap[0] != ap[6]) {
    d2 = (ap[1] - ap[7]) / (ap[0] - ap[6]);
  } else {
    d2 = 2e9;
  }
  y1 = ap[3] - d1 * ap[2];
  y2 = ap[7] - d2 * ap[6];

  let p2x;
  if (d2 != d1) {
    p2x = (y1 - y2) / (d2 - d1);
  } else {
    p2x = 2e9;
  }
  let p2y = d1 * p2x + y1;

  // 점근선 2 구하기 완료

  if (p1x == p2x) {
    if (p1y < H / 2) {
      return Math.PI / 2;
    } else {
      return (3 * Math.PI) / 2;
    }
  } else {
    let ccwv;
    if (p1x < p2x) {
      ccwv = ccw(
        new Point(p1x, p1y),
        new Point(p2x, p2y),
        new Point(ap[0], ap[1])
      );
    } else {
      ccwv = ccw(
        new Point(p2x, p2y),
        new Point(p1x, p1y),
        new Point(ap[0], ap[1])
      );
    }
    if (ccwv == 1) {
      return Math.atan((p1y - p2y) / (p1x - p2x));
    } else {
      return Math.atan((p1y - p2y) / (p1x - p2x)) + Math.PI;
    }
  }
};

let avgF = 1000;
let numF = 0;
const refCheck = (ref, d, ref_LR) => {
  let R_S = 0,
    R_E = Math.PI / 2;
  while (R_S + 0.006 < R_E) {
    R = (R_S + R_E) / 2;
    if (fixed_F) {
      F = fixed_F;
      DRF();
    } else if (numF == numFmax) {
      F = avgF;
      DRF();
    } else {
      let F_S = 0,
        F_E = 1e8;
      while (F_S + 0.1 < F_E) {
        F = (F_S + F_E) / 2;
        DRF();
        if (distance(ref[0], ref[1]) > distance(ref[1], ref[2])) {
          F_S = F;
        } else {
          F_E = F;
        }
      }
    }
    if (F < 10 || F > 10000 || R > 1.4) {
      F = avgF;
      DRF();
    }
    if (distance(ref[0], ref[2]) > distance(ref_LR[0], ref_LR[1])) {
      R_S = R;
    } else {
      R_E = R;
    }
  }
  if (avgF != F) {
    avgF = (numF * avgF + F) / (numF + 1);
    numF++;
    F = avgF;
    DRF();
  }
  D *= (d + d) / distance(ref[0], ref[2]);
  DRF();
  currentD = D;
  currentR = R;
  currentTheta = theta;
  gridGraphic();
};

const gridGraphic = () => {
  if (!DRF_measure) return;
  for (let Y = -1000; Y < 1000; Y += 40) {
    for (let X = -1000; X < 1000; X += 40) {
      let t = new Point(X, Y, 1);
      t.screen();
      ctx.fillStyle = "#E2E";
      ctx.fillRect(t.x(), t.y(), 6, 6);
    }
  }
};

const sixPoints = (points) => {
  points.forEach((point) => {
    point.screen();
  });
  let p_temp;
  let height;
  let height_S = 0,
    height_E = 1e6;
  while (height_S + 0.1 < height_E) {
    height = (height_S + height_E) / 2;
    let p_top = plane_H(points[0], height);
    let p_left = plane_H(points[1], height);
    let p_right = plane_H(points[2], height);
    let cx = (p_left.x() + p_right.x()) / 2;
    let cy = (p_left.y() + p_right.y()) / 2;
    p_temp = new Point(2 * cx - p_top.x(), 2 * cy - p_top.y(), 1);
    let p = screen_H(p_temp, height);
    if (pillar(p, points[3]) > height) {
      height_S = height;
    } else {
      height_E = height;
    }
  }
  width = distance_H(points[1], points[0], height);
  depth = distance_H(points[2], points[0], height);

  if (width > depth) {
    return {
      height: height,
      width: width,
      depth: depth,
      score: (depth - distance(points[3], p_temp)) / depth,
    };
  } else {
    return {
      height: height,
      width: depth,
      depth: width,
      score: (width - distance(points[3], p_temp)) / width,
    };
  }
};
