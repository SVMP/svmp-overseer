function maybePlay() {
    if(document.getElementById("rtcvidstream") <= HTMLMediaElement.HAVE_CURRENT_DATA) {
        setTimeout(500, maybePlay);
    }
    else {
        document.getElementById("rtcvidstream").play();
    }
}

function setPlayerDimensions(w, h) {
    var vid = document.getElementById("rtcvidstream");
    vid.setAttribute("width", w);
    vid.setAttribute("height", h);
    var canv = document.getElementById("touchcanvas");
    canv.setAttribute("width", w);
    canv.setAttribute("height", h);
}

function updateLocation(pbuf, provider) {
    navigator.geolocation.getCurrentPosition(function(pos) {
        var locUpdate = new pbuf.LocationUpdate({
            "latitude" : pos.coords.latitude,
            "longitude" : pos.coords.longitude,
            "time" : pos.timestamp,
            "provider" : provider,
            "accuracy" : pos.coords.accuracy,
            "altitude" : pos.coords.altitude,
            "bearing" : pos.coords.heading,
            "speed" : pos.coords.speed
        });
        var locUpdateRequest = new pbuf.Request({"type" : pbuf.Request.RequestType.LOCATION, "locationRequest" : new pbuf.LocationRequest({"type" : pbuf.LocationRequest.LocationRequestType.LOCATIONUPDATE, "update" : locUpdate})});
        window.socket.send(locUpdateRequest.encodeDelimited().toArrayBuffer());
    },
    function(err) {
        return;
    },
    {
        enableHighAccuracy: (provider == "GPS_PROVIDER"),
        timeout: 1000,
        maximumAge: 0
    });
}

function repeatUpdateLocation(pbuf, provider, timeout) {
    updateLocation(pbuf, provider);
    window.setTimeout(repeatUpdateLocation, timeout, pbuf, provider, timeout);
}

function handleResponse(resp, socket, pbuf) {
    if (resp.type === pbuf.Response.ResponseType.ERROR) {
        window.svmpState = "error";
        alert("Error received!");
        return;
    }

    switch(window.svmpState) {
        case "connected":
            // we are waiting for either VMREADY or AUTH_FAIL
            handleResponseConnected(resp, socket, pbuf);
            break;
        case "running":
            // connection fully established
            handleResponseRunning(resp, socket, pbuf);
            break;
    }
}

function handleResponseConnected(resp, socket, pbuf) {
    switch(resp.type) {
        case pbuf.Response.ResponseType.AUTH:
            // we received an AUTH_FAIL
            alert("Auth failed! Please re-enter your credentials.");
            $.removeCookie("svmpData", {path: '/'});
            window.location.replace("/webclient");
            break;
        case pbuf.Response.ResponseType.VMREADY:
            console.log("Received VMREADY");
            window.svmpState = "running";
            console.log('SVMP state: "connected" -> "running"');

            // send initial Request messages...
            sendInitRequests(socket, pbuf);

            // setup WebRTC connection
            setupWebRTC(socket, pbuf);
            break;
        default:
            alert("Unexpected message!", resp.type);
    }
}

function sendInitRequests(socket, pbuf) {
    // send LOCATION requests
    providerinfo = new pbuf.LocationProviderInfo({
        "provider" : "gps",
        "requiresNetwork" : true,
        "requiresSatellite" : true,
        "requiresCell" : false,
        "hasMonetaryCost" : false,
        "supportsAltitude" : true,
        "supportsSpeed" : true,
        "supportsBearing" : true,
        "powerRequirement" : 1,
        "accuracy" : 1 });
    locReq = new pbuf.LocationRequest({"type" : pbuf.LocationRequest.LocationRequestType.PROVIDERINFO, "providerInfo" : providerinfo});
    locReqCont = new pbuf.Request({"type": pbuf.Request.RequestType.LOCATION, "locationRequest": locReq});
    socket.send(locReqCont.encodeDelimited().toArrayBuffer());
    providerinfo.provider = "network";
    providerinfo.requiresSatellite = false;
    providerinfo.requiresCell = true;
    socket.send(locReqCont.encodeDelimited().toArrayBuffer());

    // send TIMEZONE request
    sinfo = new pbuf.Request({"type" : pbuf.Request.RequestType.TIMEZONE, "timezoneId": jstz.determine().name()});
    socket.send(sinfo.encodeDelimited().toArrayBuffer());

    // send SCREENINFO request
    sinfo = new pbuf.Request({"type" : pbuf.Request.RequestType.SCREENINFO});
    socket.send(sinfo.encodeDelimited().toArrayBuffer());

    // send CONFIG request (disables software keyboard on VM)
    var softKeyboard = false;
    sendKeyboardConfig(softKeyboard, socket, pbuf);

    // send APPS request
    sinfo = new pbuf.Request({"type" : pbuf.Request.RequestType.APPS, "apps": {"type": pbuf.AppsRequest.AppsRequestType.LAUNCH}});
    socket.send(sinfo.encodeDelimited().toArrayBuffer());

    window.currtouches = [];
}

