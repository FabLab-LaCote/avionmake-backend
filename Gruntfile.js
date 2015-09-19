/*

This file is part of avionmake.

Copyright (C) 2015  Boris Fritscher

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, see http://www.gnu.org/licenses/.

*/

module.exports = function (grunt) {
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        nodemon: {
            dev: {
                script: 'dist/server.js'
            },
            options: {
                ignore: ['node_modules/**', 'Gruntfile.js'],
                nodeArgs: ['--debug'],
                env: {
                    PORT: '8181'
                }
            }
        },

        watch: {
            scripts: {
                files: ['*.ts', '!node_modules/**/*.ts'], // the watched files
                tasks: ["newer:tslint:all", "ts:build"], // the task to run
                options: {
                    spawn: false // makes the watch task faster
                }
            }
        },

        concurrent: {
            watchers: {
                tasks: ['nodemon', 'watch'],
                options: {
                    logConcurrentOutput: true
                }
            }
        },

        tslint: {
            options: {
                configuration: grunt.file.readJSON("tslint.json")
            },
            all: {
                src: ["*.ts", "!node_modules/**/*.ts", "!obj/**/*.ts", "!typings/**/*.ts"] // avoid linting typings files and node_modules files
            }
        },

        ts: {
            build: {
                src: ["*.ts", "!node_modules/**/*.ts"], // Avoid compiling TypeScript files in node_modules
                outDir: 'dist',
                options: {
                    module: 'commonjs', // To compile TypeScript using external modules like NodeJS
                    fast: 'never', // You'll need to recompile all the files each time for NodeJS
                    compiler: './node_modules/typescript/bin/tsc'
                }
            }
        }
    });

    grunt.loadNpmTasks("grunt-ts");
    grunt.loadNpmTasks("grunt-tslint");
    grunt.loadNpmTasks("grunt-contrib-watch");
    grunt.loadNpmTasks("grunt-nodemon");
    grunt.loadNpmTasks("grunt-concurrent");
    grunt.loadNpmTasks("grunt-newer");

    // Default tasks.
    grunt.registerTask("serve", ["default", "concurrent:watchers"]);
    grunt.registerTask('default', ["tslint:all", "ts:build"]);
};