const API_BASE = "http://localhost:3000/";
const ROLE_LEVELS = {"regular": 0, "cashier": 1, "manager": 2, "superuser": 3};

export async function callBackend(method, path, body, query) {
    // Use for testing
    console.log(`${method}\n${path}\n${body}\n${query}`);

    // TODO: Uncomment to use actual api
    fetch(API_BASE + path + query, {
        method: method,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    })
    .then(res => res.json())
    .then(data => {
        console.log("Response:", data);
    })
    .catch(err => {
        console.error("Error:", err);
    });
}

const curr_level = 'superuser';

export function check_clearance(min_level) {
    return ROLE_LEVELS[curr_level] >= ROLE_LEVELS[min_level];
}

// TODO: actually implement this function
export function get_clearance() {
    return curr_level;
}