function setupWebRTC(socket, pbuf) {
    // FIXME: looks like we don't do anything with the WebRTC info we received (window.svmpData.webrtc)
//    console.log("Received VIDSTREAMINFO:\niceServers: " + resp.videoInfo.iceServers + "\npcConstraints: " + resp.videoInfo.pcConstraints + "\nvideoConstraints: " + resp.videoInfo.videoConstraints);

    // FIXME: looks like these gets created and nothing happens to them afterwards?
    rtcmsgreq = new pbuf.Request({"type" : pbuf.Request.RequestType.WEBRTC});
    rtcmsg = new pbuf.WebRTCMessage({"type" : pbuf.WebRTCMessage.WebRTCType.OFFER});

    // FIXME: create an offer...? https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
    window.rtcpeer = RTCPeerConnection({
        iceServers: window.svmpData.webrtc.ice_servers,
        attachStream     : null,
        onICE            : function(candidate) {
            // convert fields to those that svmpd expects to see
            var obj = {
                type: "candidate",
                id: candidate.sdpMid,
                label: candidate.sdpMLineIndex,
                candidate: candidate.candidate
            };

            tmpreq = new pbuf.Request({"type" : pbuf.Request.RequestType.WEBRTC});
            tmprtc = new pbuf.WebRTCMessage({"type" : pbuf.WebRTCMessage.WebRTCType.CANDIDATE, "json" : JSON.stringify(obj)});
            tmpreq.webrtcMsg = tmprtc
            socket.send(tmpreq.encodeDelimited().toArrayBuffer());
        },
        onRemoteStream    : function(stream) {
            if(window.browser) {
                document.getElementById("rtcvidstream").mozSrcObject = stream;
            }
            else {
                document.getElementById("rtcvidstream").src = URL.createObjectURL(stream);
            }
            setTimeout(500, maybePlay);
            //document.getElementById("loginbox").setAttribute("class", "hide");
            document.getElementById("touchcanvas").setAttribute("class", "");
            window.addEventListener("deviceorientation", function(ev) { handleRotation(ev, socket, pbuf); });
        },
        onOfferSDP        : function(sdp) {
            tmpreq = new pbuf.Request({"type" : pbuf.Request.RequestType.WEBRTC});
            tmprtc = new pbuf.WebRTCMessage({"type" : pbuf.WebRTCMessage.WebRTCType.OFFER, "json" : JSON.stringify(sdp)});
            tmpreq.webrtcMsg = tmprtc;
            socket.send(tmpreq.encodeDelimited().toArrayBuffer());
        }
    });
}

