/* ReaderlyPlayback.js
* 
* Pause, play, rewind, fast-forward, and scrub
* controls. Includes progress bar. Name is not
* accurate, but it is clear and recognizable.
* 
* Based on https://github.com/jamestomasino/read_plugin/blob/master/Read.js
*/

(function (root, playbackFactory) {  // root is usually `window`
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define( ['jquery', 'nouislider'], function ( jquery, nouislider ) {
        	return ( root.ReaderlyPlayback = playbackFactory( jquery, nouislider ) );
        });
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but only CommonJS-like
        // environments that support module.exports, like Node.
        module.exports = playbackFactory( require('jquery'), require('nouislider') );
    } else {
        // Browser globals
        root.ReaderlyPlayback = playbackFactory( root.jQuery, root.noUiSlider );  // not sure noUi is here
    }
}(this, function ( $, noUiSlider ) {

	"use strict";

	var ReaderlyPlayback = function ( timer, displayCore ) {

		var rPly = {};

		rPly.isPlaying 	 = false;
		rPly.isScrubbing = false;
		rPly.nodes 		 = {};
		var nodes 		 = rPly.nodes;

		var progressNode, percentDone, scrubber;
		var indicator, textButton, loading;
		var playPauseFeedback, playFeedback, pauseFeedback;
		var controls;  // We'll see how this one shapes up
		var restart;

		// Why is this here? Because it's going to be a rewind/fastforward
		// control in the future
		// ??: Buttons? noUiSlider?
// 		var progStr = '<div id="__rdly_progress">\
// 	<div id="__rdly_percent_done"></div>\
// 	<div id="__rdly_scrubber"></div>\
// </div>';
		var progStr = '<div id="__rdly_progress"></div>';

		var indicatorStr 	= '<div id="__rdly_indicator" class="__rdly-transform-centered"></div>',
			textButtonStr 	= '<button id="__rdly_text_button" class="__rdly-transform-centered"></button>',
			loadingStr 		= '<div id="__rdly_loading" class="__rdly-hidden"></div>';

		var feedbackStr = '<div id="__rdly_play_pause_feedback" class="__rdly-transform-centered">\
	<div id="__rdly_pause_feedback" class="__rdly-playback-feedback __rdly-transform-centered">||</div>\
	<div id="__rdly_play_feedback" class="__rdly-playback-feedback __rdly-transform-centered">></div>\
</div>';

// 		var controlsStr = '<div id="__rdly_playback_controls">\
// 	<button id="__rdly_rewind_sentence" class="__rdly-playback-button"></button>\
// 	<button id="__rdly_rewind_word" class="__rdly-playback-button"></button>\
// 	<button id="__rdly_fastforward_word" class="__rdly-playback-button"></button>\
// 	<button id="__rdly_fastforward_sentence" class="__rdly-playback-button"></button>\
// </div>';

		var restartStr = '<button id="__rdly_restart" class="__rdly-big-menu-button">Re</button>';



		// =========== RUNTIME ACTIONS =========== \\

		rPly.hideText = function () {
			$(textButton).addClass('__rdly-hidden');
			return rPly;
		};


		rPly.showText = function () {
			$(textButton).removeClass('__rdly-hidden');
			return rPly;
		};


		rPly.wait = function () {
			rPly.hideText();
			$(loading).addClass('__rdly-rotating');
			$(loading).removeClass('__rdly-hidden');
			return rPly;
		};


		rPly.stopWaiting = function () {
			$(loading).addClass('__rdly-hidden');
			$(loading).removeClass('__rdly-rotating');
			rPly.showText();
			return rPly;
		};


		rPly.clearText = function () {
			$(textButton).html("");
			return rPly;
		};



		// ----- DOM EVENTS ----- \\
		rPly._play = function () {
			$(playFeedback).removeClass('__rdly-hidden');
			$(pauseFeedback).addClass('__rdly-hidden');
			// https://jsfiddle.net/aL7kxe78/3/ fadeOut (ends with display: none)
			// http://stackoverflow.com/a/4549418/3791179 <- opacity
			var x = $(playPauseFeedback).fadeTo(0, 0.7).fadeTo(700, 0)
			return rPly;
		}
		$(timer).on('playing', rPly._play);

		rPly._pause = function () {
			$(pauseFeedback).removeClass('__rdly-hidden');
			$(playFeedback).addClass('__rdly-hidden');
			$(playPauseFeedback).fadeTo(0, 0.7).fadeTo(700, 0)
			return rPly;
		}
		$(timer).on('paused', rPly._pause);
		// $(timer).on('stopped', rPly._pause);  // Not sure pause should appear at the end


		rPly._togglePlayPause = function () {
			timer.togglePlayPause();
			return rPly;
		};


		rPly._restart = function () {
			timer.restart()
		};


		// ----- TIMER EVENTS ----- \\
		var whiteSpaceRegexp = /[\n\r\s]/;
		rPly._showNewFragment = function ( evnt, timer, fragment ) {
			// TOOD: Deal with line breaks in Queue instead
			var chars = fragment.chars;
			// Adds pauses for line breaks
			if ( !whiteSpaceRegexp.test(chars) ) {
				$(textButton).html( chars );
				rPly.stopWaiting();
			}
			// return text;
			return rPly;
		};


		rPly._showProgress = function ( evnt, timer, fraction, indx ) {
			// // var percent = fraction * 100;
			// // $(percentDone).css('width', percent + '%' );

			if ( !rPly.isScrubbing ) {  // Don't mess timing up with transitions
				progressNode.noUiSlider.set( indx );  // version 8 nouislider
			}
			return rPly;
		};


		rPly._start = function () {
			progressNode.noUiSlider.updateOptions({
				range: { min: 0, max: timer.getLength() }
			});
			return rPly;
		}
		$(timer).on( 'started', rPly._start );


		rPly._startScrubbing = function ( evnt ) {
			rPly.isScrubbing = true;
			timer.engageGoTo();
			return rPly;
		};  // End rPly._startScrubbing()


		rPly._stopScrubbing = function ( evnt ) {
			rPly.isScrubbing = false;
			timer.disengageGoTo();
			return rPly;
		};  // End rPly._stopScrubbing()


		// =========== INITIALIZE =========== \\

		rPly._progressSlider = function ( progNode ) {
		/* ( {} ) -> ?
		* 
		* Turn the given data into one noUiSlider slider
		*/
			// To keep handles within the bar
			$(progNode).addClass('noUi-extended');

			var slider = noUiSlider.create( progNode, {
				range: { min: 0, max: 1 },
				start: 0,
				step: 1,
				connect: 'lower',
				handles: 1,
				behaviour: 'extend-tap'
			});

			return progNode;
		};  // End rPly._progressSlider()


		rPly._addEvents = function () {
			// Timer events
			$(timer).on( 'newWordFragment', rPly._showNewFragment );
			$(timer).on( 'progress', rPly._showProgress );

			// Scrubber events
			progressNode.noUiSlider.on( 'start', rPly._startScrubbing );
			progressNode.noUiSlider.on( 'end', rPly._stopScrubbing );
			progressNode.noUiSlider.on( 'slide', function updatePos( values, handle ) {
				timer.goTo({
					type: 'index',
					amount: parseInt(values[handle])
				});
			});

			// DOM events
			$(textButton).on( 'touchend click', rPly._togglePlayPause );
			$(restart).on( 'touchend click', rPly._restart );

			return rPly;
		};


		rPly._init = function ( displayCore ) {

			// Why is this here? Because it's going to be a rewind/fastforward
			// control in the future
			progressNode = nodes.progressNode = $(progStr)[0];
			// percentDone = nodes.percentDone = $(progress).find('#__rdly_percent_done')[0];
			// scrubber 	= nodes.scrubber 	= $(progress).find('#__rdly_scrubber')[0];
			rPly._progressSlider( progressNode );

			// ??: Should this really be a button? How do the rest of the controls fit into this?
			// ??: Should there just be an invisible set of controls that accessible aids can grab hold of
			indicator 	= nodes.indicator 	= $(indicatorStr)[0];
			textButton 	= nodes.textButton 	= $(textButtonStr)[0];
			loading 	= nodes.loading 	= $(loadingStr)[0];

			playPauseFeedback 	= nodes.playPauseFeedback 	= $(feedbackStr)[0];
			playFeedback 		= nodes.playFeedback  		= $(playPauseFeedback).find('#__rdly_play_feedback')[0];
			pauseFeedback 		= nodes.pauseFeedback 		= $(playPauseFeedback).find('#__rdly_pause_feedback')[0];

			// // Go in .rdly-bar-center .rdly-below?
			// // 'play' and 'pause' are also triggered by clicking on the text
			// controls = nodes.controls = $(controlsStr)[0];

			restart = nodes.restart = $(restartStr)[0];

			var coreNodes = displayCore.nodes;
			$(progressNode).appendTo( coreNodes.above );
			$(playPauseFeedback).appendTo( coreNodes.barCenter );

			$(indicator).appendTo( coreNodes.textElements );
			$(textButton).appendTo( coreNodes.textElements );
			$(loading).appendTo( coreNodes.textElements );
			
			$(controls).appendTo( coreNodes.bar );
			$(restart).appendTo( coreNodes.barLeft );

			rPly._addEvents();

			return rPly;
		};


		// =========== ADD NODE, ETC. =========== \\
		// Don't show at start, only when prompted
		rPly._init( displayCore );

		// To be called in a script
		return rPly;
	};  // End ReaderlyPlayback() -> {}

	// To put on the window object, or export into a module
    return ReaderlyPlayback;
}));