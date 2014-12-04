// Provides access to the local filesystem in a platform independent way
Platform.fs = {};

// Platform indepemdent inplementation of a directory in the external non-sandboxed filesystem


Platform.fs.Entry = function() {

    // The name of the file or directory in the filesystem
    this.basename = '';

    // The public path to the file or directory in the user-chosen filesystem
    this.path = '';

    this.isDirectory = function() {

    };

    this.isFile = function() {

    };

};

Platform.fs.FileEntry = function() {

    Platform.fs.FileEntry.prototype = Platform.fs.Entry;

    // Reads the contents of the file and passes it as a blob to the callback
    this.file = function(success_cb, error_cb) {}

    /*
        Writes data to the file, replacing its contents.

            @blob: The data buffer to write

            @callback: Executed after data has been written.
    */
    this.write = function(blob, callback) {}
}

Platform.fs.DirEntry = function() {

    // The basename of the directory in the filesystem
    this.basename = '';

    // The path to the directory in the filesystem
    this.path = '';

    /* Asynchronously reads the directory nd gets the contents.
    *  Callback is passed an array of child FileEntry objects.
    */
    this.getChildren = function(cb) {};

    /*
        Opens a child file.

            @name: The name of the file

            @flags: A set of flags to control creation of files
                "create" - Create file if it doesn't already exist
                "exclusive" - If the file already exists, fail

            @callback: called with new FileEntry.
    */
    this.getFile = function(name, flags, callback) {}

    this.getDirectory = function(name, flags, callback) {}

};

function NwEntry(basename, parent_path, parent_full_path) {

    NwEntry.isDirectory = function() {
        var fs = require('fs');
        var stats = fs.statSync(this.full_path);
        if (stats.isDirectory()) {
            return true;
        } else {
            return false;
        }
    };

    NwEntry.isFile = function() {
        var fs = require('fs');
        var stats = fs.statSync(this.full_path);
        if (stats.isFile()) {
            return true;
        } else {
            return false;
        }
    };

}



