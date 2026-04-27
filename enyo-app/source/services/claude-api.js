enyo.kind({
    name: "App.ClaudeAPI",
    kind: "enyo.Component",

    API_URL:     "https://api.anthropic.com/v1/messages",
    API_VERSION: "2023-06-01",
    TIMEOUT_MS:  60000,

    // onSuccess(responseText), onError(message)
    // retryOnce: internal flag — do not pass externally
    sendMessage: function(apiKey, model, messages, systemPrompt, onSuccess, onError, retryOnce) {
        var self = this;
        var payload = {
            model: model,
            max_tokens: 1024,
            messages: messages
        };
        if (systemPrompt) {
            payload.system = systemPrompt;
        }

        var xhr = new XMLHttpRequest();
        xhr.open("POST", this.API_URL, true);
        xhr.setRequestHeader("x-api-key", apiKey);
        xhr.setRequestHeader("anthropic-version", this.API_VERSION);
        xhr.setRequestHeader("content-type", "application/json");
        // Required for direct browser XHR to the Anthropic API (acknowledges exposed key risk)
        xhr.setRequestHeader("anthropic-dangerous-direct-browser-access", "true");
        xhr.timeout = this.TIMEOUT_MS;

        // Guard against onerror + onreadystatechange both firing for the same failure
        var settled = false;
        function succeed(text) { if (!settled) { settled = true; onSuccess(text); } }
        function fail(msg)     { if (!settled) { settled = true; onError(msg); } }

        xhr.onreadystatechange = function() {
            if (xhr.readyState !== 4) { return; }

            if (xhr.status === 200) {
                try {
                    var resp = JSON.parse(xhr.responseText);
                    succeed(resp.content[0].text);
                } catch (e) {
                    fail("Failed to parse response: " + e.message);
                }
            } else if (xhr.status === 0) {
                // Status 0: network/proxy dropped the connection. Retry once.
                if (!retryOnce) {
                    setTimeout(function() {
                        self.sendMessage(apiKey, model, messages, systemPrompt,
                            onSuccess, onError, true);
                    }, 800);
                } else {
                    fail("Network error. Check your SSL proxy connection.");
                }
            } else {
                var msg = "API error (" + xhr.status + ")";
                try {
                    var err = JSON.parse(xhr.responseText);
                    if (err.error && err.error.message) {
                        msg = err.error.message;
                    }
                } catch (e) {}
                fail(msg);
            }
        };

        xhr.onerror = function() {
            // Status 0 on old WebKit often means the SSL proxy dropped a cold
            // connection. Retry once automatically before surfacing an error.
            if (!retryOnce) {
                setTimeout(function() {
                    self.sendMessage(apiKey, model, messages, systemPrompt,
                        onSuccess, onError, true);
                }, 800);
            } else {
                fail("Network error. Check your SSL proxy connection.");
            }
        };

        xhr.ontimeout = function() {
            fail("Request timed out after 60 seconds.");
        };

        xhr.send(JSON.stringify(payload));
    }
});
