/* ReadTimer.js
* 
* Handles passing out the fragments from Queue in a manner
* defined by its settings, which can change.
* 
* NOTES:
* - Always return Timer so functions can be chained
* - Always send Timer as the first argument as events to
* stay consistent.
*/

(function (root, timerFactory) {  // root is usually `window`
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define( ['jquery'], function ( jquery ) {
        	return ( root.ReadTimer = timerFactory( jQuery ) );
        });
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but only CommonJS-like
        // environments that support module.exports, like Node.
        module.exports = timerFactory( require('jquery') );
    } else {
        // Browser globals
        root.ReadTimer = timerFactory( root.jQuery );
    }
}(this, function ( $ ) {

	"use strict";

	var defaultSettings = {
		wpm: 300,
		slowStartCount: 5,
		sentenceDelay: 2.5,
		otherPuncDelay: 1.5,
		shortWordDelay: 1.3,
		longWordDelay: 1.4,
		numericDelay: 2.0
	};

	var whiteSpace = /[\n\r\s]/;

	var _rSetts = null;

	var ReadTimer = function ( settings ) {
	/* ( Str ) -> {}
	* 
	* A fragment of a sentence. Returns an object that can
	* be assessed to determine how long to display it.
	*/
		var rTim = {};

		rTim._setUp = function ( settings ) {

			rTim.progress 				= 0;
			rTim._currentWordFragment 	= null;

			// Defaults
			rTim.done 		 = false;
			rTim.delay 		 = 0;
			rTim._timer 	 = null;
			rTim._isStarting = true;
			rTim._isPlaying  = false;
			rTim._stepOperation = 'next';

			// Update settings based on what's passed in
			_rSetts 	= rTim._settings = defaultSettings;
			var wpm 	= settings.wpm 			  || _rSetts.wpm,
				sentDel = settings.sentenceDelay  || _rSetts.sentenceDelay,
				puncDel = settings.otherPuncDelay || _rSetts.otherPuncDelay,
				shWrDel = settings.shortWordDelay || _rSetts.shortWordDelay,
				lgWrDel = settings.longWordDelay  || _rSetts.longWordDelay,
				numDel 	= settings.numericDelay   || _rSetts.numericDelay,
				start 	= settings.slowStartCount || _rSetts.slowStartCount;

			rTim.setwpm( wpm ).setsentencedelay( sentDel )
				.setotherpuncdelay( puncDel ).setshortworddelay( shWrDel )
				.setlongworddelay( lgWrDel ).setnumericdelay( numDel )
				.setslowstartcount( start );

			return rTim;
		};  // End rTim._setUp()


		rTim.getProgress = function () {
			rTim.progress = rTim._queue.progress;
			return rTim.progress;
		};  // End rTim.gesProsressc)



		// ============== FLOW CONTROL ============== \\
		
		rTim.start = function (queue) {
			// Put queue in here, so that a Timer doesn't
			// have to be destroyed every time something new is read
			if (!queue) {
				console.error( "No readable object was passed into ReadTimer. `queue`:", rTim._queue );
				return null;
			}

			$(rTim).trigger( 'starting', [rTim] );
			rTim._queue 	= queue;
			rTim.progress 	= queue.progress;

			rTim.restart( true );
			$(rTim).trigger( 'started', [rTim] );

			return rTim;
		};

		rTim.restart = function ( noEvent ) {

			if (!noEvent) $(rTim).trigger( 'restarting', [rTim] );
			rTim.pause();

			rTim.done 	 	 = false;
			rTim._isStarting = true;

			rTim._queue.restart();
			rTim.play();
			if (!noEvent) $(rTim).trigger( 'restarted', [rTim] );

			return rTim;
		};

		rTim.playPauseToggle = function () {
			if (rTim._isPlaying) {
				rTim.pause();
			} else {
				rTim.play();
			}
			return rTim;
		};

		rTim.play = function () {
			if ( !rTim.done ) {
				$(rTim).trigger( 'playing', [rTim] );
				rTim._isPlaying = true;
				rTim._loop();
				$(rTim).trigger( 'played', [rTim] );
			}
			// else restart?
			return rTim;
		};

		rTim.stop = function () {
		// Just another name for .pause() that people may want
			$(rTim).trigger( 'stopping', [rTim] );

			rTim.pause( false );
			// Send stop event

			$(rTim).trigger( 'stopped', [rTim] );
			return rTim;
		};

		rTim.pause = function ( noEvent ) {
			if (!noEvent) $(rTim).trigger( 'pausing', [rTim] )
			clearTimeout(rTim._timer);
			rTim._isPlaying = false;
			// Send pause event if noEvent is is false
			if (!noEvent) $(rTim).trigger( 'paused', [rTim] )
			return rTim;
		};

		rTim.calcDelay = function () {
			var delay = rTim.delay;

			var frag  = rTim._currentWordFragment;  // Current word fragment
			if ( frag.hasPeriod ) 	 delay *= _rSetts.sentenceDelay;
			if ( frag.hasOtherPunc ) delay *= _rSetts.otherPuncDelay;
			if ( frag.isShort() ) 	 delay *= _rSetts.shortWordDelay;
			if ( frag.isLong() ) 	 delay *= _rSetts.longWordDelay;
			if ( frag.isNumeric ) 	 delay *= _rSetts.numericDelay;

			if ( rTim._isStarting ) {
				delay = delay * _rSetts.slowStartCount;
				rTim._isStarting = false;
			}

			return delay;
		};  // End rTim.calcDelay()

		rTim._loop = function () {

			var progress = rTim.progress = rTim.getProgress();
			$(rTim).trigger( 'progress', [rTim, progress] );

			// Stop if we've reached the end
			if ( progress === 1 ) {
				// Send event that this is done
				$(rTim).trigger( 'done', [rTim] );
				rTim.stop();
				rTim.done = true;
				return rTim;
			}

			$(rTim).trigger( 'loopStart', [rTim] );

			// Otherwise keep going
			rTim._isPlaying = true;
			// "next" or "prev" word fragment
			rTim._currentWordFragment = rTim._queue[ rTim._stepOperation ]();

			// ======= DELAY ======= \\
			var delay = rTim.calcDelay();

			rTim._timer = setTimeout( rTim._loop, delay );

			// Do it after setTimeout so that you can easily pause on "newWordFragment"
			// Feels weird, though
			$(rTim).trigger( 'newWordFragment', [rTim, rTim._currentWordFragment] );

			$(rTim).trigger( 'loopEnd', [rTim] );

			return rTim;  // Return timeout obj instead?
		};  // End rTim._loop()



		// // TODO:
		// rTim.goTo = function ( quoi ) {
		// 	// Not sure what argument to pass in.
		// 	// 'previous sentence'? 'next sentence'? 'section of document'? An index number?
		// 	return rTim;
		// };



		// ============== SET OPTIONS ============== \\
		rTim.settingsAvailable = ['wpm', 'sentenceDelay', 'otherPuncDelay', 'shortWordDelay',
						'longWordDelay', 'numericDelay', 'slowStartCount'];  // Not needed, but might be nice to have



		// Event based settings changes
		rTim._set = function (evnt, operation, value) {
			// Thats why all these are lower-case - easy consistency
			var op = operation.toLowerCase();
			if (op.indexOf('set') < 0) { op = 'set' + op; }

			rTim[ op ]( value );
			return rTim;
		};  // End rTim._set()


		$(rTim).on('set', rTim._set);


		// atm, giving them two kinds of friendly names
		rTim.setWPM = rTim.setwpm = function ( val ) {
			val = parseFloat(val);
			val = Math.max (1, val);
			val = Math.min (1500, val);
			_rSetts.wpm = val;
			rTim.delay = 1/(val/60)*1000;  // What is this based on?
			return rTim;
		};

		rTim.setSentenceDelay = rTim.setsentencedelay = function ( val ) {
			val = parseFloat(val);
			val = Math.max (1, val);
			val = Math.min (10, val);
			_rSetts.sentenceDelay = val;
			return rTim;
		};

		rTim.setOtherPuncDelay = rTim.setotherpuncdelay = function ( val ) {
			val = parseFloat(val);
			val = Math.max (1, val);
			val = Math.min (10, val);
			_rSetts.otherPuncDelay = val;
			return rTim;
		};

		rTim.setShortWordDelay = rTim.setshortworddelay = function ( val ) {
			val = parseFloat(val);
			val = Math.max (1, val);
			val = Math.min (10, val);
			_rSetts.shortWordDelay = val;
			return rTim;
		};

		rTim.setLongWordDelay = rTim.setlongworddelay = function ( val ) {
			val = parseFloat(val);
			val = Math.max (1, val);
			val = Math.min (10, val);
			_rSetts.longWordDelay = val;
			return rTim;
		};

		rTim.setNumericDelay = rTim.setnumericdelay = function ( val ) {
			val = parseFloat(val);
			val = Math.max (1, val);
			val = Math.min (10, val);
			_rSetts.numericDelay = val;
			return rTim;
		};

		rTim.setSlowStartCount = rTim.setslowstartcount = function ( val ) {
			val = parseFloat(val);
			val = Math.max(0,val);
			val = Math.min(10,val);
			_rSetts.slowStartCount = val;
			return rTim;
		};

        // ============== DO IT ============== \\
		rTim._setUp( settings )
		return rTim;
	};  // End ReadTimer() -> {}

    return ReadTimer;
}));
