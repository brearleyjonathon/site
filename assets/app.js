// Theme and typeface switches. Preferences persist in localStorage.
// The initial values are already applied by the inline script in <head>,
// so this file only handles clicks and keeps the buttons in sync.

(function () {
  var root = document.documentElement;

  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }

  // --- Fun mode ----------------------------------------------------------
  // One hue runs the whole field. It starts from the time of day and turns
  // slowly as the pointer travels, and every colour on the page is a near
  // neighbour of it, so wherever two colours overlap they make a third in
  // the same family rather than mud. There are two ways to show it, chosen
  // by the pill beside the theme buttons (data-fun on <html>): "field"
  // has five pools of colour behind the page and the pointer clears them
  // to white; "source" has a white page and the pointer lays the colour
  // down. A click sends a small animal off the pointer, into the page and
  // under.

  // Anchors through the day: the hue the field starts on when Fun comes on.
  // Between them the hue is turned by the hour, the short way round, so the
  // page warms up and cools down rather than jumping.
  var HOURS = [
    { at: 3,  hue: 268 },   // indigo
    { at: 8,  hue: 28 },    // coral
    { at: 13, hue: 205 },   // sky
    { at: 19, hue: 335 }    // magenta
  ];

  // A little animal, drawn as if doodled: the head is a loop that overshoots
  // itself rather than a circle, no stroke quite meets the next, and a
  // little turbulence roughens every edge so it reads as pencil rather than
  // as vector. Most of them share one body, standing with its arms up and
  // then tucked into a ball for the cannonball, and differ only in the
  // face drawn on the head; the rest have shapes of their own (SHAPES,
  // below). Clicks take turns through the list.
  // The drawings are set in a pen about 2.2 wide; THIN scales every stroke
  // in them, details included, so the whole hand gets lighter together.
  var THIN = 0.72;

  function thin(strokes) {
    return strokes.replace(/stroke-width="([\d.]+)"/g, function (m, w) {
      return 'stroke-width="' + (parseFloat(w) * THIN).toFixed(2) + '"';
    });
  }

  // The wobble that makes the strokes read as pencil is the #ink-sketch
  // filter in the page, applied in CSS to the .ink group, rather than a
  // filter written into every drawing. The id only tells the groups apart.
  function ink(id) {
    return '<g class="ink ink-' + id + '" fill="none" stroke="currentColor" ' +
         'stroke-width="' + (2.2 * THIN).toFixed(2) + '">';
  }

  // The head loop, in the standing figure's coordinates. The tucked and
  // floating figures carry it 2.2 lower.
  var HEAD =
    '<path d="M26.6 6.4 C22.4 2.3 14.2 3.6 12.6 9 C11.1 14 15.4 18.8 20.6 18.4 ' +
             'C25.8 18 28.9 12.6 27 8 C26.8 7.6 26.6 7.2 26.3 6.8" stroke-width="2.1"/>';

  var EYES =
    '<path d="M17.3 10.4 L17.4 10.5" stroke-width="3"/>' +
    '<path d="M22.9 10.2 L23 10.3" stroke-width="3"/>';

  var FACES = {
    bear:
      '<path d="M13.6 6.4 C12.2 3.4 14.8 1.2 17.2 3.4"/>' +
      '<path d="M23.4 3.2 C25.8 1 28.6 3.2 27.2 6.2"/>' + EYES +
      '<path d="M19.3 13.1 C20 12.3 21 12.4 21.4 13.2 C20.9 13.8 19.8 13.8 19.3 13.1" stroke-width="1.8"/>' +
      '<path d="M18.4 15.4 C19.3 16.5 21.1 16.5 22 15.4" stroke-width="1.8"/>',
    cat:
      '<path d="M13.4 7.4 C12.6 5.2 12.2 3.2 12.6 1.4 C14.4 2.2 16 3.2 17.4 4.4"/>' +
      '<path d="M26.6 7.2 C27.4 5 27.8 3 27.4 1.2 C25.6 2 24 3 22.6 4.2"/>' + EYES +
      '<path d="M19.3 12.9 L20.7 12.9 L20 13.9 L19.3 12.9" stroke-width="1.6"/>' +
      '<path d="M20 13.9 C19.7 15 18.8 15.4 17.9 15" stroke-width="1.6"/>' +
      '<path d="M20 13.9 C20.3 15 21.2 15.4 22.1 15" stroke-width="1.6"/>' +
      '<path d="M9.4 12.4 L14 13" stroke-width="1.4"/>' +
      '<path d="M9.8 15 L14.2 14.2" stroke-width="1.4"/>' +
      '<path d="M30.6 12.4 L26 13" stroke-width="1.4"/>' +
      '<path d="M30.2 15 L25.8 14.2" stroke-width="1.4"/>',
    rabbit:
      '<path d="M15.4 4.8 C13.6 .8 13.4 -3 15.6 -4.2 C17.6 -5 18.8 -1.2 18.4 3.4"/>' +
      '<path d="M24.6 4.8 C26.4 .8 26.6 -3 24.4 -4.2 C22.4 -5 21.2 -1.2 21.6 3.4"/>' + EYES +
      '<path d="M19.3 12.7 C19.7 12.1 20.5 12.1 20.8 12.8" stroke-width="1.8"/>' +
      '<path d="M18 14.4 C19.2 15.6 20.8 15.6 22 14.4" stroke-width="1.6"/>' +
      '<path d="M19.2 15.4 L19.2 17" stroke-width="1.6"/>' +
      '<path d="M20.8 15.4 L20.8 17" stroke-width="1.6"/>',
    frog:
      '<path d="M13.2 7 C12.4 3.6 16 1.8 17.6 4.8" stroke-width="2"/>' +
      '<path d="M26.8 7 C27.6 3.6 24 1.8 22.4 4.8" stroke-width="2"/>' +
      '<path d="M15.3 5.2 L15.4 5.3" stroke-width="2.8"/>' +
      '<path d="M24.7 5.2 L24.8 5.3" stroke-width="2.8"/>' +
      '<path d="M14.6 12.8 C17 16.2 23 16.2 25.4 12.8" stroke-width="1.9"/>',
    duck:
      '<path d="M19 3.4 C19.4 1.4 20.8 .4 22.4 1.2" stroke-width="1.8"/>' + EYES +
      '<path d="M15.6 13.4 C17 11.6 23 11.6 24.4 13.4 C23 15.4 17 15.4 15.6 13.4" stroke-width="1.8"/>' +
      '<path d="M16.4 13.5 L23.6 13.5" stroke-width="1.3"/>',
    elephant:
      '<path d="M13.2 8.4 C8.6 5.2 5.4 8.6 6.8 13.4 C7.8 16.4 11 17 13.4 15.2"/>' +
      '<path d="M26.8 8.4 C31.4 5.2 34.6 8.6 33.2 13.4 C32.2 16.4 29 17 26.6 15.2"/>' + EYES +
      '<path d="M20 12.6 C20.4 15.6 20.6 18.6 19.4 21.4 C18.6 23.2 17 23.6 15.8 22.6" stroke-width="2.4"/>' +
      '<path d="M18.9 16.2 L21.3 16.4" stroke-width="1.3"/>' +
      '<path d="M18.7 18.6 L21.1 18.8" stroke-width="1.3"/>'
  };

  var ANIMALS = ["bear", "cat", "rabbit", "frog", "duck", "elephant", "camel", "giraffe", "penguin", "hippo"];
  var turn = 0;

  var BODY_STAND =
    '<path d="M15.4 19.4 C12.4 23.6 12.2 30.6 14.2 35.6 C16 40.2 24.2 40.2 25.9 35.6 C27.8 30.6 27.6 23.6 24.6 19.4"/>' +
    '<path d="M14.6 22.4 C11.2 19.6 9.2 16.2 8.2 12.2" stroke-width="2.3"/>' +
    '<path d="M25.4 22.4 C28.8 19.6 30.8 16.2 31.8 12.2" stroke-width="2.3"/>' +
    '<path d="M12.6 41.2 C13.6 39.6 16.6 39.6 17.8 41.4 C16.4 42.6 13.8 42.6 12.6 41.2" stroke-width="2"/>' +
    '<path d="M22.2 41.4 C23.4 39.6 26.4 39.6 27.4 41.2 C26.2 42.6 23.6 42.6 22.2 41.4" stroke-width="2"/>';

  var BODY_TUCK =
    '<path d="M15.2 20.8 C10.4 23.6 9 30 12.4 34.8 C16 39.8 24.4 40 28 35.4 C31.4 31 30.2 24.4 25.6 21.2"/>' +
    '<path d="M14.4 24.6 C15.6 29.6 20.2 31.8 25.6 30.6" stroke-width="2.3"/>' +
    '<path d="M25.8 23.4 C26.4 26.4 25.4 29 23.4 30.6" stroke-width="2.3"/>' +
    '<path d="M17.6 35.4 C18.8 33.4 21.8 33.6 22.6 35.8 C21.2 37.2 18.6 37 17.6 35.4" stroke-width="2"/>' +
    '<path d="M23.6 33.6 C25 31.8 27.8 32.4 28.2 34.6 C26.8 35.8 24.4 35.4 23.6 33.6" stroke-width="2"/>';

  // Afterwards it bobs in the water: head and shoulders over its own wave.
  var BODY_FLOAT =
    '<path d="M13.6 19.8 C11.2 20.8 8.8 22 6.6 23.6" stroke-width="2.3"/>' +
    '<path d="M26.4 19.8 C28.8 20.8 31.2 22 33.4 23.6" stroke-width="2.3"/>' +
    '<path d="M1.5 25.4 C4.5 21.8 7.5 21.8 10.5 25.2 C13.5 28.6 16.5 28.6 19.5 25.2 ' +
             'C22.5 21.8 25.5 21.8 28.5 25.2 C31.5 28.6 34.5 28.6 37.5 25.4"/>';

  // Some are not a face on the shared body but their own shape: the camel
  // with its humps and the giraffe with its neck, in profile; the penguin
  // and the hippo head-on. Each is drawn standing, tucked, and afloat.
  // The hippo's head and the penguin's face are the same in every pose,
  // so they are drawn once and shifted.
  var HIPPO_HEAD =
    '<path d="M12.6 6.6 C9.4 8.4 8.2 13.2 9.6 17.4 C11 21.4 16 22.6 20 22.6 C24 22.6 29 21.4 30.4 17.4 C31.8 13.2 30.6 8.4 27.4 6.6"/>' +
    '<path d="M12.6 6.6 C13.6 3.8 17.4 3.8 18 6.4"/>' +
    '<path d="M22 6.4 C22.6 3.8 26.4 3.8 27.4 6.6"/>' +
    '<path d="M18 6.4 C18.8 5.6 21.2 5.6 22 6.4" stroke-width="1.8"/>' +
    '<path d="M14 4.4 C13.6 2.6 15.6 1.8 16.4 3.4" stroke-width="1.8"/>' +
    '<path d="M26 4.4 C26.4 2.6 24.4 1.8 23.6 3.4" stroke-width="1.8"/>' +
    '<path d="M15.4 6.4 L15.5 6.5" stroke-width="2.6"/>' +
    '<path d="M24.6 6.4 L24.7 6.5" stroke-width="2.6"/>' +
    '<path d="M16.2 15.4 C16.6 14.6 17.6 14.6 18 15.4" stroke-width="2"/>' +
    '<path d="M22 15.4 C22.4 14.6 23.4 14.6 23.8 15.4" stroke-width="2"/>' +
    '<path d="M12.4 18.6 C15.4 19.8 24.6 19.8 27.6 18.6" stroke-width="1.6"/>' +
    '<path d="M15.6 19.4 L15.6 21" stroke-width="1.6"/>' +
    '<path d="M24.4 19.4 L24.4 21" stroke-width="1.6"/>';

  var PENGUIN_FACE =
    '<path d="M17.4 9.6 L17.5 9.7" stroke-width="2.8"/>' +
    '<path d="M22.6 9.6 L22.7 9.7" stroke-width="2.8"/>' +
    '<path d="M18.4 12.2 L21.6 12.2 L20 14.4 L18.4 12.2" stroke-width="1.6"/>';

  function shifted(strokes, dy) {
    return '<g transform="translate(0 ' + dy + ')">' + strokes + '</g>';
  }

  var SHAPES = {
    camel: {
      stand:
        // the long neck, rising and leaning forward
        '<path d="M14.6 25.4 C12.6 21 11.8 16.4 12.6 12"/>' +
        '<path d="M19.6 25.2 C17.6 20.8 16.6 16 17.2 11.8"/>' +
        // head: over the crown, out along the drooping muzzle, back under the jaw
        '<path d="M17.2 11.8 C17 8.6 14.6 7 12 7.6 C9.4 8.2 7 9 6.2 10.6 C6.8 12.2 9.6 12.6 12.6 12" stroke-width="2"/>' +
        '<path d="M15.4 7.8 C15.8 6 17 5.6 17.6 7" stroke-width="1.8"/>' +
        '<path d="M12.6 7.4 C12.8 6 13.8 5.4 14.8 6.2" stroke-width="1.6"/>' +
        '<path d="M11.2 9 C11.8 8.4 12.8 8.4 13.2 9" stroke-width="1.5"/>' +
        '<path d="M12.2 9.6 L12.3 9.7" stroke-width="2.4"/>' +
        '<path d="M7.4 10.2 L7.5 10.3" stroke-width="1.9"/>' +
        '<path d="M6.8 11.4 C7.8 11.9 9 12 10 11.7" stroke-width="1.5"/>' +
        // body, low and long, with two humps standing up off the back
        '<path d="M14.6 25.4 C12.4 28 12.8 33.4 16 35.8 C19.6 38.4 26.6 38.4 29.8 35.6 C32.4 33.4 32.6 29.6 31 27"/>' +
        '<path d="M19.6 25.2 C20.4 20.4 23 19.6 24.4 23.4 C25.8 19.4 28.8 19.6 30.2 23.6 C30.8 25 31 26 31 27"/>' +
        // tail and legs
        '<path d="M31.2 28 C32.8 29.8 33 32 32.2 34.4" stroke-width="1.8"/>' +
        '<path d="M32.2 34.4 L32.3 34.5" stroke-width="2.8"/>' +
        '<path d="M17.4 37.6 L16.6 43.2"/>' +
        '<path d="M20.4 38.4 L20 43.4"/>' +
        '<path d="M26 38.2 L26.6 43.2"/>' +
        '<path d="M29 36.6 L30.2 42.6"/>',
      tuck:
        // the ball, with the humps on top
        '<path d="M16.8 21.6 C11.6 23.6 9.6 29.6 12 34.4 C14.6 39.4 21.6 40.6 26.6 37.6 C31 35 32.2 29.2 29.6 25"/>' +
        '<path d="M20.8 21.4 C21.8 17.8 24.4 17.4 25.4 21 C26.6 17.6 29 17.8 29.8 21.6 C30.1 22.8 30 24 29.6 25"/>' +
        // neck folded up, head tucked down against it
        '<path d="M16.8 21.6 C14.8 18.2 14.8 14.6 16.4 12"/>' +
        '<path d="M20.4 21.4 C18.8 18.2 18.6 15.2 19.8 13"/>' +
        '<path d="M19.8 13 C19.8 9.8 17.4 8 14.8 8.8 C12.6 9.4 10.6 11.8 10.2 14.2 C11.6 15.2 14.4 14.2 16.4 12" stroke-width="2"/>' +
        '<path d="M17.6 9 C18 7.4 19.2 7 19.8 8.4" stroke-width="1.8"/>' +
        '<path d="M15 8.6 C15.2 7.2 16.2 6.8 17 7.6" stroke-width="1.6"/>' +
        '<path d="M13.2 10.4 C13.8 9.8 14.8 9.8 15.2 10.4" stroke-width="1.5"/>' +
        '<path d="M14.2 11 L14.3 11.1" stroke-width="2.4"/>' +
        '<path d="M11.2 13.4 L11.3 13.5" stroke-width="1.9"/>' +
        '<path d="M10.8 14.6 C11.6 15 12.6 15 13.4 14.7" stroke-width="1.5"/>' +
        // legs folded under
        '<path d="M14.2 35.6 C12.8 37 12.8 39 14.4 40.2"/>' +
        '<path d="M19.4 39.6 C18.4 41 18.8 42.4 20.4 42.8"/>',
      float:
        // neck up out of the water, head turned to the left
        '<path d="M15.4 25.2 C14.4 20.2 14.2 15 15.6 10.4"/>' +
        '<path d="M20.2 25.4 C19.4 20.4 19.4 15.6 20.6 11.2"/>' +
        '<path d="M20.6 11.2 C20.4 8.2 18.2 6.6 15.8 7.2 C13.4 7.8 11.4 9.4 10.6 11.6 C11.8 12.8 14 12.4 15.6 10.4" stroke-width="2"/>' +
        '<path d="M18.6 7.4 C19 5.8 20.2 5.4 20.8 6.8" stroke-width="1.8"/>' +
        '<path d="M16 7 C16.2 5.6 17.2 5.2 18 6" stroke-width="1.6"/>' +
        '<path d="M14 8.8 C14.6 8.2 15.6 8.2 16 8.8" stroke-width="1.5"/>' +
        '<path d="M15 9.4 L15.1 9.5" stroke-width="2.4"/>' +
        '<path d="M11.6 10.8 L11.7 10.9" stroke-width="1.9"/>' +
        '<path d="M11.2 12 C12 12.4 13 12.4 13.8 12.1" stroke-width="1.5"/>' +
        // the humps behind, then the wave
        '<path d="M22.4 25.4 C23 20.4 25.6 19.6 27.2 23.4 C28.4 19.6 31.4 20 32.6 23.6 C32.9 24.4 33.1 25 33.2 25.6"/>' +
        '<path d="M1.5 25.4 C4.5 21.8 7.5 21.8 10.5 25.2 C13.5 28.6 16.5 28.6 19.5 25.2 ' +
                 'C22.5 21.8 25.5 21.8 28.5 25.2 C31.5 28.6 34.5 28.6 37.5 25.4"/>'
    },
    penguin: {
      stand:
        // one loop for head and body, the belly inside it
        '<path d="M20 4 C13.4 4 10.6 12 11 22 C11.4 32 13.6 39 20 39.4 C26.4 39 28.6 32 29 22 C29.4 12 26.6 4 20.6 4.1"/>' +
        '<path d="M16.4 14 C13.8 20 14 30 17 36.8 C18 37.4 22 37.4 23 36.8 C26 30 26.2 20 23.6 14" stroke-width="1.6"/>' +
        PENGUIN_FACE +
        // flippers up, feet
        '<path d="M11.6 18 C9 15.6 7.6 12.6 7.4 9.4" stroke-width="2.3"/>' +
        '<path d="M28.4 18 C31 15.6 32.4 12.6 32.6 9.4" stroke-width="2.3"/>' +
        '<path d="M13.4 40.8 C14.6 39.4 17.6 39.6 18.4 41.6 C16.6 42.6 14.4 42.4 13.4 40.8" stroke-width="2"/>' +
        '<path d="M21.6 41.6 C22.4 39.6 25.4 39.4 26.6 40.8 C25.6 42.4 23.4 42.6 21.6 41.6" stroke-width="2"/>',
      tuck:
        // rounder, flippers wrapped round the front, feet drawn up
        '<path d="M20 8 C12.6 8 9.6 16 10.4 24.6 C11.2 33 15 38.6 20 38.8 C25 38.6 28.8 33 29.6 24.6 C30.4 16 27.4 8 20.6 8.1"/>' +
        '<path d="M16.6 17 C14.6 22 14.8 30 17.2 35.6 C18.2 36.2 21.8 36.2 22.8 35.6 C25.2 30 25.4 22 23.4 17" stroke-width="1.6"/>' +
        shifted(PENGUIN_FACE, 3.6) +
        '<path d="M11.2 22 C12.6 27.6 16.2 30.4 21 30.6" stroke-width="2.3"/>' +
        '<path d="M28.8 22 C27.6 26.8 24.6 29.6 20.6 30.4" stroke-width="2.3"/>' +
        '<path d="M15.4 36.4 C16.4 34.8 19 35 19.8 36.8 C18.4 37.8 16.4 37.8 15.4 36.4" stroke-width="2"/>' +
        '<path d="M20.6 36.8 C21.4 35 24 34.8 25 36.4 C24 37.8 22 37.8 20.6 36.8" stroke-width="2"/>',
      float:
        // head and shoulders over the wave, flippers resting on it
        '<path d="M20 7 C14.8 7 12.2 11.6 12.4 18 C12.5 20.6 12.8 22.8 13.4 24.8"/>' +
        '<path d="M20 7 C25.2 7 27.8 11.6 27.6 18 C27.5 20.6 27.2 22.8 26.6 24.8"/>' +
        '<path d="M16.4 15.6 C15.4 18.4 15.2 21.6 15.6 24.6" stroke-width="1.6"/>' +
        '<path d="M23.6 15.6 C24.6 18.4 24.8 21.6 24.4 24.6" stroke-width="1.6"/>' +
        shifted(PENGUIN_FACE, 2.2) +
        '<path d="M12.6 20 C10.4 21.6 8.4 22.8 6.4 24" stroke-width="2.3"/>' +
        '<path d="M27.4 20 C29.6 21.6 31.6 22.8 33.6 24" stroke-width="2.3"/>' +
        '<path d="M1.5 25.4 C4.5 21.8 7.5 21.8 10.5 25.2 C13.5 28.6 16.5 28.6 19.5 25.2 ' +
                 'C22.5 21.8 25.5 21.8 28.5 25.2 C31.5 28.6 34.5 28.6 37.5 25.4"/>'
    },
    hippo: {
      stand:
        HIPPO_HEAD +
        // a stout body under the head, arms out, feet
        '<path d="M14.6 22.4 C12.2 26.4 12.4 32.2 14.8 36.6 C16.6 39.6 23.4 39.6 25.2 36.6 C27.6 32.2 27.8 26.4 25.4 22.4"/>' +
        '<path d="M13.4 26 C10.6 25.2 8 23.6 6.2 21.2" stroke-width="2.3"/>' +
        '<path d="M26.6 26 C29.4 25.2 32 23.6 33.8 21.2" stroke-width="2.3"/>' +
        '<path d="M13.4 38.8 C14.6 37.2 17.6 37.4 18.4 39.4 C16.6 40.6 14.4 40.4 13.4 38.8" stroke-width="2"/>' +
        '<path d="M21.6 39.4 C22.4 37.4 25.4 37.2 26.6 38.8 C25.6 40.4 23.4 40.6 21.6 39.4" stroke-width="2"/>',
      tuck:
        shifted(HIPPO_HEAD, 1.5) +
        // the ball, arms hugging it, feet drawn up
        '<path d="M15 24 C10.8 26.4 9.8 32 12.6 36 C15.4 40 24.6 40 27.4 36 C30.2 32 29.2 26.4 25 24"/>' +
        '<path d="M14.2 27.4 C15.2 31.8 18.6 33.8 23.4 33.4" stroke-width="2.3"/>' +
        '<path d="M25.8 26.8 C26.6 29.6 25.8 32 24 33.4" stroke-width="2.3"/>' +
        '<path d="M16.4 36.2 C17.6 34.6 20.4 34.8 21.2 36.8 C19.8 37.8 17.6 37.6 16.4 36.2" stroke-width="2"/>' +
        '<path d="M21.8 35.6 C23 33.8 25.8 34.4 26.2 36.4 C24.8 37.4 22.6 37.2 21.8 35.6" stroke-width="2"/>',
      float:
        // the head sits on the water, arms resting either side
        shifted(HIPPO_HEAD, 2.4) +
        '<path d="M11 21.6 C8.8 22.8 6.6 23.6 4.4 24.4" stroke-width="2.3"/>' +
        '<path d="M29 21.6 C31.2 22.8 33.4 23.6 35.6 24.4" stroke-width="2.3"/>' +
        '<path d="M1.5 25.4 C4.5 21.8 7.5 21.8 10.5 25.2 C13.5 28.6 16.5 28.6 19.5 25.2 ' +
                 'C22.5 21.8 25.5 21.8 28.5 25.2 C31.5 28.6 34.5 28.6 37.5 25.4"/>'
    },
    giraffe: {
      stand:
        // head to the left, ossicones, ear, eye, nostril, mouth
        '<path d="M12.4 4.2 C9.6 4 7.6 5.8 7.8 8 C8 9.8 10.4 10.4 12.6 9.8" stroke-width="2"/>' +
        '<path d="M12.4 4.2 C14.2 4 15.8 5 16.8 6.8" stroke-width="2"/>' +
        '<path d="M11.6 4.2 L11.2 1.2" stroke-width="1.8"/>' +
        '<path d="M11.2 1.2 L11.1 1.1" stroke-width="2.8"/>' +
        '<path d="M14.2 4.2 L14.6 1.2" stroke-width="1.8"/>' +
        '<path d="M14.6 1.2 L14.7 1.1" stroke-width="2.8"/>' +
        '<path d="M15.6 5.6 C17.4 4.4 18.6 4.8 18.2 6.4" stroke-width="1.8"/>' +
        '<path d="M10.4 6.6 L10.5 6.7" stroke-width="2.6"/>' +
        '<path d="M8.6 7.2 L8.7 7.3" stroke-width="1.9"/>' +
        '<path d="M8 8.6 C8.8 9.2 9.8 9.3 10.6 9" stroke-width="1.5"/>' +
        // the long neck, with spots
        '<path d="M12.6 9.8 C14.6 15 16.8 20.4 20.4 25.2"/>' +
        '<path d="M16.8 6.8 C19.6 12.4 22 18.2 24.6 23.8"/>' +
        '<path d="M16.2 12.4 L16.3 12.5" stroke-width="2.6"/>' +
        '<path d="M19.4 16.6 L19.5 16.7" stroke-width="2.6"/>' +
        '<path d="M20 21 L20.1 21.1" stroke-width="2.6"/>' +
        // body, spots, tail
        '<path d="M20.4 25.2 C16.8 25.6 13.8 28.6 14.4 32.6 C15 36.6 19 38.6 23.6 38.2 C28.2 37.8 30.6 34.4 30.2 30.4 C29.9 27.4 27.6 24.6 24.6 23.8"/>' +
        '<path d="M19.2 30.6 L19.3 30.7" stroke-width="3"/>' +
        '<path d="M24.6 29.4 L24.7 29.5" stroke-width="3"/>' +
        '<path d="M22.4 34.6 L22.5 34.7" stroke-width="3"/>' +
        '<path d="M27.4 33.8 L27.5 33.9" stroke-width="2.6"/>' +
        '<path d="M30 29.4 C32.2 30.6 33 32.8 32.2 35" stroke-width="1.8"/>' +
        '<path d="M32.2 35 L32.3 35.1" stroke-width="2.8"/>' +
        // legs
        '<path d="M17.2 37.6 L16.2 43.2"/>' +
        '<path d="M20 38.4 L19.6 43.4"/>' +
        '<path d="M25.6 38.2 L26.4 43.2"/>' +
        '<path d="M28.4 36.8 L29.6 42.8"/>',
      tuck:
        // the ball
        '<path d="M20 21 C13.4 21 10 26.4 11.4 31.8 C12.8 37.4 19.6 40 25.4 37.6 C30.8 35.4 32.2 28.4 28.6 24.2"/>' +
        '<path d="M17.6 28.6 L17.7 28.7" stroke-width="3"/>' +
        '<path d="M23.4 27.2 L23.5 27.3" stroke-width="3"/>' +
        '<path d="M20.6 33.4 L20.7 33.5" stroke-width="3"/>' +
        '<path d="M26.6 32 L26.7 32.1" stroke-width="2.6"/>' +
        // the neck curled up and over, head tucked at the top
        '<path d="M28.6 24.2 C27.8 17 24 12.2 18.8 10.4"/>' +
        '<path d="M25.2 26.6 C25 19.6 21.8 15 17.4 13.6"/>' +
        '<path d="M22.4 16.4 L22.5 16.5" stroke-width="2.6"/>' +
        '<path d="M25.4 21 L25.5 21.1" stroke-width="2.6"/>' +
        '<path d="M18.8 10.4 C16.4 9.2 14 10.4 13.8 12.6 C13.6 14.4 15.4 15.6 17.4 15.4" stroke-width="2"/>' +
        '<path d="M17.6 9.4 L17 6.6" stroke-width="1.8"/>' +
        '<path d="M17 6.6 L16.9 6.5" stroke-width="2.8"/>' +
        '<path d="M19.6 9.8 L20.2 7" stroke-width="1.8"/>' +
        '<path d="M20.2 7 L20.3 6.9" stroke-width="2.8"/>' +
        '<path d="M20.4 11.2 C22 10 23 10.6 22.4 12.2" stroke-width="1.8"/>' +
        '<path d="M16 11.8 L16.1 11.9" stroke-width="2.6"/>' +
        '<path d="M14.4 12.6 L14.5 12.7" stroke-width="1.9"/>' +
        // legs folded under
        '<path d="M14.4 34.6 C13 36 12.8 38 14.2 39.2"/>' +
        '<path d="M18.2 38.6 C17.2 40.2 17.6 41.6 19.2 42"/>',
      float:
        // the neck rising out of the water, head turned to the left
        '<path d="M18.4 25 C18.8 19 19 13 18.2 7.6"/>' +
        '<path d="M22.6 25.2 C22.6 19.2 22.4 13.4 21.4 8"/>' +
        '<path d="M19.8 13.4 L19.9 13.5" stroke-width="2.6"/>' +
        '<path d="M20.8 18.6 L20.9 18.7" stroke-width="2.6"/>' +
        '<path d="M19.6 22.6 L19.7 22.7" stroke-width="2.6"/>' +
        '<path d="M18.2 7.6 C15.4 6.4 12.6 7.4 12.6 9.6 C12.6 11.4 15.2 12 17.6 11.4 C19 11.2 20.6 10 21.4 8" stroke-width="2"/>' +
        '<path d="M17 5.6 L16.6 2.6" stroke-width="1.8"/>' +
        '<path d="M16.6 2.6 L16.5 2.5" stroke-width="2.8"/>' +
        '<path d="M20 5.4 L20.6 2.4" stroke-width="1.8"/>' +
        '<path d="M20.6 2.4 L20.7 2.3" stroke-width="2.8"/>' +
        '<path d="M21.6 6.8 C23.4 5.6 24.4 6.2 23.8 7.8" stroke-width="1.8"/>' +
        '<path d="M15.2 8.8 L15.3 8.9" stroke-width="2.6"/>' +
        '<path d="M13.4 9.4 L13.5 9.5" stroke-width="1.9"/>' +
        '<path d="M1.5 25.4 C4.5 21.8 7.5 21.8 10.5 25.2 C13.5 28.6 16.5 28.6 19.5 25.2 ' +
                 'C22.5 21.8 25.5 21.8 28.5 25.2 C31.5 28.6 34.5 28.6 37.5 25.4"/>'
    }
  };

  function drawing(cls, box, width, height, id, strokes) {
    return '<svg class="' + cls + '" viewBox="' + box + '" width="' + width + '" height="' + height + '" aria-hidden="true">' +
      ink(id) + thin(strokes) + '</g></svg>';
  }

  function head(kind, lower) {
    var face = HEAD + FACES[kind];
    return lower ? '<g transform="translate(0 2.2)">' + face + '</g>' : face;
  }

  function jumper(kind) {
    var own = SHAPES[kind];
    return drawing("stand", "0 0 40 44", 44, 48, "sketch", own ? own.stand : head(kind, false) + BODY_STAND) +
           drawing("tuck", "0 0 40 44", 44, 48, "sketch", own ? own.tuck : head(kind, true) + BODY_TUCK);
  }

  // Afloat, each animal is backed by a solid shape in the page colour, so
  // where two land close together the one in front hides the one behind
  // like paper cut-outs rather than tangling with it.
  var BACKS = {
    shared: '<path d="M20.3 4.7 A8.6 8.6 0 0 0 12.4 17.2 L5 24.8 L35.6 24.8 L28.2 17.2 A8.6 8.6 0 0 0 20.3 4.7 Z"/>',
    camel: '<path d="M14.6 25.8 L14.6 12.4 C12.4 12.8 10 11.4 10.2 9.2 C11.4 6 17.8 4.6 21.6 7.6 C22.8 9.6 22.4 11.8 20.8 12.6 L20.6 25.8 Z"/>' +
           '<path d="M22.4 25.8 C23 20.4 25.6 19.6 27.2 23.4 C28.4 19.6 31.4 20 32.6 23.6 C32.9 24.4 33.1 25 33.2 25.8 Z"/>',
    giraffe: '<path d="M17.4 25.8 L17.6 11.4 C13.4 12.6 10.6 9.4 12.6 6.6 C15 4.4 20.2 4.6 22.2 7.8 L22.6 25.8 Z"/>',
    penguin: '<path d="M20 7 C14.8 7 12.2 11.6 12.4 18 C12.5 20.6 12.8 22.8 13.4 25.2 L26.6 25.2 C27.2 22.8 27.5 20.6 27.6 18 C27.8 11.6 25.2 7 20 7 Z"/>',
    hippo: '<path d="M12.6 9 C9.4 10.8 8.2 15.6 9.6 19.8 C11 23.8 16 25 20 25 C24 25 29 23.8 30.4 19.8 C31.8 15.6 30.6 10.8 27.4 9 C26.4 6.2 22.6 6.2 22 8.8 C21.2 8 18.8 8 18 8.8 C17.4 6.2 13.6 6.2 12.6 9 Z"/>'
  };

  function back(kind) {
    var shape = BACKS[SHAPES[kind] ? kind : "shared"];
    return '<g fill="var(--bg, #fff)" stroke="var(--bg, #fff)" stroke-width="3.4">' + shape + '</g>';
  }

  function floater(kind) {
    var own = SHAPES[kind];
    return drawing("float", "0 0 40 30", 44, 33, "sketch", back(kind) + (own ? own.float : head(kind, true) + BODY_FLOAT));
  }

  // The water the bear lands in: a wavy line that draws itself outward
  // from the point of impact, in two halves so it spreads both ways at once.
  var WATER =
    '<svg viewBox="0 0 96 18" aria-hidden="true">' + ink("sketch-water") + thin(
      '<path pathLength="100" d="M48 9 C44.4 4.4 41 4.1 37.6 8.4 C34.2 12.7 30.8 12.9 27.4 8.9 C24 4.9 20.6 4.6 17.2 8.6 C13.8 12.6 10.4 12.8 7 8.8 C5.4 6.9 3.8 6.6 2.4 8.2"/>' +
      '<path pathLength="100" d="M48 9 C51.5 13.6 54.9 13.7 58.3 9.3 C61.7 4.9 65.1 4.8 68.5 8.8 C71.9 12.8 75.3 13 78.7 9.1 C82.1 5.2 85.5 5.1 88.9 9 C90.6 11 92.2 11.2 93.6 9.6"/>') +
    '</g></svg>';

  // The splash: seven short strokes that fly up and out of the landing.
  var FLICKS =
    '<svg viewBox="0 0 120 55" aria-hidden="true">' + ink("sketch-flicks") + thin(
      '<path d="M49 50 C46 40 44.6 30 46.4 19"/>' +
      '<path d="M38 51 C31.6 44 26.4 37 21.4 29"/>' +
      '<path d="M26 52 C18.8 48.2 12.6 44 6.4 38.8"/>' +
      '<path d="M71 50 C74 40 75.4 30 73.6 19"/>' +
      '<path d="M82 51 C88.4 44 93.6 37 98.6 29"/>' +
      '<path d="M94 52 C101.2 48.2 107.4 44 113.6 38.8"/>' +
      '<path d="M60 48 C59.6 39 60.2 30 60.8 22"/>') +
    '</g></svg>';

  // The clearing the pointer opens in the colour. Its centre and radius are
  // both eased a frame at a time, which is what makes it trail the cursor
  // instead of snapping to it.
  var HOLE = 130;      // px: radius a clearing starts from
  var LIFE = 2300;     // ms a clearing takes to open out and go
  var SEED = 70;       // ms between clearings while the pointer is down here
  var STEP = 22;       // px of travel that also earns one
  var FROM = 0.40;     // it opens from this share of HOLE
  var TO = 1.85;       // out to this one

  // The attractor points. Each wanders a slow Lissajous path, which stays
  // smooth and bounded without any edge handling. One clock drives all
  // five, and scrolling winds that clock forward: at rest it runs at 1,
  // and a fast scroll takes it up to about ten times that before decaying.
  var RUSH = 8;        // how much faster the field moves at full scroll
  var CALM = 2.4;      // how quickly the rush bleeds off, per second
  var points = [];
  var drift = 0;       // the clock the paths are read from
  var rush = 0;

  // The words scatter out of the pointer's way. Each is wrapped in a span
  // only while Fun is on, and put back when it is off. Words rather than
  // letters: a span per letter makes some screen readers spell the page out.
  var BLAST = 118;     // px: how close the pointer has to be to move a word
  var SHOVE = 34;      // px: how far the nearest word is pushed
  var shards = [];
  var page = null;
  var queued = false;
  var held = { x: -9999, y: -9999 };

  var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  // Phones and tablets: no hover, and a finger that scrolls the page
  // rather than pointing at it.
  var touch = window.matchMedia("(hover: none) and (pointer: coarse)");
  var FRAME = 30;      // ms: on touch the field is drawn at about 30fps
  var canvas = null;
  var ctx = null;
  var sprites = {};    // one stamp per colour, drawn on first use
  var grain = 1;       // canvas pixels per css pixel
  var last = { x: 0, y: 0, going: false, sown: 0 };
  var marks = [];
  var drawn = false;   // whether the trail canvas has anything on it
  var frame = null;
  var running = false;
  var typeWatch = null;

  // One mark, drawn once at a good size per colour and then scaled. Its edge
  // runs through several stops rather than two, so it reads as a value
  // falling off through a ramp rather than a disc with a blurred rim.
  var RAMP = [
    [0.00, 0.92], [0.22, 0.86], [0.40, 0.70],
    [0.58, 0.46], [0.74, 0.25], [0.88, 0.09], [1.00, 0]
  ];

  function stamp(rgb) {
    var key = rgb.join(",");
    if (sprites[key]) return sprites[key];
    var size = Math.ceil(HOLE * 2 * grain * TO);
    var sprite = document.createElement("canvas");
    sprite.width = sprite.height = size;
    var edge = sprite.getContext("2d");
    var mid = size / 2;
    var glow = edge.createRadialGradient(mid, mid, 0, mid, mid, mid);
    RAMP.forEach(function (stop) {
      glow.addColorStop(stop[0], "rgba(" + key + "," + stop[1] + ")");
    });
    edge.fillStyle = glow;
    edge.fillRect(0, 0, size, size);
    sprites[key] = sprite;
    return sprite;
  }

  // --- The hue -----------------------------------------------------------
  var hue = 205;         // the anchor, in degrees
  var shownHue = null;   // the last one written to the page
  var SPIN = 0.035;      // degrees of hue per px the pointer travels
  var SPREAD = 18;       // degrees between neighbouring pools

  function mode() {
    return root.getAttribute("data-fun") === "source" ? "source" : "field";
  }

  // OKLCH to sRGB, so lightness and chroma stay even round the wheel: the
  // greens come out no louder than the blues. Returns [r, g, b] in 0..255.
  function tone(l, c, h) {
    var rad = h * Math.PI / 180;
    var A = c * Math.cos(rad), B = c * Math.sin(rad);
    var l_ = l + 0.3963377774 * A + 0.2158037573 * B;
    var m_ = l - 0.1055613458 * A - 0.0638541728 * B;
    var s_ = l - 0.0894841775 * A - 1.2914855480 * B;
    var L = l_ * l_ * l_, M = m_ * m_ * m_, S = s_ * s_ * s_;
    var lin = [
       4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
      -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
      -0.0041960863 * L - 0.7034186147 * M + 1.7076147010 * S
    ];
    return lin.map(function (v) {
      v = Math.max(0, Math.min(1, v));
      v = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
      return Math.round(v * 255);
    });
  }

  function rgb(l, c, h) { return "rgb(" + tone(l, c, h).join(",") + ")"; }

  // Where the hue begins: read from the clock, the short way round between
  // the two anchors either side of now.
  function startHue() {
    var now = new Date();
    var hour = now.getHours() + now.getMinutes() / 60;
    for (var i = 0; i < HOURS.length; i++) {
      var a = HOURS[i], b = HOURS[(i + 1) % HOURS.length];
      var span = (b.at - a.at + 24) % 24;
      var into = (hour - a.at + 24) % 24;
      if (into >= span) continue;
      var turn = ((b.hue - a.hue) % 360 + 540) % 360 - 180;
      hue = (a.hue + turn * (into / span) + 360) % 360;
      break;
    }
    shownHue = null;
    paintHue();
  }

  // The five pools take the hue and two steps either side of it, at one
  // lightness and chroma; the base under them is the middle hue, pale.
  // Written only when the hue has moved enough to see.
  function paintHue() {
    if (shownHue !== null && Math.abs(hue - shownHue) < 1.5) return;
    shownHue = hue;
    for (var n = 0; n < 5; n++) {
      root.style.setProperty("--c" + (n + 1), rgb(0.78, 0.16, hue + (n - 2) * SPREAD));
    }
    root.style.setProperty("--base", rgb(0.94, 0.045, hue));
  }

  function fit() {
    if (ht) {
      halftoneFit();
      last.going = false;
      marks.length = 0;
      place();
      halftone(performance.now());   // the loop may be asleep
      return;
    }
    if (!canvas) return;
    // The marks are soft all the way through, so a phone draws them at one
    // canvas pixel per css pixel and lets the screen scale them up.
    grain = touch.matches ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(window.innerWidth * grain);
    canvas.height = Math.round(window.innerHeight * grain);
    sprites = {};
    last.going = false;
    marks.length = 0;
    drawn = false;     // resizing a canvas clears it
    place();           // the paths are shares of the window, which has changed
  }

  // Each clearing is kept rather than burned into the canvas, because it has
  // to keep opening out after it is made. The canvas is redrawn each frame
  // from the ones still alive. Whatever draws, the pointer or an animal,
  // has its own `from` ({x, y, going, sown}), and `size` scales its marks
  // against HOLE; `apart` is the px of travel that earns one.
  function sow(from, x, y, now, size, apart) {
    if (!from.going) return;

    var dx = x - from.x;
    var dy = y - from.y;
    var far = Math.sqrt(dx * dx + dy * dy);
    if (now - from.sown < SEED && far < apart) return;

    // Space them along the way it came, so a quick sweep opens a ribbon
    // rather than a row of dots.
    var hops = Math.max(1, Math.min(Math.round(far / apart), 12));
    for (var i = 1; i <= hops; i++) {
      marks.push({
        x: from.x + dx * (i / hops),
        y: from.y + dy * (i / hops),
        hue: hue,
        size: size,
        life: LIFE,
        born: now - (hops - i) * 12   // the earliest is furthest along
      });
    }
    from.x = x;
    from.y = y;
    from.sown = now;
    cull();
  }

  function cull() {
    var most = ht ? MOST : touch.matches ? 60 : 90;
    if (marks.length > most) marks.splice(0, marks.length - most);
  }

  // The animals draw too. While one is in the air it lays a narrower
  // ribbon down its fall and turns the hue as it goes, and where it lands
  // the colour (or, in "field", the white) opens out wide from the water.
  // On touch the animals are the only thing that draws.
  var WAKE = 0.7;          // an animal's marks, against the pointer's
  var WAKE_APART = 30;     // px of fall between them
  var BLOOM = 1.7;         // the one where it lands
  var BLOOM_LIFE = 3200;   // ms, a little longer than the rest

  function trailAnimals(now) {
    for (var i = 0; i < flying.length; i++) {
      var body = flying[i];
      var r = body.getBoundingClientRect();
      var x = r.left + r.width / 2, y = r.top + r.height / 2;
      var t = body._trail;
      if (!t) {
        t = body._trail = { x: x, y: y, px: x, py: y, going: true, sown: 0 };
      } else {
        var mx = x - t.px, my = y - t.py;
        hue = (hue + Math.sqrt(mx * mx + my * my) * SPIN) % 360;
        t.px = x;
        t.py = y;
      }
      sow(t, x, y, now, WAKE, WAKE_APART);
    }
  }

  function bloom(x, y) {
    if (!running) return;
    marks.push({ x: x, y: y, hue: hue, size: BLOOM, life: BLOOM_LIFE,
                 born: performance.now() });
    cull();
    wake();
  }

  // In "field" the marks are white and clear the colour behind them; in
  // "source" each is the colour the hue was when it was made, so a long
  // sweep leaves a slow rainbow behind it.
  function paint(now) {
    if (ht) { halftone(now); return; }
    if (!ctx) return;
    if (!marks.length && !drawn) return;   // already clear; most frames on a phone
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var inked = mode() === "source";
    var white = inked ? null : stamp([255, 255, 255]);

    var alive = 0;
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i];
      var age = (now - m.born) / m.life;
      if (age >= 1) continue;
      marks[alive++] = m;

      // Opens out as it goes, and thins as it opens.
      var span = HOLE * m.size * (FROM + (TO - FROM) * age) * grain;
      var left = 1 - age;
      ctx.globalAlpha = left * left;
      var img = inked ? stamp(tone(0.74, 0.19, Math.round(m.hue / 6) * 6)) : white;
      ctx.drawImage(img, m.x * grain - span, m.y * grain - span, span * 2, span * 2);
    }
    marks.length = alive;
    drawn = alive > 0;
    ctx.globalAlpha = 1;
  }

  function plot() {
    points = [].map.call(document.querySelectorAll(".blob"), function (el, i) {
      return {
        el: el,
        ax: 0.34 + i * 0.04,             // how far it ranges, as a share of
        ay: 0.30 + ((i * 7) % 5) * 0.025, // the viewport
        fx: 0.125 + i * 0.024,           // and how fast, in radians a second
        fy: 0.094 + ((i * 3) % 5) * 0.019,
        px: i * 1.7,
        py: i * 2.9 + 1.1
      };
    });
  }

  function place() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    for (var i = 0; i < points.length; i++) {
      var pt = points[i];
      var x = Math.sin(drift * pt.fx + pt.px) * pt.ax * w;
      var y = Math.sin(drift * pt.fy + pt.py) * pt.ay * h;
      pt.x = w / 2 + x;   // the centre, for the halftone
      pt.y = h / 2 + y;
      pt.el.style.translate = x.toFixed(1) + "px " + y.toFixed(1) + "px";
    }
  }

  function onScroll() {
    var y = window.scrollY;
    rush = Math.min(rush + Math.abs(y - (onScroll.was || 0)) * 0.05, RUSH);
    onScroll.was = y;
    scatterSoon();
    wake();
  }

  function step(now) {
    // The pools drift slowly enough that half the frames are not missed,
    // and a phone has better things to do with them.
    if (touch.matches && step.beat && now - step.beat < FRAME) {
      frame = requestAnimationFrame(step);
      return;
    }
    var gap = Math.min((now - (step.beat || now)) / 1000, 0.05);
    step.beat = now;

    // On touch the pools have no pace of their own: they move only while a
    // finger or a scroll winds them on, then settle and hold still.
    drift += gap * ((touch.matches ? 0 : 1) + rush);
    rush -= rush * CALM * gap;
    if (rush < 0.01) rush = 0;
    if (drift !== place.at) { place.at = drift; place(); }
    paintHue();
    swim(gap);
    runRobots(gap, now);
    // On touch the finger winds the pools and turns the hue but leaves no
    // trail of its own; the animals draw instead.
    if (!touch.matches) sow(last, held.x, held.y, now, 1, STEP);
    if (flying.length) trailAnimals(now);
    paint(now);
    if (flying.length && shards.length) scatter();   // the animals shove as they fall

    // On touch the loop sleeps once nothing is moving; the next touch,
    // scroll or animal wakes it.
    if (touch.matches && !busy()) { frame = null; return; }
    frame = requestAnimationFrame(step);
  }

  function busy() {
    return rush > 0 || last.going || drawn || marks.length > 0 ||
           flying.length > 0 || swimmers.length > 0 || robotsRunning() ||
           gathering(performance.now());
  }

  function wake() {
    if (motion.matches) return;   // the field holds still; nothing to run
    if (running && frame === null) {
      step.beat = 0;
      frame = requestAnimationFrame(step);
    }
  }

  function onPointerMove(event) {
    if (held.x > -9000) {
      var mx = event.clientX - held.x, my = event.clientY - held.y;
      hue = (hue + Math.sqrt(mx * mx + my * my) * SPIN) % 360;
    }
    held.x = event.clientX;
    held.y = event.clientY;
    if (!last.going) {
      last.x = held.x;
      last.y = held.y;
      last.going = true;
    }
    scatterSoon();
    wake();
  }

  function onPointerOut(event) {
    // A finger's pointer goes out the moment the page starts to scroll,
    // while the finger is still down; touchend decides when it has gone.
    if (event.pointerType === "touch") return;
    if (event.relatedTarget === null) letGo();   // actually left the window
  }

  function letGo() {
    last.going = false;                 // stop cutting; the trail closes over
    held.x = held.y = -9999;            // and the words fall back in line
    scatterSoon();
    wake();
  }

  // On a touch screen the finger is the pointer. A drag scrolls the page,
  // and the browser cancels the pointer as soon as it does, but touchmove
  // keeps coming for as long as the finger is down. So the trail follows
  // the thumb while it scrolls, the hue turns with it, and the pools are
  // wound on by how far it travels. The words are left to the animals.
  // A tap lays one mark where it lands.
  function onTouch(event) {
    var t = event.touches[0];
    if (!t) return;
    if (held.x > -9000) {
      var mx = t.clientX - held.x, my = t.clientY - held.y;
      rush = Math.min(rush + Math.sqrt(mx * mx + my * my) * 0.05, RUSH);
    }
    onPointerMove(t);   // a Touch has clientX and clientY too
  }

  function onTouchEnd(event) {
    if (!event.touches.length) letGo();
  }

  // --- Words ---------------------------------------------------------------

  function shatter() {
    if (shards.length) return;
    page = document.querySelector("main");
    if (!page) return;

    // Not inside a drawing or the house, whose script rewrites its own text.
    var walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        return node.parentNode.closest("svg, .house") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);

    texts.forEach(function (node) {
      if (!/\S/.test(node.nodeValue)) return;
      var frag = document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach(function (bit) {
        if (!bit) return;
        if (!/\S/.test(bit)) {
          frag.appendChild(document.createTextNode(bit));
          return;
        }
        var word = document.createElement("span");
        word.className = "shard";
        word.textContent = bit;
        frag.appendChild(word);
      });
      node.parentNode.replaceChild(frag, node);
    });

    shards = [].map.call(page.querySelectorAll(".shard"), function (el) {
      // A little variation per word, so they do not all fly out evenly.
      return { el: el, x: 0, y: 0, moved: false,
               force: 0.65 + Math.random() * 0.7,
               skew: (Math.random() - 0.5) * 0.9 };
    });
    measure();
  }

  function mend() {
    shards.forEach(function (sh) {
      sh.el.replaceWith(document.createTextNode(sh.el.textContent));
    });
    shards = [];
    if (page) page.normalize();   // stitch the text nodes back together
  }

  // Positions are taken once, in page coordinates, while nothing is pushed
  // aside. Reading them every frame would be both slow and wrong, since a
  // word's box already includes wherever we last shoved it.
  function measure() {
    var sx = window.scrollX, sy = window.scrollY;
    shards.forEach(function (sh) {
      if (sh.moved) {
        sh.el.style.removeProperty("left");
        sh.el.style.removeProperty("top");
        sh.moved = false;
      }
      var r = sh.el.getBoundingClientRect();
      sh.x = r.left + r.width / 2 + sx;
      sh.y = r.top + r.height / 2 + sy;
    });
  }

  // Whatever is pushing the words about: the pointer, and any animal still
  // in the air, each with its own reach.
  var flying = [];   // the <i> of every diver in flight

  function pushers() {
    var out = [];
    var sx = window.scrollX, sy = window.scrollY;
    // A finger is not a pointer the words should dodge: on touch only the
    // animals move them.
    if (held.x > -9000 && !touch.matches) out.push({ x: held.x + sx, y: held.y + sy, r: BLAST });
    for (var i = 0; i < flying.length; i++) {
      var r = flying[i].getBoundingClientRect();
      out.push({ x: r.left + r.width / 2 + sx, y: r.top + r.height / 2 + sy,
                 r: BLAST * (0.55 + r.width / 90) });
    }
    return out;
  }

  function scatter() {
    var from = pushers();

    for (var i = 0; i < shards.length; i++) {
      var sh = shards[i];
      var mx = 0, my = 0, hit = false;

      for (var k = 0; k < from.length; k++) {
        var src = from[k];
        var dx = sh.x - src.x;
        var dy = sh.y - src.y;
        var gap = dx * dx + dy * dy;
        if (gap >= src.r * src.r) continue;
        var far = Math.sqrt(gap) || 1;
        var force = 1 - far / src.r;
        var by = force * force * SHOVE * sh.force;
        // Skew the direction a little so the words scatter rather than
        // radiating out in a tidy circle.
        var ax = dx / far, ay = dy / far;
        mx += (ax - ay * sh.skew) * by;
        my += (ay + ax * sh.skew) * by;
        hit = true;
      }

      if (hit) {
        sh.el.style.left = mx.toFixed(1) + "px";
        sh.el.style.top = my.toFixed(1) + "px";
        sh.moved = true;
      } else if (sh.moved) {
        sh.el.style.removeProperty("left");
        sh.el.style.removeProperty("top");
        sh.moved = false;
      }
    }
  }

  function scatterSoon() {
    if (queued || !shards.length) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      scatter();
    });
  }

  var settling = null;
  function remeasure() {
    window.clearTimeout(settling);
    settling = window.setTimeout(function () {
      if (shards.length) { measure(); scatter(); }
    }, 160);
  }

  // Children animate too, and their animationend bubbles, so only the
  // element's own last animation is allowed to take it away.
  function sink(el) {
    el.addEventListener("animationend", function (e) {
      if (e.target === el) el.remove();
    });
    document.body.appendChild(el);
  }

  // Where the animals end up. Each one surfaces along the bottom of the
  // window exactly where it landed, at the size it dived at, and stays
  // there; only when the water gets crowded does the first to arrive slip
  // away.
  var CROWD = 40;      // how many can be afloat at once
  var EDGE = 6;        // px in from the sides they are kept
  var swimmers = [];
  var surfacing = [];  // timers for animals still under water

  function surface(kind, x, size) {
    if (!running) return;
    wake();   // on touch the loop may have gone to sleep since the dive
    var el = document.createElement("span");
    el.className = "swimmer";
    el.innerHTML = floater(kind);
    el.style.setProperty("--size", size.toFixed(2));
    el.style.setProperty("--bob-delay", (-Math.random() * 3.2).toFixed(2) + "s");
    el.style.setProperty("--bob-time", (2.8 + Math.random() * 1.2).toFixed(2) + "s");
    el.dataset.x = x.toFixed(0);
    settle(el);
    swimmers.push(el);
    document.body.appendChild(el);
    lineUp();
    while (swimmers.length > CROWD) {
      var gone = swimmers.shift();
      gone.classList.add("gone");
      window.setTimeout(function () { gone.remove(); }, 600);
    }
  }

  // Centre the animal on where it landed, kept just inside the window.
  function settle(el) {
    var width = 44 * parseFloat(el.style.getPropertyValue("--size") || "1");
    var left = parseFloat(el.dataset.x) - width / 2;
    left = Math.max(EDGE, Math.min(window.innerWidth - EDGE - width, left));
    el.style.left = left.toFixed(0) + "px";
  }

  // With the sans on they line up, in a neat row from the left in the
  // order they landed across the page; with the serif they stay where they
  // landed. `left` eases, so a change of face sends them sliding.
  var GAP = 6;   // px between neighbours in the row

  function lineUp() {
    if (root.getAttribute("data-font") === "serif") {
      swimmers.forEach(settle);
      return;
    }
    var row = swimmers.slice().sort(function (a, b) {
      return parseFloat(a.dataset.x) - parseFloat(b.dataset.x);
    });
    var x = EDGE;
    row.forEach(function (el) {
      var width = 44 * parseFloat(el.style.getPropertyValue("--size") || "1");
      el.style.left = x.toFixed(0) + "px";
      x += width + GAP;
    });
    // The row picks up swimming from about where the animals already were.
    var sum = 0;
    swimmers.forEach(function (el) { sum += el._swim ? el._swim.dx : 0; });
    school = swimmers.length ? sum / swimmers.length : 0;
  }

  // Once afloat they swim, by a `translate` on top of the `left` the two
  // arrangements set. In the serif each roams on its own: it drifts to a
  // spot of its choosing along the bottom, rests, and sets off again,
  // turning to face the way it is going. In the sans the whole row swims
  // together at one pace, back and forth between the edges.
  var school = 0;        // px the row is carried in the sans
  var schoolWay = 1;
  var PACE = 26;         // px a second the row swims at

  function width(el) {
    return 44 * parseFloat(el.style.getPropertyValue("--size") || "1");
  }

  function face(el, right) {
    var svg = el.querySelector("svg");
    if (svg) svg.style.scale = right ? "-1 1" : "1 1";   // they are drawn facing left
  }

  function swim(dt) {
    if (!swimmers.length) return;
    var W = window.innerWidth;

    if (root.getAttribute("data-font") === "serif") {
      swimmers.forEach(function (el) {
        var s = el._swim || (el._swim = { dx: 0, to: 0, speed: 0, wait: 0.5 + Math.random() * 2 });
        if (s.wait > 0) { s.wait -= dt; return; }
        if (!s.speed) {
          var base = parseFloat(el.style.left) || 0;
          var lo = EDGE - base, hi = W - EDGE - width(el) - base;
          s.to = lo + Math.random() * Math.max(1, hi - lo);
          s.speed = 16 + Math.random() * 30;
          face(el, s.to > s.dx);
        }
        var move = s.speed * dt;
        if (Math.abs(s.to - s.dx) <= move) {
          s.dx = s.to;
          s.speed = 0;
          s.wait = 1 + Math.random() * 4;
        } else {
          s.dx += s.to > s.dx ? move : -move;
        }
        el.style.translate = s.dx.toFixed(1) + "px 0";
      });
      return;
    }

    var first = Infinity, last = -Infinity;
    swimmers.forEach(function (el) {
      var l = parseFloat(el.style.left) || 0;
      first = Math.min(first, l);
      last = Math.max(last, l + width(el));
    });
    school += schoolWay * PACE * dt;
    if (first + school < EDGE) { school = EDGE - first; schoolWay = 1; }
    if (last + school > W - EDGE) { school = Math.max(EDGE - first, W - EDGE - last); schoolWay = -1; }
    swimmers.forEach(function (el) {
      el.style.translate = school.toFixed(1) + "px 0";
      face(el, schoolWay > 0);
      var s = el._swim || (el._swim = { dx: 0, to: 0, speed: 0, wait: 0 });
      s.dx = school;
      s.speed = 0;
      s.wait = 0.5 + Math.random() * 2;   // so they set off separately when the serif comes back
    });
  }

  function clearRow() {
    surfacing.forEach(window.clearTimeout);
    surfacing = [];
    swimmers.forEach(function (el) { el.remove(); });
    swimmers = [];
  }

  function dive(event) {
    if (running !== "fun" || motion.matches) return;
    if (event.target.closest("[data-set-theme], [data-set-font], .fun-controls, a, .house")) return;

    // It falls all the way to the water along the bottom of the window,
    // however high the click was, and takes longer from higher up.
    var across = (Math.random() < 0.5 ? -1 : 1) * (42 + Math.random() * 52);
    var down = Math.max(40, window.innerHeight - 10 - event.clientY);
    var flight = 0.7 + down / 700;   // seconds in the air
    var size = 1;   // one size for all of them
    var landX = event.clientX + across;
    var landY = event.clientY + down;

    var diver = document.createElement("span");
    diver.className = "diver";
    diver.style.left = event.clientX + "px";
    diver.style.top = event.clientY + "px";
    diver.style.setProperty("--dx", across.toFixed(0) + "px");
    diver.style.setProperty("--dy", down.toFixed(0) + "px");
    diver.style.setProperty("--flight", flight.toFixed(2) + "s");
    diver.style.setProperty("--size", size.toFixed(2));
    var kind = ANIMALS[turn++ % ANIMALS.length];
    diver.innerHTML = "<i>" + jumper(kind) + "</i>";
    sink(diver);
    var body = diver.firstChild;
    flying.push(body);
    diver.addEventListener("animationend", function (e) {
      if (e.target !== diver) return;
      flying.splice(flying.indexOf(body), 1);
      scatterSoon();   // let the words it passed fall back
      bloom(landX, landY);
    });
    wake();
    surfacing.push(window.setTimeout(function () { surface(kind, landX, size); }, flight * 1000 + 550));

    var water = document.createElement("span");
    water.className = "splash";
    water.style.left = landX + "px";
    water.style.top = landY + "px";
    water.style.setProperty("--flight", flight.toFixed(2) + "s");
    water.innerHTML = WATER;
    sink(water);

    var flicks = document.createElement("span");
    flicks.className = "flicks";
    flicks.style.left = landX + "px";
    flicks.style.top = landY + "px";
    flicks.style.setProperty("--flight", flight.toFixed(2) + "s");
    flicks.innerHTML = FLICKS;
    sink(flicks);

    for (var i = 0; i < 7; i++) {
      var drop = document.createElement("span");
      drop.className = "drop";
      drop.style.left = landX + "px";
      drop.style.top = landY + "px";
      drop.style.setProperty("--ddx", ((i - 3) * 14 + (Math.random() - 0.5) * 12).toFixed(0) + "px");
      drop.style.setProperty("--ddup", (-30 - Math.random() * 36 - (3 - Math.abs(i - 3)) * 8).toFixed(0) + "px");
      drop.style.animationDelay = (flight - 0.05 + Math.random() * 0.06).toFixed(2) + "s";
      sink(drop);
    }
  }

  document.addEventListener("click", dive);
  document.addEventListener("click", spawn);

  // Fun runs one of two ways: the soft field ("fun"), or the desk
  // ("desk"), where the field is halftone and a click lets a robot out.
  // Switching between them takes the one down before putting the other up.
  function syncFun() {
    var wanted = root.getAttribute("data-theme") !== "fun" ? false : deskWanted() ? "desk" : "fun";
    if (wanted === running) return;
    if (running) stopFun();
    running = wanted;
    if (running) startFun();
  }

  function startFun() {
    faces();
    startHue();
    outline();
    plot();
    // On the desk, null without WebGL: the soft pools show instead.
    ht = running === "desk" ? halftoneOn() : null;
    root.classList.toggle("halftoned", !!ht);
    canvas = ht ? null : document.querySelector(".trail");
    ctx = canvas ? canvas.getContext("2d") : null;
    fit();
    place();   // put them somewhere sensible even if the loop never runs
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", fit);
    window.addEventListener("resize", lineUp);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerout", onPointerOut, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    // On the desk the words sit still: they are in windows, which move
    // and scroll.
    if (!motion.matches && running === "fun") {
      shatter();
      window.addEventListener("resize", remeasure);
    }
    // The typeface switch changes every word's box and every window's
    // size, so take them again.
    typeWatch = new MutationObserver(function () { remeasure(); lineUp(); outline(); seat(false); arrange(); });
    typeWatch.observe(root, { attributes: true, attributeFilter: ["data-font"] });
    wake();
    paint(performance.now());   // once, for when the loop does not run
  }

  function stopFun() {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerout", onPointerOut);
    window.removeEventListener("touchstart", onTouch);
    window.removeEventListener("touchmove", onTouch);
    window.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("touchcancel", onTouchEnd);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", fit);
    window.removeEventListener("resize", lineUp);
    clearRow();
    clearRobots();
    halftoneOff();
    root.classList.remove("halftoned");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    marks.length = 0;
    drawn = false;
    canvas = ctx = null;
    sprites = {};
    last.going = false;
    held.x = held.y = -9999;   // a finger lifted while Fun was off never said so
    window.removeEventListener("resize", remeasure);
    if (typeWatch) { typeWatch.disconnect(); typeWatch = null; }
    mend();
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    rush = 0;
    points.forEach(function (pt) { pt.el.style.removeProperty("translate"); });
    points = [];
    flying = [];
    [].forEach.call(document.querySelectorAll(".diver, .splash, .flicks, .drop"),
      function (el) { el.remove(); });
  }

  // --- The halftone --------------------------------------------------------
  // On the desk the field is ordered dither rather than soft colour: a dot
  // in every 4px cell whose density beats the cell's place in a 4x4 Bayer
  // matrix. The density is the same field the pools and the trail make:
  // in "field" the pools fill the desk with dots in their five colours and
  // the trail disperses them; in "source" the desk is white and the trail
  // lays dots down in the hue it was made in. A WebGL shader works out one
  // pixel per cell, the canvas is scaled up square, and a mask over it
  // (style.css) leaves the top-left 2px of each cell, so the dots are
  // exact at any size. Without WebGL the soft pools show instead.
  var CELL = 4;
  var MOST = 64;       // the marks the shader takes, the newest
  var ht = null;       // { el, canvas, gl, at: uniform locations, ... }
  var clip = { x: 0, y: 0, from: 0, to: 0, at: -1e9 };   // the pools' circle
  var GATHER = 1100;   // ms for the pools to gather into the pill or bloom out

  var HT_VERT = "attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }";
  var HT_FRAG = [
    "precision highp float;",
    "uniform vec2 rows;",          // the canvas, in cells
    "uniform float source;",
    "uniform vec4 pool[5];",       // x, y, radius, strength (css px)
    "uniform vec3 poolInk[5];",
    "uniform vec3 clip;",          // the circle the pools show inside
    "uniform vec4 mark[" + MOST + "];",   // x, y, radius, strength
    "uniform vec3 markInk[" + MOST + "];",
    "uniform int marks;",
    "float m2(vec2 a) { return mod(2.0 * a.x + 3.0 * a.y, 4.0); }",
    "void main() {",
    "  vec2 cell = vec2(floor(gl_FragCoord.x), rows.y - 1.0 - floor(gl_FragCoord.y));",
    "  vec2 at = cell * 4.0 + 1.0;",
    "  float cut = 0.0; vec3 lit = vec3(0.0);",
    "  for (int i = 0; i < " + MOST + "; i++) {",
    "    if (i >= marks) break;",
    "    float t = length(at - mark[i].xy) / mark[i].z;",
    "    if (t < 1.0) { float f = 1.0 - t; f = f * f * (3.0 - 2.0 * f) * mark[i].w; cut += f; lit += markInk[i] * f; }",
    "  }",
    "  float s = 0.0; vec3 tint = vec3(0.0);",
    "  for (int i = 0; i < 5; i++) {",
    "    vec2 v = (at - pool[i].xy) / pool[i].z;",
    "    float g = pool[i].w * exp(-dot(v, v) * 2.2);",
    "    s += g; tint += poolInk[i] * g;",
    "  }",
    "  float inside = smoothstep(clip.z, clip.z - 60.0, length(at - clip.xy));",
    "  float fieldPart = s * inside * clamp(1.0 - cut, 0.0, 1.0);",
    "  float sourcePart = source * min(cut, 1.4);",
    "  float d = fieldPart + sourcePart;",
    "  vec3 ink = (tint / max(s, 1e-4) * fieldPart + lit / max(cut, 1e-4) * sourcePart) / max(d, 1e-4);",
    "  vec2 q = mod(cell, 4.0);",
    "  float th = (4.0 * m2(mod(q, 2.0)) + m2(floor(q / 2.0)) + 0.5) / 16.0;",
    "  gl_FragColor = vec4(d > th ? ink : vec3(1.0), 1.0);",
    "}"
  ].join("\n");

  function halftoneOn() {
    var el = document.createElement("div");
    el.className = "halftone";
    el.setAttribute("aria-hidden", "true");
    var c = document.createElement("canvas");
    var mask = document.createElement("div");
    mask.className = "mask";
    el.appendChild(c);
    el.appendChild(mask);
    var gl = null;
    try { gl = c.getContext("webgl", { alpha: false, antialias: false, depth: false, preserveDrawingBuffer: true }); } catch (e) {}
    if (!gl) return null;
    function shader(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var vs = shader(gl.VERTEX_SHADER, HT_VERT), fs = shader(gl.FRAGMENT_SHADER, HT_FRAG);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var p = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(p);
    gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
    var at = {};
    ["rows", "source", "pool", "poolInk", "clip", "mark", "markInk", "marks"].forEach(function (n) {
      at[n] = gl.getUniformLocation(prog, n);
    });
    document.body.insertBefore(el, document.body.firstChild);
    return {
      el: el, canvas: c, gl: gl, at: at,
      pool: new Float32Array(20), poolInk: new Float32Array(15),
      mark: new Float32Array(MOST * 4), markInk: new Float32Array(MOST * 3)
    };
  }

  function halftoneOff() {
    if (!ht) return;
    var lose = ht.gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
    ht.el.remove();
    ht = null;
  }

  function halftoneFit() {
    var cols = Math.ceil(window.innerWidth / CELL), rows = Math.ceil(window.innerHeight / CELL);
    ht.canvas.width = cols;
    ht.canvas.height = rows;
    ht.canvas.style.width = cols * CELL + "px";
    ht.canvas.style.height = rows * CELL + "px";
    ht.gl.viewport(0, 0, cols, rows);
    ht.gl.uniform2f(ht.at.rows, cols, rows);
    // The pools' circle covers the window in "field".
    clip.to = clip.from = mode() === "field" ? reach() : 0;
  }

  function reach() { return 1.3 * Math.max(window.innerWidth, window.innerHeight) + 200; }

  // The pools gather into the pill button pressed (x, y), or bloom out of it.
  function gather(x, y) {
    clip.from = clipNow(performance.now());
    clip.to = mode() === "field" ? reach() : 0;
    clip.x = x;
    clip.y = y;
    clip.at = performance.now();
  }

  function clipNow(now) {
    var t = Math.min(1, (now - clip.at) / GATHER);
    var e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    return clip.from + (clip.to - clip.from) * e;
  }

  function gathering(now) { return now - clip.at < GATHER; }

  var POOL_SIZE = [35, 39, 43, 37, 32];   // radius, vmax: the blobs' own

  function halftone(now) {
    var gl = ht.gl;
    var w = window.innerWidth, h = window.innerHeight, vmax = Math.max(w, h) / 100;
    var i, m;

    // Age the marks as the soft trail does, and hand the newest to the shader.
    var alive = 0;
    for (i = 0; i < marks.length; i++) {
      m = marks[i];
      var age = (now - m.born) / m.life;
      if (age >= 1) continue;
      m.age = age;
      marks[alive++] = m;
    }
    marks.length = alive;
    var first = Math.max(0, alive - MOST), n = alive - first;
    for (i = 0; i < n; i++) {
      m = marks[first + i];
      var left = 1 - m.age;
      ht.mark[i * 4] = m.x;
      ht.mark[i * 4 + 1] = m.y;
      ht.mark[i * 4 + 2] = HOLE * m.size * (FROM + (TO - FROM) * m.age);
      ht.mark[i * 4 + 3] = left * left;
      if (!m.ink) m.ink = tone(0.6, 0.2, m.hue);
      ht.markInk[i * 3] = m.ink[0] / 255;
      ht.markInk[i * 3 + 1] = m.ink[1] / 255;
      ht.markInk[i * 3 + 2] = m.ink[2] / 255;
    }
    drawn = alive > 0;

    for (i = 0; i < 5; i++) {
      var pt = points[i];
      ht.pool[i * 4] = pt ? pt.x : w / 2;
      ht.pool[i * 4 + 1] = pt ? pt.y : h / 2;
      ht.pool[i * 4 + 2] = POOL_SIZE[i] * vmax;
      ht.pool[i * 4 + 3] = 0.42;
      var ink = tone(0.62, 0.19, hue + (i - 2) * SPREAD);
      ht.poolInk[i * 3] = ink[0] / 255;
      ht.poolInk[i * 3 + 1] = ink[1] / 255;
      ht.poolInk[i * 3 + 2] = ink[2] / 255;
    }

    gl.uniform1f(ht.at.source, mode() === "source" ? 1 : 0);
    gl.uniform4fv(ht.at.pool, ht.pool);
    gl.uniform3fv(ht.at.poolInk, ht.poolInk);
    gl.uniform3f(ht.at.clip, clip.x, clip.y, clipNow(now));
    gl.uniform4fv(ht.at.mark, ht.mark);
    gl.uniform3fv(ht.at.markInk, ht.markInk);
    gl.uniform1i(ht.at.marks, n);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // --- Robots --------------------------------------------------------------
  // A click lets a little robot out. It runs about the screen, over the
  // windows, turning as it pleases and now and then stopping to look round,
  // and it draws as it goes: dots where it has been in "source", a path
  // cleared through them in "field". After a good run it sits down and its
  // lamp goes out, until the pointer comes close. Drawn on a 14 by 16 grid.
  function px(x, y, w, h, cls) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" class="' + cls + '"/>';
  }

  var ROBOT =
    '<svg viewBox="0 0 14 16" aria-hidden="true"><g class="body">' +
      px(6, 0, 2, 2, "lamp") + px(6, 2, 2, 1, "k") +
      px(2, 3, 10, 6, "k") + px(3, 4, 8, 4, "w") +
      px(7, 5, 1, 2, "k") + px(9, 5, 1, 2, "k") +
      px(6, 9, 2, 1, "k") +
      px(3, 10, 8, 4, "k") + px(4, 11, 6, 2, "w") + px(6, 11, 2, 1, "lamp") +
      px(1, 10, 2, 1, "k") + px(1, 11, 1, 2, "k") +
      px(11, 10, 2, 1, "k") + px(12, 11, 1, 2, "k") +
    '</g>' +
    '<g class="legs-stand">' + px(4, 14, 2, 2, "k") + px(8, 14, 2, 2, "k") + '</g>' +
    '<g class="legs-a">' + px(3, 14, 2, 2, "k") + px(9, 14, 2, 1, "k") + '</g>' +
    '<g class="legs-b">' + px(4, 14, 2, 1, "k") + px(8, 14, 2, 2, "k") + '</g>' +
    '</svg>';

  var robots = [];
  var CROWD = 12;          // robots out at once; past this the oldest goes
  var BOLT = 1.0;          // a robot's marks, against the pointer's
  var BOLT_APART = 22;     // px of run between them
  var EDGE = 34;           // px it keeps from the window's edge

  function spawn(event) {
    if (running !== "desk" || motion.matches || event.button > 0) return;
    if (event.target.closest("a, button, input, label, [role='button'], .chart, .house, .controls, .desk-bar, .section > h2")) return;
    var picked = window.getSelection && String(window.getSelection());
    if (picked) return;   // selecting text, not letting a robot out
    var el = document.createElement("div");
    el.className = "robot running";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = ROBOT;
    document.body.appendChild(el);
    var bot = {
      el: el, x: event.clientX, y: event.clientY + 16,
      a: Math.random() * Math.PI * 2,
      v: 80 + Math.random() * 60,
      run: true, pause: 0.5, next: 1.5 + Math.random() * 3,
      stamina: 16 + Math.random() * 14,
      trail: { x: event.clientX, y: event.clientY + 16, going: true, sown: 0 }
    };
    robots.push(bot);
    placeRobot(bot);
    if (robots.length > CROWD) retire(robots.shift());
    wake();
  }

  function retire(bot) {
    // The next in line leads from where it stands: the path ahead of it goes.
    if (marched) {
      var d = STRIDE;
      while (line.length > 1) {
        var a = line[line.length - 1], b = line[line.length - 2];
        var seg = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
        if (seg >= d) { line[line.length - 1] = { x: a.x + (b.x - a.x) * d / seg, y: a.y + (b.y - a.y) * d / seg }; break; }
        d -= seg;
        line.pop();
      }
    }
    bot.el.classList.add("gone");
    setTimeout(function () { bot.el.remove(); }, 600);
  }

  function placeRobot(bot) {
    bot.el.style.translate = bot.x.toFixed(1) + "px " + bot.y.toFixed(1) + "px";
    bot.el.classList.toggle("left", Math.cos(bot.a) < 0);
  }

  // In the sans they march in a line, as the animals swim in a row: the
  // first one out leads, wandering as any robot does, and each of the rest
  // keeps to its path a step behind the one in front, running to catch up
  // when it is new. When the leader halts or sits down the line does too.
  // In the serif each goes its own way.
  var STRIDE = 30;   // px between robots in the line
  var line = [];     // where the leader has been, newest last
  var marched = false;

  function marching() { return root.getAttribute("data-font") === "sans"; }

  // The point `d` px back along the leader's path, or its far end.
  function along(d) {
    for (var k = line.length - 1; k > 0; k--) {
      var a = line[k], b = line[k - 1];
      var seg = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
      if (d <= seg) {
        var t = seg ? d / seg : 0;
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }
      d -= seg;
    }
    return line[0] || null;
  }

  // Keep only as much path as the line needs.
  function trimLine() {
    var need = robots.length * STRIDE + 40, run = 0;
    for (var k = line.length - 1; k > 0; k--) {
      run += Math.abs(line[k].x - line[k - 1].x) + Math.abs(line[k].y - line[k - 1].y);
      if (run > need) { line.splice(0, k - 1); return; }
    }
  }

  function draws(bot, now) {
    if (!bot.trail.going) { bot.trail.x = bot.x; bot.trail.y = bot.y - 12; bot.trail.going = true; }
    var mx = bot.x - bot.trail.x, my = bot.y - 12 - bot.trail.y;
    hue = (hue + Math.sqrt(mx * mx + my * my) * SPIN * 0.5) % 360;
    sow(bot.trail, bot.x, bot.y - 12, now, BOLT, BOLT_APART);
  }

  // Sitting: the pointer coming close sets it off again.
  function near(bot) {
    var dx = held.x - bot.x, dy = held.y - (bot.y - 16);
    return held.x > -9000 && dx * dx + dy * dy < 70 * 70;
  }

  function rouse(bot) {
    var dx = held.x - bot.x, dy = held.y - (bot.y - 16);
    bot.run = true;
    bot.stamina = 10 + Math.random() * 12;
    bot.a = Math.atan2(-dy, -dx) + (Math.random() - 0.5);
    bot.pause = 0;
    bot.el.classList.remove("resting");
    bot.trail.going = false;
  }

  function follow(bot, place, leader, gap, now) {
    var to = along(place * STRIDE);
    if (!to) return;
    var dx = to.x - bot.x, dy = to.y - bot.y, far = Math.sqrt(dx * dx + dy * dy);
    var moving = far > 0.5;
    if (moving) {
      var step = Math.max(170, leader.v * 1.6) * gap;
      if (far <= step) { bot.x = to.x; bot.y = to.y; }
      else { bot.x += dx / far * step; bot.y += dy / far * step; }
      bot.a = Math.atan2(dy, dx);
      placeRobot(bot);
      draws(bot, now);
    } else {
      bot.trail.going = false;
    }
    bot.run = moving;
    bot.el.classList.toggle("running", moving);
    bot.el.classList.toggle("resting", !moving && !leader.run);
    if (!leader.run && near(bot)) rouse(leader);
  }

  function runRobots(gap, now) {
    var w = window.innerWidth, h = window.innerHeight;
    var march = marching() && robots.length > 1;
    // Out of the line, each picks up where it stands, with a run left in it.
    if (marched && !march) {
      for (var j = 1; j < robots.length; j++) {
        var b = robots[j];
        b.run = robots[0].run;
        b.stamina = 6 + Math.random() * 10;
        b.pause = 0;
        b.el.classList.toggle("running", b.run);
        b.el.classList.toggle("resting", !b.run);
      }
    }
    // Into the line: a straight tail behind the leader, so the rest have
    // somewhere to fall in even while it sits still.
    if (march && !marched) {
      var lead = robots[0], tail = robots.length * STRIDE;
      line = [
        { x: Math.max(EDGE, Math.min(w - EDGE, lead.x - Math.cos(lead.a) * tail)),
          y: Math.max(EDGE + 32, Math.min(h - EDGE, lead.y - Math.sin(lead.a) * tail)) },
        { x: lead.x, y: lead.y }
      ];
    }
    marched = march;

    for (var i = 0; i < robots.length; i++) {
      var bot = robots[i];
      if (march && i > 0) { follow(bot, i, robots[0], gap, now); continue; }
      if (!bot.run) {
        if (near(bot)) rouse(bot);
        continue;
      }
      bot.stamina -= gap;
      if (bot.stamina <= 0) {
        bot.run = false;
        bot.el.classList.remove("running");
        bot.el.classList.add("resting");
        continue;
      }
      if (bot.pause > 0) {
        bot.pause -= gap;
        if (bot.pause <= 0) bot.el.classList.add("running");
        // looking round: a turn now and then
        if (Math.random() < gap * 1.5) { bot.a = Math.PI - bot.a; placeRobot(bot); }
        continue;
      }
      bot.next -= gap;
      if (bot.next <= 0) {
        bot.pause = 0.4 + Math.random() * 1.1;
        bot.next = 1.5 + Math.random() * 4;
        bot.el.classList.remove("running");
        continue;
      }
      // A leader turns more gently, so the line behind it can keep up.
      bot.a += (Math.random() - 0.5) * (march ? 2.5 : 5) * gap;
      bot.x += Math.cos(bot.a) * bot.v * gap;
      bot.y += Math.sin(bot.a) * bot.v * gap;
      // Turned back off the edges.
      if (bot.x < EDGE) { bot.x = EDGE; bot.a = Math.PI - bot.a; }
      if (bot.x > w - EDGE) { bot.x = w - EDGE; bot.a = Math.PI - bot.a; }
      if (bot.y < EDGE + 32) { bot.y = EDGE + 32; bot.a = -bot.a; }
      if (bot.y > h - EDGE) { bot.y = h - EDGE; bot.a = -bot.a; }
      placeRobot(bot);
      draws(bot, now);
      if (march) { line.push({ x: bot.x, y: bot.y }); trimLine(); }
    }
  }

  function robotsRunning() {
    for (var i = 0; i < robots.length; i++) if (robots[i].run) return true;
    return false;
  }

  function clearRobots() {
    robots.forEach(function (bot) { bot.el.remove(); });
    robots = [];
    line = [];
    marched = false;
  }

  // --- Desk ----------------------------------------------------------------
  // Fun dresses the home page as Halftone OS. Each section becomes a
  // window, its h2 the title bar with a close box that folds
  // it; the body goes in a panel. On a wide screen the windows are thrown
  // all over the screen, overlapping, and drag by their bars. Everything
  // laid in here is taken out again when Fun goes off.
  var desk = false;
  var deskBits = null;       // the inner frame and the corner label
  var spread = window.matchMedia("(min-width: 64rem)");
  var front = 0;             // z-index of the window last raised
  var laidFor = null;        // the window size the desk was laid out for

  function deskWanted() {
    return root.getAttribute("data-theme") === "fun" && root.getAttribute("data-desk") === "on" &&
           root.getAttribute("data-page") === "home";
  }

  function windows() {
    return [].slice.call(document.querySelectorAll(".masthead, main > .section"));
  }

  // How wide each window is, and the share of the screen's height its
  // panel may take before it scrolls.
  var SIZES = {
    masthead: [440, 0],
    about: [500, 0.6],
    work: [560, 0.74],
    cv: [500, 0.64],
    "after-hours": [420, 0.42],
    contact: [400, 0.36]
  };

  function overlap(a, b) {
    var x = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    var y = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return x > 0 && y > 0 ? x * y : 0;
  }

  // Throw the windows over the screen. Each tries a spread of places at
  // random and takes the one that buries least: a window may overlap
  // another, but it pays heavily to cover another's title bar, so every
  // bar stays in reach. The masthead goes down last, on top. New places
  // every visit.
  function arrange() {
    var page = document.querySelector(".page");
    var all = windows().filter(function (w) { return !w.classList.contains("desk-page"); });
    var foot = document.querySelector(".colophon");
    if (!desk || !page) return;
    if (!spread.matches) {
      page.classList.remove("desk-spread");
      all.concat(foot || []).forEach(function (w) {
        w.style.left = w.style.top = w.style.width = w.style.zIndex = "";
        w.style.removeProperty("--cap");
      });
      laidFor = null;
      return;
    }
    page.classList.add("desk-spread");
    var W = window.innerWidth, H = window.innerHeight, M = 40;
    laidFor = { w: W, h: H };
    var order = all.slice(1).concat(all[0]);   // the masthead last
    var placed = [];
    front = 0;
    order.forEach(function (w) {
      var key = w.classList.contains("masthead") ? "masthead" : w.id;
      var size = SIZES[key] || [480, 0.5];
      var width = Math.min(size[0], Math.round(W * 0.62));
      w.style.width = width + "px";
      if (size[1]) w.style.setProperty("--cap", Math.max(140, Math.round(H * size[1]) - 40) + "px");
      var h = w.offsetHeight;
      var best = null, least = Infinity;
      for (var k = 0; k < 120; k++) {
        var box = {
          x: M + Math.random() * Math.max(0, W - 2 * M - width),
          y: M + 16 + Math.random() * Math.max(0, H - 2 * M - 16 - h),
          w: width, h: h
        };
        var cost = 0;
        for (var j = 0; j < placed.length; j++) {
          var p = placed[j];
          cost += 14 * overlap(box, { x: p.x, y: p.y, w: p.w, h: 22 });
          cost += 0.2 * overlap(box, p);
        }
        if (cost < least) { least = cost; best = box; }
      }
      w.style.left = Math.round(best.x) + "px";
      w.style.top = Math.round(best.y) + "px";
      w.style.zIndex = String(++front);
      placed.push(best);
    });
    raise(all[0]);
    if (foot) {   // a chip in the corner, over the windows
      foot.style.left = W - M - foot.offsetWidth - 12 + "px";
      foot.style.top = H - M - foot.offsetHeight - 12 + "px";
      foot.style.zIndex = "8000";
    }
  }

  function raise(w) {
    windows().forEach(function (o) { o.classList.toggle("desk-front", o === w); });
    w.style.zIndex = String(++front);
  }

  // Drag by the title bar, on the wide desk only, kept where its bar can
  // still be caught. Left and top, the way the design system's
  // HOS.draggable does it.
  var dragging = null;

  function onDeskDown(event) {
    var w = event.target.closest(".masthead, main > .section");
    if (!w || !desk) return;
    raise(w);
    var bar = event.target.closest(".desk-bar, .section > h2");
    if (!bar || event.target.closest("button") || !spread.matches || event.button > 0) return;
    event.preventDefault();
    dragging = { w: w, bar: bar, id: event.pointerId, sx: event.clientX, sy: event.clientY, ox: w.offsetLeft, oy: w.offsetTop };
    bar.setPointerCapture(event.pointerId);
    w.classList.add("desk-dragging");
  }

  function onDeskMove(event) {
    if (!dragging || event.pointerId !== dragging.id) return;
    var w = dragging.w;
    var x = dragging.ox + event.clientX - dragging.sx;
    var y = dragging.oy + event.clientY - dragging.sy;
    x = Math.max(80 - w.offsetWidth, Math.min(window.innerWidth - 80, x));
    y = Math.max(0, Math.min(window.innerHeight - 24, y));
    w.style.left = x + "px";
    w.style.top = y + "px";
  }

  function onDeskUp(event) {
    if (!dragging || event.pointerId !== dragging.id) return;
    if (dragging.bar.hasPointerCapture(event.pointerId)) dragging.bar.releasePointerCapture(event.pointerId);
    dragging.w.classList.remove("desk-dragging");
    dragging = null;
  }

  // The box at the end of a title bar: on a project's window an x that
  // closes it, on the home page's windows a line that minimises it to the
  // tray, a row of tiny windows centred at the foot of the desk that each
  // say only the window's name. A click on one puts the window back where
  // it was, in front.
  var tray = null;

  function box(kind, name) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "desk-box " + kind;
    b.setAttribute("aria-label", (kind === "close" ? "Close " : "Minimise ") + name);
    return b;
  }

  function windowName(w) {
    var t = w.querySelector(".desk-title");
    return t ? t.textContent : "";
  }

  function minimise(w) {
    w.classList.add("desk-min");
    w.classList.remove("desk-front");
    var tab = document.createElement("button");
    tab.type = "button";
    tab.className = "desk-tab";
    tab.textContent = windowName(w);
    tab.setAttribute("aria-label", "Restore " + windowName(w));
    tab._window = w;
    tray.appendChild(tab);
    tab.focus({ preventScroll: true });
  }

  function restore(tab) {
    var w = tab._window;
    tab.remove();
    w.classList.remove("desk-min");
    raise(w);
    var b = w.querySelector(".desk-box");
    if (b) b.focus({ preventScroll: true });
  }

  function onDeskBox(event) {
    var tab = event.target.closest(".desk-tab");
    if (tab) { restore(tab); return; }
    var b = event.target.closest(".desk-box");
    if (!b) return;
    var w = b.closest(".masthead, .section");
    if (!b.classList.contains("close")) minimise(w);
    else if (w.hasAttribute("data-keep")) w.classList.add("desk-min");   // hidden, to open again as it was
    else w.remove();
  }

  // A project opened as a window on the desk. A click on a link to one of
  // the site's own pages fetches it and lays its article in a new window
  // on top, its images and links pointed back at its folder, its charts
  // drawn, and any script of its own loaded afresh (Bubble Box's riso
  // print; such a window is hidden when closed, not taken away, so opening
  // it again finds the same print rather than starting a second). A page
  // fixed to one theme (embern) can't come across whole, so its window is
  // brief: the date and credit, its first picture, its description, and
  // the way to the full page. A click with a modifier opens the page, so
  // a new tab still works. Wide screens only.
  var opening = {};

  function pageLink(event) {
    if (!desk || !spread.matches || event.defaultPrevented || event.button > 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
    var a = event.target.closest("a[href]");
    // Not the way out of a project's window, which is meant to leave the desk.
    if (!a || a.target || a.hasAttribute("download") || a.closest(".controls, .desk-out")) return null;
    var url = new URL(a.href, location.href);
    var home = new URL(root.getAttribute("data-page") === "home" ? "." : "..", location.href);
    if (url.origin !== home.origin || url.pathname.indexOf(home.pathname) !== 0) return null;
    return /^[^\/]+\/$/.test(url.pathname.slice(home.pathname.length)) ? url : null;
  }

  function onDeskLink(event) {
    var url = pageLink(event);
    if (!url) return;
    event.preventDefault();
    var key = url.pathname;
    var open = document.querySelector('.desk-page[data-url="' + key + '"]');
    if (open) { open.classList.remove("desk-min"); raise(open); return; }
    if (opening[key]) return;
    opening[key] = true;
    fetch(url.href).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }).then(function (text) {
      var doc = new DOMParser().parseFromString(text, "text/html");
      var article = doc.querySelector("article.project");
      if (!article) { location.href = url.href; return; }
      if (doc.documentElement.getAttribute("data-lock")) {
        var about = doc.querySelector('meta[name="description"]');
        brief(article, about ? about.content : "");
      }
      if (desk) openPage(article, url);
    }).catch(function () {
      location.href = url.href;
    }).then(function () {
      delete opening[key];
    });
  }

  // Cut an article down to its heading, date, credit, first picture (not
  // a chart or an embed) and a line of description.
  function brief(article, about) {
    var keep = [].filter.call(article.children, function (el) {
      return el.matches("h2, .date, .credit");
    });
    var picture = article.querySelector(":scope > figure:not(.chart):not(.embed)");
    if (picture) keep.push(picture);
    if (about) {
      var line = document.createElement("p");
      line.textContent = about;
      keep.push(line);
    }
    article.textContent = "";
    keep.forEach(function (el) { article.appendChild(el); });
  }

  function openPage(article, url) {
    // Every relative address in it is relative to the project's folder.
    ["src", "href", "poster"].forEach(function (attr) {
      article.querySelectorAll("[" + attr + "]").forEach(function (el) {
        var v = el.getAttribute(attr);
        if (!/^(#|[a-z]+:|\/)/i.test(v)) el.setAttribute(attr, new URL(v, url).href);
      });
    });
    var h = article.querySelector(":scope > h2");
    var name = h ? h.textContent : url.pathname;

    var w = document.createElement("section");
    w.className = "section desk-page";
    w.setAttribute("data-url", url.pathname);
    var bar = document.createElement("h2");
    var title = document.createElement("span");
    title.className = "desk-title";
    title.textContent = name;
    var shut = box("close", name);
    bar.appendChild(title);
    bar.appendChild(shut);
    var panel = document.createElement("div");
    panel.className = "desk-panel";
    if (h) h.remove();
    while (article.firstChild) panel.appendChild(document.adoptNode(article.firstChild));
    var out = document.createElement("p");
    out.className = "desk-out";
    var go = document.createElement("a");
    go.href = url.href;
    go.textContent = "Open the full page";
    out.appendChild(go);
    panel.appendChild(out);
    w.appendChild(bar);
    w.appendChild(panel);
    document.querySelector("main").appendChild(w);

    // On top, near the middle, each one a little down and along from the last.
    var W = window.innerWidth, H = window.innerHeight;
    var n = document.querySelectorAll(".desk-page").length - 1;
    var width = Math.min(680, Math.round(W * 0.7));
    var top = 56 + (n % 5) * 28;
    w.style.width = width + "px";
    w.style.left = Math.round((W - width) / 2 + (n % 5) * 28 + (Math.random() - 0.5) * 60) + "px";
    w.style.top = top + "px";
    w.style.setProperty("--cap", Math.max(200, H - top - 96) + "px");
    raise(w);
    // A script parsed from another page never runs; put in a new one.
    [].forEach.call(panel.querySelectorAll("script[src]"), function (old) {
      var run = document.createElement("script");
      run.src = old.src;
      old.replaceWith(run);
      w.setAttribute("data-keep", "");
    });
    if (window.drawCharts) window.drawCharts(panel);
    fitLabels();   // the charts' switch buttons
    shut.focus({ preventScroll: true });
  }

  // Thrown again only when the window has really changed size, not when a
  // phone's address bar comes and goes.
  function onDeskResize() {
    if (!spread.matches || !laidFor) { arrange(); return; }
    if (Math.abs(window.innerWidth - laidFor.w) > 80 || Math.abs(window.innerHeight - laidFor.h) > 120) arrange();
  }

  // Desk's faces, wanted as soon as Fun is on: the Desk button is set in
  // the mono.
  function faces() {
    if (document.getElementById("desk-faces")) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.id = "desk-faces";
    link.href = document.querySelector('meta[name="desk-faces"]').content;
    document.head.appendChild(link);
  }

  function deskOn() {
    deskBits = { frame: document.createElement("div"), label: document.createElement("div") };
    deskBits.frame.className = "desk-frame";
    deskBits.label.className = "desk-label";
    deskBits.label.textContent = "JB.OS";
    Object.keys(deskBits).forEach(function (k) {
      deskBits[k].setAttribute("aria-hidden", "true");
      document.body.appendChild(deskBits[k]);
    });

    tray = document.createElement("div");
    tray.className = "desk-tray";
    tray.setAttribute("role", "toolbar");
    tray.setAttribute("aria-label", "Minimised windows");
    document.body.appendChild(tray);

    var head = document.querySelector(".masthead");
    if (head && !head.querySelector(".desk-bar")) {
      var bar = document.createElement("div");
      bar.className = "desk-bar";
      var label = document.createElement("span");
      label.className = "desk-title";
      label.textContent = "Read Me";
      bar.appendChild(label);
      bar.appendChild(box("minimize", "Read Me"));
      head.insertBefore(bar, head.firstChild);
    }

    // Each section: the heading takes a minimise box, and the rest goes
    // into a panel.
    document.querySelectorAll("main > .section").forEach(function (s) {
      var h = s.querySelector(":scope > h2");
      if (!h || s.querySelector(":scope > .desk-panel")) return;
      var name = h.textContent;
      h.innerHTML = "";
      var title = document.createElement("span");
      title.className = "desk-title";
      title.textContent = name;
      h.appendChild(title);
      h.appendChild(box("minimize", name));
      var panel = document.createElement("div");
      panel.className = "desk-panel";
      while (h.nextSibling) panel.appendChild(h.nextSibling);
      s.appendChild(panel);
    });

    document.addEventListener("pointerdown", onDeskDown);
    document.addEventListener("pointermove", onDeskMove);
    document.addEventListener("pointerup", onDeskUp);
    document.addEventListener("pointercancel", onDeskUp);
    document.addEventListener("click", onDeskBox);
    document.addEventListener("click", onDeskLink);
    window.addEventListener("resize", onDeskResize);
    if (spread.addEventListener) spread.addEventListener("change", arrange);

    arrange();
    // The windows change height once the faces arrive, so throw them again.
    if (document.fonts && document.fonts.load) {
      Promise.all([
        document.fonts.load('14px "Space Mono"'),
        document.fonts.load('700 14px "Space Mono"'),
        document.fonts.load('12px "Silkscreen"')
      ]).then(function () { if (desk) { fitLabels(); arrange(); outline(); seat(false); } }, function () {});
    }
  }

  function deskOff() {
    document.removeEventListener("pointerdown", onDeskDown);
    document.removeEventListener("pointermove", onDeskMove);
    document.removeEventListener("pointerup", onDeskUp);
    document.removeEventListener("pointercancel", onDeskUp);
    document.removeEventListener("click", onDeskBox);
    document.removeEventListener("click", onDeskLink);
    window.removeEventListener("resize", onDeskResize);
    if (spread.removeEventListener) spread.removeEventListener("change", arrange);
    dragging = null;
    laidFor = null;
    [].forEach.call(document.querySelectorAll(".desk-page"), function (w) { w.remove(); });

    if (deskBits) Object.keys(deskBits).forEach(function (k) { deskBits[k].remove(); });
    deskBits = null;
    if (tray) tray.remove();
    tray = null;
    var bar = document.querySelector(".masthead > .desk-bar");
    if (bar) bar.remove();

    document.querySelectorAll("main > .section").forEach(function (s) {
      var panel = s.querySelector(":scope > .desk-panel");
      var h = s.querySelector(":scope > h2");
      var title = h && h.querySelector(".desk-title");
      if (title) h.textContent = title.textContent;
      if (panel) {
        while (panel.firstChild) s.insertBefore(panel.firstChild, panel);
        panel.remove();
      }
    });

    var page = document.querySelector(".page");
    if (page) page.classList.remove("desk-spread");
    windows().concat(document.querySelector(".colophon") || []).forEach(function (w) {
      w.classList.remove("desk-front", "desk-dragging", "desk-min");
      w.style.left = w.style.top = w.style.width = w.style.zIndex = "";
      w.style.removeProperty("--cap");
    });
    fitLabels();
  }

  function syncDesk() {
    var wanted = deskWanted();
    if (wanted === desk) return;
    desk = wanted;
    if (desk) deskOn(); else deskOff();
  }

  // Each switch button is given the width of its label in whichever face
  // is wider, so nothing shifts when the typeface changes. Measured once,
  // in both faces, with the x-height correction the serif gets.
  function fitLabels() {
    var adjust = getComputedStyle(root).getPropertyValue("--serif-x-height").trim() || "none";
    // Not the Desk button: its label is always in the mono.
    document.querySelectorAll(".switch:not(.desk-switch) button").forEach(function (b) {
      b.style.minWidth = "";
      var widest = 0;
      [["var(--sans)", "none"], ["var(--serif)", adjust]].forEach(function (face) {
        b.style.fontFamily = face[0];
        b.style.fontSizeAdjust = face[1];
        widest = Math.max(widest, b.getBoundingClientRect().width);
      });
      b.style.fontFamily = "";
      b.style.fontSizeAdjust = "";
      b.style.minWidth = Math.ceil(widest + 0.5) + "px";
    });
  }

  function sync() {
    var theme = root.getAttribute("data-theme");
    var font = root.getAttribute("data-font");
    document.querySelectorAll("[data-set-theme]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.setTheme === theme));
      // On a page fixed to one theme the others are crossed out.
      if (root.dataset.lock && b.dataset.setTheme !== root.dataset.lock) {
        b.setAttribute("aria-disabled", "true");
        b.title = "Not on this page";
      }
    });
    document.querySelectorAll("[data-set-font]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.setFont === font));
    });
    document.querySelectorAll("[data-set-desk]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(root.getAttribute("data-desk") === "on"));
    });
    syncDesk();
    var fun = mode();
    document.querySelectorAll("[data-set-fun]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.setFun === fun));
    });
    seat(false);
    syncFun();
  }

  // The scalloped line round the Source/Field pill. A point is walked
  // round the pill's perimeter and pushed out along the normal by a wave
  // with a whole number of bumps, so the scallops are even and the path
  // closes, inset so its outer peaks stay within the pill's edge. It is
  // drawn once; CSS then dashes it so that about three
  // quarters of it shows, like a doodle left unfinished, and slides the
  // dash round the pill. Nothing here runs per frame.
  var PAD = 8;       // px of room the svg has round the pill
  var lineSvg = null, linePaths = null;
  var hem = [];      // the scallop's points, in the pill's own coordinates

  function around(w, h, s) {
    var r = h / 2, run = w - h, arc = Math.PI * r, a;
    if (s < run) return [r + s, 0, 0, -1];
    s -= run;
    if (s < arc) { a = -Math.PI / 2 + s / r; return [w - r + r * Math.cos(a), r + r * Math.sin(a), Math.cos(a), Math.sin(a)]; }
    s -= arc;
    if (s < run) return [w - r - s, h, 0, 1];
    s -= run;
    a = Math.PI / 2 + s / r;
    return [r + r * Math.cos(a), r + r * Math.sin(a), Math.cos(a), Math.sin(a)];
  }

  function scallop(w, h, out, amp) {
    var L = 2 * (w - h) + Math.PI * h;
    var bumps = Math.max(8, Math.round(L / 14));
    var n = Math.max(120, bumps * 12);
    var pts = [];
    for (var i = 0; i < n; i++) {
      var s = L * i / n;
      var p = around(w, h, s);
      var k = out + amp * Math.sin(2 * Math.PI * bumps * s / L);
      pts.push([p[0] + p[2] * k, p[1] + p[3] * k]);
    }
    return pts;
  }

  // The points as a path, shifted by (dx, dy).
  function trace(pts, dx, dy) {
    var d = "";
    for (var i = 0; i < pts.length; i++) {
      d += (i ? "L" : "M") + (pts[i][0] - dx).toFixed(1) + " " + (pts[i][1] - dy).toFixed(1);
    }
    return d + "Z";
  }

  function outline() {
    if (!lineSvg) {
      lineSvg = document.querySelector(".pill-line");
      linePaths = lineSvg ? lineSvg.querySelectorAll("path") : null;
    }
    if (!lineSvg) return;
    var pill = lineSvg.parentNode;
    var w = pill.offsetWidth, h = pill.offsetHeight;
    if (!w || !h) return;
    lineSvg.setAttribute("viewBox", (-PAD) + " " + (-PAD) + " " + (w + 2 * PAD) + " " + (h + 2 * PAD));
    // Inset: the outer peaks reach just inside the pill's edge, never past it.
    hem = scallop(w, h, -2.9, 2);
    linePaths[0].setAttribute("d", trace(hem, 0, 0));
    linePaths[0].setAttribute("pathLength", "1000");   // so the CSS dash is in known units
    trim();
  }

  // The pill's thumb sits under whichever side is pressed. On a switch it
  // hops: shrinks to a circle in the middle, squashes, and springs out
  // into the other side. Geometry goes in as custom properties, so the
  // keyframes can be plain CSS.
  function seat(hop) {
    var pill = document.querySelector(".switch.pill");
    var thumb = pill && pill.querySelector(".thumb");
    var on = pill && pill.querySelector("[data-set-fun][aria-pressed='true']");
    if (!thumb || !on) return;
    var box = pill.getBoundingClientRect();
    var to = on.getBoundingClientRect();
    var from = thumb.getBoundingClientRect();   // before the target moves it
    // The thumb runs from the pill's own edge, on the outer side, to the
    // boundary with the next button; the scallop clip trims it to shape.
    var sides = pill.querySelectorAll("[data-set-fun]");
    var start = on === sides[0] ? 0 : to.left - box.left;
    var end = on === sides[sides.length - 1] ? box.width : to.right - box.left;
    var edge = pill.clientLeft;   // the border: `left` is measured inside it
    pill.style.setProperty("--th", box.height.toFixed(1) + "px");
    pill.style.setProperty("--tx", (start - edge).toFixed(1) + "px");
    pill.style.setProperty("--tw", (end - start).toFixed(1) + "px");

    // A plain re-seat while a hop is still playing only moves its target;
    // the hop keeps going and lands there.
    var mid = thumb.getAnimations().some(function (a) { return a.playState === "running"; });
    if (!hop && mid) return;

    pill.style.setProperty("--fx", (from.left - box.left - edge).toFixed(1) + "px");
    pill.style.setProperty("--fw", from.width.toFixed(1) + "px");
    thumb.classList.remove("hop");
    if (hop && !motion.matches) {
      void thumb.offsetWidth;   // restart the animation from the top
      thumb.classList.add("hop");
      var until = performance.now() + 800;
      (function follow() {
        trim();
        if (performance.now() < until) requestAnimationFrame(follow);
      })();
    } else {
      trim();
    }
  }

  // The thumb's own outline: scalloped all the way round. Along the top
  // and bottom, and round an end that is also the pill's end, the wave is
  // the pill's own, so the fill meets the line bump for bump. Round an end
  // that is not, a cap is drawn whose wave runs on from the phase the top
  // edge arrives with and comes out at the phase the bottom edge leaves
  // with, so there is no seam anywhere. x0 and x1 are the thumb's sides
  // in the pill's own coordinates.
  var OUT = -2.9, AMP = 2;   // the scallop: how far in, and how deep

  function thumbShape(pill, x0, x1) {
    var w = pill.offsetWidth, h = pill.offsetHeight;
    var r = h / 2, run = w - h, arc = Math.PI * r, L = 2 * run + 2 * arc;
    var lam = L / Math.max(8, Math.round(L / 14));
    var TAU = 2 * Math.PI;
    var pts = [];
    function wave(phi) { return OUT + AMP * Math.sin(phi); }
    function top(x) { return TAU * (x - r) / lam; }
    function bottom(x) { return TAU * (run + arc + (w - r - x)) / lam; }
    function cap(cx, from, phiA, phiB) {
      // half a turn from angle `from`, the wave going from phiA to phiB
      // plus whole turns enough to keep the bumps the usual size
      var n = Math.max(8, Math.round(arc / 1.2));
      var m = Math.round(arc / lam - (phiB - phiA) / TAU);
      for (var i = 0; i <= n; i++) {
        var t = i / n, a = from + Math.PI * t;
        var k = wave(phiA + (phiB - phiA + TAU * m) * t);
        pts.push([cx + (r + k) * Math.cos(a), r + (r + k) * Math.sin(a)]);
      }
    }
    var x;
    for (x = x0 + r; x <= x1 - r; x += 1.2) pts.push([x, -wave(top(x))]);
    if (x1 >= w - 0.5) cap(w - r, -Math.PI / 2, TAU * run / lam, TAU * (run + arc) / lam);
    else cap(x1 - r, -Math.PI / 2, top(x1 - r), bottom(x1 - r));
    for (x = x1 - r; x >= x0 + r; x -= 1.2) pts.push([x, h + wave(bottom(x))]);
    if (x0 <= 0.5) cap(r, Math.PI / 2, TAU * (2 * run + arc) / lam, TAU * L / lam);
    else cap(x0 + r, Math.PI / 2, bottom(x0 + r), top(x0 + r));
    return pts;
  }

  // Clip the thumb to its scallop, built for the box it has right now
  // (layout values, so a hop's squash does not throw it); during a hop
  // this is called every frame, and once more when the hop has landed.
  document.addEventListener("animationend", function (e) {
    if (e.target.classList && e.target.classList.contains("thumb")) trim();
  });

  function trim() {
    var thumb = document.querySelector(".switch.pill .thumb");
    if (!thumb) return;
    var pill = thumb.parentNode;
    var edge = pill.clientLeft;
    var x0 = thumb.offsetLeft + edge, x1 = x0 + thumb.offsetWidth;
    var y0 = thumb.offsetTop + edge;
    thumb.style.clipPath = 'path("' + trace(thumbShape(pill, x0, x1), x0, y0) + '")';
  }

  window.addEventListener("resize", function () { seat(false); outline(); });

  document.addEventListener("click", function (event) {
    var button = event.target.closest("[data-set-theme], [data-set-font], [data-set-fun], [data-set-desk]");
    if (!button) return;

    if (button.hasAttribute("data-set-desk")) {
      var on = root.getAttribute("data-desk") !== "on";
      if (on) root.setAttribute("data-desk", "on"); else root.removeAttribute("data-desk");
      save("desk", on ? "on" : "off");
    } else if (button.dataset.setTheme) {
      if (root.dataset.lock) return;   // this page has one theme
      root.setAttribute("data-theme", button.dataset.setTheme);
      save("theme", button.dataset.setTheme);
    } else if (button.dataset.setFun) {
      var was = mode();
      // The pools are clipped to a circle centred here, so the colour
      // gathers into the button pressed, or spreads back out from it.
      var at = button.getBoundingClientRect();
      root.style.setProperty("--px", (at.left + at.width / 2).toFixed(0) + "px");
      root.style.setProperty("--py", (at.top + at.height / 2).toFixed(0) + "px");
      root.setAttribute("data-fun", button.dataset.setFun);
      if (ht) { gather(at.left + at.width / 2, at.top + at.height / 2); wake(); }
      save("fun-mode", button.dataset.setFun);
      marks.length = 0;   // the old marks were the other colour
      if (was !== mode()) {
        document.querySelectorAll("[data-set-fun]").forEach(function (b) {
          b.setAttribute("aria-pressed", String(b.dataset.setFun === mode()));
        });
        seat(true);
      }
    } else {
      root.setAttribute("data-font", button.dataset.setFont);
      save("font", button.dataset.setFont);
    }
    sync();
  });


  // Follow the OS only while the visitor has not made their own choice.
  if (motion.addEventListener) motion.addEventListener("change", syncFun);

  var media = window.matchMedia("(prefers-color-scheme: dark)");
  var onSystemChange = function (event) {
    var chosen = null;
    try { chosen = localStorage.getItem("theme"); } catch (e) {}
    if (chosen) return;
    root.setAttribute("data-theme", event.matches ? "dark" : "light");
    sync();
  };
  if (media.addEventListener) media.addEventListener("change", onSystemChange);
  else if (media.addListener) media.addListener(onSystemChange);

  fitLabels();
  sync();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { fitLabels(); seat(false); outline(); });
  }

  // Enable colour transitions only after the first paint.
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { document.body.classList.add("ready"); });
  });
})();

// A picture with a second under it (build.py's render_reveal): hovering
// shows the second, and a tap, a click or Enter holds it there.
// Listened for on the document, so a project opened as a window on the
// desk works too.
(function () {
  function flip(pair) {
    pair.setAttribute("aria-pressed", String(pair.getAttribute("aria-pressed") !== "true"));
  }
  document.addEventListener("click", function (e) {
    var pair = e.target.closest(".reveal .pair");
    if (pair) flip(pair);
  });
  document.addEventListener("keydown", function (e) {
    var pair = e.target.closest && e.target.closest(".reveal .pair");
    if (pair && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); flip(pair); }
  });
})();
