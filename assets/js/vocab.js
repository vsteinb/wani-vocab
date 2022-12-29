/* VOCAB */

let VOCAB;
let PAGE;
let INDEX_IN_PAGE = -1;
document.querySelector("#next-vocab").addEventListener("click", async function() {

    /* get next vocab */

    INDEX_IN_PAGE++;
    // load next page for vocab?
    if (!PAGE || INDEX_IN_PAGE >= PAGE.data.length) {
        
        if (PAGE && !PAGE.pages.next_url) {
            // TODO
            return alert("Last Vocab completed!");
        }
    
        INDEX_IN_PAGE = 0;
        const url = PAGE?.pages.next_url.replace("https://api.wanikani.com/v2", "") || "/subjects?types=vocabulary";
  
        let query_params = {};
        if (!LEVEL.length) { set_LEVEL(); }
        if (LEVEL.length && !url.includes("levels")) {
            query_params.levels = LEVEL.join(",");
        }

        PAGE = await get_from_wk(url, query_params);
    }
    VOCAB = PAGE.data[INDEX_IN_PAGE];


    /* display said vocab */

    // hints
    const vocab_hints = document.querySelector("#vocab-header");
    vocab_hints.querySelector("#meanings").innerHTML = VOCAB.data.meanings.map(m => m.meaning).join(", ");

    // letter canvasses
    const letter_template = document.querySelector("#templates .letter-container");
    const vocab_container = document.querySelector("#vocab-body");
    vocab_container.innerHTML = "";

    for (const letter of VOCAB.data.characters.split("")) {

        /* init */
        const utf16 = letter.charCodeAt(0);
        const utf16hex = utf16.toString(16).padStart(5, '0');

        // letter_container
        const letter_container = letter_template.cloneNode(true);
        
        // draw kanji paper & stroke diagram
        draw_kanji_sheet(letter_container.querySelector("canvas.kanji-paper"));
        letter_container.querySelector(".stroke-diagram").style.setProperty("--bg-img", `url(/assets/kanji_strokes/kanji/${utf16hex}.svg)`);

        // letter-canvas
        const canvas = letter_container.querySelector("canvas.letter");
        canvas.dataset.frameSource = `/assets/kanji_strokes/${utf16}_frames.svg`;
        await set_max_strokes_on_letter_canvas(canvas);

        /* general reset */
        await reset([letter_container]);
        
        vocab_container.appendChild(letter_container);
    }
    
    console.log(VOCAB)
});



/* BUTTONS */

addEventListenerFor(".clear-btn", "click", function(tag, e) { return reset([tag.parentNode]); });

addEventListenerFor(".stroke-hint-btn", "click", function(tag, e) {
    const hint = tag.parentNode.querySelector('.stroke-hint');
    hint.style.display = hint.style.display === 'none' ? 'block' : 'none';
});


async function reset(image_containers = document.querySelector(".letter-container")) {

    for (const image_container of image_containers) {

        // clear progress on all canvasses
        image_container.querySelectorAll('canvas.letter-hint, canvas.letter, canvas.prev-strokes, canvas.perfect-img')
            .forEach(canvas => canvas.getContext("2d").clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE));
    
        // reset stroke counter
        image_container.querySelector('canvas.letter').dataset.compareToStroke = 0;

        // reset letter hint
        const hint_ctx = image_container.querySelector("canvas.letter-hint").getContext("2d");
        const letter_hint_img = await get_letter_hint_img(image_container);
        hint_ctx.putImageData(letter_hint_img, 0, 0);
    }
}