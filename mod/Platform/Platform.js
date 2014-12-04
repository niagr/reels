/*
    Static class that abstacts the platform differences.
    Aims to bring other platforms up to par with the best implementations,
    to serve as a union of platform functionality.
*/

var Platform = function() {
    
    Platform.init_platform = function() {
        if (typeof chrome !== 'undefined') {
            Platform.platform = "chrome";
        } else {
            Platform.platform = 'node-webkit';
        }
        console.log("Platform initialised: " + Platform.platform);
    }
    
    Platform.localStorage = {};
    
    Platform.init_platform();
    
}

Platform();