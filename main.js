/* main.js
* 
* TODO:
* - Cache whole page text when possible/read
* - Cache options and prevent them from being reset on
* 	close of extension
* - Cache reading progress?
* - Trigger pause on clicking of central element, not
* 	just text
* - Add function "cleanHTML" to get rid of unwanted elements
*/

(function(){

	var unfluff = require('@knod/unfluff');

	var queue 		= new Queue(),
		timer 		= new ReaderlyTimer(),
		mainDisplay = new ReaderlyDisplay( timer ),
		playback 	= new ReaderlyPlayback( timer, mainDisplay ),
		settings 	= new ReaderlySettings( timer, mainDisplay ),
		speed 		= new SpeedSettings( timer, settings );

	$(timer).on( 'starting', function showLoading() {
		mainDisplay.wait();
	})


	function read ( text ) {
		// TODO: If there's already a queue, start where we left off
		queue.process( text );
		timer.start( queue );
		return true;
	}


	chrome.extension.onMessage.addListener(function (request, sender, sendResponse) {

		mainDisplay.show();
		mainDisplay.wait();

		var func = request.functiontoInvoke;
		if ( func === "readSelectedText" ) {
			read( request.selectedText );

		} else if ( func === "readFullPage" ) {

			var $clone = $('html').clone();
			$clone.find('sup').remove();
			$clone.find('script').remove();
			$clone.find('style').remove();

			var lang = 'en',
				cmds = unfluff.lazy( $clone.html(), lang ),
				data = cmds.text();
			read( data );

		}  // end if event is ___

	});  // End event listener

})();
