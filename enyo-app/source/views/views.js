// Renders a single chat message bubble (user or assistant)
enyo.kind({
    name: "App.MessageItem",
    classes: "message-item",
    published: {
        message: null
    },
    components: [
        {name: "bubble", classes: "message-bubble"}
    ],
    create: function() {
        this.inherited(arguments);
        // Re-apply message now that sub-components are guaranteed to exist.
        // In Enyo 2, the published-property change handler may fire before
        // initComponents(), so this ensures the bubble is always populated.
        if (this.message) { this.applyMessage(); }
    },
    messageChanged: function() {
        if (this.message && this.$.bubble) { this.applyMessage(); }
    },
    applyMessage: function() {
        this.$.bubble.setContent(this.message.content);
        if (this.message.role === "user") {
            this.addClass("message-user");
            this.$.bubble.addClass("bubble-user");
        } else {
            this.addClass("message-assistant");
            this.$.bubble.addClass("bubble-assistant");
        }
    }
});

// Renders one row in the history list
enyo.kind({
    name: "App.HistoryItem",
    classes: "history-item",
    published: {
        entry: null,
        entryIndex: 0
    },
    events: {
        onSelect: ""
    },
    handlers: {
        ontap: "itemTapped"
    },
    components: [
        {name: "dateLabel",    classes: "history-date"},
        {name: "previewLabel", classes: "history-preview"}
    ],
    create: function() {
        this.inherited(arguments);
        if (this.entry) { this.applyEntry(); }
    },
    entryChanged: function() {
        if (this.entry && this.$.dateLabel) { this.applyEntry(); }
    },
    applyEntry: function() {
        var d = new Date(this.entry.date);
        var months = ["Jan","Feb","Mar","Apr","May","Jun",
                      "Jul","Aug","Sep","Oct","Nov","Dec"];
        var h = d.getHours(), m = d.getMinutes();
        var dateStr = months[d.getMonth()] + " " + d.getDate() + ", " +
                      d.getFullYear() + "  " +
                      h + ":" + (m < 10 ? "0" : "") + m;
        this.$.dateLabel.setContent(dateStr);
        this.$.previewLabel.setContent(this.entry.preview || "(empty)");
    },
    itemTapped: function() {
        this.doSelect({index: this.entryIndex});
    }
});

// Scrollable list of archived conversations
enyo.kind({
    name: "App.HistoryView",
    kind: "enyo.FittableRows",
    classes: "history-view",
    published: {
        conversation: null
    },
    events: {
        onBack: "",
        onLoadConversation: ""
    },
    components: [
        {kind: "onyx.Toolbar", components: [
            {kind: "onyx.Button", content: "< Back", ontap: "goBack"},
            {tag: "span", classes: "toolbar-title", content: "Chat History"}
        ]},
        {kind: "enyo.Scroller", fit: true, horizontal: "hidden",
         components: [
            {name: "historyList", classes: "history-list"},
            {name: "emptyMsg", classes: "history-empty", showing: false,
             content: "No previous conversations yet."}
         ]}
    ],

    rendered: function() {
        this.inherited(arguments);
        this.loadHistory();
    },

    conversationChanged: function() {
        if (this.$.historyList) { this.loadHistory(); }
    },

    loadHistory: function() {
        // Clear previous items
        var children = this.$.historyList.getClientControls();
        for (var i = children.length - 1; i >= 0; i--) {
            children[i].destroy();
        }

        if (!this.conversation) { return; }
        var archived = this.conversation.getArchived();

        if (archived.length === 0) {
            this.$.emptyMsg.setShowing(true);
            return;
        }
        this.$.emptyMsg.setShowing(false);

        for (var j = 0; j < archived.length; j++) {
            var item = this.$.historyList.createComponent({
                kind: "App.HistoryItem",
                entry: archived[j],
                entryIndex: j,
                onSelect: "historySelected"
            }, {owner: this});
            item.render();
        }
    },

    historySelected: function(sender, event) {
        if (this.conversation) {
            this.conversation.resumeArchived(event.index);
        }
        this.doLoadConversation();
    },

    goBack: function() {
        this.doBack();
    }
});

