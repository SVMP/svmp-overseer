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
            $.removeCookie("svmpData");
            window.location.replace("/webclient-login");
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
    sinfo = new pbuf.Request({"type" : pbuf.Request.RequestType.SCREENINFO});
    socket.send(sinfo.encodeDelimited().toArrayBuffer());
    providerinfo = new pbuf.LocationProviderInfo({
        "provider" : "GPS_PROVIDER",
        "requiresNetwork" : true,
        "requiresSatellite" : true,
        "requiresCell" : true,
        "hasMonetaryCost" : false,
        "supportsAltitude" : true,
        "supportsSpeed" : true,
        "supportsBearing" : true,
        "powerRequirement" : 1,
        "accuracy" : 1 });
    locReq = new pbuf.LocationRequest({"type" : pbuf.LocationRequest.LocationRequestType.PROVIDERINFO, "providerInfo" : providerinfo});
    locReqCont = new pbuf.Request({"type": pbuf.Request.RequestType.LOCATION, "locationRequest": locReq});
    socket.send(locReqCont.encodeDelimited().toArrayBuffer());
    providerinfo.provider = "NETWORK_PROVIDER";
    socket.send(locReqCont.encodeDelimited().toArrayBuffer());
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
            scaledX = window.currtouches[i].pageX - canvas.offsetLeft;
            scaledY = window.currtouches[i].pageY - canvas.offsetTop;
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