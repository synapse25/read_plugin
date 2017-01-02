/* ReaderlyTimer.js
* 
* Handles passing out the fragments from Queue in a manner
* defined by its settings, which can change.
* 
* Based on https://github.com/jamestomasino/read_plugin/blob/master/Read.js
* 
* TODO;
* - ??: Make length delay proportional to word length?
* - Add extra paragraph pause back in
* - Long word delay not working? How about otherPunc? And do more
* 	symbols need to be included in that set of otherPunc?
* - Implement more robust pausing (store in bool and wait for appropriate time)
* - Scrubbing doesn't restart the slow-start value
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
        	return ( root.ReaderlyTimer = timerFactory( jquery ) );
        });
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but only CommonJS-like
        // environments that support module.exports, like Node.
        module.exports = timerFactory( require('jquery') );
    } else {
        // Browser globals
        root.ReaderlyTimer = timerFactory( root.jQuery );
    }
}(this, function ( $ ) {

	"use strict";

	var ReaderlyTimer = function ( settings, storage ) {
	/* ( {}, {} ) -> other {}
	* 
	*/
		var rTim = {};

		var _rSetts = null;
		var defaultSettings = {
			wpm: 500,
			slowStartDelay: 5,
			sentenceDelay: 2.5,
			otherPuncDelay: 1.5,
			shortWordDelay: 1.3,
			longWordDelay: 1.4,
			numericDelay: 2.0
		};

		var whiteSpace = /[\n\r\s]/;


		rTim._setUp = function ( settings ) {

			rTim.progress 				= 0;
			rTim._currentWordFragment 	= null;

			// Defaults
			rTim.done 		 = false;
			rTim.delay 		 = 0;
			rTim._timer 	 = null;
			rTim._isPlaying  = false;
			rTim._wasPlaying = false;
			rTim._goToEngaged 	= false;
			rTim._isRestarting 	= false;
			rTim._stepOperation = 'next';

			// defaultSettings = settings || defaultSettings;

			var wpm 			= settings.wpm 				|| defaultSettings.wpm,
				slowStartDelay 	= settings.slowStartDelay 	|| defaultSettings.slowStartDelay,
				sentenceDelay 	= settings.sentenceDelay 	|| defaultSettings.sentenceDelay,
				otherPuncDelay 	= settings.otherPuncDelay 	|| defaultSettings.otherPuncDelay,
				shortWordDelay 	= settings.shortWordDelay 	|| defaultSettings.shortWordDelay,
				longWordDelay 	= settings.longWordDelay 	|| defaultSettings.longWordDelay,
				numericDelay 	= settings.numericDelay 	|| defaultSettings.numericDelay;

			// Update settings based on what's passed in
			_rSetts = rTim._settings = {};
			rTim.setwpm( wpm )
				.setslowstartdelay( slowStartDelay )
				.setsentencedelay( sentenceDelay )
				.setotherpuncdelay( otherPuncDelay )
				.setshortworddelay( shortWordDelay )
				.setlongworddelay( longWordDelay )
				.setnumericdelay( numericDelay );

			return rTim;
		};  // End rTim._setUp()


		rTim.getProgress = function () {
			rTim.progress = rTim._queue.getProgress();
			return rTim.progress;
		};  // End rTim.gesProsress()


		rTim.getLength = function () {
			return rTim._queue.fragments.length;
		};  // End rTim.gesProsress()



		// ============== FLOW CONTROL ============== \\
		
		rTim.start = function (queue) {
			// Queue is passed in here, so that a Timer doesn't
			// have to be destroyed every time something new is read

			if (!queue) {
				console.error( "No readable object was passed into ReaderlyTimer. `queue`:", rTim._queue );
				return null;
			}

			$(rTim).trigger( 'starting', [rTim] );
			rTim._queue 	= queue;
			rTim.progress 	= queue.getProgress();

			rTim.restart( true );
			$(rTim).trigger( 'started', [rTim] );

			return rTim;
		};

		rTim.restart = function ( noEvent ) {

			if (!noEvent) $(rTim).trigger( 'restarting', [rTim] );
			// rTim.pause();  // Do we need this?

			rTim.done 			 = false;
			rTim._tempStartDelay = _rSetts.slowStartDelay;

			// Just put the index at the right place
			rTim._queue.restart();
			rTim.play();
			if (!noEvent) $(rTim).trigger( 'restarted', [rTim] );

			return rTim;
		};

		rTim.togglePlayPause = function () {
			if (rTim._isPlaying) {
				rTim.pause();
			} else {
				rTim.play();
			}
			return rTim;
		};


		// ??: 'playing' event should go off every time, but if we're
		// restarting without pausing first (pausing would trigger visual
		// feedback about pausing), then should the event not happen? That
		// means the "play" image won't fire off on restarts, even though
		// it feels like it should always fire on play.
		rTim.play = function ( noEvent ) {
			// "play" will always be forward. "rewind" can be play, but with "prev".
			rTim._stepOperation = 'next';
			// We get a playing event as long as playing is happening
			// Hack or fix?
			if (rTim._isPlaying) {
				// There must be a better way to keep the "play"
				// icon from appearing.
				if (!noEvent) $(rTim).trigger( 'playing', [rTim] );
				if (!noEvent) $(rTim).trigger( 'played', [rTim] );  // This second one too?
				// ??: they should go as a pair, but nothing done in between.
				// Maybe 'played' should be in the loop? Makes no sense.
			}

			// Make sure not to trigger multiple loops, increasing
			// the speed every time.
			if ( !rTim._isPlaying && !rTim.done ) {
				if (!noEvent) $(rTim).trigger( 'playing', [rTim] );
				rTim._isPlaying = true;
				rTim._loop();
				if (!noEvent) $(rTim).trigger( 'played', [rTim] );
			} else if ( rTim.done ) {
				rTim.restart();
			}
			return rTim;
		};  // End rTim.play()


		// TODO: Add generic function for pause, stop, and close


		rTim.pause = function ( noEvent ) {
			// noEvent can prevent pause from triggering (e.g. when
			// called by `.stop()`). There must be a better way to
			// avoid having the "pause" icon appear
			if (!noEvent) $(rTim).trigger( 'pausing', [rTim] )

			clearTimeout(rTim._timer);
			rTim._isPlaying = false;
			// Start slow when next go through loop (restore countdown)
			// TODO: Start only half slowed down? delay/2?
			// delay/(1/time elapsed max slowStartDelay)? (snap to 0 at some point)
			rTim._tempStartDelay = _rSetts.slowStartDelay;

			if (!noEvent) $(rTim).trigger( 'paused', [rTim] )
			return rTim;
		};


		rTim.goTo = function ( playbackObj ) {
		// Argument to pass in? 'previous sentence'? 'next sentence'?
		// 'section of document'? An index number?
		// ??: How to give useful feedback from this?
			if ( rTim._queue ) {

				if ( !rTim._goToEngaged ) {
					rTim._wasPlaying = rTim._isPlaying;
					rTim.pause( true );
					rTim._goToEngaged = true;
				}

				rTim._queue.goTo( playbackObj );
				rTim._stepOperation = 'current';
				rTim.once();
			}
			return rTim;
		};  // End rTim.goTo()

		rTim.disengageGoTo = function () {
			// // ??: Should this be always done in .play? Does "play" always mean go
			// // forward? Doesn't it just mean "trigger loop"? ._loop() is "trigger
			// // loop".
			// rTim._stepOperation = 'next';
			if ( rTim._wasPlaying ) { rTim.play( true ); }
			rTim._goToEngaged = false;
			return rTim;
		};


		rTim.stop = function () {
		// Just another name for .pause() that people may want
			$(rTim).trigger( 'stopping', [rTim] );
			rTim.pause( true );  // Is this really legit?
			$(rTim).trigger( 'stopped', [rTim] );
			return rTim;
		};

		rTim.close = function () {
		// Just another name for .pause() that people may want
			$(rTim).trigger( 'closing', [rTim] );
			rTim.pause( true );
			$(rTim).trigger( 'closed', [rTim] );
			return rTim;
		};

		rTim.calcDelay = function ( justOnce ) {
			var delay = rTim.delay;

			var frag  = rTim._currentWordFragment;  // Current word fragment
			if ( frag.hasPeriod ) 	 delay *= _rSetts.sentenceDelay;
			if ( frag.hasOtherPunc ) delay *= _rSetts.otherPuncDelay;
			if ( frag.isShort() ) 	 delay *= _rSetts.shortWordDelay;
			if ( frag.isLong() ) 	 delay *= _rSetts.longWordDelay;
			if ( frag.isNumeric ) 	 delay *= _rSetts.numericDelay;

			// Speeds up a big each time the loop is called
			var extraDelay 		 = rTim._tempStartDelay;
			// Make sure startDelay isn't used up by things like .once() called
			// repeatedly, like with scrubber
			if (!justOnce) {rTim._tempStartDelay = Math.max( 1, extraDelay / 1.5 );}
			delay 				 = delay * rTim._tempStartDelay;

			return delay;
		};  // End rTim.calcDelay()

		rTim._loop = function ( justOnce ) {

			var progress = rTim.progress = rTim.getProgress();
			$(rTim).trigger( 'progress', [rTim, progress, rTim._queue.index] );

			// Stop if we've reached the end
			if ( progress === 1 ) {
				$(rTim).trigger( 'done', [rTim] );
				rTim.stop();
				rTim.done = true;
				return rTim;
			}

			$(rTim).trigger( 'loopStart', [rTim] );

			// "next", "prev", or "current" word fragment
			rTim._currentWordFragment 		= rTim._queue[ rTim._stepOperation ]();
			var delay = rTim.calcDelay( justOnce );
			if ( !justOnce ) { rTim._timer 	= setTimeout( rTim._loop, delay ); }

			// Do it after setTimeout so that you can easily pause on "newWordFragment"
			// Feels weird, though
			$(rTim).trigger( 'newWordFragment', [rTim, rTim._currentWordFragment] );
			$(rTim).trigger( 'loopEnd', [rTim] );

			return rTim;  // Return timeout obj instead?
		};  // End rTim._loop()


		rTim.once = function () {
			rTim._loop( true );
			return rTim;
		};



		// ============== SET OPTIONS ============== \\
		// Not needed, but might be nice to have:
		rTim.settingsAvailable = ['wpm', 'sentenceDelay', 'otherPuncDelay', 'shortWordDelay',
						'longWordDelay', 'numericDelay', 'slowStartDelay'];

		// Event based settings changes
		rTim.set = function (evnt, operation, value) {
			// All these have lower-case versions - more consistency for event use?
			var op = operation.toLowerCase();
			if (op.indexOf('set') < 0) { op = 'set' + op; }

			rTim[ op ]( value );
			return rTim;
		};  // End rTim.set()

		$(rTim).on('set', rTim.set);


		// atm, giving them two kinds of friendly names
		rTim.setWPM = rTim.setwpm = function ( val ) {
			val = parseFloat(val);
			val = Math.max (1, val);
			val = Math.min (5000, val);
			_rSetts.wpm = val;
			storage.set( { 'wpm': val } )
			rTim.delay = 1/(val/60)*1000;  // What is this based on?
			return rTim;
		};

		rTim.setSlowStartDelay = rTim.setslowstartdelay = function ( val ) {
			val = parseFloat(val);
			val = Math.max(0,val);
			val = Math.min(10,val);
			_rSetts.slowStartDelay = val;
			storage.set( { 'slowStartDelay': val } )
			return rTim;
		};

		rTim.setSentenceDelay = rTim.setsentencedelay = function ( val ) {
			val = parseFloat(val);
			val = Math.max (1, val);
			val = Math.min (10, val);
			_rSetts.sentenceDelay = val;
			storage.set( { 'sentenceDelay': val } )
			return rTim;
		};

		rTim.setOtherPuncDelay = rTim.setotherpuncdelay = function ( val ) {
			val = parseFloat(val);
			val = Math.max (1, val);
			val = Math.min (10, val);
			_rSetts.otherPuncDelay = val;
			storage.set( { 'otherPuncDelay': val } )
			return rTim;
		};

		rTim.setShortWordDelay = rTim.setshortworddelay = function ( val ) {
			val = parseFloat(val);
			val = Math.max (1, val);
			val = Math.min (10, val);
			_rSetts.shortWordDelay = val;
			storage.set( { 'shortWordDelay': val } )
			return rTim;
		};

		rTim.setLongWordDelay = rTim.setlongworddelay = function ( val ) {
			val = parseFloat(val);
			val = Math.max (1, val);
			val = Math.min (10, val);
			_rSetts.longWordDelay = val;
			storage.set( { 'longWordDelay': val } )
			return rTim;
		};

		rTim.setNumericDelay = rTim.setnumericdelay = function ( val ) {
			val = parseFloat(val);
			val = Math.max (1, val);
			val = Math.min (10, val);
			_rSetts.numericDelay = val;
			storage.set( { 'numericDelay': val } )
			return rTim;
		};

        // ============== DO IT ============== \\
		rTim._setUp( settings )
		return rTim;
	};  // End ReaderlyTimer() -> {}

    return ReaderlyTimer;
}));