// Settings panel: API key, model, system prompt, conversation management
enyo.kind({
    name: "App.SettingsView",
    kind: "enyo.FittableRows",
    classes: "settings-view",
    published: {
        isFirstRun: false,
        conversation: null  // set by RootView when opening settings
    },
    events: {
        onSaveComplete: "",
        onBack: ""
    },
    components: [
        {kind: "onyx.Toolbar", components: [
            {name: "backBtn", kind: "onyx.Button", content: "< Back", ontap: "goBack"},
            {tag: "span", classes: "toolbar-title", content: "Settings"}
        ]},
        {kind: "enyo.Scroller", fit: true, horizontal: "hidden",
         components: [
            {classes: "settings-body", components: [

                {tag: "div", classes: "settings-section-header", content: "Claude API"},

                {tag: "label", classes: "settings-label", content: "API Key"},
                {name: "apiKeyInput", kind: "onyx.Input", type: "text",
                 placeholder: "sk-ant-api03-...", classes: "settings-input"},

                {tag: "label", classes: "settings-label", content: "Model"},
                {name: "modelSelect", tag: "select", classes: "settings-select"},

                {tag: "label", classes: "settings-label", content: "System Prompt"},
                {name: "systemPromptInput", kind: "enyo.TextArea",
                 placeholder: "Custom instructions for Claude...",
                 classes: "settings-textarea"},

                {name: "saveError", tag: "div",
                 classes: "settings-error", showing: false,
                 content: "API key is required."},

                {kind: "onyx.Button", content: "Save Settings",
                 classes: "btn-primary", ontap: "saveSettings"},

                {tag: "hr", classes: "settings-divider"},

                {tag: "div", classes: "settings-section-header", content: "Conversation"},
                {kind: "onyx.Button", content: "Start New Conversation",
                 classes: "btn-action", ontap: "newConversation"},
                {kind: "onyx.Button", content: "Clear All History",
                 classes: "btn-danger", ontap: "clearHistory"},

                {tag: "hr", classes: "settings-divider"},

                {tag: "div", classes: "settings-about",
                 content: "Claude Chat for webOS  |  webosarchive.org"}
            ]}
        ]}
    ],

    rendered: function() {
        this.inherited(arguments);
        this.loadSettings();
    },

    isFirstRunChanged: function() {
        if (this.$.backBtn) {
            this.$.backBtn.setShowing(!this.isFirstRun);
        }
    },

    loadSettings: function() {
        var creds = new App.Credentials();
        this.$.apiKeyInput.setValue(creds.getApiKey());

        // Populate the select via innerHTML so value attributes are guaranteed correct
        if (this.$.modelSelect.hasNode()) {
            this.$.modelSelect.node.innerHTML =
                '<option value="claude-haiku-4-5-20251001">Haiku \u2014 Fast &amp; efficient</option>' +
                '<option value="claude-sonnet-4-6">Sonnet \u2014 More capable</option>';
            this.$.modelSelect.node.value = creds.getModel();
        }

        this.$.systemPromptInput.setValue(creds.getSystemPrompt());
        this.$.backBtn.setShowing(!this.isFirstRun);
        creds.destroy();
    },

    saveSettings: function() {
        var key = this.$.apiKeyInput.getValue().trim();
        if (!key) {
            this.$.saveError.setShowing(true);
            return;
        }
        this.$.saveError.setShowing(false);

        var creds = new App.Credentials();
        creds.setApiKey(key);
        creds.setModel(
            this.$.modelSelect.hasNode()
                ? this.$.modelSelect.node.value
                : "claude-haiku-4-5-20251001"
        );
        creds.setSystemPrompt(this.$.systemPromptInput.getValue());
        creds.destroy();

        this.doSaveComplete();
    },

    goBack: function() {
        this.doBack();
    },

    newConversation: function() {
        if (this.conversation) {
            this.conversation.newConversation();
        }
        this.doBack();
    },

    clearHistory: function() {
        if (this.conversation) {
            this.conversation.clearAll();
        }
        this.doBack();
    }
});