function handleResponseRunning(resp, socket, pbuf) {
    switch(resp.type) {
        case pbuf.Response.ResponseType.AUTH:
            if (resp.authResponse.type == pbuf.AuthResponse.AuthResponseType.SESSION_MAX_TIMEOUT) {
                alert("Session timed out!");
            } else {
                alert("Unexpected AUTH message!", resp.authResponse.type);
            }
            break;
        case pbuf.Response.ResponseType.SCREENINFO:
            console.log("Received SCREENINFO: " + resp.screenInfo.x + ", " + resp.screenInfo.y);
            window.screeninfoX = resp.screenInfo.x;
            window.screeninfoY = resp.screenInfo.y;
            setTimeout(function() {
                window.xsf = window.screeninfoX / document.documentElement.clientWidth;
                window.ysf = window.screeninfoY / document.documentElement.clientHeight;
            }, 500);
            setPlayerDimensions(window.screeninfoX, window.screeninfoY);
            window.rotation = 0;
            break;
        case pbuf.Response.ResponseType.INTENT:
            console.log("Received INTENT:\naction: " + resp.intent.action + "\ndata: " + resp.intent.data);
            switch(resp.intent.action) {
                case pbuf.IntentAction.ACTION_VIEW:
                    console.log("Somehow got an ACTION_VIEW");
                    break;
                case pbuf.IntentAction.ACTION_DIAL:
                    window.open(resp.intent.data, "_blank");
                    break;
            }
            break;
        case pbuf.Response.ResponseType.NOTIFICATION:
            console.log("Received NOTIFICATION");
            if (resp.notification.contentTitle !== "Select keyboard layout")
                // we don't want to pass along this keyboard layout notification...
                alert(resp.notification.contentTitle + "\n" + resp.notification.contentText);
            break;
        case pbuf.Response.ResponseType.LOCATION:
            switch(resp.locationResponse.type) {
                case pbuf.LocationResponse.LocationResponseType.SUBSCRIBE:
                    switch(resp.locationResponse.subscribe.type) {
                        case pbuf.LocationSubscribe.LocationSubscribeType.SINGLE_UPDATE:
                            updateLocation(resp.locationResponse.subscribe.provider);
                        case pbuf.LocationSubscribe.LocationSubscribeType.MULTIPLE_UPDATES:
                            if(typeof(resp.locationResponse.subscribe.minDistance) == "undefined") {
                                window.locationUpdateID = window.setTimeout(repeatUpdateLocation, resp.locationResponse.subscribe.minTime, pbuf, resp.locationResponse.subscribe.provider, resp.locationResponse.subscribe.minTime);
                            }
                            else {
                                updateLocation(pbuf, resp.locationResponse.subscribe.provider);
                            }
                    }
                    break;
                case pbuf.LocationResponse.LocationResponseType.UNSUBSCRIBE:
                    // Do unsubscription
                    if(window.locationUpdateID != null) {
                        window.clearTimeout(window.locationUpdateID);
                        window.locationUpdateID = null;
                    }
                    break;
            }
            console.log("Received LOCATION");
            break;
        case pbuf.Response.ResponseType.WEBRTC:
            console.log("Received WebRTC: " + resp.webrtcMsg);
            switch(resp.webrtcMsg.type) {
                case pbuf.WebRTCMessage.WebRTCType.OFFER:
                    console.log("Ignoring WebRTC offer");
                    break;
                case pbuf.WebRTCMessage.WebRTCType.ANSWER:
                    window.rtcpeer.addAnswerSDP(JSON.parse(resp.webrtcMsg.json));
                    break;
                case pbuf.WebRTCMessage.WebRTCType.BYE:
                    console.log("WebRTC message with bad type: " + resp.webrtcMsg.type);
                    break;
                case pbuf.WebRTCMessage.WebRTCType.CANDIDATE:
                default:
                    cand = JSON.parse(resp.webrtcMsg.json);
                    console.log(cand);
                    if(cand["type"] == "candidate") {
                        window.rtcpeer.addICE({
                            sdpMLineIndex: cand.sdpMLineIndex,
                            candidate: cand.candidate
                        });
                    }
                    else if(cand["type"] == "answer") {
                        window.rtcpeer.addAnswerSDP(cand);
                    }
                    break;
            }
            break;
        case pbuf.Response.ResponseType.PING:
            console.log("Pong!");
            break;
        case pbuf.Response.ResponseType.APPS:
            console.log("Received APPS");
            break;
        default:
            alert("Unexpected message!", resp.type);
            break;
    }
}

