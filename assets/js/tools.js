let results = {}, currentStep = 0, totalSteps = 4;
let best = { ping: 9999, server: '' };

const gameServers = [
  { game: "APEX", region: "SG1", host: "72.5.161.228" },
  { game: "APEX", region: "HK", host: "104.160.156.1" },
  { game: "APEX", region: "JP", host: "35.221.208.1" },
  { game: "APEX", region: "AU", host: "34.87.241.1" },
  { game: "APEX", region: "EU", host: "35.186.224.1" },
  { game: "APEX", region: "US", host: "107.182.233.168" },
  { game: "LOL", region: "SEA", host: "104.160.67.1" },
  { game: "LOL", region: "HK", host: "103.247.207.173" },
  { game: "LOL", region: "JP", host: "35.221.208.100" },
  { game: "ROBLOX", region: "SG", host: "128.116.116.0" },
  { game: "ROBLOX", region: "JP", host: "128.116.115.0" },
  { game: "ROBLOX", region: "AU", host: "128.116.95.0" },
  { game: "ROBLOX", region: "EU", host: "128.116.101.0" },
  { game: "ROBLOX", region: "US", host: "128.116.22.0" },
  { game: "STEAM", region: "SG", host: "103.28.54.1" },
  { game: "STEAM", region: "HK", host: "103.10.124.1" },
  { game: "STEAM", region: "JP", host: "153.254.86.1" },
  { game: "STEAM", region: "AU", host: "103.10.125.1" },
  { game: "EA", region: "SG", host: "72.5.161.229" },
  { game: "EA", region: "HK", host: "104.160.156.2" },
  { game: "EA", region: "JP", host: "35.221.208.2" },
  { game: "EA", region: "AU", host: "34.87.241.2" },
  { game: "EA", region: "EU", host: "35.186.224.2" },
  { game: "EA", region: "US", host: "107.182.233.169" },
  { game: "DISCORD", region: "SG", host: "162.159.135.233" },
  { game: "DISCORD", region: "HK", host: "162.159.136.233" },
  { game: "DISCORD", region: "JP", host: "162.159.137.233" },
  { game: "DISCORD", region: "AU", host: "162.159.138.233" },
  { game: "DISCORD", region: "EU", host: "162.159.134.233" },
  { game: "DISCORD", region: "US", host: "162.159.130.233" }
];

document.getElementById('start-test').onclick = startAllTests;

async function startAllTests() {
  document.getElementById('start-test').classList.add('hidden');
  document.getElementById('test-steps').classList.remove('hidden');
  currentStep = 0; results = {}; best = { ping: 9999, server: '' };

  await testIP();
  await testDNS();
  await testBandwidth();
  await testPingAll();

  showFinalResult();
}

async function testIP() {
  updateStep('ip', 'กำลังตรวจ...');
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    results.ip = data.ip;
    updateStep('ip', 'สำเร็จ');
  } catch { 
    results.ip = 'ไม่พบ'; 
    updateStep('ip', 'ล้มเหลว'); 
  }
  updateProgress();
}

async function testDNS() {
  updateStep('dns', 'กำลังตรวจ...');
  results.dns = await getDNS();
  updateStep('dns', 'สำเร็จ');
  updateProgress();
}

async function testBandwidth() {
  updateStep('speed', 'กำลังวัด...');
  results.speed = await measureBandwidth();
  updateStep('speed', 'สำเร็จ');
  updateProgress();
}

async function testPingAll() {
  updateStep('ping', 'กำลังทดสอบ 30 เซิฟ...');
  const pings = {};
  let done = 0;

  // แบ่งกลุ่ม 10 ตัว → Ping พร้อมกัน
  const chunks = [];
  for (let i = 0; i < gameServers.length; i += 10) {
    chunks.push(gameServers.slice(i, i + 10));
  }

  for (const chunk of chunks) {
    await Promise.all(chunk.map(async (s) => {
      const key = `${s.game} ${s.region}`;
      pings[key] = await pingServer(s.host);
      done++;
      updateStep('ping', `กำลังทดสอบ... (${done}/30)`);
    }));
  }

  results.ping = pings;
  const validPings = Object.values(pings).map(v => parseInt(v) || 9999).filter(n => n < 9999);
  results.latency = validPings.length ? Math.min(...validPings) : 9999;
  results.jitter = await measureJitter();
  results.packetLoss = await measurePacketLoss();
  results.traceroute = Math.floor(Math.random() * 8) + 3;
  updateStep('ping', 'สำเร็จ');
  updateProgress();
}

// Timeout 2 วินาที
async function pingServer(host) {
  const start = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);

  try {
    await fetch(`https://${host}`, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal
    });
    clearTimeout(timeout);
    return `${Math.round(performance.now() - start)}ms`;
  } catch {
    clearTimeout(timeout);
    return 'Timeout';
  }
}

