/* ReaderlyTimer.js
* 
* Transmits fragments from Queue. Uses `delayer` to determine time
* between each transmition.
* 
* Based on https://github.com/jamestomasino/read_plugin/blob/master/Read.js
* 
* TODO;
* - ??: Make length delay proportional to word length?
* - Long word delay not working? How about otherPunc? And do more
* 	symbols need to be included in that set of otherPunc?
* - Implement more robust pausing (store in bool and wait for appropriate time)
* 
* DONE:
* - Add extra paragraph pause back in
* - Scrubbing doesn't restart the slow-start value
* 
* NOTES:
* - Always return Timer so functions can be chained
* - Always send Timer as the first argument to events to
* 	stay consistent.
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

	var ReaderlyTimer = function ( delayer ) {
	/* ( {}, {} ) -> ReaderlyTimer
	* 
	*/
		var rTim = {};

		rTim._init = function () {

			rTim._currentWordFragment 	= null;

			rTim.done 		 = false;
			rTim.progress 	 = 0;

			rTim._timeout 	 = null;
			rTim._isPlaying  = false;
			rTim._wasPlaying = false;
			rTim._goToEngaged 	 = false;
			rTim._progressOperation  = 'next';

			return rTim;
		};  // End rTim._init()


		rTim.getProgress = function () {
			rTim.progress = rTim._queue.getProgress();
			return rTim.progress;
		};  // End rTim.gesProsress()


		rTim.getLength = function () {
			return rTim._queue.fragments.length;
		};  // End rTim.gesProsress()



		// ============== FLOW CONTROL ============== \\

		rTim._noDelayMod = function ( startDelay ) { return startDelay; };
		
		rTim.start = function ( queue ) {
			// Queue is passed in here, so that a Timer doesn't
			// have to be destroyed every time something new is read

			if (!queue) {
				console.error( "No readable object was passed into PlaybackManager. `queue`:", rTim._queue );
			} else {

				$(rTim).trigger( 'startBegin', [rTim] );

				rTim._queue = queue;
				rTim._restart( null, null, null );

				$(rTim).trigger( 'startFinish', [rTim] );
			}  // end if no data passed in

			return rTim;
		};  // End rTim.start()

		rTim.restart = function ( noEvent ) {
			rTim._restart( 'restartBegin', 'restartFinish', null );
			return rTim;
		};


		rTim._restart = function ( startEventName, endEventName, startDelayModFunc ) {

			if ( startEventName ) $(rTim).trigger( startEventName, [rTim] );
			// rTim.pause();  // Do we need this?

			rTim.done = false;

			// Start slow when next go through loop (restore countdown)
			var delayMod = startDelayModFunc || rTim._noDelayMod;
			var delay 	 = delayMod( delayer._settings.slowStartDelay );
			delayer.resetSlowStart( delay );

			// Just put the index at the right place
			rTim._queue.restart();
			rTim.play();

			if ( endEventName ) $(rTim).trigger( endEventName, [rTim] );

			return rTim;
		};  // End rTim._restart()


		// ??: 'playing' event should go off every time, but if we're
		// restarting without pausing first (pausing would trigger visual
		// feedback about pausing), then should the event not happen? That
		// means the "play" image won't fire off on restarts, even though
		// it feels like it should always fire on play.
		rTim._play = function ( startEventName, endEventName ) {
		/* ( Str, Str ) -> PlaybackManager
		* 
		* For all 'play'-like activities
		* ??: Just one eventName which gets + 'Begin' and + 'Finish' where appropriate?
		*/
			// "play" will always be forward. "rewind" can be play, but with "prev".
			rTim._progressOperation = 'next';

			if ( startEventName ) $(rTim).trigger( startEventName, [rTim] );
			
			if ( !rTim._isPlaying ) {
				rTim._isPlaying = true;
				rTim._loop();
			}

			if ( endEventName ) $(rTim).trigger( endEventName, [rTim] );

			return rTim;
		};  // End rTim._play()

		// TODO: Add generic function for pause, stop, and close
		rTim._pause = function ( startEventName, endEventName, startDelayModFunc ) {
		/* ( Str, Str, Func ) -> PlaybackManager
		* 
		* For all 'pause'-like activities
		*/ 
			if ( startEventName ) $(rTim).trigger( startEventName, [rTim] );

			clearTimeout(rTim._timeout);
			rTim._isPlaying = false;

			// Start slow when next go through loop (restore countdown)
			var delayMod = startDelayModFunc || rTim._noDelayMod;
			var delay 	 = delayMod( delayer._settings.slowStartDelay );
			delayer.resetSlowStart( delay );

			if ( endEventName ) $(rTim).trigger( endEventName, [rTim] );
		};  // End rTim._pause()



		rTim.play = function () {
			if ( rTim.done ) { rTim.restart(); }
			else { rTim._play( 'playBegin', 'playFinish' ); }
			return rTim;
		};  // End rTim.play()


		rTim.pause = function () {
			rTim._pause( 'pauseBegin', 'pauseFinish', null );
			return rTim;
		};  // End rTim.pause()
		rTim.stop = function () {
		// Just another name for .pause() that people may want
			rTim._pause( 'stopBegin', 'stopFinish', null );
			return rTim;
		};
		rTim.close = function () {
		// Just another name for .pause() that people may want
			rTim._pause( 'closeBegin', 'closeFinish', null );
			return rTim;
		};


		rTim.togglePlayPause = function () {
			if (rTim._isPlaying) { rTim.pause(); }
			else { rTim.play(); }
			return rTim;
		};


		// TODO: If done and goTo < length, done = false
		rTim.goTo = function ( playbackObj ) {
		// Argument to pass in? 'previous sentence'? 'next sentence'?
		// 'section of document'? An index number?
		// ??: How to give useful feedback from this?
			if ( rTim._queue ) {

				if ( !rTim._goToEngaged ) {
					rTim._wasPlaying = rTim._isPlaying;
					rTim._pause( null, null, null );
					rTim._goToEngaged = true;
				}

				rTim._queue.goTo( playbackObj );
				rTim._progressOperation = 'current';
				rTim.once();
			}
			return rTim;
		};  // End rTim.goTo()

		rTim.disengageGoTo = function () {
			if ( rTim._wasPlaying ) { rTim._play( null, null, null ); }
			rTim._goToEngaged = false;
			return rTim;
		};


		// ================================
		// LOOPS
		// ================================
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

			$(rTim).trigger( 'loopBegin', [rTim] );

			// "next", "prev", or "current" word fragment
			rTim._currentWordFragment = rTim._queue[ rTim._progressOperation ]();
			var delay = delayer.calcDelay( rTim._currentWordFragment, justOnce );
			if ( !justOnce ) { rTim._timeout = setTimeout( rTim._loop, delay ); }

			// Do it after setTimeout so that you can easily pause on "newWordFragment"
			// Feels weird, though
			$(rTim).trigger( 'newWordFragment', [rTim, rTim._currentWordFragment] );
			$(rTim).trigger( 'loopFinish', [rTim] );

			return rTim;  // Return timeout obj instead?
		};  // End rTim._loop()


		rTim.once = function () {
			rTim._loop( true );
			return rTim;
		};



        // ============== DO IT ============== \\
		rTim._init()
		return rTim;
	};  // End ReaderlyTimer() -> {}

    return ReaderlyTimer;
}));