// Main chat interface
enyo.kind({
    name: "App.ChatView",
    kind: "enyo.FittableRows",
    classes: "chat-view",
    events: {
        onShowSettings: "",
        onShowHistory: ""
    },
    components: [
        {kind: "onyx.Toolbar", components: [
            {tag: "span", classes: "toolbar-title", content: "Claude Chat"},
            {kind: "onyx.Button", content: "Settings",
             classes: "toolbar-btn-right", ontap: "openSettings"},
            {kind: "onyx.Button", content: "New Chat",
             classes: "toolbar-btn-right", ontap: "newChat"},
            {kind: "onyx.Button", content: "History",
             classes: "toolbar-btn-right", ontap: "openHistory"}
        ]},
        {name: "scroller", kind: "enyo.Scroller", fit: true,
         horizontal: "hidden", classes: "chat-scroller",
         components: [
            {name: "messageList", classes: "message-list"},
            {name: "thinkingRow", classes: "message-item message-assistant",
             showing: false,
             components: [
                {classes: "message-bubble bubble-assistant bubble-thinking",
                 content: "Thinking\u2026"}
             ]}
         ]},
        {classes: "input-area", components: [
            {kind: "enyo.FittableColumns", components: [
                {name: "messageInput", kind: "enyo.TextArea",
                 fit: true,
                 placeholder: "Type a message\u2026  (Enter sends, Shift+Enter = new line)",
                 classes: "message-input",
                 onkeydown: "inputKeyDown"},
                {name: "sendBtn", kind: "onyx.Button", content: "Send",
                 classes: "send-btn", ontap: "sendMessage"}
            ]}
        ]}
    ],

    sending: false,

    create: function() {
        this.inherited(arguments);
        this.conversation = new App.Conversation({owner: this});
        this.credentials = new App.Credentials({owner: this});
        this.api = new App.ClaudeAPI({owner: this});
    },

    rendered: function() {
        this.inherited(arguments);
        this.refreshMessages();
    },

    newChat: function() {
        if (this.sending) { return; }
        this.conversation.newConversation();
        this.refreshMessages();
    },

    openHistory: function() {
        this.doShowHistory({conversation: this.conversation});
    },

    openSettings: function() {
        this.doShowSettings({conversation: this.conversation});
    },

    // Rebuild the full message list from conversation (used on load/conversation switch)
    refreshMessages: function() {
        var children = this.$.messageList.getClientControls();
        var i;
        for (i = children.length - 1; i >= 0; i--) {
            children[i].destroy();
        }

        var msgs = this.conversation.getAll();
        for (i = 0; i < msgs.length; i++) {
            this.$.messageList.createComponent(
                {kind: "App.MessageItem", message: msgs[i]},
                {owner: this}
            );
        }
        if (msgs.length > 0) {
            this.$.messageList.render();
        }
        this.scrollToBottom();
    },

    // Efficiently append a single new message without rebuilding the whole list
    appendMessage: function(msg) {
        var item = this.$.messageList.createComponent(
            {kind: "App.MessageItem", message: msg},
            {owner: this}
        );
        item.render();
        this.scrollToBottom();
    },

    scrollToBottom: function() {
        var self = this;
        setTimeout(function() {
            self.$.scroller.scrollToBottom();
        }, 60);
    },

    inputKeyDown: function(sender, event) {
        // Enter alone sends; Shift+Enter inserts a newline
        if (event.keyCode === 13 && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
            return true;
        }
    },

    handleJustTypeQuery: function(query) {
        if (!this.credentials.hasApiKey()) { return; }
        this.$.messageInput.setValue(query);
        this.sendMessage();
    },

    sendMessage: function() {
        if (this.sending) { return; }

        var text = this.$.messageInput.getValue().trim();
        if (!text) { return; }

        if (!this.credentials.hasApiKey()) {
            this.doShowSettings({conversation: this.conversation});
            return;
        }

        // Commit the user turn immediately to storage and display
        this.conversation.addMessage("user", text);
        this.$.messageInput.setValue("");
        this.appendMessage({role: "user", content: text});

        // Lock UI while waiting
        this.sending = true;
        this.$.sendBtn.setDisabled(true);
        this.$.thinkingRow.setShowing(true);
        this.scrollToBottom();

        var self = this;
        this.api.sendMessage(
            this.credentials.getApiKey(),
            this.credentials.getModel(),
            this.conversation.getApiMessages(),
            this.credentials.getSystemPrompt(),
            function(responseText) {
                self.conversation.addMessage("assistant", responseText);
                self.$.thinkingRow.setShowing(false);
                self.appendMessage({role: "assistant", content: responseText});
                self.sending = false;
                self.$.sendBtn.setDisabled(false);
            },
            function(errMsg) {
                self.$.thinkingRow.setShowing(false);
                self.appendMessage({role: "assistant", content: "[Error: " + errMsg + "]"});
                self.sending = false;
                self.$.sendBtn.setDisabled(false);
            }
        );
    }
});

// Top-level container: routes between chat, settings, and history panels
enyo.kind({
    name: "App.RootView",
    kind: "enyo.Panels",
    arrangerKind: "CardArranger",
    fit: true,
    components: [
        {name: "chatView",     kind: "App.ChatView",
         onShowSettings: "showSettings", onShowHistory: "showHistory"},
        {name: "settingsView", kind: "App.SettingsView",
         onSaveComplete: "returnToChat", onBack: "returnToChat"},
        {name: "historyView",  kind: "App.HistoryView",
         onBack: "returnToChat", onLoadConversation: "returnToChat"}
    ],

    rendered: function() {
        this.inherited(arguments);
        var creds = new App.Credentials();
        if (!creds.hasApiKey()) {
            this.$.settingsView.setIsFirstRun(true);
            this.$.settingsView.loadSettings();
            this.setIndex(1);
        }
        creds.destroy();
    },

    showSettings: function(sender, event) {
        this.$.settingsView.setConversation(event.conversation);
        this.$.settingsView.setIsFirstRun(false);
        this.$.settingsView.loadSettings();
        this.setIndex(1);
    },

    showHistory: function(sender, event) {
        this.$.historyView.setConversation(event.conversation);
        this.$.historyView.loadHistory();
        this.setIndex(2);
    },

    returnToChat: function() {
        this.setIndex(0);
        this.$.chatView.refreshMessages();
    },

    handleJustTypeQuery: function(query) {
        this.setIndex(0);
        this.$.chatView.handleJustTypeQuery(query);
    }
});