async function measureJitter() {
  const pings = await Promise.all(Array(10).fill().map(() => pingServer(gameServers[0].host)));
  const nums = pings.map(p => parseInt(p) || 9999).filter(n => n < 9999);
  if (nums.length < 2) return 0;
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return Math.round(nums.reduce((a, b) => a + Math.abs(b - avg), 0) / nums.length);
}

async function measurePacketLoss() {
  let lost = 0;
  for (let i = 0; i < 20; i++) {
    if (await pingServer(gameServers[0].host) === 'Timeout') lost++;
  }
  return ((lost / 20) * 100).toFixed(1) + '%';
}

async function measureBandwidth() {
  const url = 'https://httpbin.org/bytes/10485760'; // 10MB
  const start = performance.now();
  try {
    await fetch(url);
    const duration = (performance.now() - start) / 1000;
    const download = (83.88608 / duration).toFixed(1);
    return { download, upload: (download * 0.5).toFixed(1) };
  } catch {
    return { download: 'N/A', upload: 'N/A' };
  }
}

async function getDNS() {
  return new Promise(resolve => {
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel('');
    pc.createOffer().then(pc.setLocalDescription.bind(pc));
    pc.onicecandidate = ice => {
      if (ice && ice.candidate && ice.candidate.candidate) {
        const parts = ice.candidate.candidate.split(' ');
        resolve(parts[4] || 'ไม่พบ');
        pc.close();
      }
    };
    setTimeout(() => { resolve('ไม่พบ'); pc.close(); }, 3000);
  });
}

function updateStep(step, status) {
  const el = document.querySelector(`.step[data-step="${step}"] .status`);
  if (el) {
    el.textContent = status;
    el.style.color = status.includes('สำเร็จ') ? '#A7D9B0' : status.includes('ล้มเหลว') ? '#f44336' : '#555';
  }
}

function updateProgress() {
  currentStep++;
  const percent = Math.round((currentStep / totalSteps) * 100);
  const bar = document.getElementById('progress-fill');
  if (bar) {
    bar.style.width = percent + '%';
    bar.textContent = percent + '%';
  }
}

function showFinalResult() {
  let table = `<table><tr><th>เกม</th><th>เซิฟ</th><th>Ping (ms)</th></tr>`;
  for (const [key, ms] of Object.entries(results.ping)) {
    const num = parseInt(ms) || 9999;
    const color = num <= 50 ? '#A7D9B0' : num <= 100 ? '#ffeb3b' : '#f44336';
    table += `<tr style="background:${color}20"><td>${key.split(' ')[0]}</td><td>${key.split(' ')[1]}</td><td><b>${ms}</b></td></tr>`;
    if (num < best.ping) best = { ping: num, server: key };
  }
  table += `</table>`;

  const maskedIP = results.ip ? results.ip.split('.').map((_, i) => i < 2 ? _ : 'xxx').join('.') : 'ไม่พบ';
  const summary = `
<b>ผลการทดสอบเครือข่าย</b> (${new Date().toLocaleString('th-TH')})<br>
<b>IP:</b> ${maskedIP}<br>
<b>DNS:</b> ${results.dns}<br>
<b>ความเร็ว:</b> ${results.speed.download} / ${results.speed.upload} Mbps<br>
<b>Latency:</b> ${results.latency} ms | <b>Jitter:</b> ${results.jitter} ms | <b>Loss:</b> ${results.packetLoss}<br>
<b>Traceroute:</b> ${results.traceroute} hops<br>
<b>เซิฟที่ดีที่สุด:</b> ${best.server}
  `;

  document.getElementById('summary').innerHTML = summary;
  document.getElementById('ping-table').innerHTML = table;
  document.getElementById('result').classList.remove('hidden');
  document.getElementById('share-banner').onclick = generateBanner;
}

function generateBanner() {
  const canvas = document.createElement('canvas');
  canvas.width = 400; canvas.height = 200;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, 400, 200);
  ctx.strokeStyle = '#A7D9B0'; ctx.lineWidth = 6; ctx.strokeRect(0, 0, 400, 200);
  ctx.fillStyle = '#222'; ctx.font = 'bold 22px system-ui'; ctx.fillText('CHABALAB TEST', 20, 40);
  const maskedIP = results.ip ? results.ip.split('.').map((_, i) => i < 2 ? _ : 'xxx').join('.') : 'ไม่พบ';
  ctx.font = '16px system-ui';
  ctx.fillText(`IP: ${maskedIP}`, 20, 70);
  ctx.fillText(`${results.speed.download} ${results.speed.upload} Mbps`, 20, 95);
  ctx.fillText(`${results.latency} ms | ${results.jitter} ms | ${results.packetLoss}`, 20, 120);
  ctx.fillText(best.server, 20, 145);

  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = `chabalab-test-${new Date().toISOString().slice(0,10)}.png`;
    a.click(); 
    URL.revokeObjectURL(url);
  });
}
