const API_BASE = "http://localhost:3000";
const ROLE_LEVELS = {"regular": 0, "cashier": 1, "manager": 2, "superuser": 3};

export async function callBackend(method, path, params, query) {
    const token = localStorage.getItem("token");
    let body = {
        method,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        }
    };

    if (method === 'PATCH' || method === 'POST') {
        body['body'] = JSON.stringify(params);
    }

    const res = await fetch(API_BASE + path + query, body);

    let data = null;
    try {
        data = await res.json();
    } catch (_) {}

    return {
        status: res.status,
        ok: res.ok,
        data
    };
}

export async function log_in(body) {
    const result = await callBackend("POST", "/auth/tokens", body, "");
    console.log("api call: ", result)
    return result;
}

const curr_level = 'superuser';

export function check_clearance(min_level) {
    return ROLE_LEVELS[curr_level] >= ROLE_LEVELS[min_level];
}

// TODO: actually implement this function
export function get_clearance() {
    return curr_level;
}