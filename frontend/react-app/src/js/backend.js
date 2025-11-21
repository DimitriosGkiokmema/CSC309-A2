const API_BASE = "localhost:3000"

export default async function callBackend(method, path, body, query) {
    // Use for testing
    console.log(`${method}\n${path}\n${body}\n${query}`);

    // TODO: Uncomment to use actual api
    // fetch(API_BASE + path + query, {
    //     method: method,
    //     headers: {
    //         "Content-Type": "application/json"
    //     },
    //     body: JSON.stringify(body)
    // })
    // .then(res => res.json())
    // .then(data => {
    //     console.log("Response:", data);
    // })
    // .catch(err => {
    //     console.error("Error:", err);
    // });
}