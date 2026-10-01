// The Bubble Box collage (Portland State, 2017) pulled on a four-drum
// risograph, every pattern as drawn, with its people up and about, and
// whatever four inks you care to load. It sits on the Bubble Box page in
// place of the collage (riso.html is its markup and style; build.py
// inlines that as the figure), with 02.webp as the still where there is
// no WebGL 2, and in print.
//
// Separation: every colour in the collage is turned into how much of each
// of four inks it takes (a warm, a light, a cool and a black), the amounts
// that, overprinted on white, come nearest to it. That is fitted once, for
// a lattice of colours, and read between its points for the rest. Other
// drum sets reuse the amounts, so changing drums recolours the whole
// print the way it would on the machine.
//
// The people: the collage was drawn twice over, once with everybody in
// it and once with nobody, so the picture here is the empty one and a
// sheet of 258 cut-outs taken from the other. Every
// frame they are put back on it: walkers pace along the ground's own
// axonometric lines as far as the floor they stand on carries on, the
// dancers in the black box keep one beat, and those sitting or talking
// lean and breathe. Then the press prints that.
//
// Printing, on the GPU: each drum lays its ink through a coarse round-dot
// screen at its own angle, laid out on the drawing itself, so the dots
// grow as you look closer and at arm's length melt into flat colour, as
// real riso dots do. Each drum lands a pixel or so off register and a
// hair turned; ink runs thin in patches and misses in specks; the paper
// has fibre.
//
// Colour: the four drums are yours to load. Because the separation is
// fitted once and reused, swapping an ink recolours the whole print the
// way it would on the machine, and the two skies, printed as drawn,
// follow whichever drum carries their yellow.
//
// The page: the paper follows the site's theme and the slug along the
// foot is set in its face, both watched on <html>. The images are fetched
// only as the print comes near, and the frame loop sleeps off screen.
(function () {
  "use strict";

  // Beside this script, wherever the page is: the home page's desk can
  // open the project as a window and load this script into itself.
  var HERE = document.currentScript ? document.currentScript.src : location.href;
  var GROUND = new URL("riso-ground.webp", HERE).href;     // the collage with its people lifted off
  var SPRITES = new URL("riso-people.webp", HERE).href;   // the people, cut out and packed
  var CROWD = {"sheet":[1024,487],"people":[{"kind":"s","face":-1,"x":631,"y":277,"w":9,"h":15,"fx":3.0,"fy":14,"runs":[],"u":760,"v":458},{"kind":"s","face":1,"x":719,"y":323,"w":10,"h":12,"fx":2.0,"fy":11,"runs":[],"u":824,"v":458},{"kind":"s","face":0,"x":587,"y":374,"w":17,"h":29,"fx":9.5,"fy":28,"runs":[],"u":894,"v":418},{"kind":"s","face":0,"x":979,"y":387,"w":26,"h":55,"fx":24.0,"fy":54,"runs":[],"u":895,"v":294},{"kind":"s","face":1,"x":1159,"y":464,"w":32,"h":57,"fx":14.0,"fy":55,"runs":[],"u":760,"v":294},{"kind":"s","face":0,"x":1268,"y":478,"w":28,"h":76,"fx":12.0,"fy":74,"runs":[],"u":290,"v":212},{"kind":"s","face":-1,"x":1078,"y":487,"w":32,"h":61,"fx":4.5,"fy":60,"runs":[],"u":372,"v":294},{"kind":"s","face":-1,"x":1215,"y":529,"w":29,"h":77,"fx":19.0,"fy":75,"runs":[],"u":194,"v":212},{"kind":"w","face":1,"x":539,"y":566,"w":27,"h":66,"fx":22.5,"fy":65,"runs":[[0.8746,0.4848,0,0],[-0.8387,0.5446,0,0]],"u":832,"v":212},{"kind":"s","face":-1,"x":1188,"y":587,"w":36,"h":62,"fx":6.5,"fy":61,"runs":[],"u":246,"v":294},{"kind":"s","face":1,"x":835,"y":588,"w":20,"h":46,"fx":2.0,"fy":45,"runs":[],"u":371,"v":361},{"kind":"s","face":1,"x":807,"y":590,"w":26,"h":60,"fx":22.0,"fy":59,"runs":[],"u":496,"v":294},{"kind":"d","face":0,"x":847,"y":634,"w":8,"h":18,"fx":4.0,"fy":17,"runs":[],"u":578,"v":458},{"kind":"s","face":-1,"x":1407,"y":635,"w":21,"h":78,"fx":15.5,"fy":77,"runs":[],"u":123,"v":212},{"kind":"s","face":-1,"x":1397,"y":649,"w":18,"h":18,"fx":14.5,"fy":16,"runs":[],"u":588,"v":458},{"kind":"w","face":-1,"x":630,"y":657,"w":20,"h":68,"fx":10.5,"fy":66,"runs":[[0.8746,0.4848,-114,84],[-0.8387,0.5446,-121,82]],"u":718,"v":212},{"kind":"s","face":0,"x":2078,"y":657,"w":10,"h":37,"fx":4.0,"fy":36,"runs":[],"u":65,"v":418},{"kind":"s","face":0,"x":596,"y":667,"w":24,"h":16,"fx":12.0,"fy":14,"runs":[],"u":710,"v":458},{"kind":"s","face":0,"x":2087,"y":672,"w":6,"h":23,"fx":5.0,"fy":21,"runs":[],"u":437,"v":458},{"kind":"d","face":0,"x":1012,"y":721,"w":23,"h":45,"fx":7.5,"fy":44,"runs":[],"u":495,"v":361},{"kind":"d","face":1,"x":993,"y":728,"w":14,"h":46,"fx":4.5,"fy":45,"runs":[],"u":393,"v":361},{"kind":"d","face":-1,"x":1160,"y":733,"w":46,"h":55,"fx":12.0,"fy":54,"runs":[],"u":923,"v":294},{"kind":"w","face":1,"x":2212,"y":737,"w":18,"h":46,"fx":8.0,"fy":45,"runs":[[0.809,0.5878,-8,9],[-0.6947,0.7193,-49,14]],"u":409,"v":361},{"kind":"d","face":0,"x":1124,"y":745,"w":16,"h":57,"fx":7.4,"fy":56,"runs":[],"u":794,"v":294},{"kind":"d","face":0,"x":1214,"y":751,"w":24,"h":60,"fx":17.0,"fy":59,"runs":[],"u":524,"v":294},{"kind":"w","face":-1,"x":2266,"y":752,"w":46,"h":78,"fx":30.0,"fy":76,"runs":[[0.809,0.5878,-36,21],[-0.6947,0.7193,-11,26]],"u":146,"v":212},{"kind":"d","face":0,"x":1092,"y":754,"w":20,"h":60,"fx":12.0,"fy":59,"runs":[],"u":550,"v":294},{"kind":"d","face":0,"x":1028,"y":765,"w":26,"h":51,"fx":21.0,"fy":50,"runs":[],"u":127,"v":361},{"kind":"d","face":0,"x":1028,"y":765,"w":27,"h":51,"fx":21.0,"fy":50,"runs":[],"u":155,"v":361},{"kind":"d","face":-1,"x":1308,"y":772,"w":10,"h":8,"fx":8.5,"fy":7,"runs":[],"u":896,"v":458},{"kind":"d","face":-1,"x":1295,"y":775,"w":22,"h":55,"fx":15.0,"fy":54,"runs":[],"u":971,"v":294},{"kind":"d","face":0,"x":995,"y":778,"w":8,"h":10,"fx":4.5,"fy":9,"runs":[],"u":879,"v":458},{"kind":"w","face":0,"x":2702,"y":782,"w":14,"h":42,"fx":0.5,"fy":41,"runs":[[0.809,0.5878,0,0],[-0.6947,0.7193,0,0]],"u":737,"v":361},{"kind":"d","face":0,"x":1073,"y":799,"w":21,"h":62,"fx":7.5,"fy":61,"runs":[],"u":284,"v":294},{"kind":"d","face":0,"x":1256,"y":803,"w":12,"h":39,"fx":4.0,"fy":38,"runs":[],"u":864,"v":361},{"kind":"d","face":0,"x":1115,"y":810,"w":14,"h":46,"fx":11.0,"fy":45,"runs":[],"u":429,"v":361},{"kind":"w","face":-1,"x":2340,"y":811,"w":20,"h":39,"fx":14.0,"fy":38,"runs":[[0.809,0.5878,-26,0],[-0.6947,0.7193,0,61]],"u":878,"v":361},{"kind":"w","face":-1,"x":2612,"y":811,"w":19,"h":47,"fx":4.5,"fy":45,"runs":[[0.809,0.5878,0,0],[-0.6947,0.7193,0,0]],"u":315,"v":361},{"kind":"w","face":-1,"x":2395,"y":814,"w":14,"h":46,"fx":8.0,"fy":44,"runs":[[0.809,0.5878,-4,1],[-0.6947,0.7193,-3,5]],"u":445,"v":361},{"kind":"w","face":0,"x":2707,"y":830,"w":24,"h":52,"fx":15.5,"fy":50,"runs":[[0.809,0.5878,0,0],[-0.6947,0.7193,0,0]],"u":34,"v":361},{"kind":"d","face":0,"x":1178,"y":832,"w":31,"h":83,"fx":0.5,"fy":82,"runs":[],"u":544,"v":119},{"kind":"d","face":-1,"x":1282,"y":837,"w":18,"h":20,"fx":8.0,"fy":19,"runs":[],"u":512,"v":458},{"kind":"d","face":0,"x":1156,"y":838,"w":16,"h":57,"fx":9.0,"fy":56,"runs":[],"u":812,"v":294},{"kind":"s","face":0,"x":2535,"y":842,"w":13,"h":39,"fx":7.0,"fy":37,"runs":[],"u":900,"v":361},{"kind":"d","face":0,"x":1132,"y":845,"w":14,"h":60,"fx":6.0,"fy":59,"runs":[],"u":572,"v":294},{"kind":"d","face":0,"x":1318,"y":848,"w":32,"h":59,"fx":13.0,"fy":58,"runs":[],"u":588,"v":294},{"kind":"d","face":-1,"x":1256,"y":853,"w":14,"h":6,"fx":4.8,"fy":5,"runs":[],"u":952,"v":458},{"kind":"d","face":-1,"x":1104,"y":854,"w":22,"h":38,"fx":5.5,"fy":37,"runs":[],"u":989,"v":361},{"kind":"d","face":-1,"x":1278,"y":872,"w":12,"h":21,"fx":3.5,"fy":20,"runs":[],"u":472,"v":458},{"kind":"s","face":1,"x":1007,"y":873,"w":41,"h":61,"fx":19.5,"fy":60,"runs":[],"u":406,"v":294},{"kind":"d","face":0,"x":1251,"y":875,"w":12,"h":65,"fx":5.5,"fy":64,"runs":[],"u":946,"v":212},{"kind":"d","face":1,"x":1178,"y":876,"w":37,"h":63,"fx":32.0,"fy":62,"runs":[],"u":64,"v":294},{"kind":"w","face":1,"x":2334,"y":883,"w":16,"h":36,"fx":7.0,"fy":34,"runs":[[0.809,0.5878,-36,150],[-0.6947,0.7193,-19,20]],"u":167,"v":418},{"kind":"s","face":0,"x":1007,"y":887,"w":25,"h":48,"fx":20.0,"fy":46,"runs":[],"u":288,"v":361},{"kind":"d","face":0,"x":1151,"y":895,"w":28,"h":65,"fx":7.0,"fy":64,"runs":[],"u":960,"v":212},{"kind":"d","face":1,"x":1098,"y":904,"w":8,"h":6,"fx":0.0,"fy":5,"runs":[],"u":968,"v":458},{"kind":"d","face":-1,"x":1108,"y":906,"w":50,"h":69,"fx":18.5,"fy":67,"runs":[],"u":666,"v":212},{"kind":"d","face":0,"x":1140,"y":906,"w":23,"h":43,"fx":14.0,"fy":42,"runs":[],"u":692,"v":361},{"kind":"s","face":1,"x":767,"y":907,"w":33,"h":79,"fx":10.5,"fy":78,"runs":[],"u":38,"v":212},{"kind":"w","face":-1,"x":2348,"y":913,"w":14,"h":16,"fx":9.0,"fy":15,"runs":[[0.809,0.5878,-56,135],[-0.6947,0.7193,-14,22]],"u":736,"v":458},{"kind":"w","face":0,"x":2574,"y":913,"w":18,"h":43,"fx":10.0,"fy":42,"runs":[[0.809,0.5878,0,0],[-0.6947,0.7193,0,0]],"u":717,"v":361},{"kind":"s","face":0,"x":2515,"y":915,"w":26,"h":41,"fx":11.0,"fy":40,"runs":[],"u":792,"v":361},{"kind":"w","face":1,"x":2404,"y":921,"w":33,"h":49,"fx":6.0,"fy":47,"runs":[[0.8746,0.4848,-1,39],[-0.8387,0.5446,0,8]],"u":221,"v":361},{"kind":"w","face":1,"x":2298,"y":925,"w":32,"h":46,"fx":27.0,"fy":45,"runs":[[0.8746,0.4848,-54,2],[-0.8387,0.5446,0,50]],"u":461,"v":361},{"kind":"s","face":1,"x":2541,"y":925,"w":22,"h":44,"fx":17.0,"fy":43,"runs":[],"u":541,"v":361},{"kind":"d","face":-1,"x":1386,"y":932,"w":20,"h":58,"fx":15.5,"fy":57,"runs":[],"u":622,"v":294},{"kind":"d","face":-1,"x":1214,"y":933,"w":24,"h":61,"fx":14.5,"fy":60,"runs":[],"u":449,"v":294},{"kind":"d","face":1,"x":1158,"y":943,"w":34,"h":58,"fx":13.0,"fy":57,"runs":[],"u":644,"v":294},{"kind":"d","face":0,"x":1169,"y":945,"w":23,"h":57,"fx":3.5,"fy":52,"runs":[],"u":830,"v":294},{"kind":"w","face":1,"x":908,"y":971,"w":26,"h":65,"fx":11.0,"fy":63,"runs":[[0.8746,0.4848,-40,160],[-0.8387,0.5446,-68,79]],"u":990,"v":212},{"kind":"s","face":0,"x":934,"y":991,"w":8,"h":7,"fx":1.0,"fy":5,"runs":[],"u":919,"v":458},{"kind":"w","face":0,"x":2677,"y":1000,"w":17,"h":44,"fx":2.0,"fy":42,"runs":[[0.8746,0.4848,-29,21],[-0.8387,0.5446,-110,46]],"u":565,"v":361},{"kind":"d","face":-1,"x":1361,"y":1006,"w":11,"h":29,"fx":6.5,"fy":28,"runs":[],"u":913,"v":418},{"kind":"s","face":0,"x":1357,"y":1037,"w":15,"h":25,"fx":6.5,"fy":24,"runs":[],"u":322,"v":458},{"kind":"s","face":0,"x":2226,"y":1048,"w":15,"h":39,"fx":9.5,"fy":38,"runs":[],"u":915,"v":361},{"kind":"s","face":0,"x":2213,"y":1056,"w":14,"h":37,"fx":6.5,"fy":36,"runs":[],"u":77,"v":418},{"kind":"w","face":-1,"x":2263,"y":1061,"w":13,"h":34,"fx":10.0,"fy":33,"runs":[[0.8746,0.4848,-160,33],[-0.8387,0.5446,-16,160]],"u":438,"v":418},{"kind":"w","face":0,"x":1014,"y":1071,"w":32,"h":65,"fx":18.0,"fy":63,"runs":[[0.8746,0.4848,-160,42],[-0.8387,0.5446,-114,44]],"u":1,"v":294},{"kind":"s","face":1,"x":598,"y":1091,"w":62,"h":38,"fx":21.8,"fy":37,"runs":[],"u":1,"v":418},{"kind":"s","face":-1,"x":1064,"y":1118,"w":16,"h":17,"fx":5.6,"fy":15,"runs":[],"u":692,"v":458},{"kind":"s","face":1,"x":578,"y":1121,"w":22,"h":18,"fx":11.0,"fy":16,"runs":[],"u":608,"v":458},{"kind":"w","face":-1,"x":700,"y":1165,"w":45,"h":80,"fx":7.5,"fy":79,"runs":[[0.8746,0.4848,-21,30],[-0.8387,0.5446,-37,19]],"u":916,"v":119},{"kind":"w","face":0,"x":1796,"y":1192,"w":24,"h":67,"fx":12.0,"fy":65,"runs":[[0.8746,0.4848,-29,22],[-0.8387,0.5446,-20,30]],"u":740,"v":212},{"kind":"s","face":-1,"x":2488,"y":1199,"w":12,"h":27,"fx":8.0,"fy":26,"runs":[],"u":53,"v":458},{"kind":"w","face":-1,"x":1542,"y":1210,"w":33,"h":62,"fx":11.2,"fy":61,"runs":[[0.8746,0.4848,0,0],[-0.8387,0.5446,0,0]],"u":307,"v":294},{"kind":"w","face":1,"x":1267,"y":1216,"w":22,"h":62,"fx":20.5,"fy":60,"runs":[[0.8746,0.4848,-160,49],[-0.8387,0.5446,-160,34]],"u":342,"v":294},{"kind":"s","face":1,"x":1288,"y":1216,"w":45,"h":63,"fx":16.5,"fy":62,"runs":[],"u":103,"v":294},{"kind":"s","face":1,"x":1680,"y":1218,"w":40,"h":58,"fx":11.0,"fy":57,"runs":[],"u":680,"v":294},{"kind":"s","face":0,"x":226,"y":1273,"w":52,"h":81,"fx":9.0,"fy":79,"runs":[],"u":815,"v":119},{"kind":"s","face":1,"x":2964,"y":1308,"w":11,"h":33,"fx":2.5,"fy":32,"runs":[],"u":531,"v":418},{"kind":"w","face":-1,"x":350,"y":1335,"w":50,"h":87,"fx":8.0,"fy":86,"runs":[[0.8746,0.4848,-6,2],[-0.8387,0.5446,-2,5]],"u":259,"v":119},{"kind":"w","face":0,"x":1596,"y":1359,"w":27,"h":64,"fx":15.5,"fy":63,"runs":[[0.8746,0.4848,0,0],[-0.8387,0.5446,0,0]],"u":35,"v":294},{"kind":"s","face":0,"x":485,"y":1401,"w":32,"h":100,"fx":7.5,"fy":99,"runs":[],"u":269,"v":1},{"kind":"s","face":-1,"x":322,"y":1452,"w":64,"h":67,"fx":19.0,"fy":66,"runs":[],"u":766,"v":212},{"kind":"s","face":0,"x":386,"y":1477,"w":10,"h":37,"fx":5.0,"fy":36,"runs":[],"u":93,"v":418},{"kind":"s","face":0,"x":696,"y":1496,"w":29,"h":83,"fx":4.0,"fy":81,"runs":[],"u":577,"v":119},{"kind":"w","face":-1,"x":461,"y":1509,"w":45,"h":81,"fx":22.2,"fy":79,"runs":[[0.8746,0.4848,0,16],[-0.8387,0.5446,-16,1]],"u":869,"v":119},{"kind":"s","face":0,"x":1884,"y":1542,"w":31,"h":77,"fx":9.5,"fy":76,"runs":[],"u":225,"v":212},{"kind":"s","face":-1,"x":2105,"y":1572,"w":9,"h":28,"fx":5.0,"fy":27,"runs":[],"u":985,"v":418},{"kind":"s","face":0,"x":2585,"y":1583,"w":9,"h":25,"fx":5.0,"fy":24,"runs":[],"u":339,"v":458},{"kind":"s","face":-1,"x":2254,"y":1596,"w":19,"h":45,"fx":17.5,"fy":43,"runs":[],"u":520,"v":361},{"kind":"s","face":0,"x":828,"y":1610,"w":48,"h":79,"fx":30.0,"fy":78,"runs":[],"u":73,"v":212},{"kind":"w","face":-1,"x":693,"y":1648,"w":32,"h":85,"fx":16.5,"fy":84,"runs":[[0.8746,0.4848,-18,17],[-0.8387,0.5446,-17,50]],"u":386,"v":119},{"kind":"s","face":1,"x":1474,"y":1662,"w":40,"h":91,"fx":3.0,"fy":90,"runs":[],"u":1,"v":119},{"kind":"w","face":1,"x":2973,"y":1668,"w":13,"h":32,"fx":3.0,"fy":31,"runs":[[0.8746,0.4848,-15,18],[-0.8387,0.5446,-44,122]],"u":607,"v":418},{"kind":"w","face":-1,"x":890,"y":1674,"w":56,"h":80,"fx":15.5,"fy":79,"runs":[[0.8746,0.4848,-108,137],[-0.8387,0.5446,-32,107]],"u":963,"v":119},{"kind":"s","face":1,"x":2727,"y":1705,"w":10,"h":33,"fx":2.0,"fy":31,"runs":[],"u":544,"v":418},{"kind":"s","face":-1,"x":2461,"y":1711,"w":10,"h":33,"fx":8.0,"fy":32,"runs":[],"u":556,"v":418},{"kind":"s","face":0,"x":2716,"y":1718,"w":11,"h":26,"fx":6.0,"fy":25,"runs":[],"u":166,"v":458},{"kind":"w","face":0,"x":2880,"y":1720,"w":7,"h":31,"fx":0.5,"fy":29,"runs":[[0.8746,0.4848,-3,28],[-0.8387,0.5446,-33,4]],"u":752,"v":418},{"kind":"s","face":-1,"x":811,"y":1722,"w":51,"h":90,"fx":23.0,"fy":88,"runs":[],"u":105,"v":119},{"kind":"s","face":0,"x":2538,"y":1726,"w":14,"h":32,"fx":4.0,"fy":31,"runs":[],"u":622,"v":418},{"kind":"w","face":-1,"x":871,"y":1735,"w":35,"h":80,"fx":13.0,"fy":78,"runs":[[0.8746,0.4848,-90,106],[-0.8387,0.5446,-86,38]],"u":1,"v":212},{"kind":"w","face":1,"x":1135,"y":1737,"w":49,"h":93,"fx":16.0,"fy":92,"runs":[[0.8746,0.4848,0,0],[-0.8387,0.5446,0,0]],"u":798,"v":1},{"kind":"s","face":0,"x":2530,"y":1740,"w":10,"h":27,"fx":3.0,"fy":25,"runs":[],"u":67,"v":458},{"kind":"s","face":-1,"x":962,"y":1743,"w":64,"h":93,"fx":45.0,"fy":90,"runs":[],"u":849,"v":1},{"kind":"s","face":0,"x":2456,"y":1764,"w":9,"h":28,"fx":3.0,"fy":27,"runs":[],"u":996,"v":418},{"kind":"s","face":1,"x":1374,"y":1796,"w":30,"h":49,"fx":10.0,"fy":48,"runs":[],"u":256,"v":361},{"kind":"s","face":0,"x":1181,"y":1814,"w":4,"h":62,"fx":1.0,"fy":61,"runs":[],"u":366,"v":294},{"kind":"s","face":1,"x":1460,"y":1828,"w":55,"h":98,"fx":21.0,"fy":96,"runs":[],"u":392,"v":1},{"kind":"s","face":1,"x":1974,"y":1834,"w":32,"h":75,"fx":2.5,"fy":74,"runs":[],"u":445,"v":212},{"kind":"s","face":1,"x":1378,"y":1844,"w":10,"h":7,"fx":4.0,"fy":6,"runs":[],"u":929,"v":458},{"kind":"s","face":1,"x":1390,"y":1844,"w":9,"h":7,"fx":3.0,"fy":6,"runs":[],"u":941,"v":458},{"kind":"w","face":1,"x":960,"y":1862,"w":44,"h":85,"fx":26.0,"fy":83,"runs":[[0.8746,0.4848,-21,70],[-0.8387,0.5446,-73,54]],"u":420,"v":119},{"kind":"w","face":-1,"x":1256,"y":1866,"w":35,"h":92,"fx":19.0,"fy":91,"runs":[[0.8746,0.4848,0,0],[-0.8387,0.5446,0,0]],"u":980,"v":1},{"kind":"w","face":0,"x":2304,"y":1872,"w":12,"h":22,"fx":8.0,"fy":21,"runs":[[0.8746,0.4848,-41,160],[-0.8387,0.5446,-86,26]],"u":458,"v":458},{"kind":"w","face":0,"x":2651,"y":1876,"w":13,"h":25,"fx":8.0,"fy":24,"runs":[[0.8746,0.4848,-105,17],[-0.8387,0.5446,-36,160]],"u":350,"v":458},{"kind":"w","face":0,"x":2542,"y":1887,"w":14,"h":27,"fx":5.5,"fy":26,"runs":[[0.8746,0.4848,-50,72],[-0.8387,0.5446,-131,138]],"u":79,"v":458},{"kind":"w","face":0,"x":2650,"y":1896,"w":10,"h":11,"fx":1.5,"fy":9,"runs":[[0.8746,0.4848,-110,17],[-0.8387,0.5446,-48,160]],"u":856,"v":458},{"kind":"s","face":0,"x":1089,"y":1917,"w":29,"h":75,"fx":18.0,"fy":73,"runs":[],"u":479,"v":212},{"kind":"w","face":1,"x":1120,"y":1956,"w":37,"h":94,"fx":4.5,"fy":92,"runs":[[0.8746,0.4848,-16,34],[-0.8387,0.5446,-12,17]],"u":659,"v":1},{"kind":"s","face":1,"x":2490,"y":1976,"w":13,"h":29,"fx":3.0,"fy":28,"runs":[],"u":926,"v":418},{"kind":"s","face":-1,"x":2850,"y":1987,"w":36,"h":114,"fx":11.3,"fy":113,"runs":[],"u":39,"v":1},{"kind":"s","face":-1,"x":1412,"y":1993,"w":41,"h":83,"fx":5.5,"fy":82,"runs":[],"u":608,"v":119},{"kind":"w","face":-1,"x":1159,"y":2000,"w":35,"h":94,"fx":12.5,"fy":92,"runs":[[0.8746,0.4848,0,0],[-0.8387,0.5446,0,0]],"u":698,"v":1},{"kind":"s","face":1,"x":1387,"y":2001,"w":30,"h":77,"fx":13.5,"fy":76,"runs":[],"u":258,"v":212},{"kind":"s","face":1,"x":219,"y":2002,"w":71,"h":83,"fx":30.0,"fy":81,"runs":[],"u":651,"v":119},{"kind":"s","face":1,"x":1590,"y":2007,"w":26,"h":102,"fx":11.5,"fy":100,"runs":[],"u":241,"v":1},{"kind":"s","face":1,"x":1981,"y":2024,"w":35,"h":76,"fx":12.0,"fy":75,"runs":[],"u":320,"v":212},{"kind":"s","face":-1,"x":2706,"y":2044,"w":83,"h":66,"fx":49.5,"fy":65,"runs":[],"u":861,"v":212},{"kind":"s","face":0,"x":2662,"y":2047,"w":31,"h":55,"fx":20.0,"fy":54,"runs":[],"u":1,"v":361},{"kind":"s","face":1,"x":1502,"y":2051,"w":28,"h":75,"fx":20.5,"fy":74,"runs":[],"u":510,"v":212},{"kind":"s","face":-1,"x":1198,"y":2053,"w":78,"h":44,"fx":73.5,"fy":42,"runs":[],"u":584,"v":361},{"kind":"s","face":0,"x":1357,"y":2056,"w":36,"h":116,"fx":12.0,"fy":115,"runs":[],"u":1,"v":1},{"kind":"w","face":1,"x":1430,"y":2065,"w":44,"h":99,"fx":19.5,"fy":97,"runs":[[0.8746,0.4848,-80,34],[-0.8387,0.5446,-87,89]],"u":346,"v":1},{"kind":"s","face":-1,"x":2886,"y":2072,"w":38,"h":56,"fx":27.5,"fy":55,"runs":[],"u":855,"v":294},{"kind":"w","face":1,"x":1323,"y":2074,"w":33,"h":88,"fx":17.5,"fy":86,"runs":[[0.8746,0.4848,0,52],[-0.8387,0.5446,0,43]],"u":158,"v":119},{"kind":"s","face":0,"x":1236,"y":2085,"w":8,"h":13,"fx":3.5,"fy":8,"runs":[],"u":785,"v":458},{"kind":"w","face":-1,"x":1739,"y":2087,"w":55,"h":96,"fx":47.5,"fy":95,"runs":[[0.8746,0.4848,0,0],[-0.8387,0.5446,0,0]],"u":552,"v":1},{"kind":"w","face":-1,"x":1273,"y":2094,"w":31,"h":75,"fx":10.0,"fy":73,"runs":[[0.8746,0.4848,-71,52],[-0.8387,0.5446,-19,6]],"u":540,"v":212},{"kind":"w","face":-1,"x":1607,"y":2128,"w":36,"h":91,"fx":22.1,"fy":89,"runs":[[0.8746,0.4848,-44,39],[-0.8387,0.5446,-22,45]],"u":43,"v":119},{"kind":"w","face":-1,"x":1991,"y":2156,"w":29,"h":94,"fx":16.0,"fy":93,"runs":[[0.8746,0.4848,-12,5],[-0.8387,0.5446,-5,17]],"u":735,"v":1},{"kind":"w","face":1,"x":1442,"y":2169,"w":41,"h":100,"fx":12.0,"fy":98,"runs":[[0.8746,0.4848,-29,121],[-0.8387,0.5446,-113,49]],"u":303,"v":1},{"kind":"w","face":-1,"x":1645,"y":2199,"w":27,"h":86,"fx":5.0,"fy":85,"runs":[[0.8746,0.4848,-78,2],[-0.8387,0.5446,-2,33]],"u":311,"v":119},{"kind":"s","face":-1,"x":2640,"y":2206,"w":25,"h":76,"fx":19.0,"fy":75,"runs":[],"u":357,"v":212},{"kind":"s","face":1,"x":1723,"y":2216,"w":62,"h":105,"fx":25.0,"fy":103,"runs":[],"u":177,"v":1},{"kind":"w","face":0,"x":1858,"y":2219,"w":54,"h":97,"fx":21.5,"fy":95,"runs":[[0.8746,0.4848,0,21],[-0.8387,0.5446,-2,0]],"u":449,"v":1},{"kind":"w","face":1,"x":1987,"y":2305,"w":32,"h":84,"fx":21.4,"fy":82,"runs":[[0.8746,0.4848,-14,9],[-0.8387,0.5446,-6,14]],"u":466,"v":119},{"kind":"w","face":-1,"x":2212,"y":2360,"w":45,"h":97,"fx":24.5,"fy":96,"runs":[[0.8746,0.4848,0,0],[-0.8387,0.5446,0,0]],"u":505,"v":1},{"kind":"s","face":-1,"x":1851,"y":2378,"w":42,"h":84,"fx":11.0,"fy":83,"runs":[],"u":500,"v":119},{"kind":"s","face":-1,"x":344,"y":2392,"w":56,"h":110,"fx":15.5,"fy":108,"runs":[],"u":77,"v":1},{"kind":"s","face":0,"x":2921,"y":2398,"w":5,"h":13,"fx":0.5,"fy":11,"runs":[],"u":795,"v":458},{"kind":"w","face":1,"x":1994,"y":2406,"w":23,"h":83,"fx":12.0,"fy":82,"runs":[[0.8746,0.4848,-20,8],[-0.8387,0.5446,-7,30]],"u":724,"v":119},{"kind":"s","face":0,"x":313,"y":2414,"w":35,"h":88,"fx":8.5,"fy":87,"runs":[],"u":193,"v":119},{"kind":"s","face":0,"x":2962,"y":2422,"w":14,"h":29,"fx":0.5,"fy":27,"runs":[],"u":941,"v":418},{"kind":"s","face":1,"x":1539,"y":2434,"w":36,"h":32,"fx":18.0,"fy":31,"runs":[],"u":638,"v":418},{"kind":"w","face":0,"x":2091,"y":2448,"w":27,"h":88,"fx":7.0,"fy":87,"runs":[[0.8746,0.4848,0,0],[-0.8387,0.5446,0,0]],"u":230,"v":119},{"kind":"s","face":0,"x":1463,"y":2465,"w":26,"h":44,"fx":13.0,"fy":43,"runs":[],"u":664,"v":361},{"kind":"w","face":1,"x":2310,"y":2556,"w":40,"h":108,"fx":22.0,"fy":107,"runs":[[0.8746,0.4848,0,0],[-0.8387,0.5446,0,0]],"u":135,"v":1},{"kind":"s","face":-1,"x":2463,"y":2565,"w":30,"h":94,"fx":8.0,"fy":93,"runs":[],"u":766,"v":1},{"kind":"s","face":0,"x":2440,"y":2566,"w":22,"h":91,"fx":11.0,"fy":90,"runs":[],"u":81,"v":119},{"kind":"s","face":1,"x":1488,"y":2585,"w":33,"h":47,"fx":22.0,"fy":45,"runs":[],"u":336,"v":361},{"kind":"s","face":1,"x":2881,"y":2590,"w":94,"h":63,"fx":15.5,"fy":62,"runs":[],"u":150,"v":294},{"kind":"s","face":-1,"x":2966,"y":2636,"w":10,"h":13,"fx":4.5,"fy":12,"runs":[],"u":802,"v":458},{"kind":"s","face":0,"x":2951,"y":2643,"w":17,"h":26,"fx":7.0,"fy":24,"runs":[],"u":179,"v":458},{"kind":"s","face":0,"x":2966,"y":2649,"w":6,"h":16,"fx":2.0,"fy":14,"runs":[],"u":752,"v":458},{"kind":"s","face":-1,"x":2793,"y":2653,"w":18,"h":12,"fx":11.5,"fy":11,"runs":[],"u":836,"v":458},{"kind":"s","face":1,"x":2929,"y":2653,"w":17,"h":25,"fx":3.5,"fy":24,"runs":[],"u":365,"v":458},{"kind":"s","face":0,"x":2920,"y":2654,"w":12,"h":15,"fx":4.0,"fy":14,"runs":[],"u":771,"v":458},{"kind":"s","face":1,"x":2902,"y":2661,"w":18,"h":18,"fx":9.0,"fy":17,"runs":[],"u":632,"v":458},{"kind":"s","face":0,"x":2916,"y":2668,"w":16,"h":18,"fx":2.5,"fy":16,"runs":[],"u":652,"v":458},{"kind":"s","face":-1,"x":2856,"y":2670,"w":29,"h":41,"fx":23.5,"fy":40,"runs":[],"u":820,"v":361},{"kind":"s","face":-1,"x":2896,"y":2678,"w":21,"h":19,"fx":6.5,"fy":18,"runs":[],"u":555,"v":458},{"kind":"s","face":1,"x":2940,"y":2685,"w":21,"h":20,"fx":4.0,"fy":18,"runs":[],"u":532,"v":458},{"kind":"s","face":-1,"x":2795,"y":2689,"w":91,"h":72,"fx":83.5,"fy":71,"runs":[],"u":573,"v":212},{"kind":"s","face":-1,"x":2895,"y":2693,"w":20,"h":27,"fx":8.0,"fy":26,"runs":[],"u":95,"v":458},{"kind":"s","face":0,"x":2911,"y":2698,"w":19,"h":28,"fx":3.5,"fy":26,"runs":[],"u":1,"v":458},{"kind":"s","face":-1,"x":2915,"y":2700,"w":37,"h":33,"fx":6.6,"fy":31,"runs":[],"u":568,"v":418},{"kind":"s","face":-1,"x":2897,"y":2718,"w":27,"h":39,"fx":21.2,"fy":37,"runs":[],"u":932,"v":361},{"kind":"s","face":-1,"x":2956,"y":2725,"w":48,"h":96,"fx":24.8,"fy":94,"runs":[],"u":609,"v":1},{"kind":"w","face":0,"x":1509,"y":2743,"w":11,"h":23,"fx":2.0,"fy":22,"runs":[[1.0,0.0,-24,43],[0.0,1.0,-36,32]],"u":445,"v":458},{"kind":"w","face":0,"x":1524,"y":2743,"w":10,"h":28,"fx":3.0,"fy":26,"runs":[[1.0,0.0,-40,27],[0.0,1.0,-38,28]],"u":22,"v":458},{"kind":"w","face":0,"x":1496,"y":2765,"w":13,"h":31,"fx":1.5,"fy":29,"runs":[[1.0,0.0,-160,57],[0.0,1.0,-70,76]],"u":761,"v":418},{"kind":"s","face":1,"x":2705,"y":2779,"w":64,"h":82,"fx":17.5,"fy":80,"runs":[],"u":749,"v":119},{"kind":"w","face":0,"x":1348,"y":2801,"w":10,"h":26,"fx":6.5,"fy":25,"runs":[[1.0,0.0,-137,98],[0.0,1.0,-100,160]],"u":198,"v":458},{"kind":"w","face":0,"x":1434,"y":2811,"w":12,"h":32,"fx":2.0,"fy":31,"runs":[[1.0,0.0,-160,20],[0.0,1.0,-114,160]],"u":676,"v":418},{"kind":"w","face":0,"x":1409,"y":2816,"w":12,"h":36,"fx":3.5,"fy":35,"runs":[[1.0,0.0,-160,52],[0.0,1.0,-120,160]],"u":185,"v":418},{"kind":"s","face":0,"x":677,"y":2870,"w":59,"h":76,"fx":30.5,"fy":75,"runs":[],"u":384,"v":212},{"kind":"s","face":0,"x":1154,"y":2874,"w":13,"h":32,"fx":4.0,"fy":31,"runs":[],"u":690,"v":418},{"kind":"w","face":0,"x":1001,"y":2878,"w":15,"h":32,"fx":2.0,"fy":31,"runs":[[1.0,0.0,0,0],[0.0,1.0,0,0]],"u":705,"v":418},{"kind":"w","face":1,"x":1077,"y":2884,"w":10,"h":21,"fx":6.0,"fy":20,"runs":[[1.0,0.0,0,0],[0.0,1.0,0,0]],"u":486,"v":458},{"kind":"s","face":1,"x":2834,"y":2891,"w":63,"h":93,"fx":18.0,"fy":91,"runs":[],"u":915,"v":1},{"kind":"s","face":1,"x":1183,"y":2904,"w":22,"h":35,"fx":1.0,"fy":33,"runs":[],"u":318,"v":418},{"kind":"s","face":0,"x":1162,"y":2907,"w":18,"h":34,"fx":11.0,"fy":33,"runs":[],"u":453,"v":418},{"kind":"s","face":-1,"x":1986,"y":2920,"w":35,"h":50,"fx":3.0,"fy":48,"runs":[],"u":184,"v":361},{"kind":"w","face":1,"x":1173,"y":3011,"w":13,"h":32,"fx":5.0,"fy":30,"runs":[[1.0,0.0,-160,55],[0.0,1.0,-25,160]],"u":722,"v":418},{"kind":"w","face":-1,"x":1296,"y":3016,"w":14,"h":25,"fx":4.5,"fy":24,"runs":[[1.0,0.0,-14,160],[0.0,1.0,-3,160]],"u":384,"v":458},{"kind":"s","face":1,"x":2155,"y":3017,"w":17,"h":28,"fx":9.0,"fy":27,"runs":[],"u":34,"v":458},{"kind":"w","face":1,"x":1264,"y":3021,"w":15,"h":34,"fx":6.8,"fy":32,"runs":[[1.0,0.0,-37,86],[0.0,1.0,-7,160]],"u":473,"v":418},{"kind":"s","face":1,"x":2112,"y":3021,"w":30,"h":30,"fx":19.0,"fy":29,"runs":[],"u":814,"v":418},{"kind":"s","face":0,"x":1514,"y":3031,"w":12,"h":27,"fx":5.7,"fy":26,"runs":[],"u":117,"v":458},{"kind":"s","face":1,"x":1862,"y":3032,"w":18,"h":35,"fx":12.0,"fy":34,"runs":[],"u":342,"v":418},{"kind":"w","face":0,"x":1300,"y":3040,"w":5,"h":9,"fx":2.0,"fy":8,"runs":[[1.0,0.0,-70,55],[0.0,1.0,-20,160]],"u":889,"v":458},{"kind":"s","face":0,"x":1810,"y":3045,"w":22,"h":31,"fx":11.0,"fy":30,"runs":[],"u":776,"v":418},{"kind":"w","face":0,"x":1210,"y":3064,"w":12,"h":31,"fx":6.5,"fy":30,"runs":[[1.0,0.0,-53,138],[0.0,1.0,-67,160]],"u":800,"v":418},{"kind":"s","face":-1,"x":2328,"y":3106,"w":13,"h":39,"fx":4.5,"fy":37,"runs":[],"u":961,"v":361},{"kind":"s","face":1,"x":2282,"y":3120,"w":27,"h":26,"fx":16.5,"fy":25,"runs":[],"u":210,"v":458},{"kind":"s","face":0,"x":1654,"y":3121,"w":32,"h":26,"fx":20.0,"fy":25,"runs":[],"u":239,"v":458},{"kind":"s","face":0,"x":2267,"y":3126,"w":12,"h":21,"fx":4.0,"fy":20,"runs":[],"u":498,"v":458},{"kind":"s","face":-1,"x":2338,"y":3133,"w":23,"h":24,"fx":20.0,"fy":23,"runs":[],"u":400,"v":458},{"kind":"s","face":-1,"x":1990,"y":3134,"w":22,"h":37,"fx":4.0,"fy":36,"runs":[],"u":105,"v":418},{"kind":"s","face":-1,"x":1759,"y":3135,"w":26,"h":29,"fx":10.5,"fy":27,"runs":[],"u":957,"v":418},{"kind":"w","face":0,"x":1209,"y":3137,"w":11,"h":30,"fx":6.5,"fy":29,"runs":[[1.0,0.0,-52,160],[0.0,1.0,-141,129]],"u":846,"v":418},{"kind":"w","face":-1,"x":1527,"y":3156,"w":16,"h":35,"fx":8.5,"fy":34,"runs":[[1.0,0.0,-18,31],[0.0,1.0,-34,109]],"u":362,"v":418},{"kind":"s","face":0,"x":1853,"y":3190,"w":10,"h":36,"fx":3.0,"fy":35,"runs":[],"u":199,"v":418},{"kind":"s","face":1,"x":1867,"y":3191,"w":17,"h":30,"fx":14.5,"fy":29,"runs":[],"u":859,"v":418},{"kind":"w","face":0,"x":1555,"y":3195,"w":11,"h":40,"fx":4.5,"fy":38,"runs":[[1.0,0.0,-42,5],[0.0,1.0,-54,66]],"u":851,"v":361},{"kind":"w","face":1,"x":1192,"y":3198,"w":11,"h":39,"fx":5.0,"fy":38,"runs":[[1.0,0.0,-30,39],[0.0,1.0,-160,59]],"u":976,"v":361},{"kind":"w","face":0,"x":1412,"y":3201,"w":14,"h":26,"fx":8.0,"fy":25,"runs":[[1.0,0.0,-160,49],[0.0,1.0,-160,16]],"u":273,"v":458},{"kind":"w","face":0,"x":1524,"y":3230,"w":15,"h":27,"fx":12.5,"fy":25,"runs":[[1.0,0.0,-14,30],[0.0,1.0,-105,44]],"u":131,"v":458},{"kind":"s","face":1,"x":1738,"y":3231,"w":44,"h":86,"fx":32.0,"fy":85,"runs":[],"u":340,"v":119},{"kind":"s","face":0,"x":2257,"y":3237,"w":16,"h":27,"fx":5.2,"fy":26,"runs":[],"u":148,"v":458},{"kind":"s","face":0,"x":2209,"y":3252,"w":19,"h":61,"fx":11.5,"fy":60,"runs":[],"u":475,"v":294},{"kind":"s","face":0,"x":2276,"y":3257,"w":23,"h":35,"fx":14.2,"fy":33,"runs":[],"u":380,"v":418},{"kind":"w","face":0,"x":1883,"y":3259,"w":36,"h":58,"fx":18.5,"fy":56,"runs":[[0.8746,0.4848,0,0],[-0.8387,0.5446,0,0]],"u":722,"v":294},{"kind":"w","face":0,"x":1545,"y":3261,"w":13,"h":34,"fx":3.5,"fy":32,"runs":[[1.0,0.0,-37,34],[0.0,1.0,-119,9]],"u":490,"v":418},{"kind":"s","face":0,"x":1720,"y":3263,"w":15,"h":52,"fx":12.5,"fy":51,"runs":[],"u":60,"v":361},{"kind":"w","face":0,"x":1229,"y":3264,"w":19,"h":36,"fx":15.0,"fy":34,"runs":[[1.0,0.0,-72,137],[0.0,1.0,-160,10]],"u":211,"v":418},{"kind":"s","face":0,"x":642,"y":3266,"w":9,"h":11,"fx":5.4,"fy":9,"runs":[],"u":868,"v":458},{"kind":"w","face":1,"x":1865,"y":3272,"w":13,"h":36,"fx":7.0,"fy":35,"runs":[[0.8746,0.4848,0,0],[-0.8387,0.5446,0,0]],"u":232,"v":418},{"kind":"w","face":0,"x":1612,"y":3273,"w":13,"h":32,"fx":6.5,"fy":30,"runs":[[1.0,0.0,0,0],[0.0,1.0,0,0]],"u":737,"v":418},{"kind":"s","face":0,"x":1819,"y":3275,"w":13,"h":36,"fx":6.0,"fy":35,"runs":[],"u":247,"v":418},{"kind":"w","face":0,"x":1846,"y":3275,"w":13,"h":36,"fx":1.0,"fy":35,"runs":[[0.8746,0.4848,0,0],[-0.8387,0.5446,0,0]],"u":262,"v":418},{"kind":"w","face":0,"x":2322,"y":3276,"w":22,"h":37,"fx":5.0,"fy":36,"runs":[[0.8746,0.4848,-17,21],[-0.8387,0.5446,0,19]],"u":129,"v":418},{"kind":"s","face":1,"x":1783,"y":3277,"w":23,"h":36,"fx":11.3,"fy":34,"runs":[],"u":277,"v":418},{"kind":"w","face":0,"x":1959,"y":3277,"w":14,"h":36,"fx":7.5,"fy":35,"runs":[[0.8746,0.4848,0,0],[-0.8387,0.5446,0,0]],"u":302,"v":418},{"kind":"w","face":1,"x":2234,"y":3278,"w":14,"h":30,"fx":7.0,"fy":29,"runs":[[0.8746,0.4848,-37,19],[-0.8387,0.5446,-32,17]],"u":878,"v":418},{"kind":"s","face":0,"x":1672,"y":3279,"w":12,"h":37,"fx":2.0,"fy":36,"runs":[],"u":153,"v":418},{"kind":"s","face":-1,"x":633,"y":3281,"w":48,"h":52,"fx":23.5,"fy":50,"runs":[],"u":77,"v":361},{"kind":"s","face":0,"x":1494,"y":3282,"w":10,"h":24,"fx":1.5,"fy":22,"runs":[],"u":425,"v":458},{"kind":"s","face":0,"x":598,"y":3291,"w":37,"h":42,"fx":18.6,"fy":40,"runs":[],"u":753,"v":361},{"kind":"s","face":0,"x":1928,"y":3298,"w":7,"h":18,"fx":3.0,"fy":17,"runs":[],"u":670,"v":458},{"kind":"s","face":0,"x":1829,"y":3299,"w":11,"h":18,"fx":2.0,"fy":17,"runs":[],"u":679,"v":458},{"kind":"s","face":0,"x":1934,"y":3303,"w":8,"h":13,"fx":3.5,"fy":12,"runs":[],"u":814,"v":458},{"kind":"w","face":1,"x":1909,"y":3305,"w":9,"h":8,"fx":5.5,"fy":6,"runs":[[0.8746,0.4848,-31,13],[-0.8387,0.5446,-11,11]],"u":908,"v":458},{"kind":"s","face":-1,"x":603,"y":3341,"w":24,"h":34,"fx":19.0,"fy":33,"runs":[],"u":505,"v":418},{"kind":"s","face":0,"x":639,"y":3341,"w":31,"h":35,"fx":15.5,"fy":33,"runs":[],"u":405,"v":418},{"kind":"s","face":0,"x":561,"y":3343,"w":31,"h":26,"fx":22.5,"fy":24,"runs":[],"u":289,"v":458}]};         // who is where, and what they do
  var ART_W = 3112, ART_H = 3514;

  var root = document.documentElement;
  var poster = document.getElementById("riso-sheet");
  var wrap = document.getElementById("riso-wrap");
  var canvas = document.getElementById("riso-print");
  var gl = canvas.getContext("webgl2", {
    alpha: false, antialias: false, depth: false, stencil: false
  });
  var ASPECT = 0.8695;   // the collage and the margins round it (riso.html's aspect-ratio too)
  // Without WebGL 2 the figure shows the still and no controls.
  function bare() { wrap.parentNode.classList.add("bare"); }
  if (!gl) { bare(); return; }

  var DEG = Math.PI / 180;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var touch = window.matchMedia("(hover: none) and (pointer: coarse)");

  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function hex(s) {
    var n = parseInt(s.slice(1), 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }

  // --- Ink ------------------------------------------------------------------
  // Four drums: warm, light, cool and black, each with its screen angle in
  // degrees. They start loaded with the set the collage is fitted to (pick):
  // its pinks, pale cyans, lilacs, mints, creams and black line all come
  // out of those four.
  // Every Riso ink, by hue, with the greys and black last. A slider per
  // drum runs through them, so each stop is an ink you could really load.
  var INKS = [["Red", "#FF665E"], ["Crimson", "#E45D50"], ["Pumpkin", "#FF6F4C"], ["Brown", "#925F52"], ["Orange", "#FF6C2F"], ["Paprika", "#EE7F4B"], ["Copper", "#BD6439"], ["Apricot", "#F6A04D"], ["Bright Gold", "#BA8032"], ["Melon", "#FFAE3B"], ["Metallic Gold", "#AC936E"], ["Flat Gold", "#BB8B41"], ["Sunflower", "#FFB511"], ["Bright Olive Green", "#B49F29"], ["Citron", "#FAF3B7"], ["Yellow", "#FFE800"], ["Fluorescent Yellow", "#F7FF00"], ["Light Lime", "#E3ED55"], ["Moss", "#68724D"], ["Kelly Green", "#67B346"], ["Fluorescent Green", "#44D62C"], ["Grass", "#397E58"], ["Emerald", "#19975D"], ["Green", "#00A95C"], ["Ivy", "#169B62"], ["Hunter Green", "#407060"], ["Sea Foam", "#62C2B1"], ["Lagoon", "#2F6F65"], ["Turquoise", "#00AA93"], ["Pine", "#237E74"], ["Mint", "#82D8D5"], ["Light Teal", "#009DA5"], ["Teal", "#00838A"], ["Smoky Teal", "#5F8289"], ["Aqua", "#5EC8E5"], ["Sea Blue", "#0074A2"], ["Blue", "#0078BF"], ["Steel", "#375E77"], ["Cornflower", "#62A8E5"], ["Midnight", "#435060"], ["Sky Blue", "#4982CF"], ["Lake", "#235BA8"], ["Federal Blue", "#3D5588"], ["Medium Blue", "#3255A4"], ["Indigo", "#484D7A"], ["Purple", "#765BA7"], ["Violet", "#9D7AD2"], ["Plum", "#845991"], ["Orchid", "#BB76CF"], ["Bubblegum", "#F984CA"], ["Fluorescent Pink", "#FF48B0"], ["Burgundy", "#914E72"], ["Dark Mauve", "#BD8CA6"], ["Maroon", "#9E4C6E"], ["Light Mauve", "#E6B5C9"], ["Raspberry Red", "#B44B65"], ["Fluorescent Red", "#FF4C65"], ["Cranberry", "#BA0C24"], ["Tomato", "#D2515E"], ["Bright Red", "#F15060"], ["Bisque", "#F2CDCF"], ["Scarlet", "#F65058"], ["Brick", "#A75154"], ["Coral", "#FF8E91"], ["Fluorescent Orange", "#FF7477"], ["Mahogany", "#8E595A"], ["White", "#FFFFFF"], ["Mist", "#B8C7C4"], ["Granite", "#A5AAA8"], ["Gray", "#928D88"], ["Light Gray", "#88898A"], ["Charcoal", "#70747C"], ["Grape", "#6C5D80"], ["Raisin", "#775D7A"], ["Slate", "#5E695E"], ["Forest", "#516E5A"], ["Spruce", "#4A635D"], ["Black", "#141414"]];
  var ANGLES = [75, 5, 15, 45];          // each drum keeps its screen angle
  var ROLES = ["warm", "light", "cool", "key"];
  var START = [50, 15, 34, 77];         // Fluorescent Pink, Yellow, Aqua, Black: what Reset loads
  var pick = START.slice();
  var on = [1, 1, 1, 1];               // a drum switched off never goes through
  function inkSet() {
    return pick.map(function (i, k) { return [INKS[i][0], INKS[i][1], ANGLES[k]]; });
  }
  var PRINTED = [1, 0, 2, 3];   // the order through the machine: light, warm, cool, black
  // The sheet takes its paper colour from riso.html, one for each of the
  // site's themes, so the print is pulled on whatever stock the page is
  // showing. A dark sheet puts opaque ink in the drums, which is what you
  // would really load to print on one.
  var PAPER = "#f2f2f0", opaque = 0;
  function readPaper() {
    var v = "";
    try { v = getComputedStyle(poster).getPropertyValue("--paper").trim(); } catch (e) {}
    PAPER = /^#[0-9a-f]{6}$/i.test(v) ? v : "#f2f2f0";
    var c = hex(PAPER);
    opaque = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] < 0.42 ? 1 : 0;
  }

  // The lattice: 17 steps a side, laid out as a strip of 17 slices (green)
  // of 17 by 17 (red across, blue up), four inks to a texel. Each point
  // holds the amounts of the first set's four inks that, overprinted on
  // white, come nearest its colour: a search over every mix of seven steps
  // of each, then a finer one round the best, done when the page was made.
  var N = 17, LUT = "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/wD/AP8A/wD/AP8A/wDfAP8AygD/ALUA/wCVAP8AgAD/AGoA/wBVAP8ANQD/ACAA/wALAP8A/xX/AP8L/wD/AP8A/wD/AP8A/wD/AP8A9AD/AN8A/wDKAP8AtQD/AJUA/wCAAP8AagD/AEoA/wA1AP8AIAD/AAAA9AD/Ff8A/wD/AP8A/wD/AP8A/wD/AP8A/wD0AP8A3wD/AMoA/wCqAP8AlQD/AIAA/wBgAP8ASgD/ADUA/wAVAP8AAADVAP8g6gD/C+oA/wDqAP8A6gD/AOoA/wDqAPQA9ADfAPQAvwD0AKoA/wCVAP8AdQD/AGAA/wBKAP8AKwD/ABUA/wAAAKoA/yu/AP8V1QD/ANUA/wDVAP8A1QD/ANUA9ADVAN8A3wC/AN8AqgDqAJUA6gB1AOoAYAD0AEoA9AArAPQAFQD0AAAAgAD/NZUA/yC1AP8LvwD/AL8A/wC/AP8AvwD0AL8A3wDKAMoAygCqAMoAlQDVAHUA1QBgAN8ASgDfACsA3wAVAOoAAABqAP81dQD/K5UA/xWfAP8AnwD/AJ8A/wCfAP8AqgDfAKoAygC1AKoAtQCVAL8AdQC/AGAAygBKAMoAKwDKABUA1QAAAAsA/1VKAP81agD/IIAA/wuKAP8AigD/AIoA/wCVAN8AlQDKAJ8AqgCfAJUAqgB1AKoAYAC1AEoAtQArALUAFQC/AAAAAAD/ShUA/0A1AP8ragD/C3UA/wB1AP8AdQD0AHUA3wCAAMoAigCqAIoAlQCVAIAAlQBgAJ8ASgCfADUAqgAVAKoAAAAVAP81FQD/NSAA/ysrAP8gSgD/C1UA/wBVAP8AYADfAGoAygBqALUAdQCVAIAAgACAAGAAigBKAIoANQCVABUAlQAAAAAA/zUAAP81AAD/KwAA/ysVAP8gQAD/AEAA/wBKAN8AVQDKAFUAtQBgAJUAYACAAGoAYAB1AEoAdQA1AIAAFQCAAAAAAAD/KwAA/ysAAP8gAAD/IBUA/xUVAP8LKwD/ADUA3wA1AMoAQAC1AEoAlQBKAIAAVQBgAGAASgBgADUAagAVAGoAAAAAAP8gAAD/IAAA/xUAAP8VAAD/CwAA/wsAAPQLFQDfACAAygArAKoANQCVADUAgABAAGAAQABAC0oANQBVABUAVQsAAAAA/xUAAP8VAAD/CwAA/wsAAP8AAAD/AAAL9AAAC98AAAC/CwsLtQAVC5UAIAuAAAsAQCArC0oAFQAAIEALFQBACwAAAAD/CwAA/wsAAP8AAAD/AAAA/wAAAP8AAADqAAAL1QAAC78AAAuqAAAVlQAAFYAAAAtAFQAAFSAAAAAgIBUVACsVAAAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAOoAAAvKAAALtQAAC58AAAuKAAAVdQAAFWAAABVKAAAVIAsLFRUAFRUAAAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD0AAAA3wAAC78AAAuqAAALlQAAC4AAABVqAAAVVQAAFUAAABUrAAAgFQAAIAAA/wD/Ff8A/wv/AP8A/wD/AP8A/wD/AP8A/wD/AP8A3wD/AMoA/wC1AP8AlQD/AIAA/wBqAP8ASgD/ADUA/wAgAP8AAAD/AP8L/wD/AP8A/wD/AP8A/wD/AP8A/wD/APQA/wDfAP8AygD/AKoA/wCVAP8AgAD/AGAA/wBKAP8ANQD/ABUA/wAAAP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A9AD/AN8A/wC/AP8AqgD/AJUA/wB1AP8AYAD/AEoA/wArAP8AFQD/AAAA3wD/C+oA/wDqAP8A6gD/AOoA/wDqAP8A6gD0AOoA3wD0AL8A9ACqAPQAlQD/AHUA/wBgAP8AQAD/ACsA/wAVAP8AAAC/AP8VygD/AMoA/wDKAP8AygD/AMoA/wDKAPQA1QDfANUAvwDfAKoA3wCVAN8AdQDqAGAA6gBKAOoAKwD0ABUA9AAAAJUA/yCqAP8LtQD/ALUA/wC1AP8AtQD/ALUA9AC/AN8AvwDKAMoAqgDKAJUAygB1ANUAYADVAEoA1QArAN8AFQDfAAAAagD/K5UA/wufAP8AnwD/AJ8A/wCfAP8AnwD0AJ8A3wCqAMoAqgCqALUAlQC1AHUAvwBgAL8ASgDKACsAygAVAMoAAABAAP81YAD/IHUA/wuAAP8AgAD/AIAA/wCAAP8AigDfAJUAygCVAKoAnwCVAJ8AgACqAGAAqgBKALUAKwC1ABUAtQAAACAA/zU1AP8rQAD/IGoA/wBqAP8AagD/AGoA/wB1AN8AdQDKAIAAqgCKAJUAigCAAJUAYACVAEoAnwArAJ8AFQCfAAAAAAD/NQAA/zUVAP8rQAD/C1UA/wBVAP8AVQD0AGAA3wBgAMoAagCqAGoAlQB1AIAAgABgAIAASgCKACsAigAVAJUAAAAAAP8rAAD/KwsA/yAVAP8VNQD/ADUA/wA1AP8AQADfAEoAygBVAKoAVQCVAGAAgABqAGAAagBKAHUAKwB1ABUAgAAAAAAA/yAAAP8gAAD/IBUA/wsVAP8LIAD/ACAA/wArAN8ANQDKADUAtQBAAJUASgCAAFUAYABVAEoAYAArAGAAFQBqAAAAAAD/FQAA/xUAAP8LAAD/CwAA/wsLAP8ACwD/ABUA3wAVAMoAIAC1ACsAlQA1AIAAQABgAEAASgBKACsASgAVAFUAAAAAAP8LAAD/CwAA/wAAAP8AAAD/AAAA/wAAAPQAAADfAAAAygALALUAFQCVACAAgAArAGAAKwBKADUANQBAABUAQAAAAAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA6gAAANUAAAC/AAAAqgAAAJUACwCAAAsAagAVAEoAFQAgCysAFQArAAAAAAD/AAAA/wAAAP8AAAD/AAAA/wAAAPQAAADfAAAAygAAALUAAACfAAAAigAAAHUAAABgAAALSgAAACALCwsVABULAAAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA6gAAANUAAAC/AAAAqgAAAJUAAACAAAAAagAAAFUAAAtAAAALKwAACxUAAAsAAP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A9AD/AN8A/wDKAP8AqgD/AJUA/wCAAP8AYAD/AEoA/wA1AP8AFQD/AAAA/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD0AP8A3wD/AL8A/wCqAP8AlQD/AHUA/wBgAP8ASgD/ACsA/wAVAP8AAAD0AP8A9AD/APQA/wD0AP8A9AD/APQA/wD0APQA/wDVAP8AvwD/AKoA/wCKAP8AdQD/AGAA/wBKAP8AKwD/ABUA/wAAAN8A/wDfAP8A3wD/AN8A/wDfAP8A3wD/AN8A9ADfAN8A6gC/AOoAqgD0AIoA9AB1APQAYAD/AEAA/wArAP8AFQD/AAAAygD/AMoA/wDKAP8AygD/AMoA/wDKAP8AygD0AMoA3wDVAL8A1QCqANUAlQDfAHUA3wBgAOoAQADqACsA6gAVAOoAAACfAP8LqgD/AKoA/wCqAP8AqgD/AKoA/wCqAPQAtQDfALUAygC/AKoAvwCVAMoAdQDKAGAA1QBAANUAKwDVABUA3wAAAGoA/yCVAP8AlQD/AJUA/wCVAP8AlQD/AJUA9ACfAN8AnwDKAKoAqgCqAJUAtQB1ALUAYAC/AEAAvwArAL8AFQDKAAAAVQD/IGoA/wuAAP8AgAD/AIAA/wCAAP8AgAD0AIAA3wCKAMoAlQCqAJUAlQCfAHUAnwBgAKoASgCqACsAqgAVALUAAAArAP8rQAD/FWAA/wBgAP8AYAD/AGAA/wBgAP8AagDfAHUAygB1AKoAgACVAIoAdQCKAGAAlQBKAJUAKwCfABUAnwAAAAAA/zUVAP8gQAD/C0oA/wBKAP8ASgD/AEoA/wBVAN8AVQDKAGAAqgBqAJUAagCAAHUAYACAAEoAgAArAIoAFQCKAAAAAAD/KwAA/yAVAP8VNQD/ADUA/wA1AP8ANQD/AEAA3wBAAMoASgCqAFUAlQBVAIAAYABgAGoASgBqADUAdQAVAHUAAAAAAP8gAAD/FRUA/wsVAP8AFQD/ABUA/wAVAP8AIADfACsAygA1AKoAQACVAEAAgABKAGAAVQBKAFUANQBgABUAYAAAAAAA/xUAAP8LAAD/CwAA/wAAAP8AAAD/AAAA/wALAN8AFQDKACAAqgAgAJUAKwCAADUAYABAAEoAQAA1AEoAFQBKAAAAAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD0AAAA3wAAAMoACwCqAAsAlQAVAIAAIABgACsASgArADUANQAVAEAAAAAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAOoAAADVAAAAvwAAAKoAAACVAAAAgAALAGAAFQBKABUANQAgABUAKwAAAAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD0AAAA3wAAAMoAAAC1AAAAnwAAAIoAAAB1AAAAYAAAAEoAAAA1AAsAFQAVAAAAAAD/AAAA/wAAAP8AAAD/AAAA/wAAAOoAAADVAAAAvwAAAKoAAACVAAAAgAAAAGoAAABVAAAAQAAAACsAAAAVAAAAAAA=";
  function lattice() {
    var bin = atob(LUT), out = new Uint8Array(bin.length);
    for (var k = 0; k < bin.length; k++) out[k] = bin.charCodeAt(k);
    return out;
  }

  // --- GL ---------------------------------------------------------------------

  var SCREEN_VS = [
    "#version 300 es",
    "void main() {",
    "  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));",
    "  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);",
    "}"
  ].join("\n");

  // The press. uView turns a pixel on the canvas into a point on the sheet
  // (cx, cy, zoom); uArtRect is where the collage sits on the sheet. Each
  // drum reads the collage where its own shift and turn put it, takes its
  // share of ink from the lattice, and prints it through its screen. The margins (registration marks in every
  // drum, the slug in black, a swatch of each ink alone) come from a small
  // canvas: red, green, and blue a quarter of the way up for each drum.
  var PRESS_FS = [
    "#version 300 es",
    "precision highp float;",
    "uniform sampler2D uArt, uLut, uMarks;",
    "uniform vec3 uInk[4];",
    "uniform vec3 uPaper;",
    "uniform float uOpaque;",
    "uniform float uOn[4];",
    "uniform vec2 uOff[4];",
    "uniform float uRot[4];",
    "uniform float uAng[4];",
    "uniform float uFeed[4];",
    "uniform vec2 uArtSize;",
    "uniform vec4 uArtRect;",
    "uniform vec3 uView;",
    "uniform vec2 uCanvas;",
    "uniform float uPitch;",
    "uniform float uScale;",
    "uniform float uSeed;",
    "out vec4 outColor;",
    "float hash(vec2 p) {",
    "  p = fract(p * vec2(123.34, 456.21) + uSeed * 0.013);",
    "  p += dot(p, p + 45.32);",
    "  return fract(p.x * p.y);",
    "}",
    "float noise(vec2 p) {",
    "  vec2 i = floor(p), f = fract(p);",
    "  f = f * f * (3.0 - 2.0 * f);",
    "  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),",
    "             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);",
    "}",
    "vec2 sheetAt(vec2 p) { return (p - uCanvas * 0.5) / uView.z + uView.xy; }",
    "vec2 artAt(vec2 q) {",
    "  return vec2((q.x - uArtRect.x) / uArtRect.z * uArtSize.x, (uArtRect.y + uArtRect.w - q.y) / uArtRect.w * uArtSize.y);",
    "}",
    "vec4 lut(vec3 c) {",
    "  c = clamp(c, 0.0, 1.0) * 16.0;",
    "  float g0 = floor(min(c.g, 15.999)), fg = c.g - g0;",
    "  vec2 uv0 = vec2((c.r + 0.5 + 17.0 * g0) / 289.0, (c.b + 0.5) / 17.0);",
    "  vec2 uv1 = vec2((c.r + 0.5 + 17.0 * (g0 + 1.0)) / 289.0, (c.b + 0.5) / 17.0);",
    "  return mix(texture(uLut, uv0), texture(uLut, uv1), fg);",
    "}",
    "vec4 inkAt(vec2 a) {",
    "  if (a.x < 0.0 || a.y < 0.0 || a.x > uArtSize.x || a.y > uArtSize.y) return vec4(0.0);",
    "  vec3 c = texture(uArt, a / uArtSize).rgb;",
    "  return clamp(lut(c / max(uPaper, vec3(0.9))), 0.0, 1.0);",
    "}",
    "float screen(vec2 a, float d, float ang, float rough) {",
    "  if (d < 0.003) return 0.0;",
    "  float cs = cos(ang), sn = sin(ang);",
    "  vec2 f = fract(vec2(cs * a.x - sn * a.y, sn * a.x + cs * a.y) / uPitch) - 0.5;",
    "  float r = d < 0.785 ? sqrt(d / 3.14159) : mix(0.5, 0.74, (d - 0.785) / 0.215);",
    "  float dist = length(f) + (rough - 0.5) * 0.18;",
    "  float aa = 0.75 / (uPitch * uScale);",
    "  float dotted = 1.0 - smoothstep(r - aa, r + aa, dist);",
    "  return mix(d, dotted, smoothstep(2.4, 4.2, uPitch * uScale));",
    "}",
    "float mark(vec2 q, int k) {",
    "  vec2 uv = q / uCanvas;",
    "  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return 0.0;",
    "  vec4 m = texture(uMarks, uv);",
    "  float swatch = m.b > 0.1 && abs(m.b - float(k + 1) / 4.0) < 0.1 ? 1.0 : 0.0;",
    "  return max(max(m.r, swatch), k == 3 ? m.g : 0.0);",
    "}",
    "float feed(vec2 a, float prog, float wave) {",
    "  float y = a.y / uArtSize.y;",
    "  return step(y, prog * 1.12 - 0.06 + (wave - 0.5) * 0.04);",
    "}",
    "void main() {",
    "  vec2 p = gl_FragCoord.xy;",
    "  vec2 q = sheetAt(p);",
    "  vec2 a = artAt(q);",
    "  float grainSize = max(0.7, 1.2 / uScale);",
    "  float fibre = 0.6 * noise(a / grainSize) + 0.4 * noise(a / (7.0 * grainSize) + 17.0);",
    "  float rough = noise(a / (uPitch * 0.8) + 5.0);",
    "  float slow = 0.6 * noise(a / 120.0 + 9.0) + 0.4 * noise(a / 480.0 + 3.0);",
    "  vec2 mid = uArtSize * 0.5;",
    "  vec3 col = uPaper * (1.0 - 0.05 * fibre);",
    "  for (int k = 0; k < 4; k++) {",
    "    float cs = cos(uRot[k]), sn = sin(uRot[k]);",
    "    vec2 d = a - mid;",
    "    vec2 ak = mid + vec2(cs * d.x - sn * d.y, sn * d.x + cs * d.y) + uOff[k];",
    "    float amount = inkAt(ak)[k];",
    "    float c = screen(ak, amount, uAng[k], rough);",
    "    vec2 qk = q - uOff[k] * uArtRect.z / uArtSize.x;",
    "    c = max(c, mark(qk, k));",
    "    float thin = 0.86 + 0.14 * noise(a / 140.0 + float(k) * 7.3);",
    "    float miss = noise(a / (0.9 * grainSize) + float(k) * 31.7);",
    "    c *= thin * (1.0 - smoothstep(0.972, 0.985, miss)) * feed(a, uFeed[k], slow);",
    "    c *= uOn[k];",
    "    vec3 taken = col * (1.0 - c * (1.0 - uInk[k]));",
    "    col = mix(taken, mix(col, uInk[k], c), uOpaque);",
    "  }",
    "  outColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  // The collage, put back together each frame: the emptied ground, and
  // every person on it. Both are drawn into a picture the collage's size,
  // row for row as the collage's own (top row first), which the press then
  // reads in place of the collage.
  var GROUND_FS = [
    "#version 300 es",
    "precision highp float;",
    "uniform sampler2D uGround;",
    "uniform vec2 uArtSize;",
    "out vec4 outColor;",
    "void main() { outColor = texture(uGround, gl_FragCoord.xy / uArtSize); }"
  ].join("\n");

  var CROWD_VS = [
    "#version 300 es",
    "in vec4 aPlace;",           // x, y on the collage; u, v on the sheet of people
    "uniform vec2 uArtSize, uSheet;",
    "out vec2 vUv;",
    "void main() {",
    "  vUv = aPlace.zw / uSheet;",
    "  gl_Position = vec4(aPlace.xy / uArtSize * 2.0 - 1.0, 0.0, 1.0);",
    "}"
  ].join("\n");

  var CROWD_FS = [
    "#version 300 es",
    "precision highp float;",
    "uniform sampler2D uSprites;",
    "in vec2 vUv;",
    "out vec4 outColor;",
    "void main() {",
    "  vec4 c = texture(uSprites, vUv);",
    "  outColor = vec4(c.rgb * c.a, c.a);",
    "}"
  ].join("\n");

  function compile(vs, fs) {
    var prog = gl.createProgram();
    [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].forEach(function (pair) {
      var sh = gl.createShader(pair[0]);
      gl.shaderSource(sh, pair[1]);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      gl.attachShader(prog, sh);
    });
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    var u = {}, n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (var k = 0; k < n; k++) {
      var name = gl.getActiveUniform(prog, k).name;
      u[name] = gl.getUniformLocation(prog, name);
      u[name.replace(/\[0\]$/, "")] = u[name];
    }
    return { prog: prog, u: u };
  }

  function texture(filter) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  var press, fillProg, crowdProg, blank, crowdVao, crowdBuf, collage, tex = {};
  var ready = { ground: false, sprites: false };
  function loaded() { return ready.ground && ready.sprites; }

  function loadImage(src, into, filter, done) {
    var img = new Image();
    img.onload = function () {
      tex[into] = texture(filter);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.BROWSER_DEFAULT_WEBGL);
      done();
    };
    img.src = src;
  }

  // --- The people -----------------------------------------------------------------
  // Each person: where their cut-out sat (x, y, w, h), their feet within it
  // (fx, fy), which way they were drawn facing (face: 1 right, -1 left, 0
  // can't tell), and for walkers, how far the ground they stand on runs
  // each way along the drawing's two ground directions (runs: the
  // direction, then the reach back and forward in the collage's pixels).
  // Kinds: w walks, d dances, s sits or stands talking.

  var BEAT = 2.05;   // the black box's tempo, beats a second
  var crowd = CROWD.people.map(function (p, i) {
    var q = { p: p, t: 0, dir: 1, flip: false, bob: 0, lean: 0, stride: 0, legs: 0, still: 0,
              phase: Math.random() * 2 * Math.PI, rate: 0.7 + Math.random() * 0.6 };
    if (p.kind === "w") {
      var best = null;
      p.runs.forEach(function (r) { if (!best || r[3] - r[2] > best[3] - best[2]) best = r; });
      if (best && best[3] - best[2] >= 20) {
        q.axis = [best[0], best[1]];
        q.lo = best[2];
        q.hi = best[3];
      }
      q.speed = (0.26 + Math.random() * 0.14) * p.h;   // about a third of their height a second
      q.wait = Math.random() * 3;
      q.goal = 0;
    } else if (p.kind === "d") {
      // Two or three groups, a little apart in time, so the floor moves
      // together without moving as one.
      q.phase = [0, 0.18, 0.5][i % 3] + Math.random() * 0.08;
      q.turnEvery = 4 + Math.floor(Math.random() * 9);
      q.lastTurn = 0;
    }
    return q;
  });

  function nextGoal(q) {
    var span = q.hi - q.lo;
    for (var k = 0; k < 6; k++) {
      var g = q.lo + Math.random() * span;
      if (Math.abs(g - q.t) >= Math.min(24, span * 0.6)) return g;
    }
    return q.t - q.lo > q.hi - q.t ? q.lo : q.hi;
  }

  // Facing: a walker faces the way they go, across the page. A figure drawn
  // facing right is flipped to walk left, and the other way about; one
  // whose facing can't be told is flipped each time they turn back.
  function face(q, dir) {
    var across = q.axis[0] * dir;
    if (Math.abs(across) < 0.3) return;
    var want = across > 0 ? 1 : -1;
    if (q.p.face) q.flip = want !== q.p.face;
    else {
      if (q.first == null) q.first = want;
      q.flip = want !== q.first;
    }
  }

  function move(dt, time) {
    crowd.forEach(function (q) {
      var p = q.p, h = p.h;
      if (p.kind === "w") {
        var walking = false;
        if (q.axis) {
          if (q.wait > 0) q.wait -= dt;
          else {
            var gap = q.goal - q.t, step = q.speed * dt;
            if (Math.abs(gap) <= step) {
              q.t = q.goal;
              q.wait = Math.random() < 0.3 ? 2 + Math.random() * 4 : 0.3 + Math.random() * 1.4;
              q.goal = nextGoal(q);
            } else {
              q.dir = gap > 0 ? 1 : -1;
              q.t += q.dir * step;
              face(q, q.dir);
              walking = true;
            }
          }
        }
        // A step every quarter of their height or so: up on each step, and
        // the legs swing.
        var go = walking ? 1 : 0;
        q.still += ((1 - go) - q.still) * Math.min(1, dt * 6);
        if (walking) q.stride += q.speed * dt / (0.21 * h) * Math.PI;
        else q.stride += dt * 1.1 * q.rate;   // weight shifting from foot to foot
        var s = Math.sin(q.stride);
        q.bob = -(1 - q.still) * Math.min(2.2, 0.032 * h) * Math.abs(s);
        q.legs = (1 - q.still) * 0.045 * h * s + q.still * 0.012 * h * Math.sin(q.stride * 0.5);
        q.lean = (1 - q.still) * 1.2 * s * Math.PI / 180;
        if (!q.axis && Math.random() < dt / 9) q.flip = !q.flip;   // looking about
      } else if (p.kind === "d") {
        var beat = time * BEAT + q.phase;
        var hop = Math.pow(Math.abs(Math.sin(Math.PI * beat)), 1.5);
        q.bob = -Math.min(6, 0.075 * h) * hop;
        q.lean = 7 * Math.sin(Math.PI * beat * 0.5 + q.phase * 3) * Math.PI / 180;
        q.legs = 0.03 * h * Math.sin(Math.PI * beat);
        var n = Math.floor(beat / q.turnEvery);
        if (n !== q.lastTurn) { q.lastTurn = n; if (Math.random() < 0.6) q.flip = !q.flip; }
      } else {
        q.bob = -0.7 * Math.abs(Math.sin(time * 1.6 * q.rate + q.phase));
        q.lean = 2.4 * Math.sin(time * 0.8 * q.rate + q.phase) * Math.PI / 180;
        q.legs = 0;
      }
    });
  }

  // Every person as two strips, body over legs, split a little above the
  // middle; the legs' foot end swings for a step. Each strip is turned
  // about the feet and, when flipped, mirrored across them.
  var SPLIT = 0.56, placed = new Float32Array(CROWD.people.length * 12 * 4);
  function place(rest) {
    var order = crowd.slice().sort(function (a, b) {
      return (a.p.y + a.p.fy + (a.axis ? a.axis[1] * a.t : 0)) - (b.p.y + b.p.fy + (b.axis ? b.axis[1] * b.t : 0));
    });
    var o = 0;
    order.forEach(function (q) {
      var p = q.p;
      var ax = rest ? 0 : q.axis ? q.axis[0] * q.t : 0, ay = rest ? 0 : q.axis ? q.axis[1] * q.t : 0;
      var fx = p.x + p.fx + ax, fy = p.y + p.fy + ay + (rest ? 0 : q.bob);
      var c = rest ? 1 : Math.cos(q.lean), s = rest ? 0 : Math.sin(q.lean), m = !rest && q.flip ? -1 : 1;
      var split = Math.round(p.h * SPLIT);
      function corner(cx, cy, swing) {
        var lx = (cx - p.fx) * m + swing, ly = cy - p.fy;
        placed[o++] = fx + lx * c - ly * s;
        placed[o++] = fy + lx * s + ly * c;
        placed[o++] = p.u + cx;
        placed[o++] = p.v + cy;
      }
      var sw = rest ? 0 : q.legs;
      [[0, split, 0, 0], [split, p.h, 0, sw]].forEach(function (strip) {
        var y0 = strip[0], y1 = strip[1], s0 = strip[2], s1 = strip[3];
        corner(0, y0, s0); corner(p.w, y0, s0); corner(p.w, y1, s1);
        corner(0, y0, s0); corner(p.w, y1, s1); corner(0, y1, s1);
      });
    });
  }

  function compose(rest) {
    place(rest);
    gl.bindFramebuffer(gl.FRAMEBUFFER, collage.fb);
    gl.viewport(0, 0, ART_W, ART_H);
    gl.disable(gl.BLEND);
    gl.useProgram(fillProg.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex.ground);
    gl.uniform1i(fillProg.u.uGround, 0);
    gl.uniform2f(fillProg.u.uArtSize, ART_W, ART_H);
    gl.bindVertexArray(blank);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(crowdProg.prog);
    gl.bindTexture(gl.TEXTURE_2D, tex.sprites);
    gl.uniform1i(crowdProg.u.uSprites, 0);
    gl.uniform2f(crowdProg.u.uArtSize, ART_W, ART_H);
    gl.uniform2f(crowdProg.u.uSheet, CROWD.sheet[0], CROWD.sheet[1]);
    gl.bindVertexArray(crowdVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, crowdBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, placed);
    gl.drawArrays(gl.TRIANGLES, 0, placed.length / 4);
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // --- The sheet ------------------------------------------------------------------
  // The canvas is the whole sheet: the collage in its margins. The view
  // looks at the sheet close up or whole: zoom, and the point of the sheet
  // at the middle of the canvas, in the canvas's own pixels at zoom one.

  var view = { zoom: 1, cx: 0, cy: 0, goal: { zoom: 1, cx: 0, cy: 0 } };
  var sheet = { w: 0, h: 0, art: [0, 0, 1, 1] };
  var marks = document.createElement("canvas"), marked = "";
  var ratio = 1;

  function layout(w, h) {
    var M = 0.035 * w, Mb = 0.065 * w, aw = w - 2 * M, ah = aw * ART_H / ART_W;
    sheet.w = w; sheet.h = h; sheet.M = M; sheet.Mb = Mb;
    sheet.art = [M, h - M - ah, aw, ah];   // GL pixels, y up: left, bottom, width, height
  }

  // The margins, drawn on a small canvas the press reads: a registration
  // mark in each corner (every drum prints it, so drift shows as a fringe),
  // the slug along the foot in black, and a swatch of each ink alone.
  function paintMarks(key) {
    var w = sheet.w, h = sheet.h, px = ratio;
    marks.width = w;
    marks.height = h;
    var c = marks.getContext("2d");
    c.clearRect(0, 0, w, h);
    var pad = Math.round(sheet.M * 0.5), r = Math.min(5 * px, sheet.M * 0.3), arm = Math.min(10 * px, sheet.M * 0.45);
    c.lineWidth = Math.max(1, Math.round(px));
    c.strokeStyle = "rgb(255, 0, 0)";
    [[pad, pad], [w - pad, pad], [pad, h - pad], [w - pad, h - pad]].forEach(function (m) {
      c.beginPath();
      c.arc(m[0], m[1], r, 0, 2 * Math.PI);
      c.moveTo(m[0] - arm, m[1]); c.lineTo(m[0] + arm, m[1]);
      c.moveTo(m[0], m[1] - arm); c.lineTo(m[0], m[1] + arm);
      c.stroke();
    });
    // In the page's own face; the serif is set a size up, as the page's
    // font-size-adjust would, since a canvas has no such thing.
    var serif = root.getAttribute("data-font") === "serif";
    var size = Math.round(clamp(w / px / 80, 6.5, 8.5) * (serif ? 1.15 : 1) * px);
    c.font = size + "px " + getComputedStyle(poster).fontFamily;
    c.textBaseline = "middle";
    var run = PRINTED.filter(function (k) { return on[k]; });
    var names = run.map(function (k) { return inkSet()[k][0]; }).join(" / ");
    var count = run.length + (run.length === 1 ? " drum" : " drums");
    var foot = h - sheet.Mb * 0.5;
    var slug = run.length ? "Bubble Box: Eat & Watch   PSU 2017   Riso, " + count + ": " + names
                          : "Bubble Box: Eat & Watch   PSU 2017   Nothing mounted";
    var room = w - 2 * sheet.M - arm - 70 * px;
    if (c.measureText(slug).width > room) slug = "Bubble Box   PSU 2017   Riso, " + count;
    c.fillStyle = "rgb(0, 255, 0)";
    if (c.measureText(slug).width <= room) c.fillText(slug, sheet.M, foot);
    var sw = Math.round(9 * px), gap = Math.round(3 * px);
    for (var k = 0; k < 4; k++) {
      c.fillStyle = "rgb(0, 0, " + [64, 128, 191, 255][k] + ")";
      c.fillRect(Math.round(w - sheet.M - arm - 4 * px - (4 - k) * (sw + gap)), Math.round(foot - sw / 2), sw, sw);
    }
    if (!tex.marks) tex.marks = texture(gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, tex.marks);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, marks);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    marked = key;
  }

  // --- Drawing -------------------------------------------------------------------

  var PITCH = 9.2;   // the bold screen: dot spacing in the collage's pixels

  function draw(t) {
    compose(reduce.matches);
    var w = canvas.width, h = canvas.height;
    if (sheet.w !== w || sheet.h !== h) {
      // A new size keeps the same part of the sheet in view.
      var sx = sheet.w ? w / sheet.w : 0, sy = sheet.h ? h / sheet.h : 0;
      layout(w, h);
      [view, view.goal].forEach(function (v) {
        v.cx = sx ? v.cx * sx : w / 2;
        v.cy = sy ? v.cy * sy : h / 2;
      });
    }
    // Repainted when the sheet resizes, the fonts arrive or change, or a
    // drum is loaded with a different ink, since the slug names all four.
    var key = w + "x" + h + ":" + pick.join(",") + on.join("") + ":" + (fontsReady ? 1 : 0) +
      root.getAttribute("data-font");
    if (marked !== key) paintMarks(key);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    gl.useProgram(press.prog);
    var u = press.u, set = inkSet();
    [collage.tex, tex.lut, tex.marks].forEach(function (tx, k) {
      gl.activeTexture(gl.TEXTURE0 + k);
      gl.bindTexture(gl.TEXTURE_2D, tx);
    });
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(u.uArt, 0);
    gl.uniform1i(u.uLut, 1);
    gl.uniform1i(u.uMarks, 2);
    var inks = [], offs = [], rots = [], angs = [], feeds = [];
    for (var k = 0; k < 4; k++) {
      inks.push.apply(inks, hex(set[k][1]));
      offs.push(pull.off[k][0], pull.off[k][1]);
      rots.push(pull.rot[k]);
      angs.push(set[k][2] * DEG);
      feeds.push(pull.feed[k]);
    }
    gl.uniform3fv(u.uInk, inks);
    gl.uniform2fv(u.uOff, offs);
    gl.uniform1fv(u.uRot, rots);
    gl.uniform1fv(u.uAng, angs);
    gl.uniform1fv(u.uFeed, feeds);
    gl.uniform3fv(u.uPaper, hex(PAPER));
    gl.uniform1f(u.uOpaque, opaque);
    gl.uniform1fv(u.uOn, on);
    gl.uniform2f(u.uArtSize, ART_W, ART_H);
    gl.uniform4fv(u.uArtRect, sheet.art);
    gl.uniform3f(u.uView, view.cx, view.cy, view.zoom);
    gl.uniform2f(u.uCanvas, w, h);
    gl.uniform1f(u.uPitch, PITCH);
    gl.uniform1f(u.uScale, view.zoom * sheet.art[2] / ART_W);
    gl.uniform1f(u.uSeed, pull.seed);
    gl.bindVertexArray(blank);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  // --- Size, the view and the frame loop ------------------------------------------

  // In the page the sheet fills its room in the column, by CSS alone, so
  // it follows the column even while the loop sleeps. Full screen, it is
  // the largest the window holds, centred.
  function fit() {
    if (!full) {
      poster.style.left = poster.style.top = poster.style.width = poster.style.height = "";
      return;
    }
    var vw = window.innerWidth, vh = window.innerHeight;
    var w = Math.min(vw - 24, (vh - 24) * ASPECT), h = w / ASPECT;
    poster.style.left = Math.round((vw - w) / 2) + "px";
    poster.style.top = Math.round((vh - h) / 2) + "px";
    poster.style.width = Math.floor(w) + "px";
    poster.style.height = Math.floor(h) + "px";
  }

  function resize() {
    fit();
    var cw = poster.clientWidth, ch = poster.clientHeight;
    ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(5e6 / Math.max(1, cw * ch)));
    var w = Math.max(1, Math.round(cw * ratio)), h = Math.max(1, Math.round(ch * ratio));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  // Keep the view on the sheet.
  function hold(v) {
    v.zoom = clamp(v.zoom, 1, 9);
    var hw = sheet.w / (2 * v.zoom), hh = sheet.h / (2 * v.zoom);
    v.cx = clamp(v.cx, hw, sheet.w - hw);
    v.cy = clamp(v.cy, hh, sheet.h - hh);
    return v;
  }

  // Zoom by f about a point on the canvas (device pixels, y up).
  function zoomAt(f, px, py) {
    var g = view.goal, z = clamp(g.zoom * f, 1, 9);
    var qx = (px - sheet.w / 2) / g.zoom + g.cx, qy = (py - sheet.h / 2) / g.zoom + g.cy;
    view.goal = hold({ zoom: z, cx: qx - (px - sheet.w / 2) / z, cy: qy - (py - sheet.h / 2) / z });
    canvas.classList.toggle("close-up", z > 1.01);
    start();
  }

  function glide(dt) {
    var k = reduce.matches ? 1 : 1 - Math.exp(-dt * 12);
    view.zoom += (view.goal.zoom - view.zoom) * k;
    view.cx += (view.goal.cx - view.cx) * k;
    view.cy += (view.goal.cy - view.cy) * k;
  }

  var clock = 0, last = 0, drawn = 0, sized = "", running = false, seen = false, dead = false;

  // A pull: how far off register each drum landed (a shift in the
  // collage's pixels and a hair of a turn), a fresh grain, and how far down
  // the sheet each drum has printed, in the order they go through.
  var pull = { off: [[0, 0], [0, 0], [0, 0], [0, 0]], rot: [0, 0, 0, 0], feed: [0, 0, 0, 0], seed: 1, at: 0 };

  function reprint() {
    pull.off = [0, 1, 2, 3].map(function () {
      var a = Math.random() * 2 * Math.PI, m = 0.6 + Math.random() * 1.8;
      return [Math.cos(a) * m, Math.sin(a) * m];
    });
    pull.rot = [0, 1, 2, 3].map(function () { return (Math.random() - 0.5) * 0.25 * DEG; });
    pull.seed = 1 + Math.random() * 97;
    pull.at = performance.now() / 1000;
    ticket();
    start();
  }

  function feeding(now) {
    var s = now / 1000 - pull.at;
    PRINTED.forEach(function (k, i) { pull.feed[k] = reduce.matches ? 1 : smooth((s - 0.15 - i * 0.55) / 0.9); });
  }

  // Settled: the view has stopped gliding and every drum has printed.
  function settled() {
    var zoomed = Math.abs(view.zoom - view.goal.zoom) + Math.abs(view.cx - view.goal.cx) + Math.abs(view.cy - view.goal.cy) < 0.01;
    var fed = pull.feed.every(function (f) { return f >= 1; });
    return zoomed && fed;
  }
  // The people never stop, unless motion is to be kept down.
  function lively() { return !reduce.matches; }

  // A desk window that held the print has been taken away: this copy of
  // the press stops for good (a new window brings its own).
  function gone() {
    if (poster.isConnected) return false;
    running = false;
    return true;
  }

  function frame(now) {
    if (!running || dead || gone()) return;
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    if (!reduce.matches) clock += dt;
    glide(dt);
    feeding(now);
    resize();
    if (!reduce.matches) move(dt, clock);
    // While only the people move, a print every 40 ms is plenty, and spares
    // the machine the press's full work every frame.
    var calm = settled(), size = canvas.width + "x" + canvas.height;
    if (!loaded()) {
      // Bare paper until the collage arrives, not the canvas's black.
      var p = hex(PAPER);
      gl.clearColor(p[0], p[1], p[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    } else if (!calm || size !== sized || now - drawn > 40) {
      draw(clock);
      drawn = now;
      sized = size;
    }
    if (loaded() && calm && !lively() && now === drawn) { running = false; return; }
    requestAnimationFrame(frame);
  }

  function start() {
    if (running || dead || gone()) return;
    running = true;
    last = 0;
    requestAnimationFrame(frame);
  }

  function stop() { running = false; }

  try {
    press = compile(SCREEN_VS, PRESS_FS);
    fillProg = compile(SCREEN_VS, GROUND_FS);
    crowdProg = compile(CROWD_VS, CROWD_FS);
  } catch (err) {
    bare();
    return;
  }

  // --- Controls -------------------------------------------------------------------

  var full = false, fullscreened = false, fontsReady = false;

  function pressed(buttons, which) {
    buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b === which)); });
  }

  // One row per drum, in the order they print: the ink's name (a click
  // leaves the drum out of the run), a slider through every ink, and this
  // pull's line from the job ticket: the screen angle and how far off
  // register it landed.
  readPaper();
  var inkBox = document.getElementById("riso-inks"), rows = [];
  PRINTED.forEach(function (k, i) {
    var row = document.createElement("div");
    row.className = "riso-ink";
    var role = document.createElement("span");
    role.className = "riso-role";
    role.textContent = "Drum " + (i + 1) + ", " + ROLES[k];
    var load = document.createElement("button");
    load.type = "button";
    load.className = "riso-load";
    load.title = "Leave this drum out of the run";
    var chip = document.createElement("span");
    chip.className = "riso-chip";
    var name = document.createElement("span");
    name.className = "riso-name";
    load.appendChild(chip);
    load.appendChild(name);
    var slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = String(INKS.length - 1);
    slider.step = "1";
    slider.value = String(pick[k]);
    slider.setAttribute("aria-label", "Ink in the " + ROLES[k] + " drum");
    var spec = document.createElement("span");
    spec.className = "riso-spec";
    function show() {
      chip.style.borderColor = INKS[pick[k]][1];
      chip.style.background = on[k] ? INKS[pick[k]][1] : "transparent";
      name.textContent = INKS[pick[k]][0];
      load.setAttribute("aria-pressed", String(!!on[k]));
      load.setAttribute("aria-label", INKS[pick[k]][0] + (on[k] ? ", printing" : ", not run"));
      slider.title = INKS[pick[k]][0];
      slider.setAttribute("aria-valuetext", INKS[pick[k]][0]);
    }
    load.addEventListener("click", function () {
      on[k] = on[k] ? 0 : 1;
      show();
      marked = "";                        // the slug names the drums that ran
      ticket();
      start();
    });
    slider.addEventListener("input", function () {
      pick[k] = Number(slider.value);
      show();
      ticket();
      start();
    });
    [role, load, slider, spec].forEach(function (el) { row.appendChild(el); });
    inkBox.appendChild(row);
    rows[k] = { row: row, spec: spec, slider: slider, show: show };
    show();
  });

  document.getElementById("riso-in").addEventListener("click", function () { zoomAt(2, sheet.w / 2, sheet.h / 2); });
  function whole() {
    view.goal = { zoom: 1, cx: sheet.w / 2, cy: sheet.h / 2 };
    canvas.classList.remove("close-up");
    start();
  }
  document.getElementById("riso-fit").addEventListener("click", whole);

  // Reset: the inks the collage was fitted to, every drum in the run, and
  // the whole sheet. The register stays where this pull put it.
  document.getElementById("riso-reset").addEventListener("click", function () {
    PRINTED.forEach(function (k) {
      pick[k] = START[k];
      on[k] = 1;
      rows[k].slider.value = String(pick[k]);
      rows[k].show();
    });
    marked = "";
    ticket();
    whole();
  });

  // Download: the whole sheet drawn once more, on a canvas big enough that
  // the collage is at its own pixels (so the screen's dots are sharp), with
  // every drum through, and saved as it stands: these inks, this register,
  // everyone where they are. The canvas keeps no picture between frames, so
  // the copy is taken in the same task as the drawing; then the canvas goes
  // back to its size and view and is drawn again before anything paints.
  function download() {
    if (!loaded()) return;
    var cw = canvas.width, ch = canvas.height, was = ratio;
    var keep = { zoom: view.zoom, cx: view.cx, cy: view.cy }, goal = view.goal;
    var most = Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), gl.getParameter(gl.MAX_VIEWPORT_DIMS)[1]);
    var w = Math.round(ART_W / 0.93), h = Math.round(w / ASPECT);
    if (h > most) { h = most; w = Math.round(h * ASPECT); }
    canvas.width = w;
    canvas.height = h;
    if (gl.drawingBufferHeight < h) {     // the browser gave less than asked
      h = gl.drawingBufferHeight; w = Math.round(h * ASPECT);
      canvas.width = w;
      canvas.height = h;
    }
    ratio = w / poster.clientWidth;       // the marks and slug scale with the sheet
    view.zoom = 1; view.cx = sheet.w / 2; view.cy = sheet.h / 2;
    view.goal = { zoom: 1, cx: view.cx, cy: view.cy };
    var fed = pull.feed.slice();
    pull.feed = [1, 1, 1, 1];
    draw(clock);
    canvas.toBlob(function (blob) {
      if (!blob) return;
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "bubble-box-riso.jpg";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 10000);
    }, "image/jpeg", 0.92);
    pull.feed = fed;
    canvas.width = cw;
    canvas.height = ch;
    ratio = was;
    layout(cw, ch);
    view.zoom = keep.zoom; view.cx = keep.cx; view.cy = keep.cy;
    view.goal = goal;
    draw(clock);
    start();
  }
  document.getElementById("riso-download").addEventListener("click", download);

  // The job ticket, a line under each drum's slider.
  function ticket() {
    var set = inkSet();
    function signed(v) { return (v >= 0 ? "+" : "\u2212") + Math.abs(v * 0.135).toFixed(2); }
    PRINTED.forEach(function (k) {
      var off = pull.off[k];
      rows[k].row.classList.toggle("skipped", !on[k]);
      rows[k].spec.textContent = on[k]
        ? set[k][2] + "\u00b0 screen, off by " + signed(off[0]) + " " + signed(-off[1]) + " mm"
        : "Not run";
    });
  }

  document.getElementById("riso-reprint").addEventListener("click", reprint);

  var bigButton = document.getElementById("riso-full");
  function enlarge(on) {
    if (on === full) return;
    full = on;
    poster.classList.toggle("full", on);
    bigButton.setAttribute("aria-pressed", String(on));
    // The whole page goes full screen, not the print alone: a full-screen
    // element is stretched to the screen, and the print has to keep its
    // proportions. The print is fixed over a backdrop of the page's own.
    var root = document.documentElement;
    if (on && root.requestFullscreen && !touch.matches) {
      root.requestFullscreen().then(function () { fullscreened = true; resize(); start(); }, function () {});
    }
    if (!on && fullscreened) {
      fullscreened = false;
      if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
    }
    resize();
    start();
    canvas.focus({ preventScroll: true });
  }
  bigButton.addEventListener("click", function () { enlarge(!full); });
  document.getElementById("riso-close").addEventListener("click", function () { enlarge(false); });
  document.addEventListener("fullscreenchange", function () {
    if (!document.fullscreenElement && fullscreened) { fullscreened = false; enlarge(false); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && full) enlarge(false);
  });

  var hint = document.getElementById("riso-hint");
  function say() {
    hint.textContent = (touch.matches ?
      "Double-tap the print to look closer, then drag to move about or pinch to zoom." :
      "Double-click the print to look closer and drag to move about. In full screen the scroll wheel zooms too.") +
      " Each reprint lands a little off register.";
  }

  // The site's Light/Dark and Sans/Serif switches set data-theme and
  // data-font on <html>: a new theme is a new paper, a new face a new slug.
  function syncTheme() {
    var was = PAPER;
    readPaper();
    if (PAPER !== was) marked = "";      // the margins are drawn on the sheet
    start();
  }
  new MutationObserver(syncTheme).observe(root, { attributes: true, attributeFilter: ["data-theme", "data-font"] });

  // --- Hands ---------------------------------------------------------------------
  // A double click (or a double tap) looks closer where it lands; a drag
  // moves about once close; the wheel zooms in full screen, or anywhere
  // with ctrl held; two fingers pinch.

  var pointers = {}, dragging = null, lastTap = 0;

  function devicePoint(e) {
    var rect = canvas.getBoundingClientRect();
    return [(e.clientX - rect.left) * canvas.width / rect.width,
            canvas.height - (e.clientY - rect.top) * canvas.height / rect.height];
  }

  function spread2() {
    var ids = Object.keys(pointers);
    if (ids.length < 2) return 0;
    var a = pointers[ids[0]], b = pointers[ids[1]];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  canvas.addEventListener("pointerdown", function (e) {
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (Object.keys(pointers).length === 2) { dragging = { pinch: spread2(), zoom: view.goal.zoom }; }
    else dragging = { x: e.clientX, y: e.clientY, moved: 0 };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    start();
  });
  canvas.addEventListener("pointermove", function (e) {
    var p = pointers[e.pointerId];
    if (!p || !dragging) return;
    var dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (dragging.pinch) {
      var rect = canvas.getBoundingClientRect(), s = canvas.width / rect.width;
      var ids = Object.keys(pointers), a = pointers[ids[0]], b = pointers[ids[1]];
      var mx = ((a.x + b.x) / 2 - rect.left) * s, my = canvas.height - ((a.y + b.y) / 2 - rect.top) * s;
      zoomAt(dragging.zoom * spread2() / dragging.pinch / view.goal.zoom, mx, my);
      return;
    }
    dragging.moved += Math.abs(dx) + Math.abs(dy);
    if (view.goal.zoom > 1.01) {
      var k = canvas.width / canvas.getBoundingClientRect().width / view.goal.zoom;
      view.goal = hold({ zoom: view.goal.zoom, cx: view.goal.cx - dx * k, cy: view.goal.cy + dy * k });
      view.cx = view.goal.cx; view.cy = view.goal.cy;
      start();
    }
  });
  function lift(e) {
    delete pointers[e.pointerId];
    if (!Object.keys(pointers).length) dragging = null;
  }
  canvas.addEventListener("pointerup", function (e) {
    var tapped = dragging && !dragging.pinch && dragging.moved < 8;
    lift(e);
    if (tapped && e.pointerType !== "mouse") {
      var now = performance.now();
      if (now - lastTap < 320) { var pt = devicePoint(e); zoomAt(2.5, pt[0], pt[1]); lastTap = 0; }
      else lastTap = now;
    }
  });
  canvas.addEventListener("pointercancel", lift);
  canvas.addEventListener("dblclick", function (e) {
    var pt = devicePoint(e);
    if (view.goal.zoom >= 8.9) { view.goal = { zoom: 1, cx: sheet.w / 2, cy: sheet.h / 2 }; canvas.classList.remove("close-up"); start(); }
    else zoomAt(2.5, pt[0], pt[1]);
  });
  canvas.addEventListener("wheel", function (e) {
    if (!full && !e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    var pt = devicePoint(e);
    zoomAt(Math.exp(-e.deltaY * 0.0022), pt[0], pt[1]);
  }, { passive: false });
  canvas.tabIndex = 0;
  canvas.addEventListener("keydown", function (e) {
    if (e.key === "+" || e.key === "=") zoomAt(1.5, sheet.w / 2, sheet.h / 2);
    else if (e.key === "-") zoomAt(1 / 1.5, sheet.w / 2, sheet.h / 2);
    else if (e.key === "0") { view.goal = { zoom: 1, cx: sheet.w / 2, cy: sheet.h / 2 }; start(); }
    else if (e.key.indexOf("Arrow") === 0 && view.goal.zoom > 1.01) {
      var step = 60 / view.goal.zoom, g = view.goal;
      view.goal = hold({ zoom: g.zoom, cx: g.cx + (e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0),
        cy: g.cy + (e.key === "ArrowUp" ? step : e.key === "ArrowDown" ? -step : 0) });
      start();
    } else return;
    e.preventDefault();
  });

  // --- Set up -------------------------------------------------------------------

  blank = gl.createVertexArray();
  tex.lut = texture(gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, N * N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, lattice());
  canvas.setAttribute("role", "img");   // its label is the alt text, in riso.html
  say();
  resize();
  reprint();
  collage = { tex: texture(gl.LINEAR), fb: gl.createFramebuffer() };
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, ART_W, ART_H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, collage.fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, collage.tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  crowdVao = gl.createVertexArray();
  crowdBuf = gl.createBuffer();
  gl.bindVertexArray(crowdVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, crowdBuf);
  gl.bufferData(gl.ARRAY_BUFFER, placed.byteLength, gl.DYNAMIC_DRAW);
  var aPlace = gl.getAttribLocation(crowdProg.prog, "aPlace");
  gl.enableVertexAttribArray(aPlace);
  gl.vertexAttribPointer(aPlace, 4, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  function arrived(which) {
    return function () {
      ready[which] = true;
      if (loaded()) pull.at = performance.now() / 1000;   // the first pull starts once there is a picture
      start();
    };
  }
  // Three megabytes of collage: fetched only once the print is within a
  // screen or so of view.
  var fetched = false;
  function fetchArt() {
    if (fetched) return;
    fetched = true;
    loadImage(GROUND, "ground", gl.LINEAR, arrived("ground"));
    loadImage(SPRITES, "sprites", gl.LINEAR, arrived("sprites"));
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) fetchArt();
    }, { rootMargin: "100% 0px" }).observe(poster);
    new IntersectionObserver(function (entries) {
      seen = entries[0].isIntersecting;
      if (seen && !document.hidden) start(); else stop();
    }).observe(poster);
  } else {
    fetchArt();
    seen = true;
    start();
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else if (seen || full) start();
  });
  window.addEventListener("resize", function () { if (seen || full) { resize(); start(); } });
  if (touch.addEventListener) touch.addEventListener("change", say);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { fontsReady = true; start(); });
  }

  canvas.addEventListener("webglcontextlost", function (e) {
    e.preventDefault();
    dead = true;
    enlarge(false);
    canvas.remove();
    bare();
  });
})();