function handleTouch(ev, socket, pbuf, touchtype) {
    ev.preventDefault();
    var touchmsg = new pbuf.TouchEvent({});
    var touchmsgs = new Array();
    var canvas = document.getElementById("touchcanvas");
    for(var i = 0; i < window.currtouches.length; i++) {
        var scaledX = 0;
        var scaledY = 0;
        if(window.isMobile) {
            scaledX = window.currtouches[i].pageX * window.xsf;
            scaledY = window.currtouches[i].pageY * window.ysf;
        }
        else {
            var rect = canvas.getBoundingClientRect();
            scaledX = window.currtouches[i].pageX - rect.left;
            scaledY = window.currtouches[i].pageY - rect.top;
        }
        var msg = new pbuf.TouchEvent.PointerCoords({"id" : window.currtouches[i].identifier, "x" : scaledX, "y" : scaledY});
        touchmsgs.push(msg);
    }
    if(touchtype != 2) {
        for(var i = 0; i < window.currtouches.length; i++) {
            touchmsg.items = touchmsgs;
            touchmsg.action = ((window.currtouches[i].identifier > 0 ? touchtype + 5 : touchtype) | (window.currtouches[i].identifier << 8));
            var cont = new pbuf.Request({"type" : pbuf.Request.RequestType.TOUCHEVENT, "touch" : touchmsg});
            socket.send(cont.encodeDelimited().toArrayBuffer());
        }
    }
    else {
        touchmsg.items = touchmsgs;
        touchmsg.action = touchtype;
        var cont = new pbuf.Request({"type" : pbuf.Request.RequestType.TOUCHEVENT, "touch" : touchmsg});
        socket.send(cont.encodeDelimited().toArrayBuffer());
    }
}

function copyTouch(touch) {
    return { identifier : touch.identifier, pageX : touch.pageX, pageY : touch.pageY };
}

function findTouch(id) {
    for(var i = 0; i < window.currtouches.length; i++) {
        if(id == window.currtouches[i].identifier) return i;
    }
    return -1;
}

function handleTouchStart(ev, socket, pbuf) {
    for(var i = 0; i < ev.changedTouches.length; i++) {
        window.currtouches.push(copyTouch(ev.changedTouches[i]));
    }
    handleTouch(ev, socket, pbuf, 0);
}

function handleMouseStart(ev, socket, pbuf) {
    window.currtouches.push({ identifier : 0, pageX : ev.pageX, pageY : ev.pageY });
    handleTouch(ev, socket, pbuf, 0)
}

function handleTouchEnd(ev, socket, pbuf) {
    handleTouch(ev, socket, pbuf, 1);
    for(var i = 0; i < ev.changedTouches.length; i++) {
        window.currtouches.splice(findTouch(ev.changedTouches[i].identifier), 1);
    }
}

function handleMouseEnd(ev, socket, pbuf) {
    handleTouch(ev, socket, pbuf, 1);
    window.currtouches = Array();
}

function handleTouchMove(ev, socket, pbuf) {
    for(var i = 0; i < ev.changedTouches.length; i++) {
        window.currtouches.splice(findTouch(ev.changedTouches[i].identifier), 1, copyTouch(ev.changedTouches[i]));
    }
    handleTouch(ev, socket, pbuf, 2);
}

function handleMouseMove(ev, socket, pbuf) {
    if(window.currtouches.length != 0) {
        window.currtouches.splice(findTouch(0), 1, { identifier : 0, pageX : ev.pageX, pageY : ev.pageY });
        handleTouch(ev, socket, pbuf, 2);
    }
}

function handleRotation(ev, socket, pbuf) {
    var beta = ev.beta;
    var gamma = ev.gamma;
    var diff = Math.abs(beta) - Math.abs(gamma);
    if(diff < 0) { // |Gamma| > |Beta|
        if(Math.abs(gamma) > 45) {
            if(window.rotation % 2 == 0) {
                window.rotation = 2 + Math.round(gamma / Math.abs(gamma));
                //setPlayerDimensions(window.screenY, window.screenX);
                window.canvasctx.save();
                window.canvasctx.rotate((window.rotation - 2) * 90 * Math.PI / 180);
                window.canvasctx.restore();
            }
        }
        else {
            if(window.rotation != 0) {
                //setPlayerDimensions(window.screenX, window.screenY);
                window.canvasctx.save();
                window.canvasctx.rotate((window.rotation - 2) * -90 * Math.PI / 180);
                window.canvasctx.restore();
                window.rotation = 0;
            }
        }
    }
    else {
        if(window.rotation != 0) {
            //setPlayerDimensions(window.screenX, window.screenY);
            window.canvasctx.save();
            window.canvasctx.rotate((window.rotation - 2) * -90 * Math.PI / 180);
            window.canvasctx.restore();
            window.rotation = 0;
        }
    }
    var cont = new pbuf.Request({"type" : pbuf.Request.RequestType.ROTATION_INFO, "rotationInfo" : new pbuf.RotationInfo({"rotation" : window.rotation})});
    socket.send(cont.encodeDelimited().toArrayBuffer());
}

