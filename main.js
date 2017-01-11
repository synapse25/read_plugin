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
* - Remove html parsing from sbd node module
* 
* WARNING:
* Storage is all user settings. Too cumbersome otherwise for now.
*/

(function(){

	// ============== SETUP ============== \\
	var unfluff 	= require('@knod/unfluff'),
		detect 		= require('detect-lang');

	var Queue 		= require('./lib/Queue.js'),
		Storage 	= require('./lib/ReaderlyStorage.js'),
		Delayer 	= require('./lib/playback/Delayer.js')
		Timer 		= require('./lib/playback/ReaderlyTimer.js'),
		Display 	= require('./lib/ReaderlyDisplay.js'),
		Playback 	= require('./lib/playback/PlaybackUI.js'),
		Settings 	= require('./lib/settings/ReaderlySettings.js'),
		Speed 		= require('./lib/settings/SpeedSettings.js');

	var queue, storage, delayer, timer, coreDisplay, playback, settings, speed;


	var afterLoadSettings = function ( oldSettings ) {
		delayer 	= new Delayer( oldSettings, storage );
		timer 		= new Timer( delayer, oldSettings, storage );
		coreDisplay = new Display( timer );
		playback 	= new Playback( timer, queue, coreDisplay );
		settings 	= new Settings( timer, coreDisplay );
		speed 		= new Speed( delayer, settings );
	};  // End afterLoadSettings()


	var addEvents = function () {
		$(timer).on( 'starting', function showLoading() { playback.wait(); })
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

		coreDisplay.show();
		playback.wait();  // Do we need this?

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

			detect( sampleText ).then(function afterLanguageDetection(data) {
				var lang = data.iso6391 || 'en',
					cmds = unfluff.lazy( $clean.html(), lang ),
					data = cmds.text();
				read( data )
			});

		}  // end if event is ___

	});  // End event listener

})();
