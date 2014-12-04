function MovieItem(_movie, evHandler) {
    
    var that = this;
    
    this.movie = _movie;
    
    this.$item_container = $('<div class="movie-item"> </div>');
    
    var $poster = $('<img class="movie-poster">');
    
    var html = '<div class="movie-info-container">' +
                    '<a class="movie-title"></a>' +
					'<br/><br/>' +
				    '<a class="director"></a>' +
					'<br/>' +
					'<a class="cast"></a>' +
					'<br/><br/>' +
				    '<p class="movie-description"></p>' +
                '</div>';
    
    var $movie_info_comtainer = $(html);
    
    html = '<div class="controls-box">' +
              '<div class="controls-wrapper">' +
                  '<img class="control-button play-button" src="icons/play-grey.png">' +
                  '<br/>' +
                  '<img class="control-button info-button" src="icons/help-info-grey.png"s>' +
              '</div>' +
           '</div>'
    
    var $controls_box = $(html);
    $controls_box.find(".play-button").click(function(event) {
        evHandler.play(that);
    });
    
    var $movie_title = $movie_info_comtainer.children(".movie-title");
    var $director = $movie_info_comtainer.children(".director");
    var $cast = $movie_info_comtainer.children(".cast");
    var $movie_description = $movie_info_comtainer.children(".movie-description");
    
    this.movie.poster(function(blob) {
        var img_url = webkitURL.createObjectURL(blob);
        $poster.attr("src", img_url);
    });
    
    $movie_title.text(this.movie.movie_info.title);
    $director.text("Directed by " + this.movie.movie_info.getDirector());
    $cast.text("Cast: " + this.movie.movie_info.get_nth_cast(0) + ", " + this.movie.movie_info.get_nth_cast(1) + ", " + this.movie.movie_info.get_nth_cast(2));
    $movie_description.text(this.movie.movie_info.description);
    
    this.$item_container.append($poster);
    this.$item_container.append($movie_info_comtainer);
    this.$item_container.append($controls_box);
    
}