/// <reference path="../defs/node-0.11.d.ts"/>



module Platform {


    export module fs {


        export interface IGetChildrenCallback {
            (child_list: Entry[]) : any;
        }


        export interface ICreateFlags {
            create: boolean;
            exclusive?: boolean;
        }


        export interface IGetFileCallback {
            (FileEntry, Error);
        }


        export interface IGetDirectoryCallback {
            (file_entry: DirEntry);
        }


        // TODO: replace basename with _basename
        export class Entry {


            protected basename: string;

            protected full_path: string;

            constructor (filename: string, parent_path: any, parent_full_path: string) {

                var path_mod = require('path');


                // The private full path from the root to the file in the real local filesystem.
                // This is required because all file operations in nw uses the full local path.
                this.full_path = path_mod.join(parent_full_path, filename);

                this.basename = path_mod.basename(this.full_path);

            }

            public isDirectory (): boolean {

                var fs = require('fs');
                var stats = fs.statSync(this.full_path);
                if (stats.isDirectory()) {
                    return true;
                } else {
                    return false;
                }

            }

            public isFile (): boolean {

                var fs = require('fs');
                var stats = fs.statSync(this.full_path);
                if (stats.isFile()) {
                    return true;
                } else {
                    return false;
                }

            }

            public get_base_name(): string {

                return this.basename;

            }


            public get_full_path () : string {
                return this.full_path;
            }

            public get_directory_path () : string {
                var p = require('path');
                return p.dirname(this.full_path);
            }


        }


        export class FileEntry extends Entry {


            constructor (filename: string, parent_path: any, parent_full_path: string) {

                super(filename, parent_path, parent_full_path);

            }


            public file (success_cb: {(blob: Blob): void}, error_cb : {(err: Error): void}) {

                var fs = require('fs');

                fs.readFile(this.full_path, function (e, data) {
                    var blob = new Blob([new Uint8Array(data)]);
                    success_cb(blob);
                });

            }


            public write (blob: Blob, callback) {

                var writeData = (buffer) => {
                    var fs = require('fs');
                    fs.open(this.full_path, 'w', function(err, fd) {
                        if (err != null) {
                            console.debug(err);
                        } else {
                            fs.write(fd, buffer, 0, buffer.length, 0, function(err, written, buffer) {
                                if (err != null) {
                                    console.debug(err);
                                } else {
                                    console.debug("it seems the data was written properly :)");
                                    callback();
                                }
                            });
                        }
                    });
                }

                var reader = new FileReader();
                reader.onload = function() {
                    var buffer = new Buffer(new Uint8Array(this.result));
                    writeData(buffer);
                }
                reader.readAsArrayBuffer(blob);

            }


        }





        export class DirEntry extends Entry {


            constructor (dirname: string, parent_path: string, parent_full_path: string) {

                super(dirname, parent_path, parent_full_path);

            }


            getChildren(cb: IGetChildrenCallback): void {

                var fs = require('fs');
                //console.log(fs);

                fs.readdir(this.full_path, (err, files) => {
                    // @files contains the plain file names of the children; we need to make these into fileEntry's
                    console.log(files);
                    console.log("files");
                    var child_list = [];
                    files.forEach((val, index) => {
                        var stats = fs.statSync(this.full_path);
                        if (stats.isFile()) {
                            var file_entry = new FileEntry(val, this.full_path, this.full_path);
                            child_list.push(file_entry);
                        } else if (stats.isDirectory()) {
                            var dir_entry = new DirEntry(val, this.full_path, this.full_path);
                            child_list.push(dir_entry);
                        }
                    });
                    cb(child_list);
                });

            }


            getFile (name: string, flags: ICreateFlags, callback: IGetFileCallback): void {

                if (typeof flags == 'undefined' || flags == null) {
                    flags = {
                        create: false,
                        exclusive: false
                    }
                }

                var fs = require('fs');
                var path = require('path');

                var file_path = path.join(this.full_path, name);

                var stat = fs.stat(file_path, (err, stats) => {

                    var return_file = () => {
                        callback(new FileEntry(name, this.full_path, this.full_path), null);
                    }

                    var create_and_return_file = () => {
                        fs.open(file_path, 'w', function(err, fd) {
                            fs.close(fd);
                            return_file();
                        });
                    }

                    if (flags.create) {
                        if (err != null) {
                            if (err.code == "ENOENT") {
                                create_and_return_file();
                            } else {
                                console.debug("sometihng went wrong stating " + file_path);
                            }
                        } else {
                            if (flags.exclusive) {
                                console.debug(file_path + " already exists and the exclusive flag is set. Failed.");
                            } else {
                                if (stats.isDirectory()) {
                                    console.debug(file_path + " is a directory. Failed.");
                                } else {
                                    return_file();
                                }
                            }
                        }
                    } else {
                        if (err != null) {
                            if (err.code == "ENOENT") {
                                console.debug(file_path + " does not exist and create flag is not set. failed");
                            } else {
                                console.debug("sometihng went wrong stating " + file_path);
                            }
                        } else {
                            if (stats.isDirectory()) {
                                console.debug(file_path + " is a directory. Failed.");
                            } else {
                                return_file();
                            }
                        }
                    }

                });


            }


