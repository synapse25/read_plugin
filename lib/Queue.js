/* Queue.js
* 
* Builds the queue of fragment object to be served one at
* a time by the timer/player/reader.
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
* 
*/

(function (root, qFactory) {  // root is usually `window`
    if (typeof define === 'function' && define.amd) {  // amd if possible
        // AMD. Register as an anonymous module.
        define( ['lib/Fragment', 'sbd'], function (Fragment, sbd) { return (root.Queue = qFactory(Fragment, sbd)); });
    } else if (typeof module === 'object' && module.exports) {  // Node-ish next
        // Node. Does not work with strict CommonJS, but only CommonJS-like
        // environments that support module.exports, like Node.
        module.exports = qFactory( require('./Fragment.js'), require('sbd') );
    } else {  // Global if nothing else
        // Browser globals
        root.Queue = qFactory( Fragment, root );  // root.sentences is undefined :P Not sure what to provide there
    }
}(this, function ( Fragment, sentenceParser ) {

    "use strict";

    var wordRegex = /([^\s\-\—\/]+[\-\—\/]?|[\r\n]+)/g;
    var presuf = /^(\W*)(anti|auto|ab|an|ax|al|as|bi|bet|be|contra|cat|cath|cir|cum|cog|col|com|con|cor|could|co|desk|de|dis|did|dif|di|eas|every|ever|extra|ex|end|en|em|epi|evi|func|fund|fin|hyst|hy|han|il|in|im|ir|just|jus|loc|lig|lit|li|mech|manu|man|mal|mis|mid|mono|multi|mem|micro|non|nano|ob|oc|of|opt|op|over|para|per|post|pre|peo|pro|retro|rea|re|rhy|should|some|semi|sen|sol|sub|suc|suf|super|sup|sur|sus|syn|sym|syl|tech|trans|tri|typo|type|uni|un|van|vert|with|would|won)?(.*?)(weens?|widths?|icals?|ables?|ings?|tions?|ions?|ies|isms?|ists?|ful|ness|ments?|ly|ify|ize|ise|ity|en|ers?|ences?|tures?|ples?|als?|phy|puts?|phies|ry|ries|cy|cies|mums?|ous|cents?)?(\W*)$/i;
    var vowels = 'aeiouyAEIOUY'+
        'ẚÁáÀàĂăẮắẰằẴẵẲẳÂâẤấẦầẪẫẨẩǍǎÅåǺǻÄäǞǟÃãȦȧǠǡĄąĀāẢảȀȁȂȃẠạẶặẬậḀḁȺⱥ'+
        'ǼǽǢǣÉƏƎǝéÈèĔĕÊêẾếỀềỄễỂểĚěËëẼẽĖėȨȩḜḝĘęĒēḖḗḔḕẺẻȄȅȆȇẸẹỆệḘḙḚḛɆɇɚɝÍíÌìĬĭÎîǏǐÏ'+
        'ïḮḯĨĩİiĮįĪīỈỉȈȉȊȋỊịḬḭIıƗɨÓóÒòŎŏÔôỐốỒồỖỗỔổǑǒÖöȪȫŐőÕõṌṍṎṏȬȭȮȯȰȱØøǾǿǪǫǬǭŌōṒṓ'+
        'ṐṑỎỏȌȍȎȏƠơỚớỜờỠỡỞởỢợỌọỘộƟɵÚúÙùŬŭÛûǓǔŮůÜüǗǘǛǜǙǚǕǖŰűŨũṸṹŲųŪūṺṻỦủȔȕȖȗƯưỨứỪừ'+
        'ỮữỬửỰựỤụṲṳṶṷṴṵɄʉÝýỲỳŶŷY̊ẙŸÿỸỹẎẏȲȳỶỷỴỵʏɎɏƳƴ';
    var c = '[^'+vowels+']';
    var v = '['+vowels+']';
    var vccv = new RegExp('('+v+c+')('+c+v+')', 'g');
    var simple = new RegExp('(.{2,4}'+v+')'+'('+c+')', 'g');  // Currently not used
    var puncSplit = /(.+?)(\.[^\w]\b|,[^\w]\b)(.+?)/;


    // TODO: Do this without needing a new object each time
    var Queue = function () {
    /* 
    * 
    * 
    */
        var qu = {};

        // ========= (for external use) ========= \\
        qu.text      = null;  // Is this useful?
        qu.sentences = null;
        qu.sentenceFragments = [];
        qu.fragments = [];
        qu.index     = -1;
        // Since data will be in arrays of sentences with words, this will
        // tell us which index corresponds to which sentence/word position
        qu.positions = [];
        qu._progress = 0;


        // ========= BUILD THE QUEUE (internal) ========= \\
        qu.process = function ( text ) {

            // Cleanup
            qu.text       = text;
            var sentences = qu.sentences = sentenceParser.sentences( text, {
                'sanitize' : true, // No html passed in
            });

            var sFrags   = qu.sentenceFragments = [];  // Array of arrays of fragment objects (for now)
            qu.fragments = [];
            qu.index     = 0;
            qu.positions = [];

            for ( let senti = 0; senti < sentences.length; senti++ ) {
                let sentence            = sentences[senti],
                    fragmentedWithPos   = qu._processSentence( sentence, senti );
                sFrags.push( fragmentedWithPos );
            }

            return qu;
        };  // End qu.process()

        qu._processSentence = function ( text, sentenceIndex ) {

            var sentence    = [],
                positions   = qu.positions,
                frags       = qu.fragments;

            // Build word chain
            var rawWords    = text.match(wordRegex),
                fragIndex   = 0;

            var pos         = positions.length;  // 1 past the previous index

            // Extra splits on odd punctuation situations
            let i = 0;
            while (i < rawWords.length) {
                let w = rawWords[i];
                w = qu._puncBreak(w);
                let subWords = w.match(wordRegex);
                let j = 0;
                while (j < subWords.length) {
                    if (subWords[j].length > 13) {
                        let subw = qu._break(subWords[j]);
                        let subsubWords = subw.match(wordRegex);
                        let k = 0;
                        while (k < subsubWords.length) {
                            let frag = new Fragment(subsubWords[k]);

                            sentence.push( frag );
                            positions.push( { sentence: sentenceIndex, fragment: fragIndex } );
                            fragIndex++;
                            k++;
                            // old
                            frags.push( frag );

                        }  // end for every sub sub word
                    } else {
                        let frag = new Fragment(subWords[j]);
                        sentence.push( frag );
                        positions.push( { sentence: sentenceIndex, fragment: fragIndex } );
                        fragIndex++;
                        // old
                        frags.push( frag );
                    }  // end if long word

                    j++;
                }  // end for every subword

                i++;
            }  // end for every raw word

            return {posIndex: pos, fragments: sentence};
        };  // End qu._processSentence()

        qu._puncBreak = function (word) {  // Recursive
            var parts = puncSplit.exec(word);
            var ret = [];
            if (parts) {
                ret.push (parts[1]+parts[2]);
                ret = ret.concat(qu._puncBreak(parts[3]));
            } else {
                ret = [word];
            }
            return ret.join(' ');
        };

        qu._break = function (word) {
        /* 
        * 
        * Break up longer words into shorter fragments.
        * TODO: Deal with words that are non-English or nonsense
        */
            // punctuation, prefix, center, suffix, punctuation
            var parts = presuf.exec(word);
            var ret = [];
            if (parts[2]) {
                ret.push(parts[2]);
            }
            if (parts[3]) {
                ret.push(parts[3].replace(vccv, '$1-$2'));
            }
            if (parts[4]) {
                ret.push(parts[4]);
            }
            return (parts[1]||'') + ret.join('-') + (parts[5]||'');
        };


        // ========= RUNTIME: TRAVELING THE QUEUE (for external use) ========= \\
        qu.getFrag = function (index) {
            var pos  = qu.positions[ index ]
            var frag = qu.sentenceFragments[ pos.sentence ].fragments[ pos.fragment ];
            return frag;
        };

        qu.next = function () {
            var index = qu.index = Math.min( qu.index + 1, qu.positions.length - 1 );
            return qu.getFrag(index);
        };

        qu.prev = function () {
            var index = qu.index = Math.max( qu.index - 1, 0 );
            return qu.getFrag(index);
        };

        qu.current = function() {
            // Make sure nothing's off about the index
            qu.index    = Math.max( qu.index, 0 );
            var index   = qu.index = Math.min( qu.index, qu.positions.length - 1 );
            return qu.getFrag(index);
        };

        qu.restart = function () {
            // Will be normalized by the next operation called (next, prev, current)
            qu.index = -1;
            return qu;
        };

        // TODO: Go back whole words and sentences at a time
        qu.goTo = function ( playbackObj ) {
        // .type = 'index', 'word', or 'sentence'
        // .amount = int
        // Not sure what argument to pass in.
        // 'previous sentence'? 'next sentence'? 'section of document'? An index number?
            var type    = playbackObj.type,
                amount  = playbackObj.amount;
            if ( type === 'index' ) {
                qu.index = amount;
            }
            // TODO: (perhaps) qu[ type ] = amount;
            return qu;
        };


        qu.getProgress = function () {
            qu._progress = qu.index / (qu.positions.length - 1);
            return qu._progress;
        };

        return qu;
    };  // End Queue() -> {}

    return Queue;
}));