/***************************************************************
*                       KEYBOARD SUPPORT                       *
***************************************************************/

// toggles the software keyboard on the VM on or off
function sendKeyboardConfig(softKeyboard, ws, svmp) {
    var configRequest = new svmp.Request({"type" : svmp.Request.RequestType.CONFIG, "config": {"hardKeyboard": !softKeyboard}});
    ws.send(configRequest.encodeDelimited().toArrayBuffer());
}

// event handler for DOM
function handleKeyDown(ev, ws, svmp) {
    // translate ASCII key code to Android key code
    var keyCode = translateKeyCode(ev.which);

    // if it's a modifier key, change the state machine
    modifierKeyState(keyCode, true);

    // if the key code was valid, send it over the wire
    if (keyCode >= 0) {
        ev.preventDefault(); // prevent default behavior for this key press
        androidKeyDown(keyCode, ws, svmp); // send the key code to the VM
    }
}

// event handler for DOM
function handleKeyUp(ev, ws, svmp) {
    // translate ASCII key code to Android key code
    var keyCode = translateKeyCode(ev.which);

    // if it's a modifier key, change the state machine
    modifierKeyState(keyCode, false);

    // if the key code was valid,
    if (keyCode >= 0) {
        ev.preventDefault(); // prevent default behavior for this key press
        androidKeyUp(keyCode, ws, svmp); // send the key code to the VM
    }
}

// basic state machine for modifier keys
function modifierKeyState(keyCode, isDown) {
    // (this will break if, for instance, both shifts are pressed down and one is let up)
    if (keyCode === SHIFT)
        SHIFT_DOWN = isDown;
    else if (keyCode === CTRL)
        CTRL_DOWN = isDown;
    else if (keyCode === ALT)
        ALT_DOWN = isDown;
}

// android modifier key codes
var SHIFT = 59;
var CTRL = 113;
var ALT = 57;

// modifier key states
var SHIFT_DOWN = false;
var CTRL_DOWN = false;
var ALT_DOWN = false;

// arguments to create a button request
var buttonRequestArg = {
    eventTime: {
        low: 0,
        high: 0,
        unsigned: false
    },
    deviceId: 2,
    flags: 72,
    downTime: {
        low: 0,
        high: 0,
        unsigned: false
    },
    action: 0,
    repeat: 0,
    metaState: 0,
    scanCode: 158,
    source: 257
};

// used for buttons (Back, Home, App Switch)
// sends key down event, and immediately sends key up event
function androidKeyDownUp(buttonCode, ws, svmp) {
    androidKeyDown(buttonCode, ws, svmp, true);
    androidKeyUp(buttonCode, ws, svmp, true);
}

// sends a key down event to the VM
function androidKeyDown(buttonCode, ws, svmp, isButton) {
    if (window.svmpState !== "running")
        return;
    var buttonRequest = new svmp.Request({type: svmp.Request.RequestType.KEYEVENT, key: buttonRequestArg});
    buttonRequest.key.code = buttonCode;

    // if this is not a button (it's a keyboard key), add any modifiers
    if (!isButton)
        addMetaState(buttonRequest);

    // send button down
    ws.send(buttonRequest.encodeDelimited().toArrayBuffer());
}

// sends a key up event to the VM
function androidKeyUp(buttonCode, ws, svmp, isButton) {
    if (window.svmpState !== "running")
        return;
    var buttonRequest = new svmp.Request({type: svmp.Request.RequestType.KEYEVENT, key: buttonRequestArg});
    buttonRequest.key.code = buttonCode;
    buttonRequest.key.action = 1;

    // if this is not a button (it's a keyboard key), add any modifiers
    if (!isButton)
        addMetaState(buttonRequest);

    // send button up
    ws.send(buttonRequest.encodeDelimited().toArrayBuffer());
}

