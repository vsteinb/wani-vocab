/**
 * 
 * @param {string} selector selector for HTML tags as used in document.querySelector()
 * @param {string} event    string of event type such as: "click", "input", "mouseup"
 * @param {(target: EventTarget, e: Event) => any} callback 
 * @returns {void}
 */
function addEventListenerFor(selector, event, callback) {
    document.addEventListener(event, function(e) {
        if (e.target.matches(selector)) {
            callback(e.target, e);
        }
    })
}


/**
 * @param {HTMLElement} image_container of the letter and its buttons
 * @param {string} selector             what canvas to use
 * @param {number} stroke
 * @returns {Promise<ImageData>}
 */
async function get_image_data_of_stroke(image_container, selector, stroke = null) {

    /** collect setup */
    const letter_canvas = image_container.querySelector("canvas.letter");
    const src = letter_canvas.dataset.frameSource;
    if (stroke === null) { stroke = parseInt(letter_canvas.dataset.compareToStroke); }
    
    const temporary_canvas = image_container.querySelector(selector);
    const ctx = temporary_canvas.getContext("2d");
    const img = new Image();

    /** get image from svg */
    return new Promise((resolve, reject) => {

        img.onload = function() {

            // get ImageData
            ctx.drawImage(img, stroke * FRAME_SIZE_IN_SVG, 0, FRAME_SIZE_IN_SVG, FRAME_SIZE_IN_SVG, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
            let image_data = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
            // set ImageData
            resolve(image_data);
        };

        img.src = src;
    });
}


/**
 * sets canvas.dataset.maxStrokes to the number of strokes of the cnavasses letter
 * 
 * @param {HTMLElement} canvas canvas to draw a letter in
 * @returns {Promise<void>}
 */
async function set_max_strokes_on_letter_canvas(canvas) {

    // [x, y, w, h] of svg viewbox in px
    const svg_viewbox = await fetch(canvas.dataset.frameSource)
    .then(res => res.text())
    .then(res => /viewBox="(?<box>[^"]+)"/
        .exec(res).groups.box
        .split(" ")
        .map(coord => parseInt(coord))
    );

    const SVG_FRAME_SIZE = svg_viewbox[3];
    const MAX_FRAMES = svg_viewbox[2] / SVG_FRAME_SIZE;
    canvas.dataset.maxStrokes = MAX_FRAMES;
}


/**
 * 
 * @param {HTMLElement} canvas  draw diagonals on it
 * @returns {void}
 */
function draw_kanji_sheet(canvas) {

    const ctx = canvas.getContext("2d");
    const max = CANVAS_SIZE -2;

    ctx.lineWidth = CANVAS_SIZE / 100 || 1;
    ctx.strokeStyle = "#dddddd";
    ctx.setLineDash([CANVAS_SIZE / 50]);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(max, max);
    ctx.stroke();

    ctx.moveTo(0, max);
    ctx.lineTo(max, 0);
    ctx.stroke();
    ctx.closePath();
    
    ctx.beginPath();
    ctx.lineWidth = CANVAS_SIZE * 1.5 / 100 || 1;
    ctx.setLineDash([CANVAS_SIZE * 1.5 / 50]);

    ctx.moveTo(0, CANVAS_SIZE/2);
    ctx.lineTo(max, CANVAS_SIZE/2);
    ctx.stroke();

    ctx.moveTo(CANVAS_SIZE/2, 0);
    ctx.lineTo(CANVAS_SIZE/2, max);
    ctx.stroke();

    ctx.closePath();
}


/**
 * 
 * @param {HTMLElement} image_container of the letter and its buttons
 * @param {
    remove_strokes: MODE !== "practice",
    remove_start: MODE === "test"
} options
 * @returns {ImageData} 
 */
async function get_letter_hint_img(image_container, options = {
    remove_strokes: MODE !== "practice",
    remove_start: MODE === "test"
}) {
    let image_data = await get_image_data_of_stroke(image_container, "canvas.letter-hint");

    // remove parts that should be ignored
    const make_transparent = (r, g, b, a, i) => {
        return is_helping_line(r, g, b, a, i) ||                                 // remove helping lines & light parts of stroke (antialias)
                (options.remove_strokes && is_black_stroke(r, g, b, a, i)) ||    // remove stroke
                (options.remove_start && is_start_not_stroke(r, g, b, a, i)) ||  // remove start
                (options.remove_start && options.remove_strokes) ||              // remove everything, especially intersection of start & stroke, since start is not opaque
                is_transparent(r, g, b, a, i);                                   // make all transparent colors the same
    };
    image_data = replace_color(image_data, make_transparent, "#00000000");

    // fill start if only start shown to hide the stroke peeking through
    if (options.remove_strokes && !options.remove_start) {
        image_data = replace_color(image_data, is_color, "#FF2A00B3");
    }

    // set ImageData
    return image_data;
}


/**
 * 
 * @param {HTMLElement} image_container of the letter and its buttons
 * @param {number} padding       how much px more padding to l, r, b, & t?
 * @param {number} radius        radius around center
 * @returns {
 *  x: number,
 *  y: number,
 *  r: number
 * } Bounding box of start, including padding
 */
