const API_BASE = "http://localhost:3000";
const ROLE_LEVELS = {"regular": 0, "cashier": 1, "manager": 2, "superuser": 3};

export async function callBackend(method, path, params) {
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

    const res = await fetch(API_BASE + path, body);

    let data = null;
    try {
        data = await res.json();
    } catch (_) {}

    console.log({method: method, endpoint: path, body: params, status: res.status, ok: res.ok, data})

    return {
        status: res.status,
        ok: res.ok,
        data
    };
}

export async function log_in(body) {
    const result = await callBackend("POST", "/auth/tokens", body);
    return result;
}

export async function resetPassword(utorid, password) {
    const resetToken = (await callBackend("POST", "/auth/resets", {utorid})).data.resetToken;
    return await callBackend('POST', `/auth/resets/${resetToken}`, {utorid, password});
}

export async function updateProfilePic(url) {
    return await callBackend('PATCH', '/users/me', {avatarUrl: url});
}

export function get_clearance(role) {
    if (!role) return -1;
    const key = String(role).toLowerCase();
    return ROLE_LEVELS[key] ?? -1;
}

export function check_clearance(currentRole, minRole) {
    return get_clearance(currentRole) >= get_clearance(minRole);
}