function addMetaState(buttonRequest) {
    var metaState = 0;
    if (SHIFT_DOWN)
        metaState += 65;
    if (CTRL_DOWN)
        metaState += 12288;
    if (ALT_DOWN)
        metaState += 18;
    buttonRequest.key.metaState = metaState;
}

// translates from sane browser-generated ASCII key codes to incomprehensible Android key codes
function translateKeyCode(which) {
    var keyCode = -1;
    if (which >= 48 && which <= 57)      // JS: 0-9
        keyCode = which - 41;            // Android: 0-9
    else if (which >= 65 && which <= 90) // JS: a-z
        keyCode = which - 36;            // Android: a-z
    else if (which == 192)               // JS: `
        keyCode = 68;                    // Android: KEYCODE_GRAVE
    else if (which == 9)                 // JS: tab
        keyCode = 61;                    // Android: KEYCODE_TAB
    else if (which == 16)                // JS: shift (there is no right/left shift in Javascript)
        keyCode = SHIFT;                 // Android: KEYCODE_SHIFT_LEFT
    else if (which == 17)                // JS: ctrl (there is no right/left ctrl in Javascript)
        keyCode = CTRL;                  // Android: KEYCODE_CTRL_LEFT
    else if (which == 18)                // JS: alt (there is no right/left alt in Javascript)
        keyCode = ALT;                   // Android: KEYCODE_ALT_LEFT
    else if (which == 32)                // JS: space
        keyCode = 62;                    // Android: space
    else if (which == 189)               // JS: -
        keyCode = 69;                    // Android: KEYCODE_MINUS
    else if (which == 187)               // JS: =
        keyCode = 70;                    // Android: KEYCODE_EQUALS
    else if (which == 8)                 // JS: backspace
        keyCode = 67;                    // Android: KEYCODE_DEL
    else if (which == 46)                // JS: delete
        keyCode = 112;                   // Android: KEYCODE_FORWARD_DEL
    else if (which == 219)               // JS: [
        keyCode = 71;                    // Android: KEYCODE_LEFT_BRACKET
    else if (which == 221)               // JS: ]
        keyCode = 72;                    // Android: KEYCODE_RIGHT_BRACKET
    else if (which == 220)               // JS: \
        keyCode = 73;                    // Android: KEYCODE_BACKSLASH
    else if (which == 186)               // JS: ;
        keyCode = 74;                    // Android: KEYCODE_SEMICOLON
    else if (which == 222)               // JS: '
        keyCode = 75;                    // Android: KEYCODE_APOSTROPHE
    else if (which == 13)                // JS: ;
        keyCode = 66;                    // Android: KEYCODE_ENTER
    else if (which == 188)               // JS: ,
        keyCode = 55;                    // Android: KEYCODE_COMMA
    else if (which == 190)               // JS: .
        keyCode = 56;                    // Android: KEYCODE_PERIOD
    else if (which == 191)               // JS: /
        keyCode = 76;                    // Android: KEYCODE_SLASH
    else if (which == 36)                // JS: home
        keyCode = 122;                   // Android: KEYCODE_MOVE_HOME
    else if (which == 35)                // JS: end
        keyCode = 123;                   // Android: KEYCODE_MOVE_END
    else if (which == 33)                // JS: page up
        keyCode = 92;                    // Android: KEYCODE_PAGE_UP
    else if (which == 34)                // JS: page down
        keyCode = 93;                    // Android: KEYCODE_PAGE_DOWN
    else if (which == 38)                // JS: up arrow
        keyCode = 19;                    // Android: KEYCODE_DPAD_UP
    else if (which == 37)                // JS: left arrow
        keyCode = 21;                    // Android: KEYCODE_DPAD_LEFT
    else if (which == 39)                // JS: right arrow
        keyCode = 22;                    // Android: KEYCODE_DPAD_RIGHT
    else if (which == 40)                // JS: down arrow
        keyCode = 20;                    // Android: KEYCODE_DPAD_DOWN

    return keyCode;
}