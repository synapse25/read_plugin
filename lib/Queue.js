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
* 
*/

(function (root, qFactory) {  // root is usually `window`
    if (typeof define === 'function' && define.amd) {  // amd if possible
        // AMD. Register as an anonymous module.
        define( ['lib/Fragment'], function (Fragment) { return (root.Queue = qFactory(Fragment)); });
    } else if (typeof module === 'object' && module.exports) {  // Node-ish next
        // Node. Does not work with strict CommonJS, but only CommonJS-like
        // environments that support module.exports, like Node.
        module.exports = qFactory( require('lib/Fragment') );
    } else {  // Global if nothing else
        // Browser globals
        root.Queue = qFactory( Fragment );
    }
}(this, function ( Fragment ) {

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
        qu.text;  // Is this useful?
        qu.fragments = [];
        qu.index     = 0;
        qu._progress = 0;


        // ========= BUILD THE QUEUE (internal) ========= \\
        qu.process = function ( text ) {

            // Cleanup
            qu.text = text;
            qu.fragments = [];
            qu.index     = 0;

            // Build word chain
            var rawWords = text.match(wordRegex);

            // Extra splits on odd punctuation situations
            var i = rawWords.length;
            while (i--) {
                var w = rawWords[i];
                w = qu._puncBreak(w);
                var subWords = w.match(wordRegex);
                var j = subWords.length;
                while (j--) {
                    if (subWords[j].length > 13) {
                        var subw = qu._break(subWords[j]);
                        var subsubWords = subw.match(wordRegex);
                        var k = subsubWords.length;
                        while (k--) {
                            qu.fragments.unshift( new Fragment(subsubWords[k]) ) ;
                        }  // end for every sub sub word
                    } else {
                        qu.fragments.unshift( new Fragment(subWords[j]) ) ;
                    }
                }  // end for every subword
            }  // end for every raw word

            qu.fragments.unshift( null );
        };  // End qu.process()

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

        qu.next = function () {
            qu.index = Math.min( qu.index + 1, qu.fragments.length - 1 );
            var frag = qu.fragments[ qu.index ];
            return frag;
        };

        qu.prev = function () {
            // 1 is lowest because of how qu.next() has to work
            qu.index = Math.max( qu.index - 1, 1 );
            var frag = qu.fragments[ qu.index ];
            return frag;
        };

        qu.current = function() {
            // Make sure nothing's off about the index
            // 1 is lowest because of how qu.next() has to work
            qu.index = Math.max( qu.index, 1 );
            qu.index = Math.min( qu.index, qu.fragments.length - 1 );
            var frag = qu.fragments[ qu.index ];
            return frag;
        };

        qu.restart = function () {
            // Will be incremented by qu.next or normalized otherwise.
            qu.index = 0;
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
            qu._progress = qu.index / (qu.fragments.length - 1);
            return qu._progress;
        };

        return qu;
    };  // End Queue() -> {}

    return Queue;
}));