            getDirectory (name: string, flags: ICreateFlags, callback: IGetDirectoryCallback): void {

                if (typeof flags == 'undefined') {
                    flags = {
                        create: false,
                        exclusive: false
                    }
                }

                var fs = require('fs');
                var path = require('path');

                var file_path = path.join(this.full_path, name);

                var stat = fs.stat(file_path, (err, stats) => {

                    var return_dir = () => {
                        callback(new DirEntry(name, this.full_path, this.full_path));
                    }

                    function create_and_return_dir() {
                        fs.mkdir(file_path, function(err) {
                            if (err == null) {
                                return_dir();
                            } else {
                                console.debug(err);
                            }

                        });
                    }

                    if (flags.create) {
                        if (err != null) {
                            if (err.code == "ENOENT") {
                                create_and_return_dir();
                            } else {
                                console.debug("sometihng went wrong stating " + file_path);
                            }
                        } else {
                            if (flags.exclusive) {
                                console.debug(file_path + " already exists and the exclusive flag is set. Failed.");
                            } else {
                                if (stats.isFile()) {
                                    console.debug(file_path + " is a file. Failed.");
                                } else {
                                    return_dir();
                                }
                            }
                        }
                    } else {
                        if (err != null) {
                            if (err.code == "ENOENT") {
                                console.debug(file_path + " does not exist and create flag is not set. failed");
                            } else {
                                console.debug("sometihng went wrong stating " + file_path);
                            }
                        } else {
                            if (stats.isFile()) {
                                console.debug(file_path + " is a file. Failed.");
                            } else {
                                return_dir();
                            }
                        }
                    }

                });

            }


        }


        export function chooseEntry (chooser_type: string, success: {(FileEntry): void}, failure) {


            var chooser = document.createElement('input');
            chooser.setAttribute('type', 'file');
            if (chooser_type == "directory") {
                chooser.setAttribute('nwdirectory', '');
            }

            $(chooser).change(function (ev) {
                var fs = require('fs');
                var path = require('path');
                var file_path = chooser.value;
                var basename = path.basename(file_path);
                var parent_path = path.dirname(file_path);
                if (chooser_type == 'directory') {
                    var dir_entry = new DirEntry(basename, undefined, parent_path);
                    success(dir_entry);
                } else if (chooser_type == 'file') {
                    var file_entry = new FileEntry(basename, undefined, parent_path);
                    success(file_entry);
                }
            });

            chooser.click();



        }


        /*
            Returns a DirEntry for the applications data directory

                @callback: Called with the DirEntry for the data directory.
        */
        export function appDataDir (callback: {(DirEntry)}) {

            var gui = require('nw.gui');
            var path = require('path');
            var fs = require('fs');

            var data_dir = path.join(gui.App.dataPath, "appdata");

            fs.mkdir(data_dir, function(err) {
                if (err != null) {
                    if (err.code == "EEXIST") {
                        console.log("Data directory already exists")
                    } else {
                        console.debug(err);
                        return;
                    }
                } else {
                    console.debug("Created " + data_dir);
                }
            })

            var basename = path.basename(data_dir);
            var parent_full_path = path.dirname(data_dir);

            callback(new DirEntry(basename, undefined, parent_full_path));

        }


        export function retainEntry(entry: Entry) {

            return JSON.stringify([entry.get_full_path(), entry.get_base_name()]);

        }


        export function restoreEntry(id: string, success: {(Entry): void}, failure: {(Error): void}) {

            var fs = require('fs');
            var path = require('path');

            try {
                var id_arr = JSON.parse(id);
            } catch (e) {
                failure(e);
                return;
            }
            var full_parent_path = path.dirname(id_arr[0]);
            var root_parent_path = id_arr[1];
            var basename = path.basename(id_arr[0]);

            try {
                var stat = fs.statSync(full_parent_path);
            } catch (e) {
    //            console.error(e.message);
                failure(e);
                return;
            }
            if (stat.isFile()) {
                success(new FileEntry(basename, root_parent_path, full_parent_path));
            } else if (stat.isDirectory()) {
                success(new DirEntry(basename, root_parent_path, full_parent_path));
            }

        }






    }



}
