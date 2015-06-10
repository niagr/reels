interface IListView {

    add_item (MovieItem): void;
    clear (): void;

}

class ListView implements IListView {


    // The main conaining div for the widget.
    public $main_container : JQuery;

    // List of MovieItem's added to the SearchView
    private movie_item_container: MovieItem[];


    constructor () {

        var that = this;

        this.$main_container = $("<div class='list-view'><div>");

        this.movie_item_container = [];

    }


    /*
      Add a MovieItem to be shown as the results.
        movie_info: MovieItem to add to the SearchView
    */
    public add_item (movie_item: MovieItem) {

        var $clone: JQuery = movie_item.$item_container.clone()
        this.movie_item_container.push(movie_item);
        this.$main_container.append($clone);

    }


    // Clear the SearchView of all results
    public clear () {
        this.$main_container.children().remove();
        this.movie_item_container = [];
    }


}