async function get_start(image_container, padding = START_PADDING, radius = RADIUS_OF_START_IN_SVG * (CANVAS_SIZE / FRAME_SIZE_IN_SVG)) {
    image_container.querySelector("canvas.start-img").getContext("2d").clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    let image_data = await get_image_data_of_stroke(image_container, "canvas.start-img");

    // remove parts that should be ignored
    const make_transparent = (r, g, b, a, i) => {
        return is_helping_line(r, g, b, a, i) ||    // remove helping lines & light parts of stroke (antialias)
                is_black_stroke(r, g, b, a, i) ||   // remove stroke
                is_transparent(r, g, b, a, i);      // make all transparent colors the same
    };
    image_data = replace_color(image_data, make_transparent, "#00000000");

    // fill start if only start shown to hide the stroke peeking through
    image_data = replace_color(image_data, is_color, "#FF2A00B3");


    /* gotten image_data */

    const top_left_edge = {
        x: CANVAS_SIZE,
        y: CANVAS_SIZE
    };
    for (let i = 0; i < image_data.data.length; i += 4) {
        // ignore transparent
        if (!image_data.data[i+3]) { continue; }

        
        const x = (i/4) % CANVAS_SIZE;
        const y = Math.floor((i/4) / CANVAS_SIZE);

        top_left_edge.x = Math.min(top_left_edge.x, x);
        top_left_edge.y = Math.min(top_left_edge.y, y);
    };

    return {
        x: top_left_edge.x + RADIUS_OF_START_IN_SVG * CANVAS_SIZE / FRAME_SIZE_IN_SVG,
        y: top_left_edge.y + RADIUS_OF_START_IN_SVG * CANVAS_SIZE / FRAME_SIZE_IN_SVG,
        r: radius + padding
    }
}


/**
 * 
 * @param {HTMLElement} image_container of the letter and its buttons
 * @param {number} padding       how much px more padding to l, r, b, & t?
 * @param {number} radius        radius around center
 * @returns {
 *  x: number,
 *  y: number,
 *  r: number
 * } Bounding box of end, including padding
 */
async function get_end(image_container, padding = END_PADDING, radius = RADIUS_OF_START_IN_SVG * (CANVAS_SIZE / FRAME_SIZE_IN_SVG)) {

    let image_data = await get_image_data_of_stroke(image_container, "canvas.perfect-img");

    // remove parts that should be ignored
    const make_transparent = (r, g, b, a, i) => {
        return !is_start_stroke_overlap(r, g, b, a, i) &&
                !is_black_stroke(r, g, b, a, i);
    };
    image_data = replace_color(image_data, make_transparent, "#00000000");

    const OFFSET = CANVAS_SIZE / 50 || 1;

    const start = await get_start(image_container);

    let ends = [];
    for (let i = 0; i < image_data.data.length; i += 4) {
        const [r, g, b, a] = image_data.data.subarray(i, i+4);
        if (is_transparent(r, g, b, a, i)) { continue; }

        const x = (i/4) % CANVAS_SIZE;
        const y = Math.floor((i/4) / CANVAS_SIZE);
        if (Math.abs(start.x - x) + Math.abs(start.y - y) <= start.r) { continue; }

        let colored_neighbors = 0;

        // left
        if (is_color_at(image_data, x-OFFSET, y)) { colored_neighbors++; }
        if (is_color_at(image_data, x-OFFSET/2, y-OFFSET/2)) { colored_neighbors++; }
        if (is_color_at(image_data, x-OFFSET/2, y+OFFSET/2)) { colored_neighbors++; }
        // right
        if (is_color_at(image_data, x+OFFSET, y)) { colored_neighbors++; }
        if (is_color_at(image_data, x+OFFSET/2, y-OFFSET/2)) { colored_neighbors++; }
        if (is_color_at(image_data, x+OFFSET/2, y+OFFSET/2)) { colored_neighbors++; }
        // center x
        if (is_color_at(image_data, x, y-OFFSET)) { colored_neighbors++; }
        if (is_color_at(image_data, x, y+OFFSET)) { colored_neighbors++; }

        if (colored_neighbors < 2) {
            ends.push({x, y});
        }
    }

!ends.length && console.error("NO END FOUND", {
    ends: ends,
    x: sum(...ends.map(end => end.x)) / ends.length,
    y: sum(...ends.map(end => end.y)) / ends.length,
});


    return {
        x: sum(...ends.map(end => end.x)) / ends.length,
        y: sum(...ends.map(end => end.y)) / ends.length,
        r: radius + padding
    }
}

function is_color_at(image_data, x, y) {
    const i = 4* (y * CANVAS_SIZE + x);
    const [r, g, b, a] = image_data.data.subarray(i, i+4);

    return is_color(r, g, b, a, i);
}


const get_rgba_color = (r, g, b, a) => `rgba(${r},${g},${b},${a/255})`;

/**
 * @param  {...number} numbers 
 * @returns {number}
 */
const sum = (...numbers) => numbers.reduce((s, number) => s + number, 0);