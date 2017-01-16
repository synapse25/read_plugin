/* WordNav.js
* 
* Navigate the sentences and words in Words
* 
* Based on https://github.com/jamestomasino/read_plugin/blob/master/ReadBlock.js
* 
* TODO:
* - Go back a sentence - array of indexes where sentences start?
* - Change max word length - recombine split words (record of which
* words were split) and address each word that is longer than
* the max-word length.
* - ??: Add delay for paragraph?
* - Reset values non-destructively
* - Split Qeue into
*   Words and...
*   Word(s) Navigator/Trotter/Transporter/Traveler/Traverse/Walker/Explorer
*/

(function (root, wNavFactory) {  // root is usually `window`
    if (typeof define === 'function' && define.amd) {  // amd if possible
        // AMD. Register as an anonymous module.
        define( [], function () { return ( root.WordNav = wNavFactory() ) });
    } else if (typeof module === 'object' && module.exports) {  // Node-ish next
        // Node. Does not work with strict CommonJS, but only CommonJS-like
        // environments that support module.exports, like Node.
        module.exports = wNavFactory();
    } else {  // Global if nothing else
        // Browser globals
        // !!! Broken !!!
        root.WordNav = wNavFactory( Fragment, root );  // root.sentences is undefined :P Not sure what to provide there
    }
}(this, function () {

    "use strict";


    // TODO: Do this without needing a new object each time
    var WordNav = function () {
    /* ( None ) -> WordNav
    * 
    * Provides commands for getting the words/fragments passed into
    * its `.process()`. 
    * Always use .getFragment
    */
        var wNav = {};

        // Contains .text, .sentenceFragments, .positions
        wNav.words 		= null;

        wNav.index 		= 0;
        wNav.position   = [0, 0];

        // ==== Internal ==== \\
        wNav._progress 	= 0;
        var sentences 	= null,
        	positions 	= null;;


       	wNav.process = function ( words ) {
       		if (!words) { console.error('WordNav needs dataz to .process(). You gave it dis:', words); }

	        wNav.words 	= words;
	        sentences 	= words.sentenceFragments;
	    	positions 	= words.positions;

	       return wNav;
       	};

        // ========= RUNTIME: TRAVELING THE WORDS/SENTENCES (for external use) ========= \\

        wNav.restart = function () {
            // Will be normalized by the next operation called (next, prev, current)
            wNav.index    = 0;
            wNav.position = [0, 0];
            return wNav;
        };

        wNav.getFragment = function ( changesOrIndex ) {
        // ( [#, #] or # ) -> Fragment
            wNav.index      = wNav._step( changesOrIndex );
            wNav.position   = positions[ wNav.index ];
            return sentences[ wNav.position[0] ][ wNav.position[1] ];
        }


        wNav._step = function ( changesOrIndex ) {
        // ( [#, #] or # ) -> Fragment
            var index = wNav.index;

            if ( typeof changesOrIndex === 'number' ) {
                index = wNav.normalizeIndex( changesOrIndex );
            } else {
                // If there's a sentence level change, we're traveling
                // sentences, not words (this assumes we never do both)
                if ( changesOrIndex[0] ) {
                    index = wNav._stepSentence( changesOrIndex[0] );
                } else {
                    index += changesOrIndex[1];
                    index = wNav.normalizeIndex( index );
                }
            }  // end if index or change array
            return index;
        };  // end wNav._step();


        wNav._stepSentence = function ( sentenceChange ) {
        // ( [int, int] ) -> int
        // TODO: Account for right arrow on last sentence
            if ( sentenceChange === 0 ) {return};

            var pos     = [ wNav.position[0], wNav.position[1] ],
                senti   = pos[0],
                wordi   = pos[1];

            // If in the last sentence, go to the last word
            if ( sentenceChange > 0 && senti >= (sentences.length - 1) ) {
                wordi = sentences[ senti ].length - 1;

            } else {
                // If we're in the middle of a sentence and we're
                // only going back one step, go back to the beginning of the sentence
                if ( sentenceChange === -1 && wordi > 0 ) {}  // No change to sentence
                // otherwise change sentence
                else { senti += sentenceChange; }
                // Either way, word is first word of sentence
                wordi = 0;
            }  // end if at last sentence

            pos[1] = wordi;
            pos[0] = wNav.normalizeSentencePos( senti );

            var newIndex = wNav._sentenceChangeToIndex( sentenceChange, pos );
            if ( newIndex === null ) { newIndex = wNav.index; }

            return newIndex;
        };  // End wNav._stepSentence

        wNav._sentenceChangeToIndex = function ( sentenceChange, newPos ) {
        /* ( int, [int, int] ) -> int or null
        * 
        * Given the direction of change and the position desired, find the
        * index of the new position.
        * Only used for sentence changes. If we need something else,
        * we'll see about that then. Just trying to speed up the search
        */
            if ( sentenceChange === 0 ) {return null;}  // signOf shouldn't return NaN now

            var incrementor = signOf( sentenceChange ),  // 1 or -1
                tempi       = wNav.index,
                found       = false;

            // Until we find the position or there are no more positions left
            while ( !found && positions[ tempi ] ) {
                // Test out positions
                var pos = positions[ tempi ];
                if ( pos[0] === newPos[0] && pos[1] === newPos[1] ) {
                    found = true;
                }
                // If not found, keep going until there are no more positions left in the list
                if (!found) { tempi += incrementor; }
            }

            // If we went through all the list we could and didn't find anything, say so
            // Not quite sure why that would happen, though
            if ( !positions[tempi] ) { tempi = null; }

            return tempi;
        };  // End wNav._sentenceChangeToIndex()

        wNav._positionToIndex = function ( pos ) {
        /* ( [int, int] ) -> int
        * 
        * Given a [sentence, word] position, find the index of that
        * configuration in the positions list. If none found, return
        * -1. (There are ways to speed this up if needed, like checking
        * just sentence index first until sentence found, etc).
        * 
        * This is different from ._sentenceChangeToIndex() because this
        * one searches the whole array, it doesn't start from the current
        * position and work in a direction (back of forward) from there.
        */
            var index = positions.findIndex( function matchPosToIndex( potential ) {
                var sent = (pos[0] === potential[0]),
                    frag = (pos[1] === potential[1]);
                return sent && frag
            })
            return index;
        }



        // ========== utilities ========== \\

        var signOf = function ( num ) {
            return typeof num === 'number' ? num ? num < 0 ? -1 : 1 : num === num ? num : NaN : NaN;
        }

        wNav.normalizeIndex = function ( index ) {
            index = Math.min( index, positions.length - 1 );  // max
            return Math.max( index, 0 );  // min
        };

        wNav.normalizeSentencePos = function ( senti ) {
            senti = Math.min( senti, (sentences.length - 1) );
            return Math.max( senti, 0 );
        };



        // ========== gets ========== \\

        wNav.getProgress = function () {
            wNav._progress = wNav.index / positions.length;
            return wNav._progress;
        };

        wNav.getLength = function () {
            return positions.length;
        };

        wNav.getIndex = function () {
            return wNav.index;
        }

        return wNav;
    };  // End WordNav() -> {}

    return WordNav;
}));
