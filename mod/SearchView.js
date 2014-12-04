// A view to display search results

function SearchView() {

    var that = this;

    // The main conaining div for the widget.
    var $main_container = $("<div class='search-view'><div>");
    this.$main_container = $main_container;

    // List of MovieItem's added to the SearchView
    var movie_item_container = [];

    /*
      Add a MovieItem to be shown as the results.
        movie_info: MovieItem to add to the SearchView
    */
    this.add_item = function(movie_item) {

        var $clone = movie_item.$item_container.clone()
        movie_item_container.push(movie_item);
        this.$main_container.append($clone);

    };

    // Clear the SearchView of all results
    this.clear = function() {
        $main_container.children().remove();
        movie_item_container = [];
    };

    this.remove_item = function(movie_item) {

        item_container.forEach(function(item, index, list) {
            if (item.movie.movie_info.id == movie_item.movie.movie_info.id) {
                item.$item_container.detach();
                list.splice(index, 1);
            }
        })

    };

}
