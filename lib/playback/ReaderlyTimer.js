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

			rTim.done 		 = false;

			rTim._timeoutID  = null;
			rTim._isPlaying  = false;
			rTim._wasPlaying = false;

			// Moving around
			rTim._jumping 	 		= false;
			rTim._incrementors 		= [0, 1];
			rTim._sentenceWalking 	= false;
			rTim._sentenceSkippers 	= [ '\n', '\r' ];


			return rTim;
		};  // End rTim._init()



		// ============== PASSED ON DIRECTLY FROM QUEUE ============== \\

		rTim.getProgress = function () {
			return rTim._queue.getProgress();
		};  // End rTim.gesProsress()


		rTim.getLength = function () {
			return rTim._queue.getLength();
		};  // End rTim.gesProsress()



		// ============== FLOW CONTROL ============== \\

		rTim._noDelayMod = function ( startDelay ) { return startDelay; };


		rTim._restart = function ( startEventName, endEventName, startDelayModFunc ) {

			if ( startEventName ) $(rTim).trigger( startEventName, [rTim] );

			rTim.done = false;

			// Start slow when next go through loop (restore countdown)
			var delayMod = startDelayModFunc || rTim._noDelayMod;
			var delay 	 = delayMod( delayer._settings.slowStartDelay );
			delayer.resetSlowStart( delay );

			// Just put the index at the right place
			rTim._queue.restart();
			rTim._pause(null, null, null);
			rTim.play();

			if ( endEventName ) $(rTim).trigger( endEventName, [rTim] );

			return rTim;
		};  // End rTim._restart()
		
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

		rTim.restart = function () {
			rTim._restart( 'restartBegin', 'restartFinish', null );
			return rTim;
		};



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
			rTim._incrementors = [0, 1];

			if ( startEventName ) $(rTim).trigger( startEventName, [rTim] );
			
			if ( !rTim._isPlaying ) {
				rTim._isPlaying = true;
				rTim._loop( [0, 0], rTim._loop );
			}

			if ( endEventName ) $(rTim).trigger( endEventName, [rTim] );

			return rTim;
		};  // End rTim._play()


		rTim.play = function () {
			if ( rTim.done ) { rTim.restart(); }  // Comes back here after restarted
			else { rTim._play( 'playBegin', 'playFinish' ); }
			return rTim;
		};  // End rTim.play()




		rTim._pause = function ( startEventName, endEventName, startDelayModFunc ) {
		/* ( Str, Str, Func ) -> PlaybackManager
		* 
		* For all 'pause'-like activities
		*/ 
			if ( startEventName ) $(rTim).trigger( startEventName, [rTim] );

			clearTimeout(rTim._timeoutID);
			rTim._isPlaying = false;


			// Start slow when next go through loop (restore countdown)
			var delayMod = startDelayModFunc || rTim._noDelayMod;
			var delay 	 = delayMod( delayer._settings.slowStartDelay );
			delayer.resetSlowStart( delay );

			if ( endEventName ) $(rTim).trigger( endEventName, [rTim] );

			return rTim;
		};  // End rTim._pause()


		// Names for "pause":
		rTim.pause = function () {
			rTim._pause( 'pauseBegin', 'pauseFinish', null );
			return rTim;
		};
		rTim.stop = function () {
			rTim._pause( 'stopBegin', 'stopFinish', null );
			return rTim;
		};
		rTim.close = function () {
			rTim._pause( 'closeBegin', 'closeFinish', null );
			return rTim;
		};


		rTim.togglePlayPause = function () {
			if (rTim._isPlaying) { rTim.pause(); }
			else { rTim.play(); }
			return rTim;
		};


		// ========== FF and REWIND (arrow keys and other) ========== \\
		rTim._increment = function ( changes ) {
		// Or decrement :/
			rTim._wasPlaying = rTim._isPlaying;
			rTim._pause( null, null, null );

			rTim.once( changes );
			rTim._sentenceWalking = false;

			if ( rTim._wasPlaying ) { rTim._play( null, null, null ); }
			return rTim;
		};

		rTim.nextWord = function () {
			rTim._increment( [0, 1] );
			return rTim;
		};
		rTim.nextSentence = function() {
			console.log('next');
			rTim._increment( [1, 0] );
			rTim._sentenceWalking = true;
			return rTim;
		};

		rTim.prevWord = function () {
			rTim._increment( [0, -1] );
			return rTim;
		};
		rTim.prevSentence = function() {
			console.log('prev');
			rTim._increment( [-1, 0] );
			rTim._sentenceWalking = true;
			return rTim;
		};


		// =================== Scrubber bar =================== \\
		rTim.jumpTo = function ( playbackObj ) {
		// Argument to pass in? 'previous sentence'? 'next sentence'?
		// 'section of document'? An index number?
		// ??: How to give useful feedback from this?

			if ( rTim._queue ) {

				if ( !rTim._jumping ) {
					rTim._wasPlaying = rTim._isPlaying;
					rTim._pause( null, null, null );
					rTim._jumping = true;
				}

				var newIndex = playbackObj.amount,
					oldIndex = rTim._queue.getIndex();
				rTim.once( [0, newIndex - oldIndex] );
			}
			return rTim;
		};  // End rTim.jumpTo()

		rTim.disengageJumpTo = function () {
			if ( rTim._wasPlaying ) { rTim._play( null, null, null ); }
			rTim._jumping = false;
			return rTim;
		};



		// ================================
		// LOOPS
		// ================================

		rTim._wordsDone = function () {
		// Checks progress
		// Returns `true` if we're at the end of the words

			var progress = rTim.getProgress();
			// TODO: Needs some work. Fragile.
			$(rTim).trigger( 'progress', [rTim, progress, rTim._queue.index, rTim.getLength()] );

			// Stop if we've reached the end
			if ( progress === 1 ) {
				$(rTim).trigger( 'done', [rTim] );
				rTim.stop();
				rTim.done = true;
			} else {
				rTim.done = false;
			}

			return rTim.done;
		};  // End rTim._wordsDone()


		rTim._shouldSkip = function ( frag ) {
			var skipIt = false;

			if ( rTim._sentenceWalking && rTim._sentenceSkippers.indexOf( frag ) ) {
				skipIt = true;
			}

			return skipIt;
		};  // End rTim._shouldSkip()


        rTim.signOf = function ( num ) {
            return typeof num === 'number' ? num ? num < 0 ? -1 : 1 : num === num ? num : NaN : NaN;
        }


		rTim._loop = function ( incrementors, callback ) {
		// `callback` can help you terminate without continuing to loop

			// Finish if we're at the end of the text
			if ( rTim._done ) { return rTim; }

			$(rTim).trigger( 'loopBegin', [rTim] );

			// If calling the loop from the loop, just keep going in the same global direction
			// Allows for stuff like `._play()` to show current word, then keep going
			// console.log('before:', incrementors)
			incrementors = incrementors || rTim._incrementors;  // ??: Too indirect?
			// console.log('after:', incrementors)
			callback 	 = callback || rTim._loop;
			debugger;
			var frag 	 = rTim._queue.getFragment( incrementors );

			// // What? Repeat the same operation? What if the operation is "skip 2" and we hit a paragraph
			// // and just want to go to the next bit of text, not 2 more forward?
			// // Should this be before the 'loopBegin' event? Outside of the loop happening in general?
			// if ( rTim._shouldSkip(frag) ) {
			// 	// ??: Still include 'loopFinish'?
			// 	$(rTim).trigger( 'loopSkip', [rTim, frag] );
			// 	var wordInc = 1;
			// 	if ( incrementors[0] !== 0 ) { wordInc = signOf( incrementors[0] ) }
			// 	rTim._loop( [0, 1], callback );
			// }
			// else {


				// TODO: Some way to prevent or alter delay that is more obvious
				var delay = delayer.calcDelay( frag, Boolean(callback) );  // TODO: for fastforward, modify speed
				rTim._timeoutID = setTimeout( callback, delay );

				// Send fragment after setTimeout so that you can easily
				// pause on "newWordFragment". Feels weird, though.
				$(rTim).trigger( 'newWordFragment', [rTim, frag] );
				$(rTim).trigger( 'loopFinish', [rTim] );



			// }

			// Finish if we're at the end of the text
			if ( rTim._wordsDone() ) { return rTim; }

			return rTim;  // Return timeout id instead?
		};  // End rTim._loop()


		rTim.once = function ( incrementors ) {
		// Loop once in the given direction
			rTim._loop( incrementors, function stopAfterOnce(){});  // function terminates loop
			return rTim;
		};



        // ============== DO IT ============== \\
		rTim._init()
		return rTim;
	};  // End ReaderlyTimer() -> {}

    return ReaderlyTimer;
}));
