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
        define( ['jquery'], function ( jquery ) {
        	return ( root.ReaderlyPlayback = playbackFactory( jQuery ) );
        });
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but only CommonJS-like
        // environments that support module.exports, like Node.
        module.exports = playbackFactory( require('jquery') );
    } else {
        // Browser globals
        root.ReaderlyPlayback = playbackFactory( root.jQuery );
    }
}(this, function ( $ ) {

	"use strict";

	var ReaderlyPlayback = function ( timer, displayCore ) {

		var rPly = {};

		rPly.isPlaying 	= false,
		rPly.nodes 		= {};
		var nodes 		= rPly.nodes;

		var progress, percentDone, scrubber, progSlider;
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


/////////////////////////////////////


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
		$(timer).on('stopped', rPly._pause);


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
			// TOOD: Deal with line braeks in Queue instead
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
			// var percent = fraction * 100;
			// $(percentDone).css('width', percent + '%' );
			// progSlider.set( indx );  // version 7.x or 6.x for nouislider?
			return rPly;
		};


		rPly._start = function () {
			// progSlider.noUiSlider.updateOptions({
			// 	range: { min: 0, max: timer.getLength() }
			// })
			// version 6 or 7
			// progSlider.noUiSlider({
			// 	range: [ 0, timer.getLength() ]
			// })
		}
		$(timer).on( 'started', rPly._start );


		// =========== INITIALIZE =========== \\

		rPly._addEvents = function () {
			// Timer events
			$(timer).on( 'newWordFragment', rPly._showNewFragment );
			$(timer).on( 'progress', rPly._showProgress );
			// DOM events
			$(textButton).on( 'touchend click', rPly._togglePlayPause );
			$(restart).on( 'touchend click', rPly._restart );
			return rPly;
		};


		rPly._init = function ( displayCore ) {

			// Why is this here? Because it's going to be a rewind/fastforward
			// control in the future
			progress 	= nodes.progress 	= $(progStr)[0];
			// percentDone = nodes.percentDone = $(progress).find('#__rdly_percent_done')[0];
			// scrubber 	= nodes.scrubber 	= $(progress).find('#__rdly_scrubber')[0];

			// progSlider = $(progress).noUiSlider({
			// 	start: [0],
			// 	connect: true,
			// 	range: {
			// 		'min': 0,
			// 		'max': 10
			// 	}
			// });

			// progSlider = $(progress).noUiSlider({
			// 	range: [ 0, 1 ],
			// 	start: 0,
			// 	step: 1,
			// 	connect: 'lower',
			// 	handles: 1,
			// 	behaviour: 'extend-tap',
			// 	// serialization: {
			// 	// 	to: [ $input ],
			// 	// 	resolution: data.resolution
			// 	// },
			// 	// // ??: Is proxy needed? Why .blur()?
			// 	// set: $.proxy( function setSpeedSetting() {
			// 	// 	data.setFunc( $input.val() );
			// 	// 	$input.blur();
			// 	// }, this )
			// });

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
			$(progress).appendTo( coreNodes.above );
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