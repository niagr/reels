/// <reference path="./MovieItem.ts"/>
/// <reference path="./SearchBox.ts"/>
/// <reference path="./defs/jquery.d.ts"/>



// TODO: Remove this prototype
// class Controller {
//
// }



// This object controls the user interface
class GUIController {


    private controller: Controller;


    // list of MovieItems added to the GUIController
    private movie_item_list: MovieItem[];


    private $container: JQuery;


    private $item_container: JQuery;


    private $content_container: JQuery;


    private $player: JQuery;


    private $sidebar: JQuery;


    private $toolbar: JQuery;


    private searchbox: SearchBox;


    private searchview: SearchView;


    private current_view: string; // TODO: make this into enum


    private playing: boolean;


    constructor (controller) {

        var that = this;

    	  this.controller = controller;

        this.movie_item_list = [];

        this.$container = $('#container');

        this.$item_container = $("#movie-items-wrapper");

        this.$content_container = $('#content');

        this.$player = $('<video class="player"></video');

        this.$sidebar = $('#sidebar');

        // public for debugging purposes
        this.$toolbar = $('#toolbar');

        this.searchbox = new SearchBox((query: string) => this.search(query));

        this.searchview = new SearchView();

        this.current_view = 'listview';

        this.playing = false;

        this.init_ui();

    }


    public search (query: string) {

        this.searchview.clear();
        if (query == '') {
            this.toggle_view('listview');
        } else {
            this.toggle_view('searchview');
            var regex = new RegExp(query, 'i');
            this.movie_item_list.forEach((movie_item: MovieItem, index, list) => {
                if (regex.test(movie_item.movie.movie_info.title)) {
                    this.searchview.add_item(movie_item);
                }
            });
        }

    }

	private init_ui () {

        this.$toolbar.append(this.searchbox.$main_container);

        $("#add-button").click(() => {
			Platform.fs.chooseEntry("directory", (entry: Platform.fs.Entry) => {
				console.log("selected directory " + entry.get_full_path());
				this.controller.load_new_movies_from_dir(entry);
			}, undefined);  // TODO: Add Error handling
		});

        $("#close-button").click(function(event) {
            window.close();
        });

        $('#expand-button').click((event) => {
            this.expand_sidebar();
        });

	}

    private toggle_view (view: string) {

        this.$content_container.children().detach();
        if (view == 'searchview') {
            if (this.current_view != 'searchview')
                this.current_view = view;
                this.$content_container.append(this.searchview.$main_container);
        } else if (view == 'listview') {
            if (this.current_view != 'listview')
                this.current_view = view;
                this.$content_container.append(this.$item_container);
        }

    }




    private expand_sidebar () {
        $('#toolbar, #content').toggleClass('sidebar-collapsed');
        $('#sidebar, #toolbar, #content').toggleClass('sidebar-expanded');
    }

    public add_movie_item (movie: Movie) {

        var movie_item = new MovieItem(movie, {
            play: this.play_movie,
            stop: this.stop_movie
        });

        this.movie_item_list.push(movie_item);

        this.$item_container.append(movie_item.$item_container);

    }

    private play_movie (movie_item: MovieItem) {

        console.log("aaaaaaaaaaaaaaaaa");
        var gui = require('nw.gui');
        gui.Shell.openItem(movie_item.movie.video_file.get_full_path());

    }


    private stop_movie () {

        // TODO: Remove this dead code
        // if (this.playing) {
        //     this.$player.get(0).pause();
        //     this.$player.detach();
        //     this.$container.appendTo('body');
        //     this.playing = false;
        // }

    }


}
