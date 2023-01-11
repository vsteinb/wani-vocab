/* INITIAL_STROKE */
let INITIAL_STROKE = -1;
function set_INITIAL_STROKE(stroke) {
    INITIAL_STROKE = stroke;
    document.documentElement.style.setProperty("--initial-stroke", INITIAL_STROKE);
}


/* MODE */

let MODE;
function update_mode() {
    MODE = document.querySelector('input[name="mode"]:checked').value;

    mode_map = {
        practice: 0,
        help: 0,
        test: 100
    }
    set_INITIAL_STROKE(mode_map[MODE]);
}
addEventListenerFor('input[name="mode"]', "input", update_mode);
update_mode();


/* CANVAS_SIZE */

let CANVAS_SIZE;
function set_CANVAS_SIZE(new_size) {
    CANVAS_SIZE = new_size;

    document.documentElement.style.setProperty("--canvas-size", new_size + "px");

    document.querySelectorAll("canvas").forEach(canvas => {
        canvas.width = CANVAS_SIZE;
        canvas.height = CANVAS_SIZE;
    });
}
document.querySelector("#canvas-size").addEventListener("input", function() {
    set_CANVAS_SIZE(parseInt(this.value));
    document.querySelectorAll("canvas.kanji-paper").forEach(canvas => draw_kanji_sheet(canvas));
});
document.querySelector("#canvas-size").dispatchEvent(new Event("input"));

/* LEVEL */

let LEVEL = [];
function set_LEVEL() {
    const min = parseInt(document.querySelector("#level-min").value) || LEVEL[0] || 1;
    const max = parseInt(document.querySelector("#level-max").value) || LEVEL[LEVEL.length-1] || 60;
    LEVEL = [];
    if (min > max) { return; }

    for (let i = min; i <= max; i++) {
        LEVEL.push(i);
    }
}
document.querySelector("#submit-filter").addEventListener("click", () => {
    set_LEVEL();

    // start at the beginning
    PAGE = null;
    document.querySelector("#next-vocab").click();
});


/* FOR SVG */

RADIUS_OF_START_IN_SVG = 5.0;
FRAME_SIZE_IN_SVG = 109;


/* RATING */

const default_percentiles = [
    {
        color: `rgba(0,0,0,1)`,
        width: 0,
        penalty: 0
    },
    {
        color: `rgba(255,0,0,1)`,
        width: 5,
        penalty: 1
    },
    {
        color: `rgba(0,0,255,1)`,
        width: 5,
        penalty: 4
    },
    {
        color: `rgba(0,255,0,1)`,
        width: 5,
        penalty: 9
    }
];

const START_PADDING = 0.15* CANVAS_SIZE;
const END_PADDING = 0.25* CANVAS_SIZE;

const WEIGHT_OF_FAILS = 0.1;
const WEIGHT_OF_START = 0.15;
const WEIGHT_OF_END = 0.15;
const WEIGHT_OF_PERCENTILES = 0.3;
const WEIGHT_OF_LENGTH = 0.3;
