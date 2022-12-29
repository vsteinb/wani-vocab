
/* CANVAS  */

addEventListenerFor("canvas.letter", "mousedown", function(canvas, e) { start_drawing(canvas, canvas.getContext("2d"), e); });
addEventListenerFor("canvas.letter", "mousemove", function(canvas, e) {       drawing(canvas, canvas.getContext("2d"), e); });
addEventListenerFor("canvas.letter", "mouseup",   function(canvas, e) {   end_drawing(canvas, canvas.getContext("2d"), e); });
addEventListenerFor("canvas.letter", "mouseout",  function(canvas, e) {   end_drawing(canvas, canvas.getContext("2d"), e); });

async function start_drawing(canvas, ctx, e) {
    const stroke = parseInt(canvas.dataset.compareToStroke);
    if (parseInt(canvas.dataset.maxStrokes) <= stroke) { return; }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    canvas.dataset.start = JSON.stringify({x, y});

    // if start is not in bounds
    if (!await test_start(canvas, {x, y})) {
        // TODO better message / communication of fail
        return alert("You missed the start. Try again.");
    }

    // execute async. TODO make sure it is done before using it after stroke
    build_percentiles(canvas.parentNode);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.lineWidth = CANVAS_SIZE / 50 || 1;
    ctx.strokeStyle = "blue";

    ctx.moveTo(x, y);
    ctx.beginPath();

    canvas.dataset.drawing = "on";
}

function drawing(canvas, ctx, e) {
    if (canvas.dataset.drawing !== "on") { return; }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
}

async function end_drawing(canvas, ctx, e) {
    if (canvas.dataset.drawing !== "on") { return; }

    const stroke_result = await test_stroke(canvas);
console.log(result); // TODO

    // prepare for next stroke
    const next_stroke = parseInt(canvas.dataset.compareToStroke) +1;
    canvas.dataset.compareToStroke = next_stroke;
    const prev_strokes_ctx = canvas.parentNode.querySelector("canvas.prev-strokes").getContext("2d");
    const drawn_img = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    const prev_strokes = prev_strokes_ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const merge_imgs = (r, g, b, a, i) => {
        return  is_color(...drawn_img.data.subarray(i, i+4), i) ||
                is_color(...prev_strokes.data.subarray(i, i+4), i)
    };
    prev_strokes_ctx.putImageData(replace_color(drawn_img, merge_imgs, "#0000ffff"), 0, 0);

    const hint_ctx = canvas.parentNode.querySelector("canvas.letter-hint").getContext("2d");
    hint_ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    const letter_hint_img = await get_letter_hint_img(canvas.parentNode);
    hint_ctx.putImageData(letter_hint_img, 0, 0);
    
    // clear canvas
    ctx.closePath();
    canvas.dataset.drawing = "off";

    if (parseInt(canvas.dataset.maxStrokes) === next_stroke) {
            // test stroke
const rating = await test_whole_letter(canvas);
        canvas.parentNode.querySelector(".result").innerHTML = rating;
    }

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
}





/**
 * useful if it should be executed asynchronously
 * 
 * @param {HTMLElement} image_container 
 * @param {ImageData} perfect_img 
 * @param {any[]} percentiles 
 * @returns {Promise<void>}
 */
async function build_percentiles(image_container, perfect_img = null, percentiles = default_percentiles) {
    perfect_img = perfect_img || await get_perfect_img(image_container);
        
    const percentile_ctx = image_container.querySelector("canvas.percentile-img").getContext("2d");
    percentile_ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    percentile_ctx.putImageData(perfect_img, 0, 0);
    

    let prev_percentile_color = `rgba(0,0,0,1)`;
    for (let percentile of percentiles) {

        percentile_ctx.fillStyle = percentile.color;

        // find all px with the previous percentile's color
        const data = percentile_ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;
        for (let i = 0; i < data.length; i += 4) {
            const [r, g, b, a] = data.subarray(i, i+4);
            
            const px_color = get_rgba_color(r, g, b, a);
            if (px_color != prev_percentile_color) { continue; }

            // color all neighbors with this percentile's color if they have no color jet
            const x = (i/4) % CANVAS_SIZE;
            const y = Math.floor((i/4) / CANVAS_SIZE);

            for (let n_x = x-percentile.width; n_x <= x+percentile.width; n_x++) {
                for (let n_y = y-percentile.width; n_y <= y+percentile.width; n_y++) {
                    const j = 4* (n_y * CANVAS_SIZE + n_x);
                    const [n_r, n_g, n_b, n_a] = data.subarray(j, j+4);

                    if (is_transparent(n_r, n_g, n_b, n_a)) {
                        percentile_ctx.fillRect(n_x, n_y, 1, 1);
                    }
                }
            }
        }

        // draw and continue with next percentile
        percentile_ctx.stroke();
        prev_percentile_color = percentile.color;
    }
}