// Node-webkit implementation of our FileEntry interface.
function NwFileEntry(filename, parent_path, parent_full_path) {

    var that = this;

    var path_mod = require('path');

    this.basename = filename;

    if (parent_path) {
        this.path = path_mod.join(parent_path, filename);
    } else {
        this.path = filename;
    }

    // The private full path from the root to the file in the real local filesystem.
    // This is required because all file operations in nw uses the full local path.
    this.full_path = path_mod.join(parent_full_path, filename);

    this.file = function(success_cb, error_cb) {

        var fs = require('fs');

        fs.readFile(this.full_path, function (e, data) {
            var blob = new Blob([new Uint8Array(data)]);
            success_cb(blob);
        });

    };

    this.write = function (blob, callback) {

        function writeData(buffer) {
            var fs = require('fs');
            fs.open(that.full_path, 'w', function(err, fd) {
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
        reader.onload = function () {
            var buffer = new Buffer(new Uint8Array(this.result));
            writeData(buffer);
        }
        reader.readAsArrayBuffer(blob);

    }

}
NwFileEntry.prototype = NwEntry;

function NwDirEntry(dirname, parent_path, parent_full_path) {

    var that = this;

    var path_mod = require('path');

    this.basename = dirname;

    if (parent_path) {
        this.path = path_mod.join(parent_path, dirname);
    } else {
        this.path = dirname;
    }

    this.full_path = path_mod.join(parent_full_path, dirname);

    this.getChildren = function(cb) {

        var fs = require('fs');
        console.log(fs);

        fs.readdir(this.full_path, function(err, files) {
            // @files contains the plain file names of the children; we need to make these into fileEntry's
            console.log(files);
            var child_list = [];
            files.forEach(function(val, index) {
                var stats = fs.statSync(that.full_path);
                if (stats.isFile()) {
                    var file_entry = new NwFileEntry(val, that.path, that.full_path);
                    child_list.push(file_entry);
                } else if (stats.isDirectory()) {
                    var dir_entry = new NwDirEntry(val, that.path, that.full_path);
                    child_list.push(dir_entry);
                }
            });
            cb(child_list);
        });
    };

    this.getFile = function(name, flags, callback) {

        if (typeof flags == 'undefined' || flags == null) {
            flags = {
                create: false,
                exclusive: false
            }
        }

        var fs = require('fs');
        var path = require('path');

        var file_path = path.join(this.full_path, name);

        var stat = fs.stat(file_path, function(err, stats) {

            function return_file() {
                callback(new NwFileEntry(name, that.path, that.full_path));
            }

            function create_and_return_file() {
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

    this.getDirectory = function (name, flags, callback) {

        if (typeof flags == 'undefined') {
            flags = {
                create: false,
                exclusive: false
            }
        }

        var fs = require('fs');
        var path = require('path');

        var file_path = path.join(this.full_path, name);

        var stat = fs.stat(file_path, function(err, stats) {

            function return_dir() {
                callback(new NwDirEntry(name, that.path, that.full_path));
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
NwDirEntry.prototype = NwEntry;


function ChromeEntry() {

    ChromeEntry.isDirectory = function() {
        if (this.entry.isDirectory) {
            return true;
        }
    }

    ChromeEntry.isFile = function() {
        if (this.entry.isFile) {
            return true;
        }
    }

}



// Chrome apps implementation of our FileEntry interface,
function ChromeFileEntry(_entry) {

    var that = this;

    this.entry = _entry;

    this.basename = this.entry.name;

    // This is really just a path from the user-choosen directory.
    this.path = this.entry.fullpath;

    this.file = function(sucess_cb, error_cb) {
        this.entry.file(sucess_cb, error_cb);
    };

    this.write = function (blob, callback) {

        this.entry.createWriter(function (writer) {
            writer.write(blob);
            callback();
        });

    }

}
ChromeFileEntry.prototype = ChromeEntry;

function ChromeDirEntry(_entry) {

    var that = this;

    this.entry = _entry;

    this.basename = this.entry.name;

    this.path = this.entry.fullPath;

    this.getChildren = function(cb) {

        console.log("reading children");

        var dir = this.entry;

        var dir_reader = dir.createReader();

        // Array to hold Entries for the this directory's children
        var child_list = [];

        read_children();

        // load Entries from directory
        // This calls readEntries till no more entries are returned
        function read_children() {
            dir_reader.readEntries(function(entries) {
                if (entries.length == 0) {
                    wrap_entries(child_list);
                } else {
                    // add current list to the array
                    child_list = child_list.concat(entries);
                    // call this function recursively
                    read_children();
                }
            });
        }

        // Convert the list of Chrome Entries to fs.Entry's
        function wrap_entries(chrome_list) {
            var new_child_list = [];
            chrome_list.forEach(function(item, index) {
                if (item.isDirectory) {
                    new_child_list.push(new ChromeDirEntry(item));
                } else if (item.isFile) {
                    new_child_list.push(new ChromeFileEntry(item));
                }
            });
            cb(new_child_list);
        }

    };

    this.getFile = function(name, flags, callback) {

        this.entry.getFile(name, flags, function(entry) {
            callback(new ChromeFileEntry(entry));
        })

    }

    this.getDirectory = function(name, flags, callback) {

        this.entry.getDirectory(name, flags, function(entry) {
            callback(new ChromeDirEntry(entry));
        })

    }

}
ChromeDirEntry.prototype = ChromeEntry;

/*
    Presents a dialog for the user to choose a files/folders based on type.

    @chooser_type: The type of files or folders the user should be able to select:
        directory: The user can only select a single directory
        file: The user can only select a single file

    @success: This callback is called with an fs.Entry representing the file or an array for sevaral files.

    @failure: Called with the error.
*/
Platform.fs.chooseEntry = function(chooser_type, success, failure) {

    function NwChooseEntry() {

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
                var dir_entry = new NwDirEntry(basename, undefined, parent_path);
                success(dir_entry);
            } else if (chooser_type == 'file') {
                var file_entry = new NwFileEntry(basename, undefined, parent_path);
                success(file_entry);
            }
        });

        chooser.click();

    }

    function ChromeChooseEntry () {

        if (chooser_type =='directory') {
            chrome.fileSystem.chooseEntry({"type": "openDirectory"}, function(entry) {
                success(new ChromeDirEntry(entry));
            });
        }

    }

    if (Platform.platform == "node-webkit") {
        console.log("Platform is: Node-Webkit");
        NwChooseEntry();
    } else if (Platform.platform == "chrome") {
        console.log("Platform is: Chrome");
        ChromeChooseEntry();
    }
};

/*
    When called returns a string as an ID with which the entry can be restored in another session.

        @entry: The file entry or dir entry to be ratained.

        @return: A string to be later passed to restoreEntry() to retrieve the file or dir entry.
*/
Platform.fs.retainEntry = function(entry) {

    if (Platform.platform == "node-webkit") {
        return NwRetainEntry();
    } else if (Platform.platform == "chrome") {
        return ChromeRetainEntry();
    }

    function ChromeRetainEntry() {
        return chrome.fileSystem.retainEntry(entry.entry);
    }

    /*
        In node-webkit the full path is required to work with files
        But we also need the path from the user-selected directory
        So our ID is a stringified array of the fullpath and this other path.
    */
    function NwRetainEntry() {
        return JSON.stringify([entry.full_path, entry.path]);
    }

}

/*
    Restores the entry from the ID gotten by calling retainEntry with an entry.

        @id: The ID of the file to be restored, obtained by calling retainEntry

        @success: Success callback to be called with the restored entry as the argument.

        @failure: Error callback called with the error object if the entry could not be restored for whatever reason.
*/
Platform.fs.restoreEntry = function(id, success, failure) {

    if (Platform.platform == "node-webkit") {
        return NwRestoreEntry();
    } else if (Platform.platform == "chrome") {
        return ChromeRestoreEntry();
    }

    function NwRestoreEntry() {

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
            success(new NwFileEntry(basename, root_parent_path, full_parent_path));
        } else if (stat.isDirectory()) {
            success(new NwDirEntry(basename, root_parent_path, full_parent_path));
        }

    }

    function ChromeRestoreEntry() {

        chrome.fileSystem.restoreEntry(id, function(entry) {
            if (chrome.runtime.lastError) {
                failure(e);
            } else if (entry.isFile) {
                success(new ChromeFileEntry(entry));
            } else if (entry.isDirectory) {
                success(new ChromeDirEntry(entry));
            }
        });

    }

}

/*
    Returns a DirEntry for the applications data directory

        @callback: Called with the DirEntry for the data directory.
*/
Platform.fs.appDataDir = function (callback) {

    function ChromeAppDataDir() {

        window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;

        function onFsInit(fs) {
            console.log("filesystem initialised");
            callback(new ChromeDirEntry(fs.root));
        }

        function onFsErr(err) {
            console.log(err.message);
        }

        window.requestFileSystem(PERSISTENT, 5*1024*1024, onFsInit, onFsErr)

    }

    function NwAppDataDir() {

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

        callback(new NwDirEntry(basename, undefined, parent_full_path));

    }

    if (Platform.platform == "node-webkit") {
        NwAppDataDir();
    } else if (Platform.platform == "chrome") {
        ChromeAppDataDir();
    }

}

ChromeEntry();
NwEntry();
