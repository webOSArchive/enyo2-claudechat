/*
 * Licensed under the Apache License, Version 2.0
 */
module.exports = function(grunt) {
    grunt.initConfig({
        "http-server": {
            dev: {
                root: ".",
                port: 8282,
                host: "0.0.0.0",   // listen on all interfaces so TouchPad can reach it
                cache: 0,
                showDir: true,
                autoIndex: true,
                defaultExt: "html",
                runInBackground: false
            }
        }
    });

    grunt.loadNpmTasks("grunt-http-server");

    grunt.registerTask("serve", ["http-server:dev"]);
    grunt.registerTask("default", ["serve"]);
};
