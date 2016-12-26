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

	var unfluff = require('@knod/unfluff'),
		detect 	= require('detect-lang');

	var queue 		= new Queue(),
		timer 		= new ReaderlyTimer(),
		coreDisplay = new ReaderlyDisplay( timer ),
		playback 	= new ReaderlyPlayback( timer, coreDisplay ),
		settings 	= new ReaderlySettings( timer, coreDisplay ),
		speed 		= new SpeedSettings( timer, settings );

	$(timer).on( 'starting', function showLoading() {
		playback.wait();
	})


	var read = function ( text ) {
		// TODO: If there's already a queue, start where we left off
		queue.process( text );
		timer.start( queue );
		return true;
	};


	var cleanHTML = function ( $node ) {
		$node.find('sup').remove();
		$node.find('script').remove();
		$node.find('style').remove();
		return $node;
	};


	var smallSample = function ( $node ) {
	// Get three sample paragraphs from around the middle of the page
		var sample 	= '',
			$ps 	= $node.find('p'),
			numPs 	= $ps.length;
		if ( $ps[0] ) {
			var base = Math.floor(numPs/3);
			sample += $($ps[base]).text();
			sample += ' ' + $($ps[base * 2]).text();
			sample += ' ' + $($ps[base * 3]).text();
		}

		return sample;
	};


	chrome.extension.onMessage.addListener(function (request, sender, sendResponse) {

		coreDisplay.show();
		playback.wait();  // Do we need this?

		var func = request.functiontoInvoke;
		if ( func === "readSelectedText" ) {

			read( request.selectedText );

		} else if ( func === "readFullPage" ) {

			var $clone = $('html').clone(),
				$clean = cleanHTML( $clone );

			var sampleText = smallSample( $clean );

			detect( sampleText ).then(function afterLanguageDetection(data) {
				var lang = data.iso6391 || 'en',
					cmds = unfluff.lazy( $clean.html(), lang ),
					data = cmds.text();
				read( data )
			});

		}  // end if event is ___

	});  // End event listener

})();
