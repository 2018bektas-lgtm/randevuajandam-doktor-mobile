/**
 * Self-contained WebRTC call room HTML for in-app WebView.
 * Does NOT load website pages — only PeerJS CDN + mobile signal API.
 */

export type MeetingRoomConfig = {
  role: 'hekim' | 'hasta';
  displayName: string;
  hostPeerId: string;
  iceServers: Array<Record<string, unknown>>;
  peerjs: {
    host?: string;
    port?: number;
    path?: string;
    secure?: boolean;
    key?: string;
  };
  signalUrl: string;
  accessToken: string;
  hastaAdi?: string;
  metaLine?: string;
};

export function buildMeetingRoomHtml(cfg: MeetingRoomConfig): string {
  const boot = JSON.stringify(cfg).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"/>
<meta name="color-scheme" content="dark"/>
<title>Görüşme</title>
<style>
*{box-sizing:border-box}
html,body{margin:0;padding:0;height:100%;background:#0a0f1a;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;overflow:hidden}
.lobby{min-height:100%;display:flex;flex-direction:column;justify-content:center;padding:24px 20px;max-width:480px;margin:0 auto}
.badge{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#6ee7b7;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.28);border-radius:999px;padding:6px 12px;margin-bottom:14px}
h1{font-size:1.25rem;font-weight:800;margin:0 0 8px;line-height:1.3}
.meta{font-size:14px;color:#94a3b8;margin:0 0 18px}
.hint{font-size:12px;line-height:1.5;color:#bae6fd;background:rgba(14,165,233,.1);border:1px solid rgba(14,165,233,.25);border-radius:14px;padding:12px 14px;margin-bottom:18px}
.btn{width:100%;border:0;border-radius:16px;cursor:pointer;background:linear-gradient(180deg,#d4783a,#C96A2B);color:#fff;font-size:16px;font-weight:800;padding:16px 20px}
.btn:disabled{opacity:.55}
.status{margin-top:14px;font-size:13px;color:#cbd5e1;text-align:center;min-height:1.4em}
.status.err{color:#fca5a5}
.call{display:none;position:fixed;inset:0;background:#000;z-index:50}
.call.active{display:block}
#remoteVideo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#0a0f1a}
.ph{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#94a3b8;font-size:14px;background:radial-gradient(ellipse at center,#13203a 0%,#0a0f1a 70%);pointer-events:none}
.pip{position:absolute;right:12px;bottom:100px;width:min(32vw,128px);aspect-ratio:3/4;border-radius:14px;overflow:hidden;border:2px solid rgba(255,255,255,.25);background:#111;z-index:5}
#localVideo{width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
.top{position:absolute;top:0;left:0;right:0;padding:14px 16px;padding-top:max(14px,env(safe-area-inset-top));background:linear-gradient(180deg,rgba(0,0,0,.65),transparent);z-index:6;display:flex;justify-content:space-between;align-items:flex-start}
.top strong{font-size:14px}
.top span{display:block;font-size:11px;color:#94a3b8;margin-top:2px}
.live{display:none;align-items:center;gap:6px;font-size:11px;font-weight:800;color:#6ee7b7;background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.3);border-radius:999px;padding:4px 10px}
.bar{position:absolute;left:0;right:0;bottom:0;padding:16px;padding-bottom:max(16px,env(safe-area-inset-bottom));display:flex;justify-content:center;gap:12px;background:linear-gradient(0deg,rgba(0,0,0,.7),transparent);z-index:6}
.ctrl{width:52px;height:52px;border-radius:50%;border:0;background:rgba(255,255,255,.12);color:#fff;font-size:20px;cursor:pointer}
.ctrl.off{background:rgba(239,68,68,.35)}
.ctrl.hang{background:#dc2626;width:64px}
.call-status{position:absolute;left:16px;right:16px;bottom:90px;text-align:center;font-size:13px;color:#e2e8f0;z-index:6;text-shadow:0 1px 4px #000}
</style>
</head>
<body>
<div class="lobby" id="lobby">
  <div class="badge">UYGULAMA İÇİ GÖRÜŞME</div>
  <h1 id="title">Online görüşme</h1>
  <p class="meta" id="metaLine"></p>
  <div class="hint">Kamera ve mikrofon izni istenecek. Hasta aynı randevu linkinden bağlanır. Site sayfası açılmaz.</div>
  <button class="btn" type="button" id="btnStart">Görüşmeye katıl</button>
  <div class="status" id="statusLobby"></div>
</div>
<div class="call" id="callStage" aria-hidden="true">
  <video id="remoteVideo" autoplay playsinline></video>
  <div class="ph" id="remotePlaceholder"><div style="font-size:28px">👤</div><div>Karşı taraf bekleniyor…</div></div>
  <div class="pip"><video id="localVideo" autoplay playsinline muted></video></div>
  <div class="top">
    <div><strong id="callTitle">Görüşme</strong><span id="callSub"></span></div>
    <div class="live" id="liveBadge">● CANLI</div>
  </div>
  <div class="call-status" id="statusCall"></div>
  <div class="bar">
    <button type="button" class="ctrl" id="btnMute">🎤</button>
    <button type="button" class="ctrl" id="btnCam">📷</button>
    <button type="button" class="ctrl hang" id="btnHangup">✕</button>
  </div>
</div>
<script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>
<script>
(function(){
  'use strict';
  var CFG = ${boot};
  var role = CFG.role || 'hekim';
  var displayName = CFG.displayName || 'Hekim';
  var hostPeerId = String(CFG.hostPeerId || 'room').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,60);
  var iceServers = CFG.iceServers || [{urls:'stun:stun.l.google.com:19302'}];
  var peerCfg = CFG.peerjs || {};
  var signalUrl = CFG.signalUrl;
  var token = CFG.accessToken || '';

  var title = document.getElementById('title');
  var metaLine = document.getElementById('metaLine');
  if (CFG.hastaAdi) title.textContent = CFG.hastaAdi;
  if (CFG.metaLine) metaLine.textContent = CFG.metaLine;
  document.getElementById('callTitle').textContent = CFG.hastaAdi || 'Görüşme';
  document.getElementById('callSub').textContent = CFG.metaLine || '';

  var lobby = document.getElementById('lobby');
  var callStage = document.getElementById('callStage');
  var statusLobby = document.getElementById('statusLobby');
  var statusCall = document.getElementById('statusCall');
  var localVideo = document.getElementById('localVideo');
  var remoteVideo = document.getElementById('remoteVideo');
  var remotePlaceholder = document.getElementById('remotePlaceholder');
  var liveBadge = document.getElementById('liveBadge');
  var btnStart = document.getElementById('btnStart');
  var btnMute = document.getElementById('btnMute');
  var btnCam = document.getElementById('btnCam');
  var btnHangup = document.getElementById('btnHangup');

  var localStream = null, peer = null, mediaCall = null, pc = null, pollTimer = null;
  var started = false, audioOn = true, videoOn = true;
  var seenIce = {}, lastRemoteOffer = null, lastRemoteAnswer = null;

  function setLobby(t, err){ statusLobby.textContent = t; statusLobby.className = 'status' + (err?' err':''); }
  function setCall(t){ statusCall.textContent = t; }

  async function openCamera(){
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
      throw Object.assign(new Error('Kamera API yok'), {name:'TypeError'});
    var attempts = [
      {audio:true, video:{facingMode:'user', width:{ideal:720}, height:{ideal:1280}}},
      {audio:true, video:{facingMode:'user'}},
      {audio:true, video:true},
      {audio:true, video:false}
    ];
    var last = null;
    for (var i=0;i<attempts.length;i++){
      try { return await navigator.mediaDevices.getUserMedia(attempts[i]); }
      catch(e){ last=e; if(e.name==='NotAllowedError'||e.name==='SecurityError') throw e; }
    }
    throw last || new Error('Kamera açılamadı');
  }

  function mediaErr(e){
    var n = (e&&e.name)||'Error';
    if(n==='NotAllowedError'||n==='PermissionDeniedError') return 'Kamera/mikrofon izni gerekli.';
    if(n==='NotFoundError') return 'Kamera bulunamadı.';
    if(n==='NotReadableError') return 'Kamera meşgul.';
    return 'Hata: '+n+' '+((e&&e.message)||'');
  }

  function enterCall(){
    lobby.style.display='none';
    callStage.classList.add('active');
    callStage.setAttribute('aria-hidden','false');
  }

  function showLocal(stream){
    localStream = stream;
    localVideo.srcObject = stream;
    localVideo.muted = true;
    localVideo.playsInline = true;
    localVideo.play().catch(function(){});
  }

  function showRemote(stream){
    remoteVideo.srcObject = stream;
    remoteVideo.muted = false;
    remoteVideo.volume = 1;
    remoteVideo.playsInline = true;
    if (remotePlaceholder) remotePlaceholder.style.display = 'none';
    if (liveBadge) liveBadge.style.display = 'inline-flex';
    stream.getAudioTracks().forEach(function(t){ t.enabled = true; });
    remoteVideo.play().then(function(){ setCall('Bağlandı'); }).catch(function(){ setCall('Bağlandı (ses için ekrana dokunun)'); });
  }

  function waitPeerJs(ms){
    return new Promise(function(resolve){
      if (typeof Peer !== 'undefined') return resolve(true);
      var t0 = Date.now();
      var iv = setInterval(function(){
        if (typeof Peer !== 'undefined'){ clearInterval(iv); resolve(true); }
        else if (Date.now()-t0 > ms){ clearInterval(iv); resolve(false); }
      }, 80);
    });
  }

  function connectPeerJs(){
    return new Promise(function(resolve, reject){
      var id = role === 'hekim' ? hostPeerId : undefined;
      peer = new Peer(id, {
        host: peerCfg.host || '0.peerjs.com',
        port: peerCfg.port || 443,
        path: peerCfg.path || '/',
        secure: peerCfg.secure !== false,
        key: peerCfg.key || 'peerjs',
        debug: 0,
        config: { iceServers: iceServers, sdpSemantics: 'unified-plan' }
      });
      var done = false;
      peer.on('open', function(){ if(!done){ done=true; resolve(); } });
      peer.on('error', function(err){
        if(done) return;
        if(err && err.type === 'peer-unavailable') return;
        if(err && (err.type==='network'||err.type==='server-error'||err.type==='socket-error')){
          done=true; reject(err);
        }
      });
      setTimeout(function(){ if(!done){ done=true; reject(new Error('timeout')); } }, 8000);
    });
  }

  function wireCall(call){
    mediaCall = call;
    call.on('stream', showRemote);
    call.on('close', function(){ setCall('Karşı taraf ayrıldı'); });
    call.on('error', function(err){ setCall('Hata: '+(err.type||'')); });
  }

  function startPeerJsSession(){
    if (role === 'hekim'){
      peer.on('call', function(call){
        setCall('Hasta bağlanıyor…');
        call.answer(localStream);
        wireCall(call);
      });
      setCall('Hastayı bekliyor…');
    } else {
      var tries = 0;
      var tryCall = function(){
        tries++;
        if(!peer||peer.destroyed) return;
        setCall('Hekim aranıyor… ('+tries+')');
        try {
          var call = peer.call(hostPeerId, localStream, {metadata:{name:displayName}});
          if(!call){ if(tries<25) setTimeout(tryCall,2500); return; }
          wireCall(call);
          setTimeout(function(){
            if(!remoteVideo.srcObject && tries<25){ try{call.close();}catch(e){} tryCall(); }
          }, 7000);
        } catch(e){ if(tries<25) setTimeout(tryCall,2500); }
      };
      tryCall();
    }
  }

  async function api(method, body){
    var opt = {
      method: method,
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + token,
        'X-Doktor-Token': token
      }
    };
    if (body){
      opt.headers['Content-Type'] = 'application/json';
      opt.body = JSON.stringify(body);
    }
    var res = await fetch(signalUrl, opt);
    var j = await res.json().catch(function(){ return {}; });
    if (!res.ok) throw new Error(j.message || ('HTTP '+res.status));
    return j;
  }

  async function startDiy(){
    pc = new RTCPeerConnection({ iceServers: iceServers });
    localStream.getTracks().forEach(function(t){ pc.addTrack(t, localStream); });
    pc.ontrack = function(ev){ if(ev.streams[0]) showRemote(ev.streams[0]); };
    pc.onicecandidate = function(ev){
      if(!ev.candidate) return;
      api('POST', {type:'ice', name:displayName, candidate:ev.candidate.toJSON()}).catch(function(){});
    };
    await api('POST', {type:'ping', name:displayName});
    if (role === 'hekim'){
      var offer = await pc.createOffer({offerToReceiveAudio:true, offerToReceiveVideo:true});
      await pc.setLocalDescription(offer);
      await api('POST', {type:'offer', sdp:offer.sdp, name:displayName});
      setCall('Hastayı bekliyor… (yedek kanal)');
    } else {
      setCall('Hekim bekleniyor…');
    }
    pollTimer = setInterval(diyPoll, 1200);
    diyPoll();
  }

  async function diyPoll(){
    if(!pc) return;
    try {
      var j = await api('GET');
      var other = (j.state||{})[role==='hekim'?'hasta':'hekim'] || {};
      if (role==='hasta' && other.offer && other.offer !== lastRemoteOffer){
        lastRemoteOffer = other.offer;
        await pc.setRemoteDescription({type:'offer', sdp:other.offer});
        var answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await api('POST', {type:'answer', sdp:answer.sdp, name:displayName});
      }
      if (role==='hekim' && other.answer && other.answer !== lastRemoteAnswer){
        lastRemoteAnswer = other.answer;
        if (pc.signalingState === 'have-local-offer'){
          await pc.setRemoteDescription({type:'answer', sdp:other.answer});
        }
      }
      (other.ice||[]).forEach(function(c){
        var key = JSON.stringify(c);
        if (seenIce[key]) return;
        seenIce[key] = 1;
        if (pc.remoteDescription) pc.addIceCandidate(c).catch(function(){});
      });
    } catch(e){}
  }

  async function start(ev){
    if(ev) try{ev.preventDefault();}catch(e){}
    if(started) return;
    btnStart.disabled = true;
    setLobby('Kamera izni isteniyor…');
    try {
      var stream = await openCamera();
      showLocal(stream);
      started = true;
      enterCall();
      setCall('Bağlanıyor…');
    } catch(e){
      started = false;
      btnStart.disabled = false;
      setLobby(mediaErr(e), true);
      return;
    }
    try {
      var ok = await waitPeerJs(4000);
      if (ok){
        await connectPeerJs();
        startPeerJsSession();
      } else {
        await startDiy();
      }
    } catch(e){
      try { await startDiy(); }
      catch(e2){ setCall('Bağlantı kurulamadı'); }
    }
  }

  btnStart.addEventListener('click', start);
  btnMute.addEventListener('click', function(){
    if(!localStream) return;
    audioOn = !audioOn;
    localStream.getAudioTracks().forEach(function(t){ t.enabled = audioOn; });
    btnMute.classList.toggle('off', !audioOn);
    btnMute.textContent = audioOn ? '🎤' : '🔇';
  });
  btnCam.addEventListener('click', function(){
    if(!localStream) return;
    videoOn = !videoOn;
    localStream.getVideoTracks().forEach(function(t){ t.enabled = videoOn; });
    btnCam.classList.toggle('off', !videoOn);
    btnCam.textContent = videoOn ? '📷' : '🚫';
  });
  btnHangup.addEventListener('click', function(){
    try { mediaCall && mediaCall.close(); } catch(e){}
    try { peer && peer.destroy(); } catch(e){}
    try { pc && pc.close(); } catch(e){}
    try { api('POST', {type:'hangup', name:displayName}); } catch(e){}
    if (pollTimer) clearInterval(pollTimer);
    if (localStream) localStream.getTracks().forEach(function(t){ t.stop(); });
    localStream = null;
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    peer = null; mediaCall = null; pc = null;
    started = false;
    callStage.classList.remove('active');
    lobby.style.display = '';
    btnStart.disabled = false;
    if (remotePlaceholder) remotePlaceholder.style.display = '';
    if (liveBadge) liveBadge.style.display = 'none';
    setLobby('Görüşme bitti. Tekrar katılabilirsiniz.');
  });
})();
</script>
</body>
</html>`;
}
