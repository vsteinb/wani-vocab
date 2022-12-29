/////////////////// GETTER ///////////////////////////


/**
 * @param {HTMLElement} image_container of the letter and its buttons
 * @returns {Promise<ImageData>}
 */
async function get_perfect_img(image_container) {

    let image_data = await get_image_data_of_stroke(image_container, "canvas.perfect-img");

    // remove parts that should be ignored
    const make_transparent = (r, g, b, a, i) => {
        return !is_start_stroke_overlap(r, g, b, a, i) &&
                !is_black_stroke(r, g, b, a, i);
    };
    image_data = replace_color(image_data, make_transparent, "#00000000");
    
    // color the remaining stroke in the same black color (because of the overlapping start)
    const make_black = (r, g, b, a, i) => a !== 0;
    image_data = replace_color(image_data, make_black, "#000000ff");
    
    // TODO fine-tune is_start_not_stroke(), because halo overlapping old strokes is not recognized as part of start
    const reduce_fuss = (r, g, b, a, i) => {
        if (is_transparent(r, g, b, a, i)) { return false; }

        const x = (i/4) % CANVAS_SIZE;
        const y = Math.floor((i/4) / CANVAS_SIZE);
        let colored_neighbors = 0;
        for (let n_x = x-1; n_x <= x+1; n_x++) {
            for (let n_y = y-1; n_y <= y+1; n_y++) {
                const j = 4* (n_y * CANVAS_SIZE + n_x);
                if (is_color(...image_data.data.subarray(j, j+4), i)) { colored_neighbors++; }
            }
        }
        return colored_neighbors < 3;
    }
    image_data = replace_color(image_data, reduce_fuss, "#00000000");

    // set ImageData
    return image_data;
}

/**
 * @param {HTMLElement} image_container of the letter and its buttons
 * @returns {ImageData}
 */
function get_drawn_img(image_container) {
    const ctx = image_container.querySelector("canvas.letter").getContext("2d");

    let drawn_img = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    return replace_color(drawn_img, (r, g, b, a, i) => r+g === 0 && b === 255, "#ff0000ff");    // replace blue stroke with black
}



////////////////// SINGLE PENALTIES ///////////////////////////


/**
 * tests if start_pos is close enough to start of stroke with a padding for errors.
 * on fail: increases canvas.dataset.fail and draws start hint if not already shown
 * 
 * @param {HTMLElement} canvas 
 * @param {x: number, y: number} start_pos to test against optimal stroke start
 * @param {number} padding have some buffer in all directions for error
 * @returns {boolean} true if start_pos is in bounds of the stroke's start, false on fail
 */
async function test_start(canvas, start_pos, padding = .1* CANVAS_SIZE) {
    
    const start = await get_start(canvas.parentNode, padding);
    // too far away from start?
    const fail = Math.abs(start.x - start_pos.x) + Math.abs(start.y - start_pos.y) > start.r;

    if (fail) {
        canvas.dataset.fail = (parseInt(canvas.dataset.fail) || 0) +1;

        // if start is not visible, draw it as hint
        if (MODE === "test") {

            const start_hint_img = await get_letter_hint_img(canvas.parentNode, {
                remove_strokes: MODE !== "practice",
                remove_start: false
            });
            
            const hint_ctx = canvas.parentNode.querySelector("canvas.letter-hint").getContext("2d");
            hint_ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
            hint_ctx.putImageData(start_hint_img, 0, 0);
        }

// canvas.parentNode.querySelector("canvas.kanji-paper").getContext("2d").fillRect(start.x, start.y, start.w, start.h);
// canvas.parentNode.querySelector("canvas.kanji-paper").getContext("2d").stroke();
    }

    return !fail;
}


/**
 * @param {ImageData} diff_img 
 * @returns {number} in [0, 10]
 */
function get_length_factor(perfect_img, drawn_img) {

    const count = {
        perfect: 0,
        drawn: 0
    };

    for (let i = 0; i < perfect_img.data.length; i += 4) { // we are jumping every 4 values of RGBA for every pixel
        
        let [r, g, b, a] = perfect_img.data.subarray(i, i+4);
        if (is_color(r, g, b, a, i)) { count.perfect++; }
        
        [r, g, b, a] = drawn_img.data.subarray(i, i+4);
        if (is_color(r, g, b, a, i)) { count.drawn++; }
    }
    return Math.min(
        count.perfect * 1.0 / count.drawn,
        count.drawn * 1.0 / count.perfect
    ) || 0;
}


/**
 * 
 * @param {HTMLElement} image_container 
 * @param {any[]} percentiles 
 * @returns {penalty: number, weight: number}   relative penalty for the stroke and the weight for a weighted arithmetic mw of all strokes
 */
function test_percentiles(image_container, percentiles = default_percentiles) {
    const percentile_ctx = image_container.querySelector("canvas.percentile-img").getContext("2d");
    const percentile_data = percentile_ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;
    
    const letter_ctx = image_container.querySelector("canvas.letter").getContext("2d");
    const letter_data = letter_ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;

    // get px of perfect stroke
    let px_of_perfect_stroke = 0;
    for (let i = 0; i < percentile_data.length; i += 4) {
        if (is_color(...percentile_data.subarray(i, i+4), i)) { px_of_perfect_stroke++; }
    }

    // get absolute penalty
    percentile_ctx.fillStyle = "rgba(0,0,0,0.5)";
    let absolute_penalty = 0;
    let px_of_drawn = 0;
    for (let i = 0; i < letter_data.length; i += 4) {
        let [r, g, b, a] = letter_data.subarray(i, i+4);
        if (!is_color(r, g, b, a, i)) { continue; }
        px_of_drawn++;

        // get penalty by percentile
        [r, g, b, a] = percentile_data.subarray(i, i+4);
        const color = get_rgba_color(r, g, b, a);

        percentile = percentiles.find(percentile => percentile.color == color);
        absolute_penalty += percentile ? percentile.penalty : Infinity;


        // draw to screen (only for debugging?)
        percentile_ctx.fillRect((i/4) % CANVAS_SIZE, Math.floor((i/4) / CANVAS_SIZE), 1, 1);
    }

    return { penalty: 1.0 * absolute_penalty / px_of_drawn, weight: px_of_perfect_stroke };
}


/**
 * @param {HTMLElement} canvas the letter-canvas
 * @returns {number} of fails
 */
function get_fails(canvas) {
    return parseInt(canvas.dataset.fail) || 0;
}




////////////////////// PENALTY CALCULATION //////////////////////////

/* on every stroke */
async function test_stroke(canvas) {
    const image_container = canvas.parentNode;
    const perfect_img = await get_perfect_img(image_container);
    const drawn_img = get_drawn_img(image_container);

    // just for debugging. May be disposed of for performance reasons
    image_container.querySelector("canvas.perfect-img").getContext("2d").putImageData(perfect_img, 0, 0);
    
    // compare start
    const start = await get_start(canvas.parentNode);
    const drawn_start = JSON.parse(canvas.dataset.start);

    // test stroke length
    const length_factor = get_length_factor(perfect_img, drawn_img);

    // apply percentiles
    const percentile_penalties = test_percentiles(image_container, default_percentiles);

    // result
    const result = {
        percentiles: percentile_penalties,
        start: {perfect_start: start, drawn_start, diff: Math.abs(start.x - drawn_start.x) + Math.abs(start.y - drawn_start.y)},
        length: length_factor
    };
    return result;
}

/* after stroke completion */
async function test_whole_letter(canvas) {

    const fails = get_fails(canvas);
console.log("Fails", fails);


    // TODO combine stroke results to rating
}