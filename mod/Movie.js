function Movie(_video_file) {
    
    var that = this;
	
	this.video_file = 0;
	
	this.search_title = "";
	
	this.search_year = 0;
    
    // Blob of poster image file
    var poster_blob = 0;
    
    var is_poster_loaded = false;
	
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
        getDirector: function() {
            for (iii = 0; iii < that.movie_info.crew.length; iii++) {
                if (that.movie_info.crew[iii].job == "Director") {
                    return that.movie_info.crew[iii].name;
                }
            }
        },
        get_nth_cast: function(num) {
            for (iii = 0; iii < that.movie_info.cast.length; iii++) {
                if (that.movie_info.cast[iii].order == num) {
                    return that.movie_info.cast[iii].name;
                }
            }
        }
		
	}
    
	
	this.tmdb = 0;
	
	this.init = function() {
		
		this.video_file = _video_file;
		this.tmdb = window.tmdb;
		
	}
	
	
	// use filename to get the title and year of the movie
	// sets the variables and returns true if match found, else returns false
	this.infer_title_and_year = function() {
		
        // regex to eliminate sample files
        var regex = /sample/i;
        if (regex.test(this.video_file.name)) {
            return false;
        }
        
		// regex to capture the title and year
		regex = /\b([A-Za-z0-9 ]+?)\b[() .\[\]]*((?:19|20)\d\d)/i;
//		regex = /\b([A-Za-z0-9 ]+)\b[() .\[\]]*((?:19|20)\d\d)/i;
		
		var matches = regex.exec(this.video_file.basename.split(".").join(" "));
		if (matches !== null) {
			this.search_title = matches[1];
			this.search_year = matches[2];
			return true;
		} else {
			return false;
		};
		
	}
	
	// gets the movie information from TMDb's database
	// and saves the info to files and populates the data fields
	// calls the callback with true if hit found, false otherwise
	// also passes the Movie object itself and a parameters object
	this.get_and_save_info = function(cb, param) {
		
		var that = this;
		
		this.tmdb.search_movie(this.search_title, onSearch)
		
		function onSearch(result) {
			if (result == "not found") {
				cb(false, that, param);
			} else {
				that.tmdb.get_movie_info(result.id, onReturnInfo)
			}
		}
        
        function onReturnInfo(result) {
			
			if (result == "not found") {
				cb(false, that, param);
			} else {
				that.movie_info.title = result.title;
				that.movie_info.id = result.id;
				that.movie_info.description = result.overview;
				that.movie_info.tagline = result.tagline;
                that.movie_info.posterpath = that.tmdb.IMAGE_BASE_URL +  "w154" + result.poster_path;
//                that.movie_info.posterpath = "http://d3gtl9l2a4fn1j.cloudfront.net/t/p/w154" + result.poster_path;
                that.genres = result.genres;
                that.tmdb.get_credits(result.id, onReturnCredits)
//				cb(true, that, param);
			}
			
		}
        
        function onReturnCredits(result) {
            
            if (result == "not found") {
				cb(false, that, param);
			} else {
                that.movie_info.cast = result.cast;
                that.movie_info.crew = result.crew;
				cb(true, that, param);
			}
            
        }
		
	}
    
    /*
        @blob : blob of image file to set as poster
        Sets the poster to the passed image blob
        Then calls the pending callbacks that need the poster object
    */
    this.set_poster_blob = function(blob) {
        poster_blob = blob;
        is_poster_loaded = true;
        onPosterLoaded.forEach(function(callback) {
                callback(poster_blob);
        });
    }
    
    /*
        Fetches the poster from the url specified in the Movie's movie_info object
        Then calls the pending callbacks that need the poster object
    */
    this.load_poster = function() {
        
        Utils.get_image(that.movie_info.posterpath, function(blob) {
            poster_blob = blob;
            is_poster_loaded = true;
//            onPosterLoaded(poster_blob);
            onPosterLoaded.forEach(function(callback) {
                callback(poster_blob);
            });
        });
        
    }
    
    // array of callbacks for poster() funtion
    // called with poster blob as parameter
    var onPosterLoaded = [];
    
    // called by the party that wants the poster
    // callback has same signature as onPosterLoaded
    this.poster = function(cb) {
        if (is_poster_loaded) {
            cb(poster_blob);
        } else {
            onPosterLoaded.push(cb);
        }
    }
    
    
	this.init();
	
}