enyo.kind({
    name: "App.Conversation",
    kind: "enyo.Component",

    KEY_CURRENT:  "claudechat-conversation",
    KEY_ARCHIVED: "claudechat-archived",

    // Max turns (user+assistant pairs) sent to the API per request
    MAX_API_TURNS: 20,
    // Max archived conversations retained on device
    MAX_ARCHIVED: 10,

    messages: null,

    create: function() {
        this.inherited(arguments);
        this.messages = [];
        this.load();
    },

    load: function() {
        var stored = localStorage.getItem(this.KEY_CURRENT);
        if (stored) {
            try {
                this.messages = JSON.parse(stored);
            } catch (e) {
                this.messages = [];
            }
        }
    },

    save: function() {
        try {
            localStorage.setItem(this.KEY_CURRENT, JSON.stringify(this.messages));
        } catch (e) {
            // localStorage quota exceeded -- trim to last 10 messages and retry
            if (this.messages.length > 10) {
                this.messages = this.messages.slice(-10);
                try {
                    localStorage.setItem(this.KEY_CURRENT, JSON.stringify(this.messages));
                } catch (e2) {}
            }
        }
    },

    addMessage: function(role, content) {
        this.messages.push({role: role, content: content});
        this.save();
    },

    getAll: function() {
        return this.messages;
    },

    // Returns the sliding window of messages sent to the API.
    // Keeps the last MAX_API_TURNS pairs (user+assistant = 2 items each).
    getApiMessages: function() {
        var maxItems = this.MAX_API_TURNS * 2;
        if (this.messages.length <= maxItems) {
            return this.messages;
        }
        return this.messages.slice(this.messages.length - maxItems);
    },

    isEmpty: function() {
        return this.messages.length === 0;
    },

    newConversation: function() {
        if (this.messages.length > 0) {
            this._archiveCurrent();
        }
        this.messages = [];
        localStorage.removeItem(this.KEY_CURRENT);
    },

    clearAll: function() {
        localStorage.removeItem(this.KEY_CURRENT);
        localStorage.removeItem(this.KEY_ARCHIVED);
        this.messages = [];
    },

    getArchived: function() {
        return this._getArchived();
    },

    // Load an archived conversation as current, archiving whatever is current first.
    // The resumed conversation is removed from the archive (it becomes current).
    resumeArchived: function(index) {
        var archived = this._getArchived();
        if (index < 0 || index >= archived.length) { return; }
        if (this.messages.length > 0) {
            this._archiveCurrent();
            // Re-fetch after archiving since the array changed
            archived = this._getArchived();
            // Index may have shifted by 1 because we just unshifted a new entry
            index = index + 1;
            if (index >= archived.length) { index = archived.length - 1; }
        }
        this.messages = archived[index].messages;
        this.save();
        archived.splice(index, 1);
        try {
            localStorage.setItem(this.KEY_ARCHIVED, JSON.stringify(archived));
        } catch (e) {}
    },

    _archiveCurrent: function() {
        var archived = this._getArchived();
        var preview = (this.messages.length > 0)
            ? this.messages[0].content.substring(0, 80)
            : "";
        archived.unshift({
            date: new Date().toString(),
            preview: preview,
            messages: this.messages
        });
        if (archived.length > this.MAX_ARCHIVED) {
            archived = archived.slice(0, this.MAX_ARCHIVED);
        }
        try {
            localStorage.setItem(this.KEY_ARCHIVED, JSON.stringify(archived));
        } catch (e) {
            // If archiving fails due to quota, drop it silently
        }
    },

    _getArchived: function() {
        var stored = localStorage.getItem(this.KEY_ARCHIVED);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return [];
            }
        }
        return [];
    }
});
