/*
    A thin wrapper for TheMovieDb.org's API.
*/
function TMDb(api_key) {

	this.API_KEY = api_key;

	this.SEARCH_URL = "http://api.themoviedb.org/3/search/movie";
	this.MOVIE_INFO_URL = "http://api.themoviedb.org/3/movie/MOVIE_ID";
	this.IMAGE_BASE_URL = "http://image.tmdb.org/t/p/";
	this.CREDITS_URL = "http://api.themoviedb.org/3/movie/MOVIE_ID/credits";
	this.REVIEWS_URL = "http://api.themoviedb.org/3/movie/MOVIE_ID/reviews";
    this.GENRES_URL = "http://api.themoviedb.org/3/genre/list"

	// Searches for movies with the string provided.
	// The callback is called with the result of the search
	// The result parameter passed to the callback is either set to the object of the first hit,
	// or is set to the string "not found" if no hits were found.
	this.search_movie = function(qry_str, cb) {

		function on_reply(resp) {

			if (resp.results.length > 0) {
				cb(resp.results[0]);
			} else {
				cb("not found")
			}

		}

		$.getJSON(this.SEARCH_URL, {
			api_key: this.API_KEY,
			query: qry_str
		}, on_reply);


	}

	// Gets detailed info about the movie with the ID passed
	// The callback is called with the result
	// If movie exists, and a proper object is returned, the callback is called with the returned object,
	// else it is called with the string "not found".
	this.get_movie_info = function(id, cb) {

		$.getJSON(this.MOVIE_INFO_URL.replace("MOVIE_ID", id.toString()), {
			api_key: this.API_KEY
		}, on_reply);

		function on_reply(resp) {

			if ("id" in resp) {
				cb(resp);
			} else {
				cb("not found")
			}

		}

	}

    this.get_credits = function(id, cb) {

        $.getJSON(this.CREDITS_URL.replace("MOVIE_ID", id.toString()), {
			api_key: this.API_KEY
		}, on_reply);

		function on_reply(resp) {

			if ("cast" in resp) {
				cb(resp);
			} else {
				cb("not found")
			}

		}

    }

    /*
        calls callback with true if found and false if not found as the first argument.
        The genres array is passed as the second argument  if successful.

        cb: Callback with the parameters:
            error: error thrown if the list could not be fetched. Null if no error.
            genres_array: Array of genre objects. Null if error occured.
    */
    this.get_genres = function(cb) {

        $.getJSON(this.GENRES_URL, {
			api_key: this.API_KEY
		}, on_reply);

		function on_reply(resp) {

//            console.log("Got the fucking reply.");
//            console.log(resp);

			if ("genres" in resp) {
				cb(null, resp.genres);
			} else {
				cb(Error("Could not get genres list from server."), null);
			}

		}

    }


}
