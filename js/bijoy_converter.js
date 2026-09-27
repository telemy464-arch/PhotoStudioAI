/**
 * PhotoStudio AI - Complete Unicode to Bijoy (SutonnyMJ) & Bijoy to Unicode Converter
 * Converts Bengali text between modern Unicode and legacy Bijoy ANSI (SutonnyMJ).
 * Preserves HTML tags during document conversion for clean A4 printing and Word (.doc) export.
 */

(function () {
  'use strict';

  // 1. Complex 3-character and 4-character conjuncts
  const conjuncts3 = [
    ['\u0995\u09CD\u09B7\u09CD\u09AE', '\u00B6\u00A7'], // ক্ষ্ম -> ¶§
    ['\u0995\u09CD\u09B7\u09CD\u09AF', '\u00B6\u00A8'], // ক্ষ্য -> ¶¨
    ['\u09A8\u09CD\u09A4\u09CD\u09B0', '\u0161\u00CD\u00AB'], // ন্ত্র -> šÍ«
    ['\u09A8\u09CD\u09A4\u09CD\u09AC', '\u0161\u00CD\u00A1'], // ন্ত্ব -> šÍ¡
    ['\u09A8\u09CD\u09A6\u09CD\u09AC', '\u203A\u00D8'], // ন্দ্ব -> ›Ø
    ['\u09B8\u09CD\u09A4\u09CD\u09AC', '\u00AF\u00CD\u00A1'], // স্ত্ব -> ¯Í¡
    ['\u09B8\u09CD\u09A4\u09CD\u09B0', '\u00AF\u00BF'], // স্ত্র -> ¯¿
    ['\u09B8\u09CD\u09A5\u09CD\u09AF', "\u00AF'\u00A8"], // স্থ্য -> ¯'¨
    ['\u099A\u09CD\u099B\u09CD\u09AC', '\u201DQ\u00A1'], // চ্ছ্ব -> ”Q¡
    ['\u099C\u09CD\u099C\u09CD\u09AC', '3\u00A1'], // জ্জ্ব -> 3¡
    ['\u09B7\u09CD\u09AA\u09CD\u09B0', '\u00AE,\u00D6'], // ষ্প্র -> ®,Ö
    ['\u09B8\u09CD\u09AA\u09CD\u09B2', '\u00AFc\u00AC'], // স্প্ল -> ¯c¬
    ['\u09AA\u09CD\u09B0\u09CD\u09AF', 'c\u00D6\u00A8'], // প্র্য -> cÖ¨
    ['\u09B8\u09CD\u09AC\u09CD\u09AF', '\u00AF^\u00A8'], // স্ব্য -> ¯^¨
  ];

  // 2. Standard 2-character conjuncts
  const conjuncts2 = [
    ['\u0995\u09CD\u0995', '\u00B0'], // ক্ক -> °
    ['\u0995\u09CD\u099F', '\u00B1'], // ক্ট -> ±
    ['\u0995\u09CD\u09A4', '\u00B3'], // ক্ত -> ³
    ['\u0995\u09CD\u09AE', '\u00B5'], // ক্ম -> µ
    ['\u0995\u09CD\u09B2', 'K\u00AC'], // ক্ল -> K¬
    ['\u0995\u09CD\u09B7', '\u00B6'], // ক্ষ -> ¶
    ['\u0995\u09CD\u09B8', 'K\u00E8'], // ক্স -> Kè
    ['\u0997\u09CD\u09A7', '\u00BB'], // গ্ধ -> »
    ['\u0997\u09CD\u09A8', 'M\u0153'], // গ্ন -> Mœ
    ['\u0997\u09CD\u09AE', 'M\u00A5'], // গ্ম -> M¥
    ['\u0997\u09CD\u09B0', 'M\u00D6'], // গ্র -> MÖ
    ['\u0997\u09CD\u09B2', 'M\u00AC'], // গ্ল -> M¬
    ['\u0999\u09CD\u0995', '\u00BC'], // ঙ্ক -> ¼
    ['\u0999\u09CD\u0996', '\u00BD'], // ঙ্খ -> ½
    ['\u0999\u09CD\u0997', '\u00BE'], // ঙ্গ -> ¾
    ['\u0999\u09CD\u0998', '\u00BF'], // ঙ্ঘ -> ¿
    ['\u099A\u09CD\u099A', 'P&P'], // চ্চ -> P&P
    ['\u099A\u09CD\u099B', 'Q'], // চ্ছ -> Q
    ['\u099A\u09CD\u099E', '\u00F5P'], // চ্ঞ -> ঁচ
    ['\u099C\u09CD\u099C', '3'], // জ্জ -> 3
    ['\u099C\u09CD\u099E', '\u00C1'], // জ্ঞ -> Á
    ['\u099C\u09CD\u09AC', 'R\u00A1'], // জ্ব -> R¡
    ['\u099E\u09CD\u099A', '\u00C2'], // ঞ্চ -> Â
    ['\u099E\u09CD\u099B', '\u00C3'], // ঞ্ছ -> Ã
    ['\u099E\u09CD\u099C', '\u00C4'], // ঞ্জ -> Ä
    ['\u099E\u09CD\u099D', '\u00C5'], // ঞ্ঝ -> Å
    ['\u099F\u09CD\u099F', '\u00FF'], // ট্ট -> ÿ
    ['\u099F\u09CD\u09AC', 'U\u00A1'], // ট্ব -> U¡
    ['\u099F\u09CD\u09AE', 'U\u00A5'], // ট্ম -> U¥
    ['\u09A1\u09CD\u09A1', 'W&W'], // ড্ড -> W&W
    ['\u09A3\u09CD\u099F', '\u203AU'], // ণ্ট -> ›U
    ['\u09A3\u09CD\u09A0', '\u203AV'], // ণ্ঠ -> ›V
    ['\u09A3\u09CD\u09A1', '\u203AW'], // ণ্ড -> ›W
    ['\u09A3\u09CD\u09A3', 'Y&Y'], // ণ্ণ -> Y&Y
    ['\u09A4\u09CD\u09A4', '\u00CB'], // ত্ত -> Ë
    ['\u09A4\u09CD\u09A5', 'Z&_'], // ত্থ -> Z&_
    ['\u09A4\u09CD\u09A8', 'Z\u0153'], // ত্ন -> Zœ
    ['\u09A4\u09CD\u09AE', 'Z\u00A5'], // ত্ম -> Z¥
    ['\u09A4\u09CD\u09B0', '\u00CE'], // ত্র -> Î
    ['\u09A4\u09CD\u09AC', 'Z\u00A1'], // ত্ব -> Z¡
    ['\u09A5\u09CD\u09AC', '_\u00A1'], // থ্ব -> _¡
    ['\u09A6\u09CD\u09A6', '`&`'], // দ্দ -> `&`
    ['\u09A6\u09CD\u09A7', '\u00D7'], // দ্ধ -> ×
    ['\u09A6\u09CD\u09AC', '\u00D8'], // দ্ব -> Ø
    ['\u09A6\u09CD\u09AE', '`\u00A5'], // দ্ম -> `¥
    ['\u09A6\u09CD\u09B0', '`\u00AA'], // দ্র -> `ª
    ['\u09A7\u09CD\u09A8', 'a\u0153'], // ধ্ন -> aœ
    ['\u09A7\u09CD\u09AE', 'a\u00A5'], // ধ্ম -> a¥
    ['\u09A7\u09CD\u09AC', 'a\u0178'], // ধ্ব -> aŸ
    ['\u09A8\u09CD\u099F', '\u203AU'], // ন্ট -> ›U
    ['\u09A8\u09CD\u09A0', '\u203AV'], // ন্ঠ -> ›V
    ['\u09A8\u09CD\u09A1', '\u203AW'], // ন্ড -> ›W
    ['\u09A8\u09CD\u09A4', '\u0161\u00CD'], // ন্ত -> šÍ
    ['\u09A8\u09CD\u09A5', "\u0161'"], // ন্থ -> š'
    ['\u09A8\u09CD\u09A6', '\u203A`'], // ন্দ -> ›`
    ['\u09A8\u09CD\u09A7', '\u00DC'], // ন্ধ -> Ü
    ['\u09A8\u09CD\u09A8', 'b\u0153'], // ন্ন -> bœ
    ['\u09A8\u09CD\u09AE', 'b\u00A5'], // ন্ম -> b¥
    ['\u09A8\u09CD\u09AC', 'b\u00A1'], // ন্ব -> b¡
    ['\u09AA\u09CD\u099F', 'c&U'], // প্ট -> c&U
    ['\u09AA\u09CD\u09A4', '\u00DF'], // প্ত -> ß
    ['\u09AA\u09CD\u09A8', 'c\u0153'], // প্ন -> cœ
    ['\u09AA\u09CD\u09AA', 'c&c'], // প্প -> c&c
    ['\u09AA\u09CD\u09B0', 'c\u00D6'], // প্র -> cÖ
    ['\u09AA\u09CD\u09B2', 'c\u00AC'], // প্ল -> c¬
    ['\u09AA\u09CD\u09B8', 'c&m'], // প্স -> c&m
    ['\u09AB\u09CD\u09B2', 'd\u00AC'], // ফ্ল -> d¬
    ['\u09AC\u09CD\u09A6', 'e&`'], // ব্দ -> e&`
    ['\u09AC\u09CD\u09A7', '\u00E4'], // ব্ধ -> ä
    ['\u09AC\u09CD\u09AC', 'e&e'], // ব্ব -> e&e
    ['\u09AC\u09CD\u09B0', 'e\u00AA'], // ব্র -> eª
    ['\u09AC\u09CD\u09B2', 'e\u00AC'], // ব্ল -> e¬
    ['\u09AD\u09CD\u09B0', 'f\u00AB'], // ভ্র -> f«
    ['\u09AD\u09CD\u09B2', 'f\u00AC'], // ভ্ল -> f¬
    ['\u09AE\u09CD\u09A8', 'g\u0153'], // ম্ন -> gœ
    ['\u09AE\u09CD\u09AA', '\u00E7c'], // ম্প -> çc
    ['\u09AE\u09CD\u09AB', '\u00E7d'], // ম্ফ -> çd
    ['\u09AE\u09CD\u09AC', '\u00E7^'], // ম্ব -> ç^
    ['\u09AE\u09CD\u09AD', '\u2122\u00A2'], // ম্ভ -> ™¢
    ['\u09AE\u09CD\u09AE', '\u00E7\u00A7'], // ম্ম -> ç§
    ['\u09AE\u09CD\u09B2', 'g\u00AC'], // ম্ল -> g¬
    ['\u09B2\u09CD\u0995', 'j&K'], // ল্ক -> j&K
    ['\u09B2\u09CD\u0997', 'j&M'], // ল্গ -> j&M
    ['\u09B2\u09CD\u099F', 'j&U'], // ল্ট -> j&U
    ['\u09B2\u09CD\u09A1', 'j&W'], // ল্ড -> j&W
    ['\u09B2\u09CD\u09AA', 'j&c'], // ল্প -> j&c
    ['\u09B2\u09CD\u09AB', 'j&d'], // ল্ফ -> j&d
    ['\u09B2\u09CD\u09AC', 'j&e'], // ল্ব -> j&e
    ['\u09B2\u09CD\u09AE', 'j\u00A5'], // ল্ম -> j¥
    ['\u09B2\u09CD\u09B2', 'j&j'], // ল্ল -> j&j
    ['\u09B6\u09CD\u099A', '\u00F0'], // শ্চ -> ð
    ['\u09B6\u09CD\u099B', '\u00F1'], // শ্ছ -> ñ
    ['\u09B6\u09CD\u09A8', 'k\u0153'], // শ্ন -> kœ
    ['\u09B6\u09CD\u09AE', 'k\u00A5'], // শ্ম -> k¥
    ['\u09B6\u09CD\u09B0', 'k\u00D6'], // শ্র -> kÖ
    ['\u09B6\u09CD\u09B2', 'k\u00AC'], // শ্ল -> k¬
    ['\u09B6\u09CD\u09AC', 'k\u00A6'], // শ্ব -> k¦
    ['\u09B7\u09CD\u0995', '\u00AE\u2039'], // ষ্ক -> ®‹
    ['\u09B7\u09CD\u0996', '\u00AEL'], // ষ্খ -> ®L
    ['\u09B7\u09CD\u099F', '\u00F3'], // ষ্ট -> ó
    ['\u09B7\u09CD\u09A0', '\u00F4'], // ষ্ঠ -> ô
    ['\u09B7\u09CD\u09A3', '\u00F2'], // ষ্ণ -> ò
    ['\u09B7\u09CD\u09AA', '\u00AE,'], // ষ্প -> ®,
    ['\u09B7\u09CD\u09AB', '\u00AEd'], // ষ্ফ -> ®d
    ['\u09B7\u09CD\u09AE', '\u00AE\u00A7'], // ষ্ম -> ®§
    ['\u09B8\u09CD\u0995', '\u00AF\u2039'], // স্ক -> ¯‹
    ['\u09B8\u09CD\u0996', '\u00AFL'], // স্খ -> ¯L
    ['\u09B8\u09CD\u09A4', '\u00AF\u00CD'], // স্ত -> ¯Í
    ['\u09B8\u09CD\u09A4\u09C1', '\u00AF\u2018'], // স্তু -> ¯‘
    ['\u09B8\u09CD\u09A5', "\u00AF'"], // স্থ -> ¯'
    ['\u09B8\u09CD\u09A8', 'm\u0153'], // স্ন -> mœ
    ['\u09B8\u09CD\u09AA', '\u00AFc'], // স্প -> ¯c
    ['\u09B8\u09CD\u09AB', '\u00AFd'], // স্ফ -> ¯d
    ['\u09B8\u09CD\u09AC', '\u00AF^'], // স্ব -> ¯^
    ['\u09B8\u09CD\u09AE', '\u00AF\u00A7'], // স্ম -> ¯§
    ['\u09B8\u09CD\u09B0', 'm\u00D6'], // স্র -> mÖ
    ['\u09B8\u09CD\u09B2', 'm\u00AC'], // স্ল -> m¬
    ['\u09B9\u09CD\u09A8', '\u00FD'], // হ্ন -> ý
    ['\u09B9\u09CD\u09A3', '\u00FD'], // হ্ণ -> ý
    ['\u09B9\u09CD\u09AE', '\u00FE'], // হ্ম -> þ
    ['\u09B9\u09CD\u09B2', 'n\u00AC'], // হ্ল -> n¬
    ['\u09B9\u09CD\u09AC', 'n\u0178'], // হ্ব -> nŸ
    ['\u09B9\u09C3', '\u00FC'], // হৃ -> ü
  ];

  // 3. Single Characters, Vowels, Signs & Numbers Mapping
  const basicMap = {
    // Vowels
    '\u0985': 'A', // অ
    '\u0986': 'Av', // আ
    '\u0987': 'B', // ই
    '\u0988': 'C', // ঈ
    '\u0989': 'D', // উ
    '\u098A': 'E', // ঊ
    '\u098B': 'F', // ঋ
    '\u098F': 'G', // এ
    '\u0990': 'H', // ঐ
    '\u0993': 'I', // ও
    '\u0994': 'J', // ঔ

    // Consonants
    '\u0995': 'K', // ক
    '\u0996': 'L', // খ
    '\u0997': 'M', // গ
    '\u0998': 'N', // ঘ
    '\u0999': 'O', // ঙ
    '\u099A': 'P', // চ
    '\u099B': 'Q', // ছ
    '\u099C': 'R', // জ
    '\u099D': 'S', // ঝ
    '\u099E': 'T', // ঞ
    '\u099F': 'U', // ট
    '\u09A0': 'V', // ঠ
    '\u09A1': 'W', // ড
    '\u09A2': 'X', // ঢ
    '\u09A3': 'Y', // ণ
    '\u09A4': 'Z', // ত
    '\u09A5': '_', // থ
    '\u09A6': '`', // দ
    '\u09A7': 'a', // ধ
    '\u09A8': 'b', // ন
    '\u09AA': 'c', // প
    '\u09AB': 'd', // ফ
    '\u09AC': 'e', // ব
    '\u09AD': 'f', // ভ
    '\u09AE': 'g', // ম
    '\u09AF': 'h', // য
    '\u09B0': 'i', // র
    '\u09B2': 'j', // ল
    '\u09B6': 'k', // শ
    '\u09B7': 'l', // ষ
    '\u09B8': 'm', // স
    '\u09B9': 'n', // হ
    '\u09DC': 'o', // ড়
    '\u09DD': 'p', // ঢ়
    '\u09DF': 'q', // য়
    '\u09CE': 'r', // ৎ

    // Vowel Signs (Post-base)
    '\u09BE': 'v', // া
    '\u09C0': 'x', // ী
    '\u09C1': 'y', // ু
    '\u09C2': '~', // ূ
    '\u09C3': '\u2026', // ৃ -> …
    '\u09D7': '\u0160', // ৗ -> Š

    // Modifiers & Punctuation
    '\u0981': '\u00D5', // ঁ -> Õ
    '\u0982': 's', // ং
    '\u0983': 't', // ঃ
    '\u0964': '|', // ।

    // Numbers
    '\u09E6': '0',
    '\u09E7': '1',
    '\u09E8': '2',
    '\u09E9': '3',
    '\u09EA': '4',
    '\u09EB': '5',
    '\u09EC': '6',
    '\u09ED': '7',
    '\u09EE': '8',
    '\u09EF': '9',
  };

  /**
   * Converts Unicode Bengali string to Bijoy (SutonnyMJ ANSI) string
   */
  function unicodeToBijoy(str) {
    if (!str || typeof str !== 'string') return '';

    // 1. Normalize split vowels
    str = str.replace(/\u09CB/g, '\u09C7\u09BE'); // ো -> ে + া
    str = str.replace(/\u09CC/g, '\u09C7\u09D7'); // ৌ -> ে + ৗ

    // 2. Reph (র + ্) followed by a consonant or conjunct cluster
    // In Unicode: \u09B0\u09CD before cluster
    // In Bijoy: cluster + ©
    str = str.replace(/\u09B0\u09CD([\u0995-\u09B9\u09DC-\u09DF](?:\u09CD[\u0995-\u09B9\u09DC-\u09DF])*)/g, '$1\u00A9');

    // 3. Pre-base vowel signs: \u09BF (ি), \u09C7 (ে), \u09C8 (ৈ)
    // In Unicode, these appear AFTER consonant / cluster
    // In Bijoy, they must appear BEFORE consonant / cluster
    str = str.replace(
      /([\u0995-\u09B9\u09DC-\u09DF](?:\u09CD[\u0995-\u09B9\u09DC-\u09DF])*\u00A9?)([\u09BF\u09C7\u09C8])/g,
      function (match, cluster, kar) {
        let bijoyKar = '';
        if (kar === '\u09BF') bijoyKar = 'w';
        else if (kar === '\u09C7') bijoyKar = '\u2020'; // †
        else if (kar === '\u09C8') bijoyKar = '\u2030'; // ‰
        return bijoyKar + cluster;
      }
    );

    // 4. Ra-phala (consonant + ্র)
    str = str.replace(/([\u0995-\u09B9\u09DC-\u09DF])\u09CD\u09B0/g, '$1\u00AB'); // «

    // 5. Ya-phala (consonant + ্য)
    str = str.replace(/([\u0995-\u09B9\u09DC-\u09DF])\u09CD\u09AF/g, '$1\u00A8'); // ¨

    // 6. Replace 3-4 character conjuncts
    for (let i = 0; i < conjuncts3.length; i++) {
      const [u, b] = conjuncts3[i];
      str = str.split(u).join(b);
    }

    // 7. Replace 2-character conjuncts
    for (let i = 0; i < conjuncts2.length; i++) {
      const [u, b] = conjuncts2[i];
      str = str.split(u).join(b);
    }

    // 8. Replace standalone consonants, vowels, vowel signs, numbers, punctuation
    for (const uChar in basicMap) {
      if (Object.prototype.hasOwnProperty.call(basicMap, uChar)) {
        str = str.split(uChar).join(basicMap[uChar]);
      }
    }

    // 9. Generic hasant if any remains
    str = str.replace(/\u09CD/g, '&');

    return str;
  }

  /**
   * Converts Bijoy (SutonnyMJ ANSI) string back to Unicode Bengali string
   */
  function bijoyToUnicode(str) {
    if (!str || typeof str !== 'string') return '';

    // 1. Re-position pre-base vowels (w, †, ‰) which appear BEFORE consonant in Bijoy
    // Pattern: ([w\u2020\u2030]) followed by consonant or conjunct
    str = str.replace(/([w\u2020\u2030])([a-zA-Z\u00A0-\u024F\u2010-\u214F]+)/g, function (match, kar, cluster) {
      let unicodeKar = '';
      if (kar === 'w') unicodeKar = '\u09BF'; // ি
      else if (kar === '\u2020') unicodeKar = '\u09C7'; // ে
      else if (kar === '\u2030') unicodeKar = '\u09C8'; // ৈ
      return cluster + unicodeKar;
    });

    // 2. Re-position Reph (©) which appears AFTER consonant in Bijoy
    str = str.replace(/([a-zA-Z\u00A0-\u024F]+)\u00A9/g, '\u09B0\u09CD$1');

    // 3. Replace conjuncts (Bijoy -> Unicode)
    for (let i = 0; i < conjuncts3.length; i++) {
      const [u, b] = conjuncts3[i];
      str = str.split(b).join(u);
    }

    for (let i = 0; i < conjuncts2.length; i++) {
      const [u, b] = conjuncts2[i];
      str = str.split(b).join(u);
    }

    // 4. Reverse basic map
    for (const uChar in basicMap) {
      if (Object.prototype.hasOwnProperty.call(basicMap, uChar)) {
        const bChar = basicMap[uChar];
        str = str.split(bChar).join(uChar);
      }
    }

    // 5. Restore merged ও and ঔ
    str = str.replace(/\u09C7\u09BE/g, '\u09CB'); // ে + া -> ো
    str = str.replace(/\u09C7\u09D7/g, '\u09CC'); // ে + ৗ -> ৌ

    return str;
  }

  /**
   * Converts HTML text nodes to Bijoy, preserving all HTML tags and structure
   */
  function convertHtmlToBijoy(html) {
    if (!html) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    walkTextNodes(tempDiv, function (node) {
      node.nodeValue = unicodeToBijoy(node.nodeValue);
    });

    return tempDiv.innerHTML;
  }

  /**
   * Converts HTML text nodes to Unicode, preserving all HTML tags and structure
   */
  function convertHtmlToUnicode(html) {
    if (!html) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    walkTextNodes(tempDiv, function (node) {
      node.nodeValue = bijoyToUnicode(node.nodeValue);
    });

    return tempDiv.innerHTML;
  }

  function walkTextNodes(node, callback) {
    if (node.nodeType === 3) {
      // Node.TEXT_NODE
      callback(node);
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        walkTextNodes(node.childNodes[i], callback);
      }
    }
  }

  // Export to window
  window.BanglaConverter = {
    unicodeToBijoy: unicodeToBijoy,
    bijoyToUnicode: bijoyToUnicode,
    convertHtmlToBijoy: convertHtmlToBijoy,
    convertHtmlToUnicode: convertHtmlToUnicode,
  };
})();
