chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('index.html', {
	'id': "main-window",
    'bounds': {
      'width': 1200,
      'height': 600
    },
    'frame': 'none'
  });
});