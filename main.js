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
* 
* WARNING:
* Storage is all user settings. Too cumbersome otherwise for now.
*/

(function(){


	// ============== SETUP ============== \\
	var unfluff = require('@knod/unfluff'),
		detect 	= require('detect-lang'),
		Storage = require('./lib/ReaderlyStorage.js');


	var queue, storage, timer, mainDisplay, playback, settings, speed;
	
	var afterLoadSettings = function ( oldSettings ) {
		console.log('old settings:', oldSettings );
		timer 		= new ReaderlyTimer( oldSettings, storage )
		mainDisplay = new ReaderlyDisplay( timer ),
		playback 	= new ReaderlyPlayback( timer, mainDisplay ),
		settings 	= new ReaderlySettings( timer, mainDisplay ),
		speed 		= new SpeedSettings( timer, settings );
	};  // End afterLoadSettings()


	var addEvents = function () {
		$(timer).on( 'starting', function showLoading() { mainDisplay.wait(); })
	};  // End addEvents()


	var init = function () {
		queue 	= new Queue();
		storage = new Storage();
		storage.loadAll( afterLoadSettings );

		addEvents();
	};  // End init()


	// ============== START IT UP ============== \\
	init();



	// ============== RUNTIME ============== \\
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
	};  // End smallSample()


	chrome.extension.onMessage.addListener(function (request, sender, sendResponse) {

		mainDisplay.show();
		mainDisplay.wait();

		var func = request.functiontoInvoke;
		if ( func === "readSelectedText" ) {
			
			var contents = document.getSelection().getRangeAt(0).cloneContents();
			var container = $('<div></div>');
			container.append(contents);
			container.find('sup').remove();
			read( container.text() );

		} else if ( func === "readFullPage" ) {

			var $clone = $('html').clone(),
				$clean = cleanHTML( $clone );

			var sampleText = smallSample( $clean );

			detect( sampleText ).then(function (data) {
				var lang = data.iso6391 || 'en',
					cmds = unfluff.lazy( $clean.html(), lang ),
					data = cmds.text();
				read( data )
			});

		}  // end if event is ___

	});  // End event listener

})();
