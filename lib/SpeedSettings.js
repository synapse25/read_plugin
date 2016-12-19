/* SpeedSettings.js
* 
* UI elements for setting various speeds/delays for
* certain characteristics of words, like length and
* punctuation.
* 
* Based on https://github.com/jamestomasino/read_plugin/blob/master/Read.js
*/

(function (root, speedsFactory) {  // root is usually `window`
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define( ['jquery', 'nouislider'], function ( jquery ) {
        	return ( root.SpeedSettings = speedsFactory( jQuery ) );
        });
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but only CommonJS-like
        // environments that support module.exports, like Node.
        module.exports = speedsFactory( require('jquery'), require('nouislider') );
    } else {
        // Browser globals
        root.SpeedSettings = speedsFactory( root.jQuery, root.noUiSlider );
    }
}(this, function ( $, noUI ) {

	"use strict";

	// .setwpm( wpm ).setsentencedelay( sentDel )
	// .setotherpuncdelay( puncDel ).setshortworddelay( shWrDel )
	// .setlongworddelay( lgWrDel ).setnumericdelay( numDel )
	// .setslowstartcount( start );

	var SpeedSettings = function ( timer, mainDisplay ) {

		var rSpd = {};

		rSpd._settingsNode 	= null;
		rSpd._configNode 	= null;

		rSpd._wpmValNode 			= null;
		rSpd._wpmSlider 			= null;
		rSpd._slowStartValNode 		= null;
		rSpd._slowStartSlider 		= null;
		rSpd._sentenceDelayValNode 	= null;
		rSpd._sentenceDelaySlider 	= null;
		rSpd._puncDelayValNode 		= null;
		rSpd._puncDelaySlider 		= null;
		rSpd._shortWordDelayValNode = null;
		rSpd._shortWordDelaySlider 	= null;
		rSpd._longWordDelayValNode 	= null;
		rSpd._longWordDelaySlider 	= null;
		rSpd._numericDelayValNode 	= null;
		rSpd._numericDelaySlider 	= null;

		// Why is this here? Because it's going to be a rewind/fastforward control
		// in the future
		// ??: Maybe put progress bar in main display and add the scrubber here...?
		var scrubberStr = '<div id="__rdly_scrubber"></div>';
		// Go in .rdly-bar-center .rdly-below?
		// 'play' and 'pause' are also triggered by clicking on the text
		var controlsStr = '<div id="__rdly_playback_controls">\
						<button id="__rdly_rewind_sentence" class="__rdly-playback-button"></button>\
						<button id="__rdly_rewind_word" class="__rdly-playback-button"></button>\
						<button id="__rdly_pause" class="__rdly-playback-button"></button>\
						<button id="__rdly_play" class="__rdly-playback-button"></button>\
						<button id="__rdly_fastforward_word" class="__rdly-playback-button"></button>\
						<button id="__rdly_fastforward_sentence" class="__rdly-playback-button"></button>\
					</div>';

		var restartStr = '<div id="__rdly_restart"></div>'


		var scrubber, controls, restart;



		$(timer).on('playing', rSpd._pause);
		rSpd._play = function () {
			// Change the pause element and play element
			return rSpd;
		}


		$(timer).on('paused', rSpd._pause);
		$(timer).on('stopped', rSpd._pause);
		rSpd._pause = function () {
			// Change the pause element and play element
			return rSpd;
		}


		rSpd._togglePlayPause = function () {
			console.log('bleh')
			timer.togglePlayPause();
			return rSpd;
		};


		rSpd._restart = function () {
			timer.restart()
		};



		function setReadOptions ( myOptions ) {
			// readOptions = $.extend( {}, readOptions, myOptions );
			// chrome.storage.sync.clear(function () {
			// 	chrome.storage.sync.set(readOptions, function() {
			// 		//console.log('[READ] set:', readOptions);
			// 	});
			// });
		};

		rSpd._addEvents = function () {
			$(document).on( 'blur', '.__read .__read_speed', function () {
				var val = Math.min( 15000, Math.max( 0, parseInt(this.value,10)));
				setReadOptions( {"wpm": val} );
			});

			$(document).on( 'blur', '.__read .__read_slow_start', function () {
				var val = Math.min( 5, Math.max( 1, parseInt(this.value,10)));
				setReadOptions( {"slowStartCount": val} );
			});

			$(document).on( 'blur', '.__read .__read_sentence_delay', function () {
				var val = Math.min( 5, Math.max( 0, Number(this.value)));
				setReadOptions( {"sentenceDelay": val} );
			});

			$(document).on( 'blur', '.__read .__read_punc_delay', function () {
				var val = Math.min( 5, Math.max( 0, Number(this.value)));
				setReadOptions( {"otherPuncDelay": val} );
			});

			$(document).on( 'blur', '.__read .__read_short_word_delay', function () {
				var val = Math.min( 5, Math.max( 0, Number(this.value)));
				setReadOptions( {"shortWordDelay": val} );
			});

			$(document).on( 'blur', '.__read .__read_long_word_delay', function () {
				var val = Math.min( 5, Math.max( 0, Number(this.value)));
				setReadOptions( {"longWordDelay": val} );
			});

			return rSpd;
		};


		rSpd._oneSlider = function ( data ) {
		/* ( {} ) -> ?
		* 
		* Turn the given data into one noUiSlider slider
		*/
			var slider = data.sliderNode.noUiSlider({
				range: [ data.range.min, data.range.max ],
				start: [ data.startVal ],
				step: data.step,
				connect: 'lower',
				handles: 1,
				behaviour: 'extend-tap',
				serialization: {
					to: [ data.inputNode ],
					resolution: data.step
				},
				set: $.proxy( function() {
					data.setFunc( data.inputNode.val() );
					data.inputNode.blur();
				}, this )
			});

			return slider;
		};  // End rSpd._oneSlider()


		rSpd._makeSliders = function () {

			var slider = rSpd._oneSlider;

			// Template
			// slider({
			// 	sliderNode: DOMNode,
			// 	range: 		{ min: num, max: num },
			// 	startVal: 	num,
			// 	step: 		num,  // and resolution
			// 	inputNode: 	DOMNode,
			// 	setFunc: 	function
			// });

			slider({
				sliderNode: 	rSpd._wpmSlider,
				range: 		{ min: 300, max: 1500 },
				// // Shouldthis be some none "_" value? Passed in?
				startVal: 	timer._settings.wpm,
				step: 		25,  // and resolution
				inputNode: 	rSpd._wpmValNode,
				setFunc: 	timer.setWPM
			});

			slider({
				sliderNode: rSpd._slowStartSlider,
				range: 		{ min: 0, max: 5 },
				startVal: 	timer._settings.slowStartDelay,
				step: 		1,  // and resolution
				inputNode: 	rSpd._slowStartValNode,
				setFunc: 	timer.setSlowStartDelay
			});

			slider({
				sliderNode: rSpd._sentenceDelaySlider,
				range: 		{ min: 0, max: 5 },
				startVal: 	timer._settings.sentenceDelay,
				step: 		0.1,  // and resolution
				inputNode: 	rSpd._sentenceDelayValNode,
				setFunc: 	timer.setSentenceDelay
			});

			slider({
				sliderNode: rSpd._puncDelaySlider,
				range: 		{ min: 0, max: 5 },
				startVal: 	timer._settings.otherPuncDelay,
				step: 		0.1,  // and resolution
				inputNode: 	rSpd._puncDelayValNode,
				setFunc: 	timer.setOtherPuncDelay
			});

			slider({
				sliderNode: rSpd._shortWordDelaySlider,
				range: 		{ min: 0, max: 5 },
				startVal: 	timer._settings.shortWordDelay,
				step: 		0.1,  // and resolution
				inputNode: 	rSpd._shortWordDelayValNode,
				setFunc: 	timer.setShortWordDelay
			});

			slider({
				sliderNode: rSpd._longWordDelaySlider,
				range: 		{ min: 0, max: 5 },
				startVal: 	timer._settings.longWordDelay,
				step: 		0.1,  // and resolution
				inputNode: 	rSpd._longWordDelayValNode,
				setFunc: 	timer.setLongWordDelay
			});

			slider({
				sliderNode: rSpd._numericDelaySlider,
				range: 		{ min: 0, max: 5 },
				startVal: 	timer._settings.numericDelay,
				step: 		0.1,  // and resolution
				inputNode: 	rSpd._numericDelayValNode,
				setFunc: 	timer.setNumericDelay
			});

			// Original (for reference)
			// // WPM
			// this._wpmSliderElement.noUiSlider({
			// 	range: [300,1500],
			// 	start: this._options.wpm,
			// 	step: 25,
			// 	// connect: 'lower',
			// 	// handles: 1,
			// 	// behaviour: 'extend-tap',
			// 	serialization: {
			// 		to: [ this._wpmElement ],
			// 		resolution: 1
			// 	},
			// 	set: $.proxy( function() {
			// 		this.setWPM( this._wpmElement.val() );
			// 		this._wpmElement.blur();
			// 	}, this )
			// });

			// // Slow Start
			// this._slowStartSliderElement.noUiSlider({
			// 	range: [0,5],
			// 	start: this._options.slowStartCount,
			// 	step: 1,
			// 	// connect: 'lower',
			// 	// handles: 1,
			// 	// behaviour: 'extend-tap',
			// 	serialization: {
			// 		to: [ this._slowStartElement ],
			// 		resolution: 1
			// 	},
			// 	set: $.proxy( function() {
			// 		this.setSlowStartCount( this._slowStartElement.val() );
			// 		this._slowStartElement.blur();
			// 	},this )
			// });

			// // Sentence Delay
			// this._sentenceDelaySliderElement.noUiSlider({
			// 	range: [0,5],
			// 	start: this._options.sentenceDelay,
			// 	step: 0.1,
			// 	// connect: 'lower',
			// 	// handles: 1,
			// 	// behaviour: 'extend-tap',
			// 	serialization: {
			// 		to: [ this._sentenceDelayElement ],
			// 		resolution: 0.1
			// 	},
			// 	set: $.proxy( function() {
			// 		this.setSentenceDelay( this._sentenceDelayElement.val() );
			// 		this._sentenceDelayElement.blur();
			// 	},this )
			// });

			// // Other Punctuation Delay
			// this._puncDelaySliderElement.noUiSlider({
			// 	range: [0,5],
			// 	start: this._options.otherPuncDelay,
			// 	step: 0.1,
			// 	// connect: 'lower',
			// 	// handles: 1,
			// 	// behaviour: 'extend-tap',
			// 	serialization: {
			// 		to: [ this._puncDelayElement ],
			// 		resolution: 0.1
			// 	},
			// 	set: $.proxy( function() {
			// 		this.setOtherPuncDelay( this._puncDelayElement.val() );
			// 		this._puncDelayElement.blur();
			// 	},this )
			// });

			// // Short Word Delay
			// this._shortWordDelaySliderElement.noUiSlider({
			// 	range: [0,5],
			// 	start: this._options.shortWordDelay,
			// 	step: 0.1,
			// 	// connect: 'lower',
			// 	// handles: 1,
			// 	// behaviour: 'extend-tap',
			// 	serialization: {
			// 		to: [ this._shortWordDelayElement ],
			// 		resolution: 0.1
			// 	},
			// 	set: $.proxy( function() {
			// 		this.setShortWordDelay( this._shortWordDelayElement.val() );
			// 		this._shortWordDelayElement.blur();
			// 	},this )
			// });

			// // Long word Delay
			// this._longWordDelaySliderElement.noUiSlider({
			// 	range: [0,5],
			// 	start: this._options.longWordDelay,
			// 	step: 0.1,
			// 	// connect: 'lower',
			// 	// handles: 1,
			// 	// behaviour: 'extend-tap',
			// 	serialization: {
			// 		to: [ this._longWordDelayElement ],
			// 		resolution: 0.1
			// 	},
			// 	set: $.proxy( function() {
			// 		this.setLongWordDelay( this._longWordDelayElement.val() );
			// 		this._longWordDelayElement.blur();
			// 	},this )
			// });

			// // Numeric Delay
			// this._numericDelaySliderElement.noUiSlider({
			// 	range: [0,5],
			// 	start: this._options.numericDelay,
			// 	step: 0.1,
			// 	// connect: 'lower',
			// 	// handles: 1,
			// 	// behaviour: 'extend-tap',
			// 	serialization: {
			// 		to: [ this._numericDelayElement ],
			// 		resolution: 0.1
			// 	},
			// 	set: $.proxy( function() {
			// 		this.setNumericDelay( this._numericDelayElement.val() );
			// 		this._numericDelayElement.blur();
			// 	},this )
			// });
		};  // End rSpd._makeSliders()

'<div class="__read_settings">\
	<div class="__read_setting __read_wpm">\
		<label class="__read_label">Words Per Minute</label>\
		<input class="__read_input __read_speed" type="text"/>\
		<div class="__read_slider __read_speed_slider"></div>\
	</div>\
	<div class="__read_setting __read_slowstart">\
		<label class="__read_label">Slow Start Speed</label>\
		<input class="__read_input __read_slow_start" type="text"/>\
		<div class="__read_slider __read_slow_start_slider"></div>\
	</div>\
	<div class="__read_setting __read_sentencedelay">\
		<label class="__read_label">Sentence Delay</label>\
		<input class="__read_input __read_sentence_delay" type="text"/>\
		<div class="__read_slider __read_sentence_delay_slider"></div>\
	</div>\
	<div class="__read_setting __read_puncdelay">\
		<label class="__read_label">Other Punctuation Delay</label>\
		<input class="__read_input __read_punc_delay" type="text"/>\
		<div class="__read_slider __read_punc_delay_slider"></div>\
	</div>\
	<div class="__read_setting __read_shortworddelay">\
		<label class="__read_label">Short Word Delay</label>\
		<input class="__read_input __read_short_word_delay" type="text"/>\
		<div class="__read_slider __read_short_word_delay_slider"></div>\
	</div>\
	<div class="__read_setting __read_longworddelay">\
		<label class="__read_label">Long Word Delay</label>\
		<input class="__read_input __read_long_word_delay" type="text"/>\
		<div class="__read_slider __read_long_word_delay_slider"></div>\
	</div>\
	<div class="__read_setting __read_numericdelay">\
		<label class="__read_label">Numeric Delay</label>\
		<input class="__read_input __read_numeric_delay" type="text"/>\
		<div class="__read_slider __read_numeric_delay_slider"></div>\
	</div>\
</div>'
		rSpd._oneSetting = function ( idName, label ) {
			// Should the very specific classes be ids?
			return $('<div id="__rdly_' + idName + '_setting" class="__rdly-setting">\
				<label class="__rdly_label">' + label + '</label>\
				<input id="__rdly_' + idName + '_input" class="__rdly-input" type="text"/>\
				<div id="__rdly_' + idName + '_slider" class="__rdly-slider"></div>\
			</div>')
		};  // End rSpd._oneSetting()

		rSpd.makeNodes = function () {
			var one = rSpd._oneSetting;

			var $opn = $('<div id="__rdly_open_settings"></div>'),
				$set = $('<div id="__rdly_speed_settings"></div>'),
				$wpm = one( wpm, 'Words Per Minute' ),
				$ss  = one( slowstart, 'Slow Start Speed' ),
				$sd  = one( sentencedelay, 'Sentence Delay' ),
				$pd  = one( puncdelay, 'Other Punctuation Delay' ),
				$swd = one( shortworddelay, 'Short Word Delay' ),
				$lwd = one( longworddelay, 'Long Word Delay' ),
				$nd  = one( numericdelay, 'Numeric Delay' );

			var left  = mainDisplay.nodes.left,
				below = mainDisplay.nodes.below;

			$opn.prependTo( left );
			$set.prependTo( below );



		rSpd._settingsNode 	= null;
		rSpd._configNode 	= null;

		rSpd._wpmValNode 			= null;
		rSpd._wpmSlider 			= null;
		rSpd._slowStartValNode 		= null;
		rSpd._slowStartSlider 		= null;
		rSpd._sentenceDelayValNode 	= null;
		rSpd._sentenceDelaySlider 	= null;
		rSpd._puncDelayValNode 		= null;
		rSpd._puncDelaySlider 		= null;
		rSpd._shortWordDelayValNode = null;
		rSpd._shortWordDelaySlider 	= null;
		rSpd._longWordDelayValNode 	= null;
		rSpd._longWordDelaySlider 	= null;
		rSpd._numericDelayValNode 	= null;
		rSpd._numericDelaySlider 	= null;

		};


		rSpd._init = function ( mainDisplay ) {

			scrubber = $(scrubberStr)[0];
			controls = $(controlsStr)[0];
			restart  = $(restartStr)[0];

			var nodes = mainDisplay.nodes;
			$(scrubber).appendTo( nodes.percentDone );
			$(controls).appendTo( nodes.bar );
			$(restart).appendTo( nodes.left );

			rSpd._addEvents();

			return rSpd;
		};



		// =========== ADD NODE, ETC. =========== \\
		// Don't show at start, only when prompted
		rSpd._init( mainDisplay );

		// To be called in a script
		return rSpd;
	};  // End SpeedSettings() -> {}

	// To put on the window object, or export into a module
    return SpeedSettings;
}));
