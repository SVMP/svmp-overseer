// validate browser to make sure it's supported, and set identifying variable in window
function checkBrowser() {
    if(typeof(webkitRTCPeerConnection) == "function") {
        window.browser = 0; //chrome/opera
    }
    else if(typeof(mozRTCPeerConnection) == "function") {
        window.browser = 1; //firefox
    }
    else {
        document.getElementById("content").innerHTML = "<h1 class=\"unsupported\">This browser is not supported</h1>";
        throw { name: 'FatalError', message: 'Unsupported browser' };
    }
}

function submitCredentials(credentials, url, videoUrl) {

    $.ajax({
        type: "POST",
        url: url,
        data: credentials,
        dataType: "json",
        success: function (data, status, jqXHR) {
            // if "remember me" is checked, store a cookie; otherwise delete the cookie
            if ($("#remember").prop("checked")) {
                $.cookie("svmpRemember", credentials.username, {path: '/'}); // cookie valid across entire site
            } else {
                $.removeCookie("svmpRemember");
            }

            // store a session cookie
            var expires = (data.sessionInfo.maxLength).seconds().fromNow();
            $.cookie("svmpData", data, {expires: expires, path: '/'}); // expiring cookie, valid across entire site

            // forward location to video screen
            window.location.replace(videoUrl);
        },
        error: function (jqXHR, status) {
            //alert("Error: " + jqXHR);
            $("#error").html(jqXHR.responseJSON.msg).show();
            $("#username").focus();
        }
    });
}