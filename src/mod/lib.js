// This object controls the general tasks except the view.
var say;
var Controller = (function () {
    function Controller() {
        var that = this;
        window.tmdb = new TMDb.TMDb("f6bfd6dfde719ce3a4c710d7258692cf");
        this.movie_list = [];
        this.app_data_dir = undefined;
        this.config = {};
        this.genres = [];
        this.init();
    }
    Controller.prototype.init = function () {
        var that = this;
        Platform.localStorage.get("config", function (value, error) {
            if (error) {
                console.debug("No genre list cache found: " + error.message);
            }
            else {
                if (value.genres) {
                    console.log("genres list cache found.");
                    that.genres = value.genres;
                    finish();
                }
            }
        });
        window.tmdb.get_genres(function (err, genres_arr) {
            if (!err) {
                that.genres = genres_arr;
                that.config.genres = genres_arr;
                Platform.localStorage.setJSON({
                    config: that.config
                }, function () {
                    console.log("Retrieved and wrote new genres list.");
                });
            }
            else {
                console.error(err.message);
            }
        });
        function finish() {
            that.gui_controller = new GUIController(that);
            if (!that.app_data_dir) {
                Platform.fs.appDataDir(function (data_dir) {
                    that.app_data_dir = data_dir;
                    that.load_stored_movies();
                });
            }
        }
    };
    Controller.prototype.load_new_movies_from_dir = function (dir_entry) {
        var that = this;
        this.load_files(dir_entry, onLoadFiles);
        function onLoadFiles(video_file_list) {
            var new_movie_list = [];
            video_file_list.forEach(function (file, index, arr) {
                new_movie_list.push(new Movie(file));
            });
            that.process_new_movies(new_movie_list);
        }
    };
    Controller.prototype.load_files = function (dir, cb) {
        var that = this;
        console.log("hello");
        var async_num = 0;
        var file_list = [];
        rec_load_files(dir, 1, onRecLoadFiles);
        function rec_load_files(dir, rec_level, callback) {
            //			console.debug("Callback:" + callback);
            async_num++;
            dir.getChildren(onGetChildren);
            function onGetChildren(child_list) {
                file_list = file_list.concat(child_list);
                if (child_list.length > 0) {
                    child_list.forEach(function (entry) {
                        if (entry.isDirectory()) {
                            rec_load_files(entry, rec_level + 1, callback);
                        }
                        else {
                        }
                    });
                }
                async_num--;
                async_return();
            }
            function async_return() {
                console.log("ready");
                if (async_num == 0) {
                    callback(file_list);
                }
            }
            ;
        }
        function onRecLoadFiles(file_list) {
            var video_file_list = select_new_video_files(file_list);
            cb(video_file_list);
        }
        function select_new_video_files(file_list) {
            console.debug("Selecting video files");
            var new_file_list = [];
            file_list.forEach(function (file) {
                if ((file.get_base_name().slice(-3) == "avi")
                    || (file.get_base_name().slice(-3) == "mkv")
                    || (file.get_base_name().slice(-3) == "mp4")) {
                    var dupe = false;
                    that.movie_list.forEach(function (movie) {
                        if (file.get_base_name() == movie.video_file.get_base_name()) {
                            dupe = true;
                        }
                    });
                    if (dupe == false) {
                        new_file_list.push(file);
                        say("video file: " + file.get_base_name());
                    }
                }
            });
            return new_file_list;
        }
    };
    Controller.prototype.process_new_movies = function (new_movie_list) {
        var that = this;
        console.debug("processing");
        var remove_list = [];
        new_movie_list.forEach(function (movie, index, list) {
            if (movie.infer_title_and_year()) {
                say("title: " + movie.search_title + "; year: " + movie.search_year);
            }
            else {
                say(" Could not infer the name of file: " + movie.video_file.get_full_path());
                remove_list.push(index);
            }
            ;
        });
        Utils.clean_list(new_movie_list, remove_list);
        new_movie_list.forEach(function (movie, index, list) {
            movie.get_and_save_info(onSearch, index);
        });
        var count = 0;
        function onSearch(found, movie, index) {
            count++;
            if (!found) {
                console.log("Could not find " + movie.search_title + " in datbase");
                remove_list.push(index);
            }
            else {
                console.log("found " + movie.movie_info.title + " (id:" + movie.movie_info.id + ") in database");
                console.log(movie.movie_info);
                save_info(movie);
                that.gui_controller.add_movie_item(movie);
            }
            if (count == new_movie_list.length) {
                onInfoSaved();
            }
        }
        function onInfoSaved() {
            Utils.clean_list(new_movie_list, remove_list);
            console.log("oh yeah");
            that.movie_list = that.movie_list.concat(new_movie_list);
        }
        function save_info(movie) {
            var entry = {
                video_file_ID: Platform.fs.retainEntry(movie.video_file),
                id: movie.movie_info.id,
                title: movie.movie_info.title,
                year: movie.movie_info.year,
                tagline: movie.movie_info.tagline,
                description: movie.movie_info.description,
                cast: movie.movie_info.cast,
                crew: movie.movie_info.crew,
                genres: movie.movie_info.genres
            };
            var id = entry.id.toString();
            var storage_obj = {};
            storage_obj[id] = entry;
            Platform.localStorage.setJSON(storage_obj, function () {
                console.debug("stored");
            });
            movie.load_poster();
            var image_file_name = movie.movie_info.id.toString() + ".jpg";
            movie.poster(function (blob) {
                that.app_data_dir.getFile(image_file_name, { create: true }, function (entry) {
                    entry.write(blob, function () {
                        console.debug("wrote image file");
                    });
                });
            }, err);
            function err(e) {
                console.debug(e.message);
            }
        }
    };
    Controller.prototype.load_stored_movies = function () {
        var that = this;
        var new_movie_list = [];
        Platform.localStorage.get(null, onLoaded);
        function onLoaded(stored) {
            console.log("aaaaaa");
            var count = 0;
            $.each(stored, function (key, item) {
                function err(e) {
                    console.debug(e.message);
                }
                function onRestoreEntry(entry) {
                    var movie = new Movie(entry);
                    movie.movie_info.id = item.id;
                    movie.movie_info.title = item.title;
                    movie.movie_info.year = item.year;
                    movie.movie_info.tagline = item.tagline;
                    movie.movie_info.description = item.description;
                    movie.movie_info.cast = item.cast;
                    movie.movie_info.crew = item.crew;
                    movie.movie_info.genres = item.genres;
                    that.app_data_dir.getFile(movie.movie_info.id.toString() + ".jpg", { create: false }, function (ent, error) {
                        ent.file(function (file) {
                            movie.set_poster_blob(file);
                        }, err);
                    });
                    new_movie_list.push(movie);
                    ready();
                }
                function onRestoreFailure(e) {
                    err(Error('Could not restore file entry: ' + e.message));
                    ready();
                }
                if (key != "config")
                    Platform.fs.restoreEntry(item.video_file_ID, onRestoreEntry, onRestoreFailure);
                else
                    ready();
            });
            function ready() {
                count++;
                if (count == Object.keys(stored).length)
                    proceed();
            }
            function proceed() {
                new_movie_list.forEach(function (movie) {
                    that.gui_controller.add_movie_item(movie);
                });
                that.movie_list = that.movie_list.concat(new_movie_list);
            }
        }
    };
    return Controller;
})();
/*
    A thin wrapper for TheMovieDb.org's API.
*/
/// <reference path="./defs/jquery.d.ts"/>
var TMDb;
(function (TMDb_1) {
    var API_KEY = '';
    var SEARCH_URL = "http://api.themoviedb.org/3/search/movie";
    var MOVIE_INFO_URL = "http://api.themoviedb.org/3/movie/MOVIE_ID";
    var IMAGE_BASE_URL = "http://image.tmdb.org/t/p/";
    var CREDITS_URL = "http://api.themoviedb.org/3/movie/MOVIE_ID/credits";
    var REVIEWS_URL = "http://api.themoviedb.org/3/movie/MOVIE_ID/reviews";
    var GENRES_URL = "http://api.themoviedb.org/3/genre/list";
    var TMDb = (function () {
        function TMDb(api_key) {
            API_KEY = api_key;
            this.IMAGE_BASE_URL = IMAGE_BASE_URL;
        }
        TMDb.register = function (func) {
            var _this = this;
            var flush = function () {
                _this.scheduled = false;
                _this.req_count = 0;
                while (_this.req_queue.length > 0 && _this.req_count < _this.max_req_per_10_sec) {
                    _this.req_count++;
                    _this.req_queue.pop()();
                }
                if (_this.req_queue.length > 0) {
                    _this.scheduled = true;
                    setTimeout(flush, 10 * 1000);
                }
            };
            if (this.req_count < this.max_req_per_10_sec) {
                this.req_count++;
                func();
            }
            else {
                this.req_queue.push(func);
                if (this.scheduled == false) {
                    this.scheduled = true;
                    setTimeout(flush, 10 * 1000);
                }
            }
        };
        TMDb.prototype.search_movie = function (qry_str, cb) {
            TMDb.register(function () {
                function on_reply(resp) {
                    if (resp.results.length > 0) {
                        cb(resp.results[0]);
                    }
                    else {
                        cb("not found");
                    }
                }
                $.getJSON(SEARCH_URL, {
                    api_key: API_KEY,
                    query: qry_str
                }, on_reply);
            });
        };
        TMDb.prototype.get_movie_info = function (id, cb) {
            TMDb.register(function () {
                $.getJSON(MOVIE_INFO_URL.replace("MOVIE_ID", id.toString()), {
                    api_key: API_KEY
                }, on_reply);
                function on_reply(resp) {
                    if ("id" in resp) {
                        cb(resp);
                    }
                    else {
                        cb("not found");
                    }
                }
            });
        };
        TMDb.prototype.get_credits = function (id, cb) {
            TMDb.register(function () {
                $.getJSON(CREDITS_URL.replace("MOVIE_ID", id.toString()), {
                    api_key: API_KEY
                }, on_reply);
                function on_reply(resp) {
                    if ("cast" in resp) {
                        cb(resp);
                    }
                    else {
                        cb("not found");
                    }
                }
            });
        };
        TMDb.prototype.get_genres = function (cb) {
            TMDb.register(function () {
                $.getJSON(GENRES_URL, {
                    api_key: API_KEY
                }, on_reply);
                function on_reply(resp) {
                    //            console.log("Got the fucking reply.");
                    //            console.log(resp);
                    if ("genres" in resp) {
                        cb(null, resp.genres);
                    }
                    else {
                        cb(Error("Could not get genres list from server."), null);
                    }
                }
            });
        };
        TMDb.req_queue = [];
        TMDb.req_count = 0;
        TMDb.max_req_per_10_sec = 40;
        TMDb.scheduled = false;
        return TMDb;
    })();
    TMDb_1.TMDb = TMDb;
})(TMDb || (TMDb = {}));
/// <reference path="../defs/node-0.11.d.ts"/>
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Platform;
(function (Platform) {
    var fs;
    (function (fs_1) {
        var Entry = (function () {
            function Entry(filename, parent_path, parent_full_path) {
                var path_mod = require('path');
                this.full_path = path_mod.join(parent_full_path, filename);
                this.basename = path_mod.basename(this.full_path);
            }
            Entry.prototype.isDirectory = function () {
                var fs = require('fs');
                var stats = fs.statSync(this.full_path);
                if (stats.isDirectory()) {
                    return true;
                }
                else {
                    return false;
                }
            };
            Entry.prototype.isFile = function () {
                var fs = require('fs');
                var stats = fs.statSync(this.full_path);
                if (stats.isFile()) {
                    return true;
                }
                else {
                    return false;
                }
            };
            Entry.prototype.get_base_name = function () {
                return this.basename;
            };
            Entry.prototype.get_full_path = function () {
                return this.full_path;
            };
            Entry.prototype.get_directory_path = function () {
                var p = require('path');
                return p.dirname(this.full_path);
            };
            return Entry;
        })();
        fs_1.Entry = Entry;
        var FileEntry = (function (_super) {
            __extends(FileEntry, _super);
            function FileEntry(filename, parent_path, parent_full_path) {
                _super.call(this, filename, parent_path, parent_full_path);
            }
            FileEntry.prototype.file = function (success_cb, error_cb) {
                var fs = require('fs');
                fs.readFile(this.full_path, function (e, data) {
                    var blob = new Blob([new Uint8Array(data)]);
                    success_cb(blob);
                });
            };
            FileEntry.prototype.write = function (blob, callback) {
                var _this = this;
                var writeData = function (buffer) {
                    var fs = require('fs');
                    fs.open(_this.full_path, 'w', function (err, fd) {
                        if (err != null) {
                            console.debug(err);
                        }
                        else {
                            fs.write(fd, buffer, 0, buffer.length, 0, function (err, written, buffer) {
                                if (err != null) {
                                    console.debug(err);
                                }
                                else {
                                    console.debug("it seems the data was written properly :)");
                                    callback();
                                }
                            });
                        }
                    });
                };
                var reader = new FileReader();
                reader.onload = function () {
                    var buffer = new Buffer(new Uint8Array(this.result));
                    writeData(buffer);
                };
                reader.readAsArrayBuffer(blob);
            };
            return FileEntry;
        })(Entry);
        fs_1.FileEntry = FileEntry;
        var DirEntry = (function (_super) {
            __extends(DirEntry, _super);
            function DirEntry(dirname, parent_path, parent_full_path) {
                _super.call(this, dirname, parent_path, parent_full_path);
            }
            DirEntry.prototype.getChildren = function (cb) {
                var _this = this;
                var fs = require('fs');
                fs.readdir(this.full_path, function (err, files) {
                    console.log(files);
                    console.log("files");
                    var child_list = [];
                    files.forEach(function (val, index) {
                        var stats = fs.statSync(_this.full_path);
                        if (stats.isFile()) {
                            var file_entry = new FileEntry(val, _this.full_path, _this.full_path);
                            child_list.push(file_entry);
                        }
                        else if (stats.isDirectory()) {
                            var dir_entry = new DirEntry(val, _this.full_path, _this.full_path);
                            child_list.push(dir_entry);
                        }
                    });
                    cb(child_list);
                });
            };
            DirEntry.prototype.getFile = function (name, flags, callback) {
                var _this = this;
                if (typeof flags == 'undefined' || flags == null) {
                    flags = {
                        create: false,
                        exclusive: false
                    };
                }
                var fs = require('fs');
                var path = require('path');
                var file_path = path.join(this.full_path, name);
                var stat = fs.stat(file_path, function (err, stats) {
                    var return_file = function () {
                        callback(new FileEntry(name, _this.full_path, _this.full_path), null);
                    };
                    var create_and_return_file = function () {
                        fs.open(file_path, 'w', function (err, fd) {
                            fs.close(fd);
                            return_file();
                        });
                    };
                    if (flags.create) {
                        if (err != null) {
                            if (err.code == "ENOENT") {
                                create_and_return_file();
                            }
                            else {
                                console.debug("sometihng went wrong stating " + file_path);
                            }
                        }
                        else {
                            if (flags.exclusive) {
                                console.debug(file_path + " already exists and the exclusive flag is set. Failed.");
                            }
                            else {
                                if (stats.isDirectory()) {
                                    console.debug(file_path + " is a directory. Failed.");
                                }
                                else {
                                    return_file();
                                }
                            }
                        }
                    }
                    else {
                        if (err != null) {
                            if (err.code == "ENOENT") {
                                console.debug(file_path + " does not exist and create flag is not set. failed");
                            }
                            else {
                                console.debug("sometihng went wrong stating " + file_path);
                            }
                        }
                        else {
                            if (stats.isDirectory()) {
                                console.debug(file_path + " is a directory. Failed.");
                            }
                            else {
                                return_file();
                            }
                        }
                    }
                });
            };
            DirEntry.prototype.getDirectory = function (name, flags, callback) {
                var _this = this;
                if (typeof flags == 'undefined') {
                    flags = {
                        create: false,
                        exclusive: false
                    };
                }
                var fs = require('fs');
                var path = require('path');
                var file_path = path.join(this.full_path, name);
                var stat = fs.stat(file_path, function (err, stats) {
                    var return_dir = function () {
                        callback(new DirEntry(name, _this.full_path, _this.full_path));
                    };
                    function create_and_return_dir() {
                        fs.mkdir(file_path, function (err) {
                            if (err == null) {
                                return_dir();
                            }
                            else {
                                console.debug(err);
                            }
                        });
                    }
                    if (flags.create) {
                        if (err != null) {
                            if (err.code == "ENOENT") {
                                create_and_return_dir();
                            }
                            else {
                                console.debug("sometihng went wrong stating " + file_path);
                            }
                        }
                        else {
                            if (flags.exclusive) {
                                console.debug(file_path + " already exists and the exclusive flag is set. Failed.");
                            }
                            else {
                                if (stats.isFile()) {
                                    console.debug(file_path + " is a file. Failed.");
                                }
                                else {
                                    return_dir();
                                }
                            }
                        }
                    }
                    else {
                        if (err != null) {
                            if (err.code == "ENOENT") {
                                console.debug(file_path + " does not exist and create flag is not set. failed");
                            }
                            else {
                                console.debug("sometihng went wrong stating " + file_path);
                            }
                        }
                        else {
                            if (stats.isFile()) {
                                console.debug(file_path + " is a file. Failed.");
                            }
                            else {
                                return_dir();
                            }
                        }
                    }
                });
            };
            return DirEntry;
        })(Entry);
        fs_1.DirEntry = DirEntry;
        function chooseEntry(chooser_type, success, failure) {
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
                }
                else if (chooser_type == 'file') {
                    var file_entry = new FileEntry(basename, undefined, parent_path);
                    success(file_entry);
                }
            });
            chooser.click();
        }
        fs_1.chooseEntry = chooseEntry;
        function appDataDir(callback) {
            var gui = require('nw.gui');
            var path = require('path');
            var fs = require('fs');
            var data_dir = path.join(gui.App.dataPath, "appdata");
            fs.mkdir(data_dir, function (err) {
                if (err != null) {
                    if (err.code == "EEXIST") {
                        console.log("Data directory already exists");
                    }
                    else {
                        console.debug(err);
                        return;
                    }
                }
                else {
                    console.debug("Created " + data_dir);
                }
            });
            var basename = path.basename(data_dir);
            var parent_full_path = path.dirname(data_dir);
            callback(new DirEntry(basename, undefined, parent_full_path));
        }
        fs_1.appDataDir = appDataDir;
        function retainEntry(entry) {
            return JSON.stringify([entry.get_full_path(), entry.get_base_name()]);
        }
        fs_1.retainEntry = retainEntry;
        function restoreEntry(id, success, failure) {
            var fs = require('fs');
            var path = require('path');
            try {
                var id_arr = JSON.parse(id);
            }
            catch (e) {
                failure(e);
                return;
            }
            var full_parent_path = path.dirname(id_arr[0]);
            var root_parent_path = id_arr[1];
            var basename = path.basename(id_arr[0]);
            try {
                var stat = fs.statSync(full_parent_path);
            }
            catch (e) {
                failure(e);
                return;
            }
            if (stat.isFile()) {
                success(new FileEntry(basename, root_parent_path, full_parent_path));
            }
            else if (stat.isDirectory()) {
                success(new DirEntry(basename, root_parent_path, full_parent_path));
            }
        }
        fs_1.restoreEntry = restoreEntry;
    })(fs = Platform.fs || (Platform.fs = {}));
})(Platform || (Platform = {}));
/// <reference path="./TMDb.ts"/>
/// <reference path="./Platform/fs.ts"/>
/// <reference path="./defs/jquery.d.ts"/>
var Movie = (function () {
    function Movie(_video_file) {
        this.video_file = _video_file;
        this.tmdb = window.tmdb;
        this.search_title = '';
        this.search_year = '';
        this._is_poster_loaded = false;
        this.movie_info = {
            id: 0,
            title: "",
            year: 0,
            tagline: "",
            description: "",
            posterpath: "",
            genres: [],
            cast: [],
            crew: [],
            getDirector: function () {
                for (var iii = 0; iii < this.crew.length; iii++) {
                    if (this.crew[iii].job == "Director") {
                        return this.crew[iii].name;
                    }
                }
            },
            get_nth_cast: function (num) {
                for (var iii = 0; iii < this.cast.length; iii++) {
                    if (this.cast[iii].order == num) {
                        return this.cast[iii].name;
                    }
                }
            }
        };
        this.tmdb = window.tmdb;
        this._onPosterLoaded = [];
    }
    Movie.prototype.infer_title_and_year = function () {
        var basename = this.video_file.get_base_name();
        var regex = /sample/i;
        if (regex.test(basename)) {
            return false;
        }
        regex = /\b([A-Za-z0-9 ]+?)\b[() .\[\]]*((?:19|20)\d\d)/i;
        var matches = regex.exec(basename.split(".").join(" "));
        if (matches !== null) {
            this.search_title = matches[1];
            this.search_year = matches[2];
            return true;
        }
        else {
            return false;
        }
        ;
    };
    Movie.prototype.get_and_save_info = function (cb, param) {
        var _this = this;
        var onSearch = function (result) {
            if (result == "not found") {
                cb(false, _this, param);
            }
            else {
                _this.tmdb.get_movie_info(result.id, onReturnInfo);
            }
        };
        var onReturnInfo = function (result) {
            if (result == "not found") {
                cb(false, _this, param);
            }
            else {
                _this.movie_info.title = result.title;
                _this.movie_info.id = result.id;
                _this.movie_info.description = result.overview;
                _this.movie_info.tagline = result.tagline;
                _this.movie_info.posterpath = _this.tmdb.IMAGE_BASE_URL + "w154" + result.poster_path;
                _this.movie_info.genres = result.genres;
                _this.tmdb.get_credits(result.id, onReturnCredits);
            }
        };
        var onReturnCredits = function (result) {
            if (result == "not found") {
                cb(false, _this, param);
            }
            else {
                _this.movie_info.cast = result.cast;
                _this.movie_info.crew = result.crew;
                cb(true, _this, param);
            }
        };
        this.tmdb.search_movie(this.search_title, onSearch);
    };
    Movie.prototype.set_poster_blob = function (blob) {
        var _this = this;
        this._poster_blob = blob;
        this._is_poster_loaded = true;
        this._onPosterLoaded.forEach(function (callback) {
            callback(_this._poster_blob);
        });
    };
    Movie.prototype.load_poster = function () {
        var _this = this;
        Utils.get_image(this.movie_info.posterpath, function (blob) {
            _this._poster_blob = blob;
            _this._is_poster_loaded = true;
            _this._onPosterLoaded.forEach(function (callback) {
                callback(_this._poster_blob);
            });
        });
    };
    Movie.prototype.poster = function (cb) {
        if (this._is_poster_loaded) {
            cb(this._poster_blob);
        }
        else {
            this._onPosterLoaded.push(cb);
        }
    };
    return Movie;
})();
/// <reference path="./Movie.ts"/>
var webkitURL;
var MovieItem = (function () {
    function MovieItem(_movie, evHandler) {
        var _this = this;
        var that = this;
        this.movie = _movie;
        this.$item_container = $('<div class="movie-item"> </div>');
        this.$poster = $('<img class="movie-poster">');
        var html = '<div class="movie-info-container">' +
            '<a class="movie-title"></a>' +
            '<br/><br/>' +
            '<a class="director"></a>' +
            '<br/>' +
            '<a class="cast"></a>' +
            '<br/><br/>' +
            '<p class="movie-description"></p>' +
            '</div>';
        this.$movie_info_comtainer = $(html);
        html = '<div class="controls-box">' +
            '<div class="controls-wrapper">' +
            '<img class="control-button play-button" src="../icons/play-grey.png">' +
            '<br/>' +
            '<img class="control-button info-button" src="../icons/help-info-grey.png">' +
            '<br/>' +
            '<img class="control-button open-dir-button" src="../icons/folder.svg">' +
            '</div>' +
            '</div>';
        this.$controls_box = $(html);
        this.$controls_box.find(".play-button").click(function (event) {
            evHandler.play(that);
        });
        this.$controls_box.find(".open-dir-button").click(function (event) {
            evHandler.open_dir(that);
        });
        this.$movie_title = this.$movie_info_comtainer.children(".movie-title");
        this.$director = this.$movie_info_comtainer.children(".director");
        this.$cast = this.$movie_info_comtainer.children(".cast");
        this.$movie_description = this.$movie_info_comtainer.children(".movie-description");
        this.movie.poster(function (blob) {
            var img_url = URL.createObjectURL(blob);
            _this.$poster.attr("src", img_url);
        });
        this.$movie_title.text(this.movie.movie_info.title);
        this.$director.text("Directed by " + this.movie.movie_info.getDirector());
        this.$cast.text("Cast: " + this.movie.movie_info.get_nth_cast(0) + ", " + this.movie.movie_info.get_nth_cast(1) + ", " + this.movie.movie_info.get_nth_cast(2));
        this.$movie_description.text(this.movie.movie_info.description);
        this.$item_container.append(this.$poster);
        this.$item_container.append(this.$movie_info_comtainer);
        this.$item_container.append(this.$controls_box);
    }
    return MovieItem;
})();
var SearchBox = (function () {
    function SearchBox(search_cb) {
        var that = this;
        if (!SearchBox.serial_id) {
            SearchBox.serial_id = 0;
        }
        this.searchbox_id = SearchBox.serial_id++;
        this.$main_container = $('<div class="searchbox-container">');
        this.$main_container.attr('id', 'sb' + this.searchbox_id);
        this.$main_container.append($('<div class=\"sb-search-icon-cont\"> <img class=\"sb-icon\" src=\"../icons/mag-glass.svg\"> </div> <input class=\"sb-text-input\" type=\"search\" placeholder=\"Search movies\">'));
        var $text_input = this.$main_container.find('.sb-text-input');
        $text_input.on('input', function () {
            search_cb($text_input.val());
        });
    }
    return SearchBox;
})();
/// <reference path="./MovieItem.ts"/>
/// <reference path="./SearchBox.ts"/>
/// <reference path="./defs/jquery.d.ts"/>
var GUIController = (function () {
    function GUIController(controller) {
        var _this = this;
        var that = this;
        this.controller = controller;
        this.movie_item_list = [];
        this.$container = $('#container');
        this.main_view = new ListView();
        this.$content_container = $('#content');
        this.$player = $('<video class="player"></video');
        this.$sidebar = $('#sidebar');
        this.$toolbar = $('#toolbar');
        this.searchbox = new SearchBox(function (query) { return _this.search(query); });
        this.searchview = new ListView();
        this.genreview = new ListView();
        this.$genre_filter = $('#genres-list');
        console.log(this.$genre_filter);
        this.current_view = 'listview';
        this.playing = false;
        this.init_ui();
    }
    GUIController.prototype.init_ui = function () {
        var _this = this;
        this.$toolbar.append(this.searchbox.$main_container);
        $("#add-button").click(function () {
            Platform.fs.chooseEntry("directory", function (entry) {
                console.log("selected directory " + entry.get_full_path());
                _this.controller.load_new_movies_from_dir(entry);
            }, undefined);
        });
        $("#close-button").click(function (event) {
            window.close();
        });
        $('#expand-button').click(function (event) {
            _this.expand_sidebar();
        });
        this.$content_container.append(this.main_view.$main_container);
        var add_genre_filter_item = function (genre) {
            var $genre_filer_item = $('<li>' + genre.name + '</li>');
            $genre_filer_item.click(function (ev) {
                _this.show_genre(genre);
                console.log("clicked" + genre.name);
            });
            _this.$genre_filter.append($genre_filer_item);
        };
        add_genre_filter_item({
            id: -1,
            name: "All"
        });
        this.controller.genres.forEach(add_genre_filter_item);
    };
    GUIController.prototype.search = function (query) {
        var _this = this;
        this.searchview.clear();
        if (query == '') {
            this.toggle_view('listview');
        }
        else {
            this.toggle_view('searchview');
            var regex = new RegExp(query, 'i');
            this.movie_item_list.forEach(function (movie_item, index, list) {
                if (regex.test(movie_item.movie.movie_info.title)) {
                    _this.searchview.add_item(movie_item);
                }
            });
        }
    };
    GUIController.prototype.show_genre = function (req_genre) {
        var _this = this;
        this.genreview.clear();
        if (req_genre.name == 'All') {
            this.toggle_view('listview');
        }
        else {
            this.toggle_view('genreview');
            this.movie_item_list.forEach(function (movie_item) {
                var added = false;
                movie_item.movie.movie_info.genres.forEach(function (movie_genre) {
                    if (added == false && req_genre.id == movie_genre.id) {
                        _this.genreview.add_item(movie_item);
                        added = true;
                    }
                });
            });
        }
    };
    GUIController.prototype.toggle_view = function (view) {
        var _this = this;
        var add = function (list_view) {
            _this.current_view = view;
            _this.$content_container.append(list_view.$main_container);
        };
        this.$content_container.children().detach();
        switch (view) {
            case 'listview':
                add(this.main_view);
                break;
            case 'searchview':
                add(this.searchview);
                break;
            case 'genreview': add(this.genreview);
        }
    };
    GUIController.prototype.expand_sidebar = function () {
        $('#toolbar, #content').toggleClass('sidebar-collapsed');
        $('#sidebar, #toolbar, #content').toggleClass('sidebar-expanded');
    };
    GUIController.prototype.add_movie_item = function (movie) {
        var movie_item = new MovieItem(movie, {
            play: this.play_movie,
            stop: this.stop_movie,
            open_dir: this.open_containing_directory
        });
        this.movie_item_list.push(movie_item);
        this.main_view.add_item(movie_item);
    };
    GUIController.prototype.play_movie = function (movie_item) {
        console.log("aaaaaaaaaaaaaaaaa");
        var gui = require('nw.gui');
        gui.Shell.openItem(movie_item.movie.video_file.get_full_path());
    };
    GUIController.prototype.open_containing_directory = function (movie_item) {
        var gui = require('nw.gui');
        gui.Shell.openItem(movie_item.movie.video_file.get_directory_path());
    };
    GUIController.prototype.stop_movie = function () {
        // TODO: Remove this dead code
        // if (this.playing) {
        //     this.$player.get(0).pause();
        //     this.$player.detach();
        //     this.$container.appendTo('body');
        //     this.playing = false;
        // }
    };
    return GUIController;
})();
var ListView = (function () {
    function ListView() {
        var that = this;
        this.$main_container = $("<div class='list-view'><div>");
        this.movie_item_container = [];
        if (!ListView.main) {
            ListView.main = this;
        }
    }
    ListView.prototype.add_item = function (movie_item) {
        var $clone;
        if (ListView.main == this) {
            $clone = movie_item.$item_container;
        }
        else {
            $clone = movie_item.$item_container.clone(true);
        }
        this.movie_item_container.push(movie_item);
        this.$main_container.append($clone);
    };
    ListView.prototype.clear = function () {
        this.$main_container.children().remove();
        this.movie_item_container = [];
    };
    return ListView;
})();
var Platform;
(function (Platform) {
    Platform.localStorage = {
        setJSON: function (entry, callback) {
            if (typeof entry != "object") {
                console.debug("entry is not an object");
                return;
            }
            else if (Object.keys(entry).length != 1) {
                console.debug("entry is longer than one key-value pair");
                return;
            }
            var key = Object.keys(entry)[0];
            var value = entry[key];
            if (Platform.platform == "node-webkit") {
                if (typeof value == "object" || typeof value == "array") {
                    value = JSON.stringify(value);
                }
                else {
                    console.debug("Value of item has to be a valid JSON-able object or array");
                }
                window.localStorage.setItem(key, value);
                callback();
            }
        },
        get: function (query, callback) {
            if (typeof query == "array") {
            }
            else if (typeof query == "string") {
                if (Platform.platform == "node-webkit") {
                    var value = window.localStorage.getItem(query);
                    if (value == null)
                        callback(null, Error('Key was not found'));
                    else
                        callback(JSON.parse(value));
                }
            }
            else if (query == null) {
                if (Platform.platform == "node-webkit") {
                    var key, value;
                    var obj = {};
                    for (var iii = 0; iii < window.localStorage.length; iii++) {
                        key = window.localStorage.key(iii);
                        value = window.localStorage.getItem(key);
                        try {
                            value = JSON.parse(value);
                        }
                        catch (e) {
                        }
                        obj[key] = value;
                    }
                    callback(obj);
                }
            }
        }
    };
})(Platform || (Platform = {}));
var Platform;
(function (Platform) {
    Platform.platform = "node-webkit";
})(Platform || (Platform = {}));
/// <reference path="./MovieItem.ts"/>
var SearchView = (function () {
    function SearchView() {
        var that = this;
        this.$main_container = $("<div class='search-view'><div>");
        this.movie_item_container = [];
    }
    SearchView.prototype.add_item = function (movie_item) {
        var $clone = movie_item.$item_container.clone();
        this.movie_item_container.push(movie_item);
        this.$main_container.append($clone);
    };
    SearchView.prototype.clear = function () {
        this.$main_container.children().remove();
        this.movie_item_container = [];
    };
    return SearchView;
})();
// Global object containing utility methods. No properties live here
var Utils = {
    get_dir_chilren: function (dir, cb) {
        var dir_reader = dir.createReader();
        var child_list = [];
        function read_children() {
            dir_reader.readEntries(function (entries) {
                if (entries.length == 0) {
                    cb(child_list);
                }
                else {
                    child_list = child_list.concat(entries);
                    read_children();
                }
            });
        }
        read_children();
    },
    clean_list: function (item_list, remove_list) {
        remove_list.forEach(function (index, i, list) {
            item_list.splice(index - i, 1);
        });
        remove_list.length = 0;
    },
    get_image: function (url, cb) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.responseType = "arraybuffer";
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4 && xhr.status == 200) {
                on_reply(xhr.response);
            }
        };
        xhr.send();
        function on_reply(resp) {
            var buffer = new Uint8Array(resp);
            cb(new Blob([buffer], { type: "image/jpeg" }));
        }
    }
};
