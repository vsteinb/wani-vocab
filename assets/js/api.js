const API_TAG = document.querySelector("#api-key");

function get_from_wk(path, query_dict={}) {
    const requestHeaders =
        new Headers({ Authorization: 'Bearer ' + API_TAG.value });

    const query = Object.entries(query_dict).map(([key, value]) => `${key.trim()}=${value.trim()}`).join("&");
    
    let separator = '';
    if (query && path.includes('?')) { separator = "&"; }
    if (query && !path.includes('?')) { separator = "?"; }

    const apiEndpoint =
        new Request(`https://api.wanikani.com/v2${path}${separator}${query}`, {
            method: 'GET',
            headers: requestHeaders
        });

    return fetch(apiEndpoint)
        .then(response => response.json());
}