// Module-level state for JustType launch handling.
// Registered at script-load time so we catch deviceready regardless of
// whether it fires before or after rendered().
var App = App || {};
App._justTypeQuery = null;   // query waiting to be delivered to the view
App._appView      = null;    // set by rendered() once the view exists

function _appProcessJustType(query) {
    if (!query) { return; }
    if (App._appView) {
        App._appView.handleJustTypeQuery(query);
    } else {
        App._justTypeQuery = query;   // rendered() will pick this up
    }
}

document.addEventListener('deviceready', function() {
    if (!window.PalmSystem) { return; }

    // Cold start: params already set in PalmSystem at launch time
    try {
        var lp = JSON.parse(PalmSystem.launchParams) || {};
        if (lp.query) { _appProcessJustType(lp.query); }
    } catch(e) {}

    // Warm start: chain onto Mojo.relaunch (cordova-webos.js set it up
    // in its own deviceready handler which fired before ours)
    var prev = window.Mojo && window.Mojo.relaunch;
    if (window.Mojo) {
        window.Mojo.relaunch = function() {
            try {
                var lp2 = JSON.parse(PalmSystem.launchParams) || {};
                if (lp2.query) { _appProcessJustType(lp2.query); }
            } catch(e) {}
            return prev ? prev() : true;
        };
    }
}, false);

enyo.kind({
    name: "App.Application",
    kind: "enyo.Application",
    view: "App.RootView",
    rendered: function() {
        this.inherited(arguments);
        setTimeout(function() {
            enyo.dispatch(window, {type: "resize"});
        }, 150);

        App._appView = this.view;

        // Consume any query that arrived before the view was ready
        if (App._justTypeQuery) {
            var q = App._justTypeQuery;
            App._justTypeQuery = null;
            this.view.handleJustTypeQuery(q);
        }
    }
});

enyo.ready(function() {
    new App.Application({name: "app"});
});
