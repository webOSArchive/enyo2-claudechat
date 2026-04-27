enyo.kind({
    name: "App.Credentials",
    kind: "enyo.Component",

    KEY_APIKEY:    "claudechat-apikey",
    KEY_MODEL:     "claudechat-model",
    KEY_SYSPROMPT: "claudechat-sysprompt",

    // Baked-in default: explains the device context so Claude adjusts its style
    DEFAULT_SYSTEM_PROMPT: [
        "You are a helpful assistant. This conversation is taking place on a vintage",
        "HP TouchPad tablet (2011) running the webOS operating system, using an older",
        "WebKit-based browser. The user reads on a 9.7-inch touchscreen and types on",
        "an on-screen keyboard. Please prefer plain text over markdown formatting --",
        "avoid headers, heavy bullet nesting, and fenced code blocks when possible.",
        "Keep responses clear and complete, but be mindful that very long responses",
        "are harder to read on this device."
    ].join(" "),

    getApiKey: function() {
        return localStorage.getItem(this.KEY_APIKEY) || "";
    },
    setApiKey: function(key) {
        localStorage.setItem(this.KEY_APIKEY, key);
    },

    getModel: function() {
        return localStorage.getItem(this.KEY_MODEL) || "claude-haiku-4-5-20251001";
    },
    setModel: function(model) {
        localStorage.setItem(this.KEY_MODEL, model);
    },

    getSystemPrompt: function() {
        var stored = localStorage.getItem(this.KEY_SYSPROMPT);
        return (stored !== null) ? stored : this.DEFAULT_SYSTEM_PROMPT;
    },
    setSystemPrompt: function(prompt) {
        localStorage.setItem(this.KEY_SYSPROMPT, prompt);
    },

    hasApiKey: function() {
        return !!this.getApiKey();
    },

    clear: function() {
        localStorage.removeItem(this.KEY_APIKEY);
        localStorage.removeItem(this.KEY_MODEL);
        localStorage.removeItem(this.KEY_SYSPROMPT);
    }
});
