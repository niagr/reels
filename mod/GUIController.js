// This object controls the user interface
function GUIController(controller) {

    var that = this;

	this.controller = controller;

    // list of MovieItems added to the GUIController
    var movie_item_list = [];
    this.movie_item_list = movie_item_list;

    this.$container = $('#container');

    var $item_container = $("#movie-items-wrapper");

    // public for debugging purposes
    $content_container = $('#content');

    var $player = $('<video class="player"></video');

    var $sidebar = $('#sidebar');

    // public for debugging purposes
    this.$toolbar = $('#toolbar');

    //var $searchbox = $('#searchbox');

    var search = function(query) {
        searchview.clear();
        if (query == '') {
            toggle_view('listview');
        } else {
            toggle_view('searchview');
            var regex = new RegExp(query, 'i');
            movie_item_list.forEach(function(movie_item, index, list) {
                if (regex.test(movie_item.movie.movie_info.title)) {
                    searchview.add_item(movie_item);
                }
            });
        }
    }
    this.search = search;

    var searchbox = new SearchBox(search);

    this.searchbox = searchbox;

    var searchview = new SearchView();

    this.searchview = searchview;

    var current_view = 'listview';

    var playing = false;

	function init_ui() {

        that.$toolbar.append(searchbox.$main_container);

        $("#add-button").click(function() {
			Platform.fs.chooseEntry("directory", function(entry) {
				console.log("selected directory " + entry.path);
				that.controller.load_new_movies_from_dir(entry);
			});
		});

        $("#close-button").click(function(event) {
            window.close();
        });

        $('#expand-button').click(function(event) {
            that.expand_sidebar();
        });

	}

    var toggle_view = function (view) {
        $content_container.children().detach();
        if (view == 'searchview') {
            if (current_view != 'searchview')
                current_view = view;
                $content_container.append(searchview.$main_container);
        } else if (view == 'listview') {
            if (current_view != 'listview')
                current_view = view;
                $content_container.append($item_container);
        }
    };
    this.toggle_view = toggle_view;



    this.expand_sidebar = function() {
        $('#toolbar, #content').toggleClass('sidebar-collapsed');
        $('#sidebar, #toolbar, #content').toggleClass('sidebar-expanded');
    }

    this.add_movie_item = function(movie) {

        var movie_item = new MovieItem(movie, {
            play: that.play_movie,
            stop: that.stop_movie
        });

        this.movie_item_list.push(movie_item);

        $item_container.append(movie_item.$item_container);

    }

    this.play_movie = function(movie_item) {

        if (Platform.platform == "chrome") {
            $container.detach();
            movie_item.movie.video_file.file(function(file) {
                var video_url = webkitURL.createObjectURL(file);
                console.log(video_url);
                $player.attr("src", video_url);
                $player.attr("controls", true);
                $player.attr("autoplay", true);
                $player.appendTo('body');
                playing = true;
            });
        } else if (Platform.platform == "node-webkit") {
            console.log("aaaaaaaaaaaaaaaaa");
            var gui = require('nw.gui');
            gui.Shell.openItem(movie_item.movie.video_file.full_path);
        }



    }

    this.stop_movie = function() {

        if (playing) {
            $player.get(0).pause();
            $player.detach();
            $container.appendTo('body');
            playing = false;
        }

    }

	init_ui();

}
