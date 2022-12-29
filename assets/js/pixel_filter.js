/**
 * @param {number} r red
 * @param {number} g green
 * @param {number} b blue
 * @param {number} a opacity
 * @param {number} i index of pixel in ImageData/canvas/...
 * @returns {boolean}
 */
function is_helping_line(r, g, b, a, i) {
    return !is_start_not_stroke(r, g, b, a, i) && !is_black_stroke(r, g, b, a, i) && !is_start_stroke_overlap(r, g, b, a, i);
}

/**
 * @param {number} r red
 * @param {number} g green
 * @param {number} b blue
 * @param {number} a opacity
 * @param {number} i index of pixel in ImageData/canvas/...
 * @returns {boolean}
 */
function is_black_stroke(r, g, b, a, i) {
    return [r, g, b].every(color => color < 5) && a > 200;
}

/**
 * @param {number} r red
 * @param {number} g green
 * @param {number} b blue
 * @param {number} a opacity
 * @param {number} i index of pixel in ImageData/canvas/...
 * @returns {boolean}
 */
function is_start_not_stroke(r, g, b, a, i) {
    
    // TODO
    // red of start point is rgba(FF2A00, 0.7), so green is 0. Except for overlapping with sth.else
    return r > 200 && g < 200 && b < 200;
}

function is_start_stroke_overlap(r, g, b, a, i) {
    const diff = 20;
    return !is_start_not_stroke(r, g, b, a, i) && (Math.abs(r - g) > diff || Math.abs(g - b) > diff || Math.abs(b - r) > diff);
}

/**
 * @param {number} r red
 * @param {number} g green
 * @param {number} b blue
 * @param {number} a opacity
 * @param {number} i index of pixel in ImageData/canvas/...
 * @returns {boolean}
 */
function is_color(r, g, b, a, i) {
    return !is_transparent(r, g, b, a, i);
}

/**
 * @param {number} r red
 * @param {number} g green
 * @param {number} b blue
 * @param {number} a opacity
 * @param {number} i index of pixel in ImageData/canvas/...
 * @returns {boolean}
 */
function is_transparent(r, g, b, a, i) {
    return a === 0;
}


/**
 * @param {ImageData} image_data 
 * @param {(r: number, g: number, b: number, a: number, pixel_index: number) => boolean} remove_pixel    if true for a pixel, replace its color
 * @param {string} rgba_color    example: "00000000" is transparent black
 * @returns {ImageData} with changed colors
 */
function replace_color(image_data, remove_pixel, rgba_color) {
    
    // prepare replacement color
    rgba_color = rgba_color.replace("#", "");
    const new_color = [];
    for (let i = 0; i < 8; i += 2) {
        const color_part = rgba_color.substring(i, i+2);
        new_color.push(parseInt(color_part, 16));
    }
    
    // replace pixels where needed
    const data = image_data.data;
    for (let i = 0; i < data.length; i += 4) { // we are jumping every 4 values of RGBA for every pixel
        const color = data.subarray(i, i+4);

        if (remove_pixel(...color, i)) {

            data[i]     = new_color[0];  // r
            data[i + 1] = new_color[1];  // g
            data[i + 2] = new_color[2];  // b   
            data[i + 3] = new_color[3];  // a
        }
    }

    return image_data;
}